import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateSameOriginJsonMutation } from "@/lib/csrf-protection";
import { materializeDueOccurrence } from "@/lib/recurring-cost";
import { parseRecurringRuleInput, recurringRulePayload, type RecurringRuleInput } from "@/lib/recurring-rule-input";
import { DEFAULT_EXPENSE_CATEGORIES } from "@household-finance/shared";
import { normalizedCategoryName } from "./[householdId]/categories/_shared";

const responseHeaders = { "Cache-Control": "no-store" };

const maxFixedCosts = 20;

function apiError(status: number, code: string, message: string) {
  return Response.json(
    { error: { code, message } },
    { status, headers: responseHeaders },
  );
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return apiError(401, "UNAUTHENTICATED", "Bejelentkezés szükséges.");
  }

  try {
    const memberships = await prisma.householdMember.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
      select: {
        role: true,
        household: {
          select: {
            id: true,
            name: true,
            currency: true,
            createdAt: true,
            categories: {
              where: { archivedAt: null },
              orderBy: { sortOrder: "asc" },
              select: { id: true, name: true, sortOrder: true },
            },
          },
        },
      },
    });

    return Response.json(
      {
        households: memberships.map(({ role, household }) => ({
          ...household,
          role,
        })),
      },
      { headers: responseHeaders },
    );
  } catch {
    return apiError(500, "INTERNAL_ERROR", "A háztartások most nem tölthetők be.");
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return apiError(401, "UNAUTHENTICATED", "Bejelentkezés szükséges.");
  }

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
  const allowedKeys = new Set(["name", "currency", "fixedCosts"]);
  if (Object.keys(input).some((key) => !allowedKeys.has(key))) {
    return apiError(400, "VALIDATION_ERROR", "A kérés nem támogatott mezőt tartalmaz.");
  }

  if (typeof input.name !== "string") {
    return apiError(400, "VALIDATION_ERROR", "Add meg a háztartás nevét.");
  }

  const name = input.name.trim();
  if (name.length === 0 || Array.from(name).length > 100) {
    return apiError(
      400,
      "VALIDATION_ERROR",
      "A név 1 és 100 karakter közötti lehet.",
    );
  }

  if ("currency" in input && input.currency !== "RON") {
    return apiError(400, "VALIDATION_ERROR", "A háztartás pénzneme csak RON lehet.");
  }

  const now = new Date();
  if (input.fixedCosts !== undefined && (!Array.isArray(input.fixedCosts) || input.fixedCosts.length > maxFixedCosts)) {
    return apiError(400, "VALIDATION_ERROR", `Legfeljebb ${maxFixedCosts} fix költség adható meg.`);
  }
  const fixedCosts: RecurringRuleInput<"categoryCode">[] = [];
  const fixedCostInputs: unknown[] = Array.isArray(input.fixedCosts) ? input.fixedCosts : [];
  for (const [index, value] of fixedCostInputs.entries()) {
    const parsed = parseRecurringRuleInput(value, "categoryCode", now);
    if (!parsed.valid) {
      return apiError(400, "VALIDATION_ERROR", `${index + 1}. fix költség: ${parsed.message}`);
    }
    fixedCosts.push(parsed.input);
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const created = await transaction.household.create({
        data: { name, currency: "RON" },
      });

      await transaction.householdMember.create({
        data: {
          householdId: created.id,
          userId: session.user.id,
          role: "OWNER",
        },
      });

      await transaction.expenseCategory.createMany({
        data: DEFAULT_EXPENSE_CATEGORIES.map(({ name: categoryName }, sortOrder) => ({
          householdId: created.id,
          name: categoryName,
          normalizedName: normalizedCategoryName(categoryName),
          sortOrder,
        })),
      });

      const seededCategories = await transaction.expenseCategory.findMany({
        where: { householdId: created.id },
        select: { id: true, name: true },
      });
      const categoryIds = new Map(seededCategories.map((category) => [category.name, category.id]));
      const createdRules = [];
      for (const fixedCost of fixedCosts) {
        const categoryName = DEFAULT_EXPENSE_CATEGORIES.find(({ code }) => code === fixedCost.categoryCode)?.name;
        const categoryId = categoryName ? categoryIds.get(categoryName) : undefined;
        if (!categoryId) throw new Error("Seeded category missing");

        const rule = await transaction.recurringExpenseRule.create({
          data: {
            householdId: created.id,
            name: fixedCost.name,
            amount: fixedCost.amount,
            categoryId,
            dayOfMonth: fixedCost.dayOfMonth,
            startMonth: fixedCost.startMonthDate,
            createdByUserId: session.user.id,
          },
        });
        await materializeDueOccurrence(
          transaction,
          rule,
          { year: rule.startMonth.getUTCFullYear(), month: rule.startMonth.getUTCMonth() + 1 },
          now,
        );
        createdRules.push(rule);
      }

      const household = await transaction.household.findUniqueOrThrow({
        where: { id: created.id },
        select: {
          id: true,
          name: true,
          currency: true,
          createdAt: true,
          members: {
            where: { userId: session.user.id },
            select: { role: true },
          },
          categories: {
            where: { archivedAt: null },
            orderBy: { sortOrder: "asc" },
            select: { id: true, name: true, sortOrder: true },
          },
        },
      });
      return { household, createdRules };
    }, { isolationLevel: "Serializable" });

    return Response.json(
      {
        household: {
          id: result.household.id,
          name: result.household.name,
          currency: result.household.currency,
          createdAt: result.household.createdAt,
          role: result.household.members[0]?.role ?? "OWNER",
          categories: result.household.categories,
          ...(fixedCosts.length > 0 ? { fixedCosts: result.createdRules.map(recurringRulePayload) } : {}),
        },
      },
      { status: 201, headers: responseHeaders },
    );
  } catch {
    return apiError(500, "INTERNAL_ERROR", "A háztartás létrehozása nem sikerült.");
  }
}
