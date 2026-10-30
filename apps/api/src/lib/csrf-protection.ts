import { networkInterfaces } from "node:os";

const responseHeaders = { "Cache-Control": "no-store" };

function apiError(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status, headers: responseHeaders });
}

function parseHttpOrigin(value: string): URL | null {
  try {
    const parsed = new URL(value);
    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      parsed.username !== "" ||
      parsed.password !== "" ||
      parsed.pathname !== "/" ||
      parsed.search !== "" ||
      parsed.hash !== ""
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Check the configured browser origin before any mutation reads its request body. */
export function validateSameOriginMutation(request: Request): Response | null {
  const configuredWebOrigin = process.env.WEB_ORIGIN;
  const expectedOrigin = configuredWebOrigin ? parseHttpOrigin(configuredWebOrigin) : null;
  if (!expectedOrigin) {
    return apiError(500, "CONFIGURATION_ERROR", "A webalkalmazás eredete nincs megfelelően beállítva.");
  }

  const originHeader = request.headers.get("origin");
  const requestOrigin = originHeader ? parseHttpOrigin(originHeader) : null;
  const allowedOrigins = new Set([expectedOrigin.origin]);
  if (process.env.NODE_ENV === "development") {
    for (const addresses of Object.values(networkInterfaces())) {
      for (const address of addresses ?? []) {
        if (address.family !== "IPv4" || address.internal) continue;
        const octets = address.address.split(".").map(Number);
        if (
          octets.length !== 4 ||
          octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
        ) continue;
        const [first, second] = octets;
        const isPrivate =
          first === 10 ||
          (first === 172 && second >= 16 && second <= 31) ||
          (first === 192 && second === 168);
        if (isPrivate) allowedOrigins.add(`http://${address.address}:3000`);
      }
    }
  }

  if (
    !requestOrigin ||
    originHeader !== requestOrigin.origin ||
    !allowedOrigins.has(requestOrigin.origin)
  ) {
    return apiError(403, "FORBIDDEN", "A kérés eredete nem engedélyezett.");
  }

  return null;
}

function mediaType(request: Request): string | undefined {
  const contentType = request.headers.get("content-type");
  return contentType?.split(";", 1)[0]?.trim().toLowerCase();
}

/** Keep the existing JSON-only mutation rule for current API endpoints. */
export function validateSameOriginJsonMutation(request: Request): Response | null {
  const originError = validateSameOriginMutation(request);
  if (originError) return originError;

  if (mediaType(request) !== "application/json") {
    return apiError(415, "UNSUPPORTED_MEDIA_TYPE", "A kérés Content-Type értéke application/json legyen.");
  }

  return null;
}

/** Multipart uploads share the same exact origin policy, with their own media type. */
export function validateSameOriginMultipartMutation(request: Request): Response | null {
  const originError = validateSameOriginMutation(request);
  if (originError) return originError;

  if (mediaType(request) !== "multipart/form-data") {
    return apiError(415, "UNSUPPORTED_MEDIA_TYPE", "A kérés Content-Type értéke multipart/form-data legyen.");
  }

  return null;
}
