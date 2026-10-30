import { prisma } from "@/lib/prisma";

const MAX_ATTEMPTS_PER_MINUTE = 10;

type BucketResult = { used: number | null; retryAfterSeconds: number };

/** Consume one authorized attempt before reading bytes. PostgreSQL serializes conflicts across API processes. */
export async function consumeDocumentUploadAttempt(userId: string): Promise<
  | { allowed: true; used: number }
  | { allowed: false; retryAfterSeconds: number }
> {
  const rows = await prisma.$queryRaw<BucketResult[]>`
    WITH clock AS (
      SELECT date_trunc('minute', clock_timestamp() AT TIME ZONE 'UTC') AS "minuteStart"
    ), consumed AS (
      INSERT INTO "document_upload_rate_bucket" ("userId", "minuteStart", "count")
      SELECT ${userId}, clock."minuteStart", 1 FROM clock
      ON CONFLICT ("userId", "minuteStart") DO UPDATE
        SET "count" = "document_upload_rate_bucket"."count" + 1
        WHERE "document_upload_rate_bucket"."count" < ${MAX_ATTEMPTS_PER_MINUTE}
      RETURNING "count"
    )
    SELECT (SELECT "count" FROM consumed) AS "used",
           GREATEST(1, LEAST(60, CEIL(EXTRACT(EPOCH FROM
             (clock."minuteStart" + INTERVAL '1 minute' - (clock_timestamp() AT TIME ZONE 'UTC'))
           ))::integer)) AS "retryAfterSeconds"
    FROM clock
  `;
  const result = rows[0];
  if (!result) throw new Error("Upload rate bucket did not return a result.");
  if (result.used === null) return { allowed: false, retryAfterSeconds: result.retryAfterSeconds };
  return { allowed: true, used: result.used };
}

/** Maintenance is separate from request counting; callers choose the retention cutoff. */
export async function pruneDocumentUploadRateBuckets(before: Date): Promise<number> {
  if (!Number.isFinite(before.getTime())) throw new Error("Invalid rate bucket cutoff.");
  const result = await prisma.documentUploadRateBucket.deleteMany({ where: { minuteStart: { lt: before } } });
  return result.count;
}
