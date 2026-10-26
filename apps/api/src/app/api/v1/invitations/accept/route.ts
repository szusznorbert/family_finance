import { createHash } from "node:crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateSameOriginJsonMutation } from "@/lib/csrf-protection";

const responseHeaders = { "Cache-Control": "no-store" };
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;

function apiError(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status, headers: responseHeaders });
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

type RedemptionResult =
  | {
      accepted: true;
      household: { id: string; name: string; currency: string };
      role: "MEMBER" | "VIEWER";
    }
  | { accepted: false; reason: "already_member" | "unavailable" };

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return apiError(401, "UNAUTHENTICATED", "Bejelentkezés szükséges a meghívó elfogadásához.");
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
    return apiError(400, "VALIDATION_ERROR", "Érvénytelen meghívóadatok.");
  }

  const input = body as Record<string, unknown>;
  if (Object.keys(input).length !== 1 || typeof input.token !== "string" || !tokenPattern.test(input.token)) {
    return apiError(400, "VALIDATION_ERROR", "A meghívólink formátuma érvénytelen.");
  }

  const tokenHash = createHash("sha256").update(input.token).digest("hex");
  const now = new Date();

  try {
    const result = await prisma.$transaction(async (transaction): Promise<RedemptionResult> => {
      const invitation = await transaction.householdInvitation.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          householdId: true,
          role: true,
          status: true,
          expiresAt: true,
          household: { select: { id: true, name: true, currency: true } },
        },
      });

      if (!invitation || invitation.status !== "PENDING") {
        return { accepted: false, reason: "unavailable" };
      }

      if (invitation.expiresAt <= now) {
        await transaction.householdInvitation.updateMany({
          where: { id: invitation.id, status: "PENDING", expiresAt: { lte: now } },
          data: { status: "EXPIRED" },
        });
        return { accepted: false, reason: "unavailable" };
      }

      if (invitation.role !== "MEMBER" && invitation.role !== "VIEWER") {
        return { accepted: false, reason: "unavailable" };
      }

      const existingMembership = await transaction.householdMember.findUnique({
        where: {
          householdId_userId: {
            householdId: invitation.householdId,
            userId: session.user.id,
          },
        },
        select: { role: true },
      });

      if (existingMembership) {
        return { accepted: false, reason: "already_member" };
      }

      const claimed = await transaction.householdInvitation.updateMany({
        where: {
          id: invitation.id,
          status: "PENDING",
          expiresAt: { gt: now },
        },
        data: { status: "ACCEPTED" },
      });

      if (claimed.count !== 1) {
        return { accepted: false, reason: "unavailable" };
      }

      await transaction.householdMember.create({
        data: {
          householdId: invitation.householdId,
          userId: session.user.id,
          role: invitation.role,
        },
      });

      return {
        accepted: true,
        household: invitation.household,
        role: invitation.role,
      };
    });

    if (!result.accepted) {
      if (result.reason === "already_member") {
        return apiError(
          409,
          "ALREADY_HOUSEHOLD_MEMBER",
          "Már tagja vagy ennek a háztartásnak. A meghívó felhasználható marad egy másik tag számára.",
        );
      }

      return apiError(
        410,
        "INVITATION_UNAVAILABLE",
        "Ez a meghívó érvénytelen, lejárt, visszavont vagy már felhasznált.",
      );
    }

    return Response.json(
      {
        household: {
          ...result.household,
          role: result.role,
        },
      },
      { status: 201, headers: responseHeaders },
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      return apiError(
        409,
        "ALREADY_HOUSEHOLD_MEMBER",
        "Már tagja vagy ennek a háztartásnak. A meghívó felhasználható marad egy másik tag számára.",
      );
    }

    return apiError(500, "INTERNAL_ERROR", "A meghívó elfogadása nem sikerült.");
  }
}
