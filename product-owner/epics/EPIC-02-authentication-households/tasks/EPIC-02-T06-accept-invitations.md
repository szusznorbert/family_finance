# EPIC-02-T06: Accept household invitations

## Goal and user value

A signed-in holder of a valid invitation link can join the correct household without receiving broader access than was offered.

## Scope

Resolve the privately forwarded bearer link in the web, require sign-in under open email/password registration, and redeem the invitation through the API. Possession of the link is sufficient; the administrator-entered e-mail does not restrict the accepting account. Membership creation and invitation consumption must succeed or fail together, including concurrent requests.

## Acceptance criteria

- [ ] A signed-in holder of a valid pending link can accept it exactly once and appears in that household with the invited role, even if the account's e-mail differs from the informational e-mail entered by the administrator.
- [ ] Invalid, expired, revoked and reused links create no membership and show a safe, useful outcome; the token is checked against its stored hash/verifier without exposing the secret in logs or error responses.
- [ ] Simultaneous acceptance attempts create at most one membership and one accepted invitation state; existing membership cannot be duplicated or silently escalated.
- [ ] After acceptance, the new member can select the household; access to any other household remains governed by its separate membership.

## Verification

- [ ] Test acceptance by newly registered and existing accounts, including one whose e-mail differs from the informational address, then reload and verify membership and role with synthetic data.
- [ ] Test token replay, expiry, revocation and concurrent acceptance in a local/test database; confirm only one successful redemption and run focused checks plus root lint/typecheck/build.

## Dependencies

EPIC-02-T05. Open registration and manual bearer-link forwarding are approved MVP decisions.

## Non-goals and open questions

Decide how an existing membership affects redemption; never silently change its role. The administrator-entered e-mail is informational only. The UI should encourage private link sharing because forwarding the link lets a different signed-in user redeem it.
