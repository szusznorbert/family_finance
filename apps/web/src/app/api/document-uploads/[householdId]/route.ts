const MAX_MULTIPART_REQUEST_BYTES = 20 * 1024 * 1024 + 64 * 1024;

function tooLargeResponse() {
  return Response.json(
    { error: { code: "UPLOAD_TOO_LARGE", message: "A feltöltés meghaladja a megengedett méretet." } },
    { status: 413, headers: { "Cache-Control": "no-store" } },
  );
}

function forwardedResponse(response: Response) {
  const headers = new Headers({ "Cache-Control": "no-store" });
  for (const name of ["content-type", "retry-after"] as const) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(response.body, { status: response.status, headers });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ householdId: string }> },
) {
  const { householdId } = await params;
  const apiBase = process.env.API_INTERNAL_URL ?? "http://localhost:3001";
  const target = new URL(`/api/v1/households/${encodeURIComponent(householdId)}/documents`, apiBase);
  const headers = new Headers();
  for (const name of ["cookie", "origin", "content-type", "idempotency-key"] as const) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  let exceededLimit = false;
  const reader = request.body?.getReader();
  let byteCount = 0;
  const body = reader && new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      byteCount += value.byteLength;
      if (byteCount > MAX_MULTIPART_REQUEST_BYTES) {
        exceededLimit = true;
        await reader.cancel();
        controller.error(new Error("Multipart request exceeds size limit"));
        return;
      }
      controller.enqueue(value);
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });

  try {
    const response = await fetch(target, {
      method: "POST",
      headers,
      body: body || undefined,
      duplex: "half",
      cache: "no-store",
      signal: request.signal,
    } as RequestInit & { duplex: "half" });
    return forwardedResponse(response);
  } catch {
    if (exceededLimit) return tooLargeResponse();
    return Response.json(
      { error: { code: "UPLOAD_UNAVAILABLE", message: "A feltöltés most nem érhető el. Próbáld újra." } },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
