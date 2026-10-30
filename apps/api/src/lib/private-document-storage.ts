import { createHash, randomBytes } from "node:crypto";
import { constants } from "node:fs";
import { access, chmod, link, lstat, mkdir, open as openFile, readFile, readdir, unlink } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { dirname, isAbsolute, join, parse, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { HouseholdAuthorization } from "./household-authorization";
import { prisma } from "./prisma";

type AuthorizedHousehold = Extract<HouseholdAuthorization, { authorized: true }>;

const KEY_PATTERN = /^[0-9a-f]{64}$/;
const MIME_PATTERN = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i;
const PRODUCTION_ROOT = "/var/lib/household-finance/documents";
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../");
const localRoot = join(repositoryRoot, "data/documents");

export type StagedDocument = Readonly<{
  householdId: string;
  storageKey: string;
  displayName: string;
  declaredMimeType: string;
  byteSize: bigint;
  sha256: string;
}>;
export type PrivateDocumentMetadata = Readonly<{
  id: string;
  displayName: string;
  detectedMimeType: string;
  byteSize: bigint;
  createdAt: Date;
}>;
export type AvailableDocumentMetadata = Readonly<{
  id: string;
  displayName: string;
  detectedMimeType: string;
  byteSize: bigint;
}>;
export type FinalizeDocumentResult =
  | Readonly<{ kind: "CREATED"; document: AvailableDocumentMetadata }>
  | Readonly<{ kind: "DUPLICATE"; document: AvailableDocumentMetadata }>
  | Readonly<{ kind: "UNVERIFIED_MATCH" }>;
export type ReconciliationAnomaly = Readonly<{
  kind: "STALE_STAGING" | "ORPHAN_TEMPORARY" | "ORPHAN_FINAL" | "MISSING_AVAILABLE" | "MISMATCHED_AVAILABLE" | "UNEXPECTED_ENTRY";
  documentId?: string;
  storageKey?: string;
}>;

function validKey(key: string): string {
  if (!KEY_PATTERN.test(key)) throw new Error("Invalid private document key.");
  return key;
}

export function normalizeDocumentDisplayName(name: string): string {
  const normalized = name.normalize("NFC").replace(/[\p{C}/\\]/gu, "_").trim();
  if (!normalized || normalized === "." || normalized === "..") throw new Error("Invalid document display name.");
  return Array.from(normalized).slice(0, 255).join("");
}

function validMime(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized.length > 255 || !MIME_PATTERN.test(normalized)) throw new Error("Invalid document media type.");
  return normalized;
}

async function assertNoSymlinkComponents(path: string, createMissing: boolean): Promise<void> {
  const root = parse(path).root;
  let current = root;
  for (const part of path.slice(root.length).split(sep).filter(Boolean)) {
    current = join(current, part);
    try {
      const stat = await lstat(current);
      if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error("Private storage path is not a directory.");
    } catch (error) {
      if (!createMissing || !isMissing(error)) throw error;
      await mkdir(current, { mode: 0o700 });
    }
  }
}

function isMissing(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === "ENOENT";
}

async function assertProductionMount(root: string): Promise<void> {
  if (root !== PRODUCTION_ROOT) throw new Error("Production private storage root must be the API volume mount.");
  const mountInfo = await readFile("/proc/self/mountinfo", "utf8");
  const mounted = mountInfo.split("\n").some((line) => line.split(" ")[4]?.replace(/\\040/g, " ") === root);
  if (!mounted) throw new Error("Private document volume is not mounted.");
}

async function storageRoot(mode: "read" | "write" = "write"): Promise<string> {
  const configured = process.env.DOCUMENT_STORAGE_ROOT;
  const root = configured ?? (process.env.NODE_ENV === "production" ? "" : localRoot);
  if (!root || !isAbsolute(root) || resolve(root) !== root) throw new Error("DOCUMENT_STORAGE_ROOT must be an absolute canonical path.");
  if (process.env.NODE_ENV === "production") await assertProductionMount(root);
  for (const publicRoot of [join(repositoryRoot, "apps/web/public"), join(repositoryRoot, "apps/api/public")]) {
    if (root === publicRoot || root.startsWith(publicRoot + sep)) throw new Error("Private storage cannot be inside a public asset directory.");
  }
  await assertNoSymlinkComponents(root, mode === "write" && process.env.NODE_ENV !== "production");
  if (mode === "write") await chmod(root, 0o700);
  await access(root, constants.R_OK | constants.X_OK | (mode === "write" ? constants.W_OK : 0));
  return root;
}

function paths(root: string, key: string): { temporary: string; final: string } {
  const checked = validKey(key);
  return { temporary: join(root, `.tmp-${checked}`), final: join(root, checked) };
}

async function syncDirectory(root: string): Promise<void> {
  const directory = await openFile(root, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  try { await directory.sync(); } finally { await directory.close(); }
}

async function verifiedFile(path: string, expectedSize?: bigint, expectedHash?: string): Promise<FileHandle | "MISSING" | "MISMATCH"> {
  let file: FileHandle;
  try {
    file = await openFile(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch (error) {
    if (isMissing(error)) return "MISSING";
    if ((error as NodeJS.ErrnoException).code === "ELOOP") return "MISMATCH";
    throw error;
  }
  try {
    const stat = await file.stat();
    if (!stat.isFile() || (expectedSize !== undefined && BigInt(stat.size) !== expectedSize)) {
      await file.close();
      return "MISMATCH";
    }
    if (expectedHash !== undefined) {
      const hash = createHash("sha256");
      const buffer = Buffer.allocUnsafe(64 * 1024);
      let position = 0;
      while (true) {
        const { bytesRead } = await file.read(buffer, 0, buffer.length, position);
        if (!bytesRead) break;
        hash.update(buffer.subarray(0, bytesRead));
        position += bytesRead;
      }
      if (hash.digest("hex") !== expectedHash) {
        await file.close();
        return "MISMATCH";
      }
    }
    return file;
  } catch (error) {
    await file.close();
    throw error;
  }
}

async function inspectFile(path: string, expectedSize?: bigint, expectedHash?: string): Promise<"OK" | "MISSING" | "MISMATCH"> {
  const result = await verifiedFile(path, expectedSize, expectedHash);
  if (typeof result === "string") return result;
  await result.close();
  return "OK";
}

/** Identity must come from a freshly authorized API request, never a request body. */
export async function stage(input: {
  authorization: AuthorizedHousehold;
  displayName: string;
  declaredMimeType: string;
  bytes: AsyncIterable<Uint8Array>;
}): Promise<StagedDocument> {
  const root = await storageRoot();
  const key = randomBytes(32).toString("hex");
  const { temporary } = paths(root, key);
  let file: FileHandle | undefined;
  try {
    file = await openFile(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    const hash = createHash("sha256");
    let byteSize = BigInt(0);
    for await (const chunk of input.bytes) {
      if (!(chunk instanceof Uint8Array)) throw new Error("Document stream must contain bytes.");
      byteSize += BigInt(chunk.byteLength);
      if (byteSize > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Document exceeds supported byte count.");
      hash.update(chunk);
      await file.writeFile(chunk);
    }
    await file.sync();
    await file.close();
    file = undefined;
    await syncDirectory(root);
    return {
      householdId: input.authorization.householdId,
      storageKey: key,
      displayName: normalizeDocumentDisplayName(input.displayName),
      declaredMimeType: validMime(input.declaredMimeType),
      byteSize,
      sha256: hash.digest("hex"),
    };
  } catch (error) {
    if (file) await file.close().catch(() => undefined);
    await unlink(temporary).catch((cleanupError: unknown) => { if (!isMissing(cleanupError)) throw cleanupError; });
    throw error;
  }
}

/**
 * The hard link is exclusive. The complete AVAILABLE row is inserted only after
 * the bytes are safely in private storage; a transaction-scoped advisory lock
 * serializes same-household content lookup and row creation across API processes.
 */
export async function finalize(
  staged: StagedDocument,
  authorization: AuthorizedHousehold,
  uploadRequestKey: string,
  detectedMimeType: string,
): Promise<FinalizeDocumentResult> {
  if (staged.householdId !== authorization.householdId) throw new Error("Document household does not match authorization.");
  const root = await storageRoot();
  const { temporary, final } = paths(root, staged.storageKey);
  let linkedFinal = false;
  let transactionMayHaveCommitted = false;
  try {
    if (await inspectFile(temporary, staged.byteSize, staged.sha256) !== "OK") throw new Error("Staged document bytes are missing or corrupt.");
    await link(temporary, final);
    linkedFinal = true;
    await unlink(temporary);
    await syncDirectory(root);
    const result = await prisma.$transaction(async (transaction) => {
      const lockIdentity = `${authorization.householdId.length}:${authorization.householdId}${staged.sha256}`;
      // Project a boolean, not PostgreSQL's `void` lock result, through Prisma's
      // raw-query deserializer. Evaluating the expression still acquires the lock.
      await transaction.$queryRaw<Array<{ locked: boolean }>>`
        SELECT pg_advisory_xact_lock(hashtextextended(${lockIdentity}, 0)) IS NULL AS locked
      `;

      const matches = await transaction.document.findMany({
        where: { householdId: authorization.householdId, sha256: staged.sha256, status: "AVAILABLE" },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          storageKey: true,
          displayName: true,
          detectedMimeType: true,
          byteSize: true,
          sha256: true,
        },
      });

      for (const match of matches) {
        if (match.byteSize !== staged.byteSize || !match.detectedMimeType || match.sha256 !== staged.sha256) continue;
        const { final: existingPath } = paths(root, match.storageKey);
        if (await inspectFile(existingPath, match.byteSize, match.sha256) !== "OK") continue;
        return {
          kind: "DUPLICATE" as const,
          document: {
            id: match.id,
            displayName: match.displayName,
            detectedMimeType: match.detectedMimeType,
            byteSize: match.byteSize,
          },
        };
      }

      if (matches.length > 0) return { kind: "UNVERIFIED_MATCH" as const };

      // If the outer transaction reports an ambiguous commit error, preserve
      // these bytes so a possibly committed AVAILABLE row remains readable.
      transactionMayHaveCommitted = true;
      const document = await transaction.document.create({
        data: {
          householdId: authorization.householdId,
          uploadedByUserId: authorization.userId,
          uploadRequestKey,
          storageKey: staged.storageKey,
          status: "AVAILABLE",
          displayName: staged.displayName,
          declaredMimeType: staged.declaredMimeType,
          detectedMimeType: validMime(detectedMimeType),
          byteSize: staged.byteSize,
          sha256: staged.sha256,
          availableAt: new Date(),
        },
        select: { id: true, displayName: true, detectedMimeType: true, byteSize: true },
      });
      if (!document.detectedMimeType || document.byteSize === null) throw new Error("Available document metadata is incomplete.");
      return {
        kind: "CREATED" as const,
        document: { ...document, detectedMimeType: document.detectedMimeType, byteSize: document.byteSize },
      };
    }, { isolationLevel: "ReadCommitted" });
    transactionMayHaveCommitted = false;

    if (result.kind !== "CREATED") {
      await unlink(final);
      linkedFinal = false;
      await syncDirectory(root);
    }
    return result;
  } catch (error) {
    await unlink(temporary).catch((cleanupError: unknown) => { if (!isMissing(cleanupError)) throw cleanupError; });
    const uniqueConflict = Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");
    // A failed response from the database may be ambiguous after commit; retain
    // the final bytes so an already-committed AVAILABLE row cannot lose content.
    if (linkedFinal && (!transactionMayHaveCommitted || uniqueConflict)) {
      await unlink(final).catch((cleanupError: unknown) => { if (!isMissing(cleanupError)) throw cleanupError; });
    }
    throw error;
  }
}

export async function discardStaged(staged: StagedDocument): Promise<void> {
  const root = await storageRoot();
  const { temporary } = paths(root, staged.storageKey);
  await unlink(temporary).catch((error: unknown) => { if (!isMissing(error)) throw error; });
}

/** Callers own the returned handle and must close it after streaming. */
export async function open(authorization: AuthorizedHousehold, documentId: string): Promise<{
  file: FileHandle; byteSize: bigint; detectedMimeType: string; displayName: string;
} | null> {
  const row = await prisma.document.findFirst({
    where: { id: documentId, householdId: authorization.householdId, status: "AVAILABLE" },
  });
  if (!row || row.byteSize === null || !row.sha256 || !row.detectedMimeType) return null;
  const root = await storageRoot("read");
  const { final } = paths(root, row.storageKey);
  const file = await verifiedFile(final, row.byteSize, row.sha256);
  if (typeof file === "string") return null;
  return { file, byteSize: row.byteSize, detectedMimeType: row.detectedMimeType, displayName: row.displayName };
}

/** Returns only safe metadata for an available document in the freshly authorized household. */
export async function getAvailableMetadata(
  authorization: AuthorizedHousehold,
  documentId: string,
): Promise<PrivateDocumentMetadata | null> {
  const row = await prisma.document.findFirst({
    where: { id: documentId, householdId: authorization.householdId, status: "AVAILABLE" },
    select: { id: true, displayName: true, detectedMimeType: true, byteSize: true, createdAt: true },
  });
  if (!row) return null;
  const { byteSize, detectedMimeType } = row;
  if (byteSize === null || detectedMimeType === null) return null;
  return { ...row, byteSize, detectedMimeType };
}

export async function exists(authorization: AuthorizedHousehold, documentId: string): Promise<boolean> {
  const result = await open(authorization, documentId);
  if (!result) return false;
  await result.file.close();
  return true;
}

/** Read-only audit: this never promotes rows or removes bytes. */
export async function reconcile(staleAfterMs = 10 * 60 * 1000): Promise<ReconciliationAnomaly[]> {
  const root = await storageRoot("read");
  const rows = await prisma.document.findMany({
    select: { id: true, storageKey: true, status: true, byteSize: true, sha256: true, createdAt: true },
  });
  const byKey = new Map(rows.map((row) => [row.storageKey, row]));
  const anomalies: ReconciliationAnomaly[] = [];
  const now = Date.now();
  for (const row of rows) {
    if (row.status === "STAGING" && now - row.createdAt.getTime() >= staleAfterMs) {
      anomalies.push({ kind: "STALE_STAGING", documentId: row.id, storageKey: row.storageKey });
    }
    if (row.status === "AVAILABLE") {
      if (row.byteSize === null || !row.sha256) {
        anomalies.push({ kind: "MISMATCHED_AVAILABLE", documentId: row.id, storageKey: row.storageKey });
        continue;
      }
      const outcome = await inspectFile(paths(root, row.storageKey).final, row.byteSize, row.sha256);
      if (outcome !== "OK") anomalies.push({ kind: outcome === "MISSING" ? "MISSING_AVAILABLE" : "MISMATCHED_AVAILABLE", documentId: row.id, storageKey: row.storageKey });
    }
  }
  for (const entry of await readdir(root)) {
    if (entry.startsWith(".tmp-") && KEY_PATTERN.test(entry.slice(5))) {
      const key = entry.slice(5);
      if (byKey.get(key)?.status !== "STAGING") anomalies.push({ kind: "ORPHAN_TEMPORARY", storageKey: key });
    } else if (KEY_PATTERN.test(entry)) {
      const row = byKey.get(entry);
      if (!row || row.status !== "AVAILABLE") anomalies.push({ kind: "ORPHAN_FINAL", documentId: row?.id, storageKey: entry });
    } else {
      anomalies.push({ kind: "UNEXPECTED_ENTRY" });
    }
  }
  return anomalies;
}
