import { DEFAULT_EXPENSE_CATEGORIES, type DefaultExpenseCategoryCode } from "@household-finance/shared";

const monthPattern = /^(\d{4})-(0[1-9]|1[0-2])$/;
const amountPattern = /^(0|[1-9]\d{0,8})(?:\.(\d{1,2}))?$/;
const categoryCodes = new Set<string>(DEFAULT_EXPENSE_CATEGORIES.map(({ code }) => code));

type CategoryField = "categoryCode" | "categoryId";

export type RecurringRuleInput<T extends CategoryField> = {
  name: string;
  amount: string;
  dayOfMonth: number;
  startMonth: string;
  startMonthDate: Date;
} & Record<T, T extends "categoryCode" ? DefaultExpenseCategoryCode : string>;

type ParseResult<T extends CategoryField> =
  | { valid: true; input: RecurringRuleInput<T> }
  | { valid: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function bucharestMonth(now: Date): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
  };
}

export function parseRecurringRuleInput<T extends CategoryField>(
  body: unknown,
  categoryField: T,
  now = new Date(),
): ParseResult<T> {
  if (!isRecord(body)) return { valid: false, message: "Érvénytelen fixköltség-adatok." };

  const allowed = new Set(["name", "amount", categoryField, "dayOfMonth", "startMonth"]);
  if (Object.keys(body).length !== allowed.size || Object.keys(body).some((key) => !allowed.has(key))) {
    return { valid: false, message: "A fix költség öt megadott mezőt kér; más mező nem adható meg." };
  }

  if (typeof body.name !== "string") {
    return { valid: false, message: "Add meg a fix költség nevét." };
  }
  const name = body.name.trim();
  if (Array.from(name).length < 1 || Array.from(name).length > 100 || /[\p{Cc}\p{Cf}]/u.test(name)) {
    return { valid: false, message: "A fix költség neve 1 és 100 karakter közötti szöveg legyen." };
  }

  if (typeof body.amount !== "string") {
    return { valid: false, message: "Az összeg RON karakterlánc legyen." };
  }
  const amountMatch = amountPattern.exec(body.amount);
  if (!amountMatch) {
    return { valid: false, message: "Az összeg 0,01 és 999 999 999,99 RON között, legfeljebb két tizedessel adható meg." };
  }
  const amount = `${amountMatch[1]}.${(amountMatch[2] ?? "").padEnd(2, "0")}`;
  if (amount === "0.00") {
    return { valid: false, message: "Az összeg pozitív legyen." };
  }

  const category = body[categoryField];
  if (categoryField === "categoryCode") {
    if (typeof category !== "string" || !categoryCodes.has(category)) {
      return { valid: false, message: "Válassz egy induló kiadási kategóriát." };
    }
  } else if (typeof category !== "string" || category.length < 1 || category.length > 128) {
    return { valid: false, message: "Válassz egy aktív kiadási kategóriát." };
  }

  if (!Number.isInteger(body.dayOfMonth) || (body.dayOfMonth as number) < 1 || (body.dayOfMonth as number) > 31) {
    return { valid: false, message: "A havi nap 1 és 31 közötti egész szám legyen." };
  }
  if (typeof body.startMonth !== "string") {
    return { valid: false, message: "A kezdő hónap ÉÉÉÉ-HH formátumú legyen." };
  }
  const monthMatch = monthPattern.exec(body.startMonth);
  if (!monthMatch) {
    return { valid: false, message: "A kezdő hónap ÉÉÉÉ-HH formátumú legyen." };
  }
  const year = Number(monthMatch[1]);
  const month = Number(monthMatch[2]);
  const current = bucharestMonth(now);
  if (year < current.year || (year === current.year && month < current.month)) {
    return { valid: false, message: "A kezdő hónap az aktuális vagy későbbi hónap legyen." };
  }

  return {
    valid: true,
    input: {
      name,
      amount,
      dayOfMonth: body.dayOfMonth as number,
      startMonth: body.startMonth,
      startMonthDate: new Date(Date.UTC(year, month - 1, 1)),
      [categoryField]: category,
    } as RecurringRuleInput<T>,
  };
}

export function recurringRulePayload(rule: {
  id: string;
  householdId: string;
  name: string;
  amount: { toFixed(digits: number): string };
  categoryId: string;
  dayOfMonth: number;
  startMonth: Date;
  stoppedAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: rule.id,
    householdId: rule.householdId,
    name: rule.name,
    amount: rule.amount.toFixed(2),
    currency: "RON" as const,
    categoryId: rule.categoryId,
    dayOfMonth: rule.dayOfMonth,
    startMonth: rule.startMonth.toISOString().slice(0, 7),
    stoppedAt: rule.stoppedAt?.toISOString() ?? null,
    version: rule.version,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };
}
