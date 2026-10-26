import { prisma } from "@/lib/prisma";
import { authorizeHouseholdOperation } from "@/lib/household-authorization";
import { validateSameOriginJsonMutation } from "@/lib/csrf-protection";

const responseHeaders = { "Cache-Control": "no-store" };
type RouteContext = { params: Promise<{ householdId: string; invitationId: string }> };

function apiError(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status, headers: responseHeaders });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const { householdId, invitationId } = await params;
  const authorization = await authorizeHouseholdOperation(request, householdId, "manage");
  if (!authorization.authorized) return authorization.response;

  const csrfError = validateSameOriginJsonMutation(request);
  if (csrfError) return csrfError;

  const now = new Date();
  try {
    const revoked = await prisma.householdInvitation.updateMany({
      where: {
        id: invitationId,
        householdId: authorization.householdId,
        status: "PENDING",
        expiresAt: { gt: now },
      },
      data: { status: "REVOKED" },
    });

    if (revoked.count === 1) {
      return Response.json({ revoked: true }, { headers: responseHeaders });
    }

    const invitation = await prisma.householdInvitation.findFirst({
      where: { id: invitationId, householdId: authorization.householdId },
      select: { status: true, expiresAt: true },
    });
    if (!invitation) return apiError(404, "NOT_FOUND", "A meghívó nem található.");

    if (invitation.status === "PENDING" && invitation.expiresAt <= now) {
      await prisma.householdInvitation.updateMany({
        where: { id: invitationId, householdId: authorization.householdId, status: "PENDING" },
        data: { status: "EXPIRED" },
      });
      return apiError(409, "INVITATION_EXPIRED", "A meghívó már lejárt.");
    }

    return apiError(409, "INVITATION_NOT_PENDING", "Csak függő meghívó vonható vissza.");
  } catch {
    return apiError(500, "INTERNAL_ERROR", "A meghívó visszavonása nem sikerült.");
  }
}
