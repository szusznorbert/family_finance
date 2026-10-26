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

/** Require browser mutations to come from the configured web origin and use JSON. */
export function validateSameOriginJsonMutation(request: Request): Response | null {
  const configuredWebOrigin = process.env.WEB_ORIGIN;
  const expectedOrigin = configuredWebOrigin ? parseHttpOrigin(configuredWebOrigin) : null;
  if (!expectedOrigin) {
    return apiError(500, "CONFIGURATION_ERROR", "A webalkalmazás eredete nincs megfelelően beállítva.");
  }

  const originHeader = request.headers.get("origin");
  const requestOrigin = originHeader ? parseHttpOrigin(originHeader) : null;
  if (!requestOrigin || originHeader !== requestOrigin.origin || requestOrigin.origin !== expectedOrigin.origin) {
    return apiError(403, "FORBIDDEN", "A kérés eredete nem engedélyezett.");
  }

  const contentType = request.headers.get("content-type");
  const mediaType = contentType?.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== "application/json") {
    return apiError(415, "UNSUPPORTED_MEDIA_TYPE", "A kérés Content-Type értéke application/json legyen.");
  }

  return null;
}
