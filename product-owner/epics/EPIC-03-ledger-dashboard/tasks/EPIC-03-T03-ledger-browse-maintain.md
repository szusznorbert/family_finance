# EPIC-03-T03: Browse and maintain ledger entries

## Goal and user value

Members can find and correct permitted ledger entries while preserving the history needed to understand household finances.

## Scope

Provide household-scoped, filtered and paginated ledger listing, detail, permitted editing and archival. Apply the approved role and audit policy to manual and source-linked entries.

## Implementation checklist

- [x] Household-scoped, filterable, paginated ledger collection API and Journal list.
- [x] Entry detail API/UI and edit/soft-archive operations limited to MANUAL records.
- [x] Append-only prior-state revision and its additive migration.
- [x] Napló list includes a visible 44px-minimum back link to the overview above its heading, with the shared keyboard-focus indicator.
- [x] The manual-entry archive POST is exposed at the documented nested `/archive` route used by the Journal detail UI.

## Acceptance criteria

- [ ] A member sees only entries from the selected household and can filter/page without exposing another household's IDs or amounts.
- [ ] Only permitted roles and fields can be edited or archived; a foreign entry ID and a foreign category ID do not change records.
- [ ] An archived row remains available in the agreed audit view and is excluded from active totals according to the approved policy; receipt-linked entries cannot be changed in a way that breaks their source relationship.

## Dependencies

EPIC-03-T02 and the approved edit/archive audit policy. Category changes from T01 must be handled consistently.

## Verification checklist

- [ ] In the existing local app with synthetic data, check filters, pagination, allowed/denied edits, archive behavior and cross-household IDs. Do not add or run automated tests.
- [x] In the existing synthetic T09 household, confirm the manual-entry archive action succeeds, archived rows appear in the explicit archived list, disappear from the active list, and are excluded from T04 monthly/category totals.
- [ ] In the browser, verify the overview link is visible above “Napló”, has a minimum 44px target and visible keyboard focus, and navigates to `/`.

## Non-goals and open questions

Define whether posted receipt-derived expenses may be edited directly or only through their source workflow; retain a traceable correction path.

## Historical pre-implementation planning record — 2026-10-26

**Scope:** Build a household-scoped list and detail view over canonical ledger records from T02. The list supports real filtering by date, type, category, and archive state, plus bounded pagination; the default view shows active rows. Editing permitted fields on a manual entry and archiving it are separate confirmed actions. Receipt sources and product-line edits belong to EPIC-05. Creating new financial records remains in T02.

**Dependency order:** T02 provides the model, RON decimal contract, and household identifier. Preserve T01 archived category references on historical rows. First implement list/detail reads and the mobile Journal view, then edits/archive limited to approved fields; T04 uses the same active source set.

**Likely files:** `apps/api/src/app/api/v1/households/[householdId]/ledger-entries/route.ts` and an ID-based detail route consistent with ADR-0001; reuse `apps/api/src/lib/household-authorization.ts`; update `apps/api/prisma/schema.prisma` and add a migration only if audit/archive fields are not already in T02; update the view under `apps/web/src/app/naplo/` and the existing navigation; update `docs/architecture.md` to describe the implemented contract. Record the exact GET/PATCH/archive API contract before building the web client.

**Observable acceptance:** `read` access is available to OWNER/MEMBER/VIEWER; financial edits and archive are limited to the approved writer roles. A foreign household or entry ID reveals no data. Pagination is stable and bounded, and filters stay within the household. The UI follows the selected household and does not mix rows from the prior household. Archived rows remain in the audit view and are excluded from T04 active totals. Source-linked entries keep their source relationship.

**Manual verification:** In the running local app, use two synthetic households and synthetic RON data to check lists, filters, pagination, empty state, detail views, and household switching at 320/390 px and desktop. Check OWNER/MEMBER/VIEWER read/write behavior, foreign household and entry IDs, foreign categories, allowed manual edits, confirmed archive, and archive history. Do not write or run automated tests in this task; typecheck, lint, and diff-check are static quality gates.

**Open product decisions before coding:** (1) Which fields of a manual record can be edited after saving, and how are old values shown in audit history? (2) Can a receipt-posted expense be edited/archived directly in Journal, or only through its source workflow? Conservative proposal: disallow direct edits/archive for source-linked entries and audit changes to manual entries. (3) How long are archived rows retained? This task assumes full historical access and no deletion.

### Coordinator MVP working assumption — 2026-10-27

This implementation baseline is **not a user-approved product rule** and may change after a later user decision. OWNER and MEMBER may edit/archive only MANUAL entries; VIEWER is read-only. Each manual change records an append-only audit revision or full prior-state snapshot with actor and timestamp. Archive is a soft state change: manual rows are hidden from the default active list, remain in archive/audit views, and are excluded from active totals. RECEIPT entries cannot be edited or archived directly in Journal; future correction belongs to the EPIC-05 source workflow. The allowed manual fields and exact audit presentation must be recorded in the implementation contract. ADR-0001 leaves the audit policy to T03 and disallows direct receipt-line editing, so this working assumption does not conflict with it.

### Historical pre-implementation plan for the read API slice — 2026-10-27

**Scope:** Add only `GET /api/v1/households/{householdId}/ledger-entries`, preserving T02's existing POST route. Filter by calendar month or inclusive date range, type, and category ID. Use bounded page-number pagination ordered by `occurredOn DESC, id DESC`. The current `LedgerEntry` model has no archive field, so this slice does not add active/archive views. Detail, edit, and archive are out of scope.

**Likely files:** `apps/api/src/app/api/v1/households/[householdId]/ledger-entries/route.ts` and an ID-based detail route consistent with ADR-0001; reuse `apps/api/src/lib/household-authorization.ts`; update `apps/api/prisma/schema.prisma` and add a migration only if audit/archive fields are not already in T02; update the view under `apps/web/src/app/naplo/` and the existing navigation; update `docs/architecture.md` to describe the implemented contract. Record the exact GET/PATCH/archive API contract before building the web client.

**Dependencies:** EPIC-03-T01 categories, the T02 canonical RON ledger model, and household read authorization through `authorizeHouseholdOperation`. Every query is restricted to the authorized household ID.

**Acceptance and verification:** After read authorization for MEMBER/OWNER/VIEWER, return only that household's rows; serialize amounts as two-decimal strings; set `Cache-Control: no-store`; validate and bound date, type, category, and pagination parameters; keep ordering stable when dates match. Run API typecheck, lint, and diff-check, and, if the existing service is available, make a safe unauthenticated GET check. Do not create or run automated tests.

**Open decisions:** Ledger archive/audit policy and edits to source-linked entries remain product decisions for a later T03 slice; this read-list slice does not change them. Supplying both a date range and `month` is treated as an invalid request (`400`).

### Historical pre-implementation plan for the web read view — 2026-10-27

**Scope:** Build a household-scoped list and detail view over canonical ledger records from T02. The list supports real filtering by date, type, category, and archive state, plus bounded pagination; the default view shows active rows. Editing permitted fields on a manual entry and archiving it are separate confirmed actions. Receipt sources and product-line edits belong to EPIC-05. Creating new financial records remains in T02.

**Likely files:** `apps/api/src/app/api/v1/households/[householdId]/ledger-entries/route.ts` and an ID-based detail route consistent with ADR-0001; reuse `apps/api/src/lib/household-authorization.ts`; update `apps/api/prisma/schema.prisma` and add a migration only if audit/archive fields are not already in T02; update the view under `apps/web/src/app/naplo/` and the existing navigation; update `docs/architecture.md` to describe the implemented contract. Record the exact GET/PATCH/archive API contract before building the web client.

**Dependencies:** T01 category reads, the T02 canonical ledger model, and the GET `/api/v1/households/{id}/ledger-entries` contract. A household ID stored in the browser is only a preference; the API makes authorization decisions server-side.

**Acceptance and verification:** After switching households, rows from the prior selection are no longer visible. Filters send only contract parameters and reset to page one when changed; pagination and page size are bounded. Loading, error, empty, and list states are clear; RON amounts and income/expense types are easy to distinguish. The UI works at 320/390 px and desktop with labeled controls and visible focus. Run typecheck, lint, and diff-check; if safe, manually inspect in an existing signed-in session. Do not add/run automated tests, modify entries, or sign out.

**Open UI assumption:** Default to the current month; allow the user to choose a custom date range or all dates. Do not show a detail route or action that does not exist.

### Historical next API slice plan: edit and archive manual entries — 2026-10-27

**Status and scope:** The T03 read-only list was complete at the time of this plan. This next bounded slice covers the update API, soft archive, and persistent audit history. The authorization and retention rules below are coordinator MVP assumptions, **not separate user approvals**. The Journal edit form and audit view are a separate later T03 web slice; this plan does not mark them complete.

**Operation rules:** After a fresh `financial-write` check, OWNER and MEMBER may update only an active MANUAL entry in their own household: type, positive two-decimal RON amount, `occurredOn` date, an allowed active category, and note. `currency`, `householdId`, `sourceType`, `sourceId`, creator, and the original idempotency key are immutable. EXPENSE/REFUND require an active household category; INCOME has no category. VIEWER is read-only. RECEIPT entries cannot be edited or archived here; corrections belong to the EPIC-05 source workflow.

**Audit and archive:** In the same database transaction, each successful manual edit/archive appends a revision with the full prior entry state, actor ID, action, and timestamp. Archive is a soft state change: archived manual rows leave the default active GET list and later T04 active totals, but remain available through archive/audit queries and revisions. The server must prevent concurrent edits or repeated archive from silently losing data or creating duplicate revisions; record the exact version/conflict response in the implementation contract. No hard delete or general restore is in this slice.

**Likely files and dependencies:** Add archive state and revisions through `apps/api/prisma/schema.prisma` and a new additive migration; selectively reuse T02 validation/serialization in `apps/api/src/lib/ledger-entry.ts`; add `apps/api/src/app/api/v1/households/[householdId]/ledger-entries/[entryId]/route.ts`; update the existing `ledger-entries/route.ts` to default to active rows and allow an explicit archive query. Reuse household authorization, the same-origin JSON mutation guard, and `no-store` errors. Inputs are T01 category archival, the T02 precise RON contract, and the completed T03 read list; T04 consumes active rows. T09 may use the same append-only revision principle for its own RECURRENT rows, but those are not editable through T03's public manual-entry endpoint.

**Acceptance and manual verification:** With two synthetic households, check allowed OWNER/MEMBER manual edit/archive, VIEWER `403`, unauthenticated `401`, non-disclosing `404` for foreign household/entry IDs, blocked RECEIPT edits, rejected foreign/archived categories and invalid RON/date/fields, and no audit writes after failed requests. After a successful edit, retrieve prior state and actor/time; after archive, confirm exclusion from the active GET list and inclusion in the explicit archive/audit query. Retries and conflicting requests must not silently overwrite data. Use the running local app/API with synthetic data; do not add/run automated tests. Typecheck, lint, Prisma migration diagnostics, and diff-check are static gates.

**Open technical contract:** Record the exact detail/revision URL, conditional-version check, and PATCH/archive response at the start of implementation. Give the web audit viewer its own short plan before that separate T03 slice. Product assumptions may change after user clarification.

### API edit/archive slice — pre-implementation plan, 2026-10-27

**Scope:** Add only household-scoped detail, update, and soft-archive behavior for active `MANUAL` ledger entries; preserve the existing T02 POST and T03 collection filters/pagination. `OWNER` and `MEMBER` may mutate; `VIEWER` may read. `RECEIPT` entries are immutable through this API. Save the full previous ledger state, actor, action, and timestamp as an append-only revision in the same transaction as every successful update/archive. Active list behavior remains the default; `archived=true` selects archived rows.

**Likely files:** `apps/api/prisma/schema.prisma`; one additive migration; the existing collection `route.ts` for archive filtering only; a new `[entryId]/route.ts`; a focused ledger helper; `docs/architecture.md` for implemented facts. Do not change web code or the T02 POST contract.

**Dependencies:** Existing T02 ledger schema, RON parser/payload, household `read` and `financial-write` authorization, same-origin JSON mutation validation, T01 active-category semantics, and the implemented T03 GET contract.

**API contract:** `GET /api/v1/households/{householdId}/ledger-entries/{entryId}` returns `{ entry, revisions }`; each revision contains its action, actor ID, timestamp, and prior full entry snapshot. `PATCH` accepts a partial subset of `type`, `amount`, `occurredOn`, `categoryId`, and `note`, plus required `expectedUpdatedAt` (the current `updatedAt` ISO string); it returns `{ entry }`, and stale versions return `409`. `POST .../{entryId}/archive` accepts an empty JSON object and returns `{ entry }`; repeating archive is idempotent and does not append another revision. Collection GET accepts one `archived=true|false` parameter; omission and `false` mean active rows, `true` means archived rows. Responses and errors remain `no-store` and use the existing `{ error: { code, message } }` shape.

**Acceptance/verification:** Verify OWNER/MEMBER updates and archives only active MANUAL entries, VIEWER denial, receipt immutability, cross-household non-disclosure, same-household active category validation, complete prior-state revisions, transaction atomicity, stale-update conflict handling, idempotent repeat archive, and active/archived list selection. Run API typecheck, lint, Prisma schema/migration diagnostics, diff-check, and an unauthenticated safe request. Do not add/run automated tests or mutate household data.

**Open decisions/assumptions:** The role, retention, and receipt rules above are coordinator MVP working assumptions in the existing addendum, not separate user approvals. No hard delete or restore is introduced. The contract exposes revision snapshots only through the detail endpoint; a rendered audit history belongs to a later web slice.

**Verification record — 2026-10-27:** API typecheck, targeted ESLint, `prisma validate`, schema-to-SQL `prisma migrate diff`, and `git diff --check` passed. No automated tests or database migration were run. The unauthenticated detail request could not reach either `127.0.0.1:3001` (API) or `127.0.0.1:3000` (web proxy), so HTTP authorization behavior was not manually verified; no development process was started or restarted.

### Implementation and verification status — 2026-10-28

**Status: pending completion.** Collection/detail/edit/archive API and ledger list/detail UI code are present in `apps/api/src/app/api/v1/households/[householdId]/ledger-entries/`, `apps/api/src/lib/ledger-entry-maintenance.ts`, and `apps/web/src/app/naplo/`. The additive migration `apps/api/prisma/migrations/20261027120000_ledger_entry_edit_archive/migration.sql` exists but has not been applied to the local database according to the recorded verification. The 2026-10-27 static checks are recorded above; synthetic authorization, edit/archive/audit and UI checks remain open.

**Decision needed before acceptance:** The implemented OWNER/MEMBER mutation policy, MANUAL-only editing/archive rule, and associated retention details are recorded as coordinator working assumptions in this task, not user-approved product policy. Product owner should confirm or revise those rules before the task is accepted. Acceptance and manual verification checkboxes remain unchecked.

### MVP navigation addition — pre-implementation plan, 2026-10-28

**MVP phase:** `MVP now`, explicitly assigned for this scoped navigation addition.

**Scope:** Add one visible, clearly labeled link from the Napló list to `/`, placed before the Napló heading. Reuse the back-link visual treatment from `/naplo/uj`; make the target at least 44 px high and retain a visible keyboard-focus indicator. Do not change ledger behavior, data, APIs, or other task status.

**Likely files:** `apps/web/src/app/naplo/ledger-list.tsx` for the link and placement; `apps/web/src/app/naplo/ledger-list.module.css` for the reusable back-link treatment. Reference the existing link in `apps/web/src/app/naplo/uj/new-ledger-entry.tsx` and `.module.css`, and the global `:focus-visible` rule in `apps/web/src/app/globals.css`.

**Dependencies:** The existing T03 Napló list and implemented home route `/`; no API or schema dependency.

**Acceptance and verification:** The Napló list presents a Hungarian label identifying the home/overview destination above its heading; activation navigates to `/`; the link has a minimum 44 px target and visible keyboard focus. Run web typecheck, web lint, and diff-check; do not add/run automated tests or touch household data. No unresolved decision remains for this addition.

**Verification record — 2026-10-28:** Under Node 24.22.1, `pnpm --filter web typecheck` and `pnpm --filter web lint` passed; `git diff --check` reported no whitespace issues. Source uses `Link href="/"` before the `Napló` heading and a 44px-minimum `.back` style copied from `/naplo/uj`; the existing global `:focus-visible` rule supplies the focus ring. Browser click/focus verification was not run, so the new verification checklist item remains unchecked. No automated tests or data operations were performed.

### Archive route correction — 2026-10-29

The T04 tester found that the Journal detail called `POST .../ledger-entries/{entryId}/archive`, while the archive handler had been placed at the base `{entryId}` route. The handler now lives at `apps/api/src/app/api/v1/households/[householdId]/ledger-entries/[entryId]/archive/route.ts`, matching the existing client call and T03 API contract. The undocumented base-route `POST` was removed after confirming there were no in-repository callers. The nested handler reuses `authorizeHouseholdOperation(..., "financial-write")`, `validateSameOriginJsonMutation`, and `archiveManualLedgerEntry`; the request validation and response/error payloads remain unchanged. No schema, migration, policy, web client, or data was changed by this correction.

Under Node 24.22.1, `pnpm --filter api typecheck` and `git diff --check` passed. The API package has no `lint` script. The running-app archive request and active/archived Journal/dashboard reconciliation remain pending tester verification; do not treat this route correction as closing T03 or T04.

**Tester runtime evidence — 2026-10-29:** After the nested archive route correction, the existing synthetic T09 test entry (`cmvtme8i0002g768zurphgo3b`, 0.01 RON manual expense) archived successfully in the Journal detail UI. The detail page showed an archived state and success status. Authenticated `GET .../ledger-entries?archived=true&page=1&pageSize=100` returned the row (`totalItems: 1`); `archived=false` returned the two recurring rows only (`totalItems: 2`). October dashboard and Overview totals returned to 101.25 RON gross/net, with 101.25 RON Lakhatás category spend, excluding the archived 0.01 RON row. No unrelated record was modified. The broader verification checklist and T03 acceptance remain open.
