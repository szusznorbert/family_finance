-- Nullable for T01 documents. PostgreSQL's unique index permits multiple NULLs,
-- while an upload request key is claimed by only one household/uploader pair.
ALTER TABLE "document" ADD COLUMN "uploadRequestKey" UUID;
CREATE UNIQUE INDEX "document_householdId_uploadedByUserId_uploadRequestKey_key"
  ON "document"("householdId", "uploadedByUserId", "uploadRequestKey");

-- The upload key is part of the document's identity once the STAGING row exists.
CREATE FUNCTION prevent_document_upload_request_key_change() RETURNS trigger AS $$
BEGIN
    IF NEW."uploadRequestKey" IS DISTINCT FROM OLD."uploadRequestKey" THEN
        RAISE EXCEPTION 'document upload request key is immutable';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "document_upload_request_key_immutable"
BEFORE UPDATE OF "uploadRequestKey" ON "document"
FOR EACH ROW EXECUTE FUNCTION prevent_document_upload_request_key_change();

-- A fixed UTC minute is counted once across every API process using this DB.
CREATE TABLE "document_upload_rate_bucket" (
    "userId" TEXT NOT NULL,
    "minuteStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "document_upload_rate_bucket_pkey" PRIMARY KEY ("userId", "minuteStart"),
    CONSTRAINT "document_upload_rate_bucket_count_check" CHECK ("count" BETWEEN 1 AND 10),
    CONSTRAINT "document_upload_rate_bucket_minute_check" CHECK ("minuteStart" = date_trunc('minute', "minuteStart"))
);
