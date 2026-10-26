# EPIC-02-T03: Enforce household authorization

## Goal and user value

Household data remains private even when another account knows a household or resource ID. Four roles receive only the operations the approved policy allows.

## Scope

Define an explicit VIEWER, MEMBER, ADMIN and OWNER operation matrix and enforce it in reusable API-side policy checks for household routes that exist when this task is implemented. Later EPIC-02 and future household resource routes must adopt this policy as they are added. Resolve membership from the authenticated server session on every request.

## Acceptance criteria

- [ ] Every household API route present at completion of this task authenticates the caller, checks membership in the URL household, then checks the operation against the approved role matrix; UI hiding alone cannot grant or deny access.
- [ ] A nonmember cannot read or mutate a household by supplying its ID, and inaccessible resource IDs return a consistent response that does not reveal whether another household's record exists.
- [ ] VIEWER, MEMBER, ADMIN and OWNER permissions have API-level allow/deny examples in focused tests; policy checks read current membership and do not rely on a stale client-supplied role.

## Verification

- [ ] Run a role-by-operation matrix against at least two synthetic households and multiple accounts, including direct API calls that bypass the UI.
- [ ] Exercise a foreign household ID and invalid session; run focused API checks and root lint/typecheck/build.

## Dependencies

EPIC-02-T02 provides household membership and real household routes to protect. Approve the role operation matrix before implementation.

## Non-goals and open questions

This task does not implement future ledger, document or vehicle routes. Their tasks must call the established policy and validate linked records belong to the same household. T07 verifies changed or removed membership takes effect on the next request. Confirm the proposed OWNER/ADMIN/MEMBER/VIEWER matrix, especially destructive actions and category management.
