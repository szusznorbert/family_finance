# EPIC-04: Private documents

## Goal

Store household receipts, bills, and vehicle documents privately and make them available only to authorized members.

## Scope

- Image and PDF upload validation.
- Private file storage with generated storage keys and persisted metadata.
- Authorized file streaming or short-lived access URLs.
- Duplicate detection and document backup/restore coverage.

## Acceptance criteria

- Uploads validate size, declared type, and file signature.
- Files have no permanent public URLs.
- A user outside the household cannot retrieve a file by guessing its ID.
- Restoring the database and document storage restores linked files.
