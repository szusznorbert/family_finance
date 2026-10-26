# EPIC-02-T02: Create and select households

## Goal and user value

An authenticated person can create a household, become its first owner, and choose among every household they belong to.

## Scope

Add household, membership and household-specific default category persistence, plus create/list/select behavior in the API and web. The new household, owner membership and default categories must succeed or fail together. The MVP uses RON only; household creation offers no currency selection and rejects a different currency supplied directly to the API.

The nine approved default expense categories are: Élelmiszer és háztartási bevásárlás; Lakhatás; Rezsi és távközlés; Közlekedés; Egészség és gyógyszertár; Ruházat és személyes ápolás; Család és oktatás; Étterem és szabadidő; Egyéb.

## Acceptance criteria

- [ ] An authenticated account creates a household and sees an OWNER membership, RON currency and exactly the nine approved default expense categories; a failed create operation leaves none of these partially stored.
- [ ] The account can create multiple households and select one; the list and selection expose only households where its current account is a member. Joining by invitation follows T06.
- [ ] Unauthenticated requests fail; invalid household names or a non-RON currency are rejected without creating records; a second household starts with separate rows for the same nine categories.

## Verification

- [ ] With two synthetic accounts, create two households for one account and one for the other; verify each list and selected household are scoped to membership.
- [ ] In the existing local app with synthetic data, check the nine category names, RON-only input rejection and transactional failure behavior through the UI/API without copying the project or adding automated tests. Run lint/typecheck/build as quality checks when implementation changes warrant them.

## Dependencies

EPIC-02-T01. Open registration is approved; the authenticated creator becomes the household's first OWNER.

## Non-goals and open questions

Category create/edit/archive belongs to EPIC-03. Currency selection and conversion are outside the RON-only MVP.
