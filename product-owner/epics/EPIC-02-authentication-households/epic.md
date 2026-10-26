# EPIC-02: Authentication and households

## Goal

Let users securely create and share household spaces with the right access for each member.

## Scope

- Better Auth sign-in and session handling.
- Household creation, membership, roles, and invitations.
- Household-scoped default expense categories.
- Backend authorization policies for every household resource.

## Acceptance criteria

- A user can create a household and invite another user.
- A user can belong to multiple households.
- Requests cannot access another household's data, even when given its resource IDs.
- Viewer, member, admin, and owner permissions are enforced by the API.

## Implementation plan

The [EPIC-02 task plan](tasks/plan.md) breaks this epic into seven ordered tasks. The first version allows open registration and uses an expiring, single-use invitation link that an authorized household administrator copies and forwards. The link holder can accept the invitation after signing in; the link itself is the invitation credential.
