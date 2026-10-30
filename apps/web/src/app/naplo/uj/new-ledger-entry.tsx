"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import AppShell from "../../app-shell";
import styles from "./new-ledger-entry.module.css";

type LedgerType = "EXPENSE" | "INCOME" | "REFUND";
type Household = {
  id: string;
  name: string;
  currency: "RON";
  role: "OWNER" | "MEMBER" | "VIEWER";
};
type Category = {
  id: string;
  name: string;
  sortOrder: number;
  archivedAt: string | null;
};
type SavedEntry = { id: string; type: LedgerType; amount: string };

const selectionKey = "household-selection:v1";
const entryTypes: { value: LedgerType; label: string }[] = [
  { value: "EXPENSE", label: "Kiadás" },
  { value: "INCOME", label: "Bevétel" },
  { value: "REFUND", label: "Visszatérítés" },
];

function isHousehold(value: unknown): value is Household {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.name === "string" &&
    item.currency === "RON" &&
    (item.role === "OWNER" || item.role === "MEMBER" || item.role === "VIEWER");
}

function isCategory(value: unknown): value is Category {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.name === "string" &&
    typeof item.sortOrder === "number" &&
    (item.archivedAt === null || typeof item.archivedAt === "string");
}

function apiMessage(value: unknown, fallback: string): string {
  if (!value || typeof value !== "object") return fallback;
  const error = (value as Record<string, unknown>).error;
  if (!error || typeof error !== "object") return fallback;
  const message = (error as Record<string, unknown>).message;
  return typeof message === "string" ? message : fallback;
}

function todayInBucharest(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const part = (name: string) => parts.find((value) => value.type === name)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function newIntentId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function selectedHouseholdId(): string | null {
  try { return window.localStorage.getItem(selectionKey); } catch { return null; }
}

function rememberHouseholdId(id: string) {
  try { window.localStorage.setItem(selectionKey, id); } catch { /* This visit still works without storage. */ }
}

export default function NewLedgerEntry() {
  const { data: session, isPending: sessionPending, error: sessionError, refetch } = authClient.useSession();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [householdId, setHouseholdId] = useState("");
  const [householdsLoading, setHouseholdsLoading] = useState(true);
  const [householdError, setHouseholdError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [type, setType] = useState<LedgerType>("EXPENSE");
  const [amount, setAmount] = useState("");
  const [occurredOn, setOccurredOn] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedEntry | null>(null);
  const intentRef = useRef<{ payload: string; key: string } | null>(null);
  const userId = session?.user?.id;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setOccurredOn(todayInBucharest()));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (sessionPending || sessionError || !userId) return;
    let active = true;
    async function loadHouseholds() {
      try {
        const response = await fetch("/api/v1/households", { cache: "no-store", credentials: "same-origin" });
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) throw new Error(apiMessage(payload, "A háztartások nem tölthetők be."));
        const values = payload && typeof payload === "object" ? (payload as Record<string, unknown>).households : null;
        if (!Array.isArray(values) || !values.every(isHousehold)) throw new Error("A háztartások adatai nem olvashatók.");
        if (!active) return;
        setHouseholds(values);
        const preferred = selectedHouseholdId();
        const next = values.find((item) => item.id === preferred) ?? values[0];
        setCategories([]);
        setCategoryId("");
        setCategoriesLoading(true);
        setCategoryError(null);
        setHouseholdId(next?.id ?? "");
        if (next) rememberHouseholdId(next.id);
      } catch (error) {
        if (active) setHouseholdError(error instanceof Error ? error.message : "A háztartások nem tölthetők be.");
      } finally {
        if (active) setHouseholdsLoading(false);
      }
    }
    void loadHouseholds();
    return () => { active = false; };
  }, [sessionPending, sessionError, userId]);

  useEffect(() => {
    if (!userId || !householdId) return;
    let active = true;
    async function loadCategories() {
      try {
        const response = await fetch(`/api/v1/households/${encodeURIComponent(householdId)}/categories`, {
          cache: "no-store", credentials: "same-origin",
        });
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) throw new Error(apiMessage(payload, "A kategóriák nem tölthetők be."));
        const values = payload && typeof payload === "object" ? (payload as Record<string, unknown>).categories : null;
        if (!Array.isArray(values) || !values.every(isCategory)) throw new Error("A kategóriák adatai nem olvashatók.");
        if (active) setCategories(values.filter((item) => item.archivedAt === null));
      } catch (error) {
        if (active) setCategoryError(error instanceof Error ? error.message : "A kategóriák nem tölthetők be.");
      } finally {
        if (active) setCategoriesLoading(false);
      }
    }
    void loadCategories();
    return () => { active = false; };
  }, [userId, householdId]);

  function changed() {
    setFormError(null);
    setSaved(null);
    intentRef.current = null;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !householdId) return;
    setFormError(null);
    const normalizedAmount = amount.trim().replace(",", ".");
    if (!/^(?:0|[1-9]\d{0,8})(?:\.\d{1,2})?$/.test(normalizedAmount) || /^0(?:\.0{1,2})?$/.test(normalizedAmount)) {
      setFormError("Adj meg 0-nál nagyobb, legfeljebb két tizedesjegyű RON összeget.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) {
      setFormError("Válassz érvényes dátumot.");
      return;
    }
    if (type !== "INCOME" && !categories.some((item) => item.id === categoryId)) {
      setFormError("Válassz aktív kiadási kategóriát.");
      return;
    }
    const trimmedNote = note.trim();
    if (Array.from(trimmedNote).length > 500) {
      setFormError("A megjegyzés legfeljebb 500 karakter lehet.");
      return;
    }
    const body = JSON.stringify({
      type, amount: normalizedAmount, currency: "RON", occurredOn,
      ...(type === "INCOME" ? {} : { categoryId }),
      ...(trimmedNote ? { note: trimmedNote } : {}),
    });
    const key = intentRef.current?.payload === body ? intentRef.current.key : newIntentId();
    intentRef.current = { payload: body, key };
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/households/${encodeURIComponent(householdId)}/ledger-entries`, {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json", "Idempotency-Key": key },
        body,
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiMessage(payload, "A tétel mentése nem sikerült."));
      const entry = payload && typeof payload === "object" ? (payload as Record<string, unknown>).entry : null;
      if (!entry || typeof entry !== "object" || typeof (entry as Record<string, unknown>).id !== "string" ||
        typeof (entry as Record<string, unknown>).amount !== "string") {
        throw new Error("A mentés válasza nem olvasható. Próbáld újra ugyanazt a tételt.");
      }
      setSaved({ id: (entry as SavedEntry).id, type, amount: (entry as SavedEntry).amount });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "A tétel mentése nem sikerült.");
    } finally {
      setBusy(false);
    }
  }

  const household = households.find((item) => item.id === householdId);
  const canWrite = household?.role === "OWNER" || household?.role === "MEMBER";
  const categoryRequired = type !== "INCOME";

  return (
    <AppShell>
      <main className={`app-main ${styles.page}`}>
        <Link className={styles.back} href="/"><span aria-hidden="true">‹</span> Áttekintés</Link>
        <header className={styles.heading}>
          <h1>Új tétel</h1>
          <p>A háztartás közös naplójába kerül.</p>
        </header>

        {sessionPending ? <p role="status">Fiók ellenőrzése…</p> :
          sessionError ? (
            <div className={styles.feedback} role="alert">
              <p>A fiók állapota most nem ellenőrizhető.</p>
              <button onClick={() => void refetch()} type="button">Újrapróbálás</button>
            </div>
          ) : !userId ? (
            <div className={styles.feedback}>
              <p>A tétel rögzítéséhez jelentkezz be.</p>
              <Link href="/bejelentkezes">Bejelentkezés</Link>
            </div>
          ) : householdsLoading ? <p role="status">Háztartás betöltése…</p> :
            householdError ? <p className={styles.feedback} role="alert">{householdError}</p> :
              !household ? (
                <div className={styles.feedback}>
                  <p>Előbb hozz létre háztartást, vagy csatlakozz egyhez.</p>
                  <Link href="/kezdes">Háztartás beállítása</Link>
                </div>
              ) : (
                <>
                  <div className={styles.householdContext}>
                    <label htmlFor="ledger-household">Háztartás</label>
                    {households.length > 1 ? (
                      <select id="ledger-household" value={householdId} disabled={busy} onChange={(event) => {
                        changed();
                        setCategories([]);
                        setCategoryId("");
                        setCategoriesLoading(true);
                        setCategoryError(null);
                        setHouseholdId(event.currentTarget.value);
                        rememberHouseholdId(event.currentTarget.value);
                      }}>
                        {households.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                    ) : <span>{household.name} · RON</span>}
                  </div>
                  {!canWrite ? (
                    <p className={styles.feedback} role="status">Ebben a háztartásban csak megtekintési jogosultságod van.</p>
                  ) : (
                    <form className={styles.form} onSubmit={(event) => void submit(event)}>
                      <fieldset className={styles.typeSelector} disabled={busy || saved !== null}>
                        <legend>Tétel típusa</legend>
                        <div className={styles.typeOptions}>
                          {entryTypes.map((item) => (
                            <label className={styles.typeOption} key={item.value}>
                              <input type="radio" name="entry-type" value={item.value} checked={type === item.value} onChange={() => { changed(); setType(item.value); setCategoryId(""); }} />
                              <span>{item.label}</span>
                            </label>
                          ))}
                        </div>
                      </fieldset>

                      <div className={styles.amountField}>
                        <label htmlFor="ledger-amount">Összeg</label>
                        <div className={styles.amountControl}>
                          <input id="ledger-amount" type="text" inputMode="decimal" autoComplete="off" placeholder="0,00" maxLength={12}
                            value={amount} disabled={busy || saved !== null} onChange={(event) => { changed(); setAmount(event.currentTarget.value); }} required />
                          <span>RON</span>
                        </div>
                      </div>

                      <div className={styles.fields}>
                        <div className={styles.field}>
                          <label htmlFor="ledger-date">Dátum</label>
                          <input id="ledger-date" type="date" value={occurredOn} disabled={busy || saved !== null}
                            onChange={(event) => { changed(); setOccurredOn(event.currentTarget.value); }} required />
                        </div>
                        {categoryRequired && (
                          <div className={styles.field}>
                            <label htmlFor="ledger-category">Kategória</label>
                            <select id="ledger-category" value={categoryId} disabled={busy || saved !== null || categoriesLoading || Boolean(categoryError)}
                              onChange={(event) => { changed(); setCategoryId(event.currentTarget.value); }} required>
                              <option value="">Válassz kategóriát</option>
                              {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                            </select>
                            {categoriesLoading && <p role="status">Kategóriák betöltése…</p>}
                            {categoryError && <p className={styles.fieldError} role="alert">{categoryError}</p>}
                            {!categoriesLoading && !categoryError && categories.length === 0 && <p className={styles.fieldError}>Nincs aktív kategória. A tulajdonos a Beállításokban adhat hozzá.</p>}
                          </div>
                        )}
                        <div className={styles.field}>
                          <label htmlFor="ledger-note">Megjegyzés <span>(nem kötelező)</span></label>
                          <textarea id="ledger-note" rows={3} maxLength={500} value={note} disabled={busy || saved !== null}
                            onChange={(event) => { changed(); setNote(event.currentTarget.value); }} />
                        </div>
                      </div>

                      {formError && <p className={styles.formError} role="alert">{formError}</p>}
                      {saved ? (
                        <div className={styles.saved} role="status">
                          <p>Elmentve: {saved.amount} RON.</p>
                          <button type="button" onClick={() => {
                            setAmount(""); setNote(""); setCategoryId(""); setFormError(null); setSaved(null); intentRef.current = null;
                          }}>Új tétel rögzítése</button>
                          <Link href="/">Vissza az áttekintéshez</Link>
                        </div>
                      ) : (
                        <button className={styles.submit} type="submit" disabled={busy || (categoryRequired && (categoriesLoading || Boolean(categoryError) || categories.length === 0))}>
                          {busy ? "Mentés…" : "Tétel mentése"}
                        </button>
                      )}
                    </form>
                  )}
                </>
              )}
      </main>
    </AppShell>
  );
}
