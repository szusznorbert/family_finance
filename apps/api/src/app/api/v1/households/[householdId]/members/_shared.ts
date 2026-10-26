export const memberResponseHeaders = { "Cache-Control": "no-store" };

export type MemberRouteContext = { params: Promise<{ householdId: string }> };
export type TargetMemberRouteContext = {
  params: Promise<{ householdId: string; userId: string }>;
};

export function memberApiError(status: number, code: string, message: string) {
  return Response.json(
    { error: { code, message } },
    { status, headers: memberResponseHeaders },
  );
}

export function isObjectBody(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isSerializableConflict(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2034"
  );
}
