# EPIC-01-T02: Establish a client-safe shared status contract

## Goal and value

Prove that the shared workspace package can safely carry a small contract used by both applications, without introducing backend-only dependencies into the browser.

## Scope

Use the existing backend status flow as the first shared API/web contract. Keep this task limited to the status response and the package boundary; do not add household business models.

## Acceptance criteria

- [x] `packages/shared` exports the status response contract used by the API and web instead of maintaining separate definitions.
- [x] The shared package contains no database, auth, filesystem, or server-only dependency reachable from the web bundle.
- [x] The existing backend status behavior remains functional, including handling a malformed or unavailable API response.

## Verification

- [x] Run focused typechecking/build checks for the shared package and both applications as appropriate.
- [x] Confirm the web receives and displays the API status through the existing same-origin proxy.

## Dependencies

EPIC-01-T01 establishes a known working local status flow.

## Likely files

`packages/shared/`, `apps/api/src/app/route.ts`, `apps/web/src/app/backend-status.tsx`, and workspace package configuration if required.

## Estimated scope

Medium.

## Verification record — 2026-10-25

- `pnpm install --lockfile-only --offline` added only the two `workspace:*` links to the lockfile. `CI=true pnpm install --frozen-lockfile` linked the shared package into both apps.
- `CI=true pnpm typecheck` passed for API and web; `CI=true pnpm build` produced both applications successfully. A focused Node.js assertion accepted a valid shared status payload and rejected null, arrays, missing fields, wrong status, and non-string service values.
- The running API and `/api/backend` proxy both returned HTTP 200 and the same `{ status: "ok", service: "household-finance-api" }` JSON. The browser displayed `Kapcsolódva: household-finance-api`.
- In an isolated temporary web checkout, a malformed local API response and a stopped API both displayed `A backend jelenleg nem érhető el.` The temporary test processes and checkout were removed without changing the regular dev servers.
- The changed web component also passed `CI=true pnpm --filter web lint`, root typecheck, and a focused web production build after its initial-fetch effect was adjusted to avoid synchronous state updates. The connected, malformed, and unavailable UI states were rechecked with the final code.
