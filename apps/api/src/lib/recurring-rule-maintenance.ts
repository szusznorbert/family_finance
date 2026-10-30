import { createHash } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import type { LedgerEntry, RecurringExpenseRule } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// A correction must fit in one transaction with one audit row per changed entry.
const MAX_CORRECTED_OCCURRENCES = 240;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const amountPattern = /^(0|[1-9]\d{0,8})(?:\.(\d{1,2}))?$/;

type PatchFields = {
  name?: string;
  amount?: string;
  categoryId?: string;
  dayOfMonth?: number;
};
export type RuleMutation =
  | { action: "UPDATED"; expectedVersion: number; fields: PatchFields }
  | { action: "STOPPED"; expectedVersion: number };

export type RuleMutationResult =
  | { kind: "ok"; rule: ReturnType<typeof rulePayload> }
  | { kind: "not-found" | "conflict" | "stopped" | "too-large" | "error" }
  | { kind: "invalid"; message: string };

const responseHeaders = { "Cache-Control": "no-store" };

export function ruleMutationError(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status, headers: responseHeaders });
}

export function ruleMutationResponse(result: RuleMutationResult): Response {
  switch (result.kind) {
    case "ok":
      return Response.json({ rule: result.rule }, { headers: responseHeaders });
    case "not-found":
      return ruleMutationError(404, "NOT_FOUND", "A fix költség nem található.");
    case "conflict":
      return ruleMutationError(409, "CONFLICT", "A szabály verziója megváltozott, vagy a beküldési azonosító már használatban van.");
    case "stopped":
      return ruleMutationError(409, "CONFLICT", "A leállított szabály nem módosítható.");
    case "too-large":
      return ruleMutationError(409, "TOO_MANY_OCCURRENCES", "A szabályhoz túl sok korábbi tétel tartozik az atomikus módosításhoz.");
    case "invalid":
      return ruleMutationError(400, "VALIDATION_ERROR", result.message);
    case "error":
      return ruleMutationError(500, "INTERNAL_ERROR", "A szabály módosítása nem sikerült.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseExpectedVersion(body: Record<string, unknown>): number | null {
  return typeof body.expectedVersion === "number" && Number.isSafeInteger(body.expectedVersion) && body.expectedVersion > 0
    ? body.expectedVersion
    : null;
}

export function parseRulePatch(body: unknown): { valid: true; mutation: RuleMutation } | { valid: false; message: string } {
  if (!isRecord(body)) return { valid: false, message: "Érvénytelen szabálymódosítás." };
  if (Object.keys(body).some((key) => !["expectedVersion", "name", "amount", "categoryId", "dayOfMonth"].includes(key))) {
    return { valid: false, message: "A kérés nem támogatott mezőt tartalmaz." };
  }
  const expectedVersion = parseExpectedVersion(body);
  if (expectedVersion === null) return { valid: false, message: "Pozitív egész expectedVersion kötelező." };

  const fields: PatchFields = {};
  if (Object.hasOwn(body, "name")) {
    if (typeof body.name !== "string") return { valid: false, message: "A megnevezés szöveg legyen." };
    const name = body.name.trim();
    if (Array.from(name).length < 1 || Array.from(name).length > 100 || /[\p{Cc}\p{Cf}]/u.test(name)) {
      return { valid: false, message: "A megnevezés 1–100 karakteres, vezérlőkarakter nélküli szöveg legyen." };
    }
    fields.name = name;
  }
  if (Object.hasOwn(body, "amount")) {
    if (typeof body.amount !== "string" || !amountPattern.test(body.amount)) {
      return { valid: false, message: "Az összeg pozitív RON-érték legyen, legfeljebb két tizedessel." };
    }
    const [whole, fraction = ""] = body.amount.split(".");
    const amount = `${whole}.${fraction.padEnd(2, "0")}`;
    if (amount === "0.00") return { valid: false, message: "Az összeg legyen pozitív." };
    fields.amount = amount;
  }
  if (Object.hasOwn(body, "categoryId")) {
    if (typeof body.categoryId !== "string" || body.categoryId.length < 1 || body.categoryId.length > 128) {
      return { valid: false, message: "Válassz egy aktív kiadási kategóriát." };
    }
    fields.categoryId = body.categoryId;
  }
  if (Object.hasOwn(body, "dayOfMonth")) {
    if (typeof body.dayOfMonth !== "number" || !Number.isInteger(body.dayOfMonth) || body.dayOfMonth < 1 || body.dayOfMonth > 31) {
      return { valid: false, message: "A havi nap 1 és 31 közötti egész szám legyen." };
    }
    fields.dayOfMonth = body.dayOfMonth;
  }
  if (Object.keys(fields).length === 0) return { valid: false, message: "Legalább egy módosítható mezőt adj meg." };
  return { valid: true, mutation: { action: "UPDATED", expectedVersion, fields } };
}

export function parseRuleStop(body: unknown): { valid: true; mutation: RuleMutation } | { valid: false; message: string } {
  if (!isRecord(body) || Object.keys(body).some((key) => key !== "expectedVersion")) {
    return { valid: false, message: "A leállítás csak expectedVersion mezőt fogad el." };
  }
  const expectedVersion = parseExpectedVersion(body);
  if (expectedVersion === null) return { valid: false, message: "Pozitív egész expectedVersion kötelező." };
  return { valid: true, mutation: { action: "STOPPED", expectedVersion } };
}

export function parseRuleRequestKey(value: string | null): string | null {
  return value && uuidPattern.test(value) ? value.toLowerCase() : null;
}

function ruleSnapshot(rule: RecurringExpenseRule) {
  return {
    id: rule.id,
    householdId: rule.householdId,
    name: rule.name,
    amount: rule.amount.toFixed(2),
    categoryId: rule.categoryId,
    dayOfMonth: rule.dayOfMonth,
    startMonth: rule.startMonth.toISOString().slice(0, 10),
    stoppedAt: rule.stoppedAt?.toISOString() ?? null,
    version: rule.version,
    createdByUserId: rule.createdByUserId,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };
}

type RuleSnapshot = ReturnType<typeof ruleSnapshot>;

function rulePayload(rule: RuleSnapshot) {
  return {
    id: rule.id,
    householdId: rule.householdId,
    name: rule.name,
    amount: rule.amount,
    currency: "RON" as const,
    categoryId: rule.categoryId,
    dayOfMonth: rule.dayOfMonth,
    startMonth: rule.startMonth.slice(0, 7),
    stoppedAt: rule.stoppedAt,
    version: rule.version,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  };
}

function entrySnapshot(entry: LedgerEntry) {
  return {
    id: entry.id,
    householdId: entry.householdId,
    type: entry.type,
    amount: entry.amount.toFixed(2),
    currency: entry.currency,
    occurredOn: entry.occurredOn.toISOString().slice(0, 10),
    categoryId: entry.categoryId,
    note: entry.note,
    createdByUserId: entry.createdByUserId,
    sourceType: entry.sourceType,
    sourceId: entry.sourceId,
    sourceRequestHash: entry.sourceRequestHash,
    recurringRuleId: entry.recurringRuleId,
    recurringMonth: entry.recurringMonth?.toISOString().slice(0, 10) ?? null,
    archivedAt: entry.archivedAt?.toISOString() ?? null,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

function occurrenceDay(month: Date, dayOfMonth: number) {
  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, monthIndex, Math.min(dayOfMonth, lastDay)));
}

function requestHash(householdId: string, ruleId: string, actorUserId: string, mutation: RuleMutation) {
  return createHash("sha256").update(JSON.stringify({ householdId, ruleId, actorUserId, mutation })).digest("hex");
}

function prismaErrorCode(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError ? error.code : null;
}

export async function mutateRecurringRule(
  householdId: string,
  ruleId: string,
  actorUserId: string,
  requestKey: string,
  mutation: RuleMutation,
): Promise<RuleMutationResult> {
  const hash = requestHash(householdId, ruleId, actorUserId, mutation);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (transaction): Promise<RuleMutationResult> => {
        // Match the worker's lock order: rule first, then linked entries.
        const locked = await transaction.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "recurring_expense_rule"
          WHERE "householdId" = ${householdId} AND "id" = ${ruleId}
          FOR UPDATE
        `;
        if (locked.length === 0) return { kind: "not-found" };
        const current = await transaction.recurringExpenseRule.findUnique({ where: { id: ruleId } });
        if (!current || current.householdId !== householdId) return { kind: "not-found" };

        const previousRequest = await transaction.recurringExpenseRuleRevision.findUnique({
          where: { recurringRuleId_requestKey: { recurringRuleId: ruleId, requestKey } },
        });
        if (previousRequest) {
          if (previousRequest.requestHash !== hash || previousRequest.actorUserId !== actorUserId) return { kind: "conflict" };
          return { kind: "ok", rule: rulePayload(previousRequest.newState as RuleSnapshot) };
        }
        if (current.stoppedAt) return { kind: "stopped" };
        if (current.version !== mutation.expectedVersion) return { kind: "conflict" };

        if (mutation.action === "UPDATED" && mutation.fields.categoryId && mutation.fields.categoryId !== current.categoryId) {
          const category = await transaction.$queryRaw<Array<{ id: string }>>`
            SELECT "id" FROM "expense_category"
            WHERE "householdId" = ${householdId}
              AND "id" = ${mutation.fields.categoryId}
              AND "archivedAt" IS NULL
            FOR SHARE
          `;
          if (category.length === 0) return { kind: "invalid", message: "A kategória nem található vagy már nem választható." };
        }

        const entries = mutation.action === "UPDATED"
          ? await transaction.ledgerEntry.findMany({
              where: { householdId, recurringRuleId: ruleId, sourceType: "RECURRENT" },
              orderBy: { id: "asc" },
              take: MAX_CORRECTED_OCCURRENCES + 1,
            })
          : [];
        if (entries.length > MAX_CORRECTED_OCCURRENCES) return { kind: "too-large" };

        const now = new Date();
        const nextRule = {
          ...current,
          name: mutation.action === "UPDATED" ? mutation.fields.name ?? current.name : current.name,
          amount: mutation.action === "UPDATED" && mutation.fields.amount ? new Prisma.Decimal(mutation.fields.amount) : current.amount,
          categoryId: mutation.action === "UPDATED" ? mutation.fields.categoryId ?? current.categoryId : current.categoryId,
          dayOfMonth: mutation.action === "UPDATED" ? mutation.fields.dayOfMonth ?? current.dayOfMonth : current.dayOfMonth,
          stoppedAt: mutation.action === "STOPPED" ? now : current.stoppedAt,
          version: current.version + 1,
          updatedAt: now,
        };
        const revision = await transaction.recurringExpenseRuleRevision.create({
          data: {
            recurringRuleId: ruleId,
            actorUserId,
            action: mutation.action,
            requestKey,
            requestHash: hash,
            previousState: ruleSnapshot(current) as Prisma.InputJsonValue,
            newState: ruleSnapshot(nextRule) as Prisma.InputJsonValue,
          },
        });
        await transaction.recurringExpenseRule.update({
          where: { id: ruleId },
          data: {
            name: nextRule.name,
            amount: nextRule.amount,
            categoryId: nextRule.categoryId,
            dayOfMonth: nextRule.dayOfMonth,
            stoppedAt: nextRule.stoppedAt,
            version: nextRule.version,
            updatedAt: now,
          },
        });

        for (const entry of entries) {
          if (!entry.recurringMonth) throw new Error("Recurring entry is missing its month");
          const occurredOn = occurrenceDay(entry.recurringMonth, nextRule.dayOfMonth);
          const changed = entry.amount.toFixed(2) !== nextRule.amount.toFixed(2) ||
            entry.categoryId !== nextRule.categoryId || entry.note !== nextRule.name ||
            entry.occurredOn.getTime() !== occurredOn.getTime();
          if (!changed) continue;
          await transaction.ledgerEntryRevision.create({
            data: {
              ledgerEntryId: entry.id,
              actorUserId,
              action: "UPDATED",
              previousState: entrySnapshot(entry) as Prisma.InputJsonValue,
              recurringRuleRevisionId: revision.id,
            },
          });
          await transaction.ledgerEntry.update({
            where: { id: entry.id },
            data: { amount: nextRule.amount, categoryId: nextRule.categoryId, note: nextRule.name, occurredOn },
          });
        }
        return { kind: "ok", rule: rulePayload(ruleSnapshot(nextRule)) };
      }, { isolationLevel: "Serializable", maxWait: 5_000, timeout: 60_000 });
    } catch (error) {
      if (prismaErrorCode(error) === "P2034" && attempt < 2) continue;
      return { kind: "error" };
    }
  }
  return { kind: "error" };
}
