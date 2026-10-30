"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { authClient } from "@/lib/auth-client";

const navigationDestinations = [
  { href: "/naplo", label: "Napló" },
  { href: "/", label: "Áttekintés" },
  { href: "/beallitasok", label: "Beállítások" },
  { href: "/beallitasok/haztartas", label: "Háztartás" },
  { href: "/beallitasok/tagok", label: "Tagok és meghívók" },
  { href: "/beallitasok/kategoriak", label: "Kiadási kategóriák" },
  { href: "/beallitasok/fiok", label: "Fiók" },
] as const;

const dialogId = "mobile-navigation-sheet";
const selectionKey = "household-selection:v1";

type MenuHousehold = { id: string; role: "OWNER" | "MEMBER" | "VIEWER" };
type FileMenuState = { revision: number; households: MenuHousehold[]; error: boolean };

function isMenuHousehold(value: unknown): value is MenuHousehold {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" &&
    (item.role === "OWNER" || item.role === "MEMBER" || item.role === "VIEWER");
}

function preferredHouseholdId() {
  try { return window.localStorage.getItem(selectionKey); } catch { return null; }
}

export default function MobileSettingsMenu() {
  const { data, isPending, error } = authClient.useSession();

  if (isPending || error || !data?.user || !data.session) return null;

  return <SignedInSettingsMenu key={data.session.id} />;
}

function SignedInSettingsMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [fileMenuRevision, setFileMenuRevision] = useState(0);
  const [fileMenuState, setFileMenuState] = useState<FileMenuState | null>(null);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const swipeStartY = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || fileMenuRevision === 0) return;
    const controller = new AbortController();
    async function loadFileAccess() {
      try {
        const response = await fetch("/api/v1/households", {
          cache: "no-store", credentials: "same-origin", signal: controller.signal,
        });
        const payload: unknown = await response.json().catch(() => null);
        const households = payload && typeof payload === "object"
          ? (payload as Record<string, unknown>).households : null;
        if (!response.ok || !Array.isArray(households) || !households.every(isMenuHousehold)) {
          throw new Error("A tagság nem ellenőrizhető.");
        }
        if (!controller.signal.aborted) setFileMenuState({ revision: fileMenuRevision, households, error: false });
      } catch {
        if (!controller.signal.aborted) setFileMenuState({ revision: fileMenuRevision, households: [], error: true });
      }
    }
    void loadFileAccess();
    return () => controller.abort();
  }, [open, fileMenuRevision]);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === selectionKey) setSelectedHouseholdId(event.newValue);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const currentFileMenu = open && fileMenuState?.revision === fileMenuRevision ? fileMenuState : null;
  const selectedHousehold = currentFileMenu?.households.find((item) => item.id === selectedHouseholdId)
    ?? (selectedHouseholdId ? undefined : currentFileMenu?.households[0]);

  function openMenu() {
    setSelectedHouseholdId(preferredHouseholdId());
    setFileMenuRevision((value) => value + 1);
    setOpen(true);
  }

  function close(restoreFocus = false) {
    setOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }

    if (event.key !== "Tab") return;
    const focusable = event.currentTarget.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function startSwipe(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "touch") return;
    swipeStartY.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function finishSwipe(event: PointerEvent<HTMLDivElement>) {
    const startY = swipeStartY.current;
    swipeStartY.current = null;
    if (startY !== null && event.clientY - startY > 72) close(true);
  }

  return (
    <div className="mobile-settings-control">
      <button
        aria-controls={dialogId}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Menü"
        className="mobile-settings-trigger"
        hidden={open}
        onClick={openMenu}
        ref={triggerRef}
        type="button"
      >
        <span aria-hidden="true" className="mobile-settings-hamburger">
          <span />
          <span />
          <span />
        </span>
        <span className="sr-only">Menü</span>
      </button>

      <div
        className="mobile-settings-backdrop"
        hidden={!open}
        onClick={(event) => {
          if (event.target === event.currentTarget) close(true);
        }}
      >
        <section
          aria-labelledby="mobile-navigation-title"
          aria-modal={open ? true : undefined}
          className="mobile-settings-sheet"
          id={dialogId}
          onKeyDown={handleDialogKeyDown}
          role="dialog"
        >
          <div
            aria-hidden="true"
            className="mobile-settings-grabber-area"
            onPointerDown={startSwipe}
            onPointerUp={finishSwipe}
          >
            <span className="mobile-settings-grabber" />
          </div>
          <header className="mobile-settings-sheet-header">
            <h2 id="mobile-navigation-title">Menü</h2>
            <button
              aria-label="Menü bezárása"
              className="mobile-settings-close"
              onClick={() => close(true)}
              ref={closeButtonRef}
              type="button"
            >
              <span aria-hidden="true">×</span>
            </button>
          </header>
          <nav aria-label="Navigáció" className="mobile-settings-links">
            {navigationDestinations.slice(0, 1).map((destination) => (
              <Link
                aria-current={pathname === destination.href ? "page" : undefined}
                className="mobile-settings-link"
                href={destination.href}
                key={destination.href}
                onClick={() => close()}
              >
                {destination.label}
              </Link>
            ))}
            {selectedHousehold && !currentFileMenu?.error ? (
              <Link
                aria-current={pathname === "/dokumentumok" ? "page" : undefined}
                className="mobile-settings-link"
                href="/dokumentumok"
                onClick={() => close()}
              >
                Fájlkezelés
              </Link>
            ) : open && !currentFileMenu ? (
              <p className="px-4 py-3 text-sm text-[var(--label-secondary)]" role="status">Fájlkezelés ellenőrzése…</p>
            ) : currentFileMenu?.error ? (
              <p className="px-4 py-3 text-sm text-[var(--label-secondary)]" role="status">A Fájlkezelés most nem érhető el.</p>
            ) : null}
            {navigationDestinations.slice(1).map((destination) => (
              <Link
                aria-current={pathname === destination.href ? "page" : undefined}
                className="mobile-settings-link"
                href={destination.href}
                key={destination.href}
                onClick={() => close()}
              >
                {destination.label}
              </Link>
            ))}
          </nav>
        </section>
      </div>
    </div>
  );
}
