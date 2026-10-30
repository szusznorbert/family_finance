# EPIC-01 implementation plan

## Overview

The task records report completion of the platform foundation: reproducible local setup, a client-safe shared status contract, quality checks across code workspaces, and migration-safe container startup. Their evidence is dated primarily 2026-10-25; the 2026-10-28 status summary below is a documentation reconciliation, not a fresh verification run.

## Current status and evidence — 2026-10-28

All four task files record their acceptance and verification checklists as complete (22 checked, none unchecked). Their dated evidence records report a fresh local checkout (T01), a shared API/web status contract (T02), root workspace quality checks (T03), and fresh/repeated/failing Compose migration startup scenarios on disposable volumes (T04), primarily verified on 2026-10-25. This summarizes the task records; it is not a fresh rerun of those checks.

### Historical planning snapshot — before implementation

- `apps/web/` and `apps/api/` are separate Next.js applications; Compose defines separate web, API, and PostgreSQL services.
- At this snapshot, a fresh checkout had not yet been verified as part of the planning pass.
- `packages/shared/src/index.ts` was empty; the web defined its backend status response type locally.
- The root `lint` command used `--if-present`, while only the web package defined a lint script.
- The API package had a `db:deploy` command, but Compose started the API after database health without running migrations.

## Task order

1. [EPIC-01-T01: Verify a fresh local checkout](EPIC-01-T01-verify-local-bootstrap.md) — establish the local baseline and correct any setup defects found.
2. [EPIC-01-T02: Establish a client-safe shared status contract](EPIC-01-T02-shared-status-contract.md) — exercise the shared package through the existing API/web status flow.
3. [EPIC-01-T03: Complete workspace quality checks](EPIC-01-T03-workspace-quality-checks.md) — make lint/typecheck/build coverage explicit across all code workspaces.
4. [EPIC-01-T04: Make container startup migration-safe](EPIC-01-T04-container-startup-migrations.md) — prove a fresh Compose deployment reaches a schema-ready API.

T02 and T03 can proceed independently after the baseline is understood. T04 can be implemented independently, then verified against the same documented setup expectations.

## Recorded epic checkpoint

The T01 and T04 verification records document a fresh checkout and a fresh Compose database volume, respectively. The commands, observed web/API responses, and environment limits are recorded in those task files. This summary does not claim a new epic-level verification pass.

## Risks and open questions

- Docker Desktop or another Docker Engine must be running for the local and container checks; a Docker daemon failure is an environment issue to report separately.
- T04's migration/readiness mechanism is implemented and documented; the task outcome was specified without prescribing a fixed mechanism.
- Keep the scope to the foundation. Household business models, login UI, remote deployment, reverse proxy, and full automated test coverage belong to later epics.
