-- Preserve the existing category IDs while adding soft archive and a
-- per-household normalized name for case-insensitive duplicate protection.
ALTER TABLE "expense_category"
  ADD COLUMN "normalizedName" TEXT,
  ADD COLUMN "archivedAt" TIMESTAMP(3);

UPDATE "expense_category"
SET "normalizedName" = lower(normalize(btrim("name"), NFC));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "expense_category"
    GROUP BY "householdId", "normalizedName"
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate normalized category names must be resolved before migration';
  END IF;
END $$;

ALTER TABLE "expense_category"
  ALTER COLUMN "normalizedName" SET NOT NULL;

DROP INDEX "expense_category_householdId_name_key";
CREATE UNIQUE INDEX "expense_category_householdId_normalizedName_key"
  ON "expense_category"("householdId", "normalizedName");
CREATE UNIQUE INDEX "expense_category_householdId_id_key"
  ON "expense_category"("householdId", "id");
