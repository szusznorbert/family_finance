# EPIC-02-T05: Issue household invitations

## Goal and user value

An OWNER or ADMIN, subject to the approved role matrix, can invite another person to join with a specific non-owner role.

## Scope

Create expiring invitations for a household, an informational e-mail address entered by the administrator, inviter and approved role. Show the authorized inviter a single-use link to copy and privately forward, and allow an authorized administrator to revoke an outstanding link. Store only a hash/verifier for the secret token; show the raw link only on creation and never in list responses, logs or persistent records. The application does not send invitation e-mail in the MVP.

## Acceptance criteria

- [ ] Only approved inviter roles can issue invitations; VIEWER and MEMBER cannot escalate their access, and invitations cannot grant OWNER.
- [ ] The invite has a finite expiry and stores only a token hash/verifier; the administrator-entered e-mail is clearly presented as informational, not as identity verification or a restriction on who may redeem the link.
- [ ] The authorized inviter can copy the newly created link once and privately forward it; an authorized administrator can revoke an outstanding link, while a nonmember cannot issue, list or revoke invitations for a foreign household ID.
- [ ] The UI warns that any signed-in link holder can join, including someone other than the entered e-mail address; no invitation e-mail is sent by the app.

## Verification

- [ ] Exercise each role, invalid e-mail/role, duplicate invitation, revocation and cross-household IDs with synthetic accounts; confirm no raw invite token is persisted or logged.
- [ ] Verify the copy-once browser flow and warning, then run focused API checks plus root lint/typecheck/build.

## Dependencies

EPIC-02-T03. Manual bearer-link delivery is approved; lifetime and duplicate/reinvite behavior must be decided before implementation. Can proceed in parallel with T04 after API contract coordination.

## Non-goals and open questions

E-mail sending is outside the MVP. Decide invitation lifetime, duplicate/reinvite and how revoked invitations appear in the UI before implementation; the link must not be retrievable after its one-time display. The stored e-mail is a human-facing address label, not proof of the acceptor's identity.
