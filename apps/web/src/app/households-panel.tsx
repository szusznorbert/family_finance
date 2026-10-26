"use client";

import { useEffect, useState, type FormEvent } from "react";
import InvitationsManager from "./invitations-manager";
import MembersManager from "./members-manager";

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

export default function HouseholdsPanel() {
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
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

  async function createHousehold(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    setError(null);
    setSuccess(null);

    if (!trimmedName || Array.from(trimmedName).length > 100) {
      setError("A név 1 és 100 karakter közötti lehet.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/v1/households", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(apiMessage(payload, "A háztartás létrehozása nem sikerült."));
      }

      const value =
        payload && typeof payload === "object"
          ? (payload as Record<string, unknown>).household
          : null;
      if (!isHousehold(value)) {
        throw new Error("A létrehozott háztartás adatai nem olvashatók.");
      }

      setHouseholds((current) => [value, ...current.filter((item) => item.id !== value.id)]);
      setSelectedId(value.id);
      setRenameName(value.name);
      saveSelectedHouseholdId(value.id);
      setName("");
      setSuccess(`Elkészült: ${value.name}. Te vagy az első tulajdonos.`);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "A háztartás létrehozása nem sikerült.",
      );
    } finally {
      setSaving(false);
    }
  }

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
    <section className="mt-6 border-t border-slate-200 pt-6" aria-labelledby="households-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-emerald-800">Közös pénzügyek</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950" id="households-title">
            Háztartásaid
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Hozz létre egy közös teret, vagy válaszd ki azt, amelyiket most kezelni szeretnéd.
          </p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-900">
          Pénznem: RON
        </span>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-[minmax(16rem,0.85fr)_minmax(0,1.15fr)]">
        <form className="self-start rounded-xl border border-slate-200 bg-slate-50 p-4" onSubmit={createHousehold}>
          <h3 className="font-semibold text-slate-900">Új háztartás</h3>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            A létrehozó lesz az első tulajdonos. A kilenc induló kategória automatikusan hozzáadódik.
          </p>
          <label className="mt-4 block text-sm font-medium text-slate-800" htmlFor="household-name">
            Háztartás neve
          </label>
          <input
            autoComplete="off"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus-visible:border-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-700/20"
            id="household-name"
            maxLength={100}
            name="name"
            onChange={(event) => setName(event.currentTarget.value)}
            placeholder="Például: Család"
            required
            value={name}
          />
          <button
            className="mt-3 w-full rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-wait disabled:opacity-60"
            disabled={saving}
            type="submit"
          >
            {saving ? "Létrehozás…" : "Háztartás létrehozása"}
          </button>
        </form>

        <div aria-busy={loading}>
          <h3 className="font-semibold text-slate-900">Válassz háztartást</h3>
          {loading ? (
            <p className="mt-3 text-sm text-slate-600" role="status">Háztartások betöltése…</p>
          ) : households.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-slate-300 p-4 text-sm leading-6 text-slate-600">
              Még nincs háztartásod. Hozz létre egyet a közös kiadások követéséhez.
            </p>
          ) : (
            <fieldset className="mt-3 space-y-2">
              <legend className="sr-only">Válaszd ki az aktív háztartást</legend>
              {households.map((household) => {
                const selected = selectedId === household.id;
                return (
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors focus-within:ring-2 focus-within:ring-emerald-700/30 ${selected ? "border-emerald-800 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-400"}`}
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
                        {household.currency} · {household.role === "OWNER" ? "Tulajdonos" : household.role === "VIEWER" ? "Megtekintő" : "Tag"} · {household.categories.length} kategória
                      </span>
                    </span>
                  </label>
                );
              })}
            </fieldset>
          )}

          {selectedHousehold && (
            <div className="mt-4 space-y-5" aria-live="polite">
              <div className="border-l-2 border-emerald-700 pl-4">
                <p className="text-sm font-semibold text-slate-900">{selectedHousehold.name} induló kategóriái</p>
                <ul className="mt-2 grid gap-x-4 gap-y-1 text-sm text-slate-700 sm:grid-cols-2">
                  {selectedHousehold.categories.map((category) => (
                    <li key={category.id}>{category.name}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h4 className="font-semibold text-slate-900">Háztartás beállításai</h4>
                <p className="mt-1 text-sm text-slate-600">
                  Pénznem: {selectedHousehold.currency} · Szerepkör: {selectedHousehold.role === "OWNER" ? "Tulajdonos" : selectedHousehold.role === "VIEWER" ? "Megtekintő" : "Tag"}
                </p>
                {selectedHousehold.role === "OWNER" ? (
                  <form className="mt-4" onSubmit={renameHousehold}>
                    <label className="block text-sm font-medium text-slate-800" htmlFor="rename-household">
                      Háztartás neve
                    </label>
                    <input
                      autoComplete="off"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus-visible:border-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-700/20"
                      id="rename-household"
                      maxLength={100}
                      name="name"
                      onChange={(event) => setRenameName(event.currentTarget.value)}
                      required
                      value={renameName}
                    />
                    <button
                      className="mt-3 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-wait disabled:opacity-60"
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
            </div>
          )}
        </div>
      </div>

      {error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p>}
      {success && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900" role="status">{success}</p>}
    </section>
  );
}
