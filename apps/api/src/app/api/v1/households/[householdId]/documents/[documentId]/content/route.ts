import type { FileHandle } from "node:fs/promises";
import { authorizeHouseholdOperation } from "@/lib/household-authorization";
import { open } from "@/lib/private-document-storage";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

function notFound() {
  return Response.json(
    { error: { code: "NOT_FOUND", message: "A dokumentum nem található." } },
    { status: 404, headers: { "Cache-Control": "private, no-store" } },
  );
}

function attachmentName(displayName: string): string {
  const safeName = Array.from(displayName.normalize("NFC"))
    .filter((character) => !/[\p{C}/\\]/u.test(character))
    .join("")
    .trim()
    .slice(0, 255) || "document";
  const fallback = safeName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(safeName).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

function fileStream(file: FileHandle, byteSize: number): ReadableStream<Uint8Array> {
  let position = 0;
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    await file.close().catch(() => undefined);
  };

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (position >= byteSize) {
        await close();
        controller.close();
        return;
      }
      try {
        const buffer = Buffer.allocUnsafe(Math.min(64 * 1024, byteSize - position));
        const { bytesRead } = await file.read(buffer, 0, buffer.byteLength, position);
        if (bytesRead === 0) throw new Error("Private document ended before its recorded size.");
        position += bytesRead;
        controller.enqueue(new Uint8Array(buffer.buffer, buffer.byteOffset, bytesRead));
      } catch {
        await close();
        controller.error(new Error("Private document streaming failed."));
      }
    },
    async cancel() {
      await close();
    },
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ householdId: string; documentId: string }> },
) {
  const { householdId, documentId } = await context.params;
  const authorization = await authorizeHouseholdOperation(request, householdId, "read");
  if (!authorization.authorized) return authorization.response;

  let document: Awaited<ReturnType<typeof open>>;
  try {
    document = await open(authorization, documentId);
  } catch {
    return Response.json(
      { error: { code: "INTERNAL_ERROR", message: "A dokumentum most nem tölthető le." } },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
  if (!document) return notFound();
  if (!allowedMimeTypes.has(document.detectedMimeType)) {
    await document.file.close().catch(() => undefined);
    return notFound();
  }

  const byteSize = Number(document.byteSize);
  if (!Number.isSafeInteger(byteSize) || byteSize < 0) {
    await document.file.close().catch(() => undefined);
    return notFound();
  }

  return new Response(fileStream(document.file, byteSize), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": attachmentName(document.displayName),
      "Content-Length": String(byteSize),
      "Content-Type": document.detectedMimeType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
