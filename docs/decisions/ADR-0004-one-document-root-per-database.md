# ADR-0004: One private document root per database

**Status:** Accepted for the existing local test database; startup implementation and storage reconciliation are pending.
**Date:** 2026-10-30

## Context

ADR-0002 assigns `data/documents` to the host `pnpm dev` API and the private `document_data` named volume to the Compose API. `scripts/dev.sh` starts the host API against the same Compose PostgreSQL database. Document metadata is therefore shared while the original bytes are split between two roots. A read-only audit found 27 `AVAILABLE` originals only in the host root, two only in the Compose volume, and two metadata rows whose originals were absent from both roots. A later synthetic Compose upload is outside that snapshot.

## Decision

One database has one active API writer and one canonical private document root. For the existing local test database, the Compose API and its API-only `document_data` named volume are canonical. The development startup command will start Compose PostgreSQL and API, then run only the web app locally; it must not also start the host API against this database. The local web forwards authenticated requests to the Compose API. An exact configured `WEB_ORIGIN` must match the chosen desktop or phone URL; document access remains subject to current API membership and CSRF checks. Running a host API with hot reload requires a separate development database and its own private root.

This decision narrows the runtime choice in ADR-0002. It preserves ADR-0002's API-only named-volume storage boundary and does not change the document HTTP contract. The startup change is not an implemented fact until `scripts/dev.sh` and related configuration are updated and verified.

## Data reconciliation

Changing the startup command does not restore existing files. Before recovery, take recoverable snapshots of PostgreSQL metadata and both private roots and pause document writes. Recheck each `AVAILABLE` row's key, byte count and complete SHA-256 against its source. Copy a valid host-only original to an absent Compose target without overwriting, preserve its source, sync and reverify the target, then run read-only reconciliation. The two originals missing from both roots cannot be reconstructed by copying; retain their metadata until a separate, explicit status/recovery decision. No row deletion or status change is authorized by this ADR.

## Alternatives considered

- Continue both API runtimes on the shared database: rejected because reads and reconciliation depend on which private root serves a request.
- Bind-mount one host directory into Compose: simpler for hot reload, but changes ADR-0002's accepted named-volume boundary and host-path permissions.
- Give the host API a separate database: valid for future hot-reload work, but does not make the existing test database's split originals available through one API now.

## Consequences and security

The web cannot read the private volume; only the API can. The development API image must be rebuilt to pick up API source edits, and startup may be slower. Existing sessions and phone access depend on the exact configured origin; do not broaden allowed origins or forward storage keys to the browser. Recovery must preserve originals and stop on any size/hash mismatch or occupied target. PostgreSQL and the private volume remain a paired backup unit. The developer updates `scripts/dev.sh` and any narrow environment/Compose configuration; after implementation, update `docs/architecture.md` and review affected agent instructions and skill mappings for stale runtime assumptions.
