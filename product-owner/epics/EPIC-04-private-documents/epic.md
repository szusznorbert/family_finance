# EPIC-04: Private documents

**Status: Closed by explicit user decision — 2026-10-30.** The user instructed that EPIC-04 be closed without further manual checks. This is a scope/acceptance waiver, not a claim that the open manual acceptance criteria passed. The remaining task-level checkboxes and their recorded evidence remain unchanged.

## Goal

Store household receipts, bills, and vehicle documents privately and make them available only to authorized members.

## Scope

- Image and PDF upload validation.
- Private file storage with generated storage keys and persisted metadata.
- Authorized file streaming or short-lived access URLs.
- Duplicate detection in the MVP. Document backup/restore is deferred to post-MVP.
- A clear mobile entry point from the household overview for privately uploading a new photo or PDF, with an honest stored-only status.
- A private, household-scoped mobile document list with authorized image preview and PDF retrieval after upload.

## Acceptance criteria

- Uploads validate size, declared type, and file signature.
- Files have no permanent public URLs.
- A user outside the household cannot retrieve a file by guessing its ID.
- **Post-MVP (deferred):** Restoring the database and document storage restores linked files.
- A permitted member can add a private original from a phone and sees whether storage succeeded, without being told that receipt extraction or ledger posting happened.
- A permitted member can find a previously uploaded document in the current household and open a JPEG/PNG preview or retrieve a PDF without a public file URL.

## Task breakdown

The [EPIC-04 task plan](tasks/plan.md) records order, dependencies, manual checkpoints and unresolved policy decisions:

1. [EPIC-04-T01: Private storage and document metadata](tasks/EPIC-04-T01-private-storage-metadata.md)
2. [EPIC-04-T02: Validated upload](tasks/EPIC-04-T02-validated-upload.md)
3. [EPIC-04-T03: Authorized document access](tasks/EPIC-04-T03-authorized-document-access.md)
4. [EPIC-04-T06: Mobile document upload UI](tasks/EPIC-04-T06-mobile-document-upload-ui.md)
5. [EPIC-04-T07: Household document list and private preview](tasks/EPIC-04-T07-household-document-library-preview.md) — queued after T06, with separate API and web slices.
6. [EPIC-04-T04: Duplicate detection](tasks/EPIC-04-T04-duplicate-detection.md)
7. **Post-MVP, deferred:** [EPIC-04-T05: Document backup and restore](tasks/EPIC-04-T05-document-backup-restore.md) — retained for future planning; it is not an MVP release gate.

The task plan records implementation order and current verification state; a listed task is not automatically complete.
