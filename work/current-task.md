# EPIC-04 closeout — 2026-10-30

- **Task:** [EPIC-04-T02 — Validated document upload](../product-owner/epics/EPIC-04-private-documents/tasks/EPIC-04-T02-validated-upload.md)
- **Status:** `closed by explicit user waiver` — the user directed that no more manual checks be performed and asked to close, commit, and push EPIC-04. This is not equivalent to verified completion.
- **Phase owner:** coordinator
- **Last completed step:** The T01 tester marked all acceptance and verification items complete: the canonical Compose storage reconciles with zero anomalies, all 30 `AVAILABLE` files match their metadata, restart persistence and a deliberately failed metadata write were checked, and direct public access was rejected. The two files missing from both roots were changed to `FAILED` under the user's approval while preserving their other metadata. The accepted T02 upload profile is JPEG/PNG/HEIC/HEIF/PDF, 20 MiB, and 10 attempts per user per minute.
- **Next step:** None for EPIC-04; the user explicitly waived further manual verification. Do not report open verification as passed.
- **Blocker:** Manual acceptance remains unverified for T02 interrupted-upload storage/log correlation; T04 request-correlated application-log privacy and timeout/retry; and T06/T07 signed-in role, upload/read-back, preview, pagination, and actual mobile picker/camera behavior. The user chose to close the epic without these additional checks.
- **Verification evidence:** See dated T01/T02/T04/T06/T07 task records. T01 includes the guarded 27-file recovery, two-row status repair, independent zero-anomaly reconciliation, failed-write detection/cleanup, API restart, FK/immutability checks, public-path rejection, API typecheck and lint. T02 small PNG returned `201`; oversized and chunked requests returned `413`; interrupted multipart left no document/ledger rows or staging files, although staging entry was unconfirmed. T04 same-household duplicate reuse, distinct copies across households, foreign-document `404`, and menu-away/menu-back passed. T06/T07 empty state at 320/390 CSS px had no overflow and visible controls were 44–56 px high. The new streaming route's focused security review found no issue, but did not run tests.

## Completed and parked tasks

- EPIC-03-T04 is completed; its resume record is preserved at `work/archive/EPIC-03-T04-monthly-dashboard.md`.
- EPIC-03-T09 is completed; its resume record is preserved at `work/archive/EPIC-03-T09-fixed-monthly-costs.md`.
- EPIC-04-T03 is completed; its resume record is preserved at `work/archive/EPIC-04-T03-authorized-document-access.md`.
- EPIC-04-T01 is completed; its acceptance and verification evidence is in its product-owner task file.
- EPIC-04-T04, T06, and T07 remain parked at `pending completion` in their respective `work/archive/` records. Their acceptance gaps remain open.
- EPIC-04-T05 is deferred to post-MVP and is not an EPIC-04 MVP release gate.
