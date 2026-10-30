# EPIC-03-T01: Manage household categories

## Goal and user value

Authorized household members can organize ledger entries without changing another household's categories.

## Scope

Provide household-scoped category listing and the approved create, rename and archive operations. Start from the nine default expense categories seeded by EPIC-02-T02.

## Implementation checklist

- [x] Category model with normalized household-scoped name uniqueness, a soft-archive field, and an additive migration.
- [x] Household-scoped list/create API and OWNER-only rename/archive API.
- [x] Settings category-management UI and use of active categories in the household overview.

## Acceptance criteria

- [ ] The nine defaults are available to the household, and permitted users can create, rename and archive categories without changing another household's list.
- [ ] Category names and states are validated; unauthorized roles and foreign household or category IDs cannot modify categories.
- [ ] Archiving a category preserves references needed by existing financial records under the agreed retention rule.

## Dependencies

EPIC-02-T02 and EPIC-02-T03. Confirm the role matrix and archival behavior before implementation.

## Verification checklist

- [ ] In the existing local app, use two synthetic households to check allowed/denied category actions, duplicate names and archived-category behavior. Do not copy the project or add automated tests.

## Non-goals and open questions

Receipt product identity is separate from ledger categories. The user-approved category lifecycle and history rules are recorded below; the technical uniqueness and rename-display details remain coordinator working assumptions that later user steering may change.

## Historical pre-implementation planning record — 2026-10-26

Historical planning baseline: before implementation, `ExpenseCategory` had `id`, `householdId`, `name` (varchar 100), `sortOrder`, and `createdAt`, with an exact-name unique constraint per household and household cascade deletion. Household creation seeded these nine approved Hungarian UI labels in order: `Élelmiszer és háztartási bevásárlás`; `Lakhatás`; `Rezsi és távközlés`; `Közlekedés`; `Egészség és gyógyszertár`; `Ruházat és személyes ápolás`; `Család és oktatás`; `Étterem és szabadidő`; `Egyéb`. Household GET and create responses returned category IDs, names, and sort order. No category-specific API, archive state, or category-management screen existed at that time.

### User-approved product decisions — 2026-10-27

The user explicitly approved these product rules: only OWNER may manage categories; the nine seeded categories may be renamed and soft-archived; archived categories stay visible on historical entries but cannot be selected for new entries; category management belongs in Settings. The coordinator's additional technical assumptions are called out separately below and are not represented as direct user approval.

- Keep T01 responsible for household-scoped category listing and management: create, rename and soft-archive; do not hard-delete categories. OWNER may rename/archive defaults. Preserve their initial names/order at household creation. Do not list defaults in onboarding or household selection UI.
- Add a small real category-management destination under Settings (route `/beallitasok/kategoriak`) with OWNER-only mutation controls; other authenticated household roles may read categories. Add the route to the Settings index. This is a dedicated management surface, not an onboarding preview.
- Proposed API surface: `GET`/`POST /api/v1/households/[householdId]/categories`; `PATCH /api/v1/households/[householdId]/categories/[categoryId]` for rename and archive. No hard `DELETE`, restore, reorder, or product/receipt identity behavior is included. Reuse `authorizeHouseholdOperation`; read access follows `read`, and category mutations use `manage` (OWNER). Filter every lookup and mutation by both the authenticated household and category ID; return the established no-store/error shape, 401 without session, 404 for foreign or missing household/category, and 403 for MEMBER/VIEWER mutation attempts.
- Validation: trim outer whitespace, require 1–100 Unicode characters, and append created categories after the current maximum `sortOrder`. **Coordinator working assumption:** enforce per-household case-insensitive uniqueness, including archived categories, so an archived name cannot be silently reused while its history remains. Duplicate conflict returns HTTP 409 with a `CONFLICT` API error.
- Archive model: add a nullable `archivedAt` timestamp (soft archive). Archived categories are excluded from new-entry selection but remain resolvable on historical ledger rows, as approved. **Coordinator working assumption:** a rename changes the displayed category name for historical rows because ledger entries reference category ID and use the category's current name; do not add a historical name snapshot. Coordinate the schema/migration with T02; do not rewrite or reseed categories for existing households.

### Likely files and dependencies

- `apps/api/prisma/schema.prisma` and a new Prisma migration for archive state and normalized-name uniqueness.
- New `apps/api/src/app/api/v1/households/[householdId]/categories/route.ts` and `[categoryId]/route.ts` for list/create and rename/archive.
- `apps/api/src/app/api/v1/households/route.ts` to keep household summaries consistent with active-category selection after archive state exists.
- `apps/web/src/app/beallitasok/page.tsx`, a new `apps/web/src/app/beallitasok/kategoriak/page.tsx`, a focused category manager component, and the existing household management styles for the OWNER Settings route.
- `apps/api/src/lib/household-authorization.ts` should be reused without widening the existing role policy. Update `docs/architecture.md` only if the implemented schema or category API materially changes the documented architecture.
- Dependencies: merged EPIC-02-T02 seed, EPIC-02-T03 authorization, and current T05/T07 UI foundation. T02 can proceed in parallel, but both implementers must coordinate Prisma schema/migration edits; the T02 manual-entry flow must reject archived category IDs and consume only active categories for new entries.

### Acceptance and manual verification plan

- Use two synthetic households and OWNER, MEMBER, VIEWER, and signed-out sessions. Verify each can list only its own household categories; only OWNER can create, rename, or archive; no foreign household/category ID can read or mutate another household's category; unauthorized mutations return the agreed 401/403/404 behavior.
- Verify the nine defaults exist once per household and keep the approved names/order, and that creating another household creates a separate category set. Check trimmed empty/overlong names, duplicate rejection according to the working normalization assumption, and creation ordering.
- Verify archive removes a category from active selection without deleting its identity; a later ledger history/read still displays it. Verify rename history follows the coordinator working assumption and confirm household summary/onboarding does not expose category previews. Do not use real household financial data or copy the project.
- Manually check the Settings category destination for OWNER versus MEMBER/VIEWER read-only/mutation visibility at 320/390 px and desktop, keyboard/focus, visible validation/errors, and that no category controls appear in onboarding or household selection.
- Run API lint/typecheck and `git diff --check`; do not add or run automated tests per current MVP direction.

### T02 schema coordination — 2026-10-26

The EPIC-03 architecture agent recommends keeping the display `name` and adding a server-generated `normalizedName` (trimmed, Unicode NFC-normalized, deterministic lowercase) with `@@unique([householdId, normalizedName])`. This is preferred over a Postgres expression index because Prisma can model and enforce the compound unique key, including for concurrent writes. Before applying a NOT NULL + unique migration, check/backfill existing rows and detect any normalized duplicates. Archived categories remain in this same uniqueness domain; a name is not reusable while an archived category retains it. Under the coordinator's history-display assumption, T02 ledger rows reference the category ID and show its current name, including after rename. This is a documentation-level coordination record only; no schema/code was changed.

### Remaining assumptions and implementation status

No product-decision blocker remains: the category role, default-category lifecycle, archive visibility, and Settings management scope are user-approved. Case-insensitive uniqueness (including archived names) and showing the current category name on renamed historical entries remain coordinator technical assumptions; the user may revise them. T01 and T02 implementation agents must coordinate before either creates a Prisma migration so the shared `ExpenseCategory` schema is changed once against the agreed `archivedAt` + `normalizedName` design.

### Implementation status — 2026-10-28

**Status: pending completion.** The category model and migration, household-scoped list/create/update API, and Settings category page are present in `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20261026205615_manage_expense_categories/migration.sql`, `apps/api/src/app/api/v1/households/[householdId]/categories/`, and `apps/web/src/app/beallitasok/kategoriak/`. The household summary returns active categories. This records implementation presence only; acceptance criteria and manual verification above remain unchecked.

**Verification status:** No task-level synthetic household/role/archive QA evidence is recorded. Verify the nine defaults, role and household isolation, validation/duplicates, archived historical references, and Settings behavior before acceptance.
