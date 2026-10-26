"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function AccountStatus() {
  const { data, isPending, error, refetch } = authClient.useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);

  async function signOut() {
    setSigningOut(true);
    setSignOutError(false);
    try {
      const result = await authClient.signOut();
      if (result.error) {
        throw new Error("Sign-out failed");
      }
      await refetch();
    } catch {
      setSignOutError(true);
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-medium">Fiók</h2>
      {isPending ? (
        <p className="mt-2 text-sm text-slate-600">Munkamenet ellenőrzése…</p>
      ) : error ? (
        <p className="mt-2 text-sm text-rose-700" role="alert">A munkamenet most nem ellenőrizhető.</p>
      ) : data?.user ? (
        <div className="mt-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-slate-700">Bejelentkezve: <strong>{data.user.name}</strong> ({data.user.email})</p>
            <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60" disabled={signingOut} onClick={() => void signOut()} type="button">
              {signingOut ? "Kijelentkezés…" : "Kijelentkezés"}
            </button>
          </div>
          {signOutError && <p className="mt-2 text-sm text-rose-700" role="alert">A kijelentkezés nem sikerült. Próbáld újra.</p>}
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-3">
          <Link className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800" href="/bejelentkezes">Bejelentkezés</Link>
          <Link className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50" href="/regisztracio">Regisztráció</Link>
        </div>
      )}
    </div>
  );
}
