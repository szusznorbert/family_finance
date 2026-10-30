CREATE TYPE "document_status" AS ENUM ('STAGING', 'AVAILABLE', 'FAILED');

CREATE TABLE "document" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "storageKey" CHAR(64) NOT NULL,
    "status" "document_status" NOT NULL DEFAULT 'STAGING',
    "displayName" VARCHAR(255) NOT NULL,
    "declaredMimeType" VARCHAR(255) NOT NULL,
    "detectedMimeType" VARCHAR(255),
    "byteSize" BIGINT,
    "sha256" CHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "availableAt" TIMESTAMP(3),

    CONSTRAINT "document_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "document_complete_when_available_check" CHECK (
      ("status" <> 'AVAILABLE' AND "availableAt" IS NULL)
      OR ("status" = 'AVAILABLE' AND "availableAt" IS NOT NULL
          AND "detectedMimeType" IS NOT NULL AND "byteSize" IS NOT NULL AND "sha256" IS NOT NULL)
    ),
    CONSTRAINT "document_byte_size_check" CHECK ("byteSize" IS NULL OR "byteSize" >= 0),
    CONSTRAINT "document_sha256_check" CHECK ("sha256" IS NULL OR "sha256" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "document_storage_key_check" CHECK ("storageKey" ~ '^[0-9a-f]{64}$')
);

CREATE UNIQUE INDEX "document_storageKey_key" ON "document"("storageKey");
CREATE UNIQUE INDEX "document_householdId_id_key" ON "document"("householdId", "id");
CREATE INDEX "document_householdId_status_createdAt_idx" ON "document"("householdId", "status", "createdAt");
CREATE INDEX "document_householdId_sha256_idx" ON "document"("householdId", "sha256");

ALTER TABLE "document" ADD CONSTRAINT "document_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Identity and storage location never change after creation. Failed originals remain
-- as evidence for read-only reconciliation until a retention policy is approved.
CREATE FUNCTION prevent_document_identity_change() RETURNS trigger AS $$
BEGIN
    IF NEW."id" IS DISTINCT FROM OLD."id"
       OR NEW."householdId" IS DISTINCT FROM OLD."householdId"
       OR NEW."uploadedByUserId" IS DISTINCT FROM OLD."uploadedByUserId"
       OR NEW."storageKey" IS DISTINCT FROM OLD."storageKey" THEN
        RAISE EXCEPTION 'document identity is immutable';
    END IF;
    IF OLD."status" = 'AVAILABLE' AND NEW."status" <> 'AVAILABLE' THEN
        RAISE EXCEPTION 'available document status is immutable';
    END IF;
    IF OLD."status" = 'FAILED' AND NEW."status" <> 'FAILED' THEN
        RAISE EXCEPTION 'failed document status is immutable';
    END IF;
    IF OLD."status" = 'AVAILABLE' AND (
       NEW."byteSize" IS DISTINCT FROM OLD."byteSize"
       OR NEW."sha256" IS DISTINCT FROM OLD."sha256"
       OR NEW."detectedMimeType" IS DISTINCT FROM OLD."detectedMimeType"
       OR NEW."availableAt" IS DISTINCT FROM OLD."availableAt") THEN
        RAISE EXCEPTION 'available document content metadata is immutable';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "document_identity_immutable"
BEFORE UPDATE ON "document"
FOR EACH ROW EXECUTE FUNCTION prevent_document_identity_change();
