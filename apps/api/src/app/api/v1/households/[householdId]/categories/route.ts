import { prisma } from "@/lib/prisma";
import { authorizeHouseholdOperation } from "@/lib/household-authorization";
import { validateSameOriginJsonMutation } from "@/lib/csrf-protection";
import {
  categoryApiError,
  categoryPayload,
  categoryResponseHeaders,
  isObjectBody,
  isUniqueViolation,
  normalizedCategoryName,
  validatedCategoryName,
  type CategoryRouteContext,
} from "./_shared";

const categorySelection = {
  id: true,
  name: true,
  sortOrder: true,
  archivedAt: true,
} as const;

export async function GET(request: Request, { params }: CategoryRouteContext) {
  const { householdId } = await params;
  const authorization = await authorizeHouseholdOperation(request, householdId, "read");
  if (!authorization.authorized) return authorization.response;

  try {
    const categories = await prisma.expenseCategory.findMany({
      where: { householdId: authorization.householdId },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: categorySelection,
    });
    return Response.json(
      { categories: categories.map(categoryPayload) },
      { headers: categoryResponseHeaders },
    );
  } catch {
    return categoryApiError(500, "INTERNAL_ERROR", "A kategóriák most nem tölthetők be.");
  }
}

export async function POST(request: Request, { params }: CategoryRouteContext) {
  const { householdId } = await params;
  const authorization = await authorizeHouseholdOperation(request, householdId, "manage");
  if (!authorization.authorized) return authorization.response;

  const csrfError = validateSameOriginJsonMutation(request);
  if (csrfError) return csrfError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return categoryApiError(400, "VALIDATION_ERROR", "A kérés törzse nem érvényes JSON.");
  }
  if (!isObjectBody(body) || Object.keys(body).length !== 1 || !("name" in body)) {
    return categoryApiError(400, "VALIDATION_ERROR", "Csak kategórianév adható meg.");
  }

  const name = validatedCategoryName(body.name);
  if (!name) {
    return categoryApiError(400, "VALIDATION_ERROR", "A kategórianév 1 és 100 karakter közötti lehet.");
  }

  try {
    const category = await prisma.$transaction(async (transaction) => {
      // Serializes category ordering for this household without locking others.
      await transaction.$queryRaw`SELECT "id" FROM "household" WHERE "id" = ${authorization.householdId} FOR UPDATE`;
      const { _max } = await transaction.expenseCategory.aggregate({
        where: { householdId: authorization.householdId },
        _max: { sortOrder: true },
      });
      return transaction.expenseCategory.create({
        data: {
          householdId: authorization.householdId,
          name,
          normalizedName: normalizedCategoryName(name),
          sortOrder: (_max.sortOrder ?? -1) + 1,
        },
        select: categorySelection,
      });
    });

    return Response.json(
      { category: categoryPayload(category) },
      { status: 201, headers: categoryResponseHeaders },
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      return categoryApiError(409, "CONFLICT", "Ilyen nevű kategória már létezik ebben a háztartásban.");
    }
    return categoryApiError(500, "INTERNAL_ERROR", "A kategória létrehozása nem sikerült.");
  }
}
