import { prisma } from "@/lib/prisma";
import { authorizeHouseholdOperation } from "@/lib/household-authorization";
import { validateSameOriginJsonMutation } from "@/lib/csrf-protection";
import { materializeDueOccurrence } from "@/lib/recurring-cost";
import { parseRecurringRuleInput, recurringRulePayload } from "@/lib/recurring-rule-input";

type RouteContext = { params: Promise<{ householdId: string }> };

const responseHeaders = { "Cache-Control": "no-store" };

function apiError(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status, headers: responseHeaders });
}

export async function GET(request: Request, { params }: RouteContext) {
  const { householdId } = await params;
  const authorization = await authorizeHouseholdOperation(request, householdId, "read");
  if (!authorization.authorized) return authorization.response;

  const searchParams = new URL(request.url).searchParams;
  if ([...searchParams.keys()].some((key) => key !== "page" && key !== "pageSize") ||
      searchParams.getAll("page").length > 1 || searchParams.getAll("pageSize").length > 1) {
    return apiError(400, "VALIDATION_ERROR", "A lista nem támogatott vagy ismételt szűrőt tartalmaz.");
  }
  const pageText = searchParams.get("page");
  const pageSizeText = searchParams.get("pageSize");
  const page = pageText === null ? 1 : /^\d+$/.test(pageText) ? Number(pageText) : NaN;
  const pageSize = pageSizeText === null ? 25 : /^\d+$/.test(pageSizeText) ? Number(pageSizeText) : NaN;
  if (!Number.isSafeInteger(page) || page < 1 || page > 10_000 ||
      !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    return apiError(400, "VALIDATION_ERROR", "A page 1–10000, a pageSize 1–100 közötti egész szám legyen.");
  }

  try {
    const where = { householdId: authorization.householdId };
    const [rules, totalItems] = await Promise.all([
      prisma.recurringExpenseRule.findMany({
        where,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.recurringExpenseRule.count({ where }),
    ]);
    return Response.json({
      rules: rules.map(recurringRulePayload),
      pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
    }, { headers: responseHeaders });
  } catch {
    return apiError(500, "INTERNAL_ERROR", "A fix költségek most nem tölthetők be.");
  }
}

export async function POST(request: Request, { params }: RouteContext) {
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
  const now = new Date();
  const parsed = parseRecurringRuleInput(body, "categoryId", now);
  if (!parsed.valid) return apiError(400, "VALIDATION_ERROR", parsed.message);
  const input = parsed.input;

  try {
    const rule = await prisma.$transaction(async (transaction) => {
      // The share lock prevents archiving this category between validation and insertion.
      const category = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "expense_category"
        WHERE "householdId" = ${authorization.householdId}
          AND "id" = ${input.categoryId}
          AND "archivedAt" IS NULL
        FOR SHARE
      `;
      if (category.length === 0) return null;

      const created = await transaction.recurringExpenseRule.create({
        data: {
          householdId: authorization.householdId,
          name: input.name,
          amount: input.amount,
          categoryId: input.categoryId,
          dayOfMonth: input.dayOfMonth,
          startMonth: input.startMonthDate,
          createdByUserId: authorization.userId,
        },
      });
      await materializeDueOccurrence(
        transaction,
        created,
        { year: created.startMonth.getUTCFullYear(), month: created.startMonth.getUTCMonth() + 1 },
        now,
      );
      return created;
    });

    if (!rule) return apiError(404, "NOT_FOUND", "A kategória nem található vagy már nem választható.");
    return Response.json({ rule: recurringRulePayload(rule) }, { status: 201, headers: responseHeaders });
  } catch {
    return apiError(500, "INTERNAL_ERROR", "A fix költség létrehozása nem sikerült.");
  }
}
