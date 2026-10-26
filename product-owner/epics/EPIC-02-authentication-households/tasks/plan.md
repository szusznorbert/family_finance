# EPIC-02 implementation plan

## Overview

Deliver a complete authenticated household flow: a person can sign in, create and choose a household, invite another person, and use only the households and operations their membership permits. The API remains the authority for identity, membership and role checks. The seven tasks below are planning proposals; no application behavior is implemented by this plan.

## Current evidence

- Better Auth email/password endpoints and the Prisma `User`, `Session`, `Account` and `Verification` models are configured in the API. There is no web auth client or sign-in UI yet.
- The web currently proxies `/api/backend/*` to the separate API. Browser-to-API auth requests and their session behavior need an agreed same-origin integration.
- Household, membership, invitation and category models, business routes, and household policy helpers do not yet exist.
- The epic requires four roles, multiple households per user, default categories, invitations, and isolation even when foreign resource IDs are supplied. The attached technical specification provides a *suggested* role policy and routes; these are planning inputs, not approved product decisions.

## Task order and dependencies

1. [EPIC-02-T01: Establish account access and session flow](EPIC-02-T01-account-session-flow.md) — open email/password sign-up and sign-in, sign out, and recover session state in the web and API.
2. [EPIC-02-T02: Create and select households](EPIC-02-T02-create-select-households.md) — create a household with its first owner and default categories, and list/select a user's households.
3. [EPIC-02-T03: Enforce household authorization](EPIC-02-T03-household-authorization.md) — establish the four-role policy at the API boundary and test tenant isolation.
4. [EPIC-02-T04: View and update household settings](EPIC-02-T04-household-settings.md) — provide household detail and permitted changes to name/default currency.
5. [EPIC-02-T05: Issue household invitations](EPIC-02-T05-issue-invitations.md) — let an authorized administrator create, privately forward and revoke a secure, expiring invitation link for a non-owner role.
6. [EPIC-02-T06: Accept household invitations](EPIC-02-T06-accept-invitations.md) — let a signed-in link holder redeem a valid invitation once and join the correct household.
7. [EPIC-02-T07: Manage household members](EPIC-02-T07-manage-members.md) — list members and safely change or end membership within the approved policy.

T04 and T05 can be developed independently after T03 if they coordinate API contracts. T07 can start after T03 independently of the invitation screens, but its integration verification depends on T06.

## Checkpoints

- **After T01–T03:** Two synthetic accounts can authenticate; one account can create and select two households; a nonmember cannot read or mutate a foreign household through the API, and each role's permitted operations follow the approved matrix. Run focused API checks plus root lint/typecheck/build.
- **After T04–T06:** An authorized account can create, copy and revoke an invitation; a signed-in link holder can accept a valid link exactly once. Invalid, expired, revoked and reused tokens fail without creating membership. Verify concurrent acceptance and the browser/API flow with synthetic data.
- **After T07:** Review the complete four-role operation matrix. Test self-removal, last-owner protection, cross-household IDs and mixed-household references wherever EPIC-02 routes accept them. Confirm every EPIC-02 acceptance criterion, update `docs/architecture.md` for implemented changes, and record observed commands/results in the task files. Use a local/test database only.

## Decision gates and open questions

1. **Decided — registration:** The MVP allows open email/password registration. The creator of a household becomes its first OWNER.
2. **Decided — invitation delivery:** An authorized administrator copies a single-use invitation link and forwards it privately. The application does not send invitation e-mail in the MVP. The raw token must not enter logs or persistent storage and is shown to the inviter only when created.
3. **Open — role matrix:** Confirm the operations allowed to VIEWER, MEMBER, ADMIN and OWNER, including household settings, invitations, member role changes, removal and category management. The specification's matrix is a proposal. Decide before T03.
4. **Open — owner lifecycle:** Define who can transfer ownership, whether an owner can leave, and whether removing the last owner is always forbidden. Decide before T07. Account deletion is outside this epic until financial-record retention is defined.
5. **Decided — link holder:** Possession of the link is sufficient to accept after sign-in. The e-mail entered by the administrator is informational and does not verify or restrict the accepting account. If the link is forwarded, a different signed-in account can accept it. The UI must explain this to the inviter.
6. **Open — invitation policy:** Set link lifetime and duplicate/reinvite behavior, and decide what happens if an existing member uses a new link. T05/T06 must make revocation and concurrent single-use acceptance effective.
7. **Open — category boundary:** EPIC-02 seeds household-specific defaults. Category create/edit/archive belongs to EPIC-03 unless the product owner explicitly changes the epic boundary.

## Coverage boundary

This plan covers EPIC-02's household and auth capabilities only. It does not build ledger records, category management, e-mail sending, mobile/Flutter authentication, account deletion, or a production deployment. Later epics must apply the T03 policy to every new household resource and include cross-household authorization checks.
