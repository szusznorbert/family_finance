# EPIC-03-T04: Show monthly household totals

## Goal and user value

Members can see trustworthy monthly RON totals and category summaries from the canonical ledger.

## Scope

Show monthly income, expense and refund summaries and category breakdowns for the selected household. Count source-linked ledger entries once and exclude receipt item lines from ledger aggregation.

## Implementation checklist

- [x] Household-scoped monthly dashboard API with RON decimal-string aggregation.
- [x] The home overview loads and displays monthly and category totals.
- [x] The overview reuses the selected household's authorized ledger and category GET endpoints to show at most five newest active entries, without changing the monthly totals.
- [x] The Journal link follows the category breakdown and sits immediately above the recent-items list; loading, empty, error/retry, and stale-response/household-switch handling are implemented.
- [x] Recent entries reuse the Journal row styles and field hierarchy, and each whole row links to its detail page with a descriptive accessible name and visible keyboard focus.

## Acceptance criteria

- [x] Monthly and category totals derive from permitted active canonical ledger rows in the selected household and retain decimal precision in RON.
- [x] A nonmember cannot request another household's dashboard by ID.
- [x] Archived rows follow the approved reporting policy.
- [x] Each recent Overview entry matches the Journal row's visual layout and displayed values: category or type, date, type, optional note, and exact RON amount.
- [x] Each recent Overview row is an accessible link to that entry's existing `/naplo/{entryId}` detail page, using only the selected household's authorized entries.

## Dependencies

EPIC-03-T02; align archived-row treatment with T03. Receipt-linked reconciliation is deferred to [EPIC-05-T05](../../EPIC-05-receipts/tasks/EPIC-05-T05-one-ledger-expense.md) after the receipt-line model and approval flow exist.

## Verification checklist

- [x] In the existing local app with synthetic entries, manually reconcile monthly/category totals.
- [x] Manually confirm newest-first active entries and matching category names, empty state, and 320/390 px plus desktop layout in an already-running local UI.
- [x] Verify household-switch isolation in an already-running local UI.
- [x] Compare the same entries in Overview and Journal at 320/390 px and desktop for row layout, labels, date, note, and RON amount; activate each recent row by pointer and keyboard and confirm it opens the matching Journal detail page.
- [x] Verify error/retry UI in a safe synthetic session.
- [x] Verify archived-row reporting with the synthetic T04 archive-check entry.

## Non-goals and open questions

### User decision — 2026-10-29

The multi-line approved-receipt reconciliation checkpoint is deferred from T04 completion until EPIC-05-T05 implements receipt lines and approval. T04 does not claim this outcome as passed or verified. EPIC-05-T05 owns the follow-up: approve one synthetic multi-line receipt and verify the linked canonical Expense is counted once in household totals, without adding receipt item lines again.

Product price trends belong to EPIC-05 and are calculated from receipt lines separately. The household reporting date/time-zone rule was approved on 2026-10-27 and is recorded below.

## Historical pre-implementation planning record — 2026-10-26

**Scope:** Show actual monthly RON income, expenses, refunds, and category totals on the selected household’s financial home page. Calculate only from T02 canonical active ledger rows; do not add receipt product lines. Show an honest empty state for an empty month. Budgets, net worth, account balances, price trends, and forecasts are out of scope.

**Dependencies:** Requires T02’s precise RON amount and entry-type contract. Calculate from the same active records as defined by T03’s archive and source-row rules. Preserve the historical name of T01 archived categories in historical category summaries. After EPIC-05-T05, separately verify one receipt-linked expense with multiple product lines.

**Likely files:** A new household-scoped monthly aggregate API route under `apps/api/src/app/api/v1/households/[householdId]/`; server aggregation over the T02 ledger model; `apps/web/src/app/page.tsx` and, if needed, the financial home component/styles; `docs/architecture.md` for the completed data flow. Record the exact API response and month-parameter contract at the start of the shared server/web implementation.

**Observable acceptance:** The API checks current `read` membership and returns no totals for a foreign household ID; amounts are decimal strings. Count active ledger rows for the requested household and period exactly once; exclude archived rows and receipt-item rows. On household/month switch, the UI must not show stale data from the previous context. Handle uncategorized entries explicitly so they remain in the monthly grand total.

**Manual verification:** Use two synthetic households with multiple months of manual income, expenses, and refunds. Reconcile Journal rows to monthly/category totals at exact cent precision and repeat after archive. Check empty month, uncategorized row, month/household switch, foreign-household request, and 320/390 px and desktop layout. After EPIC-05 posting, prove that a multi-line receipt contributes only its one linked ledger expense. Do not add/run automated tests; typecheck, lint, and diff-check are static gates.

**Status of planning questions:** The user approved the monthly boundary and the effect of refunds reducing net expenses on 2026-10-27; details follow. Labels for gross expense, separate refunds, and net category totals remain a coordinator UX decision. Do not show net worth, remaining budget, or undefined “savings.”

### User-approved accounting rules — 2026-10-27

The monthly boundary uses the household calendar date in `occurredOn` (`YYYY-MM-DD`); the UI’s default current date/month uses `Europe/Bucharest`, and saved dates are not timezone-converted. A positive `REFUND` reduces net expenses and that category’s net total in its own month; it does not increase `INCOME`. The T02 task records the same user decision. ADR-0001 still calls these earlier working assumptions; the product decisions have since been approved, so there is no technical conflict.

### Coordinator presentation baseline — 2026-10-27

Labels for income, gross expenses, refunds, and net category spend must clearly show what was deducted. An approved receipt creates at most one canonical `RECEIPT` expense; product lines are not ledger rows. Do not show net worth, remaining budget, or other undefined metrics. This presentation baseline is not a separate user decision.

### Historical pre-implementation API slice plan — 2026-10-27

**Scope:** Add `GET /api/v1/households/{householdId}/dashboard?month=YYYY-MM` for household-scoped monthly totals. The endpoint checks current membership with `authorizeHouseholdOperation(..., "read")`, sets `Cache-Control: no-store` on every response, and reads only canonical `LedgerEntry` rows. `month` is required and must be an exact calendar-month `YYYY-MM`; convert date-only boundaries to UTC without timezone conversion for Prisma `@db.Date`.

**Response contract:** Return `month`, `currency: "RON"`, separate `income`, gross `expenses`, gross `refunds`, `netExpenses`, and per-category `categoryId`, `categoryName`, `expenses`, `refunds`, `netExpenses`. Serialize every amount as a fixed two-decimal string. Net expense/category values are expenses minus refunds; income remains separate. Uncategorized expense/refund rows go into a separate `Uncategorized` category summary so they do not disappear from totals. Count active rows only; archived category names remain visible for historical rows. No budget or net-worth metric.

**Likely files and dependencies:** Add `apps/api/src/app/api/v1/households/[householdId]/dashboard/route.ts`; reuse the T02 `LedgerEntry` Prisma model and existing membership authorization/amount serialization helpers. Use existing `archivedAt` fields on ledger entries and categories; no schema change or migration is expected.

**Verification:** Run API typecheck, lint, and diff-check; if the already-running local API is available, make a safe unauthenticated GET check. Do not start/stop processes, run migrations, modify financial data, or add/run automated tests.

**Open decisions:** None; the implementation instruction records the month, refund, archive, field, and route behavior.

### Historical pre-implementation web overview plan — 2026-10-27

**Scope:** Show actual monthly RON income, expenses, refunds, and category totals on the selected household’s financial home page. Calculate only from T02 canonical active ledger rows; do not add receipt product lines. Show an honest empty state for an empty month. Budgets, net worth, account balances, price trends, and forecasts are out of scope.

**Files and dependencies:** `apps/web/src/app/page.tsx` and a new overview-specific CSS module. Depends on T04’s no-store `GET /api/v1/households/{id}/dashboard?month=YYYY-MM` response; default month uses `Europe/Bucharest`, and amount fields are decimal strings. Use T05 shell tokens and existing responsive navigation.

**Acceptance and verification:** Show clearly separated RON totals for income, gross expenses, refunds, and net expenses; show gross expense/refund context beside each category net total. Loading, error, empty data, month switch, and household switch must not show stale amounts from a prior context. At 320/390 px, avoid horizontal overflow and nested card stacks. Run static typecheck, lint, and diff-check; do not add/run automated tests. Browser checks require an already-running local server.

**Open decisions:** None; the implementation instruction records the month, refund, archive, field, and route behavior.

### Implementation status — 2026-10-28

**Status: pending completion.** Both the monthly dashboard API and the home-page dashboard UI are present in `apps/api/src/app/api/v1/households/[householdId]/dashboard/route.ts`, `apps/web/src/app/page.tsx`, and `apps/web/src/app/overview.module.css`. The UI requests the selected household/month and renders income, gross expenses, refunds, net expenses and category totals. The architecture document's later “missing features” list still names this dashboard; that list is stale relative to these source files and should not be treated as proof that the dashboard UI is absent.

**Verification status:** Pending completion: apply the required T03 migration and run a synthetic dashboard runtime smoke/reconciliation. No task-level synthetic reconciliation or cross-household runtime evidence is recorded. Category/month reconciliation, archive behavior, responsive UI and (after EPIC-05 posting exists) one-expense-per-receipt reconciliation remain open. Acceptance and verification checkboxes remain unchecked.

### Pre-implementation planning pass — recent ledger slice — 2026-10-28

**MVP phase:** MVP now, as explicitly approved for this slice.

**Scope:** Extend the existing home overview with at most five newest active ledger entries from the selected household. Reuse `GET /api/v1/households/{householdId}/ledger-entries?page=1&pageSize=5&archived=false` (ordered by `occurredOn` descending, then ID descending) and the existing household-scoped categories endpoint to resolve category names, including preserved names for archived categories. Keep monthly totals and category breakdown unchanged. Place “Napló megnyitása” after the category breakdown, directly above the recent entries. Provide accessible loading, empty, error, and retry states; on household changes, old-household entries must be hidden immediately and late responses must not replace the selected household’s state. No endpoint, schema, or database change.

**Likely files and dependencies:** `apps/web/src/app/page.tsx` and `apps/web/src/app/overview.module.css`. Depends on the existing authorized, `no-store` ledger GET contract (`entries` with decimal-string `amount`, `occurredOn`, `type`, `categoryId`, and optional `note`) and categories GET contract (`categories` with `id`, `name`, and `archivedAt`). Both endpoints enforce current household `read` membership. No new server contract is required.

**Acceptance and verification:** Show no more than five active entries for the selected household, newest first, with existing category names and correct RON amounts/type/date. Retain the monthly summary and category totals, with the Journal link immediately before the recent list. Loading/error/empty/retry states are announced accessibly. Switching households hides prior entries before the new request resolves; stale responses are ignored. Run web typecheck, lint, and diff-check; manually inspect using only existing synthetic data if a local UI is already available. Do not add or run automated tests or modify data.

**Approved visual and interaction refinement:** Match the Napló list row’s information hierarchy and fields: category/title, date and entry type, source label when applicable, note when present, and right-aligned RON amount. Make each row a link to `/naplo/{entryId}` with a clear accessible name, keyboard access, and visible focus styling. Reuse or extract the existing row presentation where practical; keep this a small overview slice rather than a broad ledger-list refactor. Verify the overview row’s screen-reader name, tab/focus behavior, and route target alongside the existing five-entry, household-isolation, and state checks.

**Open decisions:** None for this approved MVP slice. Category GET failure should remain a visible recoverable error rather than silently showing potentially misleading category labels.

### Implementation status — 2026-10-28 (recent-items MVP)

**Status: pending completion.** The Overview now requests `page=1&pageSize=5&archived=false` and the selected household's category list, renders recent entries with the existing Journal row styles and field hierarchy, and keeps the existing dashboard totals unchanged. Each complete row links to `/naplo/{entryId}` and includes a descriptive accessible name; the existing global `:focus-visible` treatment supplies a visible keyboard focus indicator. The Journal link is after the dashboard/category breakdown and directly above the recent list. The list has status-announced loading/empty states, an alert with retry on errors, a 30-second request bound, and state keyed by user plus household so prior-household entries stay hidden and stale responses are ignored.

**Verification status:** Node 24 web typecheck, web lint, and `git diff --check` passed after the row-link refinement. No browser/manual UI, API, database, fixture, or automated-test verification was performed. New recent-items acceptance and manual verification criteria therefore remain open; existing monthly reconciliation, cross-household, archive, responsive, and receipt-posting checks remain open as recorded above.

### Cross-task archive-route defect plan — 2026-10-29

**Discovery and ownership:** During EPIC-03-T04 manual verification, the tester found that the existing Napló entry-detail UI sends archive requests to `POST /api/v1/households/{householdId}/ledger-entries/{entryId}/archive`, while the API currently handles `POST` at `.../ledger-entries/{entryId}`. The existing EPIC-03-T03 API contract and `docs/architecture.md` specify the nested `/archive` route. This is a cross-task follow-up owned by **EPIC-03-T03** (ledger edit/archive), discovered while verifying T04's new link to the existing detail page; it does not expand T04's dashboard implementation scope. T04 remains pending its own dashboard and recent-row manual checks.

**Minimal planned correction:** Align the API implementation with the existing T03 contract and UI caller by exposing the current `archiveManualLedgerEntry` operation at the nested `POST .../{entryId}/archive` route. Keep the existing authorization (`financial-write`), same-origin JSON validation, MANUAL-only behavior, immutable source-entry response, audit/revision behavior, and response body unchanged. Do not change schema, migration, ledger policy, dashboard logic, or the already-correct UI URL. Check in-repository callers before removing the current base-path POST handler; the current source search found the detail UI's nested path and no base-path archive caller.

**Likely files:** Add `apps/api/src/app/api/v1/households/[householdId]/ledger-entries/[entryId]/archive/route.ts`; update `apps/api/src/app/api/v1/households/[householdId]/ledger-entries/[entryId]/route.ts` to avoid leaving an undocumented duplicate archive endpoint. Reuse `archiveManualLedgerEntry` from `apps/api/src/lib/ledger-entry-maintenance.ts`; no helper or database changes are expected. `apps/web/src/app/naplo/[entryId]/ledger-entry-detail.tsx` is the observed caller and should remain unchanged unless implementation review finds the accepted API contract differs.

**Dependencies:** Existing T03 archive contract, `archiveManualLedgerEntry`, `authorizeHouseholdOperation`, and `validateSameOriginJsonMutation`. No new product decision or migration is required. Verify T03's product/role assumptions against its existing task and do not alter them as part of this route fix.

**Acceptance and verification:** In the running local app with an existing synthetic MANUAL expense, confirm the UI's archive action reaches the nested route, receives `200` with `{ entry }`, and updates the detail state/notice. Confirm the entry disappears from the active Journal and remains visible in the archived view with its revision history. Confirm existing guards remain effective for an unauthorized role/foreign entry and that source-linked RECEIPT/RECURRENT entries remain immutable; repeated archive preserves the existing idempotent behavior. Run API typecheck/lint and `git diff --check`; do not add automated tests or create extra database fixtures for this narrow correction. Record actual results in the T03 verification log and keep T04's independent acceptance items open until separately verified.

**Open decisions:** None for product behavior. Implementation should match the documented nested route; the only technical check before editing is whether removing the undocumented base-path POST has any in-repository caller beyond the one already searched.

### Manual verification evidence — 2026-10-29

**Environment and data:** The already-running local application was checked in a separate browser tab using the synthetic household `T09 Teszt háztartás 2026-10-29` (`cmvtic6qk000cru8zwsg5yq7y`). The initial read-only reconciliation used its two active recurring ledger entries: October 1, 2026 and November 1, 2026, both 101.25 RON, category Lakhatás, note “Teszt lakbér”. A later archive-flow probe created one 0.01 RON synthetic manual row, documented below; it was subsequently archived successfully after the route correction.

**Observed results:** `GET /api/v1/households/cmvtic6qk000cru8zwsg5yq7y/dashboard?month=2026-10` returned income `0.00`, gross expenses `101.25`, refunds `0.00`, net expenses `101.25`; Lakhatás category expenses/net were `101.25` and refunds `0.00`. This reconciled to the single active October Journal row. A separate authenticated GET for synthetic foreign household `cmvtlk0p6001i768z85alzvke` returned HTTP 404 `NOT_FOUND`. The all-dates Journal listed November before October. October Journal showed the exact one-row amount/category/date match. A month with no entries returned zero totals and the Journal's “Még nincs ilyen tétel” empty state.

The Overview and Journal were compared at 320 px, 390 px, and 1280 px. No horizontal overflow was observed (Overview `scrollWidth` was 305 at 320 px and 375 at 390 px; Journal was 320 and 390 respectively). At the bottom of the Overview, both recent rows were fully visible and matched the Journal's displayed category, date/type, source, note, and RON amount. Pointer click and Enter activation on each recent row opened the matching `/naplo/{entryId}` detail with the expected 101.25 RON, date, category, type, note, and source.

**Receipt checkpoint:** The user explicitly deferred the multi-line receipt-to-single-ledger-expense checkpoint to EPIC-05-T05. T04 no longer treats it as an open acceptance gate. The Prisma schema currently has no receipt-line or extracted-product model; `Document` only stores private-file metadata, and `LedgerEntry` has a `RECEIPT` source type but no receipt-line relation. The follow-up belongs to EPIC-05-T05.

The 0.01 RON synthetic manual expense (“T04 archived policy check”, ID `cmvtme8i0002g768zurphgo3b`) was created through the ordinary Journal form in the T09 test household. The first archive attempt, before the developer's route correction, failed with “Az archiválás nem sikerült.” After the route correction, the same UI flow succeeded: the detail page showed “Archiválva” and a success status. Authenticated `GET .../ledger-entries?archived=true&page=1&pageSize=100` returned this row as the only archived result (`totalItems: 1`, amount `0.01`, date `2026-10-29`); the `archived=false` query returned only the two recurring rows (`totalItems: 2`), omitting this row. `/naplo?archived=true` showed it (1–1 / 1), while active `/naplo` omitted it. October dashboard GET and Overview returned income `0.00`, gross/net expenses `101.25`, refunds `0.00`; Lakhatás category gross/net was `101.25`, matching the active October recurring row. No unrelated row was modified.

### Additional verification — household switch and retry — 2026-10-29

For household isolation, I registered a disposable synthetic owner through the local registration UI and created a populated household through onboarding. A scoped, empty second household was then created for that same `@example.test` owner with an OWNER membership and the nine seeded expense categories. No existing household's financial data was changed. The populated household ID is `cmvtn6ff4002i768zx1ervg74`; the empty household ID is `t04switch20261029`. The populated household contained one manual 17.35 RON Lakhatás expense dated 2026-10-29 with note “T04 isolation source row”. Its Overview showed 17.35 RON gross/net and that recent row. Switching to the empty household updated the selected label, showed 0.00 RON totals, no category entries, and “Még nincs rögzített tétel.” Switching back restored the 17.35 RON totals and the exact recent row. This verifies the visible household content changes with the selected household.

For retry, I kept web port 3000 running and temporarily stopped only the independently launched API process on 3001. Changing the Overview month from October to September triggered an API failure and displayed “A havi összesítés most nem tölthető be.” with “Újrapróbálás”. I restarted the API using `PATH=/Users/norbertszasz/.nvm/versions/node/v24.22.1/bin:$PATH pnpm --filter api dev`, clicked retry, and observed the September zero-total/empty state. The API log recorded `GET /api/v1/households/cmvtn6ff4002i768zx1ervg74/dashboard?month=2026-09 200`. I restored the Overview to October; it again showed 17.35 RON and the synthetic row. Both web and API servers remain running in separate sessions. The first stop attempt had terminated the shared parallel supervisor and briefly stopped both ports; both were promptly restarted separately before this successful isolated retry check.

`git diff --check` passed after updating both T04 and T03 verification records. T04's receipt-line checkpoint remains deferred to EPIC-05-T05 by the user's decision; the remaining T04 checklist items are now verified.

### Current task status — 2026-10-29

**Status: completed.** All current T04 acceptance criteria and verification checklist items are checked against the dated implementation and tester evidence above. Monthly/category totals, nonmember access, archive reporting, recent-row content and navigation, household-switch isolation, empty/error/retry behavior, and responsive Overview/Journal comparison were manually verified with synthetic data. The multi-line approved-receipt reconciliation was explicitly deferred by the user to EPIC-05-T05 and is not claimed as passed. `git diff --check` passed.
