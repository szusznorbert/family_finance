import BackendStatus from "./backend-status";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-16 text-slate-900">
      <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
          Household Finance
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Fejlesztői környezet
        </h1>
        <p className="mt-3 max-w-xl text-slate-600">
          A webalkalmazás és a backend kapcsolatának ellenőrzése.
        </p>
        <BackendStatus />
      </section>
    </main>
  );
}
