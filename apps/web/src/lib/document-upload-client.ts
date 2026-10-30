export type UploadSelection = {
  file: File;
  mimeType: string;
  key: string;
  error: string | null;
  originalByteSize: number;
};
export type SavedDocument = { id: string; displayName: string; duplicate: boolean };

const maxFileBytes = 20 * 1024 * 1024;
const compressedImageBytes = 500 * 1024;
const maxImageEdge = 2400;
const readableJpegQuality = 0.82;
const preferredJpegQuality = 0.86;
const minReadableImageEdge = 1800;
const imageTypes = new Set(["image/jpeg", "image/png", "image/heic", "image/heif"]);
const fileTypes = new Set([...imageTypes, "application/pdf"]);

export const documentTypeNames: Record<string, string> = {
  "image/jpeg": "JPEG-kép",
  "image/png": "PNG-kép",
  "image/heic": "HEIC-kép",
  "image/heif": "HEIF-kép",
  "application/pdf": "PDF",
};

export function newUploadIntentId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function effectiveMimeType(file: File) {
  const declared = file.type.toLowerCase();
  if (fileTypes.has(declared)) return declared;
  if (declared) return declared;
  const extension = file.name.split(".").pop()?.toLowerCase();
  const byExtension: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    heic: "image/heic", heif: "image/heif", pdf: "application/pdf",
  };
  return extension ? byExtension[extension] ?? "" : "";
}

export function selectionError(file: File, mimeType: string) {
  if (!file.size) return "A fájl üres. Válassz másik képet vagy PDF-et.";
  if (file.size > maxFileBytes) return "A fájl nagyobb mint 20 MiB. Válassz kisebb képet vagy PDF-et.";
  if (!fileTypes.has(mimeType)) return "JPEG, PNG, HEIC, HEIF kép vagy PDF választható.";
  return null;
}

function interrupted(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException("A kép előkészítése megszakadt.", "AbortError");
}

function compressedName(original: string, extension: "png" | "jpg") {
  const stem = original.replace(/\.[^.]+$/, "").replace(/[\p{C}/\\]/gu, "").trim();
  const encoder = new TextEncoder();
  let safeStem = "";
  for (const character of stem) {
    if (encoder.encode(safeStem + character).byteLength > 180) break;
    safeStem += character;
  }
  return `${safeStem || "foto"}-kicsinyitett.${extension}`;
}

async function compressImage(file: File, mimeType: string, signal: AbortSignal): Promise<File> {
  interrupted(signal);
  const { compress } = await import("compresso.js");
  interrupted(signal);
  const options = {
    format: "jpeg" as const,
    maxWidth: maxImageEdge,
    maxHeight: maxImageEdge,
    maxInputPixels: 50_000_000,
    backgroundColor: "#ffffff",
    signal,
  };
  async function encode(quality: number, maxSizeMB?: number) {
    const result = await compress(file, maxSizeMB === undefined
      ? { ...options, quality }
      : { ...options, quality, maxSizeMB });
    // The package creates a preview URL even when this upload UI does not use one.
    URL.revokeObjectURL(result.url);
    interrupted(signal);
    return result;
  }

  try {
    // First encode at a readable quality. A size search is useful only when
    // this version already fits the target; it must not lower text quality to
    // force an arbitrary byte limit.
    const readable = await encode(readableJpegQuality);
    if (readable.mimeType !== "image/jpeg" || readable.file.type !== "image/jpeg" ||
      readable.file.size >= file.size || readable.file.size > maxFileBytes) return file;
    const readableFile = new File([readable.file], compressedName(file.name, "jpg"), {
      type: "image/jpeg", lastModified: file.lastModified,
    });
    if (readableFile.size > compressedImageBytes) return readableFile;

    try {
      const preferred = await encode(preferredJpegQuality, compressedImageBytes / (1024 * 1024));
      const originalEdge = Math.max(preferred.originalWidth, preferred.originalHeight);
      const outputEdge = Math.max(preferred.width, preferred.height);
      if (preferred.mimeType === "image/jpeg" && preferred.file.type === "image/jpeg" &&
        preferred.file.size <= compressedImageBytes &&
        outputEdge >= Math.min(originalEdge, minReadableImageEdge)) {
        return new File([preferred.file], compressedName(file.name, "jpg"), {
          type: "image/jpeg", lastModified: file.lastModified,
        });
      }
    } catch {
      interrupted(signal);
      // The readable first pass remains usable if the optional size search fails.
    }
    return readableFile;
  } catch (error) {
    interrupted(signal);
    if (error && typeof error === "object" && "kind" in error && error.kind === "too-large") {
      throw new Error("A kép felbontása túl nagy a biztonságos előkészítéshez. Készíts új fotót kisebb felbontással.");
    }
    throw new Error(mimeType === "image/heic" || mimeType === "image/heif"
      ? "Ezt a HEIC/HEIF képet a böngésző nem tudja előkészíteni. Válassz JPEG/PNG képet vagy PDF-et."
      : "A képet nem sikerült előkészíteni. Válassz másik képet vagy PDF-et.");
  }
}

export async function prepareUploadSelection(file: File, signal: AbortSignal): Promise<UploadSelection> {
  const mimeType = effectiveMimeType(file);
  const error = selectionError(file, mimeType);
  const base = { file, mimeType, key: newUploadIntentId(), originalByteSize: file.size };
  if (error || mimeType === "application/pdf" || file.size <= compressedImageBytes) {
    return { ...base, error };
  }
  try {
    const compressed = await compressImage(file, mimeType, signal);
    interrupted(signal);
    return { ...base, file: compressed, mimeType: compressed.type, error: null };
  } catch (compressionError) {
    interrupted(signal);
    return {
      ...base,
      error: compressionError instanceof Error ? compressionError.message : "A képet nem sikerült tömöríteni. Válassz másik képet vagy PDF-et.",
    };
  }
}

export function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const unit = bytes < 1024 * 1024 ? "KiB" : "MiB";
  const amount = unit === "KiB" ? bytes / 1024 : bytes / (1024 * 1024);
  return `${new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 1 }).format(amount)} ${unit}`;
}

function uploadErrorCode(payload: unknown) {
  const error = payload && typeof payload === "object" ? (payload as Record<string, unknown>).error : null;
  return error && typeof error === "object" ? (error as Record<string, unknown>).code : null;
}

function uploadError(status: number, payload: unknown) {
  const code = uploadErrorCode(payload);
  if (status === 400) return "A fájl nem fogadható el. Ellenőrizd, hogy nem üres, és valódi JPEG, PNG, HEIC, HEIF kép vagy PDF-e.";
  if (status === 401) return "A munkamenet lejárt. Jelentkezz be, majd próbáld újra.";
  if (status === 403) return "Ebben a háztartásban nincs feltöltési jogosultságod.";
  if (status === 404) return "A kiválasztott háztartás már nem érhető el. Lépj vissza az Áttekintésre.";
  if (status === 409) return code === "UPLOAD_IN_PROGRESS"
    ? "Ez a feltöltés még folyamatban lehet. Várj egy kicsit, majd próbáld újra ugyanazzal a fájllal."
    : "Ez a mentési próbálkozás ütközött. Válaszd ki újra a fájlt egy új próbálkozáshoz.";
  if (status === 413) return "A szerver szerint a feltöltés túl nagy. A fájl legfeljebb 20 MiB lehet.";
  if (status === 429) return "Túl sok feltöltési kísérlet történt. Várj egy kicsit, majd próbáld újra.";
  if (status >= 500) return "A szerver most nem tudta menteni a dokumentumot. Próbáld újra ugyanazzal a fájllal.";
  return "A dokumentumot nem sikerült menteni. Ellenőrizd a fájlt és a jogosultságodat, majd próbáld újra.";
}

function isSavedDocument(value: unknown): value is SavedDocument {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && item.id.length > 0 &&
    typeof item.displayName === "string" && item.displayName.length > 0;
}

export class UploadFailure extends Error {
  constructor(message: string, readonly requiresNewSelection = false) {
    super(message);
    this.name = "UploadFailure";
  }
}

export async function uploadDocument(householdId: string, selection: UploadSelection, signal: AbortSignal): Promise<SavedDocument> {
  const form = new FormData();
  const file = selection.file.type.toLowerCase() === selection.mimeType
    ? selection.file
    : new File([selection.file], selection.file.name, { type: selection.mimeType, lastModified: selection.file.lastModified });
  form.append("file", file);

  let response: Response;
  try {
    response = await fetch(`/api/document-uploads/${encodeURIComponent(householdId)}`, {
      method: "POST", credentials: "same-origin", signal,
      headers: { "Idempotency-Key": selection.key }, body: form,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new UploadFailure("A kapcsolat megszakadt. Próbáld újra ugyanazzal a fájllal.");
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new UploadFailure(
      uploadError(response.status, payload),
      response.status === 409 && uploadErrorCode(payload) !== "UPLOAD_IN_PROGRESS",
    );
  }
  const document = payload && typeof payload === "object" ? (payload as Record<string, unknown>).document : null;
  if ((response.status !== 200 && response.status !== 201) || !isSavedDocument(document)) {
    throw new UploadFailure("A mentés válasza nem olvasható. Próbáld újra ugyanazzal a fájllal.");
  }
  const duplicate = payload && typeof payload === "object" ? (payload as Record<string, unknown>).duplicate : undefined;
  if (duplicate !== undefined && typeof duplicate !== "boolean") {
    throw new UploadFailure("A mentés válasza nem olvasható. Próbáld újra ugyanazzal a fájllal.");
  }
  return { ...document, duplicate: duplicate === true };
}
