"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  documentTypeNames, fileSize, prepareUploadSelection, uploadDocument, UploadFailure,
  type SavedDocument, type UploadSelection,
} from "@/lib/document-upload-client";
import styles from "./overview.module.css";

export default function QuickCameraUpload({ householdId }: { householdId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const activePreparation = useRef<AbortController | null>(null);
  const requestNumber = useRef(0);
  const preparationNumber = useRef(0);
  const [selection, setSelection] = useState<UploadSelection | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mustSelectAgain, setMustSelectAgain] = useState(false);
  const [saved, setSaved] = useState<SavedDocument | null>(null);

  useEffect(() => {
    if (selection || preparing || error) panelRef.current?.focus();
  }, [selection, preparing, error]);

  useEffect(() => () => {
    activeRequest.current?.abort();
    activePreparation.current?.abort();
  }, []);

  function reset() {
    requestNumber.current += 1;
    preparationNumber.current += 1;
    activeRequest.current?.abort();
    activePreparation.current?.abort();
    activeRequest.current = null;
    activePreparation.current = null;
    setSelection(null);
    setPreparing(false);
    setBusy(false);
    setError(null);
    setMustSelectAgain(false);
    setSaved(null);
    if (inputRef.current) inputRef.current.value = "";
    window.requestAnimationFrame(() => cameraButtonRef.current?.focus());
  }

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    activePreparation.current?.abort();
    const controller = new AbortController();
    const number = ++preparationNumber.current;
    activePreparation.current = controller;
    setSelection(null);
    setPreparing(true);
    setError(null);
    setMustSelectAgain(false);
    setSaved(null);
    event.currentTarget.value = "";
    void prepareUploadSelection(file, controller.signal).then((prepared) => {
      if (!controller.signal.aborted && preparationNumber.current === number) {
        setSelection(prepared.mimeType === "application/pdf"
          ? { ...prepared, error: "Itt csak képet választhatsz. PDF-hez nyisd meg a Fájlkezelést." }
          : prepared);
      }
    }).catch((preparationError: unknown) => {
      if (!controller.signal.aborted && preparationNumber.current === number) {
        setError(preparationError instanceof Error ? preparationError.message : "A képet nem sikerült előkészíteni.");
      }
    }).finally(() => {
      if (preparationNumber.current === number) {
        activePreparation.current = null;
        setPreparing(false);
      }
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selection || selection.error || busy || preparing) return;
    const controller = new AbortController();
    const number = ++requestNumber.current;
    activeRequest.current = controller;
    setBusy(true);
    setError(null);
    try {
      const document = await uploadDocument(householdId, selection, controller.signal);
      if (!controller.signal.aborted && requestNumber.current === number) setSaved(document);
    } catch (uploadError) {
      if (!controller.signal.aborted && requestNumber.current === number) {
        setError(uploadError instanceof Error ? uploadError.message : "A feltöltés nem sikerült. Próbáld újra ugyanazzal a képpel.");
        setMustSelectAgain(uploadError instanceof UploadFailure && uploadError.requiresNewSelection);
      }
    } finally {
      if (requestNumber.current === number) {
        activeRequest.current = null;
        setBusy(false);
      }
    }
  }

  return (
    <>
      <input
        accept="image/*"
        capture="environment"
        hidden
        onChange={chooseImage}
        ref={inputRef}
        type="file"
      />
      {!selection && !preparing && !error && (
        <button
          aria-label="Fénykép készítése és privát dokumentum feltöltése"
          className={styles.cameraFloating}
          onClick={() => inputRef.current?.click()}
          ref={cameraButtonRef}
          type="button"
        >
          <svg aria-hidden="true" fill="none" height="25" viewBox="0 0 24 24" width="25">
            <path d="M4 7h3l1.6-2h6.8L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
            <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </button>
      )}
      {(selection || preparing || error) && (
        <section aria-labelledby="quick-camera-title" className={styles.quickCameraPanel} ref={panelRef} tabIndex={-1}>
          <h2 id="quick-camera-title">Fénykép mentése</h2>
          <p>A kép privát dokumentumként kerül az aktuális háztartásba. Előkészítéskor 500 KiB körüli méretre törekszünk, az olvashatóságot előnyben tartva; még nem lesz feldolgozva vagy kiadásként könyvelve.</p>
          {preparing && <p className={styles.quickCameraProgress} role="status" aria-live="polite">Kép előkészítése… Kérlek, várj.</p>}
          {preparing && <button className={styles.quickCameraCancel} onClick={reset} type="button">Előkészítés megszakítása</button>}
          {!selection && error && <p className={styles.quickCameraError} role="alert">{error}</p>}
          {!selection && error && <button className={styles.quickCameraCancel} onClick={reset} type="button">Bezárás</button>}
          {selection && <form onSubmit={(event) => void submit(event)}>
            <dl className={styles.quickCameraFile}>
              <div><dt>Fájl</dt><dd>{selection.file.name}</dd></div>
              <div><dt>Méret és típus</dt><dd>{selection.originalByteSize > selection.file.size
                ? `Eredeti ${fileSize(selection.originalByteSize)} → feltöltés ${fileSize(selection.file.size)}`
                : fileSize(selection.file.size)} · {documentTypeNames[selection.mimeType] ?? "Ismeretlen típus"}</dd></div>
            </dl>
            {selection.error && <p className={styles.quickCameraError} role="alert">{selection.error}</p>}
            {busy && <p className={styles.quickCameraProgress} role="status" aria-live="polite">Kép feltöltése… Kérlek, várj.</p>}
            {error && <p className={styles.quickCameraError} role="alert">{error}</p>}
            {saved && (
              <div className={styles.quickCameraSuccess} role="status">
                <strong>{saved.duplicate ? "Ez a kép már szerepel a háztartás dokumentumai között." : "Privát dokumentumként mentve."}</strong>
                <p>{saved.duplicate ? "A meglévő dokumentumot nyithatod meg; új példány nem készült." : "A kép még nincs feldolgozva vagy kiadásként könyvelve."}</p>
                <p>{saved.displayName}</p>
                <Link href={`/dokumentumok?documentId=${encodeURIComponent(saved.id)}#document-${encodeURIComponent(saved.id)}`}>
                  {saved.duplicate ? "Megnyitás a Fájlkezelésben" : "Megtekintés a Fájlkezelésben"}
                </Link>
              </div>
            )}
            <div className={styles.quickCameraActions}>
              {!saved && !selection.error && !mustSelectAgain && (
                <button className={styles.quickCameraSave} disabled={busy} type="submit">
                  {error ? "Feltöltés újrapróbálása" : "Privát kép mentése"}
                </button>
              )}
              <button className={styles.quickCameraCancel} onClick={reset} type="button">
                {busy ? "Feltöltés megszakítása" : saved ? "Bezárás" : "Mégsem"}
              </button>
            </div>
          </form>}
        </section>
      )}
    </>
  );
}
