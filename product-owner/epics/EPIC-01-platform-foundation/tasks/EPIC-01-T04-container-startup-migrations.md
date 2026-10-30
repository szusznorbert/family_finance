# EPIC-01-T04: Make container startup migration-safe

## Goal and user value

Make `docker compose up --build -d` usable with a fresh PostgreSQL volume by ensuring the API schema exists before the API reports ready.

## Scope

Define and implement a repeatable migration step for the Compose startup path, then document the resulting container workflow. Keep deployment infrastructure beyond local Compose outside this task.

## Implementation checklist

- [x] `Dockerfile` builds the API with Prisma Client generated from temporary build configuration, without requiring runtime credentials or a database connection.
- [x] API container startup runs `prisma migrate deploy` before starting the server and exits visibly on migration failure; Compose health checks depend on API readiness.
- [x] `docker-compose.yml` keeps PostgreSQL, API and web as separate services with readiness ordering, while `README.md` documents repeatable startup and migration diagnostics.

## Acceptance criteria

- [x] With a fresh local Compose database volume and valid local environment configuration, the startup path applies committed migrations before the API is considered ready.
- [x] Repeating startup is safe when migrations are already applied; a migration failure is visible and does not leave the API falsely healthy.
- [x] Web and API remain separate services, and no credential values are written into tracked files or startup logs.

## Verification checklist

- [x] Build and start the Compose stack against an isolated fresh local volume; record service and health status.
- [x] Verify the migration state and a web-to-API status request, then repeat startup to check idempotence.
- [x] Confirm failure behavior using a safe local test condition, without touching production or household data.

## Current status and evidence — verification record, 2026-10-25

Temporary test configuration under `/tmp/family-finance-t04-check/` supplied synthetic credentials, removed host port mappings, and tagged local test images. The projects `family_finance_t04_check` and `family_finance_t04_failure` used separate newly created PostgreSQL volumes.

- `docker compose --env-file /tmp/family-finance-t04-check/test.env -p family_finance_t04_check -f docker-compose.yml -f /tmp/family-finance-t04-check/compose.yml up --build -d --wait --wait-timeout 120`: passed; web, API, and PostgreSQL healthy.
- API logs confirmed `20261025113740_init` applied successfully. A read-only SQL query returned exactly one completed, non-rolled-back migration.
- A request from the web container to `http://127.0.0.1:3000/api/backend` returned HTTP 200 and `status: ok`. A synthetic, nonexistent user's sign-in request returned the expected HTTP 401 `INVALID_EMAIL_OR_PASSWORD`, exercising the API's Prisma database lookup.
- Repeated the same Compose command with `up -d --no-build --force-recreate --wait --wait-timeout 120`, retaining the volume: all services healthy, `No pending migrations to apply`, still exactly one completed migration, and web-to-API HTTP 200.
- Failure project: added a temporary read-only migration mount containing an intentional reference to a nonexistent table, with restart disabled only for observation. `up -d --no-build --wait --wait-timeout 90 api` failed as expected: Prisma `P3018` / PostgreSQL `42P01`, API `exited`, exit code 1, health `unhealthy`, no Next.js startup.
- Programmatic checks confirmed that test password/auth values were absent from API logs, build credentials were absent from image environment variables, and the API image did not contain `/workspace/.env`.
- Reviewed architect/developer/tester instructions and skill mappings: no role or version assumptions needed changing.
- Removed both disposable test stacks and their volumes with project-scoped `docker compose down --volumes`, then removed the two local test image tags.

## Dependencies

EPIC-01-T01 establishes the documented baseline; this task can be implemented independently of T02 and T03.

## Likely files

`docker-compose.yml`, `Dockerfile`, `apps/api/package.json`, `README.md`, and `docs/architecture.md`.

## Estimated scope

Medium.
