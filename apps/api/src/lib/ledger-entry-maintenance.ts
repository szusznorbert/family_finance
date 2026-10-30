import { Prisma } from "@/generated/prisma/client";
import type { LedgerEntryType, LedgerSourceType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { ledgerPayload, parseManualLedgerInput } from "@/lib/ledger-entry";

const editableFields = new Set(["type", "amount", "occurredOn", "categoryId", "note"]);

type EntryState = {
  id: string;
  householdId: string;
  type: LedgerEntryType;
  amount: Prisma.Decimal;
  currency: string;
  occurredOn: Date;
  categoryId: string | null;
  note: string | null;
  createdByUserId: string;
  sourceType: LedgerSourceType;
  sourceId: string;
  sourceRequestHash: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type MaintenanceResult =
  | { kind: "ok"; entry: ReturnType<typeof ledgerPayload>; repeatedArchive?: boolean }
  | { kind: "not-found" }
  | { kind: "immutable" }
  | { kind: "conflict" }
  | { kind: "invalid"; message: string }
  | { kind: "error" };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function snapshot(entry: EntryState) {
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
    archivedAt: entry.archivedAt?.toISOString() ?? null,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

function maintenancePayload(entry: EntryState) {
  return {
    ...ledgerPayload(entry),
    updatedAt: entry.updatedAt.toISOString(),
    archivedAt: entry.archivedAt?.toISOString() ?? null,
  };
}

function parseUpdate(current: EntryState, body: unknown) {
  if (!isRecord(body)) return { valid: false as const, message: "Érvénytelen módosítási adatok." };
  const keys = Object.keys(body);
  if (keys.some((key) => key !== "expectedUpdatedAt" && !editableFields.has(key))) {
    return { valid: false as const, message: "A kérés nem támogatott mezőt tartalmaz." };
  }
  if (typeof body.expectedUpdatedAt !== "string") {
    return { valid: false as const, message: "Az expectedUpdatedAt aktuális ISO időbélyeg kötelező." };
  }
  const expectedDate = new Date(body.expectedUpdatedAt);
  if (Number.isNaN(expectedDate.getTime()) || expectedDate.toISOString() !== body.expectedUpdatedAt) {
    return { valid: false as const, message: "Az expectedUpdatedAt érvényes ISO időbélyeg legyen." };
  }
  const provided = keys.filter((key) => key !== "expectedUpdatedAt");
  if (provided.length === 0) {
    return { valid: false as const, message: "Legalább egy szerkeszthető mezőt adj meg." };
  }

  const candidateType = Object.hasOwn(body, "type") ? body.type : current.type;
  const candidateCategoryId = Object.hasOwn(body, "categoryId") ? body.categoryId : current.categoryId;
  if (candidateType === "INCOME" && Object.hasOwn(body, "categoryId")) {
    return { valid: false as const, message: "Bevételhez nem adható kiadási kategória." };
  }
  const candidate: Record<string, unknown> = {
    type: candidateType,
    amount: Object.hasOwn(body, "amount") ? body.amount : current.amount.toFixed(2),
    currency: "RON",
    occurredOn: Object.hasOwn(body, "occurredOn") ? body.occurredOn : current.occurredOn.toISOString().slice(0, 10),
    note: Object.hasOwn(body, "note") ? (body.note === null ? undefined : body.note) : current.note ?? undefined,
  };
  if (candidateType !== "INCOME") candidate.categoryId = candidateCategoryId;
  const parsed = parseManualLedgerInput(candidate);
  if (!parsed.valid) return { valid: false as const, message: parsed.message };

  return {
    valid: true as const,
    expectedUpdatedAt: expectedDate,
    provided,
    input: parsed.input,
  };
}

export async function updateManualLedgerEntry(
  householdId: string,
  entryId: string,
  actorUserId: string,
  body: unknown,
): Promise<MaintenanceResult> {
  try {
    return await prisma.$transaction(async (transaction) => {
      const locked = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "ledger_entry"
        WHERE "householdId" = ${householdId} AND "id" = ${entryId}
        FOR UPDATE
      `;
      if (locked.length === 0) return { kind: "not-found" };
      const current = await transaction.ledgerEntry.findUnique({ where: { id: entryId } }) as EntryState | null;
      if (!current || current.householdId !== householdId) return { kind: "not-found" };
      if (current.sourceType !== "MANUAL") return { kind: "immutable" };
      if (current.archivedAt) return { kind: "conflict" };

      const parsed = parseUpdate(current, body);
      if (!parsed.valid) return { kind: "invalid", message: parsed.message };
      if (current.updatedAt.getTime() !== parsed.expectedUpdatedAt.getTime()) return { kind: "conflict" };

      const input = parsed.input;
      const categoryNeedsValidation = input.type !== "INCOME" && (
        input.categoryId !== current.categoryId || input.type !== current.type
      );
      if (categoryNeedsValidation && input.categoryId) {
        const categories = await transaction.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "expense_category"
          WHERE "householdId" = ${householdId}
            AND "id" = ${input.categoryId}
            AND "archivedAt" IS NULL
          FOR SHARE
        `;
        if (categories.length === 0) return { kind: "invalid", message: "A kategória nem található vagy már nem választható." };
      }

      const data = {
        type: input.type,
        amount: input.amount,
        occurredOn: input.occurredOnDate,
        categoryId: input.categoryId,
        note: input.note,
      };
      if (
        current.type === data.type && current.amount.toFixed(2) === data.amount &&
        current.occurredOn.toISOString().slice(0, 10) === input.occurredOn &&
        current.categoryId === data.categoryId && current.note === data.note
      ) {
        return { kind: "ok", entry: maintenancePayload(current) };
      }

      await transaction.ledgerEntryRevision.create({
        data: {
          ledgerEntryId: entryId,
          actorUserId,
          action: "UPDATED",
          previousState: snapshot(current) as Prisma.InputJsonValue,
        },
      });
      const updated = await transaction.ledgerEntry.update({ where: { id: entryId }, data });
      return { kind: "ok", entry: maintenancePayload(updated) };
    });
  } catch {
    return { kind: "error" };
  }
}

export async function archiveManualLedgerEntry(
  householdId: string,
  entryId: string,
  actorUserId: string,
): Promise<MaintenanceResult> {
  try {
    return await prisma.$transaction(async (transaction) => {
      const locked = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "ledger_entry"
        WHERE "householdId" = ${householdId} AND "id" = ${entryId}
        FOR UPDATE
      `;
      if (locked.length === 0) return { kind: "not-found" };
      const current = await transaction.ledgerEntry.findUnique({ where: { id: entryId } }) as EntryState | null;
      if (!current || current.householdId !== householdId) return { kind: "not-found" };
      if (current.sourceType !== "MANUAL") return { kind: "immutable" };
      if (current.archivedAt) return { kind: "ok", entry: maintenancePayload(current), repeatedArchive: true };

      await transaction.ledgerEntryRevision.create({
        data: {
          ledgerEntryId: entryId,
          actorUserId,
          action: "ARCHIVED",
          previousState: snapshot(current) as Prisma.InputJsonValue,
        },
      });
      const archived = await transaction.ledgerEntry.update({
        where: { id: entryId },
        data: { archivedAt: new Date() },
      });
      return { kind: "ok", entry: maintenancePayload(archived) };
    });
  } catch {
    return { kind: "error" };
  }
}

export async function getLedgerEntryDetail(householdId: string, entryId: string) {
  const entry = await prisma.ledgerEntry.findFirst({
    where: { householdId, id: entryId },
    include: { revisions: { orderBy: [{ createdAt: "desc" }, { id: "desc" }] } },
  });
  if (!entry) return null;
  return {
    entry: maintenancePayload(entry),
    revisions: entry.revisions.map((revision) => ({
      id: revision.id,
      action: revision.action,
      actorUserId: revision.actorUserId,
      createdAt: revision.createdAt.toISOString(),
      previous: revision.previousState,
    })),
  };
}
