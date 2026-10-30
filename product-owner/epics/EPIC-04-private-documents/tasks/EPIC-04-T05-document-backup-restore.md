# EPIC-04-T05: Back up and restore private documents

> **Status: Deferred post-MVP by user decision (2026-10-28).** This task is retained for future planning; it is not an MVP requirement or release gate. Its scope, checklist, and open policy questions remain for when the task is resumed.

**MVP phase: `post-MVP` — explicitly deferred by the user.**

## Goal and value

A household's receipt, bill and vehicle originals remain recoverable together with the database records that refer to them.

## Scope

- Document and implement the backup boundary for PostgreSQL plus the selected private file store. Provide a repeatable restore procedure in a disposable local environment, including a consistency check for linked metadata and file bytes.
- Ensure operational configuration retains document bytes across rebuilds/restarts and does not rely on a container's ephemeral writable layer. Protect backup material as private household data.
- Define how the operator detects and reports missing or corrupt linked files after restore; avoid claiming success from a database-only restore.

## Implementation checklist

- [ ] Implement the backup/restore process and runbook; policy and disposable synthetic environment are not yet defined.

## Acceptance criteria

- [ ] A synthetic backup includes both database metadata and private originals; restoring both yields the expected document IDs and exact original bytes through the authorized access path.
- [ ] A database-only or file-incomplete restore is identified as incomplete, with missing linked files reported rather than silently treated as available.
- [ ] The runbook identifies where the private store and backup live, who can access them, and how to perform and verify a restore without exposing files via public URLs or logs.

## Dependencies

T01 persistent storage decision and working T02/T03 upload/read path. Coordinate with EPIC-08 release backup/recovery work; EPIC-04 supplies the document-specific procedure and evidence.

## Verification checklist

- [ ] Back up and restore only synthetic local data in a disposable environment. Compare restored bytes/hash with originals, retrieve via the authorized API, then deliberately omit one synthetic file and confirm the consistency check fails visibly. Do not overwrite the user's active development data or add automated tests.

## Non-goals and open questions

No production deployment or cloud disaster-recovery service in this task. Decide backup destination, retention and encryption/access policy with the deployment owner before implementing operational scripts.

## Current status — deferred post-MVP

**Status: `deferred` (post-MVP; not started).** No T05 implementation, runbook, backup, restore, or synthetic verification is recorded. T01 selected the API-only persistent Compose volume, but that volume's restart persistence and database FK/immutability checks remain unverified. T02/T03 provide upload/read code and partial/full evidence respectively; T02 acceptance remains open, and T03's synthetic read acceptance is complete.

**Open policy before implementation:** the deployment owner must choose backup destination, retention, encryption and access policy. Coordinate the document-specific runbook with EPIC-08. Do not treat the local persistent volume as an off-host backup.

**Open verification:** plan a disposable synthetic environment, backup PostgreSQL plus the private document volume, restore and read exact bytes through T03, then omit one synthetic file and verify reconciliation reports the missing linked file. No real household data or active database may be used for destructive restore checks. Begin the task-level planning pass before implementation; none is recorded yet.
