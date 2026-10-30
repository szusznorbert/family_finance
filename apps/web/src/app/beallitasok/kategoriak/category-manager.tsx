"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import styles from "./categories.module.css";

type Role = "OWNER" | "MEMBER" | "VIEWER";
type Household = { id: string; name: string; role: Role };
type Category = {
  id: string;
  name: string;
  sortOrder: number;
  archivedAt: string | null;
};

const selectionKey = "household-selection:v1";

function isHousehold(value: unknown): value is Household {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" &&
    typeof item.name === "string" &&
    (item.role === "OWNER" || item.role === "MEMBER" || item.role === "VIEWER");
}

function isCategory(value: unknown): value is Category {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.sortOrder === "number" &&
    (item.archivedAt === null || typeof item.archivedAt === "string");
}

function apiMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const error = (payload as Record<string, unknown>).error;
  if (!error || typeof error !== "object") return fallback;
  const message = (error as Record<string, unknown>).message;
  return typeof message === "string" ? message : fallback;
}

function validName(name: string) {
  const trimmed = name.trim();
  return trimmed.length > 0 && Array.from(trimmed).length <= 100;
}

function selectedHouseholdId() {
  try {
    return window.localStorage.getItem(selectionKey);
  } catch {
    return null;
  }
}

function rememberHouseholdId(id: string) {
  try {
    window.localStorage.setItem(selectionKey, id);
  } catch {
    // The selection still works for this visit when storage is unavailable.
  }
}

export default function CategoryManager() {
  const createInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [householdId, setHouseholdId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [householdsLoading, setHouseholdsLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (creating) createInputRef.current?.focus();
  }, [creating]);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  useEffect(() => {
    let active = true;
    async function loadHouseholds() {
      try {
        const response = await fetch("/api/v1/households", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) throw new Error(apiMessage(payload, "A háztartások nem tölthetők be."));
        const values = payload && typeof payload === "object"
          ? (payload as Record<string, unknown>).households : null;
        if (!Array.isArray(values) || !values.every(isHousehold)) {
          throw new Error("A háztartások adatai nem olvashatók.");
        }
        if (!active) return;
        const savedId = selectedHouseholdId();
        const nextId = values.find((household) => household.id === savedId)?.id ?? values[0]?.id ?? "";
        setHouseholds(values);
        setHouseholdId(nextId);
        if (nextId) setCategoriesLoading(true);
        if (nextId) rememberHouseholdId(nextId);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "A háztartások nem tölthetők be.");
      } finally {
        if (active) setHouseholdsLoading(false);
      }
    }
    void loadHouseholds();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!householdId) return;
    let active = true;
    async function loadCategories() {
      setCategoriesLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/v1/households/${encodeURIComponent(householdId)}/categories`,
          { cache: "no-store", credentials: "same-origin" },
        );
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) throw new Error(apiMessage(payload, "A kategóriák nem tölthetők be."));
        const values = payload && typeof payload === "object"
          ? (payload as Record<string, unknown>).categories : null;
        if (!Array.isArray(values) || !values.every(isCategory)) {
          throw new Error("A kategóriák adatai nem olvashatók.");
        }
        if (active) setCategories(values);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "A kategóriák nem tölthetők be.");
      } finally {
        if (active) setCategoriesLoading(false);
      }
    }
    void loadCategories();
    return () => { active = false; };
  }, [householdId, refresh]);

  const selected = households.find((household) => household.id === householdId);
  const isOwner = selected?.role === "OWNER";
  const activeCategories = categories.filter((category) => category.archivedAt === null);
  const archivedCategories = categories.filter((category) => category.archivedAt !== null);

  function chooseHousehold(id: string) {
    if (!households.some((household) => household.id === id)) return;
    setHouseholdId(id);
    setCategoriesLoading(true);
    rememberHouseholdId(id);
    setCategories([]);
    setCreating(false);
    setEditingId(null);
    setError(null);
    setNotice(null);
  }

  async function writeCategory(
    path: string,
    method: "POST" | "PATCH",
    body: { name: string } | { archived: true },
    successMessage: string,
  ) {
    if (!isOwner || !householdId || busy) return false;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(path, {
        method,
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiMessage(payload, "A kategória mentése nem sikerült."));
      const value = payload && typeof payload === "object"
        ? (payload as Record<string, unknown>).category : null;
      if (!isCategory(value)) throw new Error("A mentett kategória adatai nem olvashatók.");
      setNotice(successMessage);
      setRefresh((current) => current + 1);
      return true;
    } catch (writeError) {
      setError(writeError instanceof Error ? writeError.message : "A kategória mentése nem sikerült.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validName(newName)) {
      setError("A név 1 és 100 karakter közötti lehet.");
      return;
    }
    const saved = await writeCategory(
      `/api/v1/households/${encodeURIComponent(householdId)}/categories`,
      "POST",
      { name: newName.trim() },
      "A kategória létrejött.",
    );
    if (saved) {
      setNewName("");
      setCreating(false);
    }
  }

  async function renameCategory(event: FormEvent<HTMLFormElement>, categoryId: string) {
    event.preventDefault();
    if (!validName(editingName)) {
      setError("A név 1 és 100 karakter közötti lehet.");
      return;
    }
    const saved = await writeCategory(
      `/api/v1/households/${encodeURIComponent(householdId)}/categories/${encodeURIComponent(categoryId)}`,
      "PATCH",
      { name: editingName.trim() },
      "A kategória neve elmentve.",
    );
    if (saved) setEditingId(null);
  }

  async function archiveCategory(category: Category) {
    if (!window.confirm(`Archiválod a(z) „${category.name}” kategóriát? A korábbi tételeken továbbra is látható marad.`)) return;
    const archived = await writeCategory(
      `/api/v1/households/${encodeURIComponent(householdId)}/categories/${encodeURIComponent(category.id)}`,
      "PATCH",
      { archived: true },
      "A kategória archiválva.",
    );
    if (archived) setEditingId(null);
  }

  return (
    <div className={styles.manager}>
      {householdsLoading ? (
        <p className={styles.status} role="status">Háztartások betöltése…</p>
      ) : households.length === 0 && !error ? (
        <p className={styles.status}>Nincs még háztartásod. <Link href="/kezdes">Hozz létre egyet</Link> a kategóriák kezeléséhez.</p>
      ) : selected ? (
        <>
          <div className={styles.context}>
            {households.length > 1 ? (
              <label className={styles.householdLabel} htmlFor="categories-household">
                Háztartás
                <select
                  disabled={busy}
                  id="categories-household"
                  onChange={(event) => chooseHousehold(event.currentTarget.value)}
                  value={householdId}
                >
                  {households.map((household) => (
                    <option key={household.id} value={household.id}>{household.name}</option>
                  ))}
                </select>
              </label>
            ) : (
              <p className={styles.householdName}>Háztartás <strong>{selected.name}</strong></p>
            )}
          </div>

          {error && <p className={styles.error} role="alert">{error}</p>}
          {notice && <p className={styles.notice} role="status">{notice}</p>}

          <section aria-labelledby="active-categories-title" className={styles.listSection}>
            <h2 id="active-categories-title">Aktív kategóriák</h2>
            {categoriesLoading ? (
              <p className={styles.status} role="status">Kategóriák betöltése…</p>
            ) : (
              <ul className={styles.groupList}>
                {activeCategories.length === 0 && (
                  <li className={styles.emptyRow}>Nincs aktív kategória.</li>
                )}
                {activeCategories.map((category) => (
                  <li className={styles.categoryRow} key={category.id}>
                    {editingId === category.id && isOwner ? (
                      <form className={styles.editForm} onSubmit={(event) => void renameCategory(event, category.id)}>
                        <label htmlFor={`category-name-${category.id}`}>Kategória neve</label>
                        <input
                          autoComplete="off"
                          disabled={busy}
                          id={`category-name-${category.id}`}
                          maxLength={100}
                          onChange={(event) => setEditingName(event.currentTarget.value)}
                          ref={editInputRef}
                          value={editingName}
                        />
                        <div className={styles.editActions}>
                          <button disabled={busy || !validName(editingName)} type="submit">Mentés</button>
                          <button className={styles.quietButton} disabled={busy} onClick={() => {
                            setEditingId(null);
                            window.requestAnimationFrame(() => document.getElementById(`category-edit-${category.id}`)?.focus());
                          }} type="button">Mégse</button>
                          <button className={styles.dangerButton} disabled={busy} onClick={() => void archiveCategory(category)} type="button">Archiválás</button>
                        </div>
                      </form>
                    ) : (
                      <div className={styles.displayRow}>
                        <span className={styles.categoryName}>{category.name}</span>
                        {isOwner && (
                          <button
                            className={styles.editButton}
                            aria-label={`${category.name} szerkesztése`}
                            disabled={busy}
                            id={`category-edit-${category.id}`}
                            onClick={() => {
                              setCreating(false);
                              setEditingId(category.id);
                              setEditingName(category.name);
                              setError(null);
                            }}
                            type="button"
                          ><span aria-hidden="true">›</span></button>
                        )}
                      </div>
                    )}
                  </li>
                ))}
                {isOwner && (
                  <li className={styles.createRow}>
                    {creating ? (
                      <form className={styles.addForm} onSubmit={(event) => void addCategory(event)}>
                        <label htmlFor="new-category">Új kategória neve</label>
                        <input
                          autoComplete="off"
                          disabled={busy}
                          id="new-category"
                          maxLength={100}
                          onChange={(event) => setNewName(event.currentTarget.value)}
                          ref={createInputRef}
                          value={newName}
                        />
                        <div className={styles.editActions}>
                          <button disabled={busy || !validName(newName)} type="submit">Hozzáadás</button>
                          <button className={styles.quietButton} disabled={busy} onClick={() => {
                            setCreating(false);
                            setNewName("");
                            window.requestAnimationFrame(() => document.getElementById("category-create")?.focus());
                          }} type="button">Mégse</button>
                        </div>
                      </form>
                    ) : (
                      <button className={styles.createButton} disabled={busy} id="category-create" onClick={() => {
                        setEditingId(null);
                        setCreating(true);
                      }} type="button">
                        <span aria-hidden="true">＋</span> Új kategória
                      </button>
                    )}
                  </li>
                )}
              </ul>
            )}
          </section>

          {!categoriesLoading && archivedCategories.length > 0 && (
            <section aria-labelledby="archived-categories-title" className={styles.listSection}>
              <h2 id="archived-categories-title">Archivált kategóriák</h2>
              <p className={styles.sectionHint}>Korábbi tételeken megmaradnak, új kiadáshoz már nem választhatók.</p>
              <ul className={styles.groupList}>
                {archivedCategories.map((category) => (
                  <li className={`${styles.categoryRow} ${styles.archivedRow}`} key={category.id}>
                    <span className={styles.categoryName}>{category.name}</span>
                    <span className={styles.archivedBadge}>Archivált</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      ) : null}
      {error && !selected && <p className={styles.error} role="alert">{error}</p>}
    </div>
  );
}
