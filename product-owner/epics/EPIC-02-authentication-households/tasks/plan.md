# EPIC-02 implementation plan

## Overview

Deliver a complete authenticated household flow: a person can sign in, create and choose a household, invite another person, and use only the households and operations their membership permits. The API remains the authority for identity, membership and role checks. The eight tasks below are planning proposals; no application behavior is implemented by this plan.

## Current evidence — 2026-10-28

This summary reflects the dated implementation and verification records in the task files; it does not independently mark acceptance complete. T01 and T03 have all recorded acceptance and verification items checked. T02 has successful household creation/list/selection, role, currency, category, isolation and invalid-input evidence, but its acceptance items remain unchecked and forced transaction rollback was not manually exercised. T04's acceptance and verification items are checked with synthetic role, isolation, CSRF, validation and reload evidence. T05's runtime/browser verification is partial: invitation roles, expiry, token handling, replacement/revocation and basic copy flow are recorded; concurrent issue/replace, household-switch state clearing, log inspection and the forwarding warning remain open. T06 records successful, replay, revoked, existing-member and concurrent redemption checks; the expired-link case, server-log inspection and production build remain open. T07 has implementation/static evidence and a limited read-only UI/API pass; mutation, last-OWNER, audit and concurrency verification remain open. T08's form structure and hydrated auth flow are checked, while direct no-JavaScript network/history/log verification remains open. No EPIC-02 work archive or active work/current-task record was present during this documentation review.

## Historical evidence snapshot — 2026-10-26

- T01 provides Better Auth email/password, web registration/sign-in and session access; the web proxies `/api/auth/*` and `/api/v1/*` to the separate API.
- T02 PR #10 and its corrective PR #11 are merged. The Prisma `HouseholdRole` enum now contains OWNER, MEMBER and VIEWER; the earlier ADMIN value was removed through a follow-on migration that preserved existing household data.
- `GET /api/v1/households` reads the authenticated user's memberships and returns only those households. `POST /api/v1/households` requires a session and atomically creates a RON household, the creator's OWNER membership and nine default categories. `GET /api/v1/me` is account-level.
- At this snapshot, there was no ID-scoped household business route or reusable household policy helper yet. The browser's selected household ID was a local preference, not authorization.
- The accepted three-role model supersedes the attached technical specification's four-role suggestion.

## Task order and dependencies

1. [EPIC-02-T01: Establish account access and session flow](EPIC-02-T01-account-session-flow.md) — open email/password sign-up and sign-in, sign out, and recover session state in the web and API.
2. [EPIC-02-T02: Create and select households](EPIC-02-T02-create-select-households.md) — create a household with its first OWNER and default categories, and list/select a user's households.
3. [EPIC-02-T08: Protect credential forms from native GET submission](EPIC-02-T08-protect-native-auth-form-submission.md) — urgent T01 security fix before wider authentication testing or external exposure.
4. [EPIC-02-T03: Enforce household authorization](EPIC-02-T03-household-authorization.md) — establish session/membership checks and a reusable three-role API policy for later ID-scoped routes.
5. [EPIC-02-T04: View and update household settings](EPIC-02-T04-household-settings.md) — provide household detail and permitted name changes; keep currency fixed to RON.
6. [EPIC-02-T05: Issue household invitations](EPIC-02-T05-issue-invitations.md) — let an OWNER create, privately forward and revoke a secure, expiring invitation link for an approved role.
7. [EPIC-02-T06: Accept household invitations](EPIC-02-T06-accept-invitations.md) — let a signed-in link holder redeem a valid invitation once and join the correct household.
8. [EPIC-02-T07: Manage household members](EPIC-02-T07-manage-members.md) — list members, remove members and handle self-leave with last-OWNER transfer; no general role editing.

T08 depends only on T01 and can be fixed independently of T03; its task ID reflects discovery order, while its execution comes before further credential-flow testing or external exposure. T04 and T05 can be developed independently after T03 if they coordinate API contracts. T07 can start after T03 independently of the invitation screens, but its integration verification depends on T06.

**T02 pre-implementation planning pass — 2026-10-26:** Keep T02 as one bounded household-onboarding vertical slice. It depends on the T01 session and `/api/v1/*` proxy flow; implement persistence/transaction first, then authenticated create/list API, then the web create/list/select UI. The [T02 task record](EPIC-02-T02-create-select-households.md) names likely files, authorization and rollback risks, and exact manual checks in the already running local app with synthetic data. There is no new blocking product decision. Product-level receipt items and price history remain in EPIC-05; cheapest-store optimization is outside the MVP.

**Role decision and T02 completion — 2026-10-26:** OWNER, MEMBER and VIEWER are the only accepted roles. The T02 creator remains OWNER. PR #10 and corrective PR #11 are merged; the latter removed the unused ADMIN enum through a data-preserving migration. ADMIN-to-OWNER conversion was compatibility handling for possible legacy/manual rows; observed T02-created memberships were already OWNER. The [T02 task file](EPIC-02-T02-create-select-households.md) records the manual checks. T03 now builds on this implemented base.

## Checkpoints

- **Before wider authentication testing or external exposure:** Complete T08 and manually check login and registration without JavaScript and, where possible, before hydration. Synthetic credentials must not appear in URLs, history or access logs; hydrated Better Auth submission still works.
- **After T01–T03:** Two synthetic accounts can authenticate; one account can create and select two households; each collection list is limited to the caller's memberships. T03 establishes 401/404/403 policy but does not claim role-specific allow/deny examples before ID-scoped operations exist. Check flows manually in the existing local app/API; run lint/typecheck/build as quality checks without adding automated tests.
- **After T04–T06:** OWNER can rename and manage invitations; MEMBER/VIEWER cannot mutate those resources. A signed-in link holder can accept a valid link exactly once. Verify 401 without a session, 404 for nonmember/foreign IDs and 403 for members with insufficient role, plus expired/revoked/reused invitations, manually with synthetic data.
- **After T07:** Review the complete three-role operation matrix. Check self-removal, last-OWNER protection, cross-household IDs and mixed-household references wherever EPIC-02 routes accept them. Confirm every EPIC-02 acceptance criterion, update `docs/architecture.md` for implemented changes, and record observed commands/results in the task files. Use a local/test database only.

## Decision gates and open questions

**MVP scope update — 2026-10-26:** Household creation and settings use RON only. T02 seeds the nine approved Hungarian default expense categories listed in its task file. T04 does not edit currency. Category management remains in EPIC-03.

1. **Decided — registration:** The MVP allows open email/password registration. The creator of a household becomes its first OWNER.
2. **Decided — roles:** OWNER manages household settings and invitations; MEMBER is an ordinary member for later permitted financial actions; VIEWER is read-only. Every household must retain at least one OWNER. Invitations grant MEMBER or VIEWER only. T07 has no general role-change action; the only promotion to OWNER is tied to the last OWNER's atomic transfer-and-leave to an existing member.
3. **Decided — API errors:** Use 401 without a session, 404 for a missing household or nonmember/foreign household ID, and 403 for a member whose role does not allow the operation. Collection list/create routes remain session-scoped without a target household ID.
4. **Decided — invitation delivery:** An OWNER copies a single-use invitation link and forwards it privately. The application does not send invitation e-mail in the MVP. The raw token must not enter logs or persistent storage and is shown to the inviter only when created.
5. **Decided — link holder:** Possession of the link is sufficient to accept after sign-in. The e-mail entered by the OWNER is informational and does not verify or restrict the accepting account. If the link is forwarded, a different signed-in account can accept it. The UI must explain this to the inviter.
6. **Decided — ownership lifecycle and member visibility (updated 2026-10-26):** An OWNER may remove another member, including another OWNER, with transactional protection for the last OWNER; general role editing and a role selector are excluded. MEMBER and VIEWER may leave; an OWNER may leave directly only if another OWNER remains. A sole OWNER may select an existing member for one atomic transfer-and-leave transaction that promotes the target to OWNER and removes the departing OWNER. All members see member names and roles; full account e-mail is visible only to an OWNER or the account holder. Pending invitation address labels are OWNER-only. Account deletion remains outside this epic until financial-record retention is defined.
7. **Decided — invitation policy (2026-10-26):** Links expire after seven days. At most one invitation is pending per household and normalized informational e-mail; an OWNER must explicitly revoke or replace it to reissue, and replacement invalidates the old link. An existing member's acceptance returns 409 without changing role or consuming the pending link. T05/T06 must make revocation and concurrent single-use acceptance effective.
8. **Open — category boundary:** EPIC-02 seeds household-specific defaults. Category create/edit/archive belongs to EPIC-03 unless the product owner explicitly changes the epic boundary.

## Coverage boundary

This plan covers EPIC-02's household and auth capabilities only. It does not build ledger records, category management, e-mail sending, mobile/Flutter authentication, account deletion, or a production deployment. Later epics must apply the T03 policy to every new household resource and include cross-household authorization checks.
