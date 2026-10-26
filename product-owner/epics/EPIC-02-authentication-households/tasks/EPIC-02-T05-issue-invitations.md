# EPIC-02-T05: Issue household invitations

## Goal and user value

An OWNER can invite another person to join with an approved household role.

## Scope

Create expiring invitations for a household, an informational e-mail address entered by the OWNER, inviter and approved role. Show the OWNER a single-use link to copy and privately forward, and allow an OWNER to revoke an outstanding link. Store only a hash/verifier for the secret token; show the raw link only on creation and never in list responses, logs or persistent records. The application does not send invitation e-mail in the MVP.

## Acceptance criteria

- [ ] Only OWNER can issue and revoke invitations; MEMBER and VIEWER receive 403 for these operations, and a nonmember receives 404 for a foreign household ID. Whether an invitation may grant OWNER is settled with T07's ownership-transfer rule before implementation.
- [ ] The invite has a finite expiry and stores only a token hash/verifier; the OWNER-entered e-mail is clearly presented as informational, not as identity verification or a restriction on who may redeem the link.
- [ ] The OWNER can copy the newly created link once and privately forward it, and can revoke an outstanding link; a nonmember cannot issue, list or revoke invitations for a foreign household ID.
- [ ] The UI warns that any signed-in link holder can join, including someone other than the entered e-mail address; no invitation e-mail is sent by the app.

## Verification

- [ ] Exercise each role, invalid e-mail/role, duplicate invitation, revocation and cross-household IDs with synthetic accounts; confirm no raw invite token is persisted or logged.
- [ ] Verify the copy-once browser flow and warning, then run focused API checks plus root lint/typecheck/build.

## Dependencies

EPIC-02-T03. Manual bearer-link delivery is approved; lifetime, duplicate/reinvite behavior and whether invitations may grant OWNER must be decided before implementation. Can proceed in parallel with T04 after API contract coordination.

## Non-goals and open questions

E-mail sending is outside the MVP. Decide invitation lifetime, duplicate/reinvite, OWNER invitation policy and how revoked invitations appear in the UI before implementation; the link must not be retrievable after its one-time display. The stored e-mail is a human-facing address label, not proof of the acceptor's identity.
