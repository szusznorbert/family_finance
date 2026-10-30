import { authorizeHouseholdOperation } from "@/lib/household-authorization";
import { prisma } from "@/lib/prisma";
import {
  consumeDocumentUploadAttempt,
} from "@/lib/document-upload-rate";
import { DocumentUploadError, parseDocumentUpload } from "@/lib/document-upload";
import {
  parseUploadRequestKey,
  resolveUploadReplay,
  type UploadFingerprint,
} from "@/lib/document-upload-request";
import { validateSameOriginMultipartMutation } from "@/lib/csrf-protection";
import {
  discardStaged as discardPrivateDocument,
  finalize as finalizePrivateDocument,
  normalizeDocumentDisplayName,
  stage as stagePrivateDocument,
  type StagedDocument,
} from "@/lib/private-document-storage";

// Cache Components are enabled for this app; Next.js uses its default Node.js runtime.

const responseHeaders = { "Cache-Control": "no-store" };

function apiError(
  status: number,
  code: string,
  message: string,
  headers: Record<string, string> = {},
) {
  return Response.json(
    { error: { code, message } },
    { status, headers: { ...responseHeaders, ...headers } },
  );
}

async function discardUnreadBody(request: Request): Promise<void> {
  if (!request.body || request.body.locked) return;
  try {
    await request.body.cancel();
  } catch {
    // The transport may already have closed the body.
  }
}

type UploadConsumption = StagedDocument;

function isUniqueConstraintConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  return "code" in error && error.code === "P2002";
}

function uploadErrorResponse(error: unknown): Response {
  if (error instanceof DocumentUploadError) {
    switch (error.code) {
      case "REQUEST_TOO_LARGE":
      case "FILE_TOO_LARGE":
        return apiError(413, "UPLOAD_TOO_LARGE", "A feltöltés meghaladja a megengedett méretet.");
      case "IMAGE_DIMENSIONS_TOO_LARGE":
        return apiError(413, "IMAGE_DIMENSIONS_TOO_LARGE", "A kép felbontása túl nagy az előnézethez. Válassz kisebb felbontású fotót.");
      case "INVALID_FILE":
        return apiError(400, "INVALID_FILE", "A fájl üres, nem támogatott vagy nem egyezik a megadott típussal.");
      case "INVALID_MULTIPART":
        return apiError(400, "INVALID_MULTIPART", "A feltöltési kérés hibás; pontosan egy fájl küldhető.");
      case "ABORTED":
        return apiError(400, "UPLOAD_ABORTED", "A feltöltés megszakadt.");
    }
  }
  return apiError(500, "UPLOAD_FAILED", "A dokumentum feltöltése nem sikerült.");
}

function uploadFingerprint(
  metadata: { filename: string; declaredMimeType: string; detectedMimeType: string; byteSize: number },
  staged: StagedDocument,
  displayName: string,
): UploadFingerprint {
  return {
    sha256: staged.sha256,
    byteSize: staged.byteSize,
    declaredMimeType: metadata.declaredMimeType,
    detectedMimeType: metadata.detectedMimeType,
    displayName,
  };
}

function conflictResponse(reason: "IN_PROGRESS" | "FAILED" | "DIFFERENT_UPLOAD" | "MISSING_BYTES") {
  if (reason === "IN_PROGRESS") {
    return apiError(409, "UPLOAD_IN_PROGRESS", "Ezzel az idempotenciakulccsal már folyamatban van egy feltöltés.");
  }
  return apiError(409, "IDEMPOTENCY_CONFLICT", "Az idempotenciakulcs egy másik vagy nem elérhető feltöltéshez tartozik.");
}

function documentResponse(
  document: { id: string; displayName: string; detectedMimeType: string; byteSize: number },
  status: number,
) {
  return Response.json(
    {
      document: {
        id: document.id,
        displayName: document.displayName,
        detectedMimeType: document.detectedMimeType,
        byteSize: document.byteSize,
      },
    },
    { status, headers: responseHeaders },
  );
}

function duplicateResponse(
  document: { id: string; displayName: string; detectedMimeType: string; byteSize: bigint | number },
) {
  return Response.json(
    { duplicate: true, document: { id: document.id, displayName: document.displayName,
      detectedMimeType: document.detectedMimeType, byteSize: Number(document.byteSize) } },
    { status: 200, headers: responseHeaders },
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ householdId: string }> },
) {
  const { householdId } = await context.params;
  const authorization = await authorizeHouseholdOperation(request, householdId, "financial-write");
  if (!authorization.authorized) {
    await discardUnreadBody(request);
    return authorization.response;
  }

  const csrfError = validateSameOriginMultipartMutation(request);
  if (csrfError) {
    await discardUnreadBody(request);
    return csrfError;
  }

  try {
    const attempt = await consumeDocumentUploadAttempt(authorization.userId);
    if (!attempt.allowed) {
      await discardUnreadBody(request);
      return apiError(
        429,
        "UPLOAD_RATE_LIMITED",
        "Túl sok feltöltési kísérlet történt. Próbáld újra a megadott idő után.",
        { "Retry-After": String(attempt.retryAfterSeconds) },
      );
    }
  } catch {
    await discardUnreadBody(request);
    return apiError(500, "UPLOAD_FAILED", "A feltöltés korlátozása most nem ellenőrizhető.");
  }

  const requestKey = parseUploadRequestKey(request.headers.get("idempotency-key"));
  if (!requestKey) {
    await discardUnreadBody(request);
    return apiError(400, "INVALID_IDEMPOTENCY_KEY", "Érvényes UUID Idempotency-Key fejléc szükséges.");
  }

  let stagedDuringParse: StagedDocument | null = null;
  let consumed: Awaited<ReturnType<typeof parseDocumentUpload<UploadConsumption>>>;
  try {
    consumed = await parseDocumentUpload(request, async (part) => {
      let displayName: string;
      try {
        displayName = normalizeDocumentDisplayName(part.filename);
      } catch {
        throw new DocumentUploadError("The uploaded filename is invalid.", "INVALID_FILE");
      }

      stagedDuringParse = await stagePrivateDocument({
        authorization,
        displayName,
        declaredMimeType: part.declaredMimeType,
        bytes: part.stream,
      });
      return stagedDuringParse;
    });
  } catch (error) {
    if (stagedDuringParse) await discardPrivateDocument(stagedDuringParse).catch(() => undefined);
    return uploadErrorResponse(error);
  }

  let displayName: string;
  try {
    displayName = normalizeDocumentDisplayName(consumed.metadata.filename);
  } catch {
    return apiError(400, "INVALID_FILE", "A fájl neve nem használható.");
  }

  const staged = consumed.result;
  if (staged.byteSize !== BigInt(consumed.metadata.byteSize)) {
    await discardPrivateDocument(staged).catch(() => undefined);
    return apiError(500, "UPLOAD_FAILED", "A feltöltött fájl mérete nem ellenőrizhető.");
  }

  const fingerprint = uploadFingerprint(consumed.metadata, staged, displayName);
  let replay;
  try {
    replay = await resolveUploadReplay({ authorization, requestKey, fingerprint });
  } catch {
    await discardPrivateDocument(staged).catch(() => undefined);
    return apiError(500, "UPLOAD_FAILED", "Az ismételt feltöltés nem ellenőrizhető.");
  }
  if (replay.kind === "REPLAY") {
    await discardPrivateDocument(staged).catch(() => undefined);
    return documentResponse(replay.document, 200);
  }
  if (replay.kind === "CONFLICT") {
    await discardPrivateDocument(staged).catch(() => undefined);
    return conflictResponse(replay.reason);
  }

  try {
    const result = await finalizePrivateDocument(staged, authorization, requestKey, consumed.metadata.detectedMimeType);
    if (result.kind === "UNVERIFIED_MATCH") {
      return apiError(500, "UPLOAD_FAILED", "A dokumentum feltöltése nem sikerült.");
    }
    if (result.kind === "DUPLICATE") {
      try {
        const completedReplay = await resolveUploadReplay({ authorization, requestKey, fingerprint });
        if (completedReplay.kind === "REPLAY") return documentResponse(completedReplay.document, 200);
        if (completedReplay.kind === "CONFLICT") return conflictResponse(completedReplay.reason);
      } catch {
        return apiError(500, "UPLOAD_FAILED", "A dokumentum feltöltése nem sikerült.");
      }
      return duplicateResponse(result.document);
    }
    return documentResponse({ ...result.document, byteSize: Number(result.document.byteSize) }, 201);
  } catch (error) {
    if (isUniqueConstraintConflict(error)) {
      try {
        const racedReplay = await resolveUploadReplay({ authorization, requestKey, fingerprint });
        if (racedReplay.kind === "REPLAY") return documentResponse(racedReplay.document, 200);
        if (racedReplay.kind === "CONFLICT") return conflictResponse(racedReplay.reason);
      } catch {
        return apiError(500, "UPLOAD_FAILED", "A dokumentum feltöltése nem sikerült.");
      }
    }
    return apiError(500, "UPLOAD_FAILED", "A dokumentum nem vált elérhetővé.");
  }
}

type DocumentListCursor = Readonly<{ createdAt: Date; id: string }>;

const defaultDocumentPageSize = 25;
const maxDocumentPageSize = 100;
const allowedDocumentMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

function encodeDocumentCursor(cursor: DocumentListCursor): string {
  return Buffer.from(JSON.stringify({ createdAt: cursor.createdAt.toISOString(), id: cursor.id })).toString("base64url");
}

function parseDocumentCursor(value: string): DocumentListCursor | null {
  if (value.length > 512 || !/^[A-Za-z0-9_-]+$/.test(value)) return null;

  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    if (Buffer.from(decoded).toString("base64url") !== value) return null;
    const parsed: unknown = JSON.parse(decoded);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

    const record = parsed as Record<string, unknown>;
    if (
      Object.keys(record).length !== 2 ||
      typeof record.createdAt !== "string" ||
      typeof record.id !== "string" ||
      !/^[A-Za-z0-9_-]{1,64}$/.test(record.id)
    ) return null;

    const createdAt = new Date(record.createdAt);
    if (!Number.isFinite(createdAt.getTime()) || createdAt.toISOString() !== record.createdAt) return null;
    return { createdAt, id: record.id };
  } catch {
    return null;
  }
}

function parseDocumentListQuery(request: Request):
  | { valid: true; pageSize: number; cursor: DocumentListCursor | null }
  | { valid: false } {
  const searchParams = new URL(request.url).searchParams;
  if (
    [...searchParams.keys()].some((key) => key !== "pageSize" && key !== "cursor") ||
    searchParams.getAll("pageSize").length > 1 ||
    searchParams.getAll("cursor").length > 1
  ) return { valid: false };

  const pageSizeText = searchParams.get("pageSize");
  const pageSize = pageSizeText === null
    ? defaultDocumentPageSize
    : /^\d{1,3}$/.test(pageSizeText) ? Number(pageSizeText) : NaN;
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > maxDocumentPageSize) return { valid: false };

  const cursorText = searchParams.get("cursor");
  const cursor = cursorText === null ? null : parseDocumentCursor(cursorText);
  if (cursorText !== null && !cursor) return { valid: false };

  return { valid: true, pageSize, cursor };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ householdId: string }> },
) {
  const { householdId } = await context.params;
  const authorization = await authorizeHouseholdOperation(request, householdId, "read");
  if (!authorization.authorized) return authorization.response;

  const query = parseDocumentListQuery(request);
  if (!query.valid) {
    return apiError(400, "VALIDATION_ERROR", "A pageSize 1–100 közötti egész szám, a cursor pedig érvényes lapozási kurzor legyen.");
  }

  try {
    const rows = await prisma.document.findMany({
      where: {
        householdId: authorization.householdId,
        status: "AVAILABLE",
        ...(query.cursor ? {
          OR: [
            { createdAt: { lt: query.cursor.createdAt } },
            { createdAt: query.cursor.createdAt, id: { lt: query.cursor.id } },
          ],
        } : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: query.pageSize + 1,
      select: { id: true, displayName: true, detectedMimeType: true, byteSize: true, createdAt: true },
    });

    const hasMore = rows.length > query.pageSize;
    const pageRows = hasMore ? rows.slice(0, query.pageSize) : rows;
    const documents = pageRows.map((row) => {
      if (row.detectedMimeType === null || !allowedDocumentMimeTypes.has(row.detectedMimeType) || row.byteSize === null) {
        throw new Error("Available document metadata is incomplete.");
      }
      const byteSize = Number(row.byteSize);
      if (!Number.isSafeInteger(byteSize) || byteSize < 0) throw new Error("Available document size is invalid.");
      return {
        id: row.id,
        displayName: row.displayName,
        detectedMimeType: row.detectedMimeType,
        byteSize,
        createdAt: row.createdAt.toISOString(),
      };
    });
    const lastRow = pageRows.at(-1);
    const nextCursor = hasMore && lastRow
      ? encodeDocumentCursor({ createdAt: lastRow.createdAt, id: lastRow.id })
      : null;

    return Response.json(
      { documents, pagination: { pageSize: query.pageSize, nextCursor } },
      { headers: responseHeaders },
    );
  } catch {
    return apiError(500, "INTERNAL_ERROR", "A dokumentumlista most nem tölthető be.");
  }
}
