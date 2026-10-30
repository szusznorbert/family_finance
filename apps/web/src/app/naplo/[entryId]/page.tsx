import LedgerEntryDetail from "./ledger-entry-detail";

export default async function LedgerEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ entryId: string }>;
  searchParams: Promise<{ archived?: string | string[] }>;
}) {
  const [{ entryId }, filters] = await Promise.all([params, searchParams]);
  return <LedgerEntryDetail entryId={entryId} returnToArchived={filters.archived === "true"} />;
}
