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

/** Stable codes for the nine categories seeded with every new household. */
export const DEFAULT_EXPENSE_CATEGORIES = [
  { code: "groceries", name: "Élelmiszer és háztartási bevásárlás" },
  { code: "housing", name: "Lakhatás" },
  { code: "utilities", name: "Rezsi és távközlés" },
  { code: "transport", name: "Közlekedés" },
  { code: "health", name: "Egészség és gyógyszertár" },
  { code: "clothing", name: "Ruházat és személyes ápolás" },
  { code: "family", name: "Család és oktatás" },
  { code: "leisure", name: "Étterem és szabadidő" },
  { code: "other", name: "Egyéb" },
] as const;

export type DefaultExpenseCategoryCode = (typeof DEFAULT_EXPENSE_CATEGORIES)[number]["code"];
