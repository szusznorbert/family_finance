# EPIC-02-T06: Accept household invitations

## Goal and user value

A signed-in holder of a valid invitation link can join the correct household without receiving broader access than was offered.

## Scope

Resolve the privately forwarded bearer link in the web, require sign-in under open email/password registration, and redeem the invitation through the API. Possession of the link is sufficient; the OWNER-entered e-mail does not restrict the accepting account. Membership creation and invitation consumption must succeed or fail together, including concurrent requests.

## Pre-implementation planning record — 2026-10-26

- **Bounded scope and order:** Build one acceptance path on top of T05's issued invitation: resolve the bearer token, require a signed-in account, redeem it through the API, create exactly one membership with the invitation's MEMBER or VIEWER role, and make the resulting household selectable in the existing household list. T06 does not issue/revoke invitations or manage existing members; those belong to T05 and T07 respectively.
- **Likely files:** Add an API redemption route under `apps/api/src/app/api/v1/invitations/` (the opaque token identifies the invitation, so the request must not accept a caller-supplied household or role). Add an acceptance page and client flow under `apps/web/src/app/invitations/accept/`; coordinate with `apps/web/src/app/auth-form.tsx` and the login/registration pages so a signed-out link holder can authenticate and return to acceptance safely. Reuse `apps/api/src/lib/household-authorization.ts` only for operations that already have a household ID; the acceptance route must derive the household and invited role from the matched invitation record. Use `apps/api/prisma/schema.prisma`'s T05 invitation and household-member constraints; add a migration only if implementation evidence shows the existing schema cannot enforce the accepted invariant. Update `docs/architecture.md` after the flow is implemented.
- **Acceptance transaction and token handling:** Hash the submitted raw token with the same algorithm as T05 and look up only the verifier; do not trust household ID, user ID or role from the client. In one database transaction, verify the record is PENDING and unexpired, check current membership, create the membership and transition the invitation to ACCEPTED. The member unique key and a conditional invitation-state transition must make concurrent redemption single-use. If the signed-in user is already a member, return 409 without changing that membership or the role and without consuming/revoking the still-valid invitation. Expired, revoked, used, malformed or unknown tokens create no membership and return safe, non-secret error details. Do not log the bearer token; avoid retaining it in browser storage or after the acceptance flow, and remove it from the visible URL once the flow safely retains what it needs in memory. Responses should be `no-store`.
- **Authorization and privacy:** Require a current Better Auth session before redemption; return 401 without one. This endpoint is token-scoped rather than household-ID-scoped, so it must not reveal whether a supplied household exists. A valid token holder may accept regardless of account e-mail. The role comes exclusively from the invitation and can only be MEMBER or VIEWER; an invite can never create OWNER. On success, return only safe household/member metadata needed to show the result and refresh the signed-in user's household list. Keep foreign household data inaccessible through the existing T03 membership policy.
- **Manual verification:** After T05's migration is applied and its API is available in the local development app, use synthetic accounts and households to check a newly registered and an existing signed-in account, including an account whose e-mail differs from the informational label. Verify success adds the correct role and household to selection; replay, malformed, expired, revoked and consumed tokens add no membership; an existing member gets 409 with membership/role unchanged and the invitation still pending; concurrent requests yield at most one success; no session gets 401; and unrelated household access remains denied. In the browser, verify signed-out link holders can sign in/register and return to acceptance, the token does not appear in API logs/errors, and safe success/failure messages render. Run lint/typecheck/build as quality checks; do not add or run automated tests for this MVP task.
- **Dependencies, risks and open decisions:** T05 must be integrated and manually verified first; its invitation migration must be applied locally before exercising redemption. No product decision remains open: the user approved 2026-10-26 that an existing member receives 409, keeps the existing role, and leaves the invitation pending. Main risks are transaction races, leaking a bearer token through URL/history/logging, unsafe post-auth redirects, and accidentally trusting client-provided role or household identifiers. Runtime verification is currently blocked until the machine provides the Node.js 24.22.1 version in `.nvmrc` and the local API/database are available; T05 explicitly records that its migration and runtime checks remain pending.

## Implementation checklist

- [x] `apps/api/src/app/api/v1/invitations/accept/route.ts` validates the stored token verifier and atomically claims a pending, unexpired invitation.
- [x] Acceptance transaction creates only MEMBER/VIEWER membership and handles replay, existing membership and concurrent redemption.
- [x] `apps/web/src/app/invitations/accept/invitation-acceptance.tsx` keeps the secret in the URL fragment until client-side handling/scrubbing on the invitation-specific route.

## Acceptance criteria

- [x] A signed-in account can accept a currently valid, unrevoked invitation that is within its seven-day validity window.
- [x] Successful acceptance grants only the MEMBER or VIEWER role stored on the invitation; it never grants OWNER.
- [x] The accepting account's e-mail may differ from the informational e-mail entered by the OWNER.
- [x] Successful acceptance creates membership in the invited household.
- [x] The new member can select the household, and that selection persists after reload.
- [x] An invitation can be accepted only once; replay cannot create another membership.
- [ ] An invalid or malformed token creates no membership and produces a safe, useful outcome.
- [ ] An expired token creates no membership and produces a safe, useful outcome.
- [x] A revoked token creates no membership and produces a safe, useful outcome.
- [x] A reused token creates no additional membership and produces a safe, useful outcome.
- [x] Token lookup uses the stored hash/verifier rather than exposing or persisting the secret.
- [ ] The token is not exposed in logs or error responses.
- [x] Simultaneous acceptance attempts create at most one membership and one accepted invitation state.
- [x] Acceptance by an account already in the household returns 409.
- [x] The 409 response changes neither the existing membership nor its role.
- [x] After a 409, the invitation remains pending and another valid link holder can accept it.
- [ ] A pending invitation remains redeemable after the 409 until successfully redeemed, expired, or revoked.
- [ ] After acceptance, access to any other household remains governed by that household's separate membership.

### Acceptance criteria decomposition note — 2026-10-28

Old criterion 1 was split into criteria 1–4 and 6; old criterion 2 was split into criteria 7–12; old criterion 3 was split into criteria 13–17; and old criterion 4 was split into criteria 5 and 18. All resulting atomic acceptance items were initially unchecked for Tester reconciliation; the evidence mapping below records later supported items. The former checked state of old criteria 1 and 3 is retained here as history only; no atomic item is marked complete. Existing implementation evidence and verification records are unchanged.

### Evidence reconciliation — 2026-10-28

- Checked 1–6, 9–11 and 13–16 from the 2026-10-26 synthetic MEMBER/VIEWER acceptance, different e-mail, persisted selection, replay/revocation, hash-only token handling, concurrent [201, 410] outcome and existing-member 409 followed by another holder's success. This is a mapping of recorded evidence, not a rerun.
- Left 7 open because the unknown valid-shaped token was tested but malformed input was not recorded; 8 because expiry was not exercised; 12 because server logs were not inspected; 17 because the post-409 expiry/revocation limits were not exercised; and 18 because separate foreign-household access after acceptance was not directly checked.

## Verification checklist

- [x] Test acceptance by newly registered accounts whose e-mail differs from the informational address; MEMBER and VIEWER membership and role appeared in the selectable household list and persisted after a reload.
- [x] Test token replay, revocation, concurrent acceptance and an existing member's 409 outcome in the local synthetic database; confirm only one successful redemption, no role escalation and an unchanged pending link after the 409. API/web typecheck and targeted lint passed.
- [ ] Test an expired invitation. This manual case remains open at the user's request; API/server log inspection and a root production build are not recorded.

## Implementation record — 2026-10-26

- Added `POST /api/v1/invitations/accept`. It requires a current Better Auth session, the configured same-origin JSON mutation guard, and a single 43-character base64url token. The API hashes the token for lookup, trusts the stored household and `MEMBER`/`VIEWER` role only, and transactionally claims an unexpired `PENDING` invitation before inserting membership. The member unique key and conditional invitation update prevent multiple redemptions; an existing member gets `409` before the invitation state changes.
- Added `/invitations/accept` with inline sign-in/registration so the token need not pass through another URL or browser storage. The copyable link carries the token in its URL fragment; the browser does not send fragments to the web server. The client reads the fragment into memory and immediately removes it from history. The page applies `no-referrer`, and the raw token is not returned by the API or stored in browser storage.
- **Manual verification — 2026-10-26:** With synthetic local accounts, the app issued a MEMBER invitation to an informational e-mail different from the accepting account; inline registration stayed on the acceptance page and redemption succeeded. The new MEMBER appeared in the selectable household list and survived reload. A separate VIEWER account accepted a VIEWER link and saw the same persisted household selection. An OWNER already in the household received `409`; a MEMBER already in the household also received `409` for another invitation and retained the existing role, after which a different account accepted that still-pending link. Replaying the accepted link returned `410`. A revoked invitation and an unknown valid-shaped token both returned `410`; no-session POST returned `401`. Two concurrent requests for one invitation returned `[201, 410]`, produced one MEMBER membership, and did not duplicate membership. The invitation list did not contain the raw token. The browser URL was fragment-free after page hydration, auth, success and replay; the new-account flow did not carry the token through another URL or browser storage.
- **Still open:** The expired-invitation manual case was not run and remains open at the user's request. API/server log inspection and a root production build are also not recorded here. An earlier direct database fixture-expiry/cleanup attempt was rejected by automatic approval review before execution and changed no data; the later approved cleanup is recorded below.
- **Fixture cleanup — 2026-10-26 (developer final report):** With the user's approval, the T06 synthetic household and four T06 synthetic users were removed in one database transaction. An exact post-cleanup verification passed. The T04 and T07 data were unaffected.
- Static checks run after the final token-fragment change: API and web `tsc --noEmit`, targeted ESLint for T05 invitation creation and T06 acceptance route/UI, and `git diff --check` passed. No automated test suite was added or run.

## Dependencies

EPIC-02-T05. Open registration and manual bearer-link forwarding are approved MVP decisions.

## Non-goals and open questions

An existing membership is never changed through an invitation. The OWNER-entered e-mail is informational only. The UI should encourage private link sharing because forwarding the link lets a different signed-in user redeem it.
