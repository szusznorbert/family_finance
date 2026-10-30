-- AlterTable
ALTER TABLE "ledger_entry" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- CreateEnum
CREATE TYPE "ledger_entry_revision_action" AS ENUM ('UPDATED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "ledger_entry_revision" (
    "id" TEXT NOT NULL,
    "ledgerEntryId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" "ledger_entry_revision_action" NOT NULL,
    "previousState" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entry_revision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ledger_entry_revision_ledgerEntryId_createdAt_idx" ON "ledger_entry_revision"("ledgerEntryId", "createdAt");

-- AddForeignKey
ALTER TABLE "ledger_entry_revision" ADD CONSTRAINT "ledger_entry_revision_ledgerEntryId_fkey" FOREIGN KEY ("ledgerEntryId") REFERENCES "ledger_entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Keep audit history append-only even if a future application path is added.
CREATE FUNCTION prevent_ledger_entry_revision_change() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'ledger entry revisions are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "ledger_entry_revision_append_only"
BEFORE UPDATE OR DELETE ON "ledger_entry_revision"
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_entry_revision_change();
