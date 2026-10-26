# EPIC-02-T07: Manage household members

## Goal and user value

Household members can see who has access; authorized roles can correct or end access while preserving an owner.

## Scope

Provide a member list and the approved role-change/removal operations in the API and web. Enforce the T03 policy for actor and target roles. A removal or role change takes effect for subsequent API requests.

## Acceptance criteria

- [ ] A current member sees the members and roles of only their selected household; a foreign-household ID exposes no member list.
- [ ] Only approved actors can change roles or remove a member; unauthorized direct API requests leave memberships unchanged, including attempts to grant OWNER outside an approved ownership process. Authorized changes record actor, target, action and time for later audit without exposing secrets.
- [ ] Last-owner protection and self-removal follow the approved owner-lifecycle policy, and removed/demoted users lose the corresponding access on their next API request.

## Verification

- [ ] Check allowed and denied role changes/removals for VIEWER, MEMBER, ADMIN and OWNER in two synthetic households, including a last-owner attempt.
- [ ] Verify member list and updated access in the browser and direct API; run focused checks plus root lint/typecheck/build.

## Dependencies

EPIC-02-T03. Integration verification with invited members follows T06. Owner lifecycle and role-management rules must be approved before implementation.

## Non-goals and open questions

Household deletion and account deletion are outside this task. Decide whether ownership transfer is in this epic; if it is, add explicit acceptance and verification rules before implementation. Confirm which roles may remove themselves or others.
