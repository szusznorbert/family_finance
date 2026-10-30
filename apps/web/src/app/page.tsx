"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import AppShell from "./app-shell";
import QuickCameraUpload from "./quick-camera-upload";
import ledgerStyles from "./naplo/ledger-list.module.css";
import styles from "./overview.module.css";

type HouseholdSummary = {
  id: string;
  name: string;
  currency: "RON";
  role: "OWNER" | "MEMBER" | "VIEWER";
};

type DashboardCategory = {
  categoryId: string | null;
  categoryName: string;
  expenses: string;
  refunds: string;
  netExpenses: string;
};

type MonthlyDashboard = {
  month: string;
  currency: "RON";
  income: string;
  grossExpenses: string;
  grossRefunds: string;
  netExpenses: string;
  categories: DashboardCategory[];
};

type DashboardState = {
  key: string;
  dashboard?: MonthlyDashboard;
  error?: string;
};

type RecentEntry = {
  id: string;
  type: "INCOME" | "EXPENSE" | "REFUND";
  amount: string;
  currency: "RON";
  occurredOn: string;
  categoryId: string | null;
  note: string | null;
  sourceType: string;
};

type RecentCategory = { id: string; name: string };
type RecentItemsState = {
  key: string;
  entries?: RecentEntry[];
  categories?: RecentCategory[];
  error?: string;
};

const selectedHouseholdKey = "household-selection:v1";

function isHouseholdSummary(value: unknown): value is HouseholdSummary {
  if (!value || typeof value !== "object") return false;
  const household = value as Record<string, unknown>;
  return typeof household.id === "string" &&
    typeof household.name === "string" &&
    household.currency === "RON" &&
    (household.role === "OWNER" || household.role === "MEMBER" || household.role === "VIEWER");
}

function savedHouseholdId() {
  try {
    return window.localStorage.getItem(selectedHouseholdKey);
  } catch {
    return null;
  }
}

function saveHouseholdId(id: string) {
  try {
    window.localStorage.setItem(selectedHouseholdKey, id);
  } catch {
    // Selection remains available for this visit when storage is disabled.
  }
}

function currentMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((value) => value.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}`;
}

function isMoney(value: unknown): value is string {
  return typeof value === "string" && /^-?\d+\.\d{2}$/.test(value);
}

function isDashboardCategory(value: unknown): value is DashboardCategory {
  if (!value || typeof value !== "object") return false;
  const category = value as Record<string, unknown>;
  return (category.categoryId === null || typeof category.categoryId === "string") &&
    typeof category.categoryName === "string" &&
    isMoney(category.expenses) && isMoney(category.refunds) && isMoney(category.netExpenses);
}

function isMonthlyDashboard(value: unknown, expectedMonth: string): value is MonthlyDashboard {
  if (!value || typeof value !== "object") return false;
  const dashboard = value as Record<string, unknown>;
  return dashboard.month === expectedMonth && dashboard.currency === "RON" &&
    isMoney(dashboard.income) && isMoney(dashboard.grossExpenses) &&
    isMoney(dashboard.grossRefunds) && isMoney(dashboard.netExpenses) &&
    Array.isArray(dashboard.categories) && dashboard.categories.every(isDashboardCategory);
}

function isRecentEntry(value: unknown): value is RecentEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.id === "string" &&
    (entry.type === "INCOME" || entry.type === "EXPENSE" || entry.type === "REFUND") &&
    isMoney(entry.amount) && entry.currency === "RON" &&
    typeof entry.occurredOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(entry.occurredOn) &&
    (entry.categoryId === null || typeof entry.categoryId === "string") &&
    (entry.note === null || typeof entry.note === "string") &&
    typeof entry.sourceType === "string";
}

function isRecentCategory(value: unknown): value is RecentCategory {
  if (!value || typeof value !== "object") return false;
  const category = value as Record<string, unknown>;
  return typeof category.id === "string" && typeof category.name === "string";
}

function formatAmount(value: string) {
  const [whole, cents = "00"] = value.split(".");
  const isNegative = whole.startsWith("-");
  const digits = isNegative ? whole.slice(1) : whole;
  const grouped = new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 }).format(BigInt(digits));
  return `${isNegative ? "−" : ""}${grouped},${cents} RON`;
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("hu-HU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

const recentTypeLabels: Record<RecentEntry["type"], string> = {
  INCOME: "Bevétel",
  EXPENSE: "Kiadás",
  REFUND: "Visszatérítés",
};

function monthTitle(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("hu-HU", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

export default function Home() {
  const router = useRouter();
  const { data, isPending: sessionPending, error: sessionError, refetch } = authClient.useSession();
  const [households, setHouseholds] = useState<HouseholdSummary[]>([]);
  const [householdsForUserId, setHouseholdsForUserId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [loadingHouseholds, setLoadingHouseholds] = useState(true);
  const [householdError, setHouseholdError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [month, setMonth] = useState("");
  const [dashboardRetry, setDashboardRetry] = useState(0);
  const [dashboardState, setDashboardState] = useState<DashboardState | null>(null);
  const [recentRetry, setRecentRetry] = useState(0);
  const [recentItemsState, setRecentItemsState] = useState<RecentItemsState | null>(null);
  const userId = data?.user?.id;

  useEffect(() => {
    if (sessionPending || !userId) return;

    const authenticatedUserId = userId;
    let active = true;
    async function loadHouseholds() {
      try {
        const response = await fetch("/api/v1/households", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(response.status === 401
            ? "A munkamenet lejárt. Jelentkezz be újra."
            : "A háztartási adatok most nem tölthetők be.");
        }

        const values = payload && typeof payload === "object"
          ? (payload as Record<string, unknown>).households
          : null;
        if (!Array.isArray(values) || !values.every(isHouseholdSummary)) {
          throw new Error("A háztartási adatok nem olvashatók.");
        }
        if (!active) return;
        setHouseholdError(null);

        if (values.length === 0) {
          router.replace("/kezdes");
          return;
        }

        const savedId = savedHouseholdId();
        const nextHousehold = values.find((household) => household.id === savedId) ?? values[0];
        setHouseholds(values);
        setSelectedId(nextHousehold.id);
        setMonth(currentMonth());
        setHouseholdsForUserId(authenticatedUserId);
        saveHouseholdId(nextHousehold.id);
      } catch (loadError) {
        if (active) {
          setHouseholdsForUserId(authenticatedUserId);
          setHouseholdError(loadError instanceof Error
            ? loadError.message
            : "A háztartási adatok most nem tölthetők be.");
        }
      } finally {
        if (active) setLoadingHouseholds(false);
      }
    }

    void loadHouseholds();
    return () => {
      active = false;
    };
  }, [router, sessionPending, userId, retry]);

  const selectedHousehold = householdsForUserId === userId
    ? households.find((household) => household.id === selectedId)
    : undefined;
  const dashboardKey = selectedId && month ? `${selectedId}:${month}` : "";

  useEffect(() => {
    if (!selectedId || !month || sessionPending || !userId) return;

    let active = true;
    const key = `${selectedId}:${month}`;
    async function loadDashboard() {
      try {
        const response = await fetch(
          `/api/v1/households/${encodeURIComponent(selectedId)}/dashboard?month=${encodeURIComponent(month)}`,
          { cache: "no-store", credentials: "same-origin" },
        );
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(response.status === 401
            ? "A munkamenet lejárt. Jelentkezz be újra."
            : "A havi összesítés most nem tölthető be.");
        }
        if (!isMonthlyDashboard(payload, month)) {
          throw new Error("A havi összesítés adatai nem olvashatók.");
        }
        if (active) setDashboardState({ key, dashboard: payload });
      } catch (error) {
        if (active) {
          setDashboardState({
            key,
            error: error instanceof Error ? error.message : "A havi összesítés most nem tölthető be.",
          });
        }
      }
    }

    void loadDashboard();
    return () => { active = false; };
  }, [selectedId, month, sessionPending, userId, dashboardRetry]);

  const recentItemsKey = selectedId && userId ? `${userId}:${selectedId}` : "";

  useEffect(() => {
    if (!selectedId || sessionPending || !userId || householdsForUserId !== userId) return;

    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30_000);
    const key = `${userId}:${selectedId}`;

    async function loadRecentItems() {
      try {
        const householdPath = `/api/v1/households/${encodeURIComponent(selectedId)}`;
        const [entriesResponse, categoriesResponse] = await Promise.all([
          fetch(`${householdPath}/ledger-entries?page=1&pageSize=5&archived=false`, {
            cache: "no-store",
            credentials: "same-origin",
            signal: controller.signal,
          }),
          fetch(`${householdPath}/categories`, {
            cache: "no-store",
            credentials: "same-origin",
            signal: controller.signal,
          }),
        ]);
        const [entriesPayload, categoriesPayload]: [unknown, unknown] = await Promise.all([
          entriesResponse.json().catch(() => null),
          categoriesResponse.json().catch(() => null),
        ]);
        if (!entriesResponse.ok || !categoriesResponse.ok) {
          throw new Error(entriesResponse.status === 401 || categoriesResponse.status === 401
            ? "A munkamenet lejárt. Jelentkezz be újra."
            : "A legutóbbi tételek most nem tölthetők be.");
        }
        const entries = entriesPayload && typeof entriesPayload === "object"
          ? (entriesPayload as Record<string, unknown>).entries
          : null;
        const categories = categoriesPayload && typeof categoriesPayload === "object"
          ? (categoriesPayload as Record<string, unknown>).categories
          : null;
        if (!Array.isArray(entries) || entries.length > 5 || !entries.every(isRecentEntry) ||
          !Array.isArray(categories) || !categories.every(isRecentCategory)) {
          throw new Error("A legutóbbi tételek adatai nem olvashatók.");
        }
        if (active) {
          setRecentItemsState({ key, entries, categories });
        }
      } catch (error) {
        if (!active) return;
        setRecentItemsState({
          key,
          error: error instanceof Error && error.name === "AbortError"
            ? "A legutóbbi tételek lekérése túl sokáig tartott. Próbáld újra."
            : error instanceof Error ? error.message : "A legutóbbi tételek most nem tölthetők be.",
        });
      } finally {
        window.clearTimeout(timeout);
      }
    }

    void loadRecentItems();
    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [selectedId, sessionPending, userId, householdsForUserId, recentRetry]);

  const signedIn = Boolean(data?.user);
  const dashboard = dashboardState?.key === dashboardKey ? dashboardState.dashboard : undefined;
  const dashboardError = dashboardState?.key === dashboardKey ? dashboardState.error : undefined;
  const recentItems = recentItemsState?.key === recentItemsKey ? recentItemsState : undefined;
  const householdPicker = !sessionPending && !sessionError && signedIn && !loadingHouseholds && !householdError && selectedHousehold ? (
    <div className="app-household-mobile-context">
      {households.length > 1 ? (
        <>
          <label className="sr-only" htmlFor="active-household-mobile">Aktív háztartás</label>
          <select
            aria-label="Aktív háztartás"
            id="active-household-mobile"
            onChange={(event) => {
              setSelectedId(event.currentTarget.value);
              saveHouseholdId(event.currentTarget.value);
            }}
            value={selectedId}
          >
            {households.map((household) => (
              <option key={household.id} value={household.id}>
                {household.name} · {household.currency}
              </option>
            ))}
          </select>
        </>
      ) : <span className={styles.mobileHouseholdName}>{selectedHousehold.name} · {selectedHousehold.currency}</span>}
    </div>
  ) : undefined;

  return (
    <AppShell mobileContext={householdPicker}>
      <main className="app-main">
        {!sessionPending && !sessionError && !signedIn ? (
          <>
            <header className="app-page-heading">
              <h1>Közös pénzügyek, egy helyen</h1>
              <p>A családi kiadások és bevételek áttekintése a háztartás tagjainak.</p>
            </header>
            <div aria-label="Fiók" className="grouped-list">
              <Link className="grouped-row app-navigation-row" href="/bejelentkezes">
                <span className="grouped-row-title">Bejelentkezés</span>
              </Link>
              <Link className="grouped-row app-navigation-row" href="/regisztracio">
                <span className="grouped-row-title">Fiók létrehozása</span>
              </Link>
            </div>
          </>
        ) : sessionPending || loadingHouseholds || (signedIn && householdsForUserId !== userId) || (!sessionError && signedIn && households.length === 0 && !householdError) ? (
          <p className="status-message" role="status">
            {sessionPending ? "Fiók ellenőrzése…" : "Háztartás betöltése…"}
          </p>
        ) : sessionError && !signedIn ? (
          <div className="status-message status-error" role="alert">
            <p>A fiók állapota most nem ellenőrizhető.</p>
            <button className="mt-3 min-h-11 rounded-xl border px-4 py-2" onClick={() => void refetch()} type="button">
              Újrapróbálás
            </button>
          </div>
        ) : householdError ? (
          <div className="status-message status-error" role="alert">
            <p>{householdError}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {householdError.includes("Jelentkezz be") ? (
                <Link className="min-h-11 rounded-xl border px-4 py-2" href="/bejelentkezes">Bejelentkezés</Link>
              ) : (
                <button className="min-h-11 rounded-xl border px-4 py-2" onClick={() => setRetry((value) => value + 1)} type="button">
                  Újrapróbálás
                </button>
              )}
            </div>
          </div>
        ) : selectedHousehold ? (
          <div className="overview-content">
            {households.length > 1 ? (
              <div className="app-household-context app-household-desktop-context">
                <label htmlFor="active-household-desktop">Aktív háztartás</label>
                <select
                  id="active-household-desktop"
                  aria-label="Aktív háztartás"
                  onChange={(event) => {
                    setSelectedId(event.currentTarget.value);
                    saveHouseholdId(event.currentTarget.value);
                  }}
                  value={selectedId}
                >
                  {households.map((household) => (
                    <option key={household.id} value={household.id}>
                      {household.name} · {household.currency}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="app-household-desktop-name">
                {selectedHousehold.name} <span>· {selectedHousehold.currency}</span>
              </p>
            )}
            <header className="app-page-heading overview-heading">
              <div className={styles.headingRow}>
                <h1>Áttekintés</h1>
                {!sessionError && <Link className={styles.cameraDesktopFallback} href="/dokumentumok">Fájlkezelés</Link>}
              </div>
            </header>
            {!sessionError && selectedHousehold.role !== "VIEWER" && (
              <QuickCameraUpload householdId={selectedHousehold.id} key={`${userId}:${selectedHousehold.id}`} />
            )}
            <section aria-labelledby="monthly-overview-title" className={styles.dashboard}>
              <div className={styles.periodHeading}>
                <div>
                  <h2 id="monthly-overview-title">Havi összesítés</h2>
                  {month && <p>{monthTitle(month)}</p>}
                </div>
                <label className={styles.monthControl}>
                  <span className="sr-only">Összesítés hónapja</span>
                  <input
                    aria-label="Összesítés hónapja"
                    max={currentMonth()}
                    onChange={(event) => setMonth(event.currentTarget.value)}
                    type="month"
                    value={month}
                  />
                </label>
              </div>
              {!dashboard && !dashboardError ? (
                <p className={styles.loading} role="status">Havi adatok betöltése…</p>
              ) : dashboardError ? (
                <div className={styles.error} role="alert">
                  <p>{dashboardError}</p>
                  <button onClick={() => setDashboardRetry((value) => value + 1)} type="button">Újrapróbálás</button>
                </div>
              ) : dashboard ? (
                <>
                  <div className={styles.summary}>
                    <div className={styles.netTotal}>
                      <p>Nettó kiadás</p>
                      <strong>{formatAmount(dashboard.netExpenses)}</strong>
                      <span>Bruttó kiadásból a visszatérítések levonása után</span>
                    </div>
                    <dl className={styles.supportingTotals}>
                      <div><dt>Bevétel</dt><dd>{formatAmount(dashboard.income)}</dd></div>
                      <div><dt>Bruttó kiadás</dt><dd>{formatAmount(dashboard.grossExpenses)}</dd></div>
                      <div><dt>Visszatérítés</dt><dd>{formatAmount(dashboard.grossRefunds)}</dd></div>
                    </dl>
                  </div>
                  <div className={styles.categorySection}>
                    <div className={styles.categoryHeading}>
                      <h3>Költés kategóriánként</h3>
                      <span>Nettó összeg</span>
                    </div>
                    {dashboard.categories.length === 0 ? (
                      <p className={styles.empty} role="status">Ebben a hónapban még nincs könyvelt tétel.</p>
                    ) : (
                      <ul className={styles.categoryList}>
                        {dashboard.categories.map((category) => (
                          <li key={category.categoryId ?? "uncategorized"}>
                            <div className={styles.categoryRow}>
                              <h4>{category.categoryName}</h4>
                              <strong>{formatAmount(category.netExpenses)}</strong>
                            </div>
                            <p>Bruttó kiadás {formatAmount(category.expenses)} · Visszatérítés {formatAmount(category.refunds)}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              ) : null}
            </section>
            <nav aria-label="Pénzügyi nézetek" className={styles.ledgerShortcut}>
              <Link href="/naplo">Napló megnyitása <span aria-hidden="true">›</span></Link>
            </nav>
            <section aria-labelledby="recent-items-title" className={styles.recentSection}>
              <h2 id="recent-items-title">Legutóbbi tételek</h2>
              {!recentItems ? (
                <p className={styles.loading} role="status">Legutóbbi tételek betöltése…</p>
              ) : recentItems.error ? (
                <div className={styles.error} role="alert">
                  <p>{recentItems.error}</p>
                  <button onClick={() => setRecentRetry((value) => value + 1)} type="button">Újrapróbálás</button>
                </div>
              ) : recentItems.entries?.length === 0 ? (
                <p className={styles.empty} role="status">Még nincs rögzített tétel.</p>
              ) : (
                <ol className={ledgerStyles.entryList}>
                  {recentItems.entries?.map((entry) => {
                    const categoryName = entry.categoryId === null
                      ? entry.type === "INCOME" ? "Bevétel" : "Kategória nélkül"
                      : recentItems.categories?.find((category) => category.id === entry.categoryId)?.name ??
                        (entry.type === "INCOME" ? "Bevétel" : "Kategória nélkül");
                    return (
                      <li className={ledgerStyles.entry} key={entry.id}>
                        <Link
                          aria-label={`${categoryName}, ${formatDate(entry.occurredOn)}, ${recentTypeLabels[entry.type]}, ${formatAmount(entry.amount)}${entry.note ? `, ${entry.note}` : ""}. Részletek megnyitása`}
                          className={ledgerStyles.entryLink}
                          href={`/naplo/${encodeURIComponent(entry.id)}`}
                        >
                          <div className={ledgerStyles.entryCopy}>
                            <p className={ledgerStyles.entryTitle}>{categoryName}</p>
                            <p className={ledgerStyles.entryMeta}>
                              <time dateTime={entry.occurredOn}>{formatDate(entry.occurredOn)}</time>
                              <span>{recentTypeLabels[entry.type]}</span>
                              {entry.sourceType !== "MANUAL" && (
                                <span>{entry.sourceType === "RECEIPT" ? "Bizonylatból" : entry.sourceType === "RECURRENT" ? "Havi fix költség" : "Kapcsolt forrás"}</span>
                              )}
                            </p>
                            {entry.note && <p className={ledgerStyles.entryNote}>{entry.note}</p>}
                          </div>
                          <p className={ledgerStyles.amount}>{formatAmount(entry.amount)}</p>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
            {selectedHousehold.role !== "VIEWER" && (
              <div className={styles.manualEntryLink}>
                <Link href="/naplo/uj">Kézi tétel rögzítése</Link>
              </div>
            )}
          </div>
        ) : null}
      </main>
    </AppShell>
  );
}
