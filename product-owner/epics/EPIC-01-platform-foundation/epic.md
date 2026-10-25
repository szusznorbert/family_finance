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
