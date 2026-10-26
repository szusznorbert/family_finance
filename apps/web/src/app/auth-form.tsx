"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

const subscribeToHydration = () => () => {};
const getHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (registering && password !== confirmPassword) {
      setError("A két jelszó nem egyezik.");
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

      router.replace("/");
      router.refresh();
    } catch {
      setError("A szolgáltatás jelenleg nem érhető el. Próbáld újra később.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-16 text-slate-900">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Link className="text-sm font-semibold text-emerald-700" href="/">
          Household Finance
        </Link>
        <h1 className="mt-4 text-3xl font-semibold">
          {registering ? "Fiók létrehozása" : "Bejelentkezés"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {registering
            ? "Hozz létre egy fiókot. A háztartásaidat a következő lépésben állíthatod be."
            : "Lépj be a fiókodba a háztartásaid eléréséhez."}
        </p>
        <form
          action={registering ? "/regisztracio" : "/bejelentkezes"}
          className="mt-7 space-y-4"
          method="post"
          onSubmit={submit}
        >
          {registering && (
            <div>
              <label className="block text-sm font-medium" htmlFor="name">Név</label>
              <input autoComplete="name" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-600 focus:outline-none" id="name" maxLength={100} name="name" required type="text" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium" htmlFor="email">E-mail-cím</label>
            <input autoComplete="email" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-600 focus:outline-none" id="email" name="email" required type="email" />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="password">Jelszó</label>
            <input autoComplete={registering ? "new-password" : "current-password"} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-600 focus:outline-none" id="password" minLength={8} name="password" required type="password" />
          </div>
          {registering && (
            <div>
              <label className="block text-sm font-medium" htmlFor="confirmPassword">Jelszó megerősítése</label>
              <input autoComplete="new-password" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-600 focus:outline-none" id="confirmPassword" minLength={8} name="confirmPassword" required type="password" />
            </div>
          )}
          {error && <p aria-live="polite" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p>}
          <noscript>
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900" role="alert">
              JavaScript nélkül az űrlap nem küldhető el. Kapcsold be a JavaScriptet a folytatáshoz.
            </p>
          </noscript>
          <button className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 font-medium text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60" disabled={!hydrated || pending} type="submit">
            {pending ? "Kis türelmet…" : registering ? "Regisztráció" : "Bejelentkezés"}
          </button>
        </form>
        <p className="mt-6 text-sm text-slate-600">
          {registering ? "Már van fiókod? " : "Még nincs fiókod? "}
          <Link className="font-medium text-emerald-700 underline-offset-2 hover:underline" href={registering ? "/bejelentkezes" : "/regisztracio"}>
            {registering ? "Jelentkezz be" : "Regisztrálj"}
          </Link>
        </p>
      </section>
    </main>
  );
}
