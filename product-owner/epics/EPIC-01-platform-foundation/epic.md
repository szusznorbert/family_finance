# EPIC-01: Platform foundation

## Goal

Establish the monorepo and repeatable local development and deployment foundation for the web app, API, and PostgreSQL database.

## Scope

- Separate Next.js applications for the web UI and REST API.
- pnpm workspace and client-safe shared package.
- Local PostgreSQL and application services through Docker Compose.
- Environment templates, linting, type-checking, and project documentation.

## Acceptance criteria

- A fresh checkout can install dependencies and start the web app, API, and database using documented commands.
- Web and API run as separate applications and containers.
- Credentials are supplied through local environment configuration and are not committed.

## Current state

The monorepo, web and API apps, PostgreSQL Compose service, local startup script, environment template, and architecture documentation exist. The epic's fresh-checkout and container startup outcomes have not yet been verified end to end. The shared package is currently an empty scaffold, and the root lint command runs only where a package already defines a lint script.

## Tasks

See the [implementation plan](tasks/plan.md) for order, dependencies, and the verification checkpoint.

1. [EPIC-01-T01: Verify a fresh local checkout](tasks/EPIC-01-T01-verify-local-bootstrap.md)
2. [EPIC-01-T02: Establish a client-safe shared status contract](tasks/EPIC-01-T02-shared-status-contract.md)
3. [EPIC-01-T03: Complete workspace quality checks](tasks/EPIC-01-T03-workspace-quality-checks.md)
4. [EPIC-01-T04: Make container startup migration-safe](tasks/EPIC-01-T04-container-startup-migrations.md)
