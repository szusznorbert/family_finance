# Household Finance

Self-hosted household finance application for a Romanian household context, with RON as the default currency.

## Workspace

- `apps/web` — Next.js web application
- `apps/api` — Next.js REST API and backend services
- `packages/shared` — client-safe shared types and validation
- `infrastructure` — deployment configuration

The API will own database access, authorization, business rules, file access, and AI integrations. The browser will call the API and will not connect directly to PostgreSQL.

See [docs/architecture.md](docs/architecture.md) for the current repository structure, tools, data flow, and known gaps. Update it when those details change.

## Local development

Use Node.js 24.22.1 and pnpm 11.25.0 (`corepack enable` makes the workspace package manager available). Install workspace dependencies once with `pnpm install`, then start the full local development environment from the repository root:

```bash
./scripts/dev.sh
```

The script creates `.env` from `.env.example` if needed, fills the starter database password and auth secret, starts PostgreSQL, generates the Prisma client, applies the initial migration, and runs both apps. The web app is available on port 3000 and the API on port 3001. Press `Ctrl+C` to stop the apps; PostgreSQL remains running.

To run the setup steps manually, copy `.env.example` to `.env`, configure its values, start PostgreSQL with `docker compose up -d postgres`, generate the Prisma client with `pnpm --filter api prisma:generate`, and apply migrations with `pnpm --filter api exec prisma migrate dev --name init`.

The API uses Prisma ORM 7.10.1 with the PostgreSQL driver adapter and Better Auth 1.7.12. Prisma migrations are kept under `apps/api/prisma/migrations`.

Run `pnpm build`, `pnpm lint`, and `pnpm typecheck` from the repository root for the corresponding app checks.

For a containerized run, use `docker compose up --build -d`. The web and API ports bind to localhost; configure a reverse proxy separately for remote access.
