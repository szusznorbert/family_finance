# EPIC-01-T04: Make container startup migration-safe

## Goal and value

Make `docker compose up --build -d` usable with a fresh PostgreSQL volume by ensuring the API schema exists before the API reports ready.

## Scope

Define and implement a repeatable migration step for the Compose startup path, then document the resulting container workflow. Keep deployment infrastructure beyond local Compose outside this task.

## Acceptance criteria

- [ ] With a fresh local Compose database volume and valid local environment configuration, the startup path applies committed migrations before the API is considered ready.
- [ ] Repeating startup is safe when migrations are already applied; a migration failure is visible and does not leave the API falsely healthy.
- [ ] Web and API remain separate services, and no credential values are written into tracked files or startup logs.

## Verification

- [ ] Build and start the Compose stack against an isolated fresh local volume; record service and health status.
- [ ] Verify the migration state and a web-to-API status request, then repeat startup to check idempotence.
- [ ] Confirm failure behavior using a safe local test condition, without touching production or household data.

## Dependencies

EPIC-01-T01 establishes the documented baseline; this task can be implemented independently of T02 and T03.

## Likely files

`docker-compose.yml`, `Dockerfile`, `apps/api/package.json`, `README.md`, and `docs/architecture.md`.

## Estimated scope

Medium.
