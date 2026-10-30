"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import styles from "./fixed-costs.module.css";

type Role = "OWNER" | "MEMBER" | "VIEWER";
type Household = { id: string; name: string; role: Role };
type Category = { id: string; name: string; archivedAt: string | null };
type Rule = {
  id: string;
  householdId: string;
  name: string;
  amount: string;
  currency: "RON";
  categoryId: string;
  dayOfMonth: number;
  startMonth: string;
  stoppedAt: string | null;
  version: number;
};
type Pagination = { page: number; pageSize: number; totalItems: number; totalPages: number };
type ResourceState = {
  key: string;
  rules?: Rule[];
  categories?: Category[];
  pagination?: Pagination;
  error?: string;
};
type RuleForm = {
  mode: "create" | "edit";
  ruleId?: string;
  name: string;
  amount: string;
  categoryId: string;
  dayOfMonth: string;
  startMonth: string;
};
type FormErrors = Partial<Record<"name" | "amount" | "categoryId" | "dayOfMonth" | "startMonth", string>>;

const selectionKey = "household-selection:v1";
const pageSize = 25;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHousehold(value: unknown): value is Household {
  return isRecord(value) && typeof value.id === "string" && typeof value.name === "string" &&
    (value.role === "OWNER" || value.role === "MEMBER" || value.role === "VIEWER");
}

function isCategory(value: unknown): value is Category {
  return isRecord(value) && typeof value.id === "string" && typeof value.name === "string" &&
    (value.archivedAt === null || typeof value.archivedAt === "string");
}

function isRule(value: unknown): value is Rule {
  return isRecord(value) && typeof value.id === "string" && typeof value.householdId === "string" &&
    typeof value.name === "string" && typeof value.amount === "string" && /^\d+\.\d{2}$/.test(value.amount) &&
    value.currency === "RON" && typeof value.categoryId === "string" &&
    typeof value.dayOfMonth === "number" && Number.isInteger(value.dayOfMonth) &&
    typeof value.startMonth === "string" && /^\d{4}-(?:0[1-9]|1[0-2])$/.test(value.startMonth) &&
    (value.stoppedAt === null || typeof value.stoppedAt === "string") &&
    typeof value.version === "number" && Number.isInteger(value.version);
}

function isPagination(value: unknown): value is Pagination {
  return isRecord(value) && ["page", "pageSize", "totalItems", "totalPages"].every((key) =>
    typeof value[key] === "number" && Number.isInteger(value[key]) && (value[key] as number) >= 0);
}

function apiMessage(payload: unknown, fallback: string) {
  if (!isRecord(payload) || !isRecord(payload.error)) return fallback;
  return typeof payload.error.message === "string" ? payload.error.message : fallback;
}

function selectedHouseholdId() {
  try { return window.localStorage.getItem(selectionKey); } catch { return null; }
}

function rememberHouseholdId(id: string) {
  try { window.localStorage.setItem(selectionKey, id); } catch { /* Selection lasts for this visit. */ }
}

function bucharestMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((value) => value.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}`;
}

function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "long", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, 1)));
}

function amountLabel(value: string) {
  const [whole, cents] = value.split(".");
  const grouped = new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 }).format(BigInt(whole));
  return `${grouped},${cents} RON`;
}

function normalizedAmount(value: string) {
  const match = /^(0|[1-9]\d{0,8})(?:[.,](\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const amount = `${match[1]}.${(match[2] ?? "").padEnd(2, "0")}`;
  return amount === "0.00" ? null : amount;
}

function requestKey() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export default function FixedCostManager() {
  const { data: session, isPending: sessionPending, error: sessionError, refetch } = authClient.useSession();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [householdId, setHouseholdId] = useState("");
  const [householdsLoading, setHouseholdsLoading] = useState(true);
  const [householdError, setHouseholdError] = useState<string | null>(null);
  const [householdRetry, setHouseholdRetry] = useState(0);
  const [resources, setResources] = useState<ResourceState | null>(null);
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [form, setForm] = useState<RuleForm | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [stopId, setStopId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const retryIntent = useRef<{ signature: string; key: string } | null>(null);
  const userId = session?.user?.id;

  useEffect(() => {
    if (sessionPending || sessionError || !userId) return;
    let active = true;
    const controller = new AbortController();
    async function loadHouseholds() {
      setHouseholdsLoading(true);
      setHouseholdError(null);
      try {
        const response = await fetch("/api/v1/households", {
          cache: "no-store", credentials: "same-origin", signal: controller.signal,
        });
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) throw new Error(apiMessage(payload, "A háztartások nem tölthetők be."));
        const values = isRecord(payload) ? payload.households : null;
        if (!Array.isArray(values) || !values.every(isHousehold)) throw new Error("A háztartások adatai nem olvashatók.");
        if (!active) return;
        const chosen = values.find((item) => item.id === selectedHouseholdId()) ?? values[0];
        setHouseholds(values);
        setHouseholdId(chosen?.id ?? "");
        if (chosen) rememberHouseholdId(chosen.id);
      } catch (loadError) {
        if (active && !(loadError instanceof DOMException && loadError.name === "AbortError")) {
          setHouseholdError(loadError instanceof Error ? loadError.message : "A háztartások nem tölthetők be.");
        }
      } finally {
        if (active) setHouseholdsLoading(false);
      }
    }
    void loadHouseholds();
    return () => { active = false; controller.abort(); };
  }, [sessionPending, sessionError, userId, householdRetry]);

  const resourceKey = `${householdId}:${page}:${refresh}`;
  useEffect(() => {
    if (!userId || !householdId) return;
    let active = true;
    const controller = new AbortController();
    async function loadResources() {
      setResources(null);
      try {
        const root = `/api/v1/households/${encodeURIComponent(householdId)}`;
        const [rulesResponse, categoriesResponse] = await Promise.all([
          fetch(`${root}/recurring-expense-rules?page=${page}&pageSize=${pageSize}`, {
            cache: "no-store", credentials: "same-origin", signal: controller.signal,
          }),
          fetch(`${root}/categories`, {
            cache: "no-store", credentials: "same-origin", signal: controller.signal,
          }),
        ]);
        const [rulesPayload, categoriesPayload]: unknown[] = await Promise.all([
          rulesResponse.json().catch(() => null), categoriesResponse.json().catch(() => null),
        ]);
        if (!rulesResponse.ok) throw new Error(apiMessage(rulesPayload, "A fix költségek nem tölthetők be."));
        if (!categoriesResponse.ok) throw new Error(apiMessage(categoriesPayload, "A kategóriák nem tölthetők be."));
        const rules = isRecord(rulesPayload) ? rulesPayload.rules : null;
        const pagination = isRecord(rulesPayload) ? rulesPayload.pagination : null;
        const categories = isRecord(categoriesPayload) ? categoriesPayload.categories : null;
        if (!Array.isArray(rules) || !rules.every(isRule) || rules.some((rule) => rule.householdId !== householdId) ||
            !isPagination(pagination) || !Array.isArray(categories) || !categories.every(isCategory)) {
          throw new Error("A fix költségek adatai nem olvashatók.");
        }
        if (active) {
          setResources({ key: resourceKey, rules, categories, pagination });
          if (pagination.totalPages > 0 && page > pagination.totalPages) setPage(pagination.totalPages);
        }
      } catch (loadError) {
        if (active && !(loadError instanceof DOMException && loadError.name === "AbortError")) {
          setResources({ key: resourceKey, error: loadError instanceof Error
            ? loadError.message : "A fix költségek nem tölthetők be." });
        }
      }
    }
    void loadResources();
    return () => { active = false; controller.abort(); };
  }, [userId, householdId, page, refresh, resourceKey]);

  const selected = households.find((item) => item.id === householdId);
  const currentResources = resources?.key === resourceKey ? resources : null;
  const rules = currentResources?.rules ?? [];
  const categories = currentResources?.categories ?? [];
  const activeCategories = categories.filter((item) => item.archivedAt === null);
  const categoryNames = new Map(categories.map((item) => [item.id, item.name]));
  const isOwner = selected?.role === "OWNER";

  function chooseHousehold(id: string) {
    if (!households.some((item) => item.id === id) || busy) return;
    setHouseholdId(id);
    rememberHouseholdId(id);
    setPage(1);
    setResources(null);
    setForm(null);
    setStopId(null);
    setError(null);
    setNotice(null);
    retryIntent.current = null;
  }

  function reload() {
    setResources(null);
    setForm(null);
    setStopId(null);
    setError(null);
    setNotice(null);
    retryIntent.current = null;
    setRefresh((value) => value + 1);
  }

  function beginCreate() {
    setForm({ mode: "create", name: "", amount: "", categoryId: "", dayOfMonth: "", startMonth: bucharestMonth() });
    setFormErrors({});
    setStopId(null);
    setError(null);
    setNotice(null);
    retryIntent.current = null;
    requestAnimationFrame(() => nameInput.current?.focus());
  }

  function beginEdit(rule: Rule) {
    setForm({ mode: "edit", ruleId: rule.id, name: rule.name, amount: rule.amount,
      categoryId: rule.categoryId, dayOfMonth: String(rule.dayOfMonth), startMonth: rule.startMonth });
    setFormErrors({});
    setStopId(null);
    setError(null);
    setNotice(null);
    retryIntent.current = null;
    requestAnimationFrame(() => nameInput.current?.focus());
  }

  function changeForm(field: keyof Omit<RuleForm, "mode" | "ruleId">, value: string) {
    setForm((current) => current ? { ...current, [field]: value } : current);
    setFormErrors((current) => current[field] ? { ...current, [field]: undefined } : current);
    retryIntent.current = null;
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isOwner || !form || !householdId || busy || !currentResources?.rules) return;
    const name = form.name.trim();
    const amount = normalizedAmount(form.amount);
    const dayOfMonth = Number(form.dayOfMonth);
    const original = form.mode === "edit" ? rules.find((item) => item.id === form.ruleId && !item.stoppedAt) : undefined;
    const errors: FormErrors = {};
    if (!name || Array.from(name).length > 100 || /[\p{Cc}\p{Cf}]/u.test(name)) errors.name = "Adj meg 1–100 karakteres nevet.";
    if (!amount) errors.amount = "Adj meg pozitív RON-összeget, legfeljebb két tizedessel.";
    if (!form.categoryId || (form.mode === "create" || form.categoryId !== original?.categoryId) &&
        !activeCategories.some((item) => item.id === form.categoryId)) errors.categoryId = "Válassz aktív kategóriát.";
    if (!/^(?:[1-9]|[12]\d|3[01])$/.test(form.dayOfMonth)) errors.dayOfMonth = "A havi nap 1 és 31 között lehet.";
    if (form.mode === "create" && (!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(form.startMonth) ||
        form.startMonth < bucharestMonth())) errors.startMonth = "Az aktuális vagy későbbi hónapot válaszd.";
    if (form.mode === "edit" && !original) {
      setError("A fix költség adatai megváltoztak. Töltsd újra a listát.");
      return;
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      const first = Object.keys(errors)[0];
      requestAnimationFrame(() => document.getElementById(`rule-${first}`)?.focus());
      return;
    }
    const path = `/api/v1/households/${encodeURIComponent(householdId)}/recurring-expense-rules`;
    const body = form.mode === "create"
      ? { name, amount, categoryId: form.categoryId, dayOfMonth, startMonth: form.startMonth }
      : {
          expectedVersion: original!.version,
          ...(name !== original!.name ? { name } : {}),
          ...(amount !== original!.amount ? { amount } : {}),
          ...(form.categoryId !== original!.categoryId ? { categoryId: form.categoryId } : {}),
          ...(dayOfMonth !== original!.dayOfMonth ? { dayOfMonth } : {}),
        };
    if (form.mode === "edit" && Object.keys(body).length === 1) {
      setNotice("Nincs mentendő módosítás.");
      return;
    }
    const url = form.mode === "create" ? path : `${path}/${encodeURIComponent(original!.id)}`;
    const signature = JSON.stringify([url, body]);
    const key = form.mode === "edit"
      ? retryIntent.current?.signature === signature ? retryIntent.current.key : requestKey()
      : null;
    if (key) retryIntent.current = { signature, key };
    setBusy(true);
    setError(null);
    setNotice(null);
    let successfulResponse = false;
    try {
      const response = await fetch(url, {
        method: form.mode === "create" ? "POST" : "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", ...(key ? { "Idempotency-Key": key } : {}) },
        body: JSON.stringify(body),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiMessage(payload, "A fix költség mentése nem sikerült."));
      successfulResponse = true;
      if (!isRecord(payload) || !isRule(payload.rule) || payload.rule.householdId !== householdId) {
        throw new Error("A mentett fix költség adatai nem olvashatók.");
      }
      setForm(null);
      setFormErrors({});
      retryIntent.current = null;
      setNotice(form.mode === "create" ? "A fix költség létrejött." : "A fix költség módosítása mentve.");
      setResources(null);
      if (form.mode === "create" && currentResources.pagination) {
        setPage(Math.ceil((currentResources.pagination.totalItems + 1) / pageSize));
      }
      setRefresh((value) => value + 1);
    } catch (writeError) {
      if (form.mode === "create" && (successfulResponse || writeError instanceof TypeError)) {
        setForm(null);
        setError("A létrehozás eredménye nem ellenőrizhető. Töltsd újra a listát, mielőtt újra megadod ezt a fix költséget.");
      } else {
        setError(writeError instanceof Error ? writeError.message : "A fix költség mentése nem sikerült.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function stopRule(rule: Rule) {
    if (!isOwner || busy || !householdId || rule.stoppedAt || stopId !== rule.id) return;
    const url = `/api/v1/households/${encodeURIComponent(householdId)}/recurring-expense-rules/${encodeURIComponent(rule.id)}/archive`;
    const body = { expectedVersion: rule.version };
    const signature = JSON.stringify([url, body]);
    const key = retryIntent.current?.signature === signature ? retryIntent.current.key : requestKey();
    retryIntent.current = { signature, key };
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(url, {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify(body),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiMessage(payload, "A fix költség leállítása nem sikerült."));
      if (!isRecord(payload) || !isRule(payload.rule) || payload.rule.householdId !== householdId) {
        throw new Error("A leállított fix költség adatai nem olvashatók.");
      }
      setStopId(null);
      retryIntent.current = null;
      setNotice("A fix költség leállt. A korábbi tételek megmaradnak.");
      setResources(null);
      setRefresh((value) => value + 1);
    } catch (writeError) {
      setError(writeError instanceof Error ? writeError.message : "A fix költség leállítása nem sikerült.");
    } finally {
      setBusy(false);
    }
  }

  if (sessionPending || (householdsLoading && Boolean(userId))) return <p role="status">Háztartások betöltése…</p>;
  if (sessionError) return <div className={styles.feedback} role="alert"><p>A fiók állapota most nem ellenőrizhető.</p><button onClick={() => void refetch()} type="button">Újrapróbálás</button></div>;
  if (!userId) return <p>A fix költségek megtekintéséhez <Link href="/bejelentkezes">jelentkezz be</Link>.</p>;
  if (householdError) return <div className={styles.feedback} role="alert"><p>{householdError}</p><button onClick={() => setHouseholdRetry((value) => value + 1)} type="button">Újrapróbálás</button></div>;
  if (!selected) return <div className={styles.feedback}><p>Még nincs háztartásod.</p><Link href="/kezdes">Háztartás beállítása</Link></div>;

  return (
    <div className={styles.manager}>
      <div className={styles.context}>
        {households.length > 1 ? (
          <label htmlFor="fixed-cost-household">Háztartás
            <select disabled={busy} id="fixed-cost-household" onChange={(event) => chooseHousehold(event.currentTarget.value)} value={householdId}>
              {households.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
        ) : <p>Háztartás: <strong>{selected.name}</strong></p>}
      </div>

      {error && <div className={styles.feedback} role="alert"><p>{error}</p><button onClick={reload} type="button">Lista újratöltése</button></div>}
      {notice && <p className={styles.notice} role="status">{notice}</p>}

      {!currentResources ? <p role="status">Fix költségek betöltése…</p> : currentResources.error ? (
        <div className={styles.feedback} role="alert"><p>{currentResources.error}</p><button onClick={reload} type="button">Újrapróbálás</button></div>
      ) : (
        <>
          {isOwner && !form && activeCategories.length > 0 && (
            <button className={styles.addAction} onClick={beginCreate} type="button">Új fix költség</button>
          )}
          {isOwner && activeCategories.length === 0 && <p className={styles.note}>Új fix költséghez előbb aktív kiadási kategória szükséges.</p>}

          {form && isOwner && (
            <form className={styles.form} onSubmit={(event) => void submitForm(event)}>
              <h2>{form.mode === "create" ? "Új fix költség" : "Fix költség módosítása"}</h2>
              {form.mode === "edit" && <p className={styles.warning}>A módosítás a már létrejött korábbi havi tételeket is frissíti. Az előző értékek az előzményekben megmaradnak.</p>}
              <div className={styles.fields}>
                <div className={styles.field}>
                  <label htmlFor="rule-name">Megnevezés</label>
                  <input aria-describedby={formErrors.name ? "rule-name-error" : undefined} aria-invalid={Boolean(formErrors.name)} disabled={busy} id="rule-name" maxLength={100} onChange={(event) => changeForm("name", event.currentTarget.value)} ref={nameInput} value={form.name} />
                  {formErrors.name && <p id="rule-name-error">{formErrors.name}</p>}
                </div>
                <div className={styles.field}>
                  <label htmlFor="rule-amount">Havi összeg · RON</label>
                  <input aria-describedby={formErrors.amount ? "rule-amount-error" : undefined} aria-invalid={Boolean(formErrors.amount)} disabled={busy} id="rule-amount" inputMode="decimal" maxLength={12} onChange={(event) => changeForm("amount", event.currentTarget.value)} type="text" value={form.amount} />
                  {formErrors.amount && <p id="rule-amount-error">{formErrors.amount}</p>}
                </div>
                <div className={styles.field}>
                  <label htmlFor="rule-categoryId">Kiadási kategória</label>
                  <select aria-describedby={formErrors.categoryId ? "rule-categoryId-error" : undefined} aria-invalid={Boolean(formErrors.categoryId)} disabled={busy} id="rule-categoryId" onChange={(event) => changeForm("categoryId", event.currentTarget.value)} value={form.categoryId}>
                    <option value="">Válassz kategóriát</option>
                    {form.mode === "edit" && form.categoryId && !activeCategories.some((item) => item.id === form.categoryId) && (
                      <option value={form.categoryId}>{categoryNames.get(form.categoryId) ?? "Korábbi kategória"} · archivált</option>
                    )}
                    {activeCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                  {formErrors.categoryId && <p id="rule-categoryId-error">{formErrors.categoryId}</p>}
                </div>
                <div className={styles.field}>
                  <label htmlFor="rule-dayOfMonth">Havi nap</label>
                  <input aria-describedby={`rule-day-hint${formErrors.dayOfMonth ? " rule-dayOfMonth-error" : ""}`} aria-invalid={Boolean(formErrors.dayOfMonth)} disabled={busy} id="rule-dayOfMonth" inputMode="numeric" max={31} min={1} onChange={(event) => changeForm("dayOfMonth", event.currentTarget.value)} step={1} type="number" value={form.dayOfMonth} />
                  <span className={styles.hint} id="rule-day-hint">Rövid hónapban az utolsó napon kerül be.</span>
                  {formErrors.dayOfMonth && <p id="rule-dayOfMonth-error">{formErrors.dayOfMonth}</p>}
                </div>
                {form.mode === "create" ? (
                  <div className={styles.field}>
                    <label htmlFor="rule-startMonth">Kezdő hónap</label>
                    <input aria-describedby={formErrors.startMonth ? "rule-startMonth-error" : undefined} aria-invalid={Boolean(formErrors.startMonth)} disabled={busy} id="rule-startMonth" min={bucharestMonth()} onChange={(event) => changeForm("startMonth", event.currentTarget.value)} type="month" value={form.startMonth} />
                    {formErrors.startMonth && <p id="rule-startMonth-error">{formErrors.startMonth}</p>}
                  </div>
                ) : <p className={styles.fixedStart}>Kezdő hónap: {monthLabel(form.startMonth)} · később nem módosítható</p>}
              </div>
              <div className={styles.formActions}>
                <button disabled={busy} type="submit">{busy ? "Mentés…" : "Mentés"}</button>
                <button disabled={busy} onClick={() => { setForm(null); setFormErrors({}); setError(null); }} type="button">Mégse</button>
              </div>
            </form>
          )}

          {rules.length === 0 ? <p className={styles.empty}>Ehhez a háztartáshoz még nincs havi fix költség.</p> : (
            <section aria-labelledby="fixed-cost-rules-title">
              <h2 className={styles.listTitle} id="fixed-cost-rules-title">Megadott fix költségek</h2>
              <ul className={styles.ruleList}>
                {rules.map((rule) => (
                  <li className={styles.ruleRow} key={rule.id}>
                    <div className={styles.ruleTop}>
                      <h3>{rule.name}</h3>
                      <strong>{amountLabel(rule.amount)}</strong>
                    </div>
                    <p className={styles.ruleMeta}>{categoryNames.get(rule.categoryId) ?? "Kategória nem ismert"} · minden hónap {rule.dayOfMonth}. napján</p>
                    <p className={styles.ruleMeta}>Kezdő hónap: {monthLabel(rule.startMonth)} · {rule.stoppedAt ? "Leállítva" : "Aktív"}</p>
                    {isOwner && !rule.stoppedAt && (
                      <div className={styles.ruleActions}>
                        <button disabled={busy} onClick={() => beginEdit(rule)} type="button">Módosítás</button>
                        <button disabled={busy} onClick={() => { setStopId(rule.id); setForm(null); setError(null); retryIntent.current = null; }} type="button">Leállítás</button>
                      </div>
                    )}
                    {isOwner && stopId === rule.id && !rule.stoppedAt && (
                      <div className={styles.stopConfirmation}>
                        <p>Leállítás után nem keletkezik új havi tétel. A korábbi tételek és az előzmények megmaradnak.</p>
                        <div>
                          <button disabled={busy} onClick={() => void stopRule(rule)} type="button">{busy ? "Leállítás…" : "Igen, leállítom"}</button>
                          <button disabled={busy} onClick={() => setStopId(null)} type="button">Mégse</button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {currentResources.pagination && currentResources.pagination.totalPages > 1 && (
            <nav aria-label="Fix költségek lapozása" className={styles.pagination}>
              <button disabled={page <= 1 || busy} onClick={() => { setPage((value) => value - 1); setForm(null); setStopId(null); }} type="button">Előző</button>
              <span aria-live="polite">{page}. oldal / {currentResources.pagination.totalPages}</span>
              <button disabled={page >= currentResources.pagination.totalPages || busy} onClick={() => { setPage((value) => value + 1); setForm(null); setStopId(null); }} type="button">Következő</button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
