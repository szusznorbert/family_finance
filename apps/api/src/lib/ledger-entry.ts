import { createHash } from "node:crypto";
import type { LedgerEntryType } from "@/generated/prisma/enums";

export const ledgerResponseHeaders = { "Cache-Control": "no-store" };

export type ManualLedgerInput = {
  type: LedgerEntryType;
  amount: string;
  occurredOn: string;
  occurredOnDate: Date;
  categoryId: string | null;
  note: string | null;
};

type ParseResult =
  | { valid: true; input: ManualLedgerInput }
  | { valid: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseAmount(value: unknown): string | null {
  if (typeof value !== "string" || !/^(0|[1-9]\d{0,8})(?:\.(\d{1,2}))?$/.test(value)) {
    return null;
  }
  const [whole, fraction = ""] = value.split(".");
  if (whole === "0" && fraction.padEnd(2, "0") === "00") return null;
  return `${whole}.${fraction.padEnd(2, "0")}`;
}

function parseOccurredOn(value: unknown): { date: Date; text: string } | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return { date, text: value };
}

export function parseManualLedgerInput(body: unknown): ParseResult {
  if (!isRecord(body)) return { valid: false, message: "Érvénytelen tételadatok." };

  const allowed = new Set(["type", "amount", "currency", "occurredOn", "categoryId", "note"]);
  if (Object.keys(body).some((key) => !allowed.has(key))) {
    return { valid: false, message: "A kérés nem támogatott mezőt tartalmaz." };
  }
  if (body.type !== "INCOME" && body.type !== "EXPENSE" && body.type !== "REFUND") {
    return { valid: false, message: "Érvénytelen tételtípus." };
  }
  if (body.currency !== "RON") {
    return { valid: false, message: "Csak RON pénznemű tétel rögzíthető." };
  }
  const amount = parseAmount(body.amount);
  if (!amount) {
    return { valid: false, message: "Az összeg 0,01 és 999 999 999,99 RON között, legfeljebb két tizedessel adható meg." };
  }
  const occurredOn = parseOccurredOn(body.occurredOn);
  if (!occurredOn) {
    return { valid: false, message: "Érvénytelen dátum. ÉÉÉÉ-HH-NN formátum szükséges." };
  }

  let categoryId: string | null = null;
  if (body.type === "INCOME") {
    if ("categoryId" in body) {
      return { valid: false, message: "Bevételhez nem adható kiadási kategória." };
    }
  } else {
    if (typeof body.categoryId !== "string" || body.categoryId.length === 0 || body.categoryId.length > 128) {
      return { valid: false, message: "Válassz egy aktív kiadási kategóriát." };
    }
    categoryId = body.categoryId;
  }

  if (body.note !== undefined && typeof body.note !== "string") {
    return { valid: false, message: "A megjegyzés szöveg legyen." };
  }
  const note = typeof body.note === "string" ? body.note.replace(/\r\n?/g, "\n").trim() : "";
  if (Array.from(note).length > 500 || /[\p{Cc}\p{Cf}]/u.test(note.replace(/[\n\t]/g, ""))) {
    return { valid: false, message: "A megjegyzés legfeljebb 500 karakteres szöveg lehet." };
  }

  return {
    valid: true,
    input: {
      type: body.type,
      amount,
      occurredOn: occurredOn.text,
      occurredOnDate: occurredOn.date,
      categoryId,
      note: note || null,
    },
  };
}

export function manualRequestHash(householdId: string, input: ManualLedgerInput): string {
  const canonical = JSON.stringify({
    householdId,
    type: input.type,
    amount: input.amount,
    currency: "RON",
    occurredOn: input.occurredOn,
    categoryId: input.categoryId,
    note: input.note,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

export function ledgerApiError(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status, headers: ledgerResponseHeaders });
}

export function ledgerPayload(entry: {
  id: string;
  type: LedgerEntryType;
  amount: { toFixed(digits: number): string };
  currency: string;
  occurredOn: Date;
  categoryId: string | null;
  note: string | null;
  sourceType: string;
  createdAt: Date;
}) {
  return {
    id: entry.id,
    type: entry.type,
    amount: entry.amount.toFixed(2),
    currency: entry.currency,
    occurredOn: entry.occurredOn.toISOString().slice(0, 10),
    categoryId: entry.categoryId,
    note: entry.note,
    sourceType: entry.sourceType,
    createdAt: entry.createdAt.toISOString(),
  };
}
