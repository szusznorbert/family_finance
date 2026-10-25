# EPIC-01-T02: Establish a client-safe shared status contract

## Goal and value

Prove that the shared workspace package can safely carry a small contract used by both applications, without introducing backend-only dependencies into the browser.

## Scope

Use the existing backend status flow as the first shared API/web contract. Keep this task limited to the status response and the package boundary; do not add household business models.

## Acceptance criteria

- [ ] `packages/shared` exports the status response contract used by the API and web instead of maintaining separate definitions.
- [ ] The shared package contains no database, auth, filesystem, or server-only dependency reachable from the web bundle.
- [ ] The existing backend status behavior remains functional, including handling a malformed or unavailable API response.

## Verification

- [ ] Run focused typechecking/build checks for the shared package and both applications as appropriate.
- [ ] Confirm the web receives and displays the API status through the existing same-origin proxy.

## Dependencies

EPIC-01-T01 establishes a known working local status flow.

## Likely files

`packages/shared/`, `apps/api/src/app/route.ts`, `apps/web/src/app/backend-status.tsx`, and workspace package configuration if required.

## Estimated scope

Medium.
