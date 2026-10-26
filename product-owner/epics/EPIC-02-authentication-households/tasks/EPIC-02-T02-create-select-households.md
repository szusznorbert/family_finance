# EPIC-02-T02: Create and select households

## Goal and user value

An authenticated person can create a household, become its first owner, and choose among every household they belong to.

## Scope

Add household, membership and household-specific default category persistence, plus create/list/select behavior in the API and web. The new household, owner membership and default categories must succeed or fail together. Default currency is RON unless the approved creation flow selects another supported currency.

## Acceptance criteria

- [ ] An authenticated account creates a household and sees an OWNER membership and the agreed default expense categories; a failed create operation leaves none of these partially stored.
- [ ] The account can create multiple households and select one; the list and selection expose only households where its current account is a member. Joining by invitation follows T06.
- [ ] Unauthenticated requests fail; invalid household names/currency values are rejected without creating records; a second household starts with its own category rows.

## Verification

- [ ] With two synthetic accounts, create two households for one account and one for the other; verify each list and selected household are scoped to membership.
- [ ] Test invalid input and transactional failure behavior in a local/test database; run focused API checks and root lint/typecheck/build.

## Dependencies

EPIC-02-T01. Open registration is approved; the authenticated creator becomes the household's first OWNER.

## Non-goals and open questions

Category create/edit/archive belongs to EPIC-03. Decide the precise default category names/translations and whether a user chooses currency at creation; the reference specification proposes seven categories and RON as the default.
