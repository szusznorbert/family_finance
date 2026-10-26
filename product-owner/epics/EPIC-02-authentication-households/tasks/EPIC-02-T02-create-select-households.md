# EPIC-02-T02: Create and select households

## Goal and user value

An authenticated person can create a household, become its first owner, and choose among every household they belong to.

## Scope

Add household, membership and household-specific default category persistence, plus create/list/select behavior in the API and web. The new household, owner membership and default categories must succeed or fail together. The MVP uses RON only; household creation offers no currency selection and rejects a different currency supplied directly to the API.

The nine approved default expense categories are: Élelmiszer és háztartási bevásárlás; Lakhatás; Rezsi és távközlés; Közlekedés; Egészség és gyógyszertár; Ruházat és személyes ápolás; Család és oktatás; Étterem és szabadidő; Egyéb.

## Pre-implementation planning record — 2026-10-26

This planning round was completed before T02 implementation; its record was transferred to this task branch afterward. Keep T02 as one bounded vertical slice: a signed-in person creates a household, receives its first OWNER membership and nine default categories, then lists and selects their own households. Settings, invitations, role management, category editing and ledger work remain separate tasks.

- **Order and likely files:** After T01's session and `/api/v1/*` proxy flow, add `Household`, `HouseholdMember` and `ExpenseCategory` in `apps/api/prisma/schema.prisma` with a migration; add authenticated create/list behavior under `apps/api/src/app/api/v1/households/`; then add a small create/list/select flow under `apps/web/src/app/`. Update `docs/architecture.md` when the implemented data flow changes.
- **Authorization and integrity risks:** Derive the first owner from the server session, never a request `userId`; list only current memberships and do not treat a selected household ID as authorization. Create the household, OWNER membership and all nine category rows in one transaction. Keep membership/category uniqueness household-scoped and reject non-RON input at the API boundary. T03 supplies the reusable role policy for later routes; T02's own routes still require session and membership scoping.
- **Manual scenarios planned for the existing local app:** Use two synthetic accounts A and B at `http://localhost:3000`. As A, create two households and check RON, all nine categories, distinct category IDs and visible selection after switching. As B, verify A's households are absent. Check unauthenticated `GET /api/v1/households` returns 401. Submit invalid names and a non-RON currency to the create API and verify no partial rows; try a forged owner `userId` and verify it never assigns ownership to B. Inspect the transaction boundary; only attempt a controlled rollback failure if safe in the local synthetic database, otherwise record the limit. Use the existing app/database in place, without a project copy or automated tests. The verification section below records what was actually checked.
- **Decisions and boundary:** No product decision blocks T02: open registration, first-creator OWNER, RON-only currency and the nine labels are approved. Product-level receipt lines, product identity and price trends belong to EPIC-05; comparing stores, purchase recommendations and cheapest-store optimization are outside the MVP.

## Acceptance criteria

- [ ] An authenticated account creates a household and sees an OWNER membership, RON currency and exactly the nine approved default expense categories; a failed create operation leaves none of these partially stored.
- [ ] The account can create multiple households and select one; the list and selection expose only households where its current account is a member. Joining by invitation follows T06.
- [ ] Unauthenticated requests fail; invalid household names or a non-RON currency are rejected without creating records; a second household starts with separate rows for the same nine categories.

## Verification

- [x] With two synthetic accounts, create two households for one account; verify the other account's list is empty and the selected household remains selected after reload.
- [x] In the existing local app, verify both created households show RON, the creator's OWNER role and the nine approved category names. Confirm unauthenticated list requests return 401.
- [x] Sign in with a synthetic account (HTTP 200), then submit a valid household name with `currency: "EUR"`; the API returned 400 `VALIDATION_ERROR` with the RON-only message.
- [x] Submit `currency: "RON"` with a blank household name; the API returned 400 `VALIDATION_ERROR`.
- [ ] Force a partial-create failure and manually verify rollback. This was not forced manually; the reviewer confirmed household, owner membership and categories are wrapped in Prisma `$transaction`.

Implementation verification recorded 2026-10-26: two local-only synthetic accounts were used (`t02-alpha@example.test`, `t02-beta@example.test`). Alpha created `T02 Alpha Household One` and `T02 Alpha Household Two`; each showed RON, OWNER and all nine approved categories. Switching to the first household persisted through a page reload. Beta's list showed no households. An unauthenticated `GET /api/v1/households` returned 401. In a later manual API pass, synthetic account sign-in returned HTTP 200; EUR input and a blank name each returned 400 `VALIDATION_ERROR` with the expected messages. The session cookie used for those requests remained in a temporary `/private/tmp` file, was deleted by a shell trap, and was never printed. Transaction rollback was not forced manually; the reviewer confirmed the create operation uses Prisma `$transaction`. API and web TypeScript checks and lint passed; no automated tests were run.

## Dependencies

EPIC-02-T01. Open registration is approved; the authenticated creator becomes the household's first OWNER.

## Non-goals and open questions

Category create/edit/archive belongs to EPIC-03. Currency selection and conversion are outside the RON-only MVP.
