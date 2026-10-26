# EPIC-02-T07: Manage household members

## Goal and user value

Household members can see who has access; authorized role changes or departures must always preserve at least one OWNER.

## Scope

Provide a member list and the approved OWNER-controlled role-change/removal operations in the API and web. Enforce the T03 policy for actor and target roles. A removal or role change takes effect for subsequent API requests.

## Acceptance criteria

- [ ] A current member sees the members and roles of only their selected household; a foreign-household ID exposes no member list.
- [ ] Only OWNER can change roles or remove a member under the approved target-role rules; MEMBER and VIEWER receive 403, while nonmembers receive 404 for a foreign household ID. Authorized changes record actor, target, action and time for later audit without exposing secrets.
- [ ] No operation can remove or demote the last OWNER. Ownership transfer and an OWNER's departure follow an approved, atomic flow that leaves at least one OWNER; removed or demoted users lose the corresponding access on their next API request.

## Verification

- [ ] Manually check allowed and denied role changes/removals for VIEWER, MEMBER and OWNER in two synthetic households, including a last-OWNER attempt and an ownership transfer.
- [ ] Verify member list and updated access in the browser and direct API; run focused checks plus root lint/typecheck/build.

## Dependencies

EPIC-02-T03. Integration verification with invited members follows T06. Ownership transfer, self-departure and target-role rules must be approved before implementation.

## Non-goals and open questions

Household deletion and account deletion are outside this task. Decide the exact ownership-transfer and last-OWNER departure flow, including whether a second OWNER may be granted through invitation or only through an existing-member role change. The invariant that at least one OWNER remains is already approved.
