"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppShell from "../app-shell";
import { authClient } from "@/lib/auth-client";
import styles from "./ledger-list.module.css";

type Role = "OWNER" | "MEMBER" | "VIEWER";
type Household = { id: string; name: string; role: Role };
type Category = { id: string; name: string; archivedAt: string | null };
type EntryType = "INCOME" | "EXPENSE" | "REFUND";
type Entry = {
  id: string;
  type: EntryType;
  amount: string;
  currency: "RON";
  occurredOn: string;
  categoryId: string | null;
  note: string | null;
  sourceType: string;
  createdAt: string;
};
type Pagination = { page: number; pageSize: number; totalItems: number; totalPages: number };
type PeriodMode = "month" | "range" | "all";

const selectionKey = "household-selection:v1";
const pageSizes = [25, 50, 100] as const;
const typeLabels: Record<EntryType, string> = {
  INCOME: "Bevétel",
  EXPENSE: "Kiadás",
  REFUND: "Visszatérítés",
};

function isHousehold(value: unknown): value is Household {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.name === "string" &&
    (item.role === "OWNER" || item.role === "MEMBER" || item.role === "VIEWER");
}

function isCategory(value: unknown): value is Category {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.name === "string" &&
    (item.archivedAt === null || typeof item.archivedAt === "string");
}

function isEntry(value: unknown): value is Entry {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" &&
    (item.type === "INCOME" || item.type === "EXPENSE" || item.type === "REFUND") &&
    typeof item.amount === "string" && /^\d+\.\d{2}$/.test(item.amount) &&
    item.currency === "RON" && typeof item.occurredOn === "string" &&
    (item.categoryId === null || typeof item.categoryId === "string") &&
    (item.note === null || typeof item.note === "string") && typeof item.sourceType === "string" &&
    typeof item.createdAt === "string";
}

function apiMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const error = (payload as Record<string, unknown>).error;
  if (!error || typeof error !== "object") return fallback;
  const message = (error as Record<string, unknown>).message;
  return typeof message === "string" ? message : fallback;
}

function preferredHouseholdId() {
  try { return window.localStorage.getItem(selectionKey); } catch { return null; }
}

function rememberHouseholdId(id: string) {
  try { window.localStorage.setItem(selectionKey, id); } catch { /* The selection still works during this visit. */ }
}

function currentMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit" })
    .formatToParts(new Date());
  const part = (type: string) => parts.find((value) => value.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}`;
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("hu-HU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day)));
}

function formatAmount(value: string) {
  const [whole, cents] = value.split(".");
  const grouped = new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 }).format(BigInt(whole));
  return `${grouped},${cents} RON`;
}

function formatMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "long", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, 1)));
}

function isPagination(value: unknown): value is Pagination {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return ["page", "pageSize", "totalItems", "totalPages"].every((key) =>
    typeof item[key] === "number" && Number.isInteger(item[key]) && (item[key] as number) >= 0);
}

export default function LedgerList({ initialArchived = false }: { initialArchived?: boolean }) {
  const { data: session, isPending: sessionPending, error: sessionError, refetch } = authClient.useSession();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [householdId, setHouseholdId] = useState("");
  const [householdsLoading, setHouseholdsLoading] = useState(true);
  const [householdError, setHouseholdError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [month, setMonth] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState<"" | EntryType>("");
  const [categoryId, setCategoryId] = useState("");
  const [archived, setArchived] = useState(initialArchived);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [entriesError, setEntriesError] = useState<string | null>(null);
  const [entriesRetry, setEntriesRetry] = useState(0);
  const [filtersReady, setFiltersReady] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const userId = session?.user?.id;

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
        const selected = values.find((item) => item.id === preferredHouseholdId()) ?? values[0];
        setHouseholds(values);
        setHouseholdId(selected?.id ?? "");
        setMonth(currentMonth());
        setFiltersReady(true);
        if (selected) rememberHouseholdId(selected.id);
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
    if (!householdId) return;
    let active = true;
    async function loadCategories() {
      setCategoriesLoading(true);
      setCategoryError(null);
      try {
        const response = await fetch(`/api/v1/households/${encodeURIComponent(householdId)}/categories`, {
          cache: "no-store", credentials: "same-origin",
        });
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) throw new Error(apiMessage(payload, "A kategóriák nem tölthetők be."));
        const values = payload && typeof payload === "object" ? (payload as Record<string, unknown>).categories : null;
        if (!Array.isArray(values) || !values.every(isCategory)) throw new Error("A kategóriák adatai nem olvashatók.");
        if (active) setCategories(values);
      } catch (error) {
        if (active) setCategoryError(error instanceof Error ? error.message : "A kategóriák nem tölthetők be.");
      } finally {
        if (active) setCategoriesLoading(false);
      }
    }
    void loadCategories();
    return () => { active = false; };
  }, [householdId]);

  const dateRangeError = periodMode === "range" && from && to && from > to
    ? "A kezdő dátum nem lehet későbbi a záró dátumnál."
    : null;

  useEffect(() => {
    if (!userId || !householdId || !filtersReady || dateRangeError) return;
    let active = true;
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (periodMode === "month" && month) params.set("month", month);
    if (periodMode === "range") {
      if (from) params.set("from", from);
      if (to) params.set("to", to);
    }
    if (type) params.set("type", type);
    if (categoryId) params.set("categoryId", categoryId);
    params.set("archived", String(archived));
    async function loadEntries() {
      setEntriesLoading(true);
      setEntriesError(null);
      try {
        const response = await fetch(
          `/api/v1/households/${encodeURIComponent(householdId)}/ledger-entries?${params.toString()}`,
          { cache: "no-store", credentials: "same-origin", signal: controller.signal },
        );
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) throw new Error(apiMessage(payload, "A napló most nem tölthető be."));
        if (!payload || typeof payload !== "object") throw new Error("A napló adatai nem olvashatók.");
        const values = (payload as Record<string, unknown>).entries;
        const pageInfo = (payload as Record<string, unknown>).pagination;
        if (!Array.isArray(values) || !values.every(isEntry) || !isPagination(pageInfo)) {
          throw new Error("A napló adatai nem olvashatók.");
        }
        if (active) {
          setEntries(values);
          setPagination(pageInfo);
          if (pageInfo.totalPages > 0 && page > pageInfo.totalPages) setPage(pageInfo.totalPages);
        }
      } catch (error) {
        if (active && !(error instanceof DOMException && error.name === "AbortError")) {
          setEntriesError(error instanceof Error ? error.message : "A napló most nem tölthető be.");
        }
      } finally {
        if (active) setEntriesLoading(false);
      }
    }
    void loadEntries();
    return () => { active = false; controller.abort(); };
  }, [userId, householdId, filtersReady, periodMode, month, from, to, type, categoryId, archived, page, pageSize, dateRangeError, entriesRetry]);

  const selectedHousehold = households.find((item) => item.id === householdId);
  const visibleHousehold = !sessionPending && !sessionError && Boolean(userId) &&
    !householdsLoading && !householdError ? selectedHousehold : undefined;
  const categoryNames = useMemo(() => new Map(categories.map((item) => [item.id, item.name])), [categories]);
  const periodSummary = periodMode === "month"
    ? `Hónap: ${month ? formatMonth(month) : "nincs kiválasztva"}`
    : periodMode === "range"
      ? `Dátumtartomány: ${from || "kezdő dátum nélkül"} – ${to || "záró dátum nélkül"}`
      : "Minden dátum";
  const activeFilterSummary = [
    periodSummary,
    type ? typeLabels[type] : null,
    categoryId ? `Kategória: ${categoryNames.get(categoryId) ?? "kiválasztva"}` : null,
    archived ? "Archivált tételek" : null,
  ].filter(Boolean).join(" · ");
  const filterError = categoryError || dateRangeError;
  const showingStart = pagination && pagination.totalItems > 0 ? (pagination.page - 1) * pagination.pageSize + 1 : 0;
  const showingEnd = pagination ? Math.min(pagination.page * pagination.pageSize, pagination.totalItems) : 0;

  function resetPage() { setPage(1); }
  function chooseHousehold(id: string) {
    if (!households.some((item) => item.id === id)) return;
    setEntries([]);
    setPagination(null);
    setEntriesLoading(false);
    setEntriesError(null);
    setHouseholdId(id);
    setCategories([]);
    setCategoryId("");
    setPage(1);
    rememberHouseholdId(id);
  }

  return (
    <AppShell mobileContext={visibleHousehold ? (
      <div className="app-household-mobile-context">
        {households.length > 1 ? (
          <>
            <label className="sr-only" htmlFor="ledger-household-mobile">Aktív háztartás</label>
            <select id="ledger-household-mobile" value={householdId} onChange={(event) => chooseHousehold(event.currentTarget.value)}>
              {households.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </>
        ) : <span className={styles.mobileHouseholdName}>{visibleHousehold.name}</span>}
      </div>
    ) : undefined}>
      <main className={`app-main ${styles.page}`}>
        <Link className={styles.back} href="/">
          <span aria-hidden="true">‹</span> Vissza az áttekintéshez
        </Link>
        <header className={styles.heading}>
          <h1>Napló</h1>
          {visibleHousehold && visibleHousehold.role !== "VIEWER" && (
            <Link className={styles.manualEntryLink} href="/naplo/uj">Kézi tétel</Link>
          )}
          <p>A háztartás rögzített kiadásai és bevételei.</p>
        </header>

        {sessionPending ? <p role="status">Fiók ellenőrzése…</p> :
          sessionError ? (
            <div className={styles.feedback} role="alert">
              <p>A fiók állapota most nem ellenőrizhető.</p>
              <button type="button" onClick={() => void refetch()}>Újrapróbálás</button>
            </div>
          ) : !userId ? (
            <div className={styles.feedback}>
              <p>A napló megtekintéséhez jelentkezz be.</p>
              <Link href="/bejelentkezes">Bejelentkezés</Link>
            </div>
          ) : householdsLoading ? <p role="status">Háztartás betöltése…</p> :
            householdError ? (
              <div className={styles.feedback} role="alert">
                <p>{householdError}</p>
                <button type="button" onClick={() => window.location.reload()}>Újrapróbálás</button>
              </div>
            ) : !selectedHousehold ? (
              <div className={styles.feedback}>
                <p>Előbb hozz létre háztartást, vagy csatlakozz egyhez.</p>
                <Link href="/kezdes">Háztartás beállítása</Link>
              </div>
            ) : (
              <>
                {households.length > 1 && (
                  <div className={styles.householdContext}>
                    <label htmlFor="ledger-household">Háztartás</label>
                    <select id="ledger-household" value={householdId} onChange={(event) => chooseHousehold(event.currentTarget.value)}>
                      {households.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </div>
                )}

                <section aria-labelledby="ledger-filters-title" className={styles.filters}>
                  <div className={styles.filterHeading}>
                    <div className={styles.filterHeadingCopy}>
                      <h2 id="ledger-filters-title">Szűrés</h2>
                      <p className={styles.filterSummary}>{activeFilterSummary}</p>
                      {filterError && <p className={styles.filterAlert}>A szűrés figyelmet igényel</p>}
                    </div>
                    <button
                      aria-controls="ledger-filter-fields"
                      aria-expanded={filtersOpen}
                      className={styles.filterToggle}
                      onClick={() => setFiltersOpen((open) => !open)}
                      type="button"
                    >
                      {filtersOpen ? "Bezárás" : "Szűrők"}
                    </button>
                  </div>
                  <div className={styles.filterGrid} data-open={filtersOpen} id="ledger-filter-fields">
                    <div className={styles.field}>
                      <label htmlFor="ledger-period">Időszak</label>
                      <select id="ledger-period" value={periodMode} onChange={(event) => {
                        setPeriodMode(event.currentTarget.value as PeriodMode); resetPage();
                      }}>
                        <option value="month">Hónap</option>
                        <option value="range">Dátumtartomány</option>
                        <option value="all">Minden dátum</option>
                      </select>
                    </div>
                    {periodMode === "month" && (
                      <div className={styles.field}>
                        <label htmlFor="ledger-month">Hónap</label>
                        <input id="ledger-month" type="month" value={month} onChange={(event) => {
                          setMonth(event.currentTarget.value); resetPage();
                        }} />
                      </div>
                    )}
                    {periodMode === "range" && (
                      <>
                        <div className={styles.field}>
                          <label htmlFor="ledger-from">Ettől</label>
                          <input id="ledger-from" type="date" value={from} onChange={(event) => {
                            setFrom(event.currentTarget.value); resetPage();
                          }} />
                        </div>
                        <div className={styles.field}>
                          <label htmlFor="ledger-to">Eddig</label>
                          <input id="ledger-to" type="date" value={to} onChange={(event) => {
                            setTo(event.currentTarget.value); resetPage();
                          }} />
                        </div>
                      </>
                    )}
                    <div className={styles.field}>
                      <label htmlFor="ledger-type">Típus</label>
                      <select id="ledger-type" value={type} onChange={(event) => {
                        setType(event.currentTarget.value as "" | EntryType); resetPage();
                      }}>
                        <option value="">Minden típus</option>
                        <option value="EXPENSE">Kiadás</option>
                        <option value="INCOME">Bevétel</option>
                        <option value="REFUND">Visszatérítés</option>
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="ledger-category">Kategória</label>
                      <select id="ledger-category" value={categoryId} disabled={categoriesLoading || Boolean(categoryError)} onChange={(event) => {
                        setCategoryId(event.currentTarget.value); resetPage();
                      }}>
                        <option value="">Minden kategória</option>
                        {categories.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}{item.archivedAt ? " · archivált" : ""}</option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="ledger-archived">Állapot</label>
                      <select id="ledger-archived" value={archived ? "archived" : "active"} onChange={(event) => {
                        setArchived(event.currentTarget.value === "archived"); resetPage();
                      }}>
                        <option value="active">Aktív tételek</option>
                        <option value="archived">Archivált tételek</option>
                      </select>
                    </div>
                  </div>
                  {categoryError && <p className={styles.inlineError} role="alert">{categoryError}</p>}
                  {dateRangeError && <p className={styles.inlineError} role="alert">{dateRangeError}</p>}
                </section>

                {dateRangeError ? null : entriesError ? (
                  <div className={styles.feedback} role="alert">
                    <p>{entriesError}</p>
                    <button type="button" onClick={() => setEntriesRetry((value) => value + 1)}>Újrapróbálás</button>
                  </div>
                ) : entriesLoading ? (
                  <p className={styles.status} role="status">Napló betöltése…</p>
                ) : pagination && pagination.totalItems === 0 ? (
                  <div className={styles.empty}>
                    <h2>Még nincs ilyen tétel</h2>
                    <p>A megadott időszakhoz és szűrőkhöz nem található naplóbejegyzés.</p>
                    {selectedHousehold.role !== "VIEWER" && <Link href="/naplo/uj">Új tétel rögzítése</Link>}
                  </div>
                ) : pagination ? (
                  <section aria-labelledby="ledger-entries-title" className={styles.entriesSection}>
                    <div className={styles.listHeading}>
                      <h2 id="ledger-entries-title">Tételek</h2>
                      <label className={styles.pageSize} htmlFor="ledger-page-size">
                        Sorok oldalanként
                        <select id="ledger-page-size" value={pageSize} onChange={(event) => {
                          setPageSize(Number(event.currentTarget.value)); resetPage();
                        }}>
                          {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
                        </select>
                      </label>
                    </div>
                    <p className={styles.resultCount}>{showingStart}–{showingEnd} / {pagination.totalItems} tétel</p>
                    <ol className={styles.entryList}>
                      {entries.map((entry) => (
                        <li className={styles.entry} key={entry.id}>
                          <Link className={styles.entryLink} href={`/naplo/${encodeURIComponent(entry.id)}${archived ? "?archived=true" : ""}`}>
                            <div className={styles.entryCopy}>
                            <p className={styles.entryTitle}>{categoryNames.get(entry.categoryId ?? "") ?? (entry.type === "INCOME" ? "Bevétel" : "Kategória nélkül")}</p>
                            <p className={styles.entryMeta}>
                              <time dateTime={entry.occurredOn}>{formatDate(entry.occurredOn)}</time>
                              <span>{typeLabels[entry.type]}</span>
                              {archived && <span>Archivált</span>}
                              {entry.sourceType !== "MANUAL" && <span>{entry.sourceType === "RECEIPT" ? "Bizonylatból" : entry.sourceType === "RECURRENT" ? "Havi fix költség" : "Kapcsolt forrás"}</span>}
                            </p>
                            {entry.note && <p className={styles.entryNote}>{entry.note}</p>}
                            </div>
                            <p className={styles.amount}>{formatAmount(entry.amount)}</p>
                          </Link>
                        </li>
                      ))}
                    </ol>
                    {pagination.totalPages > 1 && (
                      <nav aria-label="Napló lapozása" className={styles.pagination}>
                        <button disabled={page <= 1 || entriesLoading} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button">Előző</button>
                        <span aria-live="polite">{pagination.page}. oldal / {pagination.totalPages}</span>
                        <button disabled={page >= pagination.totalPages || entriesLoading} onClick={() => setPage((value) => Math.min(pagination.totalPages, value + 1))} type="button">Következő</button>
                      </nav>
                    )}
                  </section>
                ) : (
                  <p className={styles.status} role="status">Napló betöltése…</p>
                )}
              </>
            )}
      </main>
    </AppShell>
  );
}
