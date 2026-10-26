"use client";

import { useCallback, useEffect, useState } from "react";

type HouseholdRole = "OWNER" | "MEMBER" | "VIEWER";
type Member = {
  userId?: string;
  name: string;
  role: HouseholdRole;
  email: string | null;
  isSelf: boolean;
};

function isMember(value: unknown): value is Member {
  if (!value || typeof value !== "object") return false;
  const member = value as Record<string, unknown>;
  return (
    (!('userId' in member) || typeof member.userId === "string") &&
    typeof member.name === "string" &&
    (member.role === "OWNER" || member.role === "MEMBER" || member.role === "VIEWER") &&
    (typeof member.email === "string" || member.email === null) &&
    typeof member.isSelf === "boolean"
  );
}

function apiMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const error = (payload as Record<string, unknown>).error;
  if (!error || typeof error !== "object") return fallback;
  const message = (error as Record<string, unknown>).message;
  return typeof message === "string" ? message : fallback;
}

function roleLabel(role: HouseholdRole) {
  switch (role) {
    case "OWNER": return "Tulajdonos";
    case "MEMBER": return "Tag";
    case "VIEWER": return "Megtekintő";
  }
}

async function fetchMembers(householdId: string): Promise<Member[]> {
  const response = await fetch(
    `/api/v1/households/${encodeURIComponent(householdId)}/members`,
    { cache: "no-store", credentials: "same-origin" },
  );
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(apiMessage(payload, "A tagok nem tölthetők be."));
  const values = payload && typeof payload === "object"
    ? (payload as Record<string, unknown>).members
    : null;
  if (!Array.isArray(values) || !values.every(isMember)) {
    throw new Error("A taglista adatai nem olvashatók.");
  }
  return values;
}

export default function MembersManager({
  householdId,
  role,
}: {
  householdId: string;
  role: HouseholdRole;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [transferTarget, setTransferTarget] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    try {
      const values = await fetchMembers(householdId);
      setError(null);
      setMembers(values);
      const firstTransferTarget = values.find((member) => member.userId && !member.isSelf && member.role !== "OWNER");
      setTransferTarget((current) =>
        values.some((member) => member.userId === current && !member.isSelf && member.role !== "OWNER")
          ? current
          : firstTransferTarget?.userId ?? "",
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "A tagok nem tölthetők be.");
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    let active = true;
    async function initialLoad() {
      try {
        const values = await fetchMembers(householdId);
        if (!active) return;
        setMembers(values);
        const firstTransferTarget = values.find((member) => member.userId && !member.isSelf && member.role !== "OWNER");
        setTransferTarget(firstTransferTarget?.userId ?? "");
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "A tagok nem tölthetők be.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void initialLoad();
    return () => { active = false; };
  }, [householdId]);

  async function removeMember(userId: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/v1/households/${encodeURIComponent(householdId)}/members/${encodeURIComponent(userId)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        },
      );
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiMessage(payload, "A tag módosítása nem sikerült."));
      setNotice("A tag eltávolítva.");
      await loadMembers();
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "A tag módosítása nem sikerült.");
    } finally {
      setBusy(false);
    }
  }

  async function leaveHousehold(transferToUserId?: string) {
    const confirmMessage = transferToUserId
      ? "A kiválasztott tag lesz a tulajdonos, te pedig kilépsz a háztartásból. Ez egyetlen tranzakcióban történik. Folytatod?"
      : "Biztosan kilépsz ebből a háztartásból?";
    if (!window.confirm(confirmMessage)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/v1/households/${encodeURIComponent(householdId)}/members/me`,
        {
          method: "DELETE",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(transferToUserId ? { transferToUserId } : {}),
        },
      );
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(apiMessage(payload, "A kilépés nem sikerült."));
      window.location.reload();
    } catch (leaveError) {
      setError(leaveError instanceof Error ? leaveError.message : "A kilépés nem sikerült.");
    } finally {
      setBusy(false);
    }
  }

  const ownerCount = members.filter((member) => member.role === "OWNER").length;
  const transferCandidates = members.filter((member) => member.userId && !member.isSelf && member.role !== "OWNER");

  return (
    <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4" aria-labelledby="members-title" aria-busy={loading}>
      <h4 className="font-semibold text-slate-900" id="members-title">Háztartástagok</h4>
      <p className="mt-1 text-sm leading-5 text-slate-600">A tagok neve és szerepe minden háztartástag számára látható. Az e-mail-címek csak a tulajdonosnak és saját magadnak jelennek meg.</p>

      {loading ? (
        <p className="mt-3 text-sm text-slate-600" role="status">Tagok betöltése…</p>
      ) : members.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">Nincs megjeleníthető tag.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-200">
          {members.map((member, index) => (
            <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between" key={member.userId ?? `${member.name}:${index}`}>
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold text-slate-900">
                  {member.name}{member.isSelf ? " (te)" : ""}
                </p>
                <p className="mt-1 text-sm text-slate-600">{roleLabel(member.role)}</p>
                {member.email && <p className="mt-1 break-all text-xs text-slate-500">{member.email}</p>}
              </div>
              {role === "OWNER" && !member.isSelf && member.userId && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-medium text-rose-800 hover:bg-rose-50 disabled:opacity-60"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(`Eltávolítod ${member.name} tagot a háztartásból?`)) void removeMember(member.userId!);
                    }}
                    type="button"
                  >Eltávolítás</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 border-t border-slate-200 pt-4">
        {role === "OWNER" && ownerCount === 1 ? (
          transferCandidates.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-slate-700">Te vagy az egyetlen tulajdonos. Kilépéskor a kiválasztott tag tulajdonos lesz, és te is kilépsz a háztartásból.</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="sr-only" htmlFor="member-transfer-target">Új tulajdonos</label>
                <select
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  disabled={busy}
                  id="member-transfer-target"
                  onChange={(event) => setTransferTarget(event.currentTarget.value)}
                  value={transferTarget}
                >
                  {transferCandidates.map((candidate) => (
                    <option key={candidate.userId} value={candidate.userId}>{candidate.name} · {roleLabel(candidate.role)}</option>
                  ))}
                </select>
                <button
                  className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-60"
                  disabled={busy || !transferTarget}
                  onClick={() => void leaveHousehold(transferTarget)}
                  type="button"
                >Tulajdon átadása és kilépés</button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-700">Te vagy az egyetlen tulajdonos. Másik tag nélkül nem léphetsz ki ebből a háztartásból.</p>
          )
        ) : (
          <button
            className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-medium text-rose-800 hover:bg-rose-50 disabled:opacity-60"
            disabled={busy}
            onClick={() => void leaveHousehold()}
            type="button"
          >Kilépés a háztartásból</button>
        )}
      </div>

      {error && <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p>}
      {notice && <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900" role="status">{notice}</p>}
    </section>
  );
}
