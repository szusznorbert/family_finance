import BackendStatus from "./backend-status";
import AccountStatus from "./account-status";
import HouseholdsPanel from "./households-panel";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-900 sm:px-6 sm:py-16">
      <section className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
          Household Finance
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Háztartási pénzügyek
        </h1>
        <p className="mt-3 max-w-xl text-slate-600">
          Kövesd együtt a család közös kiadásait, és válaszd ki, melyik háztartást kezeled.
        </p>
        <AccountStatus>
          <HouseholdsPanel />
        </AccountStatus>
        <BackendStatus />
      </section>
    </main>
  );
}
