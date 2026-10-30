import LedgerList from "./ledger-list";

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string | string[] }>;
}) {
  const filters = await searchParams;
  return <LedgerList initialArchived={filters.archived === "true"} />;
}
