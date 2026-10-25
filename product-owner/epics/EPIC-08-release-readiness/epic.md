# EPIC-08: Release readiness

## Goal

Make the first usable release understandable, deployable, secure, and recoverable.

## Scope

- Versioned API documentation and client-facing contracts.
- Authorization, input validation, upload, and accounting security review.
- Health checks, logs, resource limits, and controlled database migrations.
- Deployment documentation and backups for PostgreSQL and private documents.
- Restore procedure and a tested recovery exercise.

## Acceptance criteria

- The documented API matches the implemented routes and response shapes.
- Cross-household access and duplicate-ledger scenarios are covered by integration checks.
- The deployment exposes only the intended public entry point.
- A restore recovers both database records and their document files.
