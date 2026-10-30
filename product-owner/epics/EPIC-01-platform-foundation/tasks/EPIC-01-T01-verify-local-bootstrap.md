# EPIC-01-T01: Verify a fresh local checkout

## Goal and user value

Make the documented developer setup reproducible from a fresh checkout, so a new contributor can start the database, API, and web app without hidden manual steps.

## Scope

Verify and, where needed, correct the existing Node/pnpm setup, environment initialization, `scripts/dev.sh`, Prisma generation/migration flow, and local setup documentation.

## Implementation checklist

- [x] `scripts/dev.sh` checks Node.js, pnpm and Python prerequisites before changing local state and reports unsupported versions clearly.
- [x] Local `.env` initialization uses `.env.example`, generates starter secrets without tracking them, and starts PostgreSQL before Prisma generation/migration.
- [x] `README.md` documents prerequisites, install/start commands, service ports and the local migration flow.

## Acceptance criteria

- [x] From a fresh checkout with the documented prerequisites, dependency installation and `./scripts/dev.sh` bring up PostgreSQL, API, and web using the documented commands.
- [x] The web page and API respond, and the web's same-origin backend status check reaches the API successfully.
- [x] Local secrets are generated or supplied through ignored environment configuration; neither commands nor documentation require committing secret values. Setup failures identify the missing prerequisite or failed step.

## Verification checklist

- [x] Record the Node, pnpm, and Docker prerequisites used and the install/start commands actually run.
- [x] Confirm local responses on ports 3000 and 3001 and the `/api/backend` proxy path.
- [x] Confirm `.env` remains ignored and the resulting migration state is reported without exposing credentials.

## Dependencies

None. This establishes the baseline for the remaining EPIC-01 work.

## Likely files

`README.md`, `scripts/dev.sh`, `.env.example`, `docs/architecture.md`, and setup configuration only if a verified defect requires a change.

## Estimated scope

Medium. Verification may reveal a focused setup fix.

## Current status and evidence — verification record, 2026-10-25

- A fresh export of tracked repository files, with the updated startup script and no existing `node_modules` or `.env`, installed successfully using Node.js 24.22.1 and `pnpm install --frozen-lockfile` (pnpm 11.25.0). Docker Engine 28.4.0, Compose 2.39.2, and Python 3 were available. The offline install was blocked by a missing cached tarball; the normal lockfile install succeeded.
- A synthetic `.env` was supplied only in that temporary checkout. To preserve the existing project database, the test Compose file changed only PostgreSQL's host port from 5432 to 55432. The documented `./scripts/dev.sh` itself ran unchanged, generated the Prisma Client, applied `20261025113740_init`, and started the API and web on their default 3001/3000 ports.
- From that fresh checkout, the web page, API status route, and `/api/backend` proxy each returned HTTP 200; the status payload was `ok`. The same three responses returned HTTP 200 after the original project dev servers were restarted.
- The updated `dev.sh` stops before changing local state with a clear error on the machine's default Node.js 18.20.8. Bash syntax validation passed, and `.env` is ignored by Git. No credentials were printed or committed.
- The temporary checkout, test database container, and synthetic test volume were removed. The existing `family_finance` PostgreSQL service was not changed.
