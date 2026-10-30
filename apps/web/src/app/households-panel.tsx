"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import InvitationsManager from "./invitations-manager";
import MembersManager from "./members-manager";
import styles from "./household-management.module.css";

type HouseholdRole = "OWNER" | "MEMBER" | "VIEWER";

type Household = {
  id: string;
  name: string;
  currency: "RON";
  createdAt: string;
  role: HouseholdRole;
  categories: { id: string; name: string; sortOrder: number }[];
};

const selectedHouseholdKey = "household-selection:v1";

function isHousehold(value: unknown): value is Household {
  if (!value || typeof value !== "object") return false;

  const household = value as Record<string, unknown>;
  return (
    typeof household.id === "string" &&
    typeof household.name === "string" &&
    household.currency === "RON" &&
    typeof household.createdAt === "string" &&
    ["OWNER", "MEMBER", "VIEWER"].includes(String(household.role)) &&
    Array.isArray(household.categories) &&
    household.categories.every(
      (category) =>
        category &&
        typeof category === "object" &&
        typeof category.id === "string" &&
        typeof category.name === "string" &&
        typeof category.sortOrder === "number",
    )
  );
}

function isHouseholdSettings(
  value: unknown,
): value is Pick<Household, "id" | "name" | "currency" | "role"> {
  if (!value || typeof value !== "object") return false;

  const household = value as Record<string, unknown>;
  return (
    typeof household.id === "string" &&
    typeof household.name === "string" &&
    household.currency === "RON" &&
    ["OWNER", "MEMBER", "VIEWER"].includes(String(household.role))
  );
}

function apiMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const error = (payload as Record<string, unknown>).error;
  if (!error || typeof error !== "object") return fallback;
  const message = (error as Record<string, unknown>).message;
  return typeof message === "string" ? message : fallback;
}

function readSelectedHouseholdId() {
  try {
    return window.localStorage.getItem(selectedHouseholdKey);
  } catch {
    return null;
  }
}

function saveSelectedHouseholdId(id: string) {
  try {
    window.localStorage.setItem(selectedHouseholdKey, id);
  } catch {
    // Household selection still works for this visit when browser storage is disabled.
  }
}

export default function HouseholdsPanel({
  view = "household",
  showHeading = true,
}: {
  view?: "household" | "members";
  showHeading?: boolean;
}) {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [renameName, setRenameName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadHouseholds() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/v1/households", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const payload: unknown = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(apiMessage(payload, "A háztartások nem tölthetők be."));
        }

        const values =
          payload && typeof payload === "object"
            ? (payload as Record<string, unknown>).households
            : null;
        if (!Array.isArray(values) || !values.every(isHousehold)) {
          throw new Error("A háztartások adatai nem olvashatók.");
        }

        if (!active) return;
        setHouseholds(values);
        const savedId = readSelectedHouseholdId();
        const nextId = values.some((household) => household.id === savedId)
          ? savedId ?? ""
          : values[0]?.id ?? "";
        setSelectedId(nextId);
        setRenameName(values.find((household) => household.id === nextId)?.name ?? "");
        if (nextId) saveSelectedHouseholdId(nextId);
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "A háztartások nem tölthetők be.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadHouseholds();
    return () => {
      active = false;
    };
  }, []);

  function selectHousehold(id: string) {
    if (!households.some((household) => household.id === id)) return;
    setSelectedId(id);
    setRenameName(households.find((household) => household.id === id)?.name ?? "");
    saveSelectedHouseholdId(id);
    setError(null);
    setSuccess(null);
  }

  async function renameHousehold(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedHousehold || selectedHousehold.role !== "OWNER") return;

    const trimmedName = renameName.trim();
    setError(null);
    setSuccess(null);
    if (!trimmedName || Array.from(trimmedName).length > 100) {
      setError("A név 1 és 100 karakter közötti lehet.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        `/api/v1/households/${encodeURIComponent(selectedHousehold.id)}`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmedName }),
        },
      );
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(apiMessage(payload, "A háztartás nevének mentése nem sikerült."));
      }

      const value =
        payload && typeof payload === "object"
          ? (payload as Record<string, unknown>).household
          : null;
      if (!isHouseholdSettings(value) || value.id !== selectedHousehold.id) {
        throw new Error("A mentett háztartás adatai nem olvashatók.");
      }

      setHouseholds((current) =>
        current.map((household) =>
          household.id === value.id
            ? { ...household, name: value.name, currency: value.currency, role: value.role }
            : household,
        ),
      );
      setRenameName(value.name);
      setSuccess("A háztartás neve elmentve.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "A háztartás nevének mentése nem sikerült.",
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedHousehold = households.find((household) => household.id === selectedId);

  return (
    <section
      aria-label={showHeading ? undefined : view === "household" ? "Háztartás" : "Tagok és meghívók"}
      aria-labelledby={showHeading ? "households-title" : undefined}
      className={styles.householdsPanel}
    >
      {showHeading && (
        <div className={styles.sectionHeading}>
          <div>
            <p className="text-sm font-medium text-emerald-800">Beállítások · {view === "household" ? "Háztartás" : "Tagok és meghívók"}</p>
            <h2 id="households-title">{view === "household" ? "Háztartás" : "Tagok és meghívók"}</h2>
            <p className="max-w-xl text-sm leading-6">
              {view === "household"
                ? "Válaszd ki a háztartást, és kezeld a nevét."
                : "Válaszd ki a háztartást a tagok és meghívók kezeléséhez."}
            </p>
          </div>
          {selectedHousehold && <span className={styles.currencyBadge}>Pénznem: {selectedHousehold.currency}</span>}
        </div>
      )}

      <div className="mt-5 grid min-w-0 gap-5">
        <div className={styles.pickerPanel} aria-busy={loading}>
          <h3>Válassz háztartást</h3>
          {loading ? (
            <p className="mt-3 text-sm text-slate-600" role="status">Háztartások betöltése…</p>
          ) : households.length === 0 ? (
            <div className="mt-3 rounded-lg border border-dashed border-slate-300 p-4 text-sm leading-6 text-slate-600">
              <p>Még nincs háztartásod.</p>
              <Link className="mt-2 inline-flex min-h-11 items-center font-semibold text-emerald-800 underline underline-offset-4" href="/kezdes">
                Hozz létre egy háztartást az indulásnál
              </Link>
            </div>
          ) : (
            <fieldset className={styles.householdChoices}>
              <legend className="sr-only">Válaszd ki az aktív háztartást</legend>
              {households.map((household) => {
                const selected = selectedId === household.id;
                return (
                  <label
                    className={`${styles.householdChoice} flex cursor-pointer items-start gap-3 rounded-lg border transition-colors focus-within:ring-2 focus-within:ring-emerald-700/30 ${selected ? styles.householdChoiceSelected : "hover:border-slate-400"}`}
                    key={household.id}
                  >
                    <input
                      checked={selected}
                      className="mt-1 size-4 accent-emerald-800"
                      name="selected-household"
                      onChange={() => selectHousehold(household.id)}
                      type="radio"
                      value={household.id}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-slate-950">{household.name}</span>
                        {selected && <span className="text-xs font-semibold text-emerald-900">Kiválasztva</span>}
                      </span>
                      <span className="mt-1 block text-sm text-slate-600">
                        {household.currency} · {household.role === "OWNER" ? "Tulajdonos" : household.role === "VIEWER" ? "Megtekintő" : "Tag"}
                      </span>
                    </span>
                  </label>
                );
              })}
            </fieldset>
          )}

          {selectedHousehold && (
            <div className={styles.selectedContext} aria-live="polite">
              {view === "household" ? (
                <div className={styles.householdDetails}>
                  <h4>Háztartás beállításai</h4>
                  <p className="mt-1 text-sm text-slate-600">
                    Pénznem: {selectedHousehold.currency} · Szerepkör: {selectedHousehold.role === "OWNER" ? "Tulajdonos" : selectedHousehold.role === "VIEWER" ? "Megtekintő" : "Tag"}
                  </p>
                  {selectedHousehold.role === "OWNER" ? (
                    <form className="mt-4" onSubmit={renameHousehold}>
                      <label className={`${styles.fieldLabel} mt-4`} htmlFor="rename-household">
                        Háztartás neve
                      </label>
                      <input
                        autoComplete="off"
                        className={styles.field}
                        id="rename-household"
                        maxLength={100}
                        name="name"
                        onChange={(event) => setRenameName(event.currentTarget.value)}
                        required
                        value={renameName}
                      />
                      <button
                        className={`${styles.actionButton} mt-3 rounded-lg bg-emerald-800 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-wait disabled:opacity-60`}
                        disabled={saving}
                        type="submit"
                      >
                        {saving ? "Mentés…" : "Név mentése"}
                      </button>
                    </form>
                  ) : (
                    <p className="mt-3 text-sm text-slate-600">A háztartás nevét csak a tulajdonos módosíthatja.</p>
                  )}
                </div>
              ) : (
                <div className={styles.householdDetails}>
                  <h4>{selectedHousehold.name}</h4>
                  <p className="mt-1 text-sm text-slate-600">
                    {selectedHousehold.role === "OWNER" ? "Tulajdonos" : selectedHousehold.role === "VIEWER" ? "Megtekintő" : "Tag"}
                  </p>
                </div>
              )}
              {view === "members" && (
                <>
                  <InvitationsManager
                    householdId={selectedHousehold.id}
                    key={`invitations:${selectedHousehold.id}:${selectedHousehold.role}`}
                    role={selectedHousehold.role}
                  />
                  <MembersManager
                    householdId={selectedHousehold.id}
                    key={`members:${selectedHousehold.id}:${selectedHousehold.role}`}
                    role={selectedHousehold.role}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {error && <p className={`${styles.inlineMessage} mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800`} role="alert">{error}</p>}
      {success && <p className={`${styles.inlineMessage} mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900`} role="status">{success}</p>}
    </section>
  );
}
