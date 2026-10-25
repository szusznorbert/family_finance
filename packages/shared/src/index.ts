export type BackendStatusResponse = {
  status: "ok";
  service: string;
};

export function isBackendStatusResponse(
  value: unknown,
): value is BackendStatusResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const response = value as Record<string, unknown>;
  return response.status === "ok" && typeof response.service === "string";
}
