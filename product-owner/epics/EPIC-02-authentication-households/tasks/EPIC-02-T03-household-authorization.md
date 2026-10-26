# EPIC-02-T03: Enforce household authorization

## Goal and user value

Household data remains private even when another account knows a household or resource ID. OWNER, MEMBER and VIEWER receive only the operations the approved policy allows.

## Scope

Establish reusable API-side session, membership and operation checks for OWNER, MEMBER and VIEWER. The currently implemented `GET/POST /api/v1/households` collection routes have no household ID in the URL: any authenticated account may create a household and becomes its OWNER; the list returns only that account's memberships, regardless of its roles in those households. Later EPIC-02 and future household resource routes must adopt the policy as they are added. Resolve membership from the authenticated server session on every request; never trust a client-selected household ID or supplied role.

## Acceptance criteria

- [ ] Existing collection routes require a valid session; `GET /api/v1/households` includes only the caller's memberships, and `POST /api/v1/households` gives the signed-in creator OWNER regardless of any role in other households.
- [ ] A reusable policy for future ID-scoped routes loads current membership from the API database and applies the accepted response boundary: 401 without a session, 404 for a missing household or a caller who is not its member, and 403 for a member whose role cannot perform the operation. Responses do not reveal another household's existence.
- [ ] OWNER, MEMBER and VIEWER form the supported role set. Role-specific allow/deny behavior is verified when T04, T05 and T07 add operations with different permissions; T03 does not create artificial routes solely to demonstrate role differences.

## Verification

- [ ] In the existing local app with synthetic accounts, manually check `GET/POST /api/v1/households` with and without a session and confirm household lists are membership-scoped. Review the policy helper's current-membership lookup and 401/404/403 mapping; T04/T05/T07 manually verify role differences on their new routes. Do not add or run automated tests for this MVP work.
- [ ] Run lint/typecheck/build as implementation quality checks and record observed results.

## Dependencies

EPIC-02-T02 provides household membership and collection routes. Its PR #10 must first converge on the OWNER/MEMBER/VIEWER model. T04 is the first planned ID-scoped household route and depends on this reusable policy.

## Non-goals and open questions

This task does not implement future ledger, document or vehicle routes. Their tasks must call the established policy and validate linked records belong to the same household. T07 verifies changed or removed membership takes effect on the next request. OWNER manages household settings and invitations, MEMBER has ordinary later financial permissions, and VIEWER is read-only; detailed financial and member-management actions are defined in their own tasks.
