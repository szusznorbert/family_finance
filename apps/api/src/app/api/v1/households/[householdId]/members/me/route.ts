import { prisma } from "@/lib/prisma";
import { authorizeHouseholdOperation } from "@/lib/household-authorization";
import { validateSameOriginJsonMutation } from "@/lib/csrf-protection";
import {
  isObjectBody,
  isSerializableConflict,
  memberApiError,
  memberResponseHeaders,
  type MemberRouteContext,
} from "../_shared";

export async function DELETE(request: Request, { params }: MemberRouteContext) {
  const { householdId } = await params;
  const authorization = await authorizeHouseholdOperation(request, householdId, "read");
  if (!authorization.authorized) return authorization.response;

  const csrfError = validateSameOriginJsonMutation(request);
  if (csrfError) return csrfError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return memberApiError(400, "VALIDATION_ERROR", "A kérés törzse nem érvényes JSON.");
  }

  if (
    !isObjectBody(body) ||
    Object.keys(body).some((key) => key !== "transferToUserId")
  ) {
    return memberApiError(400, "VALIDATION_ERROR", "Érvénytelen kilépési adatok.");
  }

  const transferToUserId = body.transferToUserId;
  if (
    transferToUserId !== undefined &&
    (typeof transferToUserId !== "string" || transferToUserId.length === 0 || transferToUserId.length > 200)
  ) {
    return memberApiError(400, "VALIDATION_ERROR", "Válassz egy meglévő háztartástagot a tulajdonjog átvételéhez.");
  }
  if (transferToUserId === authorization.userId) {
    return memberApiError(400, "VALIDATION_ERROR", "A tulajdonjogot egy másik meglévő tagnak adhatod át.");
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const membership = await transaction.householdMember.findUnique({
        where: {
          householdId_userId: {
            householdId: authorization.householdId,
            userId: authorization.userId,
          },
        },
        select: { role: true },
      });
      if (!membership) return { kind: "MEMBERSHIP_MISSING" as const };
      if (transferToUserId !== undefined && membership.role !== "OWNER") {
        return { kind: "TRANSFER_NOT_ALLOWED" as const };
      }

      if (membership.role === "OWNER") {
        const ownerCount = await transaction.householdMember.count({
          where: { householdId: authorization.householdId, role: "OWNER" },
        });
        if (transferToUserId !== undefined && ownerCount !== 1) {
          return { kind: "TRANSFER_REQUIRES_SOLE_OWNER" as const };
        }
        if (ownerCount <= 1 && transferToUserId === undefined) {
          return { kind: "TRANSFER_REQUIRED" as const };
        }
      }

      let transferred = false;
      if (transferToUserId !== undefined) {
        const target = await transaction.householdMember.findUnique({
          where: {
            householdId_userId: {
              householdId: authorization.householdId,
              userId: transferToUserId,
            },
          },
          select: { role: true },
        });
        if (!target) return { kind: "TARGET_MISSING" as const };
        if (target.role === "OWNER") return { kind: "TARGET_ALREADY_OWNER" as const };

        await transaction.householdMember.update({
          where: {
            householdId_userId: {
              householdId: authorization.householdId,
              userId: transferToUserId,
            },
          },
          data: { role: "OWNER" },
        });
        await transaction.householdMemberAuditEvent.create({
          data: {
            householdId: authorization.householdId,
            actorUserId: authorization.userId,
            targetUserId: transferToUserId,
            action: "ROLE_CHANGED",
            previousRole: target.role,
            newRole: "OWNER",
          },
        });
        transferred = true;
      }

      await transaction.householdMember.delete({
        where: {
          householdId_userId: {
            householdId: authorization.householdId,
            userId: authorization.userId,
          },
        },
      });
      await transaction.householdMemberAuditEvent.create({
        data: {
          householdId: authorization.householdId,
          actorUserId: authorization.userId,
          targetUserId: authorization.userId,
          action: "MEMBER_LEFT",
          previousRole: membership.role,
        },
      });
      return { kind: "LEFT" as const, transferred };
    }, { isolationLevel: "Serializable" });

    if (result.kind === "MEMBERSHIP_MISSING") return memberApiError(404, "NOT_FOUND", "A háztartás nem található.");
    if (result.kind === "TRANSFER_NOT_ALLOWED") return memberApiError(403, "FORBIDDEN", "Tulajdonjogot csak tulajdonos adhat át.");
    if (result.kind === "TRANSFER_REQUIRED") return memberApiError(409, "OWNER_TRANSFER_REQUIRED", "Az egyetlen tulajdonos csak tulajdonjog átadásával léphet ki.");
    if (result.kind === "TRANSFER_REQUIRES_SOLE_OWNER") return memberApiError(409, "TRANSFER_REQUIRES_SOLE_OWNER", "Tulajdonjog átadása csak az egyetlen tulajdonos kilépésekor lehetséges.");
    if (result.kind === "TARGET_MISSING") return memberApiError(404, "NOT_FOUND", "A kiválasztott tag nem található ebben a háztartásban.");
    if (result.kind === "TARGET_ALREADY_OWNER") return memberApiError(409, "TARGET_ALREADY_OWNER", "A kiválasztott tag már tulajdonos.");

    return Response.json({ left: true, ownershipTransferred: result.transferred }, { headers: memberResponseHeaders });
  } catch (error) {
    if (isSerializableConflict(error)) {
      return memberApiError(409, "CONCURRENT_MEMBERSHIP_CHANGE", "Egy másik tagmódosítás közben megváltozott a háztartás. Frissítsd az oldalt, és próbáld újra.");
    }
    return memberApiError(500, "INTERNAL_ERROR", "A háztartásból való kilépés nem sikerült.");
  }
}
