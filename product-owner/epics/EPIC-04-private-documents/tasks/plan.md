# EPIC-04 task plan — 2026-10-26

## Closeout — 2026-10-30

**EPIC-04 closed by explicit user decision.** The user directed that no further manual checks be performed and asked to close, commit, and push the epic. This waives the remaining manual acceptance work; it does not convert unverified checks into passes. T02 upload edge/storage checks, T04 request-correlated log and timeout/retry checks, and T06/T07 signed-in role/upload/read-back/preview/mobile checks remain unverified as recorded in their task files. T05 remains deferred post-MVP.

## Outcome and boundary

Provide durable, household-scoped private document storage for later receipt, bill and vehicle flows. A document is metadata plus a private original file; possession of its ID or storage key does not grant access. This epic establishes the reusable capability and a small mobile list/preview for uploaded originals. Receipt extraction, bill approval and vehicle details belong to their own epics.

## Order and dependencies

1. [EPIC-04-T01: Establish private storage and document metadata](EPIC-04-T01-private-storage-metadata.md) — choose the storage boundary, persist household-linked metadata and make the file store durable without a public URL.
2. [EPIC-04-T02: Accept validated document uploads](EPIC-04-T02-validated-upload.md) — use T01 to accept supported photos/PDFs from permitted household members, rejecting invalid or oversized files before exposing a usable document record.
3. [EPIC-04-T03: Read private documents with authorization](EPIC-04-T03-authorized-document-access.md) — return metadata and content only after a fresh household-membership check. T02 and T03 form the first complete upload/read checkpoint.
4. [EPIC-04-T06: Mobile document upload](EPIC-04-T06-mobile-document-upload-ui.md) — native photo/PDF selection and T02 private-upload status from the `Áttekintés`; implementation only after manual acceptance of T03 authorized reads. This is not OCR or ledger posting.
5. [EPIC-04-T07: Household document library and private preview](EPIC-04-T07-household-document-library-preview.md) — implementation closed by the user waiver; synthetic OWNER/MEMBER/VIEWER 320/390 px mobile QA and invalid cursor/pageSize HTTP checks remain unverified. Full work record is parked: [`work/archive/EPIC-04-T07-household-document-library-preview.md`](../../../../work/archive/EPIC-04-T07-household-document-library-preview.md). This is not OCR or ledger posting.
6. [EPIC-04-T04: Detect household duplicate files](EPIC-04-T04-duplicate-detection.md) — implementation closed by the user waiver. Migration application and request-correlated privacy/timeout/retry checks remain unverified.
7. **Post-MVP, deferred:** [EPIC-04-T05: Back up and restore private documents](EPIC-04-T05-document-backup-restore.md) — not started; retain its scope for future planning. It is not required for MVP acceptance or release.

T03 can be designed alongside T02 once T01's metadata and storage contract is stable. T04 follows the existing upload/read and document-list work; its immediate next step is migration application and synthetic runtime acceptance when an isolated synthetic database is available. T05 backup/restore is deferred post-MVP and is not an EPIC-04 MVP release gate. EPIC-05-T01 depends on validated upload and authorized read.

**T06/T07/T04 status — 2026-10-28:** The T02 upload API is implemented and synthetic HTTP smoke was performed; remaining T02 acceptance items stay in its task file. All three T03 metadata/content GET acceptance criteria and two-household manual verification are complete, with the record archived. T06's `pending completion` record is parked under `work/archive/`; signed-in 320/390 px manual acceptance remains open, so it is not completed. T07-B code is complete; synthetic role-specific 320/390 px mobile QA and the invalid cursor/pageSize 400 check remain open. The full T07 `pending completion` record was also archived while preparing T04; it is not completed. The user approved T04's same-household policy: identical bytes in one household do not create a second record and safely return an open option for the existing document; another household may upload its own copy, and concurrent requests resolve to one record. T04 implementation is complete, but its status remains `pending completion` because migration and runtime acceptance evidence are missing. T01 Compose named-volume persistence and database-constraint checks remain a separate open gate. T06/T07 do not depend on T04 policy. T05 backup/restore remains future operational work and is excluded from MVP acceptance.

**T04 verification status — 2026-10-28:** Implementation and static checks are complete, but migration `20261028100000_unique_available_document_hash_per_household` has not been applied and synthetic API/UI/concurrency acceptance smoke has not run. Therefore the task and `work/current-task.md` remain `pending completion`; this plan index does not mark T04 complete. The current writer spools the entire file to a private temporary file, then creates an `AVAILABLE` row directly; a new unfinalized failure leaves no `FAILED` Document row. Schema enums remain, and read-only reconciliation can still report orphan files.

## Manual checkpoints

- **After T02–T03:** In the existing local app/API, use synthetic image/PDF files and two synthetic households. Check a valid upload/read round trip, malformed signatures, unsupported or oversized files, 401 without a session, 403 for an authenticated role lacking write permission, and indistinguishable 404 responses for missing and foreign-household document IDs. Inspect that neither the file nor a permanent public URL is served directly from the web app.
- **After T06:** With synthetic OWNER/MEMBER/VIEWER accounts, manually check the dashboard's native camera/photo/PDF upload path at 320/390 px, success/error/retry status, selected-household isolation and T03 authorized readback. A saved document is clearly labeled as not yet extracted or posted to the ledger.
- **After T07:** With two synthetic households, verify paginated safe metadata, own JPEG/PNG preview and PDF retrieval, `VIEWER` read access, 401/404 isolation, household switch cleanup and 320/390 px list/preview. Keep T06's still-open upload QA distinct.
- **After T04:** Upload identical synthetic bytes twice in one household, then in another household. Confirm one household-scoped record per hash, a safe duplicate/open response in the first household, an independently created document in the second, and no cross-household existence disclosure. Repeat with near-simultaneous submissions.
- **Post-MVP, after T05 is resumed:** In a disposable synthetic local environment, back up and restore both PostgreSQL and document storage; retrieve restored bytes through the authorized endpoint and compare them with the original. Verify that a missing linked file is reported rather than shown as a successful restore. Preserve the user's real development data.

Static lint/typecheck/build checks may be used as implementation quality gates. Do not add or run an automated test suite in the current MVP workflow; record what was actually checked.

## Decisions before implementation

The MVP fixes privacy, signature/type/size validation, and duplicate detection as outcomes. Paired backup/restore remains a post-MVP outcome under deferred T05. Confirm remaining implementation constraints during task planning rather than treating proposals as accepted facts:

- **Resolved by ADR-0002:** T01 uses API-only private storage on a persistent Compose volume, with an ignored local development root. When post-MVP T05 resumes, it will need a deployment backup target and retention/encryption/access policy; upload size and request-rate limits are defined as a provisional MVP profile in T02, not as a permanent product decision.
- Supported photo formats, especially iPhone HEIC/HEIF, in addition to PDF; whether unsupported images are converted by the client or rejected with guidance.
- Whether `OWNER` and `MEMBER` may upload while `VIEWER` only reads, following the present financial-write/read matrix.
- **Decided 2026-10-28:** An exact-byte duplicate in the same household does not create a second document and safely identifies the existing document with an open action. Another household may independently upload the same bytes without learning about the first household. Concurrent duplicates must produce one deterministic record.
- Retention and deletion policy for originals referenced by receipts, bills or vehicle records. This epic does not introduce an unapproved delete endpoint.

## Coverage and non-goals

T01–T04, T06, and T07 cover the EPIC-04 MVP acceptance criteria, including the user-requested mobile upload and private document browsing. T05 is explicitly deferred post-MVP; its backup/restore criteria are not MVP release gates. Document content must remain private on disk or in object storage, in API responses, logs, browser caches and public asset paths. The storage key is an internal identifier, never an authorization token. Domain-specific receipt/bill/vehicle status and extraction remain in EPIC-05/06/07.
