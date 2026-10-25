# EPIC-01 implementation plan

## Overview

The platform foundation is partly implemented. Complete the epic by proving the documented local setup from a fresh checkout, using the shared package across the web/API boundary, covering every code workspace with quality checks, and making first-time container startup apply the database schema before the API becomes ready.

## Current evidence

- `apps/web/` and `apps/api/` are separate Next.js applications; Compose defines separate web, API, and PostgreSQL services.
- `scripts/dev.sh`, `.env.example`, `README.md`, and `docs/architecture.md` describe local setup. A fresh checkout has not been verified as part of this planning pass.
- `packages/shared/src/index.ts` currently exports nothing; the web defines its backend status response type locally.
- The root `lint` command uses `--if-present`, while only the web package currently defines a lint script.
- The API package has a `db:deploy` command, but Compose starts the API after database health without running migrations.

## Task order

1. [EPIC-01-T01: Verify a fresh local checkout](EPIC-01-T01-verify-local-bootstrap.md) — establish the local baseline and correct any setup defects found.
2. [EPIC-01-T02: Establish a client-safe shared status contract](EPIC-01-T02-shared-status-contract.md) — exercise the shared package through the existing API/web status flow.
3. [EPIC-01-T03: Complete workspace quality checks](EPIC-01-T03-workspace-quality-checks.md) — make lint/typecheck/build coverage explicit across all code workspaces.
4. [EPIC-01-T04: Make container startup migration-safe](EPIC-01-T04-container-startup-migrations.md) — prove a fresh Compose deployment reaches a schema-ready API.

T02 and T03 can proceed independently after the baseline is understood. T04 can be implemented independently, then verified against the same documented setup expectations.

## Checkpoint

After all four tasks, verify the epic acceptance criteria from a fresh checkout and a fresh Compose database volume. Record the exact commands, observed web/API responses, and any remaining environment-specific limits. Use only synthetic data and local/test databases.

## Risks and open questions

- Docker Desktop or another Docker Engine must be running for the local and container checks; a Docker daemon failure is an environment issue to report separately.
- Decide how container startup coordinates migrations and API readiness as part of T04; the outcome is specified, not a fixed implementation mechanism.
- Keep the scope to the foundation. Household business models, login UI, remote deployment, reverse proxy, and full automated test coverage belong to later epics.
