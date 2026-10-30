-- Extend the existing canonical source without changing MANUAL or RECEIPT rows.
ALTER TYPE "ledger_source_type" ADD VALUE IF NOT EXISTS 'RECURRENT';

CREATE TYPE "recurring_expense_rule_revision_action" AS ENUM ('UPDATED', 'STOPPED');

CREATE TABLE "recurring_expense_rule" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "categoryId" TEXT NOT NULL,
    "dayOfMonth" INTEGER NOT NULL,
    "startMonth" DATE NOT NULL,
    "stoppedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_expense_rule_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "recurring_expense_rule_amount_check"
      CHECK ("amount" > 0 AND "amount" <= 999999999.99),
    CONSTRAINT "recurring_expense_rule_day_check"
      CHECK ("dayOfMonth" BETWEEN 1 AND 31),
    CONSTRAINT "recurring_expense_rule_start_month_check"
      CHECK (EXTRACT(DAY FROM "startMonth") = 1),
    CONSTRAINT "recurring_expense_rule_version_check"
      CHECK ("version" >= 1)
);

CREATE UNIQUE INDEX "recurring_expense_rule_householdId_id_key"
  ON "recurring_expense_rule"("householdId", "id");
CREATE INDEX "recurring_expense_rule_householdId_stoppedAt_idx"
  ON "recurring_expense_rule"("householdId", "stoppedAt");
CREATE INDEX "recurring_expense_rule_householdId_categoryId_idx"
  ON "recurring_expense_rule"("householdId", "categoryId");

ALTER TABLE "recurring_expense_rule"
  ADD CONSTRAINT "recurring_expense_rule_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "household"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recurring_expense_rule"
  ADD CONSTRAINT "recurring_expense_rule_householdId_categoryId_fkey"
  FOREIGN KEY ("householdId", "categoryId") REFERENCES "expense_category"("householdId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- An occurrence's first eligible month stays stable for the lifetime of its rule.
CREATE FUNCTION prevent_recurring_expense_rule_start_month_change() RETURNS trigger AS $$
BEGIN
    IF NEW."startMonth" IS DISTINCT FROM OLD."startMonth" THEN
        RAISE EXCEPTION 'recurring expense rule start month is immutable';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "recurring_expense_rule_start_month_immutable"
BEFORE UPDATE ON "recurring_expense_rule"
FOR EACH ROW EXECUTE FUNCTION prevent_recurring_expense_rule_start_month_change();

CREATE TABLE "recurring_expense_rule_revision" (
    "id" TEXT NOT NULL,
    "recurringRuleId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" "recurring_expense_rule_revision_action" NOT NULL,
    "requestKey" TEXT NOT NULL,
    "requestHash" CHAR(64) NOT NULL,
    "previousState" JSONB NOT NULL,
    "newState" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recurring_expense_rule_revision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "recurring_expense_rule_revision_recurringRuleId_requestKey_key"
  ON "recurring_expense_rule_revision"("recurringRuleId", "requestKey");
CREATE INDEX "recurring_expense_rule_revision_recurringRuleId_createdAt_idx"
  ON "recurring_expense_rule_revision"("recurringRuleId", "createdAt");
ALTER TABLE "recurring_expense_rule_revision"
  ADD CONSTRAINT "recurring_expense_rule_revision_recurringRuleId_fkey"
  FOREIGN KEY ("recurringRuleId") REFERENCES "recurring_expense_rule"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- The rule revision records the before/after state and cannot be rewritten.
CREATE FUNCTION prevent_recurring_expense_rule_revision_change() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'recurring expense rule revisions are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "recurring_expense_rule_revision_append_only"
BEFORE UPDATE OR DELETE ON "recurring_expense_rule_revision"
FOR EACH ROW EXECUTE FUNCTION prevent_recurring_expense_rule_revision_change();

ALTER TABLE "ledger_entry"
  ADD COLUMN "recurringRuleId" TEXT,
  ADD COLUMN "recurringMonth" DATE;

CREATE UNIQUE INDEX "ledger_entry_recurringRuleId_recurringMonth_key"
  ON "ledger_entry"("recurringRuleId", "recurringMonth");
ALTER TABLE "ledger_entry"
  ADD CONSTRAINT "ledger_entry_householdId_recurringRuleId_fkey"
  FOREIGN KEY ("householdId", "recurringRuleId")
  REFERENCES "recurring_expense_rule"("householdId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Nullable occurrence columns are present together only for RECURRENT expenses.
ALTER TABLE "ledger_entry"
  ADD CONSTRAINT "ledger_entry_recurring_source_check"
  CHECK (
    (
      "sourceType"::text = 'RECURRENT'
      AND "type" = 'EXPENSE'
      AND "recurringRuleId" IS NOT NULL
      AND "recurringMonth" IS NOT NULL
      AND EXTRACT(DAY FROM "recurringMonth") = 1
    ) OR (
      "sourceType"::text IN ('MANUAL', 'RECEIPT')
      AND "recurringRuleId" IS NULL
      AND "recurringMonth" IS NULL
    )
  );

-- The original source check only knows MANUAL/RECEIPT. Preserve both branches.
ALTER TABLE "ledger_entry" DROP CONSTRAINT "ledger_entry_source_type_check";
ALTER TABLE "ledger_entry"
  ADD CONSTRAINT "ledger_entry_source_type_check"
  CHECK (
    ("sourceType"::text = 'MANUAL' AND "sourceRequestHash" IS NOT NULL) OR
    ("sourceType"::text = 'RECEIPT' AND "type" = 'EXPENSE' AND "sourceRequestHash" IS NULL) OR
    ("sourceType"::text = 'RECURRENT' AND "type" = 'EXPENSE' AND "sourceRequestHash" IS NULL)
  );

ALTER TABLE "ledger_entry_revision"
  ADD COLUMN "recurringRuleRevisionId" TEXT;
CREATE INDEX "ledger_entry_revision_recurringRuleRevisionId_idx"
  ON "ledger_entry_revision"("recurringRuleRevisionId");
ALTER TABLE "ledger_entry_revision"
  ADD CONSTRAINT "ledger_entry_revision_recurringRuleRevisionId_fkey"
  FOREIGN KEY ("recurringRuleRevisionId")
  REFERENCES "recurring_expense_rule_revision"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
