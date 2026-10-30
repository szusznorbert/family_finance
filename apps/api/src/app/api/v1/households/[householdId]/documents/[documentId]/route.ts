import { authorizeHouseholdOperation } from "@/lib/household-authorization";
import { getAvailableMetadata } from "@/lib/private-document-storage";

const responseHeaders = { "Cache-Control": "private, no-store" };
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
    { status: 404, headers: responseHeaders },
  );
}

export async function GET(
  request: Request,
  context: { params: Promise<{ householdId: string; documentId: string }> },
) {
  const { householdId, documentId } = await context.params;
  const authorization = await authorizeHouseholdOperation(request, householdId, "read");
  if (!authorization.authorized) return authorization.response;

  try {
    const document = await getAvailableMetadata(authorization, documentId);
    if (!document || !allowedMimeTypes.has(document.detectedMimeType)) return notFound();
    const byteSize = Number(document.byteSize);
    if (!Number.isSafeInteger(byteSize) || byteSize < 0) return notFound();

    return Response.json(
      {
        document: {
          id: document.id,
          displayName: document.displayName,
          detectedMimeType: document.detectedMimeType,
          byteSize,
          createdAt: document.createdAt.toISOString(),
        },
      },
      { headers: responseHeaders },
    );
  } catch {
    return Response.json(
      { error: { code: "INTERNAL_ERROR", message: "A dokumentum adatai most nem tölthetők be." } },
      { status: 500, headers: responseHeaders },
    );
  }
}
