import { prisma } from "@/lib/prisma";
import { authorizeHouseholdOperation } from "@/lib/household-authorization";
import { validateSameOriginJsonMutation } from "@/lib/csrf-protection";

const responseHeaders = { "Cache-Control": "no-store" };

function apiError(status: number, code: string, message: string) {
  return Response.json(
    { error: { code, message } },
    { status, headers: responseHeaders },
  );
}

function householdDetails(
  household: { id: string; name: string; currency: string },
  role: string,
) {
  return { ...household, role };
}

type RouteContext = { params: Promise<{ householdId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const { householdId } = await params;
  const authorization = await authorizeHouseholdOperation(request, householdId, "read");
  if (!authorization.authorized) return authorization.response;

  try {
    const household = await prisma.household.findUnique({
      where: { id: authorization.householdId },
      select: { id: true, name: true, currency: true },
    });

    if (!household) {
      return apiError(404, "NOT_FOUND", "A háztartás nem található.");
    }

    return Response.json(
      { household: householdDetails(household, authorization.role) },
      { headers: responseHeaders },
    );
  } catch {
    return apiError(500, "INTERNAL_ERROR", "A háztartás adatai most nem tölthetők be.");
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { householdId } = await params;
  const authorization = await authorizeHouseholdOperation(request, householdId, "manage");
  if (!authorization.authorized) return authorization.response;

  const csrfError = validateSameOriginJsonMutation(request);
  if (csrfError) return csrfError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "VALIDATION_ERROR", "A kérés törzse nem érvényes JSON.");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return apiError(400, "VALIDATION_ERROR", "Érvénytelen háztartási adatok.");
  }

  const input = body as Record<string, unknown>;
  if (Object.keys(input).some((key) => key !== "name")) {
    return apiError(400, "VALIDATION_ERROR", "A kérés nem támogatott mezőt tartalmaz.");
  }

  if (typeof input.name !== "string") {
    return apiError(400, "VALIDATION_ERROR", "Add meg a háztartás nevét.");
  }

  const name = input.name.trim();
  if (name.length === 0 || Array.from(name).length > 100) {
    return apiError(400, "VALIDATION_ERROR", "A név 1 és 100 karakter közötti lehet.");
  }

  try {
    const household = await prisma.household.update({
      where: { id: authorization.householdId },
      data: { name },
      select: { id: true, name: true, currency: true },
    });

    return Response.json(
      { household: householdDetails(household, authorization.role) },
      { headers: responseHeaders },
    );
  } catch {
    return apiError(500, "INTERNAL_ERROR", "A háztartás nevének mentése nem sikerült.");
  }
}
