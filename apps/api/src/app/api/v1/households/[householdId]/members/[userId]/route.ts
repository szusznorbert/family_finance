import { prisma } from "@/lib/prisma";
import { authorizeHouseholdOperation } from "@/lib/household-authorization";
import { validateSameOriginJsonMutation } from "@/lib/csrf-protection";
import {
  isSerializableConflict,
  memberApiError,
  memberResponseHeaders,
  type TargetMemberRouteContext,
} from "../_shared";

export async function DELETE(request: Request, { params }: TargetMemberRouteContext) {
  const { householdId, userId: targetUserId } = await params;
  const authorization = await authorizeHouseholdOperation(request, householdId, "manage");
  if (!authorization.authorized) return authorization.response;

  const csrfError = validateSameOriginJsonMutation(request);
  if (csrfError) return csrfError;
  if (targetUserId === authorization.userId) {
    return memberApiError(409, "SELF_REMOVAL_NOT_ALLOWED", "A saját háztartásból való kilépéshez használd a kilépési műveletet.");
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const actor = await transaction.householdMember.findUnique({
        where: {
          householdId_userId: {
            householdId: authorization.householdId,
            userId: authorization.userId,
          },
        },
        select: { role: true },
      });
      if (!actor) return { kind: "ACTOR_MISSING" as const };
      if (actor.role !== "OWNER") return { kind: "ACTOR_FORBIDDEN" as const };

      const target = await transaction.householdMember.findUnique({
        where: {
          householdId_userId: {
            householdId: authorization.householdId,
            userId: targetUserId,
          },
        },
        select: { role: true },
      });
      if (!target) return { kind: "TARGET_MISSING" as const };

      if (target.role === "OWNER") {
        const ownerCount = await transaction.householdMember.count({
          where: { householdId: authorization.householdId, role: "OWNER" },
        });
        if (ownerCount <= 1) return { kind: "LAST_OWNER" as const };
      }

      await transaction.householdMember.delete({
        where: {
          householdId_userId: {
            householdId: authorization.householdId,
            userId: targetUserId,
          },
        },
      });
      await transaction.householdMemberAuditEvent.create({
        data: {
          householdId: authorization.householdId,
          actorUserId: authorization.userId,
          targetUserId,
          action: "MEMBER_REMOVED",
          previousRole: target.role,
        },
      });
      return { kind: "REMOVED" as const };
    }, { isolationLevel: "Serializable" });

    if (result.kind === "ACTOR_MISSING") return memberApiError(404, "NOT_FOUND", "A háztartás nem található.");
    if (result.kind === "ACTOR_FORBIDDEN") return memberApiError(403, "FORBIDDEN", "Nincs jogosultság ehhez a művelethez.");
    if (result.kind === "TARGET_MISSING") return memberApiError(404, "NOT_FOUND", "A háztartás tagja nem található.");
    if (result.kind === "LAST_OWNER") return memberApiError(409, "LAST_OWNER_REQUIRED", "A háztartásban legalább egy tulajdonosnak maradnia kell.");
    return Response.json({ removed: true }, { headers: memberResponseHeaders });
  } catch (error) {
    if (isSerializableConflict(error)) {
      return memberApiError(409, "CONCURRENT_MEMBERSHIP_CHANGE", "Egy másik tagmódosítás közben megváltozott a háztartás. Frissítsd az oldalt, és próbáld újra.");
    }
    return memberApiError(500, "INTERNAL_ERROR", "A tag eltávolítása nem sikerült.");
  }
}
