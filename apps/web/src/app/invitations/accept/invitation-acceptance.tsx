"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

type AcceptedHousehold = {
  id: string;
  name: string;
  currency: string;
  role: "MEMBER" | "VIEWER";
};

const subscribeToHydration = () => () => {};
const getHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
let invitationTokenSnapshot: string | null = null;
let invitationTokenRead = false;
const invitationTokenListeners = new Set<() => void>();

function readInvitationTokenFromHash() {
  const tokens = new URLSearchParams(window.location.hash.slice(1)).getAll("token");
  invitationTokenSnapshot = tokens.length === 1 && tokenPattern.test(tokens[0]) ? tokens[0] : null;
  // URL fragments are not sent in HTTP requests. Strip the bearer token before any further navigation.
  window.history.replaceState(window.history.state, "", "/invitations/accept");
  invitationTokenRead = true;
}

function handleInvitationHashChange() {
  readInvitationTokenFromHash();
  invitationTokenListeners.forEach((listener) => listener());
}

function subscribeToInvitationToken(listener: () => void) {
  invitationTokenListeners.add(listener);

  if (!invitationTokenRead || window.location.hash) {
    readInvitationTokenFromHash();
    listener();
  }
  window.addEventListener("hashchange", handleInvitationHashChange);

  return () => {
    invitationTokenListeners.delete(listener);
    window.removeEventListener("hashchange", handleInvitationHashChange);
  };
}

function getInvitationTokenSnapshot() {
  return invitationTokenSnapshot;
}

function getServerInvitationTokenSnapshot() {
  return null;
}

function clearInvitationToken() {
  invitationTokenSnapshot = null;
  invitationTokenListeners.forEach((listener) => listener());
}

function responseMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const error = (payload as Record<string, unknown>).error;
  if (!error || typeof error !== "object") return fallback;
  const message = (error as Record<string, unknown>).message;
  return typeof message === "string" ? message : fallback;
}

function parseAcceptedHousehold(payload: unknown): AcceptedHousehold | null {
  if (!payload || typeof payload !== "object") return null;
  const household = (payload as Record<string, unknown>).household;
  if (!household || typeof household !== "object") return null;
  const value = household as Record<string, unknown>;
  if (
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.currency !== "string" ||
    (value.role !== "MEMBER" && value.role !== "VIEWER")
  ) {
    return null;
  }
  return {
    id: value.id,
    name: value.name,
    currency: value.currency,
    role: value.role,
  };
}

export default function InvitationAcceptance() {
  const { data: session, isPending: sessionPending, error: sessionError, refetch } = authClient.useSession();
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const inviteToken = useSyncExternalStore(
    subscribeToInvitationToken,
    getInvitationTokenSnapshot,
    getServerInvitationTokenSnapshot,
  );
  const [mode, setMode] = useState<"login" | "register">("login");
  const [accepting, setAccepting] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [acceptedHousehold, setAcceptedHousehold] = useState<AcceptedHousehold | null>(null);
  const authFormHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydrationSnapshot,
    getServerHydrationSnapshot,
  );

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const registering = mode === "register";
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (registering && password !== confirmPassword) {
      setError("A két jelszó nem egyezik.");
      return;
    }

    setAuthenticating(true);
    try {
      const result = registering
        ? await authClient.signUp.email({
            name: String(form.get("name") ?? "").trim(),
            email,
            password,
          })
        : await authClient.signIn.email({ email, password });

      if (result.error) {
        setError(
          registering
            ? "A regisztráció nem sikerült. Ellenőrizd az adatokat, vagy próbálj másik e-mail-címet."
            : "A bejelentkezés nem sikerült. Ellenőrizd az e-mail-címet és a jelszót.",
        );
        return;
      }

      await refetch();
      setNotice("Sikeres hitelesítés. Most elfogadhatod a meghívót.");
    } catch {
      setError("A szolgáltatás jelenleg nem érhető el. Próbáld újra később.");
    } finally {
      setAuthenticating(false);
    }
  }

  async function acceptInvitation() {
    if (!inviteToken || !session?.user) return;

    setAccepting(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/v1/invitations/accept", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: inviteToken }),
      });
      const payload: unknown = await response.json().catch(() => null);

      if (response.status === 401) {
        await refetch();
        setError("A munkamenet lejárt. Jelentkezz be újra a meghívó elfogadásához.");
        return;
      }

      if (!response.ok) {
        if (response.status === 409) {
          setAlreadyMember(true);
          setError(responseMessage(payload, "Már tagja vagy ennek a háztartásnak."));
          return;
        }
        clearInvitationToken();
        setError(responseMessage(payload, "A meghívó elfogadása nem sikerült."));
        return;
      }

      const household = parseAcceptedHousehold(payload);
      if (!household) {
        clearInvitationToken();
        setError("A meghívó elfogadása sikerült, de a háztartás adatai nem olvashatók.");
        return;
      }

      clearInvitationToken();
      window.history.replaceState(window.history.state, "", "/invitations/accept");
      setAcceptedHousehold(household);
      setNotice("Sikeresen csatlakoztál a háztartáshoz.");
    } catch {
      setError("A szolgáltatás jelenleg nem érhető el. A meghívólinket újra megpróbálhatod.");
    } finally {
      setAccepting(false);
    }
  }

  async function signOutToUseAnotherAccount() {
    setSigningOut(true);
    setError(null);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("Kijelentkezés sikertelen");
      setAlreadyMember(false);
      await refetch();
      setNotice("Jelentkezz be azzal a fiókkal, amelyet fel szeretnél venni a háztartásba.");
    } catch {
      setError("A kijelentkezés nem sikerült. Próbáld újra.");
    } finally {
      setSigningOut(false);
    }
  }

  const registering = mode === "register";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12 text-slate-900">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <Link className="text-sm font-semibold text-emerald-700" href="/">
          Household Finance
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Háztartási meghívó</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          A meghívólink birtokosa csatlakozhat a háztartáshoz. A tulajdonos által megadott e-mail-cím tájékoztató jellegű, a bejelentkezett fiók címe eltérhet.
        </p>

        {!hydrated ? (
          <p className="mt-6 text-sm text-slate-600" role="status">A meghívólink ellenőrzése…</p>
        ) : acceptedHousehold ? (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="font-semibold text-emerald-950">{notice}</p>
            <p className="mt-2 text-sm text-emerald-900">
              {acceptedHousehold.name} · {acceptedHousehold.currency} · {acceptedHousehold.role === "VIEWER" ? "Megtekintő" : "Tag"}
            </p>
            <Link className="mt-4 inline-flex rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900" href="/">
              Háztartás kiválasztása
            </Link>
          </div>
        ) : !inviteToken ? (
          <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-900" role="alert">
            A meghívólink hiányzik vagy hibás. Kérj a tulajdonostól egy új linket.
          </p>
        ) : sessionPending ? (
          <p className="mt-6 text-sm text-slate-600" role="status">Munkamenet ellenőrzése…</p>
        ) : sessionError ? (
          <p className="mt-6 rounded-lg bg-rose-50 p-4 text-sm text-rose-800" role="alert">A munkamenet most nem ellenőrizhető. Frissítsd az oldalt, és próbáld újra.</p>
        ) : session?.user ? (
          <div className="mt-6">
            <p className="text-sm text-slate-700">Bejelentkezve: <strong>{session.user.name}</strong> ({session.user.email})</p>
            {alreadyMember ? (
              <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
                <p className="text-sm text-amber-950">Ez a meghívó nem változtatja meg a meglévő tagságodat, és függőben marad egy másik linkbirtokos számára.</p>
                <button
                  className="mt-3 rounded-lg border border-amber-700 px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-100 disabled:cursor-wait disabled:opacity-60"
                  disabled={signingOut}
                  onClick={() => void signOutToUseAnotherAccount()}
                  type="button"
                >
                  {signingOut ? "Kijelentkezés…" : "Kijelentkezés másik fiók használatához"}
                </button>
              </div>
            ) : (
              <button
                className="mt-4 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-wait disabled:opacity-60"
                disabled={accepting}
                onClick={() => void acceptInvitation()}
                type="button"
              >
                {accepting ? "Meghívó elfogadása…" : "Meghívó elfogadása"}
              </button>
            )}
          </div>
        ) : (
          <div className="mt-6">
            <div className="flex gap-2 border-b border-slate-200" aria-label="Hitelesítési mód">
              <button
                aria-pressed={!registering}
                className={`border-b-2 px-3 py-2 text-sm font-semibold ${registering ? "border-transparent text-slate-600" : "border-emerald-800 text-emerald-900"}`}
                onClick={() => { setMode("login"); setError(null); }}
                type="button"
              >Bejelentkezés</button>
              <button
                aria-pressed={registering}
                className={`border-b-2 px-3 py-2 text-sm font-semibold ${registering ? "border-emerald-800 text-emerald-900" : "border-transparent text-slate-600"}`}
                onClick={() => { setMode("register"); setError(null); }}
                type="button"
              >Regisztráció</button>
            </div>
            <form className="mt-4 space-y-4" onSubmit={(event) => void authenticate(event)}>
              {registering && (
                <div>
                  <label className="block text-sm font-medium" htmlFor="invite-name">Név</label>
                  <input autoComplete="name" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-600 focus:outline-none" id="invite-name" maxLength={100} name="name" required type="text" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium" htmlFor="invite-email">E-mail-cím</label>
                <input autoComplete="email" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-600 focus:outline-none" id="invite-email" name="email" required type="email" />
              </div>
              <div>
                <label className="block text-sm font-medium" htmlFor="invite-password">Jelszó</label>
                <input autoComplete={registering ? "new-password" : "current-password"} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-600 focus:outline-none" id="invite-password" minLength={8} name="password" required type="password" />
              </div>
              {registering && (
                <div>
                  <label className="block text-sm font-medium" htmlFor="invite-confirm-password">Jelszó megerősítése</label>
                  <input autoComplete="new-password" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-600 focus:outline-none" id="invite-confirm-password" minLength={8} name="confirmPassword" required type="password" />
                </div>
              )}
              {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p>}
              <noscript>
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900" role="alert">A meghívó elfogadásához kapcsold be a JavaScriptet.</p>
              </noscript>
              <button className="w-full rounded-lg bg-emerald-800 px-4 py-2.5 font-medium text-white hover:bg-emerald-900 disabled:cursor-wait disabled:opacity-60" disabled={!authFormHydrated || authenticating} type="submit">
                {authenticating ? "Kis türelmet…" : registering ? "Regisztráció és folytatás" : "Bejelentkezés és folytatás"}
              </button>
            </form>
            <p className="mt-3 text-xs leading-5 text-slate-500">A bejelentkezés és a meghívó elfogadása ugyanazon az oldalon történik; a titkos linket nem mentjük a böngésző tárhelyére.</p>
          </div>
        )}

        {notice && !acceptedHousehold && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900" role="status">{notice}</p>}
        {error && (session?.user || !inviteToken) && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p>}
      </section>
    </main>
  );
}
