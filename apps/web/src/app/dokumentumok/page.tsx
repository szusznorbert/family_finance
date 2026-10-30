"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CompressResult } from "compresso.js";
import { authClient } from "@/lib/auth-client";
import AppShell from "../app-shell";
import styles from "./document-library.module.css";

type Household = { id: string; name: string; currency: "RON"; role: "OWNER" | "MEMBER" | "VIEWER" };
type DocumentItem = {
  id: string;
  displayName: string;
  detectedMimeType: "image/jpeg" | "image/png" | "image/heic" | "image/heif" | "application/pdf";
  byteSize: number;
  createdAt: string;
};
type DocumentPage = { documents: DocumentItem[]; pagination: { pageSize: number; nextCursor: string | null } };
type HouseholdState = { userId: string; items: Household[]; selectedId: string; error: string | null };
type ListState = {
  key: string;
  documents: DocumentItem[];
  nextCursor: string | null;
  loading: boolean;
  initialized: boolean;
  error?: string;
};
type PreviewState = { id: string; kind: "loading" | "ready" | "error"; url?: string; error?: string };

const selectionKey = "household-selection:v1";
const pageSize = 25;
const listRequestTimeoutMs = 30_000;
const maxFileBytes = 20 * 1024 * 1024;
const imagePreviewTypes = new Set(["image/jpeg", "image/png", "image/heic", "image/heif"]);
const documentTypes = new Set([...imagePreviewTypes, "application/pdf"]);
const typeLabels: Record<DocumentItem["detectedMimeType"], string> = {
  "image/jpeg": "JPEG-kép",
  "image/png": "PNG-kép",
  "image/heic": "HEIC-kép",
  "image/heif": "HEIF-kép",
  "application/pdf": "PDF",
};

function isHousehold(value: unknown): value is Household {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.name === "string" && item.currency === "RON" &&
    (item.role === "OWNER" || item.role === "MEMBER" || item.role === "VIEWER");
}

function isDocument(value: unknown): value is DocumentItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(item.id) &&
    typeof item.displayName === "string" && item.displayName.length > 0 && item.displayName.length <= 255 &&
    typeof item.detectedMimeType === "string" && documentTypes.has(item.detectedMimeType) &&
    typeof item.byteSize === "number" && Number.isSafeInteger(item.byteSize) && item.byteSize >= 0 && item.byteSize <= maxFileBytes &&
    typeof item.createdAt === "string" && Number.isFinite(Date.parse(item.createdAt));
}

function isDocumentPage(value: unknown): value is DocumentPage {
  if (!value || typeof value !== "object") return false;
  const page = value as Record<string, unknown>;
  const pagination = page.pagination;
  return Array.isArray(page.documents) && page.documents.length <= pageSize && page.documents.every(isDocument) &&
    Boolean(pagination && typeof pagination === "object" &&
      (pagination as Record<string, unknown>).pageSize === pageSize &&
      ((pagination as Record<string, unknown>).nextCursor === null ||
        (typeof (pagination as Record<string, unknown>).nextCursor === "string" &&
          /^[A-Za-z0-9_-]{1,512}$/.test((pagination as Record<string, string>).nextCursor))));
}

function preferredHouseholdId() {
  try { return window.localStorage.getItem(selectionKey); } catch { return null; }
}

function rememberHouseholdId(id: string) {
  try { window.localStorage.setItem(selectionKey, id); } catch { /* The current visit still works. */ }
}

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const unit = bytes < 1024 * 1024 ? "KiB" : "MiB";
  const amount = unit === "KiB" ? bytes / 1024 : bytes / (1024 * 1024);
  return `${new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 1 }).format(amount)} ${unit}`;
}

function uploadDate(value: string) {
  return new Intl.DateTimeFormat("hu-HU", {
    year: "numeric", month: "short", day: "numeric", timeZone: "Europe/Bucharest",
  }).format(new Date(value));
}

function contentHref(householdId: string, documentId: string) {
  return `/api/v1/households/${encodeURIComponent(householdId)}/documents/${encodeURIComponent(documentId)}/content`;
}

function metadataHref(householdId: string, documentId: string) {
  return `/api/v1/households/${encodeURIComponent(householdId)}/documents/${encodeURIComponent(documentId)}`;
}

function readError(status: number, fallback: string) {
  if (status === 401) return "A munkamenet lejárt. Jelentkezz be újra.";
  if (status === 403) return "Nincs jogosultságod a dokumentum megtekintéséhez.";
  if (status === 404) return "A háztartás vagy a dokumentum már nem érhető el.";
  if (status >= 500) return "A dokumentumok most nem tölthetők be. Próbáld újra.";
  return fallback;
}

async function fetchValidatedImage(householdId: string, document: DocumentItem, signal: AbortSignal) {
  const response = await fetch(contentHref(householdId, document.id), {
    cache: "no-store", credentials: "same-origin", signal,
  });
  if (!response.ok) throw new Error(readError(response.status, "A kép most nem tölthető be."));
  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  const disposition = response.headers.get("content-disposition");
  const length = Number(response.headers.get("content-length"));
  if (!contentType || !imagePreviewTypes.has(contentType) || contentType !== document.detectedMimeType ||
    !disposition || !/^attachment(?:;|$)/i.test(disposition) ||
    !Number.isSafeInteger(length) || length < 1 || length !== document.byteSize || length > maxFileBytes) {
    throw new Error("A kép formátuma nem ellenőrizhető. Az előnézet nem nyitható meg.");
  }
  const blob = await response.blob();
  if (blob.type !== contentType || blob.size !== document.byteSize || blob.size > maxFileBytes) {
    throw new Error("A kép tartalma nem egyezik a dokumentum adataival.");
  }
  return blob;
}

let activeThumbnailJobs = 0;
const thumbnailQueue: Array<() => void> = [];

function pumpThumbnailQueue() {
  while (activeThumbnailJobs < 2 && thumbnailQueue.length) thumbnailQueue.shift()?.();
}

function withThumbnailSlot<T>(signal: AbortSignal, job: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const abortError = () => new DOMException("Bélyegkép betöltése megszakadt.", "AbortError");
    const start = () => {
      signal.removeEventListener("abort", onAbort);
      if (signal.aborted) { reject(abortError()); return; }
      activeThumbnailJobs += 1;
      void job().then(resolve, reject).finally(() => {
        activeThumbnailJobs -= 1;
        pumpThumbnailQueue();
      });
    };
    const onAbort = () => {
      const index = thumbnailQueue.indexOf(start);
      if (index >= 0) thumbnailQueue.splice(index, 1);
      reject(abortError());
    };
    signal.addEventListener("abort", onAbort, { once: true });
    thumbnailQueue.push(start);
    pumpThumbnailQueue();
  });
}

async function imageDisplayUrl(blob: Blob, document: DocumentItem, signal: AbortSignal, thumbnail: boolean) {
  if (!thumbnail && (document.detectedMimeType === "image/jpeg" || document.detectedMimeType === "image/png")) {
    return URL.createObjectURL(blob);
  }
  const { compress } = await import("compresso.js");
  if (signal.aborted) throw new DOMException("Kép betöltése megszakadt.", "AbortError");
  let result: CompressResult;
  try {
    result = await compress(blob, {
      format: "jpeg", maxWidth: thumbnail ? 64 : 1600, maxHeight: thumbnail ? 64 : 1600,
      quality: thumbnail ? 0.75 : 0.86, maxInputPixels: 24_000_000, signal,
    });
  } catch {
    if (signal.aborted) throw new DOMException("Kép betöltése megszakadt.", "AbortError");
    throw new Error("A kép előnézete ezen az eszközön nem készíthető el. Az eredeti fájl letölthető.");
  }
  if (signal.aborted || result.mimeType !== "image/jpeg" || result.file.type !== "image/jpeg") {
    URL.revokeObjectURL(result.url);
    throw new Error("A kép előnézete ezen az eszközön nem készíthető el.");
  }
  return result.url;
}

function FileGlyph({ pdf }: { pdf: boolean }) {
  return (
    <svg aria-hidden="true" fill="none" height="28" viewBox="0 0 24 24" width="28">
      <path d="M6 2.75h8l4 4V21.25H6a2 2 0 0 1-2-2V4.75a2 2 0 0 1 2-2Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
      <path d="M14 2.75v4h4" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
      {pdf ? <path d="M7.5 15.5h9M7.5 18h6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" /> :
        <><circle cx="9" cy="11" fill="currentColor" r="1.2" /><path d="m7 17 3.4-3.5 2.2 2.1 1.5-1.4 2.9 2.8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" /></>}
    </svg>
  );
}

function DocumentThumbnail({ document, householdId }: { document: DocumentItem; householdId: string }) {
  const elementRef = useRef<HTMLSpanElement>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    let controller: AbortController | null = null;
    let currentUrl: string | null = null;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        if (controller || currentUrl) return;
        const pending = new AbortController();
        controller = pending;
        void withThumbnailSlot(pending.signal, async () => {
          const blob = await fetchValidatedImage(householdId, document, pending.signal);
          if (pending.signal.aborted) throw new DOMException("Bélyegkép betöltése megszakadt.", "AbortError");
          return imageDisplayUrl(blob, document, pending.signal, true);
        }).then((newUrl) => {
          if (pending.signal.aborted) { URL.revokeObjectURL(newUrl); return; }
          currentUrl = newUrl;
          setUrl(newUrl);
        }).catch(() => { /* The file icon remains available; full preview has its own error state. */ })
          .finally(() => { if (controller === pending) controller = null; });
      } else {
        controller?.abort();
        controller = null;
        if (currentUrl) URL.revokeObjectURL(currentUrl);
        currentUrl = null;
        setUrl(null);
      }
    }, { threshold: 0.01 });
    observer.observe(element);
    return () => {
      observer.disconnect();
      controller?.abort();
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [document, householdId]);

  return <span aria-hidden="true" className={styles.thumbnail} ref={elementRef}>
    {url ? (
      // Authenticated content is reduced to a short-lived local JPEG URL.
      // eslint-disable-next-line @next/next/no-img-element
      <img alt="" height="56" loading="lazy" src={url} width="56" />
    ) : <FileGlyph pdf={false} />}
  </span>;
}

export default function DocumentLibraryPage() {
  const { bfcacheId } = useRouter();
  return <DocumentLibraryContent key={bfcacheId} />;
}

function DocumentLibraryContent() {
  const { data: session, isPending: sessionPending, error: sessionError, refetch } = authClient.useSession();
  const userId = session?.user?.id;
  const [householdState, setHouseholdState] = useState<HouseholdState | null>(null);
  const [householdRetry, setHouseholdRetry] = useState(0);
  const [requestCursor, setRequestCursor] = useState<string | null>(null);
  const [listRetry, setListRetry] = useState(0);
  const [listState, setListState] = useState<ListState | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [requestedDocumentId, setRequestedDocumentId] = useState<string | null>(null);
  const previewController = useRef<AbortController | null>(null);
  const previewUrl = useRef<string | null>(null);
  const previewEpoch = useRef(0);
  const requestedDocumentKey = useRef<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const clearPreview = useCallback(() => {
    previewEpoch.current += 1;
    previewController.current?.abort();
    previewController.current = null;
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
    setPreview(null);
  }, []);

  const currentHouseholdState = householdState && householdState.userId === userId ? householdState : null;
  const selectedHouseholdId = currentHouseholdState?.selectedId ?? "";
  const households = currentHouseholdState?.items ?? [];
  const selectedHousehold = households.find((item) => item.id === selectedHouseholdId);
  const listKey = userId && selectedHouseholdId ? `${userId}:${selectedHouseholdId}` : "";
  const currentList = listState?.key === listKey ? listState : null;

  const changeHousehold = useCallback((id: string) => {
    if (!householdState || id === householdState.selectedId || !householdState.items.some((item) => item.id === id)) return;
    clearPreview();
    setRequestCursor(null);
    setListRetry(0);
    setListState(null);
    setHouseholdState({ ...householdState, selectedId: id });
    rememberHouseholdId(id);
  }, [clearPreview, householdState]);

  useEffect(() => {
    if (sessionPending || sessionError || !userId) return;
    const authenticatedUserId = userId;
    const controller = new AbortController();
    async function loadHouseholds() {
      try {
        const response = await fetch("/api/v1/households", {
          cache: "no-store", credentials: "same-origin", signal: controller.signal,
        });
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) throw new Error(readError(response.status, "A háztartások most nem tölthetők be."));
        const items = payload && typeof payload === "object" ? (payload as Record<string, unknown>).households : null;
        if (!Array.isArray(items) || !items.every(isHousehold)) throw new Error("A háztartások adatai nem olvashatók.");
        if (controller.signal.aborted) return;
        const preferred = preferredHouseholdId();
        const selected = items.find((item) => item.id === preferred) ?? items[0];
        clearPreview();
        setRequestCursor(null);
        setListState(null);
        setHouseholdState({ userId: authenticatedUserId, items, selectedId: selected?.id ?? "", error: null });
        if (selected) rememberHouseholdId(selected.id);
      } catch (error) {
        if (!controller.signal.aborted) {
          setHouseholdState({ userId: authenticatedUserId, items: [], selectedId: "", error: error instanceof Error ? error.message : "A háztartások most nem tölthetők be." });
        }
      }
    }
    void loadHouseholds();
    return () => controller.abort();
  }, [clearPreview, sessionPending, sessionError, userId, householdRetry]);

  useEffect(() => () => clearPreview(), [clearPreview, sessionPending, sessionError, userId]);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === selectionKey && event.newValue) changeHousehold(event.newValue);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [changeHousehold]);

  useEffect(() => {
    if (!listKey || !selectedHouseholdId) return;
    const controller = new AbortController();
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, listRequestTimeoutMs);
    setListState((previous) => previous?.key === listKey
      ? { ...previous, loading: true, error: undefined }
      : { key: listKey, documents: [], nextCursor: null, loading: true, initialized: false });
    async function loadPage() {
      try {
        const params = new URLSearchParams({ pageSize: String(pageSize) });
        if (requestCursor) params.set("cursor", requestCursor);
        const response = await fetch(`/api/v1/households/${encodeURIComponent(selectedHouseholdId)}/documents?${params}`, {
          cache: "no-store", credentials: "same-origin", signal: controller.signal,
        });
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) throw new Error(readError(response.status, "A dokumentumlista most nem tölthető be."));
        if (!isDocumentPage(payload)) throw new Error("A dokumentumlista adatai nem olvashatók.");
        if (!controller.signal.aborted) setListState((previous) => {
          if (previous?.key !== listKey) return previous;
          const existingIds = new Set(previous.documents.map((item) => item.id));
          const documents = requestCursor
            ? [...previous.documents, ...payload.documents.filter((item) => !existingIds.has(item.id))]
            : payload.documents;
          return { key: listKey, documents, nextCursor: payload.pagination.nextCursor, loading: false, initialized: true };
        });
      } catch (error) {
        if (!controller.signal.aborted || timedOut) setListState((previous) => previous?.key === listKey
          ? {
            ...previous,
            loading: false,
            error: timedOut
              ? "A dokumentumlista betöltése időtúllépés miatt megszakadt. Próbáld újra."
              : error instanceof Error ? error.message : "A dokumentumlista most nem tölthető be.",
          }
          : previous);
      } finally {
        window.clearTimeout(timeoutId);
      }
    }
    void loadPage();
    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [listKey, listRetry, requestCursor, selectedHouseholdId]);

  useEffect(() => {
    if (!listKey || !selectedHouseholdId || typeof window === "undefined") return;
    const householdId = selectedHouseholdId;
    const documentId = new URLSearchParams(window.location.search).get("documentId");
    if (!documentId || !/^[A-Za-z0-9_-]{1,64}$/.test(documentId)) return;
    const targetId = documentId;
    const key = `${listKey}:${targetId}`;
    if (requestedDocumentKey.current === key) return;
    requestedDocumentKey.current = key;
    setRequestedDocumentId(targetId);
    const controller = new AbortController();
    async function loadRequestedDocument() {
      try {
        const response = await fetch(metadataHref(householdId, targetId), {
          cache: "no-store", credentials: "same-origin", signal: controller.signal,
        });
        const payload: unknown = await response.json().catch(() => null);
        const value = payload && typeof payload === "object" ? (payload as Record<string, unknown>).document : null;
        if (!response.ok || !isDocument(value) || value.id !== targetId || controller.signal.aborted) return;
        setListState((previous) => {
          const current = previous?.key === listKey
            ? previous
            : { key: listKey, documents: [], nextCursor: null, loading: false, initialized: true };
          if (current.documents.some((item) => item.id === targetId)) return current;
          return { ...current, documents: [value, ...current.documents] };
        });
      } catch {
        // The normal list remains available if the target document is no longer readable.
      }
    }
    void loadRequestedDocument();
    return () => controller.abort();
  }, [listKey, selectedHouseholdId]);

  useEffect(() => {
    if (!requestedDocumentId || !currentList?.documents.some((item) => item.id === requestedDocumentId)) return;
    window.requestAnimationFrame(() => {
      document.getElementById(`document-${requestedDocumentId}`)?.scrollIntoView({ block: "center" });
    });
  }, [currentList, requestedDocumentId]);

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element || typeof IntersectionObserver === "undefined" || !currentList?.initialized ||
      currentList.loading || currentList.error || !currentList.nextCursor ||
      currentList.nextCursor === requestCursor) return;
    const nextCursor = currentList.nextCursor;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setRequestCursor(nextCursor);
    }, { threshold: 0.01 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [currentList, requestCursor]);

  async function openPreview(document: DocumentItem) {
    if (preview?.id === document.id) { clearPreview(); return; }
    clearPreview();
    const controller = new AbortController();
    const epoch = ++previewEpoch.current;
    previewController.current = controller;
    setPreview({ id: document.id, kind: "loading" });
    try {
      const blob = await fetchValidatedImage(selectedHouseholdId, document, controller.signal);
      if (controller.signal.aborted || previewEpoch.current !== epoch) return;
      const url = await imageDisplayUrl(blob, document, controller.signal, false);
      if (controller.signal.aborted || previewEpoch.current !== epoch) {
        URL.revokeObjectURL(url);
        return;
      }
      previewUrl.current = url;
      setPreview({ id: document.id, kind: "ready", url });
    } catch (error) {
      if (!controller.signal.aborted && previewEpoch.current === epoch) {
        setPreview({ id: document.id, kind: "error", error: error instanceof Error ? error.message : "A kép előnézete most nem tölthető be." });
      }
    } finally {
      if (previewEpoch.current === epoch) previewController.current = null;
    }
  }

  function closePreviewWithFocus() {
    const id = preview?.id;
    clearPreview();
    if (id) window.requestAnimationFrame(() => document.getElementById(`preview-button-${id}`)?.focus());
  }

  const mobileContext = !sessionPending && !sessionError && userId && selectedHousehold ? (
    <div className="app-household-mobile-context">
      {households.length > 1 ? (
        <>
          <label className="sr-only" htmlFor="documents-household-mobile">Aktív háztartás</label>
          <select id="documents-household-mobile" aria-label="Aktív háztartás" value={selectedHouseholdId} onChange={(event) => changeHousehold(event.currentTarget.value)}>
            {households.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.currency}</option>)}
          </select>
        </>
      ) : <span className={styles.mobileHouseholdName}>{selectedHousehold.name} · {selectedHousehold.currency}</span>}
    </div>
  ) : undefined;

  return (
    <AppShell mobileContext={mobileContext}>
      <main className="app-main">
        <div className={styles.page}>
          <Link className={styles.back} href="/"><span aria-hidden="true">‹</span> Vissza az Áttekintéshez</Link>
          <header className={styles.heading}>
            <h1>Fájlkezelés</h1>
            <p>A háztartás privát, eredeti fájljai. Ezek még nincsenek feldolgozva vagy kiadásként könyvelve.</p>
          </header>

          {sessionPending ? <p role="status">Fiók ellenőrzése…</p> :
            sessionError ? <div className={styles.feedback} role="alert"><p>A fiók állapota most nem ellenőrizhető.</p><button type="button" onClick={() => void refetch()}>Újrapróbálás</button></div> :
              !userId ? <div className={styles.feedback}><p>A dokumentumok megtekintéséhez jelentkezz be.</p><Link href="/bejelentkezes">Bejelentkezés</Link></div> :
                householdState?.userId !== userId ? <p role="status">Háztartás betöltése…</p> :
                  householdState.error ? <div className={styles.feedback} role="alert"><p>{householdState.error}</p><button type="button" onClick={() => { setHouseholdState(null); setHouseholdRetry((value) => value + 1); }}>Újrapróbálás</button></div> :
                    !selectedHousehold ? <div className={styles.feedback}><p>Előbb hozz létre háztartást, vagy csatlakozz egyhez.</p><Link href="/kezdes">Háztartás beállítása</Link></div> : (
                      <>
                        <div className={styles.householdContext}>
                          {households.length > 1 ? <label htmlFor="documents-household">Háztartás</label> : <span className={styles.contextLabel}>Háztartás</span>}
                          {households.length > 1 ? (
                            <select id="documents-household" value={selectedHouseholdId} onChange={(event) => changeHousehold(event.currentTarget.value)}>
                              {households.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.currency}</option>)}
                            </select>
                          ) : <span>{selectedHousehold.name} · {selectedHousehold.currency}</span>}
                        </div>
                        {selectedHousehold.role !== "VIEWER" && <Link className={styles.addLink} href="/dokumentum/feltoltes">Fájl feltöltése</Link>}
                        {!currentList || (!currentList.initialized && currentList.loading) ?
                          <p className={styles.status} role="status">Dokumentumok betöltése…</p> : (
                            <section aria-labelledby="document-list-title" className={styles.listSection}>
                              <h2 id="document-list-title">Mentett fájlok</h2>
                              {currentList.documents.length === 0 && !currentList.error && (
                                <p className={styles.status}>Ebben a háztartásban még nincs mentett dokumentum.</p>
                              )}
                              {currentList.documents.length > 0 && (
                                <ul className={styles.list}>
                                  {currentList.documents.map((document) => {
                                    const canPreview = imagePreviewTypes.has(document.detectedMimeType);
                                    const open = preview?.id === document.id;
                                    return (
                                      <li id={`document-${document.id}`} key={document.id}>
                                        <div className={styles.row}>
                                          {canPreview ? <DocumentThumbnail document={document} householdId={selectedHouseholdId} /> :
                                            <span aria-hidden="true" className={styles.thumbnail}><FileGlyph pdf /></span>}
                                          <div className={styles.rowText}>
                                            <strong>{document.displayName}</strong>
                                            <span>{typeLabels[document.detectedMimeType]} · {fileSize(document.byteSize)} · {uploadDate(document.createdAt)}</span>
                                          </div>
                                          {canPreview ? (
                                            <button aria-controls={open ? `preview-${document.id}` : undefined} aria-expanded={open}
                                              aria-label={open ? `${document.displayName} előnézetének bezárása` : `${document.displayName} előnézetének megnyitása`}
                                              id={`preview-button-${document.id}`}
                                              onClick={() => void openPreview(document)} type="button">
                                              {open ? "Bezárás" : "Előnézet"}
                                            </button>
                                          ) : (
                                            <a aria-label={`${document.displayName} letöltése`} download href={contentHref(selectedHouseholdId, document.id)}>Letöltés</a>
                                          )}
                                        </div>
                                        {open && (
                                          <section aria-label={`${document.displayName} előnézete`} className={styles.preview} id={`preview-${document.id}`} tabIndex={-1}>
                                            {preview.kind === "loading" ? <p role="status">Kép előnézetének betöltése…</p> :
                                              preview.kind === "error" ? <p className={styles.previewError} role="alert">{preview.error}</p> :
                                                preview.url ? (
                                                  // Authenticated, MIME-checked blob URL; no persistent or public image source.
                                                  // eslint-disable-next-line @next/next/no-img-element
                                                  <img alt={`${document.displayName} előnézete`} src={preview.url} />
                                                ) : null}
                                            {(document.detectedMimeType === "image/heic" || document.detectedMimeType === "image/heif") &&
                                              <a className={styles.originalLink} download href={contentHref(selectedHouseholdId, document.id)}>Eredeti kép letöltése</a>}
                                            <button className={styles.closePreview} onClick={closePreviewWithFocus} type="button">Előnézet bezárása</button>
                                          </section>
                                        )}
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                              {currentList.error && <div className={styles.feedback} role="alert"><p>{currentList.error}</p><button type="button" onClick={() => setListRetry((value) => value + 1)}>Újrapróbálás</button></div>}
                              {currentList.loading && <p className={styles.status} role="status">További fájlok betöltése…</p>}
                              {currentList.nextCursor && !currentList.loading && !currentList.error && (
                                <div className={styles.loadMore} ref={loadMoreRef}>
                                  <button onClick={() => setRequestCursor(currentList.nextCursor)} type="button">További fájlok betöltése</button>
                                </div>
                              )}
                              {currentList.initialized && !currentList.nextCursor && currentList.documents.length > 0 &&
                                <p className={styles.endOfList}>A lista végére értél.</p>}
                            </section>
                          )}
                      </>
                    )}
        </div>
      </main>
    </AppShell>
  );
}
