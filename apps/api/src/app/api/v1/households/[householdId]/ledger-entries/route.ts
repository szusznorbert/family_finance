import { prisma } from "@/lib/prisma";
import { authorizeHouseholdOperation } from "@/lib/household-authorization";
import { validateSameOriginJsonMutation } from "@/lib/csrf-protection";
import {
  ledgerApiError,
  ledgerPayload,
  ledgerResponseHeaders,
  manualRequestHash,
  parseManualLedgerInput,
} from "@/lib/ledger-entry";

type RouteContext = { params: Promise<{ householdId: string }> };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
const ledgerTypes = new Set(["INCOME", "EXPENSE", "REFUND"]);
const defaultPageSize = 25;
const maxPageSize = 100;
const maxPage = 10_000;

function parseCalendarDate(value: string): Date | null {
  if (!datePattern.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}

function singleQueryValue(searchParams: URLSearchParams, name: string): string | null | undefined {
  const values = searchParams.getAll(name);
  if (values.length > 1) return undefined;
  return values[0] ?? null;
}

export async function GET(request: Request, { params }: RouteContext) {
  const { householdId } = await params;
  const authorization = await authorizeHouseholdOperation(request, householdId, "read");
  if (!authorization.authorized) return authorization.response;

  const searchParams = new URL(request.url).searchParams;
  const allowedParams = new Set(["month", "from", "to", "type", "categoryId", "page", "pageSize", "archived"]);
  if ([...searchParams.keys()].some((key) => !allowedParams.has(key))) {
    return ledgerApiError(400, "VALIDATION_ERROR", "A lista nem támogatott szűrőt tartalmaz.");
  }

  const values = Object.fromEntries(
    [...allowedParams].map((key) => [key, singleQueryValue(searchParams, key)]),
  );
  if (Object.values(values).some((value) => value === undefined)) {
    return ledgerApiError(400, "VALIDATION_ERROR", "Egy szűrő csak egyszer adható meg.");
  }

  const month = values.month ?? null;
  const from = values.from ?? null;
  const to = values.to ?? null;
  const type = values.type ?? null;
  const categoryId = values.categoryId ?? null;
  const pageValue = values.page ?? null;
  const pageSizeValue = values.pageSize ?? null;
  const archivedValue = values.archived ?? null;

  if ([month, from, to, type].some((value) => value === "")) {
    return ledgerApiError(400, "VALIDATION_ERROR", "A megadott szűrőérték nem lehet üres.");
  }
  if (archivedValue !== null && archivedValue !== "true" && archivedValue !== "false") {
    return ledgerApiError(400, "VALIDATION_ERROR", "Az archived értéke true vagy false legyen.");
  }
  if (month && (!monthPattern.test(month) || from || to)) {
    return ledgerApiError(400, "VALIDATION_ERROR", "A month YYYY-MM formátumú legyen, és ne szerepeljen együtt dátumtartománnyal.");
  }
  if (from && !parseCalendarDate(from)) {
    return ledgerApiError(400, "VALIDATION_ERROR", "A from dátum ÉÉÉÉ-HH-NN formátumú legyen.");
  }
  if (to && !parseCalendarDate(to)) {
    return ledgerApiError(400, "VALIDATION_ERROR", "A to dátum ÉÉÉÉ-HH-NN formátumú legyen.");
  }
  if (from && to && from > to) {
    return ledgerApiError(400, "VALIDATION_ERROR", "A from dátum nem lehet későbbi a to dátumnál.");
  }
  if (type && !ledgerTypes.has(type)) {
    return ledgerApiError(400, "VALIDATION_ERROR", "Érvénytelen tételtípus.");
  }
  if (categoryId !== null && (categoryId.length === 0 || categoryId.length > 128)) {
    return ledgerApiError(400, "VALIDATION_ERROR", "Érvénytelen kategóriaazonosító.");
  }

  const page = pageValue === null ? 1 : /^\d+$/.test(pageValue) ? Number(pageValue) : NaN;
  const pageSize = pageSizeValue === null ? defaultPageSize : /^\d+$/.test(pageSizeValue) ? Number(pageSizeValue) : NaN;
  if (!Number.isSafeInteger(page) || page < 1 || page > maxPage) {
    return ledgerApiError(400, "VALIDATION_ERROR", `A page 1 és ${maxPage} közötti egész szám legyen.`);
  }
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > maxPageSize) {
    return ledgerApiError(400, "VALIDATION_ERROR", `A pageSize 1 és ${maxPageSize} közötti egész szám legyen.`);
  }

  // Keep date-only bounds in UTC to match Prisma's @db.Date representation.
  let occurredOn: { gte?: Date; lt?: Date; lte?: Date } | undefined;
  if (month) {
    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    occurredOn = { gte: start, lt: end };
  } else if (from || to) {
    occurredOn = {
      ...(from ? { gte: parseCalendarDate(from)! } : {}),
      ...(to ? { lte: parseCalendarDate(to)! } : {}),
    };
  }

  const where = {
    householdId: authorization.householdId,
    archivedAt: archivedValue === "true" ? { not: null } : null,
    ...(occurredOn ? { occurredOn } : {}),
    ...(type ? { type: type as "INCOME" | "EXPENSE" | "REFUND" } : {}),
    ...(categoryId ? { categoryId } : {}),
  };

  try {
    const [entries, totalItems] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where,
        orderBy: [{ occurredOn: "desc" }, { id: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.ledgerEntry.count({ where }),
    ]);

    return Response.json(
      {
        entries: entries.map(ledgerPayload),
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages: Math.ceil(totalItems / pageSize),
        },
      },
      { headers: ledgerResponseHeaders },
    );
  } catch {
    return ledgerApiError(500, "INTERNAL_ERROR", "A főkönyvi tételek most nem tölthetők be.");
  }
}

function isPrismaError(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

export async function POST(request: Request, { params }: RouteContext) {
  const { householdId } = await params;
  const authorization = await authorizeHouseholdOperation(request, householdId, "financial-write");
  if (!authorization.authorized) return authorization.response;
  const authorizedHouseholdId = authorization.householdId;
  const authorizedUserId = authorization.userId;

  const csrfError = validateSameOriginJsonMutation(request);
  if (csrfError) return csrfError;

  const keyHeader = request.headers.get("idempotency-key");
  if (!keyHeader || !uuidPattern.test(keyHeader)) {
    return ledgerApiError(400, "VALIDATION_ERROR", "Érvényes UUID Idempotency-Key fejléc szükséges.");
  }
  const sourceId = keyHeader.toLowerCase();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return ledgerApiError(400, "VALIDATION_ERROR", "A kérés törzse nem érvényes JSON.");
  }
  const parsed = parseManualLedgerInput(body);
  if (!parsed.valid) return ledgerApiError(400, "VALIDATION_ERROR", parsed.message);
  const input = parsed.input;
  const requestHash = manualRequestHash(authorizedHouseholdId, input);

  async function replayOrConflict() {
    const existing = await prisma.ledgerEntry.findUnique({
      where: { sourceType_sourceId: { sourceType: "MANUAL", sourceId } },
    });
    if (
      !existing ||
      existing.householdId !== authorizedHouseholdId ||
      existing.createdByUserId !== authorizedUserId ||
      existing.sourceRequestHash !== requestHash
    ) {
      return ledgerApiError(409, "CONFLICT", "Ez a beküldési azonosító már használatban van.");
    }
    return Response.json({ entry: ledgerPayload(existing) }, { headers: ledgerResponseHeaders });
  }

  try {
    const existing = await prisma.ledgerEntry.findUnique({
      where: { sourceType_sourceId: { sourceType: "MANUAL", sourceId } },
      select: { id: true },
    });
    if (existing) return replayOrConflict();

    const data = {
      householdId: authorizedHouseholdId,
      type: input.type,
      amount: input.amount,
      currency: "RON",
      occurredOn: input.occurredOnDate,
      categoryId: input.categoryId,
      note: input.note,
      createdByUserId: authorizedUserId,
      sourceType: "MANUAL" as const,
      sourceId,
      sourceRequestHash: requestHash,
    };

    if (input.categoryId) {
      const result = await prisma.$transaction(async (transaction) => {
        // Lock the active category until this entry is inserted. Archiving waits for this write.
        const category = await transaction.$queryRaw<Array<{ id: string }>>`
          SELECT "id" FROM "expense_category"
          WHERE "householdId" = ${authorizedHouseholdId}
            AND "id" = ${input.categoryId}
            AND "archivedAt" IS NULL
          FOR SHARE
        `;
        if (category.length === 0) return null;
        return transaction.ledgerEntry.create({ data });
      });
      if (!result) {
        return ledgerApiError(404, "NOT_FOUND", "A kategória nem található vagy már nem választható.");
      }
      return Response.json({ entry: ledgerPayload(result) }, { status: 201, headers: ledgerResponseHeaders });
    }

    const entry = await prisma.ledgerEntry.create({ data });
    return Response.json({ entry: ledgerPayload(entry) }, { status: 201, headers: ledgerResponseHeaders });
  } catch (error) {
    if (isPrismaError(error, "P2002")) return replayOrConflict();
    if (isPrismaError(error, "P2003")) {
      return ledgerApiError(404, "NOT_FOUND", "A háztartás vagy kategória nem található.");
    }
    return ledgerApiError(500, "INTERNAL_ERROR", "A tétel mentése nem sikerült.");
  }
}
