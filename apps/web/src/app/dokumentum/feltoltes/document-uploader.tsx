"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import {
  documentTypeNames, fileSize, prepareUploadSelection, uploadDocument, UploadFailure,
  type SavedDocument, type UploadSelection,
} from "@/lib/document-upload-client";
import AppShell from "../../app-shell";
import styles from "./document-uploader.module.css";

type Household = {
  id: string;
  name: string;
  currency: "RON";
  role: "OWNER" | "MEMBER" | "VIEWER";
};
const selectionKey = "household-selection:v1";

function isHousehold(value: unknown): value is Household {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.name === "string" && item.currency === "RON" &&
    (item.role === "OWNER" || item.role === "MEMBER" || item.role === "VIEWER");
}

function preferredHouseholdId() {
  try { return window.localStorage.getItem(selectionKey); } catch { return null; }
}

function rememberHouseholdId(id: string) {
  try { window.localStorage.setItem(selectionKey, id); } catch { /* The current visit still works. */ }
}

export default function DocumentUploader() {
  const { data: session, isPending: sessionPending, error: sessionError, refetch } = authClient.useSession();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [householdId, setHouseholdId] = useState("");
  const [householdsLoading, setHouseholdsLoading] = useState(true);
  const [householdError, setHouseholdError] = useState<string | null>(null);
  const [householdRetry, setHouseholdRetry] = useState(0);
  const [selection, setSelection] = useState<UploadSelection | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [mustSelectAgain, setMustSelectAgain] = useState(false);
  const [saved, setSaved] = useState<SavedDocument | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const pdfInput = useRef<HTMLInputElement>(null);
  const activeUpload = useRef<{ number: number; controller: AbortController } | null>(null);
  const activePreparation = useRef<AbortController | null>(null);
  const attemptNumber = useRef(0);
  const preparationNumber = useRef(0);
  const userId = session?.user?.id;

  const clearAttempt = useCallback(() => {
    attemptNumber.current += 1;
    preparationNumber.current += 1;
    activeUpload.current?.controller.abort();
    activePreparation.current?.abort();
    activeUpload.current = null;
    activePreparation.current = null;
    setBusy(false);
    setPreparing(false);
    setSelection(null);
    setPrepareError(null);
    setFormError(null);
    setMustSelectAgain(false);
    setSaved(null);
    for (const input of [cameraInput.current, imageInput.current, pdfInput.current]) {
      if (input) input.value = "";
    }
  }, []);

  const changeHousehold = useCallback((id: string) => {
    if (id === householdId) return;
    clearAttempt();
    setHouseholdId(id);
    rememberHouseholdId(id);
  }, [clearAttempt, householdId]);

  useEffect(() => {
    if (sessionPending || sessionError || !userId) return;
    const controller = new AbortController();
    async function loadHouseholds() {
      try {
        const response = await fetch("/api/v1/households", {
          cache: "no-store", credentials: "same-origin", signal: controller.signal,
        });
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) throw new Error("A háztartások most nem tölthetők be.");
        const values = payload && typeof payload === "object" ? (payload as Record<string, unknown>).households : null;
        if (!Array.isArray(values) || !values.every(isHousehold)) throw new Error("A háztartások adatai nem olvashatók.");
        if (controller.signal.aborted) return;
        const preferred = preferredHouseholdId();
        const next = values.find((item) => item.id === preferred) ?? values[0];
        clearAttempt();
        setHouseholds(values);
        setHouseholdId(next?.id ?? "");
        setHouseholdError(null);
        if (next) rememberHouseholdId(next.id);
      } catch (error) {
        if (!controller.signal.aborted) setHouseholdError(error instanceof Error ? error.message : "A háztartások most nem tölthetők be.");
      } finally {
        if (!controller.signal.aborted) setHouseholdsLoading(false);
      }
    }
    void loadHouseholds();
    return () => controller.abort();
  }, [clearAttempt, sessionPending, sessionError, userId, householdRetry]);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== selectionKey || !event.newValue || event.newValue === householdId) return;
      if (households.some((item) => item.id === event.newValue)) changeHousehold(event.newValue);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [changeHousehold, householdId, households]);

  useEffect(() => () => {
    activeUpload.current?.controller.abort();
    activePreparation.current?.abort();
  }, []);

  function selectedFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    activePreparation.current?.abort();
    const controller = new AbortController();
    const number = ++preparationNumber.current;
    activePreparation.current = controller;
    setPreparing(true);
    setPrepareError(null);
    setSelection(null);
    setFormError(null);
    setMustSelectAgain(false);
    setSaved(null);
    event.currentTarget.value = "";
    void prepareUploadSelection(file, controller.signal).then((prepared) => {
      if (!controller.signal.aborted && preparationNumber.current === number) setSelection(prepared);
    }).catch((error: unknown) => {
      if (!controller.signal.aborted && preparationNumber.current === number) {
        setPrepareError(error instanceof Error ? error.message : "A képet nem sikerült előkészíteni.");
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
    if (!selection || selection.error || busy || preparing || !householdId) return;
    const controller = new AbortController();
    const number = ++attemptNumber.current;
    activeUpload.current = { number, controller };
    setBusy(true);
    setFormError(null);
    try {
      const document = await uploadDocument(householdId, selection, controller.signal);
      if (controller.signal.aborted || attemptNumber.current !== number) return;
      setSaved(document);
    } catch (error) {
      if (!controller.signal.aborted && attemptNumber.current === number) {
        setFormError(error instanceof Error ? error.message : "A kapcsolat megszakadt. Próbáld újra ugyanazzal a fájllal.");
        setMustSelectAgain(error instanceof UploadFailure && error.requiresNewSelection);
      }
    } finally {
      if (attemptNumber.current === number) {
        activeUpload.current = null;
        setBusy(false);
      }
    }
  }

  const household = households.find((item) => item.id === householdId);
  const canUpload = household?.role === "OWNER" || household?.role === "MEMBER";
  const mobileContext = !sessionPending && !sessionError && userId && !householdsLoading && !householdError && household ? (
    <div className="app-household-mobile-context">
      {households.length > 1 ? (
        <>
          <label className="sr-only" htmlFor="upload-household-mobile">Aktív háztartás</label>
          <select id="upload-household-mobile" aria-label="Aktív háztartás" value={householdId} onChange={(event) => changeHousehold(event.currentTarget.value)}>
            {households.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.currency}</option>)}
          </select>
        </>
      ) : <span className={styles.mobileHouseholdName}>{household.name} · {household.currency}</span>}
    </div>
  ) : undefined;

  return (
    <AppShell mobileContext={mobileContext}>
      <main className="app-main">
        <div className={styles.page}>
          <Link className={styles.back} href="/"><span aria-hidden="true">‹</span> Vissza az Áttekintéshez</Link>
          <header className={styles.heading}>
            <h1>Dokumentum hozzáadása</h1>
            <p>Fénykép vagy PDF privát mentése a háztartáshoz. A mentés még nem dolgozza fel a dokumentumot, és nem könyvel kiadást.</p>
          </header>

          {sessionPending ? <p role="status">Fiók ellenőrzése…</p> :
            sessionError ? <div className={styles.feedback} role="alert"><p>A fiók állapota most nem ellenőrizhető.</p><button type="button" onClick={() => void refetch()}>Újrapróbálás</button></div> :
              !userId ? <div className={styles.feedback}><p>A feltöltéshez jelentkezz be.</p><Link href="/bejelentkezes">Bejelentkezés</Link></div> :
                householdsLoading ? <p role="status">Háztartás betöltése…</p> :
                  householdError ? <div className={styles.feedback} role="alert"><p>{householdError}</p><button type="button" onClick={() => { setHouseholdsLoading(true); setHouseholdRetry((value) => value + 1); }}>Újrapróbálás</button></div> :
                    !household ? <div className={styles.feedback}><p>Előbb hozz létre háztartást, vagy csatlakozz egyhez.</p><Link href="/kezdes">Háztartás beállítása</Link></div> : (
                      <>
                        <div className={styles.householdContext}>
                          {households.length > 1 ? <label htmlFor="upload-household">Háztartás</label> : <span className={styles.contextLabel}>Háztartás</span>}
                          {households.length > 1 ? (
                            <select id="upload-household" value={householdId} onChange={(event) => changeHousehold(event.currentTarget.value)}>
                              {households.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.currency}</option>)}
                            </select>
                          ) : <span>{household.name} · {household.currency}</span>}
                        </div>
                        {!canUpload ? <p className={styles.feedback} role="status">Ebben a háztartásban csak megtekintési jogosultságod van. Dokumentumot nem tölthetsz fel.</p> : (
                          <form onSubmit={(event) => void submit(event)}>
                            <div className={styles.choiceIntro}>
                              <h2>Fénykép vagy fájl</h2>
                              <p>A kamerát a „Fénykép készítése” gomb nyitja meg. Képeknél 500 KiB körüli méretre törekszünk, az olvashatóságot előnyben tartva; PDF-et nem módosítunk. Bemeneti fájl legfeljebb 20 MiB.</p>
                            </div>
                            <div className={styles.choices}>
                              <button disabled={busy || preparing} onClick={() => cameraInput.current?.click()} type="button">Fénykép készítése <span aria-hidden="true">›</span></button>
                              <button disabled={busy || preparing} onClick={() => imageInput.current?.click()} type="button">Meglévő kép választása <span aria-hidden="true">›</span></button>
                              <button disabled={busy || preparing} onClick={() => pdfInput.current?.click()} type="button">PDF választása <span aria-hidden="true">›</span></button>
                            </div>
                            <input ref={cameraInput} hidden type="file" accept="image/jpeg,image/png,image/heic,image/heif,.jpg,.jpeg,.png,.heic,.heif" capture="environment" onChange={selectedFile} />
                            <input ref={imageInput} hidden type="file" accept="image/jpeg,image/png,image/heic,image/heif,.jpg,.jpeg,.png,.heic,.heif" onChange={selectedFile} />
                            <input ref={pdfInput} hidden type="file" accept="application/pdf,.pdf" onChange={selectedFile} />

                            {selection && (
                              <section aria-label="Kiválasztott fájl" className={styles.filePreview}>
                                <h2>Kiválasztott fájl</h2>
                                <p className={styles.fileName}>{selection.file.name}</p>
                                <p className={styles.fileDetails}>
                                  {selection.originalByteSize > selection.file.size
                                    ? `Eredeti ${fileSize(selection.originalByteSize)} → feltöltés ${fileSize(selection.file.size)}`
                                    : fileSize(selection.file.size)} · {documentTypeNames[selection.mimeType] ?? "Ismeretlen típus"}
                                </p>
                                {selection.error && <p className={styles.error} role="alert">{selection.error}</p>}
                              </section>
                            )}

                            {preparing && <p className={styles.progress} role="status" aria-live="polite">Kép előkészítése… Kérlek, várj.</p>}
                            {prepareError && <p className={styles.error} role="alert">{prepareError}</p>}
                            {busy && <p className={styles.progress} role="status" aria-live="polite">Dokumentum feltöltése… Kérlek, várj.</p>}
                            {formError && <p className={styles.error} role="alert">{formError}</p>}
                            {saved && (
                              <div className={styles.success} role="status">
                                <strong>{saved.duplicate ? "Ez a fájl már szerepel a háztartás dokumentumai között." : "Privát dokumentumként mentve."}</strong>
                                <p>{saved.duplicate ? "A meglévő dokumentumot nyithatod meg; új példány nem készült." : "A dokumentum még nincs feldolgozva vagy kiadásként könyvelve."}</p>
                                <dl><div><dt>Fájlnév</dt><dd>{saved.displayName}</dd></div><div><dt>Azonosító</dt><dd>{saved.id}</dd></div></dl>
                                <Link className="mt-3 inline-flex min-h-11 items-center font-semibold text-[var(--tint)] underline underline-offset-3"
                                  href={`/dokumentumok?documentId=${encodeURIComponent(saved.id)}#document-${encodeURIComponent(saved.id)}`}>
                                  {saved.duplicate ? "Megnyitás a Fájlkezelésben" : "Megtekintés a dokumentumok között"}
                                </Link>
                              </div>
                            )}
                            {(selection || preparing) && (
                              <div className={styles.actions}>
                                {selection && !saved && !selection.error && !mustSelectAgain && <button className={styles.primary} disabled={busy || preparing} type="submit">{formError ? "Feltöltés újrapróbálása" : "Privát dokumentum mentése"}</button>}
                                <button className={styles.secondary} onClick={clearAttempt} type="button">{busy ? "Feltöltés megszakítása" : preparing ? "Előkészítés megszakítása" : saved ? "Új dokumentum választása" : "Kiválasztás törlése"}</button>
                              </div>
                            )}
                          </form>
                        )}
                      </>
                    )}
        </div>
      </main>
    </AppShell>
  );
}
