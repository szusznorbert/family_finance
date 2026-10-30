import { Prisma } from "@/generated/prisma/client";
import { authorizeHouseholdOperation } from "@/lib/household-authorization";
import { ledgerApiError, ledgerResponseHeaders } from "@/lib/ledger-entry";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ householdId: string }> };

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

function emptyAmount() {
  return new Prisma.Decimal(0);
}

function formatAmount(amount: Prisma.Decimal) {
  return amount.toFixed(2);
}

export async function GET(request: Request, { params }: RouteContext) {
  const { householdId } = await params;
  const authorization = await authorizeHouseholdOperation(request, householdId, "read");
  if (!authorization.authorized) return authorization.response;

  const searchParams = new URL(request.url).searchParams;
  const monthValues = searchParams.getAll("month");
  if (
    [...searchParams.keys()].some((key) => key !== "month") ||
    monthValues.length !== 1 ||
    !monthPattern.test(monthValues[0])
  ) {
    return ledgerApiError(400, "VALIDATION_ERROR", "A month paraméter kötelező, YYYY-MM alakú érték legyen.");
  }

  const month = monthValues[0];
  const monthStart = new Date(`${month}-01T00:00:00.000Z`);
  const nextMonthStart = new Date(monthStart);
  nextMonthStart.setUTCMonth(nextMonthStart.getUTCMonth() + 1);

  try {
    const entries = await prisma.ledgerEntry.findMany({
      where: {
        householdId: authorization.householdId,
        archivedAt: null,
        occurredOn: { gte: monthStart, lt: nextMonthStart },
      },
      select: {
        type: true,
        amount: true,
        categoryId: true,
        // Archived categories remain addressable for historical reporting.
        category: { select: { id: true, name: true } },
      },
    });

    let income = emptyAmount();
    let grossExpenses = emptyAmount();
    let grossRefunds = emptyAmount();
    const categoryTotals = new Map<
      string,
      {
        categoryId: string | null;
        categoryName: string;
        expenses: Prisma.Decimal;
        refunds: Prisma.Decimal;
      }
    >();

    for (const entry of entries) {
      if (entry.type === "INCOME") {
        income = income.add(entry.amount);
        continue;
      }

      const categoryKey = entry.categoryId ?? "";
      let category = categoryTotals.get(categoryKey);
      if (!category) {
        category = {
          categoryId: entry.categoryId,
          categoryName: entry.category?.name ?? "Kategória nélkül",
          expenses: emptyAmount(),
          refunds: emptyAmount(),
        };
        categoryTotals.set(categoryKey, category);
      }

      if (entry.type === "EXPENSE") {
        grossExpenses = grossExpenses.add(entry.amount);
        category.expenses = category.expenses.add(entry.amount);
      } else {
        grossRefunds = grossRefunds.add(entry.amount);
        category.refunds = category.refunds.add(entry.amount);
      }
    }

    const categories = [...categoryTotals.values()]
      .map((category) => ({
        categoryId: category.categoryId,
        categoryName: category.categoryName,
        expenses: formatAmount(category.expenses),
        refunds: formatAmount(category.refunds),
        netExpenses: formatAmount(category.expenses.sub(category.refunds)),
      }))
      .sort((a, b) => a.categoryName.localeCompare(b.categoryName, "hu") || (a.categoryId ?? "").localeCompare(b.categoryId ?? ""));

    return Response.json(
      {
        month,
        currency: "RON",
        income: formatAmount(income),
        grossExpenses: formatAmount(grossExpenses),
        grossRefunds: formatAmount(grossRefunds),
        netExpenses: formatAmount(grossExpenses.sub(grossRefunds)),
        categories,
      },
      { headers: ledgerResponseHeaders },
    );
  } catch {
    return ledgerApiError(500, "INTERNAL_ERROR", "A havi összesítő most nem tölthető be.");
  }
}
