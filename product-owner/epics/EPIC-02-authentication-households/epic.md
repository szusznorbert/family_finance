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
