import Busboy from "busboy";
import { Readable, Transform, type TransformCallback } from "node:stream";
import { pipeline } from "node:stream/promises";

export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
export const MAX_MULTIPART_REQUEST_BYTES = MAX_DOCUMENT_BYTES + 64 * 1024;

const PREFIX_BYTES = 64 * 1024;
const TRAILER_BYTES = 2048;
const MAX_PREVIEW_IMAGE_DIMENSION = 12_000;
const MAX_PREVIEW_IMAGE_PIXELS = 24_000_000;
const MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

export type DocumentUploadMetadata = Readonly<{
  filename: string;
  declaredMimeType: string;
  detectedMimeType: string;
  byteSize: number;
}>;

export type DocumentUploadPart = Readonly<{
  filename: string;
  declaredMimeType: string;
  stream: Readable;
}>;

export type DocumentUploadConsumer<T> = (part: DocumentUploadPart) => T | Promise<T>;

export class DocumentUploadError extends Error {
  constructor(
    message: string,
    readonly code:
      | "INVALID_MULTIPART"
      | "REQUEST_TOO_LARGE"
      | "FILE_TOO_LARGE"
      | "INVALID_FILE"
      | "IMAGE_DIMENSIONS_TOO_LARGE"
      | "ABORTED",
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "DocumentUploadError";
  }
}

type SignatureResult = { detectedMimeType: string; byteSize: number };

function invalidMultipart(message: string, cause?: unknown): DocumentUploadError {
  return new DocumentUploadError(message, "INVALID_MULTIPART", { cause });
}

function extractBoundary(contentType: string | null): string {
  if (!contentType || !/^multipart\/form-data\s*;/i.test(contentType)) {
    throw invalidMultipart("Expected multipart/form-data.");
  }

  const parameters = contentType.split(";").slice(1);
  const boundaries: string[] = [];
  for (const parameter of parameters) {
    const match = /^\s*boundary\s*=\s*(?:"([^"\\]{1,70})"|([^\s;]{1,70}))\s*$/i.exec(parameter);
    if (match) boundaries.push(match[1] ?? match[2]);
  }

  if (boundaries.length !== 1 || !boundaries[0] || !/^[0-9A-Za-z'()+_,./:=?-]+$/.test(boundaries[0])) {
    throw invalidMultipart("Multipart boundary is missing or invalid.");
  }
  return boundaries[0];
}

type ImageDimensions = Readonly<{ width: number; height: number }>;

function isPngSignature(prefix: Buffer): boolean {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return prefix.length >= signature.length && prefix.subarray(0, signature.length).equals(signature);
}

function pngDimensions(prefix: Buffer, trailer: Buffer): ImageDimensions | null {
  const end = Buffer.from([0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
  if (
    !isPngSignature(prefix) ||
    prefix.length < 33 ||
    prefix.readUInt32BE(8) !== 13 ||
    prefix.toString("ascii", 12, 16) !== "IHDR" ||
    trailer.length < end.length ||
    !trailer.subarray(-end.length).equals(end)
  ) return null;
  return { width: prefix.readUInt32BE(16), height: prefix.readUInt32BE(20) };
}

function hasJpegStart(prefix: Buffer): boolean {
  return (
    prefix.length >= 3 &&
    prefix[0] === 0xff &&
    prefix[1] === 0xd8 &&
    prefix[2] === 0xff
  );
}

function hasJpegEnd(trailer: Buffer): boolean {
  return (
    trailer.length >= 2 &&
    trailer[trailer.length - 2] === 0xff &&
    trailer[trailer.length - 1] === 0xd9
  );
}

function isJpegStartOfFrame(marker: number): boolean {
  return (
    marker === 0xc0 || marker === 0xc1 || marker === 0xc2 || marker === 0xc3 ||
    marker === 0xc5 || marker === 0xc6 || marker === 0xc7 ||
    marker === 0xc9 || marker === 0xca || marker === 0xcb ||
    marker === 0xcd || marker === 0xce || marker === 0xcf
  );
}

function jpegDimensions(prefix: Buffer): ImageDimensions | null {
  if (!hasJpegStart(prefix)) return null;
  let offset = 2;

  while (offset < prefix.length) {
    if (prefix[offset] !== 0xff) return null;
    while (prefix[offset] === 0xff) offset += 1;
    if (offset >= prefix.length) return null;
    const marker = prefix[offset];
    offset += 1;

    if (marker === 0xda || marker === 0xd9 || marker === 0x00) return null;
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > prefix.length) return null;

    const segmentLength = prefix.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > prefix.length) return null;
    if (isJpegStartOfFrame(marker)) {
      if (segmentLength < 8) return null;
      const height = prefix.readUInt16BE(offset + 3);
      const width = prefix.readUInt16BE(offset + 5);
      const componentCount = prefix[offset + 7];
      if (componentCount < 1 || componentCount > 4 || segmentLength !== 8 + 3 * componentCount) return null;
      return { width, height };
    }
    offset += segmentLength;
  }
  return null;
}

function validatePreviewDimensions(dimensions: ImageDimensions): void {
  const { width, height } = dimensions;
  if (width < 1 || height < 1) {
    throw new DocumentUploadError("Image dimensions are missing or invalid.", "INVALID_FILE");
  }
  if (
    width > MAX_PREVIEW_IMAGE_DIMENSION ||
    height > MAX_PREVIEW_IMAGE_DIMENSION ||
    BigInt(width) * BigInt(height) > BigInt(MAX_PREVIEW_IMAGE_PIXELS)
  ) {
    throw new DocumentUploadError(
      "Image dimensions exceed the supported inline preview limit.",
      "IMAGE_DIMENSIONS_TOO_LARGE",
    );
  }
}

function isPdf(prefix: Buffer, trailer: Buffer): boolean {
  if (!prefix.subarray(0, 5).equals(Buffer.from("%PDF-"))) return false;
  return /%%EOF[\x00\x09\x0a\x0c\x0d\x20]*$/.test(trailer.toString("latin1"));
}

function detectIsoBmff(prefix: Buffer): string | null {
  if (prefix.length < 16 || prefix.toString("ascii", 4, 8) !== "ftyp") return null;
  const boxSize = prefix.readUInt32BE(0);
  if (boxSize < 16 || boxSize > PREFIX_BYTES || boxSize % 4 !== 0 || prefix.length < boxSize) return null;

  const majorBrand = prefix.toString("ascii", 8, 12);
  const compatibleBrands: string[] = [];
  for (let offset = 16; offset + 4 <= boxSize; offset += 4) {
    compatibleBrands.push(prefix.toString("ascii", offset, offset + 4));
  }

  const heicBrands = new Set(["heic", "heix", "hevc", "hevx"]);
  const heifBrands = new Set(["heif", "heis", "hevm", "hevs", "mif1", "msf1"]);
  if (heicBrands.has(majorBrand)) return "image/heic";
  if (heifBrands.has(majorBrand)) return "image/heif";

  const hasHeic = compatibleBrands.some((brand) => heicBrands.has(brand));
  const hasHeif = compatibleBrands.some((brand) => heifBrands.has(brand));
  if (hasHeic === hasHeif) return null;
  return hasHeic ? "image/heic" : "image/heif";
}

function detectMimeType(prefix: Buffer, trailer: Buffer): string | null {
  if (hasJpegStart(prefix) && hasJpegEnd(trailer)) {
    const dimensions = jpegDimensions(prefix);
    if (!dimensions) return null;
    validatePreviewDimensions(dimensions);
    return "image/jpeg";
  }
  if (isPngSignature(prefix)) {
    const dimensions = pngDimensions(prefix, trailer);
    if (!dimensions) return null;
    validatePreviewDimensions(dimensions);
    return "image/png";
  }
  if (isPdf(prefix, trailer)) return "application/pdf";
  return detectIsoBmff(prefix);
}

function createValidatingStream(declaredMimeType: string) {
  let byteSize = 0;
  let prefix = Buffer.alloc(0);
  let trailer = Buffer.alloc(0);
  let result: SignatureResult | undefined;

  const stream = new Transform({
    transform(chunk: Buffer | string, encoding: BufferEncoding, callback: TransformCallback) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding);
      byteSize += bytes.length;
      if (byteSize > MAX_DOCUMENT_BYTES) {
        callback(new DocumentUploadError("Uploaded file exceeds the 20 MiB limit.", "FILE_TOO_LARGE"));
        return;
      }

      if (prefix.length < PREFIX_BYTES) {
        prefix = Buffer.concat([prefix, bytes.subarray(0, PREFIX_BYTES - prefix.length)]);
      }
      trailer = Buffer.concat([trailer, bytes]);
      if (trailer.length > TRAILER_BYTES) trailer = trailer.subarray(trailer.length - TRAILER_BYTES);
      callback(null, bytes);
    },
    flush(callback: TransformCallback) {
      if (byteSize === 0) {
        callback(new DocumentUploadError("Uploaded file is empty.", "INVALID_FILE"));
        return;
      }
      const detectedMimeType = detectMimeType(prefix, trailer);
      if (!detectedMimeType || !MIME_TYPES.has(declaredMimeType) || detectedMimeType !== declaredMimeType) {
        callback(new DocumentUploadError("File signature does not match an allowed declared MIME type.", "INVALID_FILE"));
        return;
      }
      result = { detectedMimeType, byteSize };
      callback();
    },
  });

  return {
    stream,
    getResult(): SignatureResult {
      if (!result) throw new DocumentUploadError("File signature validation did not complete.", "INVALID_FILE");
      return result;
    },
  };
}

function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error("Multipart upload failed.", { cause: value });
}

/**
 * Parse a single streamed multipart file and hand its bounded stream to a consumer.
 * The consumer must fully consume the stream and reject if its sink fails; only after
 * parsing, signature validation, and consumer completion does this resolve.
 */
export async function parseDocumentUpload<T>(
  request: Request,
  consume: DocumentUploadConsumer<T>,
): Promise<{ result: T; metadata: DocumentUploadMetadata }> {
  const cancelUnreadBody = async () => {
    if (!request.body || request.body.locked) return;
    try {
      await request.body.cancel();
    } catch {
      // The server may already have closed the incoming body stream.
    }
  };

  try {
    extractBoundary(request.headers.get("content-type"));
  } catch (error) {
    await cancelUnreadBody();
    throw error;
  }
  if (!request.body) throw invalidMultipart("Multipart request body is missing.");
  if (request.signal.aborted) {
    await cancelUnreadBody();
    throw new DocumentUploadError("Upload was aborted.", "ABORTED");
  }

  const declaredLength = request.headers.get("content-length");
  if (declaredLength && /^\d+$/.test(declaredLength) && Number(declaredLength) > MAX_MULTIPART_REQUEST_BYTES) {
    await cancelUnreadBody();
    throw new DocumentUploadError("Multipart request exceeds the 20 MiB plus 64 KiB limit.", "REQUEST_TOO_LARGE");
  }

  let rawBytes = 0;
  const rawLimit = new Transform({
    transform(chunk: Buffer | string, encoding: BufferEncoding, callback: TransformCallback) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding);
      rawBytes += bytes.length;
      if (rawBytes > MAX_MULTIPART_REQUEST_BYTES) {
        callback(new DocumentUploadError("Multipart request exceeds the 20 MiB plus 64 KiB limit.", "REQUEST_TOO_LARGE"));
        return;
      }
      callback(null, bytes);
    },
  });

  let parser: ReturnType<typeof Busboy>;
  try {
    parser = Busboy({
      headers: { "content-type": request.headers.get("content-type") ?? "" },
      limits: {
        fieldNameSize: 64,
        fieldSize: 0,
        fields: 0,
        // Keep one byte above the application cap so an exact 20 MiB file is accepted.
        fileSize: MAX_DOCUMENT_BYTES + 1,
        files: 1,
        // Busboy emits partsLimit as soon as the configured number is seen. Use two
        // so the one permitted part is accepted and the second part is observable.
        parts: 2,
        headerPairs: 32,
      },
      preservePath: false,
      highWaterMark: 64 * 1024,
      fileHwm: 64 * 1024,
    });
  } catch (error) {
    throw invalidMultipart("Multipart boundary or headers are invalid.", error);
  }

  const body = Readable.fromWeb(request.body as import("node:stream/web").ReadableStream<Uint8Array>);
  let fileCount = 0;
  let partPromise: Promise<SignatureResult> | undefined;
  let consumerPromise: Promise<T> | undefined;
  let partMetadata: Pick<DocumentUploadMetadata, "filename" | "declaredMimeType"> | undefined;
  let firstFailure: Error | undefined;

  const fail = (error: unknown) => {
    if (firstFailure) return;
    firstFailure = asError(error);
    if (!body.destroyed) body.destroy(firstFailure);
    if (!rawLimit.destroyed) rawLimit.destroy(firstFailure);
    if (!parser.destroyed) parser.destroy(firstFailure);
  };

  parser.on("file", (fieldName, file, info) => {
    fileCount += 1;
    if (
      fileCount !== 1 ||
      fieldName !== "file" ||
      !info.filename ||
      Buffer.byteLength(info.filename, "utf8") > 255
    ) {
      file.resume();
      fail(invalidMultipart("Expected exactly one file part named 'file'."));
      return;
    }

    const declaredMimeType = info.mimeType.trim().toLowerCase();
    if (!MIME_TYPES.has(declaredMimeType)) {
      file.resume();
      fail(new DocumentUploadError("Declared MIME type is not supported.", "INVALID_FILE"));
      return;
    }

    partMetadata = { filename: info.filename, declaredMimeType };
    const validator = createValidatingStream(declaredMimeType);
    partPromise = pipeline(file, validator.stream).then(() => validator.getResult());
    // Attach a rejection handler immediately so a parser-side failure cannot leave an
    // unhandled rejection while the consumer is still setting up its private sink.
    void partPromise.catch(fail);
    try {
      consumerPromise = Promise.resolve(consume({
        filename: info.filename,
        declaredMimeType,
        stream: validator.stream,
      }));
      void consumerPromise.catch(fail);
    } catch (error) {
      fail(error);
    }
  });

  parser.on("field", () => fail(invalidMultipart("Multipart fields are not allowed.")));
  parser.on("fieldsLimit", () => fail(invalidMultipart("Multipart fields are not allowed.")));
  parser.on("filesLimit", () => fail(invalidMultipart("Only one file part is allowed.")));
  parser.on("partsLimit", () => fail(invalidMultipart("Only one multipart part is allowed.")));
  parser.on("error", (error) => fail(invalidMultipart("Multipart stream is malformed or truncated.", error)));

  const abort = () => fail(new DocumentUploadError("Upload was aborted.", "ABORTED"));
  request.signal.addEventListener("abort", abort, { once: true });

  try {
    await pipeline(body, rawLimit, parser);
    if (firstFailure) throw firstFailure;
    if (fileCount !== 1 || !partPromise || !consumerPromise || !partMetadata) {
      throw invalidMultipart("Expected exactly one file part named 'file'.");
    }

    const [signature, result] = await Promise.all([partPromise, consumerPromise]);
    return {
      result,
      metadata: { ...partMetadata, ...signature },
    };
  } catch (error) {
    fail(
      error instanceof DocumentUploadError
        ? error
        : invalidMultipart("Multipart stream is malformed or truncated.", error),
    );
    await Promise.allSettled([partPromise, consumerPromise].filter((promise) => promise !== undefined));
    throw firstFailure ?? asError(error);
  } finally {
    request.signal.removeEventListener("abort", abort);
  }
}
