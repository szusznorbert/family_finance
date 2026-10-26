import type { HouseholdRole } from "@/generated/prisma/enums";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type HouseholdOperation = "read" | "financial-write" | "manage";

export type HouseholdAuthorization =
  | {
      authorized: true;
      householdId: string;
      userId: string;
      role: HouseholdRole;
    }
  | { authorized: false; response: Response };

const rolesByOperation: Record<HouseholdOperation, readonly HouseholdRole[]> = {
  read: ["OWNER", "MEMBER", "VIEWER"],
  "financial-write": ["OWNER", "MEMBER"],
  manage: ["OWNER"],
};

function denied(status: number, code: string, message: string): HouseholdAuthorization {
  return {
    authorized: false,
    response: Response.json(
      { error: { code, message } },
      { status, headers: { "Cache-Control": "no-store" } },
    ),
  };
}

/** Resolve session and current membership for an ID-scoped household operation. */
export async function authorizeHouseholdOperation(
  request: Request,
  householdId: string,
  operation: HouseholdOperation,
): Promise<HouseholdAuthorization> {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return denied(401, "UNAUTHENTICATED", "Bejelentkezés szükséges.");
  }

  const membership = await prisma.householdMember.findUnique({
    where: {
      householdId_userId: {
        householdId,
        userId: session.user.id,
      },
    },
    select: { role: true },
  });

  if (!membership) {
    return denied(404, "NOT_FOUND", "A háztartás nem található.");
  }

  if (!rolesByOperation[operation].includes(membership.role)) {
    return denied(403, "FORBIDDEN", "Nincs jogosultság ehhez a művelethez.");
  }

  return {
    authorized: true,
    householdId,
    userId: session.user.id,
    role: membership.role,
  };
}
