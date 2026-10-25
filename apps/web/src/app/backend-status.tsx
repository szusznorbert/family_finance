"use client";

import { useCallback, useEffect, useState } from "react";

type BackendResponse = {
  status: string;
  service: string;
};

export default function BackendStatus() {
  const [result, setResult] = useState<BackendResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const checkBackend = useCallback(async () => {
    setChecking(true);
    setError(null);

    try {
      const response = await fetch("/api/backend", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`A backend HTTP ${response.status} hibával válaszolt.`);
      }

      const data = (await response.json()) as Partial<BackendResponse>;
      if (data.status !== "ok" || typeof data.service !== "string") {
        throw new Error("A backend válasza nem megfelelő.");
      }

      setResult(data as BackendResponse);
    } catch {
      setResult(null);
      setError("A backend jelenleg nem érhető el.");
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void checkBackend();
  }, [checkBackend]);

  const connected = result?.status === "ok";

  return (
    <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-medium">Backend kapcsolat</h2>
          <p aria-live="polite" className="mt-1 text-sm text-slate-600">
            {checking
              ? "Kapcsolat ellenőrzése…"
              : connected
                ? `Kapcsolódva: ${result.service}`
                : error}
          </p>
        </div>
        <span
          aria-label={checking ? "Ellenőrzés folyamatban" : connected ? "Kapcsolódva" : "Nincs kapcsolat"}
          className={`h-3 w-3 rounded-full ${checking ? "animate-pulse bg-amber-500" : connected ? "bg-emerald-500" : "bg-rose-500"}`}
        />
      </div>
      <button
        className="mt-5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60"
        disabled={checking}
        onClick={() => void checkBackend()}
        type="button"
      >
        Újratesztelés
      </button>
    </div>
  );
}
