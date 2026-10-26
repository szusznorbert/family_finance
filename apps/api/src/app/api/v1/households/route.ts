import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const responseHeaders = { "Cache-Control": "no-store" };

const defaultCategories = [
  "Élelmiszer és háztartási bevásárlás",
  "Lakhatás",
  "Rezsi és távközlés",
  "Közlekedés",
  "Egészség és gyógyszertár",
  "Ruházat és személyes ápolás",
  "Család és oktatás",
  "Étterem és szabadidő",
  "Egyéb",
] as const;

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
  const allowedKeys = new Set(["name", "currency"]);
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

  try {
    const household = await prisma.$transaction(async (transaction) => {
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
        data: defaultCategories.map((categoryName, sortOrder) => ({
          householdId: created.id,
          name: categoryName,
          sortOrder,
        })),
      });

      return transaction.household.findUniqueOrThrow({
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
            orderBy: { sortOrder: "asc" },
            select: { id: true, name: true, sortOrder: true },
          },
        },
      });
    });

    return Response.json(
      {
        household: {
          id: household.id,
          name: household.name,
          currency: household.currency,
          createdAt: household.createdAt,
          role: household.members[0]?.role ?? "OWNER",
          categories: household.categories,
        },
      },
      { status: 201, headers: responseHeaders },
    );
  } catch {
    return apiError(500, "INTERNAL_ERROR", "A háztartás létrehozása nem sikerült.");
  }
}
