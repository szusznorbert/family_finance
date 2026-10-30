import type { HouseholdAuthorization } from "@/lib/household-authorization";
import { exists as privateDocumentExists } from "@/lib/private-document-storage";
import { prisma } from "@/lib/prisma";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type AuthorizedHousehold = Extract<HouseholdAuthorization, { authorized: true }>;

/** A retry must reuse the client's original UUID; missing or malformed keys fail at the route boundary. */
export function parseUploadRequestKey(value: string | null): string | null {
  return value && UUID_PATTERN.test(value) ? value.toLowerCase() : null;
}

export type UploadFingerprint = Readonly<{
  sha256: string;
  byteSize: bigint;
  declaredMimeType: string;
  detectedMimeType: string;
  displayName: string;
}>;

export type UploadReplay =
  | { kind: "UNCLAIMED" }
  | { kind: "CONFLICT"; reason: "IN_PROGRESS" | "FAILED" | "DIFFERENT_UPLOAD" | "MISSING_BYTES" }
  | {
      kind: "REPLAY";
      document: { id: string; displayName: string; detectedMimeType: string; byteSize: number };
    };

/** Look up a completed retry body; the committed document row owns the request-key claim. */
export async function resolveUploadReplay(input: {
  authorization: AuthorizedHousehold;
  requestKey: string;
  fingerprint: UploadFingerprint;
}): Promise<UploadReplay> {
  const row = await prisma.document.findUnique({
    where: {
      householdId_uploadedByUserId_uploadRequestKey: {
        householdId: input.authorization.householdId,
        uploadedByUserId: input.authorization.userId,
        uploadRequestKey: input.requestKey,
      },
    },
    select: {
      id: true,
      status: true,
      sha256: true,
      byteSize: true,
      declaredMimeType: true,
      detectedMimeType: true,
      displayName: true,
    },
  });

  if (!row) return { kind: "UNCLAIMED" };
  if (row.status === "STAGING") return { kind: "CONFLICT", reason: "IN_PROGRESS" };
  if (row.status === "FAILED") return { kind: "CONFLICT", reason: "FAILED" };

  const exactMatch =
    row.sha256 === input.fingerprint.sha256 &&
    row.byteSize === input.fingerprint.byteSize &&
    row.declaredMimeType === input.fingerprint.declaredMimeType &&
    row.detectedMimeType === input.fingerprint.detectedMimeType &&
    row.displayName === input.fingerprint.displayName;
  if (!exactMatch || row.byteSize === null || row.detectedMimeType === null) {
    return { kind: "CONFLICT", reason: "DIFFERENT_UPLOAD" };
  }
  if (!(await privateDocumentExists(input.authorization, row.id))) {
    return { kind: "CONFLICT", reason: "MISSING_BYTES" };
  }

  return {
    kind: "REPLAY",
    document: {
      id: row.id,
      displayName: row.displayName,
      detectedMimeType: row.detectedMimeType,
      byteSize: Number(row.byteSize),
    },
  };
}
