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

Use Node.js 24.22.1, pnpm 11.25.0, Python 3, and a running Docker Engine with Compose (`corepack enable` makes the workspace package manager available). Install workspace dependencies once with `pnpm install`, then start the full local development environment from the repository root:

```bash
./scripts/dev.sh
```

The script checks the required tool versions and Docker access before changing local state. It creates `.env` from `.env.example` if needed, fills the starter database password and auth secret, starts PostgreSQL, generates the Prisma client, applies the initial migration, and runs both apps. The web app is available on port 3000 and the API on port 3001. Press `Ctrl+C` to stop the apps; PostgreSQL remains running.

To run the setup steps manually, copy `.env.example` to `.env`, configure its values, start PostgreSQL with `docker compose up -d postgres`, generate the Prisma client with `pnpm --filter api prisma:generate`, and apply migrations with `pnpm --filter api exec prisma migrate dev --name init`.

The API uses Prisma ORM 7.10.1 with the PostgreSQL driver adapter and Better Auth 1.7.12. Prisma migrations are kept under `apps/api/prisma/migrations`.

Run these quality checks from the repository root:

| Command | Coverage |
|---|---|
| `pnpm lint` | Next.js ESLint rules for `apps/web`; TypeScript ESLint rules for `apps/api` and `packages/shared/src`. Generated API Prisma code and Next.js output are excluded. |
| `pnpm typecheck` | Separate TypeScript checks for `packages/shared`, `apps/api`, and `apps/web`. |
| `pnpm build` | Production builds for `apps/api` (Turbopack) and `apps/web` (Webpack); both consume the shared source package. |

`packages/shared` exports TypeScript source directly and has no standalone build artifact. The web app uses Tailwind through PostCSS so its development and production CSS are processed consistently. The web production build fetches Google Fonts and therefore needs network access.

For a containerized run, use `docker compose up --build -d --wait` to wait for healthy services. PostgreSQL becomes healthy before the API starts. On every API container start, `prisma migrate deploy` applies committed migrations; the API server starts only if that command succeeds. Repeating startup with an up-to-date schema is safe. Check migration failures with `docker compose logs api`; the API exits on failure and Compose's restart policy retries startup. Its health check cannot pass while migration is blocked.

The image build uses temporary API configuration without connecting to the database; runtime credentials come from Compose. The web image builds its proxy target as `http://api:3001`, because Next.js records rewrites during the build. Local Next.js output and generated Prisma files are excluded from the build context, and Prisma is generated inside the API image. The web and API ports bind to localhost; configure a reverse proxy separately for remote access.
