import { authorizeHouseholdOperation } from "@/lib/household-authorization";
import { validateSameOriginJsonMutation } from "@/lib/csrf-protection";
import {
  mutateRecurringRule,
  parseRulePatch,
  parseRuleRequestKey,
  ruleMutationError,
  ruleMutationResponse,
} from "@/lib/recurring-rule-maintenance";

type RouteContext = { params: Promise<{ householdId: string; ruleId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const { householdId, ruleId } = await params;
  const authorization = await authorizeHouseholdOperation(request, householdId, "manage");
  if (!authorization.authorized) return authorization.response;
  const csrfError = validateSameOriginJsonMutation(request);
  if (csrfError) return csrfError;

  const requestKey = parseRuleRequestKey(request.headers.get("idempotency-key"));
  if (!requestKey) return ruleMutationError(400, "VALIDATION_ERROR", "Érvényes UUID Idempotency-Key fejléc szükséges.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return ruleMutationError(400, "VALIDATION_ERROR", "A kérés törzse nem érvényes JSON.");
  }
  const parsed = parseRulePatch(body);
  if (!parsed.valid) return ruleMutationError(400, "VALIDATION_ERROR", parsed.message);

  return ruleMutationResponse(await mutateRecurringRule(
    authorization.householdId,
    ruleId,
    authorization.userId,
    requestKey,
    parsed.mutation,
  ));
}
