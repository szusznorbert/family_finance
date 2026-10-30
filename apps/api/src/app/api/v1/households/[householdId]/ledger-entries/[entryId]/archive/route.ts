import { authorizeHouseholdOperation } from "@/lib/household-authorization";
import { validateSameOriginJsonMutation } from "@/lib/csrf-protection";
import { archiveManualLedgerEntry } from "@/lib/ledger-entry-maintenance";
import { ledgerApiError, ledgerResponseHeaders } from "@/lib/ledger-entry";

type RouteContext = { params: Promise<{ householdId: string; entryId: string }> };

function archiveResponse(result: Awaited<ReturnType<typeof archiveManualLedgerEntry>>) {
  switch (result.kind) {
    case "ok":
      return Response.json({ entry: result.entry }, { headers: ledgerResponseHeaders });
    case "not-found":
      return ledgerApiError(404, "NOT_FOUND", "A főkönyvi tétel nem található.");
    case "immutable":
      return ledgerApiError(409, "CONFLICT", "A bizonylatból származó tétel ezen az útvonalon nem módosítható.");
    case "conflict":
      return ledgerApiError(409, "CONFLICT", "A tétel időközben megváltozott vagy archiválva lett. Töltsd újra a tételt.");
    case "invalid":
      return ledgerApiError(400, "VALIDATION_ERROR", result.message);
    case "error":
      return ledgerApiError(500, "INTERNAL_ERROR", "A tétel mentése nem sikerült.");
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const { householdId, entryId } = await params;
  const authorization = await authorizeHouseholdOperation(request, householdId, "financial-write");
  if (!authorization.authorized) return authorization.response;
  const csrfError = validateSameOriginJsonMutation(request);
  if (csrfError) return csrfError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return ledgerApiError(400, "VALIDATION_ERROR", "A kérés törzse nem érvényes JSON.");
  }
  if (typeof body !== "object" || body === null || Array.isArray(body) || Object.keys(body).length !== 0) {
    return ledgerApiError(400, "VALIDATION_ERROR", "Az archiválási kérés törzse üres objektum legyen.");
  }

  return archiveResponse(await archiveManualLedgerEntry(
    authorization.householdId,
    entryId,
    authorization.userId,
  ));
}
