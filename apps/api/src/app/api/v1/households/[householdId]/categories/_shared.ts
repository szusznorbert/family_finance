export const categoryResponseHeaders = { "Cache-Control": "no-store" };

export type CategoryRouteContext = { params: Promise<{ householdId: string }> };
export type CategoryItemRouteContext = {
  params: Promise<{ householdId: string; categoryId: string }>;
};

export function categoryApiError(status: number, code: string, message: string) {
  return Response.json(
    { error: { code, message } },
    { status, headers: categoryResponseHeaders },
  );
}

export function normalizedCategoryName(name: string) {
  return name.normalize("NFC").trim().toLowerCase();
}

export function validatedCategoryName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.normalize("NFC").trim();
  if (
    name.length === 0 ||
    Array.from(name).length > 100 ||
    /[\p{Cc}\p{Cf}]/u.test(name)
  ) return null;
  return name;
}

export function isObjectBody(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export function categoryPayload(category: {
  id: string;
  name: string;
  sortOrder: number;
  archivedAt: Date | null;
}) {
  return {
    id: category.id,
    name: category.name,
    sortOrder: category.sortOrder,
    archivedAt: category.archivedAt?.toISOString() ?? null,
  };
}
