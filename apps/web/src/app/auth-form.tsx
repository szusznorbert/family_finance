"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import AppShell from "./app-shell";

const subscribeToHydration = () => () => {};
const getHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;
const mismatchMessage = "A két jelszó nem egyezik.";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const [error, setError] = useState<string | null>(null);
  const registering = mode === "register";
  const passwordMismatch = registering && error === mismatchMessage;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (registering && password !== confirmPassword) {
      setError(mismatchMessage);
      return;
    }

    setPending(true);

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

      router.replace(registering ? "/kezdes" : "/");
      router.refresh();
    } catch {
      setError("A szolgáltatás jelenleg nem érhető el. Próbáld újra később.");
    } finally {
      setPending(false);
    }
  }

  return (
    <AppShell>
      <main className="mx-auto flex min-h-[calc(100svh-72px)] w-full max-w-screen-sm flex-1 items-center px-4 py-6 sm:px-6 sm:py-10">
        <section
          aria-labelledby="auth-title"
          className="w-full rounded-[20px] border p-5 shadow-sm sm:p-8"
          style={{
            backgroundColor: "var(--surface)",
            borderColor: "var(--separator)",
            color: "var(--label-primary)",
          }}
        >
          <h1 className="text-3xl font-bold tracking-tight" id="auth-title">
            {registering ? "Fiók létrehozása" : "Bejelentkezés"}
          </h1>
          <p className="mt-2 text-sm leading-6" style={{ color: "var(--label-secondary)" }}>
            {registering
              ? "Hozz létre egy fiókot. A háztartásaidat a következő lépésben állíthatod be."
              : "Lépj be a fiókodba a háztartásaid eléréséhez."}
          </p>
          <form
            action={registering ? "/regisztracio" : "/bejelentkezes"}
            className="mt-7 space-y-5"
            method="post"
            onSubmit={submit}
          >
            {registering && (
              <div>
                <label className="mb-1.5 block text-sm font-semibold" htmlFor="name">Név</label>
                <input
                  autoComplete="name"
                  className="min-h-12 w-full rounded-xl border px-3 py-2.5 text-base"
                  id="name"
                  maxLength={100}
                  name="name"
                  required
                  type="text"
                />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-semibold" htmlFor="email">E-mail-cím</label>
              <input
                autoComplete="email"
                className="min-h-12 w-full rounded-xl border px-3 py-2.5 text-base"
                id="email"
                name="email"
                required
                type="email"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold" htmlFor="password">Jelszó</label>
              <input
                aria-describedby={passwordMismatch ? "auth-error" : undefined}
                aria-invalid={passwordMismatch || undefined}
                autoComplete={registering ? "new-password" : "current-password"}
                className="min-h-12 w-full rounded-xl border px-3 py-2.5 text-base"
                id="password"
                minLength={8}
                name="password"
                required
                type="password"
              />
            </div>
            {registering && (
              <div>
                <label className="mb-1.5 block text-sm font-semibold" htmlFor="confirmPassword">
                  Jelszó megerősítése
                </label>
                <input
                  aria-describedby={passwordMismatch ? "auth-error" : undefined}
                  aria-invalid={passwordMismatch || undefined}
                  autoComplete="new-password"
                  className="min-h-12 w-full rounded-xl border px-3 py-2.5 text-base"
                  id="confirmPassword"
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
                id="auth-error"
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
                JavaScript nélkül az űrlap nem küldhető el. Kapcsold be a JavaScriptet a folytatáshoz.
              </p>
            </noscript>
            <button
              className="min-h-12 w-full rounded-xl px-4 py-3 text-base font-semibold transition disabled:cursor-wait disabled:opacity-60"
              disabled={!hydrated || pending}
              style={{ backgroundColor: "var(--tint)", color: "var(--tint-foreground)" }}
              type="submit"
            >
              {pending ? "Kis türelmet…" : registering ? "Regisztráció" : "Bejelentkezés"}
            </button>
          </form>
          <p className="mt-6 text-sm leading-6" style={{ color: "var(--label-secondary)" }}>
            {registering ? "Már van fiókod? " : "Még nincs fiókod? "}
            <Link
              className="font-semibold underline decoration-1 underline-offset-4"
              href={registering ? "/bejelentkezes" : "/regisztracio"}
              style={{ color: "var(--tint)" }}
            >
              {registering ? "Jelentkezz be" : "Regisztrálj"}
            </Link>
          </p>
        </section>
      </main>
    </AppShell>
  );
}
