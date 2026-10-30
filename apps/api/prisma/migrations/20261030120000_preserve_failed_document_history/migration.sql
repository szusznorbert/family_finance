-- A missing original can be marked FAILED without erasing the historical
-- availability timestamp or content metadata. The identity/status trigger
-- remains unchanged; this migration does not update any document row.
ALTER TABLE "document"
  DROP CONSTRAINT "document_complete_when_available_check";

ALTER TABLE "document"
  ADD CONSTRAINT "document_complete_when_available_check" CHECK (
    ("status" IN ('STAGING', 'FAILED') AND "availableAt" IS NULL)
    OR ("status" IN ('AVAILABLE', 'FAILED') AND "availableAt" IS NOT NULL
        AND "detectedMimeType" IS NOT NULL
        AND "byteSize" IS NOT NULL
        AND "sha256" IS NOT NULL)
  );
