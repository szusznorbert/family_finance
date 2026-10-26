# EPIC-02-T03: Enforce household authorization

## Goal and user value

Household data remains private even when another account knows a household or resource ID. OWNER, MEMBER and VIEWER receive only the operations the approved policy allows.

## Scope

Establish reusable API-side session, membership and operation checks for OWNER, MEMBER and VIEWER. The helper's coarse operations are `read` (all three roles), `financial-write` (OWNER and MEMBER), and `manage` (OWNER only); later resource tasks may define narrower operations within these limits. The currently implemented `GET/POST /api/v1/households` collection routes have no household ID in the URL: any authenticated account may create a household and becomes its OWNER; the list returns only that account's memberships, regardless of its roles in those households. Later EPIC-02 and future household resource routes must adopt the policy as they are added. Resolve membership from the authenticated server session on every request; never trust a client-selected household ID or supplied role.

## Pre-implementation planning record — 2026-10-26

- **Bounded scope:** Preserve the existing collection behavior and introduce a reusable API-side authorization boundary for future ID-scoped household routes. `GET/POST /api/v1/households` already use the Better Auth server session; `GET /api/v1/me` is account-level and has no household-role check. Do not add a new business endpoint, UI role controls or financial-resource policy in this task.
- **Likely files and order:** Read the existing session pattern in `apps/api/src/app/api/v1/households/route.ts` and `apps/api/src/app/api/v1/me/route.ts`. Define a focused server-only policy module under `apps/api/src/` that takes the authenticated user and target household ID, reads current `HouseholdMember` from Prisma, and checks an operation against OWNER/MEMBER/VIEWER. Adapt the existing collection route only if needed to share session/error handling without changing its response contract. Update `docs/architecture.md` once the helper exists. No Prisma schema or migration change is expected.
- **Dependency and risk:** T02 and its corrective role migration are merged; `HouseholdRole` is OWNER/MEMBER/VIEWER. A browser-selected household ID in local storage is only a preference, not authority. A stale role in a session or request must never replace the current database membership. Resolve 401 before any membership lookup; for a target ID, return the same 404 for nonexistent and foreign households, then 403 only when a real member lacks the operation permission. Avoid leaking another household's existence through message or response shape.
- **Manual verification:** In the already running local app, use synthetic accounts A and B with separate households. Confirm A's and B's `GET /api/v1/households` responses contain only their own memberships; `GET` and `POST /api/v1/households` without a session return 401; a signed-in account can create a new household as OWNER regardless of its role in any other household. Inspect the helper's fresh-membership lookup and 401/404/403 mapping. There is no current ID-scoped route on which to observe 404 or 403, so T04/T05/T07 must manually verify those responses and role-specific allow/deny through their real endpoints. Use synthetic local data in place; do not add or run automated tests. Lint/typecheck/build are separate quality checks.
- **Open decisions:** None for this bounded task. The role set and 401/404/403 boundary are accepted; ownership transfer and detailed future financial permissions belong to later tasks.

## Acceptance criteria

- [x] Existing collection routes require a valid session; `GET /api/v1/households` includes only the caller's memberships, and `POST /api/v1/households` gives the signed-in creator OWNER regardless of any role in other households.
- [x] A reusable policy for future ID-scoped routes loads current membership from the API database and applies the accepted response boundary: 401 without a session, 404 for a missing household or a caller who is not its member, and 403 for a member whose role cannot perform the operation. Responses do not reveal another household's existence.
- [x] OWNER, MEMBER and VIEWER form the supported role set. Role-specific allow/deny behavior is verified when T04, T05 and T07 add operations with different permissions; T03 does not create artificial routes solely to demonstrate role differences.

## Verification

- [x] In the existing local app with synthetic accounts, manually check `GET/POST /api/v1/households` with and without a session and confirm household lists are membership-scoped. Review the policy helper's current-membership lookup and 401/404/403 mapping; T04/T05/T07 manually verify role differences on their new routes. Do not add or run automated tests for this MVP work.
- [x] Run lint/typecheck/build as implementation quality checks and record observed results.

Implementation verification recorded 2026-10-26: synthetic account A listed only its three households, all owned by A; synthetic account B listed only the household B created after signing in, with OWNER role. UI-created household B showed the nine categories and OWNER. No-session `GET` and `POST /api/v1/households` each returned 401 `UNAUTHENTICATED`. The helper code was reviewed to confirm every call checks Better Auth session first, then queries the compound `(householdId, userId)` membership key directly from Prisma and applies the operation-role map. This lookup gives the same 404 status/body for missing and nonmember household IDs; a member lacking the requested operation receives 403. There is no ID-scoped business route yet, so 404/403 behavior was not exercised through a fake endpoint; T04/T05/T07 must verify the policy through real routes. `apps/api` and `apps/web` typecheck passed; web and API/shared ESLint passed; `apps/api` `next build` and `apps/web` `next build --webpack` passed. An initial direct web `next build` (Turbopack) attempt failed because its CSS worker could not bind an internal port; the configured webpack build passed. No automated tests were added or run.

## Dependencies

EPIC-02-T02 and its corrective PR #11 are merged, providing household membership, OWNER/MEMBER/VIEWER and collection routes. T04 is the first planned ID-scoped household route and depends on this reusable policy.

## Non-goals and open questions

This task does not implement future ledger, document or vehicle routes. Their tasks must call the established policy and validate linked records belong to the same household. T07 verifies changed or removed membership takes effect on the next request. OWNER manages household settings and invitations, MEMBER has ordinary later financial permissions, and VIEWER is read-only; detailed financial and member-management actions are defined in their own tasks.
