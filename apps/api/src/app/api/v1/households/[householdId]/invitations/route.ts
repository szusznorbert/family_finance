import { createHash, randomBytes } from "node:crypto";
import { isIP } from "node:net";
import { prisma } from "@/lib/prisma";
import { authorizeHouseholdOperation } from "@/lib/household-authorization";
import { validateSameOriginJsonMutation } from "@/lib/csrf-protection";

const responseHeaders = { "Cache-Control": "no-store" };
const invitationLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RouteContext = { params: Promise<{ householdId: string }> };

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

function isLoopbackHostname(hostname: string): boolean {
  const normalizedHostname = hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1).toLowerCase()
    : hostname.toLowerCase();

  if (normalizedHostname === "localhost" || normalizedHostname === "localhost.") {
    return true;
  }

  const ipVersion = isIP(normalizedHostname);
  return (
    (ipVersion === 4 && normalizedHostname === "127.0.0.1") ||
    (ipVersion === 6 && normalizedHostname === "::1")
  );
}

function parseInvitationWebOrigin(configuredOrigin: string | undefined): URL | null {
  if (!configuredOrigin || configuredOrigin !== configuredOrigin.trim()) return null;
  const origin = configuredOrigin;

  const match = /^https?:\/\/([^/?#\\\s]+)\/?$/i.exec(origin);
  if (!match || match[1].includes("@")) return null;

  try {
    const parsed = new URL(origin);
    if (
      (parsed.protocol !== "https:" && parsed.protocol !== "http:") ||
      parsed.username !== "" ||
      parsed.password !== "" ||
      parsed.pathname !== "/" ||
      parsed.search !== "" ||
      parsed.hash !== ""
    ) {
      return null;
    }

    if (parsed.protocol === "http:" && !isLoopbackHostname(parsed.hostname)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function GET(request: Request, { params }: RouteContext) {
  const { householdId } = await params;
  const authorization = await authorizeHouseholdOperation(request, householdId, "manage");
  if (!authorization.authorized) return authorization.response;

  const now = new Date();
  try {
    await prisma.householdInvitation.updateMany({
      where: {
        householdId: authorization.householdId,
        status: "PENDING",
        expiresAt: { lte: now },
      },
      data: { status: "EXPIRED" },
    });

    const invitations = await prisma.householdInvitation.findMany({
      where: { householdId: authorization.householdId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return Response.json({ invitations }, { headers: responseHeaders });
  } catch {
    return apiError(500, "INTERNAL_ERROR", "A meghívók most nem tölthetők be.");
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const { householdId } = await params;
  const authorization = await authorizeHouseholdOperation(request, householdId, "manage");
  if (!authorization.authorized) return authorization.response;

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
  if (Object.keys(input).some((key) => !["email", "role", "replaceExisting"].includes(key))) {
    return apiError(400, "VALIDATION_ERROR", "A kérés nem támogatott mezőt tartalmaz.");
  }

  if (typeof input.email !== "string") {
    return apiError(400, "VALIDATION_ERROR", "Adj meg egy e-mail-címet.");
  }
  const email = input.email.trim();
  if (email.length > 254 || !emailPattern.test(email)) {
    return apiError(400, "VALIDATION_ERROR", "Adj meg egy érvényes e-mail-címet.");
  }

  const role = input.role;
  if (role !== "MEMBER" && role !== "VIEWER") {
    return apiError(400, "VALIDATION_ERROR", "A meghívó szerepe MEMBER vagy VIEWER lehet.");
  }
  if (input.replaceExisting !== undefined && typeof input.replaceExisting !== "boolean") {
    return apiError(400, "VALIDATION_ERROR", "A replaceExisting mező logikai érték legyen.");
  }

  const normalizedEmail = email.toLowerCase();
  const replaceExisting = input.replaceExisting === true;
  const webOrigin = parseInvitationWebOrigin(process.env.WEB_ORIGIN);
  if (!webOrigin) {
    return apiError(500, "CONFIGURATION_ERROR", "A meghívólink alapcíme nincs biztonságosan beállítva.");
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + invitationLifetimeMs);
  const invitationUrl = new URL("/invitations/accept", webOrigin);
  invitationUrl.hash = new URLSearchParams({ token }).toString();

  try {
    const invitation = await prisma.$transaction(async (transaction) => {
      await transaction.householdInvitation.updateMany({
        where: {
          householdId: authorization.householdId,
          normalizedEmail,
          status: "PENDING",
          expiresAt: { lte: now },
        },
        data: { status: "EXPIRED" },
      });

      if (replaceExisting) {
        const revoked = await transaction.householdInvitation.updateMany({
          where: {
            householdId: authorization.householdId,
            normalizedEmail,
            status: "PENDING",
            expiresAt: { gt: now },
          },
          data: { status: "REVOKED" },
        });
        if (revoked.count === 0) throw new Error("NO_PENDING_INVITATION_TO_REPLACE");
      }

      return transaction.householdInvitation.create({
        data: {
          householdId: authorization.householdId,
          invitedByUserId: authorization.userId,
          email,
          normalizedEmail,
          role,
          tokenHash,
          expiresAt,
        },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          expiresAt: true,
          createdAt: true,
        },
      });
    });

    return Response.json(
      {
        invitation,
        invitationUrl: invitationUrl.toString(),
        warning: "A link birtokosa be tud lépni a háztartásba; a megadott e-mail-cím csak tájékoztató jellegű.",
      },
      { status: 201, headers: responseHeaders },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "NO_PENDING_INVITATION_TO_REPLACE") {
      return apiError(409, "NO_PENDING_INVITATION", "Nincs lecserélhető függő meghívó ehhez az e-mail-címhez.");
    }
    if (isUniqueViolation(error)) {
      return apiError(409, "INVITATION_ALREADY_PENDING", "Ehhez az e-mail-címhez már van függő meghívó. Cseréld le vagy vond vissza előbb.");
    }
    return apiError(500, "INTERNAL_ERROR", "A meghívó létrehozása nem sikerült.");
  }
}
