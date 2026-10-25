# EPIC-01-T01: Verify a fresh local checkout

## Goal and value

Make the documented developer setup reproducible from a fresh checkout, so a new contributor can start the database, API, and web app without hidden manual steps.

## Scope

Verify and, where needed, correct the existing Node/pnpm setup, environment initialization, `scripts/dev.sh`, Prisma generation/migration flow, and local setup documentation.

## Acceptance criteria

- [ ] From a fresh checkout with the documented prerequisites, dependency installation and `./scripts/dev.sh` bring up PostgreSQL, API, and web using the documented commands.
- [ ] The web page and API respond, and the web's same-origin backend status check reaches the API successfully.
- [ ] Local secrets are generated or supplied through ignored environment configuration; neither commands nor documentation require committing secret values. Setup failures identify the missing prerequisite or failed step.

## Verification

- [ ] Record the Node, pnpm, and Docker prerequisites used and the install/start commands actually run.
- [ ] Confirm local responses on ports 3000 and 3001 and the `/api/backend` proxy path.
- [ ] Confirm `.env` remains ignored and the resulting migration state is reported without exposing credentials.

## Dependencies

None. This establishes the baseline for the remaining EPIC-01 work.

## Likely files

`README.md`, `scripts/dev.sh`, `.env.example`, `docs/architecture.md`, and setup configuration only if a verified defect requires a change.

## Estimated scope

Medium. Verification may reveal a focused setup fix.
