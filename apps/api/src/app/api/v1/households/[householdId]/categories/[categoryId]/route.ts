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
  type CategoryItemRouteContext,
} from "../_shared";

export async function PATCH(request: Request, { params }: CategoryItemRouteContext) {
  const { householdId, categoryId } = await params;
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
  if (!isObjectBody(body) || Object.keys(body).length !== 1) {
    return categoryApiError(400, "VALIDATION_ERROR", "Csak egy kategóriamódosítás adható meg.");
  }

  const rename = "name" in body;
  const archive = "archived" in body && body.archived === true;
  if (!rename && !archive) {
    return categoryApiError(400, "VALIDATION_ERROR", "Adj meg egy nevet vagy archiválási műveletet.");
  }

  const name = rename ? validatedCategoryName(body.name) : null;
  if (rename && !name) {
    return categoryApiError(400, "VALIDATION_ERROR", "A kategórianév 1 és 100 karakter közötti lehet.");
  }

  try {
    if (archive) {
      // Repeated archive requests preserve the original archive timestamp.
      await prisma.expenseCategory.updateMany({
        where: { id: categoryId, householdId: authorization.householdId, archivedAt: null },
        data: { archivedAt: new Date() },
      });
    }

    const category = archive
      ? await prisma.expenseCategory.findFirst({
        where: { id: categoryId, householdId: authorization.householdId },
        select: { id: true, name: true, sortOrder: true, archivedAt: true },
      })
      : await prisma.expenseCategory.update({
        where: { id: categoryId, householdId: authorization.householdId },
        data: { name: name!, normalizedName: normalizedCategoryName(name!) },
        select: { id: true, name: true, sortOrder: true, archivedAt: true },
      });

    if (!category) {
      return categoryApiError(404, "NOT_FOUND", "A kategória nem található.");
    }
    return Response.json(
      { category: categoryPayload(category) },
      { headers: categoryResponseHeaders },
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      return categoryApiError(409, "CONFLICT", "Ilyen nevű kategória már létezik ebben a háztartásban.");
    }
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") {
      return categoryApiError(404, "NOT_FOUND", "A kategória nem található.");
    }
    return categoryApiError(500, "INTERNAL_ERROR", "A kategória módosítása nem sikerült.");
  }
}
