# EPIC-04-T06: Upload documents from the mobile overview

## Goal and value

A household member can use a clear path from the Overview on a phone to photograph or select an original image or PDF, and receive confirmation that the private document was uploaded. This task **stores a document**; it does not extract receipt line items or post an expense.

## Scope and non-goals

- Provide a clear `Dokumentum hozzáadása` action on the current household's mobile Overview and a separate, short upload view. Offer clear native camera, photo-picker, and PDF-picker actions; if camera launch is unsupported, the system provides a file picker. The app does not implement its own camera.
- Call the existing T02 `POST /api/v1/households/{householdId}/documents` endpoint with a `file` multipart field and a UUID `Idempotency-Key` retained when retrying the same attempt. Read the selected household ID from the existing household context; the server rechecks authorization.
- Show the upload action to `OWNER` and `MEMBER`, but not to read-only `VIEWER`. Clearly show the selected file, size/type, in-progress state, errors, and successful private storage. Success copy must not promise OCR, automatic categorization, or ledger posting.
- No general document library, deletion, receipt processing, new API endpoint, ledger write, or navigation tab. T04's duplicate policy and T05 backup process are separate tasks.

## Dependencies and order

The T02 upload API contract and T03 authorized metadata/content GET are required for manual upload→read verification. T02 code and synthetic HTTP smoke are complete; its remaining acceptance criteria must be closed in the T02 file. All three T03 acceptance criteria and signed-in, two-household manual acceptance were **completed on 2026-10-28**. **Historical status:** when T03 closed, T06 became the next `pending implementation` task; the UI has since been implemented, and T06 is parked in `work/archive/` as `pending completion`, with mobile QA open. T01's Compose-volume persistence and FK/immutability runtime gate also remain separate open items and cannot be marked complete by T06.

## Implementation checklist

- [x] Permission-gated document upload from the Overview and a separate upload view.
- [x] Native camera/image/PDF selection, type/size preview, upload status, cancellation, and error/retry handling.
- [x] Idempotent retry and private-storage confirmation; connected to existing API/authorized-read paths.

## Acceptance criteria

- [ ] The current household’s Overview has a prominent upload action; `OWNER`/`MEMBER` can use it, while `VIEWER` has no upload control. On household change, the previous selected file and success message do not carry over.
- [ ] On mobile, users can separately take a photo, select an existing image, or choose a PDF. The native picker offers the appropriate types, and the UI previews the current 20 MiB API limit while the server remains authoritative. Cancelling the picker does not start a request.
- [ ] During upload, show an accessible indeterminate status rather than an invented percentage. Retrying the same file reuses its idempotency key; a different file gets a new key. Show clear errors for API `4xx`/`5xx`, 413, 429, and 409 responses, and never indicate success for a failure.
- [ ] After `201` or a matching replay, show a status meaning “Saved as a private document; not yet processed or posted as an expense,” plus a safe filename and document ID. If T03 manual acceptance is complete, the original can be read back through its authorized GET; do not show a public URL, storage key, hash, or local path.
- [ ] At 320 and 390 CSS px, with iPhone safe areas and enlarged text, there is no horizontal overflow. Native buttons have at least 44 px targets, clear labels, and work with keyboard and screen reader. Monthly RON totals and Journal access remain available.

## Verification checklist

Tester verification reconciliation pending. The dated manual-verification plan and open status below remain the current evidence; no verification checkbox state is added here.

## Historical read-only preimplementation plan — 2026-10-28

**File ownership:** The `designer`/web developer owns a focused dashboard entry point in `apps/web/src/app/page.tsx` and `apps/web/src/app/overview.module.css`, plus a new `page.tsx`, client component, and CSS module under `apps/web/src/app/dokumentum/feltoltes/`. Do not touch API, Prisma, T03, or shared-shell files. The earlier [mobile research](../../../../docs/research/mobile-responsive-cupertino-ui.md) and [benchmark](../../../../docs/research/household-finance-mobile-ui-benchmark.md) support a short, clear action, native picker, household context, and safe-area handling. The earlier restriction that “photo receipt flow starts only in EPIC-05” does not apply to the requested **private document upload**; OCR and posting remain in EPIC-05.

**Manual verification:** Use only a synthetic account/file in the already running local app: phone camera/picker and PDF at 320/390 px, empty/cancelled selection, successful own upload and byte-matched T03 read-back, errors/retry, `VIEWER` visibility, and switching between two households. Also check picker fallback and focus order in a desktop browser. The tester records observed steps precisely; the current MVP request does not include an automated test suite.

**Product decision — 2026-10-30:** The user accepted JPEG/PNG/HEIC/HEIF/PDF, 20 MiB, and 10 upload attempts per user per minute for the MVP. Real iPhone photo feedback may inform a later revision. T03 manual acceptance is complete.

## Current status — 2026-10-30

`pending completion`: the scoped web UI is implemented. Signed-in synthetic browser checks showed the upload view, three picker buttons, 20 MiB notice, and no horizontal overflow at 320/390 CSS px in earlier bounded checks. The file chooser stalled, then Chrome control detached; the tester cannot access the parent thread's in-app browser and the Mac was locked. Upload→read, roles, preview, real mobile picker/camera, safe-area and enlarged-text acceptance remain open. All five acceptance boxes remain `[ ]`.

**Observed checks:** Under Node `v24.22.1`, `tsc --noEmit` in `apps/web` and ESLint on the changed TSX files completed without errors. `git diff --check` was clean for selected tracked files; the new files' `git diff --no-index --check` output was empty (exit 1 because a diff exists). No automated tests ran. Without a known synthetic browser session and file, the tester's next steps are manual camera/PDF, 320/390 px, focus, safe area, two-household, VIEWER, and authorized T03 read-back checks.

**Tester manual-QA prerequisite — 2026-10-28:** Local web `/` and API `/api/auth/get-session` returned HTTP `200`, and ports 3000/3001 had listeners. No synthetic browser sign-in was verified: local-app tabs in the existing Chrome profile had unknown sessions, and the `example.test` credentials and in-memory cookies from the earlier T03 API smoke were no longer available. The browser credential rule requires user takeover before entering a new password; the tester did not use an unknown session or create a workaround API-backed browser session. Therefore the signed-in 320/390 px UI, roles, picker, upload, and T03 read-back steps **were not run**; all five acceptance boxes remain open. Next step: perform the manual QA above after verified synthetic OWNER/MEMBER/VIEWER browser sign-ins.

**Bounded browser QA — 2026-10-29:** The existing Chrome app session showed the synthetic `t09-teszt-20261029@example.test` account and synthetic T09 household on the account page, so its identity was verified before inspection. The upload view exposed separate camera, existing-image and PDF picker buttons. At a 320 CSS px viewport, the document showed no horizontal overflow (`scrollWidth` and client width both 305 px after the scrollbar), and the visible back, picker and menu controls measured 44, 52 and 56 px high respectively. An automated selection of a newly generated synthetic PNG opened the native file chooser but `setFiles` was rejected because the Chrome automation extension lacks file-URL access. No file was selected or uploaded. The 390 px signed-in upload view, actual native camera/PDF selection, upload/retry, role switching, safe-area/enlarged-text and authorized read-back remain unverified; acceptance boxes stay open.

**Browser QA continuation — 2026-10-30:** With the web/API services available, Chrome showed the signed-in synthetic T09 household, the upload view's camera/image/PDF buttons, and its 20 MiB notice. A newly generated 1×1 synthetic PNG was prepared locally, but the browser file-chooser operation stalled and was interrupted; reconnecting browser control then reported a detached debugger. No selected-file state, upload request, saved-document result, or read-back was observed. The open acceptance boxes remain open.
