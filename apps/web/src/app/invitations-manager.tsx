"use client";

import { useEffect, useState, type FormEvent } from "react";
import styles from "./household-management.module.css";

type HouseholdRole = "OWNER" | "MEMBER" | "VIEWER";
type InviteRole = Extract<HouseholdRole, "MEMBER" | "VIEWER">;
type Invitation = {
  id: string;
  email: string;
  role: InviteRole;
  status: "PENDING";
  expiresAt: string;
  createdAt: string;
};

function isInvitation(value: unknown): value is Invitation {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.email === "string" &&
    (item.role === "MEMBER" || item.role === "VIEWER") &&
    item.status === "PENDING" &&
    typeof item.expiresAt === "string" &&
    typeof item.createdAt === "string"
  );
}

function responseMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const error = (payload as Record<string, unknown>).error;
  if (!error || typeof error !== "object") return fallback;
  const message = (error as Record<string, unknown>).message;
  return typeof message === "string" ? message : fallback;
}

function roleLabel(role: InviteRole) {
  return role === "MEMBER" ? "Tag" : "Megtekintő";
}

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("hu-RO");
}

function isInvitationUrl(value: string) {
  try {
    const url = new URL(value);
    const tokens = new URLSearchParams(url.hash.slice(1)).getAll("token");
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      url.pathname === "/invitations/accept" &&
      url.search === "" &&
      tokens.length === 1 &&
      /^[A-Za-z0-9_-]{43}$/.test(tokens[0])
    );
  } catch {
    return false;
  }
}

export default function InvitationsManager({
  householdId,
  role,
}: {
  householdId: string;
  role: HouseholdRole;
}) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("MEMBER");
  const [oneTimeLink, setOneTimeLink] = useState("");
  const [oneTimeInvitationId, setOneTimeInvitationId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (role !== "OWNER") return;
    let active = true;

    async function loadInvitations() {
      setError(null);
      try {
        const response = await fetch(
          `/api/v1/households/${encodeURIComponent(householdId)}/invitations`,
          { cache: "no-store", credentials: "same-origin" },
        );
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) throw new Error(responseMessage(payload, "A meghívók nem tölthetők be."));
        const values =
          payload && typeof payload === "object"
            ? (payload as Record<string, unknown>).invitations
            : null;
        if (!Array.isArray(values) || !values.every(isInvitation)) {
          throw new Error("A meghívók adatai nem olvashatók.");
        }
        if (active) setInvitations(values);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "A meghívók nem tölthetők be.");
      }
    }

    void loadInvitations();
    return () => {
      active = false;
    };
  }, [householdId, role]);

  if (role !== "OWNER") return null;

  async function issueInvitation(event: FormEvent<HTMLFormElement>, replaceExisting = false) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setOneTimeLink("");
    setOneTimeInvitationId("");
    setBusy(true);
    try {
      const response = await fetch(
        `/api/v1/households/${encodeURIComponent(householdId)}/invitations`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, role: inviteRole, ...(replaceExisting ? { replaceExisting: true } : {}) }),
        },
      );
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(responseMessage(payload, "A meghívó létrehozása nem sikerült."));
      const data = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
      const invitation = data?.invitation;
      const url = data?.invitationUrl;
      if (!isInvitation(invitation) || typeof url !== "string" || !isInvitationUrl(url)) {
        throw new Error("A létrehozott meghívó adatai nem olvashatók.");
      }
      setOneTimeLink(url);
      setOneTimeInvitationId(invitation.id);
      setEmail("");
      setNotice(replaceExisting ? "A korábbi link érvénytelenítve, az új meghívó elkészült." : "A meghívó elkészült.");
      await refreshInvitations();
    } catch (issueError) {
      setError(issueError instanceof Error ? issueError.message : "A meghívó létrehozása nem sikerült.");
    } finally {
      setBusy(false);
    }
  }

  async function refreshInvitations() {
    const response = await fetch(
      `/api/v1/households/${encodeURIComponent(householdId)}/invitations`,
      { cache: "no-store", credentials: "same-origin" },
    );
    const payload: unknown = await response.json().catch(() => null);
    const values = payload && typeof payload === "object" ? (payload as Record<string, unknown>).invitations : null;
    if (response.ok && Array.isArray(values) && values.every(isInvitation)) setInvitations(values);
  }

  async function revokeInvitation(invitationId: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/v1/households/${encodeURIComponent(householdId)}/invitations/${encodeURIComponent(invitationId)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
        },
      );
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(responseMessage(payload, "A meghívó visszavonása nem sikerült."));
      setInvitations((current) => current.filter((item) => item.id !== invitationId));
      if (oneTimeInvitationId === invitationId) {
        setOneTimeLink("");
        setOneTimeInvitationId("");
      }
      setNotice("A meghívó visszavonva.");
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : "A meghívó visszavonása nem sikerült.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(oneTimeLink);
      setNotice("A link a vágólapra másolva. Küldd el privát módon.");
    } catch {
      setError("A böngésző nem engedte a másolást. Jelöld ki a linket, és másold ki kézzel.");
    }
  }

  return (
    <section className={styles.managementCard} aria-labelledby="invitations-title">
      <h4 className={styles.cardTitle} id="invitations-title">Meghívók</h4>
      <p className={styles.cardDescription}>
        A megadott e-mail-cím csak tájékoztató. A link birtokosa be tud lépni a háztartásba, ezért csak annak küldd el privát módon, akit fel szeretnél venni.
      </p>

      <form className={styles.invitationForm} onSubmit={(event) => void issueInvitation(event)}>
        <div className={styles.formField}>
          <label className={styles.fieldLabel} htmlFor="invitation-email">Tájékoztató e-mail-cím</label>
          <input
            autoComplete="email"
            className={styles.field}
            id="invitation-email"
            maxLength={254}
            onChange={(event) => setEmail(event.currentTarget.value)}
            required
            type="email"
            value={email}
          />
        </div>
        <div className={styles.formField}>
          <label className={styles.fieldLabel} htmlFor="invitation-role">Szerepkör</label>
          <select
            className={styles.field}
            id="invitation-role"
            onChange={(event) => setInviteRole(event.currentTarget.value as InviteRole)}
            value={inviteRole}
          >
            <option value="MEMBER">Tag</option>
            <option value="VIEWER">Megtekintő</option>
          </select>
        </div>
        <button className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-wait disabled:opacity-60" disabled={busy} type="submit">
          {busy ? "Feldolgozás…" : "Meghívó készítése"}
        </button>
      </form>

      {oneTimeLink && (
        <div className={styles.oneTimeLink}>
          <p className="text-sm font-semibold text-amber-950">Másold ki most: ez a titkos link újratöltés után nem kérhető le újra.</p>
          <div className={styles.linkControls}>
            <input aria-label="Egyszer megjelenített meghívólink" className="min-w-0 flex-1 rounded border border-amber-400 bg-white px-2 py-2 text-sm text-slate-800" onFocus={(event) => event.currentTarget.select()} readOnly value={oneTimeLink} />
            <button className="rounded-lg border border-amber-700 px-3 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100" onClick={() => void copyLink()} type="button">Link másolása</button>
          </div>
        </div>
      )}

      <div className={styles.pendingBlock}>
        <h5 className={styles.subheading}>Függő meghívók</h5>
        {invitations.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">Nincs függő meghívó.</p>
        ) : (
          <ul className={styles.rows}>
            {invitations.map((invitation) => (
              <li className={styles.row} key={invitation.id}>
                <div className={styles.rowDetails}>
                  <p className="break-all text-sm font-medium text-slate-900">{invitation.email}</p>
                  <p className="mt-1 text-xs text-slate-600">{roleLabel(invitation.role)} · Lejár: {dateLabel(invitation.expiresAt)}</p>
                </div>
                <div className={styles.rowActions}>
                  <button
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                    disabled={busy}
                    onClick={() => {
                      setEmail(invitation.email);
                      setInviteRole(invitation.role);
                      setError(null);
                      setNotice("A csere előtt készítsd elő a címet és szerepkört, majd erősítsd meg a lenti gombbal.");
                    }}
                    type="button"
                  >Előkészítés cseréhez</button>
                  <button className="rounded-lg border border-rose-300 px-3 py-2 text-sm font-medium text-rose-800 hover:bg-rose-50 disabled:opacity-60" disabled={busy} onClick={() => void revokeInvitation(invitation.id)} type="button">Visszavonás</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {email && invitations.some((item) => item.email.toLowerCase() === email.trim().toLowerCase()) && (
          <form className="mt-3" onSubmit={(event) => void issueInvitation(event, true)}>
            <button className="rounded-lg border border-amber-500 px-3 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-50 disabled:opacity-60" disabled={busy} type="submit">Korábbi meghívó érvénytelenítése és új link készítése</button>
          </form>
        )}
      </div>

      {error && <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p>}
      {notice && <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900" role="status">{notice}</p>}
    </section>
  );
}
