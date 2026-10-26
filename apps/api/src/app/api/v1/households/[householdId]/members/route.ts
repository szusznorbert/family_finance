import { prisma } from "@/lib/prisma";
import { authorizeHouseholdOperation } from "@/lib/household-authorization";
import {
  memberApiError,
  memberResponseHeaders,
  type MemberRouteContext,
} from "./_shared";

export async function GET(request: Request, { params }: MemberRouteContext) {
  const { householdId } = await params;
  const authorization = await authorizeHouseholdOperation(request, householdId, "read");
  if (!authorization.authorized) return authorization.response;

  try {
    const members = await prisma.householdMember.findMany({
      where: { householdId: authorization.householdId },
      orderBy: [{ createdAt: "asc" }, { userId: "asc" }],
      select: {
        userId: true,
        role: true,
        user: { select: { name: true, email: true } },
      },
    });

    const isOwner = authorization.role === "OWNER";
    return Response.json(
      {
        members: members.map((member) => {
          const isSelf = member.userId === authorization.userId;
          return {
            ...(isOwner ? { userId: member.userId } : {}),
            name: member.user.name,
            role: member.role,
            email: isOwner || isSelf ? member.user.email : null,
            isSelf,
          };
        }),
      },
      { headers: memberResponseHeaders },
    );
  } catch {
    return memberApiError(500, "INTERNAL_ERROR", "A háztartás tagjai most nem tölthetők be.");
  }
}
