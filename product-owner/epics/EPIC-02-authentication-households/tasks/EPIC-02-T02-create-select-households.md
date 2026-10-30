# EPIC-02-T02: Create and select households

## Goal and user value

An authenticated person can create a household, become its first owner, and choose among every household they belong to.

## Scope

Add household, membership and household-specific default category persistence, plus create/list/select behavior in the API and web. The new household, owner membership and default categories must succeed or fail together. The MVP uses RON only; household creation offers no currency selection and rejects a different currency supplied directly to the API.

The nine approved default expense category labels (kept as exact Hungarian UI copy) are: `Élelmiszer és háztartási bevásárlás`; `Lakhatás`; `Rezsi és távközlés`; `Közlekedés`; `Egészség és gyógyszertár`; `Ruházat és személyes ápolás`; `Család és oktatás`; `Étterem és szabadidő`; `Egyéb`.

## Pre-implementation planning record — 2026-10-26

This planning round was completed before T02 implementation; its record was transferred to this task branch afterward. Keep T02 as one bounded vertical slice: a signed-in person creates a household, receives its first OWNER membership and nine default categories, then lists and selects their own households. Settings, invitations, role management, category editing and ledger work remain separate tasks.

- **Order and likely files:** After T01's session and `/api/v1/*` proxy flow, add `Household`, `HouseholdMember` and `ExpenseCategory` in `apps/api/prisma/schema.prisma` with a migration; add authenticated create/list behavior under `apps/api/src/app/api/v1/households/`; then add a small create/list/select flow under `apps/web/src/app/`. Update `docs/architecture.md` when the implemented data flow changes.
- **Authorization and integrity risks:** Derive the first owner from the server session, never a request `userId`; list only current memberships and do not treat a selected household ID as authorization. Create the household, OWNER membership and all nine category rows in one transaction. Keep membership/category uniqueness household-scoped and reject non-RON input at the API boundary. T03 supplies the reusable role policy for later routes; T02's own routes still require session and membership scoping.
- **Manual scenarios planned for the existing local app:** Use two synthetic accounts A and B at `http://localhost:3000`. As A, create two households and check RON, all nine categories, distinct category IDs and visible selection after switching. As B, verify A's households are absent. Check unauthenticated `GET /api/v1/households` returns 401. Submit invalid names and a non-RON currency to the create API and verify no partial rows; try a forged owner `userId` and verify it never assigns ownership to B. Inspect the transaction boundary; only attempt a controlled rollback failure if safe in the local synthetic database, otherwise record the limit. Use the existing app/database in place, without a project copy or automated tests. The verification section below records what was actually checked.
- **Decisions and boundary:** No product decision blocks T02: open registration, first-creator OWNER, RON-only currency and the nine labels are approved. Product-level receipt lines, product identity and price trends belong to EPIC-05; comparing stores, purchase recommendations and cheapest-store optimization are outside the MVP.

## CSRF hardening follow-up plan — 2026-10-26

- **Bounded scope and likely files:** Before this security fix is coded, require the cookie-authenticated `POST /api/v1/households` request to have an `Origin` matching the configured public `WEB_ORIGIN` and `application/json` media type (a charset parameter is acceptable). Reject missing, `null`, malformed or different origins and missing/non-JSON `Content-Type` before the create transaction. Reuse the same small API guard planned for T04/T05 in `apps/api/src/lib/`, apply it in `apps/api/src/app/api/v1/households/route.ts`, and update `docs/architecture.md` plus this task's verification record. The web creation request in `apps/web/src/app/households-panel.tsx` already sends JSON. GET/list, schema, categories and selection remain unchanged. This follow-up was planned after the original T02 implementation, before its CSRF edit.
- **Dependencies, acceptance and manual verification:** Existing T01 session handling and T02 transactional creation remain the base; coordinate the shared guard with the T04/T05 follow-up. A signed-in same-origin JSON request still returns 201 with one RON household, OWNER membership and nine categories; no session still returns 401, and invalid business input retains its existing validation response when origin/media type are valid. With synthetic local accounts, try absent/foreign/`null` Origin and form, text, multipart or absent `Content-Type` through direct API requests; each must be rejected without a household, membership or category row being created. Confirm normal browser creation still works through the web proxy. Record actual results and run relevant lint/typecheck/build checks; do not add or run automated tests.
- **Risks and decisions:** Compare against the configured web origin, not untrusted Host or forwarded headers. Confirm the local proxy sends the expected Origin. No new product decision or database migration is required.

## Implementation checklist

- [x] Household, membership and expense-category persistence plus the role-correction migration are present in `apps/api/prisma/schema.prisma` and `apps/api/prisma/migrations/`.
- [x] `apps/api/src/app/api/v1/households/route.ts` atomically creates the household, first OWNER membership and nine default categories; it validates name and RON currency.
- [x] Authenticated household list and web create/select flow are implemented in the same API route and `apps/web/src/app/households-panel.tsx`; selection is a client preference, revalidated by the API.

## Acceptance criteria

- [x] An authenticated account can create a household.
- [x] The creator receives the first OWNER membership for the new household.
- [x] A newly created household uses RON currency.
- [x] A newly created household has exactly the nine approved default expense categories.
- [ ] A failed create operation leaves no partial household, owner membership, or default categories.
- [x] An account can create multiple households.
- [x] An account can select a household it belongs to.
- [ ] The household list and selection expose only households where the current account is a member.
- [x] Joining by invitation follows T06.
- [ ] Unauthenticated household requests fail.
- [ ] Invalid household names are rejected without creating records.
- [ ] A non-RON currency is rejected without creating records.
- [ ] A second household receives its own separate rows for the same nine default categories.

### Acceptance criteria decomposition note — 2026-10-28

The three former combined criteria were decomposed as follows: old criterion 1 → criteria 1–5; old criterion 2 → criteria 6–9; old criterion 3 → criteria 10–13. All new items were initially unchecked because the former combined criteria were unchecked; the evidence reconciliation below records later supported items.

### Evidence reconciliation — 2026-10-28

- Checked 1–4 and 6–7 from the 2026-10-26 synthetic Alpha/Beta creation, OWNER/RON/nine-category, two-household selection and reload records; checked 9 from T06's recorded invitation acceptance and selectable household. This maps existing evidence only; no check was rerun.
- Left 5 open because a partial-create rollback was never forced. Left 8 open because foreign-household selection was not directly exercised; 10 because only unauthenticated GET was recorded; 11–12 because the invalid-input 400 responses were not followed by an explicit record-count check; and 13 because separate category IDs for the second household were not directly compared.

## Verification checklist

- **CSRF hardening follow-up implementation — 2026-10-26:** Added the shared `WEB_ORIGIN` + JSON media-type guard to authenticated household creation. The guard rejects absent/malformed/mismatched Origin and invalid/missing `Content-Type` before any database write; `GET /api/v1/households` remains unchanged. API ESLint and `tsc --noEmit` passed after the T05 Prisma client was regenerated. Runtime request verification was pending at this point; later negative manual results are recorded below. No automated tests were added or run.
- **Negative CSRF manual pass — 2026-10-26 (reported by the tester):** Using the authenticated synthetic T04 OWNER browser session, a JSON household-creation POST with a mismatched `Origin` returned `403 FORBIDDEN`. A POST with the matching `Origin` but `text/plain` returned `415`. An authenticated household GET still listed three households afterward, so neither rejected request created a household. The tester did not extract a session cookie or perform a valid creation in this pass. A missing-`Origin` request remains unchecked because the browser controls that header.

- [x] With two synthetic accounts, create two households for one account; verify the other account's list is empty and the selected household remains selected after reload.
- [x] In the existing local app, verify both created households show RON, the creator's OWNER role and the nine approved category names. Confirm unauthenticated list requests return 401.
- [x] Sign in with a synthetic account (HTTP 200), then submit a valid household name with `currency: "EUR"`; the API returned 400 `VALIDATION_ERROR` with the RON-only message.
- [x] Submit `currency: "RON"` with a blank household name; the API returned 400 `VALIDATION_ERROR`.
- [ ] Force a partial-create failure and manually verify rollback. This was not forced manually; the reviewer confirmed household, owner membership and categories are wrapped in Prisma `$transaction`.

Implementation verification recorded 2026-10-26: two local-only synthetic accounts were used (`t02-alpha@example.test`, `t02-beta@example.test`). Alpha created `T02 Alpha Household One` and `T02 Alpha Household Two`; each showed RON, OWNER and all nine approved categories. Switching to the first household persisted through a page reload. Beta's list showed no households. An unauthenticated `GET /api/v1/households` returned 401. In a later manual API pass, synthetic account sign-in returned HTTP 200; EUR input and a blank name each returned 400 `VALIDATION_ERROR` with the expected messages. The session cookie used for those requests remained in a temporary `/private/tmp` file, was deleted by a shell trap, and was never printed. Transaction rollback was not forced manually; the reviewer confirmed the create operation uses Prisma `$transaction`. API and web TypeScript checks and lint passed; no automated tests were run.

## PR #10 merge gate — accepted role set, 2026-10-26

Only `OWNER`, `MEMBER` and `VIEWER` are accepted household roles. The creator and household creation response remain `OWNER`. Keep `ADMIN` out of the Prisma schema and client/UI role validation. Do not edit the already-applied `20261026074859_add_households` migration; apply a follow-on PostgreSQL migration that maps any stored `ADMIN` membership to `OWNER` and safely replaces the enum while preserving household memberships. This mapping is for compatibility with possible legacy or manually entered ADMIN rows: all memberships observed from the actual T02 creation flow were already OWNER.

Corrective verification recorded 2026-10-26: migration `20261026101718_restrict_household_roles` applied to the existing local synthetic database. The two preexisting Alpha households and a new post-migration household were manually listed through the API and shown in the UI as `OWNER`; the new household had all nine categories. The API response and UI role contract contain only `OWNER`, `MEMBER` and `VIEWER`; no-session `GET /api/v1/households` returned 401 after migration. The inspected synthetic records already had OWNER memberships, so the legacy ADMIN-to-OWNER data-conversion branch was not exercised against a row. The migration preserves other memberships and maps ADMIN to OWNER transactionally. No automated tests were added or run.

## Dependencies

EPIC-02-T01. Open registration is approved; the authenticated creator becomes the household's first OWNER.

## Non-goals and open questions

Category create/edit/archive belongs to EPIC-03. Currency selection and conversion are outside the RON-only MVP.
