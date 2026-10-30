-- CreateEnum
CREATE TYPE "ledger_entry_type" AS ENUM ('INCOME', 'EXPENSE', 'REFUND');

-- CreateEnum
CREATE TYPE "ledger_source_type" AS ENUM ('MANUAL', 'RECEIPT');

-- CreateTable
CREATE TABLE "ledger_entry" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "type" "ledger_entry_type" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'RON',
    "occurredOn" DATE NOT NULL,
    "categoryId" TEXT,
    "note" VARCHAR(500),
    "createdByUserId" TEXT NOT NULL,
    "sourceType" "ledger_source_type" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceRequestHash" CHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ledger_entry_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ledger_entry_positive_ron_amount_check"
      CHECK ("amount" > 0 AND "amount" <= 999999999.99 AND "currency" = 'RON'),
    CONSTRAINT "ledger_entry_category_type_check"
      CHECK (
        ("type" = 'INCOME' AND "categoryId" IS NULL) OR
        ("type" IN ('EXPENSE', 'REFUND') AND "categoryId" IS NOT NULL)
      ),
    CONSTRAINT "ledger_entry_source_type_check"
      CHECK (
        ("sourceType" = 'MANUAL' AND "sourceRequestHash" IS NOT NULL) OR
        ("sourceType" = 'RECEIPT' AND "type" = 'EXPENSE' AND "sourceRequestHash" IS NULL)
      )
);

-- CreateIndex
CREATE INDEX "ledger_entry_householdId_occurredOn_id_idx" ON "ledger_entry"("householdId", "occurredOn", "id");

-- CreateIndex
CREATE INDEX "ledger_entry_householdId_categoryId_idx" ON "ledger_entry"("householdId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entry_sourceType_sourceId_key" ON "ledger_entry"("sourceType", "sourceId");

-- AddForeignKey
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_householdId_categoryId_fkey" FOREIGN KEY ("householdId", "categoryId") REFERENCES "expense_category"("householdId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
