"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import AppShell from "../../app-shell";
import { authClient } from "@/lib/auth-client";
import styles from "./ledger-entry-detail.module.css";

type Role = "OWNER" | "MEMBER" | "VIEWER";
type Household = { id: string; name: string; role: Role };
type EntryType = "INCOME" | "EXPENSE" | "REFUND";
type Category = { id: string; name: string; archivedAt: string | null };
type Entry = {
  id: string;
  type: EntryType;
  amount: string;
  currency: "RON";
  occurredOn: string;
  categoryId: string | null;
  note: string | null;
  sourceType: "MANUAL" | "RECEIPT" | "RECURRENT";
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};
type Revision = {
  id: string;
  action: "UPDATED" | "ARCHIVED";
  actorUserId: string;
  createdAt: string;
  previous: Entry & {
    householdId: string;
    createdByUserId: string;
    sourceRequestHash: string | null;
  };
};
type Detail = { entry: Entry; revisions: Revision[] };
type FormState = { type: EntryType; amount: string; occurredOn: string; categoryId: string; note: string };

const selectionKey = "household-selection:v1";
const types: EntryType[] = ["EXPENSE", "INCOME", "REFUND"];
const typeLabels: Record<EntryType, string> = { EXPENSE: "Kiadás", INCOME: "Bevétel", REFUND: "Visszatérítés" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isHousehold(value: unknown): value is Household {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && typeof value.name === "string" &&
    (value.role === "OWNER" || value.role === "MEMBER" || value.role === "VIEWER");
}

function isCategory(value: unknown): value is Category {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && typeof value.name === "string" &&
    (value.archivedAt === null || typeof value.archivedAt === "string");
}

function isEntry(value: unknown): value is Entry {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" &&
    (value.type === "INCOME" || value.type === "EXPENSE" || value.type === "REFUND") &&
    typeof value.amount === "string" && /^\d+\.\d{2}$/.test(value.amount) &&
    value.currency === "RON" && typeof value.occurredOn === "string" &&
    (value.categoryId === null || typeof value.categoryId === "string") &&
    (value.note === null || typeof value.note === "string") &&
    (value.sourceType === "MANUAL" || value.sourceType === "RECEIPT" || value.sourceType === "RECURRENT") &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    (value.archivedAt === null || typeof value.archivedAt === "string");
}

function isRevision(value: unknown): value is Revision {
  if (!isRecord(value) || !isRecord(value.previous)) return false;
  const previous = value.previous;
  const snapshot = previous as Record<string, unknown>;
  return typeof value.id === "string" &&
    (value.action === "UPDATED" || value.action === "ARCHIVED") &&
    typeof value.actorUserId === "string" && typeof value.createdAt === "string" &&
    isEntry(previous) && typeof snapshot.householdId === "string" &&
    typeof snapshot.createdByUserId === "string" && typeof snapshot.sourceId === "string" &&
    (snapshot.sourceRequestHash === null || typeof snapshot.sourceRequestHash === "string");
}

function apiMessage(payload: unknown, fallback: string) {
  if (!isRecord(payload) || !isRecord(payload.error)) return fallback;
  return typeof payload.error.message === "string" ? payload.error.message : fallback;
}

function localSelection() {
  try { return window.localStorage.getItem(selectionKey); } catch { return null; }
}

function rememberHousehold(id: string) {
  try { window.localStorage.setItem(selectionKey, id); } catch { /* This visit still works without storage. */ }
}

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day)));
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    timeZone: "Europe/Bucharest",
  }).format(new Date(value));
}

function formatAmount(value: string) {
  const [whole, cents] = value.split(".");
  const grouped = new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 }).format(BigInt(whole));
  return `${grouped},${cents} RON`;
}

function sourceLabel(sourceType: Entry["sourceType"]) {
  if (sourceType === "RECURRENT") return "Havi fix költség";
  return sourceType === "RECEIPT" ? "Bizonylat" : "Kézi rögzítés";
}

function formFrom(entry: Entry): FormState {
  return {
    type: entry.type,
    amount: entry.amount,
    occurredOn: entry.occurredOn,
    categoryId: entry.categoryId ?? "",
    note: entry.note ?? "",
  };
}

function snapshotCategory(entry: Entry, categories: Map<string, Category>) {
  if (entry.type === "INCOME") return "—";
  return entry.categoryId ? categories.get(entry.categoryId)?.name ?? "Korábbi vagy archivált kategória" : "Nincs kategória";
}

export default function LedgerEntryDetail({ entryId, returnToArchived = false }: { entryId: string; returnToArchived?: boolean }) {
  const { data: session, isPending: sessionPending, error: sessionError, refetch } = authClient.useSession();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [householdId, setHouseholdId] = useState("");
  const [householdLoading, setHouseholdLoading] = useState(true);
  const [householdError, setHouseholdError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailRetry, setDetailRetry] = useState(0);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const userId = session?.user?.id;

  useEffect(() => {
    if (sessionPending || sessionError || !userId) return;
    let active = true;
    async function loadHouseholds() {
      try {
        const response = await fetch("/api/v1/households", { cache: "no-store", credentials: "same-origin" });
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) throw new Error(apiMessage(payload, "A háztartások nem tölthetők be."));
        const values = isRecord(payload) ? payload.households : null;
        if (!Array.isArray(values) || !values.every(isHousehold)) throw new Error("A háztartások adatai nem olvashatók.");
        if (!active) return;
        const selected = values.find((item) => item.id === localSelection()) ?? values[0];
        setHouseholds(values);
        setHouseholdId(selected?.id ?? "");
        if (selected) rememberHousehold(selected.id);
      } catch (error) {
        if (active) setHouseholdError(error instanceof Error ? error.message : "A háztartások nem tölthetők be.");
      } finally {
        if (active) setHouseholdLoading(false);
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
        const values = isRecord(payload) ? payload.categories : null;
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

  useEffect(() => {
    if (!userId || !householdId) return;
    let active = true;
    const controller = new AbortController();
    async function loadDetail() {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const response = await fetch(
          `/api/v1/households/${encodeURIComponent(householdId)}/ledger-entries/${encodeURIComponent(entryId)}`,
          { cache: "no-store", credentials: "same-origin", signal: controller.signal },
        );
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) throw new Error(apiMessage(payload, "A tétel nem tölthető be."));
        if (!isRecord(payload) || !isEntry(payload.entry) || !Array.isArray(payload.revisions) || !payload.revisions.every(isRevision)) {
          throw new Error("A tétel részletei nem olvashatók.");
        }
        if (active) setDetail({ entry: payload.entry, revisions: payload.revisions });
      } catch (error) {
        if (active && !(error instanceof DOMException && error.name === "AbortError")) {
          setDetailError(error instanceof Error ? error.message : "A tétel nem tölthető be.");
        }
      } finally {
        if (active) setDetailLoading(false);
      }
    }
    void loadDetail();
    return () => { active = false; controller.abort(); };
  }, [userId, householdId, entryId, detailRetry]);

  const entry = detail?.entry ?? null;
  const selectedHousehold = households.find((item) => item.id === householdId);
  const categoryMap = useMemo(() => new Map(categories.map((item) => [item.id, item])), [categories]);
  const canMutate = selectedHousehold?.role === "OWNER" || selectedHousehold?.role === "MEMBER";
  const canEdit = Boolean(canMutate && entry?.sourceType === "MANUAL" && !entry.archivedAt);
  const orderedRevisions = detail?.revisions.slice().reverse() ?? [];
  const categoryOptions = categories.filter((category) => !category.archivedAt || category.id === entry?.categoryId);

  function startEditing() {
    if (!entry || !canEdit) return;
    setForm(formFrom(entry));
    setEditing(true);
    setConfirmArchive(false);
    setMutationError(null);
    setNotice(null);
  }

  function cancelEditing() {
    setEditing(false);
    setForm(null);
    setMutationError(null);
  }

  function changeForm(patch: Partial<FormState>) {
    setForm((current) => current ? { ...current, ...patch } : current);
    setMutationError(null);
    setNotice(null);
  }

  async function saveChanges(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!entry || !form || !canEdit || saving) return;
    const amount = form.amount.trim().replace(",", ".");
    if (!/^(?:0|[1-9]\d{0,8})(?:\.\d{1,2})?$/.test(amount) || /^0(?:\.0{1,2})?$/.test(amount)) {
      setMutationError("Adj meg 0-nál nagyobb, legfeljebb két tizedesjegyű RON összeget.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.occurredOn)) {
      setMutationError("Válassz érvényes dátumot.");
      return;
    }
    const note = form.note.trim();
    if (Array.from(note).length > 500) {
      setMutationError("A megjegyzés legfeljebb 500 karakter lehet.");
      return;
    }
    if (form.type !== "INCOME" && !categoryOptions.some((category) => category.id === form.categoryId && !category.archivedAt)) {
      if (form.categoryId !== entry.categoryId || form.type !== entry.type) {
        setMutationError("Válassz egy aktív kiadási kategóriát.");
        return;
      }
    }
    const body = {
      expectedUpdatedAt: entry.updatedAt,
      type: form.type,
      amount,
      occurredOn: form.occurredOn,
      ...(form.type === "INCOME" ? {} : { categoryId: form.categoryId }),
      note: note || null,
    };
    setSaving(true);
    setMutationError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/v1/households/${encodeURIComponent(householdId)}/ledger-entries/${encodeURIComponent(entry.id)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiMessage(payload, "A módosítás nem sikerült."));
      const savedEntry = isRecord(payload) ? payload.entry : null;
      if (!isEntry(savedEntry)) throw new Error("A mentett tétel adatai nem olvashatók.");
      setDetail((current) => current ? { ...current, entry: savedEntry } : current);
      setEditing(false);
      setForm(null);
      setNotice("A módosítás elmentve. A korábbi állapot megmaradt a revíziótörténetben.");
      setDetailRetry((value) => value + 1);
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : "A módosítás nem sikerült.");
    } finally {
      setSaving(false);
    }
  }

  async function archiveEntry() {
    if (!entry || !canEdit || archiving || !confirmArchive) return;
    setArchiving(true);
    setMutationError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/v1/households/${encodeURIComponent(householdId)}/ledger-entries/${encodeURIComponent(entry.id)}/archive`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiMessage(payload, "Az archiválás nem sikerült."));
      const archivedEntry = isRecord(payload) ? payload.entry : null;
      if (!isEntry(archivedEntry)) throw new Error("Az archivált tétel adatai nem olvashatók.");
      setDetail((current) => current ? { ...current, entry: archivedEntry } : current);
      setConfirmArchive(false);
      setNotice("A tétel archiválva. Az archivált naplóban és a revíziótörténetben továbbra is megtalálod.");
      setDetailRetry((value) => value + 1);
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : "Az archiválás nem sikerült.");
    } finally {
      setArchiving(false);
    }
  }

  return (
    <AppShell>
      <main className={`app-main ${styles.page}`}>
        <Link className={styles.backLink} href={returnToArchived ? "/naplo?archived=true" : "/naplo"}>‹ Vissza a Naplóhoz</Link>
        {sessionPending ? <p className={styles.status} role="status">Fiók ellenőrzése…</p> :
          sessionError ? (
            <div className={styles.feedback} role="alert">
              <p>A fiók állapota most nem ellenőrizhető.</p>
              <button type="button" onClick={() => void refetch()}>Újrapróbálás</button>
            </div>
          ) : !userId ? (
            <div className={styles.feedback}>
              <p>A tétel megtekintéséhez jelentkezz be.</p>
              <Link href="/bejelentkezes">Bejelentkezés</Link>
            </div>
          ) : householdLoading ? <p className={styles.status} role="status">Háztartás betöltése…</p> :
            householdError ? (
              <div className={styles.feedback} role="alert">
                <p>{householdError}</p>
                <button type="button" onClick={() => window.location.reload()}>Újrapróbálás</button>
              </div>
            ) : !householdId ? (
              <div className={styles.feedback}>
                <p>Előbb hozz létre háztartást, vagy csatlakozz egyhez.</p>
                <Link href="/kezdes">Háztartás beállítása</Link>
              </div>
            ) : detailError ? (
              <div className={styles.feedback} role="alert">
                <h1>A tétel nem érhető el</h1>
                <p>{detailError}</p>
                <button type="button" onClick={() => setDetailRetry((value) => value + 1)}>Újrapróbálás</button>
              </div>
            ) : detailLoading || !entry ? (
              <p className={styles.status} role="status">Tétel betöltése…</p>
            ) : (
              <>
                <header className={styles.heading}>
                  <h1>{entry.type === "INCOME" ? "Bevétel" : categoryMap.get(entry.categoryId ?? "")?.name ?? "Naplótétel"}</h1>
                  <p>{formatDate(entry.occurredOn)} · {typeLabels[entry.type]}</p>
                </header>

                <section aria-labelledby="entry-details-title" className={styles.details}>
                  <h2 id="entry-details-title">Tétel részletei</h2>
                  <dl className={styles.detailGrid}>
                    <div><dt>Összeg</dt><dd>{formatAmount(entry.amount)}</dd></div>
                    <div><dt>Dátum</dt><dd>{formatDate(entry.occurredOn)}</dd></div>
                    <div><dt>Típus</dt><dd>{typeLabels[entry.type]}</dd></div>
                    <div><dt>Kategória</dt><dd>{snapshotCategory(entry, categoryMap)}</dd></div>
                    <div className={styles.fullWidth}><dt>Megjegyzés</dt><dd>{entry.note || "Nincs megjegyzés"}</dd></div>
                    <div><dt>Forrás</dt><dd>{sourceLabel(entry.sourceType)}</dd></div>
                    <div><dt>Állapot</dt><dd>{entry.archivedAt ? `Archiválva · ${formatTimestamp(entry.archivedAt)}` : "Aktív"}</dd></div>
                  </dl>
                </section>

                {notice && <p className={styles.notice} role="status">{notice}</p>}
                {mutationError && <div className={styles.feedback} role="alert"><p>{mutationError}</p></div>}
                {categoryError && <p className={styles.inlineError} role="alert">{categoryError}</p>}

                {canEdit && !editing && (
                  <div className={styles.actions}>
                    <button className={styles.editAction} type="button" onClick={startEditing}>Tétel javítása</button>
                    {!confirmArchive ? (
                      <button className={styles.archiveAction} type="button" onClick={() => {
                        setConfirmArchive(true); setMutationError(null); setNotice(null);
                      }}>Archiválás</button>
                    ) : (
                      <div className={styles.archiveConfirmation}>
                        <p>Archiválod ezt a tételt? Kikerül az aktív listából és az aktív összesítésekből, de a naplóban és a revíziótörténetben megmarad.</p>
                        <div>
                          <button type="button" disabled={archiving} onClick={() => setConfirmArchive(false)}>Mégse</button>
                          <button type="button" disabled={archiving} onClick={() => void archiveEntry()}>{archiving ? "Archiválás…" : "Igen, archiválom"}</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {editing && form && (
                  <form className={styles.editForm} onSubmit={(event) => void saveChanges(event)}>
                    <h2>Tétel javítása</h2>
                    <div className={styles.formGrid}>
                      <div className={styles.field}>
                        <label htmlFor="edit-type">Típus</label>
                        <select id="edit-type" value={form.type} disabled={saving} onChange={(event) => {
                          const nextType = event.currentTarget.value as EntryType;
                          changeForm({ type: nextType, ...(nextType === "INCOME" ? { categoryId: "" } : {}) });
                        }}>
                          {types.map((value) => <option key={value} value={value}>{typeLabels[value]}</option>)}
                        </select>
                      </div>
                      <div className={styles.field}>
                        <label htmlFor="edit-amount">Összeg (RON)</label>
                        <input id="edit-amount" type="text" inputMode="decimal" autoComplete="off" maxLength={12} value={form.amount} disabled={saving}
                          onChange={(event) => changeForm({ amount: event.currentTarget.value })} required />
                      </div>
                      <div className={styles.field}>
                        <label htmlFor="edit-date">Dátum</label>
                        <input id="edit-date" type="date" value={form.occurredOn} disabled={saving}
                          onChange={(event) => changeForm({ occurredOn: event.currentTarget.value })} required />
                      </div>
                      {form.type !== "INCOME" && (
                        <div className={styles.field}>
                          <label htmlFor="edit-category">Kategória</label>
                          <select id="edit-category" value={form.categoryId} disabled={saving || categoriesLoading || Boolean(categoryError)}
                            onChange={(event) => changeForm({ categoryId: event.currentTarget.value })} required>
                            <option value="">Válassz kategóriát</option>
                            {categoryOptions.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}{category.archivedAt ? " · archivált, csak megtartva" : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className={`${styles.field} ${styles.fullWidth}`}>
                        <label htmlFor="edit-note">Megjegyzés</label>
                        <textarea id="edit-note" rows={3} maxLength={500} value={form.note} disabled={saving}
                          onChange={(event) => changeForm({ note: event.currentTarget.value })} />
                      </div>
                    </div>
                    {mutationError && <p className={styles.inlineError} role="alert">{mutationError}</p>}
                    <div className={styles.formActions}>
                      <button type="button" disabled={saving} onClick={cancelEditing}>Mégse</button>
                      <button type="submit" disabled={saving || (form.type !== "INCOME" && (categoriesLoading || Boolean(categoryError) || categories.length === 0))}>
                        {saving ? "Mentés…" : "Módosítás mentése"}
                      </button>
                    </div>
                  </form>
                )}

                {!entry.archivedAt && entry.sourceType === "RECEIPT" && (
                  <p className={styles.sourceNotice}>Ez bizonylatból származó tétel. A módosítás és archiválás a bizonylat munkafolyamatán keresztül intézhető.</p>
                )}
                {entry.sourceType === "RECURRENT" && (
                  <p className={styles.sourceNotice}>Ez a tétel egy havi fix költségből jött létre. A kapcsolódó szabály a Beállításokban található.</p>
                )}
                {!canMutate && entry.sourceType === "MANUAL" && !entry.archivedAt && (
                  <p className={styles.sourceNotice}>Ebben a háztartásban megtekintési jogosultságod van.</p>
                )}

                <section aria-labelledby="revision-history-title" className={styles.history}>
                  <h2 id="revision-history-title">Revíziótörténet</h2>
                  {orderedRevisions.length === 0 ? (
                    <p className={styles.historyEmpty}>Ehhez a tételhez még nem tartozik módosítási előzmény.</p>
                  ) : (
                    <ol className={styles.timeline}>
                      {orderedRevisions.map((revision) => (
                        <li className={styles.revision} key={revision.id}>
                          <div className={styles.revisionHeading}>
                            <h3>{revision.action === "ARCHIVED" ? "Archiválás előtti állapot" : "Módosítás előtti állapot"}</h3>
                            <time dateTime={revision.createdAt}>{formatTimestamp(revision.createdAt)}</time>
                          </div>
                          <p className={styles.actor}>Végrehajtó azonosítója: <code>{revision.actorUserId}</code></p>
                          <dl className={styles.revisionGrid}>
                            <div><dt>Típus</dt><dd>{typeLabels[revision.previous.type]}</dd></div>
                            <div><dt>Összeg</dt><dd>{formatAmount(revision.previous.amount)}</dd></div>
                            <div><dt>Dátum</dt><dd>{formatDate(revision.previous.occurredOn)}</dd></div>
                            <div><dt>Kategória</dt><dd>{snapshotCategory(revision.previous, categoryMap)}</dd></div>
                            <div className={styles.fullWidth}><dt>Megjegyzés</dt><dd>{revision.previous.note || "Nincs megjegyzés"}</dd></div>
                            <div><dt>Forrás</dt><dd>{sourceLabel(revision.previous.sourceType)}</dd></div>
                            <div><dt>Korábbi állapot</dt><dd>{revision.previous.archivedAt ? `Archiválva · ${formatTimestamp(revision.previous.archivedAt)}` : "Aktív"}</dd></div>
                          </dl>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              </>
            )}
      </main>
    </AppShell>
  );
}
