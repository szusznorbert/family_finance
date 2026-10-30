# EPIC-05-T01: Capture a private receipt draft

## Goal and user value

A permitted member can attach a photo or PDF to the correct household and start a receipt draft without exposing the file to another household.

## Scope

Create/list/view receipt drafts linked to private document storage. Show upload and processing status; no ledger posting yet.

## Implementation checklist

- [ ] Define receipt draft metadata/status and its relationship to one private EPIC-04 document without duplicating original bytes.
- [ ] Add household-scoped draft creation/list/read API operations that derive household and uploader from the current authorized session.
- [ ] Connect permitted photo/PDF upload to a private draft and expose safe upload/processing status; reject invalid files without creating an approved receipt or ledger entry.

## Acceptance criteria

- [ ] A permitted member uploads a valid photo/PDF and sees a draft receipt in the selected household; invalid size/type/signature fails safely.
- [ ] The original file remains private and reachable only through authorized access; a user from another household cannot read a known receipt or document ID.
- [ ] Upload failure does not leave a misleading approved receipt or a financial ledger entry.

## Dependencies

EPIC-02-T03 household authorization and the private upload/read capability from EPIC-04. Define the private-file retention boundary before implementation.

## Verification checklist

- [ ] In the existing local app, use synthetic files and two households to check upload, status, invalid input and cross-household ID access. No copies or automated tests.

## Non-goals and open questions

Extraction, item review and posting follow in later EPIC-05 tasks. File backup/restore follows the approved document/release plan.
