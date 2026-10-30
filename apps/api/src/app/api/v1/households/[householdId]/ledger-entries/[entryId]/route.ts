import { authorizeHouseholdOperation } from "@/lib/household-authorization";
import { validateSameOriginJsonMutation } from "@/lib/csrf-protection";
import {
  getLedgerEntryDetail,
  updateManualLedgerEntry,
} from "@/lib/ledger-entry-maintenance";
import { ledgerApiError, ledgerResponseHeaders } from "@/lib/ledger-entry";

type RouteContext = { params: Promise<{ householdId: string; entryId: string }> };

function mutationResponse(result: Awaited<ReturnType<typeof updateManualLedgerEntry>>) {
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

export async function GET(request: Request, { params }: RouteContext) {
  const { householdId, entryId } = await params;
  const authorization = await authorizeHouseholdOperation(request, householdId, "read");
  if (!authorization.authorized) return authorization.response;

  try {
    const detail = await getLedgerEntryDetail(authorization.householdId, entryId);
    if (!detail) return ledgerApiError(404, "NOT_FOUND", "A főkönyvi tétel nem található.");
    return Response.json(detail, { headers: ledgerResponseHeaders });
  } catch {
    return ledgerApiError(500, "INTERNAL_ERROR", "A főkönyvi tétel most nem tölthető be.");
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
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

  return mutationResponse(await updateManualLedgerEntry(
    authorization.householdId,
    entryId,
    authorization.userId,
    body,
  ));
}
