import { createHash } from "node:crypto";
import { Prisma } from "../generated/prisma/client";
import type { LedgerEntry, RecurringExpenseRule } from "../generated/prisma/client";
import { prisma } from "./prisma";

const bucharestCalendar = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Bucharest",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

type Month = { year: number; month: number };
type OccurrenceResult = "created" | "existing" | "not-due" | "inactive";
type Transaction = Prisma.TransactionClient;

function bucharestDate(now: Date) {
  const parts = Object.fromEntries(
    bucharestCalendar.formatToParts(now).map((part) => [part.type, Number(part.value)]),
  );
  return { year: parts.year, month: parts.month, day: parts.day };
}

function monthFromDate(date: Date): Month {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

function monthNumber(month: Month) {
  return month.year * 12 + month.month;
}

function firstDay(month: Month) {
  return new Date(Date.UTC(month.year, month.month - 1, 1));
}

function dueDay(month: Month, dayOfMonth: number) {
  return Math.min(dayOfMonth, new Date(Date.UTC(month.year, month.month, 0)).getUTCDate());
}

function sourceId(ruleId: string, month: Month) {
  return `${ruleId}:${month.year}-${String(month.month).padStart(2, "0")}`;
}

function verifyExisting(entry: LedgerEntry, rule: RecurringExpenseRule, month: Month) {
  if (
    entry.householdId !== rule.householdId ||
    entry.recurringRuleId !== rule.id ||
    entry.recurringMonth?.getTime() !== firstDay(month).getTime() ||
    entry.sourceType !== "RECURRENT" ||
    entry.sourceId !== sourceId(rule.id, month)
  ) {
    throw new Error("Recurring occurrence identity conflict");
  }
}

function isDue(rule: RecurringExpenseRule, month: Month, now: Date) {
  const today = bucharestDate(now);
  const monthValue = monthNumber(month);
  return !rule.stoppedAt &&
    monthValue >= monthNumber(monthFromDate(rule.startMonth)) &&
    (monthValue < monthNumber(today) ||
      (monthValue === monthNumber(today) && today.day >= dueDay(month, rule.dayOfMonth)));
}

/** The caller holds the rule lock, or created the rule in this transaction. */
export async function materializeDueOccurrence(
  transaction: Transaction,
  rule: RecurringExpenseRule,
  month: Month,
  now = new Date(),
): Promise<OccurrenceResult> {
  if (rule.stoppedAt) return "inactive";
  if (!isDue(rule, month, now)) return "not-due";

  const recurringMonth = firstDay(month);
  const existing = await transaction.ledgerEntry.findUnique({
    where: { recurringRuleId_recurringMonth: { recurringRuleId: rule.id, recurringMonth } },
  });
  if (existing) {
    verifyExisting(existing, rule, month);
    return "existing";
  }

  await transaction.ledgerEntry.create({
    data: {
      householdId: rule.householdId,
      type: "EXPENSE",
      amount: rule.amount,
      currency: "RON",
      occurredOn: new Date(Date.UTC(month.year, month.month - 1, dueDay(month, rule.dayOfMonth))),
      categoryId: rule.categoryId,
      note: rule.name,
      createdByUserId: rule.createdByUserId,
      sourceType: "RECURRENT",
      sourceId: sourceId(rule.id, month),
      recurringRuleId: rule.id,
      recurringMonth,
    },
  });
  return "created";
}

function errorCode(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError ? error.code : "unknown";
}

export async function materializeRecurringMonth(ruleId: string, month: Month, now = new Date()): Promise<OccurrenceResult> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (transaction) => {
        const locked = await transaction.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "recurring_expense_rule" WHERE "id" = ${ruleId} FOR UPDATE
        `;
        if (locked.length === 0) return "inactive";
        const rule = await transaction.recurringExpenseRule.findUnique({ where: { id: ruleId } });
        if (!rule) return "inactive";
        return materializeDueOccurrence(transaction, rule, month, now);
      }, { isolationLevel: "Serializable" });
    } catch (error) {
      const code = errorCode(error);
      if (code === "P2034" && attempt < 2) continue;
      if (code === "P2002") {
        const entry = await prisma.ledgerEntry.findUnique({
          where: { recurringRuleId_recurringMonth: { recurringRuleId: ruleId, recurringMonth: firstDay(month) } },
        });
        const rule = await prisma.recurringExpenseRule.findUnique({ where: { id: ruleId } });
        if (entry && rule) {
          verifyExisting(entry, rule, month);
          return "existing";
        }
      }
      throw error;
    }
  }
  throw new Error("Recurring occurrence retry limit reached");
}

export type RecurringSweepResult = {
  created: number;
  existing: number;
  failures: number;
};

/** Catch up all active rules. One bad occurrence never stops the other rules. */
export async function runRecurringSweep(now = new Date()): Promise<RecurringSweepResult> {
  const current = bucharestDate(now);
  const result: RecurringSweepResult = { created: 0, existing: 0, failures: 0 };
  let cursor: string | undefined;

  while (true) {
    const rules = await prisma.recurringExpenseRule.findMany({
      where: { stoppedAt: null, ...(cursor ? { id: { gt: cursor } } : {}) },
      select: { id: true, startMonth: true },
      orderBy: { id: "asc" },
      take: 100,
    });
    if (rules.length === 0) break;

    for (const rule of rules) {
      const start = monthFromDate(rule.startMonth);
      for (let number = monthNumber(start); number <= monthNumber(current); number += 1) {
        const month = { year: Math.floor((number - 1) / 12), month: ((number - 1) % 12) + 1 };
        try {
          const outcome = await materializeRecurringMonth(rule.id, month, now);
          if (outcome === "created") result.created += 1;
          if (outcome === "existing") result.existing += 1;
        } catch (error) {
          if (["P1001", "P1002", "P1017", "P2024"].includes(errorCode(error))) throw error;
          result.failures += 1;
          const ruleReference = createHash("sha256").update(rule.id).digest("hex").slice(0, 12);
          console.error("Recurring occurrence failed", { ruleReference, month: `${month.year}-${month.month}`, code: errorCode(error) });
        }
      }
    }
    cursor = rules[rules.length - 1].id;
  }

  // Distinguish a bad rule from a lost database connection before sleeping.
  if (result.failures > 0) await prisma.$queryRaw`SELECT 1`;

  return result;
}

export function recurringErrorCode(error: unknown) {
  return errorCode(error);
}
