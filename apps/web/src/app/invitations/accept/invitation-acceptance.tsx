"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import AppShell from "../../app-shell";

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
  const passwordMismatch = registering && error === "A két jelszó nem egyezik.";

  return (
    <AppShell>
      <main className="mx-auto flex min-h-[calc(100svh-72px)] w-full max-w-screen-md flex-1 items-center px-4 py-6 sm:px-6 sm:py-10">
      <section
        aria-labelledby="invitation-title"
        className="w-full rounded-[20px] border p-5 shadow-sm sm:p-8"
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--separator)", color: "var(--label-primary)" }}
      >
        <h1 className="text-3xl font-bold tracking-tight" id="invitation-title">Háztartási meghívó</h1>
        <p className="mt-2 text-sm leading-6" style={{ color: "var(--label-secondary)" }}>
          A meghívólink birtokosa csatlakozhat a háztartáshoz. A tulajdonos által megadott e-mail-cím tájékoztató jellegű, a bejelentkezett fiók címe eltérhet.
        </p>

        {!hydrated ? (
          <p className="mt-6 text-sm" role="status" style={{ color: "var(--label-secondary)" }}>A meghívólink ellenőrzése…</p>
        ) : acceptedHousehold ? (
          <div
            aria-live="polite"
            className="mt-6 rounded-2xl border p-4 sm:p-5"
            role="status"
            style={{
              backgroundColor: "color-mix(in srgb, var(--success) 12%, var(--surface))",
              borderColor: "color-mix(in srgb, var(--success) 35%, var(--separator))",
            }}
          >
            <p className="font-semibold">{notice}</p>
            <p className="mt-2 text-sm" style={{ color: "var(--label-secondary)" }}>
              {acceptedHousehold.name} · {acceptedHousehold.currency} · {acceptedHousehold.role === "VIEWER" ? "Megtekintő" : "Tag"}
            </p>
            <Link
              className="mt-4 inline-flex min-h-12 items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold"
              href="/"
              style={{ backgroundColor: "var(--tint)", color: "var(--tint-foreground)" }}
            >
              Háztartás kiválasztása
            </Link>
          </div>
        ) : !inviteToken ? (
          <p
            className="mt-6 rounded-xl p-4 text-sm leading-6"
            role="alert"
            style={{ backgroundColor: "color-mix(in srgb, var(--warning) 12%, var(--surface))", color: "var(--label-primary)" }}
          >
            A meghívólink hiányzik vagy hibás. Kérj a tulajdonostól egy új linket.
          </p>
        ) : sessionPending ? (
          <p className="mt-6 text-sm" role="status" style={{ color: "var(--label-secondary)" }}>Munkamenet ellenőrzése…</p>
        ) : sessionError ? (
          <p
            className="mt-6 rounded-xl p-4 text-sm leading-6"
            role="alert"
            style={{ backgroundColor: "color-mix(in srgb, var(--danger) 10%, var(--surface))", color: "var(--danger)" }}
          >
            A munkamenet most nem ellenőrizhető. Frissítsd az oldalt, és próbáld újra.
          </p>
        ) : session?.user ? (
          <div className="mt-6">
            <p className="break-words text-sm" style={{ color: "var(--label-secondary)" }}>
              Bejelentkezve: <strong style={{ color: "var(--label-primary)" }}>{session.user.name}</strong> ({session.user.email})
            </p>
            {alreadyMember ? (
              <div
                className="mt-4 rounded-2xl border p-4 sm:p-5"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--warning) 12%, var(--surface))",
                  borderColor: "color-mix(in srgb, var(--warning) 35%, var(--separator))",
                }}
              >
                <p className="text-sm leading-6">Ez a meghívó nem változtatja meg a meglévő tagságodat, és függőben marad egy másik linkbirtokos számára.</p>
                <button
                  className="mt-3 min-h-12 w-full rounded-xl border px-4 py-3 text-sm font-semibold sm:w-auto disabled:cursor-wait disabled:opacity-60"
                  disabled={signingOut}
                  onClick={() => void signOutToUseAnotherAccount()}
                  style={{ borderColor: "var(--warning)", color: "var(--label-primary)" }}
                  type="button"
                >
                  {signingOut ? "Kijelentkezés…" : "Kijelentkezés másik fiók használatához"}
                </button>
              </div>
            ) : (
              <button
                className="mt-4 min-h-12 w-full rounded-xl px-4 py-3 text-sm font-semibold sm:w-auto disabled:cursor-wait disabled:opacity-60"
                disabled={accepting}
                onClick={() => void acceptInvitation()}
                style={{ backgroundColor: "var(--tint)", color: "var(--label-primary)" }}
                type="button"
              >
                {accepting ? "Meghívó elfogadása…" : "Meghívó elfogadása"}
              </button>
            )}
          </div>
        ) : (
          <div className="mt-6">
            <div
              aria-label="Hitelesítési mód"
              className="flex flex-wrap gap-2 border-b pb-2"
              role="group"
              style={{ borderColor: "var(--separator)" }}
            >
              <button
                aria-pressed={!registering}
                className="min-h-12 rounded-xl px-4 py-2.5 text-sm font-semibold"
                onClick={() => { setMode("login"); setError(null); }}
                style={{
                  backgroundColor: registering ? "transparent" : "color-mix(in srgb, var(--tint) 12%, var(--surface))",
                  color: registering ? "var(--label-secondary)" : "var(--tint)",
                }}
                type="button"
              >
                Bejelentkezés
              </button>
              <button
                aria-pressed={registering}
                className="min-h-12 rounded-xl px-4 py-2.5 text-sm font-semibold"
                onClick={() => { setMode("register"); setError(null); }}
                style={{
                  backgroundColor: registering ? "color-mix(in srgb, var(--tint) 12%, var(--surface))" : "transparent",
                  color: registering ? "var(--tint)" : "var(--label-secondary)",
                }}
                type="button"
              >
                Regisztráció
              </button>
            </div>
            <form className="mt-5 space-y-5" onSubmit={(event) => void authenticate(event)}>
              {registering && (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold" htmlFor="invite-name">Név</label>
                  <input autoComplete="name" className="min-h-12 w-full rounded-xl border px-3 py-2.5 text-base" id="invite-name" maxLength={100} name="name" required type="text" />
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-sm font-semibold" htmlFor="invite-email">E-mail-cím</label>
                <input autoComplete="email" className="min-h-12 w-full rounded-xl border px-3 py-2.5 text-base" id="invite-email" name="email" required type="email" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold" htmlFor="invite-password">Jelszó</label>
                <input
                  aria-describedby={passwordMismatch ? "invite-auth-error" : undefined}
                  aria-invalid={passwordMismatch || undefined}
                  autoComplete={registering ? "new-password" : "current-password"}
                  className="min-h-12 w-full rounded-xl border px-3 py-2.5 text-base"
                  id="invite-password"
                  minLength={8}
                  name="password"
                  required
                  type="password"
                />
              </div>
              {registering && (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold" htmlFor="invite-confirm-password">Jelszó megerősítése</label>
                  <input
                    aria-describedby={passwordMismatch ? "invite-auth-error" : undefined}
                    aria-invalid={passwordMismatch || undefined}
                    autoComplete="new-password"
                    className="min-h-12 w-full rounded-xl border px-3 py-2.5 text-base"
                    id="invite-confirm-password"
                    minLength={8}
                    name="confirmPassword"
                    required
                    type="password"
                  />
                </div>
              )}
              {error && (
                <p
                  aria-live="assertive"
                  className="rounded-xl p-3 text-sm leading-5"
                  id="invite-auth-error"
                  role="alert"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--danger) 10%, var(--surface))",
                    color: "var(--danger)",
                  }}
                >
                  {error}
                </p>
              )}
              <noscript>
                <p
                  className="rounded-xl p-3 text-sm leading-5"
                  role="alert"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--warning) 12%, var(--surface))",
                    color: "var(--label-primary)",
                  }}
                >
                  A meghívó elfogadásához kapcsold be a JavaScriptet.
                </p>
              </noscript>
              <button
                className="min-h-12 w-full rounded-xl px-4 py-3 text-base font-semibold disabled:cursor-wait disabled:opacity-60"
                disabled={!authFormHydrated || authenticating}
                style={{ backgroundColor: "var(--tint)", color: "var(--label-primary)" }}
                type="submit"
              >
                {authenticating ? "Kis türelmet…" : registering ? "Regisztráció és folytatás" : "Bejelentkezés és folytatás"}
              </button>
            </form>
            <p className="mt-4 text-sm leading-6" style={{ color: "var(--label-secondary)" }}>
              A bejelentkezés és a meghívó elfogadása ugyanazon az oldalon történik; a titkos linket nem mentjük a böngésző tárhelyére.
            </p>
          </div>
        )}

        {notice && !acceptedHousehold && (
          <p
            aria-live="polite"
            className="mt-4 rounded-xl p-3 text-sm leading-5"
            role="status"
            style={{
              backgroundColor: "color-mix(in srgb, var(--success) 12%, var(--surface))",
              color: "var(--label-primary)",
            }}
          >
            {notice}
          </p>
        )}
        {error && (session?.user || !inviteToken) && (
          <p
            aria-live="assertive"
            className="mt-4 rounded-xl p-3 text-sm leading-5"
            role="alert"
            style={{
              backgroundColor: "color-mix(in srgb, var(--danger) 10%, var(--surface))",
              color: "var(--danger)",
            }}
          >
            {error}
          </p>
        )}
      </section>
      </main>
    </AppShell>
  );
}
