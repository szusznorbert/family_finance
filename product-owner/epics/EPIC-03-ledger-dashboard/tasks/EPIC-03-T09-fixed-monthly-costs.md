# EPIC-03-T09: Configure optional recurring monthly costs

### Targeted worker verification plan — 2026-10-29

**Scope:** Add a one-shot, explicitly scoped verification path for recurring occurrence materialization so the required catch-up, retry, and concurrency behavior can be checked against one already-existing synthetic rule. It must accept an explicit rule ID and bounded month selection; it must never fall back to a household-wide or global sweep. Normal scheduled worker behavior remains unchanged. No database or fixture creation is included.

**Likely files:** `apps/api/src/recurring-worker.ts`; `apps/api/src/lib/recurring-cost.ts` only if its existing exported materializer cannot satisfy the bounded invocation; `apps/api/package.json` only if a documented one-shot command is needed; this task file for the resulting evidence. Avoid schema/migration changes and frontend changes.

**Dependencies:** Existing idempotent `materializeRecurringMonth` service and a known synthetic rule ID/month in the current test database. The developer must inspect existing CLI/config conventions without reading or printing `.env` values. Any run against the database must pass automatic approval review; do not substitute another command or route if review blocks it.

**Acceptance and verification:** (1) Missing/invalid rule ID or month fails closed without invoking the global sweep. (2) One explicit synthetic rule/month can be materialized once, then replayed and concurrently invoked with no duplicate rule/month row. (3) A bounded range verifies missed-month catch-up and retry behavior only for that same rule. (4) A stopped rule generates no later occurrence. (5) Read-only DB inspection confirms no unrelated rule/household rows changed and no duplicate rule/month groups exist. Record the exact command and observed results without secrets. Keep the normal recurring worker schedule/loop behavior unchanged.

**Open decision:** None for product behavior. The developer must select the narrowest test-only or one-shot CLI seam after inspecting current service APIs; if no safe seam can be implemented without weakening the normal worker or bypassing automatic review, stop and report the blocker rather than run an unfiltered sweep.

### Planning amendment — deterministic catch-up verification — 2026-10-29

**Scope:** Extend the already-approved one-shot synthetic-rule verifier with an optional explicit `--as-of YYYY-MM-DD` clock override. It must still require exactly one `@example.test` rule ID and a bounded month range; it must call only `materializeRecurringMonth` and must never invoke `runRecurringSweep`. This lets the tester simulate a later Bucharest date and materialize otherwise-missing due months for an existing synthetic rule, without creating a database or fixture.

**Likely file:** `apps/api/src/verify-recurring-rule.ts`; update this task's verification evidence and `work/current-task.md` only after observed results. No schema, migration, normal worker, production route, or architecture change is in scope.

**Dependency:** Existing targeted verifier and the already identified active single-owner `@example.test` rule. User confirmed the database rows are test data and explicitly approved database commands.

**Acceptance and verification:** Validate a well-formed UTC date and reject invalid dates, missing values, unknown flags, and ranges beyond 12 months before any database write. With a synthetic `--as-of` date after two missing due months, observe only the selected rule's two expected RECURRENT rows; replay and run the same bounded command concurrently, then verify no additional rows or duplicate rule/month pair. Compare read-only aggregate counts for all other rules/households before and after. Confirm default current-clock behavior and normal `worker:recurring` loop remain unchanged. Run API typecheck and diff-check; run lint only if the API package defines a lint command.

**Data note:** The generated future-dated rows are synthetic test records and will remain in the existing test database; do not delete them. No product decision remains open. Stop if automatic approval rejects the exact scoped operation; do not try another execution path.

**MVP phase: `MVP now` — explicitly approved by the user.**

## Goal and user value

When creating a household, optionally configure recurring fixed costs (for example rent, a mortgage, or tax) once. Create a real canonical ledger expense automatically each month so the household does not need to enter the same item manually every month.

### User-approved scope change — 2026-10-29

The user removed actual screen-reader/VoiceOver usability as a T09 requirement. This supersedes earlier planning notes that listed VoiceOver narration as a closure gate. Keep semantic labels and roles in scope and record the observed CDP accessibility-tree and keyboard evidence; do not claim actual VoiceOver use was performed.

## User-approved product direction — 2026-10-27

- The user explicitly requested optional one-time setup during household creation and monthly automatic posting.
- Each month creates a **real `LedgerEntry`**, not a virtual dashboard total. One rule can create at most one entry per month.
- Editing a rule also updates its **already-created entries in prior months**. Only entries owned by that recurring rule may change; manual and receipt-derived entries are excluded. Prior values remain in append-only audit history.
- Later photo-based receipt entry and these fixed costs are the primary input paths. T02 manual entry is a rare fallback and must not become the primary onboarding or home-page action.

## Scope

- Household creation offers a short optional setup for multiple fixed costs. Current MVP fields: name, positive RON amount, expense category, monthly day (1–31), and start month. Preserve the existing short create-or-join onboarding; if skipped, create the household without fixed costs. Show the category selector only inside the expanded optional fixed-cost section; do not list the nine seed categories on the default onboarding screen.
- Household members can view fixed costs and their monthly entries. OWNER can add, edit, and stop rules; MEMBER and VIEWER are read-only. Editing explains its retroactive effect and preserves prior values in audit history. This is the current MVP role direction.
- Monthly generation uses exact RON amounts and stable source identity. Retries, recovery after server downtime, and concurrent runs must not create duplicates. Each entry is identifiable in the T03 Journal and counts exactly once in T04 monthly/category totals.
- Retroactive edits affect only entries created by the specific rule. Prior values, change time, and actor are auditable. Rules or entries from another household cannot be read or changed.

## Dependencies and order

1. T02: canonical `LedgerEntry`, precise RON contract, household authorization, and source identity.
2. T03: append-only revision/audit principle and archive/list view. RECURRENT rows remain separate from T03 direct editing, which is limited to MANUAL rows. T09 has its own controlled rule-edit workflow.
3. T04: monthly totals from active canonical rows. Final T09 manual verification uses T04 totals.
4. T08: optional setup within the existing household-creation flow. Joining by invitation does not create a new fixed-cost rule.

ADR-0003 and the existing schema extend the source model with recurring rule/month uniqueness and audit/revision links; the implemented code in this task already uses them.

## Implementation checklist

- [x] Fixed-cost rule and occurrence models, unique rule/month source, and additive migration.
- [x] Idempotent monthly entry-generation service and separate recurring worker.
- [x] Household-creation integration and rule GET/POST/PATCH/archive APIs.
- [x] Settings manager and RECURRENT source display in Journal.

## Acceptance criteria

- [x] Creating a household without `fixedCosts` creates no fixed-cost rules.
- [x] Creating a household with one fixed cost creates one rule for that household.
- [x] Creating households with multiple supplied fixed costs creates the corresponding rules in each household.
- [x] Configured rule amounts are returned as exact RON decimal strings (`88.01` API response).
- [x] A member of another household cannot read a foreign rule; the tested foreign rule returned `404`.
- [x] A due current-month rule creates a real `RECURRENT` ledger entry that is readable in Journal detail.
- [x] The tested due rule produced one current-month entry with exact RON cents.
- [x] The tested monthly dashboard totals matched the expected cent totals before and after rule edit.
- [x] Repeated, retried, concurrent, and catch-up generation creates no duplicate rule/month entries for the tested synthetic rule and range.
- [x] Editing a rule updates its existing prior RECURRENT entry's tested amount and day.
- [x] Editing a rule appends a prior-state revision for the changed RECURRENT entry.
- [x] Future occurrences use the updated rule values.
- [x] The tested MANUAL control entry remained unchanged after a recurring-rule edit.
- [x] A synthetic RECEIPT ledger row in the same isolated test household retained its amount, date, note, and archive state after recurring-rule edit.
- [x] OWNER can stop a rule.
- [x] Replaying the same OWNER stop request also returned `200`.
- [x] A previously created RECURRENT entry remains readable after its rule is stopped.
- [x] A later edit to the stopped rule is rejected.
- [x] Stopping a rule prevents its future monthly entry, while preserving the prior entry's approved archive and audit state; targeted future run returned `inactive`, and archived occurrence state survived rule edit in the synthetic fixture.
- [x] MEMBER can read household rules.
- [x] VIEWER can read household rules.
- [x] MEMBER rule creation is denied.
- [x] MEMBER rule editing is denied.
- [x] VIEWER rule creation is denied.
- [x] VIEWER rule editing is denied.
- [x] MEMBER and VIEWER cannot stop a rule; the authenticated requests returned `403` in the dated role-fixture check below.
- [x] A signed-out rule-list request is rejected with `401`.
- [x] An invalid rule amount is rejected with `400`.
- [x] The household-creation UI allows fixed-cost setup to be omitted; submitting with no optional rows created the synthetic household and opened its empty Overview.
- [x] At 320/390 px, the optional setup stays collapsed on the default create-or-join screen and the tested create form has no horizontal overflow.
- [x] Seed categories remain hidden on the default household-creation view; the category selector appears only after expanding the optional section.

## Verification checklist

- [x] In synthetic households, creating without `fixedCosts` yielded zero rules; one- and two-rule setups yielded rule-list counts of one and two in their respective households.
- [x] The onboarding optional-cost section was collapsed by default; expanding it revealed the repeatable fixed-cost form and category selector.
- [x] A new synthetic household was created through onboarding with one fixed cost; its due October occurrence appeared immediately in the Journal and dashboard.
- [x] A future-start rule produced no current-month entry, while due current-month rules produced real `RECURRENT` entries.
- [x] The tested generated entry appeared once with exact RON cents and a readable detail.
- [x] The tested dashboard returned the exact expected cent totals before and after a rule edit.
- [x] Verify targeted repeated, concurrent, retry, and missed-month catch-up materialization does not duplicate entries for the selected synthetic rule. See dated evidence below; concurrent creation from an empty month remains untested.
- [x] A synthetic OWNER-added rule was created successfully; OWNER edit succeeded, same-key replay succeeded, and conflicting-intent and stale-version requests returned `409`.
- [x] The edited RECURRENT entry reflected the tested amount/day change and gained one prior-state revision; the synthetic MANUAL control entry remained unchanged.
- [x] A synthetic RECEIPT entry was captured before and after recurring-rule edit in the same fixture and remained unchanged.
- [x] OWNER stop succeeded.
- [x] Replaying the same OWNER stop key returned `200`.
- [x] The prior entry remained readable after stop.
- [x] A subsequent edit was rejected with `409`.
- [x] Targeted stopped-rule future month returned `inactive` with no entry; an archived synthetic occurrence retained the exact `archivedAt` timestamp after rule edit.
- [x] MEMBER rule read returned `200`.
- [x] VIEWER rule read returned `200`.
- [x] MEMBER create and edit attempts returned `403`.
- [x] VIEWER create and edit attempts returned `403`.
- [x] A foreign rule read returned `404`.
- [x] Signed-out rule listing returned `401`.
- [x] An invalid amount returned `400`.
- [x] Read-only aggregate counts showed zero duplicate rule/month groups after the synthetic checks.
- [x] An invalid final household-creation item returned `400`; the authenticated synthetic account's household count remained 0 before and after, confirming no partial household/rule state.
- [x] Fixed-cost setup can be omitted in the household-creation UI; a synthetic zero-cost submission redirected to Overview.
- [x] At 320/390 px, the default onboarding stayed short, the optional panel remained closed until requested, and seed categories appeared only inside the expanded section.
- [x] CDP `Accessibility.getFullAXTree` exposed named textboxes, combobox, spinbutton, date control, and ordinal remove buttons for the optional fixed-cost form. This confirms roles/names, not actual screen-reader use.
- [x] At 320/390 px, measured every visible onboarding input, select, and button at 44 CSS px height or greater.
- [x] At 320 px, keyboard-only onboarding traversed and submitted the optional fixed-cost setup with Tab/Enter; the created RON 88.01 rule and current-month entry appeared in Overview.
- [x] At actual 200% Chrome Page zoom in a fresh profile, the expanded optional fixed-cost form and one cost row fit at 320/390 px device viewports without horizontal overflow (`innerWidth` 160/195; `scrollWidth` 160/187; DPR 2).
- [x] Synthetic MEMBER and VIEWER can open Settings, Journal, and the recurring-entry detail at 320/390/1280 px with no horizontal overflow; both see the recurring row/detail and have no fixed-cost management actions. The detail exposes no edit/stop/delete controls.
- [x] Synthetic OWNER fixed-cost management controls appeared at 320/390/1280 px; all three roles switched between the invited household and their own second household in Settings at 320/390/1280 px, and the selected role/context changed accordingly.
- [x] At 320 px, switching the OWNER fixed-cost list to a second empty synthetic household showed the empty state; switching back showed only the original household's `88.01` RON rule.
- [x] At 320 px, the OWNER fixed-cost Settings list, Napló row, and RECURRENT detail loaded with no horizontal overflow; detail was read-only and showed `Havi fix költség` as source.

## Non-goals and open decisions

EPIC-06 later handles bill approval, paid/unpaid state, due dates, and reminders. T09 provides recurring monthly ledger costs and their source audit only; EPIC-06 must attach to the same occurrence instead of creating a second expense.

Use the specified day from 1–31. If a month is shorter, use its final calendar day. The architect chooses how automatic generation and catch-up run for self-hosted operation; a virtual total calculated only when a page is visited does not meet the user’s request for a real ledger entry.

### Provisionally retained fields and routine MVP assumptions — 2026-10-27

The user replied `egyelőre maradjon` (“leave it as is for now”) to the detailed initial proposal. For the current MVP this retains optional setup during household creation, later editing under Settings, five fields (name, RON amount, category, monthly day, start month), and adjustment to the last day of short months. This is a provisional direction, not a claim that the fields can never change. No additional user decision is pending for this implementation. The real monthly ledger entry and append-only audit updates to the rule’s own prior entries were separately and explicitly approved.

Record the following routine MVP behavior as a coordinator assumption, not a user approval: default the start month to the current `Europe/Bucharest` month; on first entry, allow the current or a later month. Create an entry for the current month even if its monthly day has passed. The start month cannot be changed after creation; changes to name, amount, active category, or day apply to all existing past and future entries for that rule, without unarchiving rows, and create prior-value revisions. Stopping a rule prevents only future, not-yet-created months; prior entries and audit remain. Only OWNER can create/edit/stop a rule; MEMBER and VIEWER can read. The expanded optional form requires an active category, but the default household-creation screen still does not list seed categories.

These assumptions do not change the user-approved retroactive-correction boundary: only entries created by the same recurring rule may be changed, and every prior state remains in append-only audit. T03 manual and EPIC-05 receipt entries are separate sources. The architect owns exact source keys, scheduling, locking, and retry details; no additional user decision is required for the current planning baseline.

## Small implementation slices in dependency order

The slices below have separate implementation and manual-verification cycles within T09. Each slice requires a dated read-only `product_owner` planning pass under repository rules before coding. File owners must not overwrite each other’s changes; shared files are touched sequentially.

| Slice and owner | Dependencies and likely files | Manual acceptance |
|---|---|---|
| **A. Source and rule contract** — architect decision, then developer schema | Canonical T02 entry and T03 audit; architect records the new RECURRENT source and rule/month uniqueness in ADR-0001. Developer owns `apps/api/prisma/schema.prisma` and a new additive migration. Generation code belongs to slice B. | Two synthetic households remain isolated; the same rule/month cannot create two ledger entries; MANUAL/RECEIPT sources stay unchanged. Run Prisma diagnostics, typecheck, and diff-check. |
| **B. Monthly generation and safe catch-up** — developer API/service | Slice A source key; `apps/api/src/lib/recurring-cost.ts`, a targeted internal worker entry point, and runtime configuration only if needed. Architect chooses the exact self-hosted schedule. | A due month creates one real entry; two duplicate/concurrent runs and catch-up after restart do not duplicate it. Amount/date/category are correct and households remain isolated. |
| **C. Optional initial setup** — developer API, designer web | After A and B; developer owns the affected household-create route and rule-create contract; designer owns `apps/web/src/app/kezdes/onboarding.tsx` and targeted onboarding styles. API and web share one contract and do not edit the same file concurrently. | Household creation works with zero, one, or multiple optional fixed costs; failure leaves no partial rule; the hidden optional section does not lengthen the default create-or-join flow. A real entry appears according to the selected start month/day. |
| **D. Audited retroactive rule edits** — developer API | After C and the T03 revision pattern; rule-ID API under `apps/api/src/app/api/v1/households/[householdId]/`, targeted extension to `apps/api/src/lib/recurring-cost.ts`, and additive migration only if required. | OWNER edits only prior entries for this rule in one transactional/audited operation; MANUAL/RECEIPT and foreign-household entries stay unchanged. Stopping creates no future entries, and prior audit remains. Failed requests leave no partial state. |
| **E. Settings and final totals** — designer web, tester manual verification | After D and T04; targeted view/component and styles under `apps/web/src/app/beallitasok/`, plus navigation only to real routes. Tester does not write an automated suite. | At 320/390 px and desktop, the rule is readable and editable by OWNER, with retroactive effects explained; MEMBER/VIEWER see no controls. The monthly entry is recognizable in T03 Journal and counted once in T04; manual and receipt entries remain unchanged. |

After slices A–B and C–D, use a short verification checkpoint. A slice closes only after its listed manual checks and actual typecheck/lint/diff-check results are recorded. Do not write or run automated tests under the current MVP request.

### Historical pre-implementation read-only plan: slice A — 2026-10-27

**Exact scope of this slice:** Prepare only the durable household-scoped recurring-cost rule with exact RON amounts, the canonical ledger entry’s RECURRENT source identity, and the database constraint preventing duplicate rule/month entries. Do not add a scheduler, automatic entry generation, household-create API/web form, Settings editing, or retroactive updates in this slice. T03’s append-only revision model is for later slice D; slice A does not change T03 revisions.

**File ownership and order:** First, the `architect` records the recurring source key, household scope, category integrity, rule/month uniqueness, and boundary with T03 audit in an ADR update or related ADR. Only after that decision is accepted and T03 schema/migration changes stabilize does the `developer` own `apps/api/prisma/schema.prisma` and one new additive migration under `apps/api/prisma/migrations/<new-additive-migration>/migration.sql`. Do not edit T03’s migration or change the meaning of MANUAL/RECEIPT sources or existing entries. Slice B separately owns generation logic in `apps/api/src/lib/recurring-cost.ts`. Neither architect nor developer should revert another agent’s concurrent changes.

**Schema acceptance and manual verification:** A rule links only to an existing household and its expense category; the later creation-API slice validates that the category is active. Store exact positive RON amount, monthly day 1–31, and start month unambiguously. Identify RECURRENT entries so a later generator can create at most one real `LedgerEntry` for a rule/month. Same-named/category rules in two synthetic households remain unrelated. The additive migration preserves existing MANUAL/RECEIPT entries and T03 audit. Check Prisma schema/migration diagnostics and constraints with synthetic development data, plus `pnpm --filter api typecheck`, `pnpm --filter api lint`, and `git diff --check`; do not add/run an automated test suite. Before applying a migration, the developer checks local database state and performs no destructive database operation.

**Remaining decision dependency:** The architect must choose which columns/database constraint enforce source identity and `(rule, month)` uniqueness, and how this links to existing T03 revisions. This is a technical decision, not a new user product approval. Do not start slice A coding until the ADR update and T03 schema conflict are resolved.

### Historical pre-implementation read-only plan: slice B — 2026-10-27

**Goal and dependency:** The separate Compose worker specified by ADR-0003 creates and catches up due real RECURRENT ledger entries for existing rules. Slice B requires slice A’s additive migration to be applied and Prisma Client regenerated. It excludes onboarding, public rule-management APIs, Settings UI, rule edits, and retroactive updates; those belong to slices C–E. Existing manual and receipt sources remain unchanged.

**File boundary and owner:** The `developer` owns the generator (`apps/api/src/lib/recurring-cost.ts`), a separate worker entry point (new targeted file under `apps/api/src/`), its `apps/api/package.json` script, and a new worker service in `docker-compose.yml`. Touch `Dockerfile` only if packaging the separate process requires it; touch `scripts/dev.sh` only if local worker startup cannot otherwise be documented. Update `docs/architecture.md` after the runtime path works. Slice A’s schema/migration files are excluded; coordinate any discovered schema gap with A’s owner rather than overwriting its change.

**Startup, catch-up, and idempotency:** The worker runs as a separate supervised process from the API image after migrations are applied; it sweeps active rules immediately on startup and then periodically from the first month through the current `Europe/Bucharest` month. Create only occurrences due by the current calendar day, adjusting days 29–31 to the final day in shorter months. Catch up missed months after restart; page views and timers inside Next.js routes do not trigger generation. Create a unique `(recurringRuleId, recurringMonth)` entry using the ADR `Serializable` transaction, rule lock, database unique key, and bounded conflict retry. Repeated or concurrent worker runs treat the same existing entry as success only when household/rule/month match; mismatched data must not be silently accepted. Preserve the same lock order as later slice-D edits. A generated entry is a positive two-decimal RON `EXPENSE` with its own category, the rule creator’s source identity, and a stable server-generated source key; T04 counts the active canonical entry once.

**Manual acceptance for slice B only:** With isolated synthetic rules and without copying the running local project, check exactly one entry for a due day in the current month and none for a future day; short-month dates for days 29–31; catch-up of multiple missed months on startup; repeated sweeps and two simultaneous workers still creating one entry per rule/month; and household isolation. In Journal, verify the RECURRENT source, amount, date, and category match the rule, and T04 counts it once. MANUAL/RECEIPT rows remain unchanged. Record worker startup/restart/error behavior plus `pnpm --filter api typecheck`, `pnpm lint`, and `git diff --check`; do not add automated tests under the current request.

**Operational risk and open technical parameters:** If the worker stops, a due entry may be temporarily missing until restart and catch-up; expose this through worker status, last successful sweep, and an error signal without personal/financial data. One invalid rule must not block others; persistent errors remain visible and are retryable next cycle. Record the exact cadence and sweep limits from manual operation; these are implementation/operations settings, not new product decisions. API container health alone does not prove worker health. Slice B must deploy with slice A’s migration; starting the worker first would fail.

### Historical pre-implementation read-only plan: slice C — 2026-10-27

**Goal, scope, and order:** ADR-0003 allows zero, one, or multiple optional fixed costs during household creation. Slice A schema and slice B’s transaction-callable idempotent materializer are prerequisites. First the `developer` records API request/response shape and implements atomic creation; then the `designer` connects onboarding. C does not modify B’s worker, runtime, or files; editing/stopping rules, revisions, and Settings view belong to D–E.

**API file ownership:** The `developer` owns only household POST in `apps/api/src/app/api/v1/households/route.ts`, GET/POST contract in the new `apps/api/src/app/api/v1/households/[householdId]/recurring-expense-rules/route.ts`, a focused API validator if needed, and one shared stable code/name definition for the nine seed categories under `packages/shared/src/`. Onboarding `fixedCosts` may be omitted or empty; each item contains only name, positive two-decimal RON string, stable seeded category code, day 1–31, and current/later `YYYY-MM` start month. Creating a rule for an existing household uses its actual active `categoryId`. The API checks session, OWNER permission for an existing household, same-origin JSON, and household boundary; unknown fields/codes, foreign/archived categories, and invalid money/date are rejected without changes. The API maps the stable category code to that household’s seeded category ID; the client sends no creator ID, ledger source ID, or nonexistent category ID.

**Atomic creation:** Create the household, first OWNER membership, nine seeded categories, requested rules, and any currently due monthly RECURRENT entries in one database transaction using slice B’s server-side materializer. If any rule or entry is invalid/fails, roll back the entire request; leave no partial household, membership, rule, or ledger entry. Omitting/empty `fixedCosts` preserves the existing household-creation response and behavior. A separate rule POST creates the due current-month occurrence before responding through the same service; worker retries do not duplicate it. Rule GET is available to members of that household only.

**Web file ownership:** The `designer` owns the create branch of `apps/web/src/app/kezdes/onboarding.tsx` and its onboarding-only styles in `apps/web/src/app/globals.css`; do not touch another agent’s API, B worker, or model files. Keep the default create-or-join screen short and hide the nine categories. Show the repeatable optional fixed-cost section only on user request, with a remove action; every field has a clear label, error feedback, and keyboard focus. The client sends the stable category code defined by the API contract and treats RON amounts as strings; default start month uses the Bucharest calendar month. Joining by invitation does not ask for or create fixed costs. On success, preserve existing household selection and navigation to the home page.

**Manual acceptance for slice C only:** With synthetic accounts, check omitted and empty `fixedCosts`, then valid household creation with one and multiple rules; each creates exactly nine seeded categories and one OWNER. A due day creates a real exact-RON entry immediately; a future day does not; repeated B sweep does not duplicate it. An invalid final item in a multi-rule request leaves no partial household or entries. Separate rule POST: OWNER succeeds, MEMBER/VIEWER denied, foreign household `404`, own archived or foreign category rejected; GET returns only own data. At 320/390 px, inspect the closed create-or-join flow, expanded form with zero/one/multiple rows, no horizontal overflow, 44 px touch targets, enlarged text, and screen-reader labels. Do not list the nine categories on the default screen or promote manual entry to the main action. Owners record actual typecheck/lint/diff-check results; no automated test suite is created for this MVP.

**Open point:** No new user decision is required. Record exact shared category codes and the technical array-size limit in the API contract at implementation start; do not expand the five temporarily retained fields or the short create-or-join flow.

### Historical pre-implementation read-only plan: slice D — 2026-10-27

**Scope and dependency:** Build on the completed rule/generation contracts in A–C and T03 append-only ledger revisions. Only the current OWNER can edit or stop an active rule in their household. C’s rule GET/POST, B worker runtime, and E Settings UI are out of scope; T03 direct entry routes still cannot write RECURRENT rows.

**File ownership:** The `developer` owns the new rule-ID `PATCH` and `[ruleId]/archive` POST routes under `apps/api/src/app/api/v1/households/[householdId]/recurring-expense-rules/`, plus a focused rule-edit service under `apps/api/src/lib/`. Touch B’s `apps/api/src/lib/recurring-cost.ts` lock/materializer contract only after B’s owner finishes and the shared boundary is agreed. Do not overwrite C GET/POST files; no new schema/migration is expected if A’s audit model is sufficient. Coordinate with the architect before coding if an audit or database constraint is missing.

**Acceptance:** Require ADR-0003 `expectedVersion` and a stable `Idempotency-Key`; replaying the same request returns the same result, while different intent with the same key or a stale version returns `409`. Enforce fresh Better Auth membership, OWNER `manage`, same-origin JSON/CSRF, and `no-store`; foreign household/rule returns `404`, MEMBER/VIEWER writes return `403`. In one transaction, PATCH locks the rule, appends actor and old/new rule state to `RecurringExpenseRuleRevision`, then updates only existing ledger entries matching `householdId + recurringRuleId + RECURRENT` in stable order. Before each actual change, append a prior-state `LedgerEntryRevision` linked to the rule revision. Preserve `archivedAt` on archived occurrences. Do not change MANUAL/RECEIPT or foreign-rule rows. Stopping writes `stoppedAt` and a rule revision, keeps prior rows, and creates no future rows. Failed/oversized changes roll back fully; no partial retroactive updates.

**Two short synthetic manual checks:** (1) OWNER edits a multi-month rule and then stops it: verify new values for its own past active/archived RECURRENT entries, unchanged archived state, linked prior-state revisions, T04 net monthly totals, and no catch-up after stopping; a neighboring MANUAL/RECEIPT entry stays unchanged. (2) After MEMBER/VIEWER, foreign household, stale version, reused key with different content, or invalid category/amount is rejected, confirm the rule, all occurrences, and audit count remain unchanged; retrying the same request creates no second revision. Developer records actual typecheck/lint/diff-check; do not add automated tests.

### Historical pre-implementation read-only plan: slice E — 2026-10-27

**Scope and order:** Requires C’s rule GET/POST, D’s PATCH/stop API, the T03 Journal, and T04 canonical monthly totals. Settings lists fixed costs for the selected household; OWNER can add/edit/stop, MEMBER/VIEWER read only. This is a UI/manual-verification slice; no new ledger-write path, API permission, or bill/payment feature. Do not touch API files or B worker.

**Exact UI file ownership:** The `designer` adds a real fixed-cost link to the existing financial group in `apps/web/src/app/beallitasok/page.tsx`; a new `apps/web/src/app/beallitasok/fix-koltsegek/page.tsx`, focused client component, and local CSS module own the list/form. `apps/web/src/app/naplo/ledger-list.tsx` and, if needed, its CSS module display the RECURRENT source with the exact Hungarian UI label `Havi fix költség`; `apps/web/src/app/naplo/[entryId]/ledger-entry-detail.tsx` accepts and labels RECURRENT as read-only, without manual edit/archive controls. Touch these Journal files only after the ongoing mobile-audit slice closes; do not overwrite another agent’s changes. Touch `apps/web/src/app/page.tsx` or dashboard API only if the completed T04 aggregate reveals a concrete issue; the rule is not a second dashboard source.

**UI acceptance:** Show the selected household and each rule’s name, RON string amount, category, monthly day, start month, and active/stopped state; household switching must not retain another household’s rule. OWNER can add a rule using active household categories and edit/stop only active rules. Before saving, clearly explain that edits affect prior monthly entries while preserving their old values; stopping explains that old entries remain and future entries stop. MEMBER/VIEWER see no management actions; the API remains authoritative. Conflicts/failures show a visible error and reload option; the UI must not report success. Journal shows a recognizable RECURRENT source and a correct read-only detail; T04 counts the same active entry once per month.

**Tester manual pass:** With synthetic OWNER/MEMBER/VIEWER accounts in two households, the `tester` checks empty, one-rule, and multi-rule Settings lists; OWNER add/edit/stop; read-only roles; household switching; Journal detail; and T04 monthly-total changes in the running local app. Do not write an automated test suite. At 320/390 px, check row/form overflow, long Hungarian names and RON amounts, 44 px touch targets, safe area, focus order, enlarged text, and the readable retroactive-effect warning; also check existing Settings/Journal navigation on desktop. The `designer` records actual typecheck/lint/diff-check; the `tester` records observed results and remaining issues. No new user decision is open; the five provisionally retained fields and OWNER management apply to this slice.

### Implementation status snapshot — 2026-10-28 (historical)

**Status at this dated snapshot: pending completion.** Schema/migration, recurring materializer and worker, household-create and rule APIs, rule edit/archive APIs, Settings manager and Napló `RECURRENT` display are present in `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20261027153000_recurring_expense_rules/migration.sql`, `apps/api/src/lib/recurring-cost.ts`, `apps/api/src/app/api/v1/households/`, `apps/web/src/app/beallitasok/fix-koltsegek/`, `apps/web/src/app/naplo/`, and the recurring-worker service in `docker-compose.yml`. The temporarily retained five-field set and OWNER management direction are not awaiting further user input.

**Verification status at this dated snapshot:** Synthetic API setup and focused rule-edit/stop/totals checks provided partial evidence. Worker catch-up/retry/concurrency and post-stop generation, full receipt-row integrity, rollback of an invalid final setup item, and 320/390 px/keyboard/accessibility UI checks remained open at that point; see later dated evidence and current tester closeout below.

### Tester verification evidence — 2026-10-28

The user approved synthetic write verification in the existing test database. A separately tracked API-only fixture created four new `example.test` accounts and three new households. Household creation omitted `fixedCosts` once and supplied one and two rules in the other two households; their rule-list counts were respectively 0, 1 and 2 (`200`). The due current-month rules appeared as real `RECURRENT` Journal entries (`200`), while the future-start rule had no current-month entry. A fourth rule was added by the fixture OWNER (`201`) in the initially empty household. MEMBER and VIEWER read that household's rules (`200`) but could not create or edit a rule (`403`); another household received `404` for a foreign rule, and signed-out rule listing returned `401`. Invalid amount was rejected (`400`). These checks used only new fixture households; no pre-existing rule or entry was edited.

For the new owned rule, the current-month entry appeared once, with exact RON cents and a readable detail (`200`). A new synthetic MANUAL control entry was added (`201`). OWNER rule edit returned `200`; same-key replay returned `200`, reused key with different intent and stale version returned `409`, and invalid amount returned `400`. The rule's existing RECURRENT entry changed to the new amount/day, its detail gained one prior-state revision, and the MANUAL control remained unchanged. The monthly dashboard returned the exact expected cent totals before and after the edit (`200`). OWNER stop and its same-key replay returned `200`; the prior entry remained readable, while a later edit was rejected (`409`). The focused API run reported 19/19 checks passing after a 21/21 setup/role/current-month pass. These results verify the tested current-month and access paths only; no future occurrence was generated after stopping.

Read-only aggregate counts across the user-confirmed test database moved from 3 to 7 rules, 6 to 9 RECURRENT entries, 2 to 4 rule revisions, 4 to 5 linked ledger revisions and 3 to 4 MANUAL entries. RECEIPT entry count stayed at 1; its row contents were not inspected. Duplicate rule/month groups stayed at 0. The local web root and API session endpoint returned `200`, unauthenticated household listing returned `401`, and PostgreSQL Compose was healthy. The Compose recurring worker was not running and no global sweep was started.

**Open checks:** The targeted `materializeRecurringMonth` call for only the new fixture was blocked before execution by automatic approval review because its command would load `.env`; the review explicitly disallowed an indirect workaround. Therefore multi-month catch-up, retry/concurrency and post-stop non-generation were not run. No 320/390 px UI, keyboard, enlarged-text or screen-reader inspection was performed; only browser capability discovery occurred. Existing RECEIPT row values, archived-occurrence behavior and an invalid final item causing full household-create rollback were not tested. All three composite Verification checklist items and all Acceptance criteria remain unchecked. No automated suite, new database, migration, existing-data cleanup or unfiltered worker run occurred; the synthetic test records remain for later QA.

### Atomic checklist reconciliation — 2026-10-28

The former composite acceptance and verification criteria were split into independent outcomes above. Only results explicitly supported by the Tester evidence immediately above are checked. Worker/catch-up/retry/concurrency, future generation after stop, receipt-row contents, invalid-final-item rollback, and optional setup/UI/accessibility items remain unchecked. The tester evidence text above is preserved verbatim.

### Docker recovery and partial read-only UI evidence — 2026-10-28

After the user restarted macOS and Docker Desktop, `docker info --format '{{.ServerVersion}}'` returned `28.4.0`, and `docker compose ps` showed PostgreSQL healthy. `docker compose build recurring-worker` completed successfully, including `pnpm install --frozen-lockfile` and the API build; the earlier BuildKit input/output failure did not recur. The worker was **not started**: its Compose command would run an unfiltered sweep, while the earlier automatic approval review and this task's verification note prohibit an indirect workaround. No recurring materialization or database write was performed in this recovery pass.

The local web and API servers were restarted with Node 24 and `pnpm dev`; HTTP checks returned `200` for the web root and API session endpoint. In the existing signed-in synthetic test household, Settings → Fixed monthly costs showed its empty state. The empty state and expanded add form were inspected without saving at 320 px and 390 px browser widths. All five fields and the Save/Cancel actions were visible and reachable by scrolling, with no observed horizontal overflow. The accessibility tree exposed named controls for name, RON amount, category, monthly day and start month; an actual screen-reader or keyboard-only pass was not run. The form was cancelled and the temporary viewport override was reset. The onboarding flow, populated rule list, role variations and other open checks above remain unverified.

### Targeted verification command implementation — 2026-10-29

Added `pnpm --filter api worker:recurring:verify -- <rule-id> <from-YYYY-MM> <to-YYYY-MM>` as a one-shot, bounded path. It requires an explicit rule ID and ordered range no longer than 12 months, verifies that the rule belongs to a single-owner `@example.test` household, and invokes only `materializeRecurringMonth`; it cannot fall back to `runRecurringSweep`. The regular scheduled worker is unchanged. API typecheck passed with the repository's unsupported Node 23 engine warning; API lint is unavailable because the package has no lint script; `git diff --check` passed. The command was not run against the database. Catch-up/retry/concurrency, stopped-rule and unrelated-row checks therefore remain open pending approval review of the explicitly targeted invocation. Keyboard/screen-reader, onboarding and role checks also remain open.

### Targeted catch-up, retry, concurrency, and stopped-rule verification — 2026-10-29

Using the user-approved existing synthetic test database, a read-only baseline showed the selected active single-owner `@example.test` rule had one occurrence for 2026-10 and no later occurrences. The targeted command for only that rule, range `2026-10` through `2026-12`, and test `--as-of 2026-12-31` returned `existing` for October and `created` for November and December. Replaying the same command returned `existing` for all three months. Two concurrent invocations for the same rule/range both returned `existing` for all months. Read-only post-check showed exactly one occurrence per target month, all other six synthetic rule counts unchanged, and source totals RECURRENT 9→11, MANUAL 4 unchanged, RECEIPT 1 unchanged. The initial failed usage-only invocation preceded this baseline and changed no counts. This confirms catch-up generation and retry/concurrency idempotency for this one synthetic rule. It does not verify concurrent creation from an empty month because the sequential catch-up created those months first; it does not verify post-stop generation behavior.

For the existing stopped synthetic rent rule, a targeted invocation for only 2027-02 with `--as-of 2027-02-28` returned `inactive`. A read-only post-check confirmed no February occurrence was added; its previous October–January entries remained present with their existing unarchived state. No synthetic archived occurrence exists, so preservation of archived occurrence state could not be exercised. Current synthetic exact-cent rows include `12.34`, `17.29`, `21.07`, `3.05`, `9.25`, `88.01`, and `234.56` RON; this is DB evidence only, not a new API serialization assertion. Aggregate source counts remain MANUAL 4, RECEIPT 1, RECURRENT 11, with zero duplicate recurring rule/month groups.

### Synthetic API rollback and decimal serialization — 2026-10-29

Ran temporary Node fetch scripts under `/tmp` against the local Better Auth and household APIs; passwords were generated in memory and never printed or persisted. A newly registered `@example.test` user posted a household with a valid first fixed cost and invalid final amount `0.00`; API returned `400` and the authenticated household count remained 0 before and after, confirming atomic rollback. A second newly registered synthetic user created a household with one `88.01` RON cost (`201`); authenticated rule GET returned `200` and JSON `amount` had type string and exact value `"88.01"`. The initial attempted create using unsupported `OTHER` category code returned `400` and created no household; retry with supported `housing` succeeded. These scripts created two test accounts total, one empty household from the decimal case plus one due recurring rule/entry; no passwords or secret values are recorded here. Temporary commands: `/tmp/t09-invalid-create-smoke.mjs` and `/tmp/t09-decimal-api-smoke2.mjs`.

### Role authorization via synthetic invitation flow — 2026-10-29

Ran `/tmp/t09-role-stop-smoke-fixed.mjs`: created three `@example.test` accounts through Better Auth signup, created household `cmvtk7edl001gru8zvwnmgek0` and recurring rule `cmvtk7eer001qru8z0nsyfa64` through the API, then issued and accepted MEMBER and VIEWER invitations through the application APIs (`201` for each invitation and acceptance). Authenticated stop attempts returned MEMBER `403`, VIEWER `403`, and OWNER `200` with valid `expectedVersion`. The OWNER stop left only this new synthetic test rule stopped. Temporary passwords remained in process memory and were not printed; no pre-existing household was changed.

### Recurrent archive API boundary — 2026-10-29

Created an additional synthetic account/household/rule/October occurrence with `/tmp/t09-recurrent-archive-api-final.mjs`. The supported `POST /api/v1/households/{householdId}/ledger-entries/{entryId}` archive route returned `409 CONFLICT` for the `RECURRENT` entry with the source immutability message. This confirms recurrent entries cannot be archived through the public manual-ledger route; there is no supported API path to create the archived RECURRENT fixture needed to exercise archive preservation during rule edits. No production code changed. The archive-preservation criterion remains open rather than inferred from source code.

To verify the existing archived-state preservation behavior without adding a production API, temporary `apps/api/src/t09-archive-fixture.ts` used Better Auth signup and the household API to create a synthetic household/rule/current occurrence, then Prisma client set only that test occurrence's `archivedAt` to `2026-10-29T12:00:00.000Z`. The supported rule PATCH changed its amount to `19.87` (`200`); a Prisma read confirmed the same `archivedAt` timestamp remained and the amount updated. The temporary source file was removed after the run. No real or pre-existing household was modified.

### Synthetic RECEIPT isolation — 2026-10-29

Temporary `apps/api/src/t09-receipt-isolation-fixture.ts` registered a new synthetic owner through Better Auth, created a new household and active recurring rule through the household API, and used Prisma only to create one valid `RECEIPT` ledger fixture linked to that household's seeded category and owner. Rule PATCH returned `200`; a scoped Prisma before/after read of only this fixture confirmed amount `23.45`, date `2026-10-15`, note, and null archive state were unchanged. Fixture identifiers: household `cmvtkckde004lru8zdm53bvb8`, rule `cmvtkckdr004vru8zu5dbqe98`, receipt `cmvtkckfn0000cz8zne1e8khk`. Temporary script was removed; no existing household data was queried or changed.

### Onboarding fixed-cost acceptance — 2026-10-29

Using a newly registered synthetic local test account, onboarding showed the optional “Havi fix költségek” section collapsed by default. Expanding it revealed the fixed-cost form and category selector. The household `T09 Teszt háztartás 2026-10-29` was created with one rule: `Teszt lakbér`, 100.00 RON, `Lakhatás`, day 1, start month 2026-10. Creation succeeded and the October occurrence appeared immediately as a Journal expense dated 2026-10-01 with source “Havi fix költség”; the overview showed 100.00 RON net and gross spending in Lakhatás. This confirms the one-rule onboarding and due current-month path. The optional form was not tested at 320/390 px in this pass; screen-reader, omitted-cost onboarding, and rollback-on-invalid-final-item remain open. The local test account password is intentionally not recorded in the task file.

### Synthetic OWNER edit and future-value verification — 2026-10-29

In the existing signed-in synthetic household `T09 Teszt háztartás 2026-10-29`, the OWNER edited the existing `Teszt lakbér` rule from 100.00 to 101.25 RON through Settings → Fixed monthly costs. The UI confirmed “A fix költség módosítása mentve.” A read-only PostgreSQL query scoped to that household confirmed the rule amount is `101.25`, one existing occurrence remained before future generation, and its RECEIPT entry count was 0.

Ran `pnpm --filter api worker:recurring:verify -- cmvtic6rc000mru8zt9xgarm0 2026-11 2026-11 --as-of 2026-11-30` with Node 24. It returned `2026-11:created`. A read-only post-check scoped to the same rule confirmed exactly one November occurrence with amount `101.25`, source `RECURRENT`, and occurrence month November 2026. The synthetic household’s RECEIPT count remained 0. No other household or fixture was queried or modified.

The recurring-rule GET serializer was inspected and explicitly emits `amount: rule.amount.toFixed(2)`. The authenticated GET response was not captured directly, so the runtime exact-decimal API assertion remains open. Browser keyboard navigation on the populated fixed-cost page reached “Új fix költség”, “Módosítás”, “Leállítás”, and “Menü” in sequence; this was not a screen-reader check. 320/390 px viewport testing was unavailable through the current browser-control surface. Existing MEMBER/VIEWER stop-denial, receipt-content, archived-state, and invalid-final-item rollback checks remain open.

An attempt to open `/kezdes` with this authenticated account immediately redirected back to `/` because the account already owns the T09 household. No second-household request or additional account/fixture was created; invalid-final-item rollback remains unverified.


### Isolated onboarding responsive and accessibility verification — 2026-10-29

Launched the installed Chrome headless binary with a fresh `/tmp/t09-browser-profile` and CDP port 9225; no existing Chrome or Safari profile was used. Through the registration UI, created synthetic account `t09-ui-1793279932083-1e541d@example.test` (password generated in memory and never stored or printed). On `/kezdes`, the create-or-join screen had no horizontal overflow at 320 px or 390 px (`documentElement.scrollWidth` matched `innerWidth`). Opened the new-household form: “Havi fix költségek” was collapsed by default and marked “Nem kötelező”. Expanded it; the copy explains that the household can be created without these costs. With zero, one, and two unsaved cost rows, the page remained within both viewport widths. The accessibility tree exposed labelled controls for name, amount, category, monthly day and start month, plus distinct ordinal remove-button names. `Accessibility.getFullAXTree` was captured.

Submitted a synthetic household `T09 no-cost 1793280262448` through the UI with the optional rows removed; submission redirected to Overview, which showed an empty ledger. This confirms the empty optional-cost UI path completes. No fixed-cost row was submitted. Actual VoiceOver narration, 44 px touch-target measurements, and enlarged-text/zoom behavior were not tested; the CDP accessibility tree is evidence of roles and names only. Temporary CDP script and profile were removed after the check.


### Responsive role UI, 44 px targets, and zoom verification — 2026-10-29

Used a separate headless Chrome CDP profile and newly created synthetic OWNER, MEMBER, and VIEWER sessions. The OWNER fixture had one current-month `RECURRENT` entry (`55.55` RON) and a second empty household. MEMBER and VIEWER accepted invitations to that household and each created a second empty household. No real household was used. Across Settings, fixed-cost Settings, Journal, entry detail, and household selection, measured document/body widths at 320, 390, and 1280 CSS px; no horizontal overflow was observed. MEMBER/VIEWER could read the fixed-cost row and its detail, had no fixed-cost create/edit/stop controls, and had no edit/stop/delete controls on the entry detail. OWNER controls (`Új fix költség`, `Módosítás`, `Leállítás`) and detail data were present at 390 and 1280 px. The OWNER 320 px page did not expose its loaded row/actions in the initial 550 ms sample; a follow-up could not reconnect to the closed isolated context, so that exact owner-at-320 content check remains open. Each role’s household selector showed two synthetic household choices and switching changed the selected household context/role.

At 320 and 390 px, measured visible onboarding controls had these dimensions: back button 78×44 px; fixed-cost remove button 81.8×44 px; household name and all fixed-cost inputs/selects 260×48 px (320 viewport) or 326×48 px (390 viewport); add button 209.1×44.5 px; create button 288×46.5 px (320) or 358×46.5 px (390); floating menu 56×56 px. All inspected actionable controls meet at least 44 px height and width. A 2× `Emulation.setPageScaleFactor` probe reduced the visual viewport from 390 to 195 px while the layout/document width stayed 390 px with no document overflow; this is pinch/page scaling, not browser text zoom. A Meta++ CDP key dispatch did not change scale or devicePixelRatio. Browser text zoom and actual VoiceOver remain unverified. The temporary Chrome profile/scripts were removed; the local app servers were restarted for the probe and left running.

### Current tester closeout — 2026-10-29

The atomic checklists above reflect the observed results from the dated API and isolated-browser evidence. Catch-up/retry/concurrency, stopped-rule behavior, receipt-row invariance, archive-state preservation, invalid final-item rollback, exact decimal JSON serialization, optional-cost onboarding, 320/390 px flow, keyboard traversal/submission, control names/roles, and measured 44 px targets are now checked. Role UI checks confirm MEMBER/VIEWER read-only behavior and OWNER controls at 320/390/1280 px; household switching at 320 px showed the expected isolated rule list for each household.

**Current status: completed.** All remaining MVP acceptance criteria and verification checklist items are supported by dated synthetic API/UI evidence below. The user removed actual VoiceOver/screen-reader use as a T09 requirement on 2026-10-29; AX-tree roles/names and keyboard traversal remain recorded as observed evidence, without claiming VoiceOver was used. Actual 200% Chrome Page zoom reflow was verified below. The isolated role UI passes used synthetic accounts only. No global worker sweep was run. `git diff --check` passed after checklist reconciliation.

### Isolated keyboard onboarding, household switching, and OWNER mobile detail — 2026-10-29

Used fresh temporary headless Chrome CDP profiles under `/tmp`, not the existing browser profile. With a synthetic OWNER session at 320 CSS px, Tab/Enter moved through the create-household choice, household name, optional fixed-cost disclosure, and add-cost action. The added row focused its name field; keyboard input then set the name and `88.01` amount, ArrowDown/Enter selected the first expense category, Tab reached the monthly day (set to `1`), and Tab traversed the month input's native subfields to the submit button. Enter submitted successfully. Overview opened at 320 px with `88.01 RON` net/gross expense, one category total, and the new `Havi fix költség` entry; document width equalled viewport width. This records keyboard navigation and submission, not screen-reader narration.

The keyboard-created synthetic household is `cmvtlk0p6001i768z85alzvke`; its occurrence is `cmvtlk0pn001t768zwcpy17vt`. A second empty household, created through the same-origin household API for isolation verification, is `cmvtlk1sh001u768z5x2j2inn`. In Settings at 320 px, the household selector listed both. Switching to the empty household by keyboard changed the selected household ID and displayed “Ehhez a háztartáshoz még nincs havi fix költség.” Switching back displayed only `Teszt havi fix`, `88,01 RON`; the other household's list did not leak into the selected household.

A second fresh synthetic OWNER household `cmvtll0b90024768zgxysx3k6` was created through the supported household API with one `88.01` RON fixed cost; occurrence `cmvtll0bw002f768zkg1ihhse`. At 320, 390, and 1280 CSS px, populated OWNER Settings showed the rule and create/edit/stop controls, with document width equal to viewport width. At 320 px, Napló showed the matching row and the direct row URL opened its detail. The detail showed the amount, category, date, `Havi fix költség` source, and active state, with no edit/stop/delete controls or horizontal overflow.

Additional synthetic data created during this isolated verification: one unsuccessful signup/form attempt later created empty household `cmvtlj4wp0018768zlhnpc958`; three other signup-only attempts stopped before household creation. The two successful passes each registered one synthetic owner; one produced the household/entry above plus its empty second household, and one produced the populated detail fixture above. All temporary scripts and Chrome profiles were removed after verification; credentials were generated in memory and never written to the task file. No existing household was queried or changed.

### Chrome extension zoom attempt — 2026-10-29

Attempted 200% page zoom using a temporary MV3 extension in fresh Chrome profiles under `/tmp`; the extension would call `chrome.tabs.setZoom(tabId, 2)` and report the resulting zoom from its content script. Google Chrome rejected extension loading. The captured browser log reported `--disable-extensions-except is not allowed in Google Chrome, ignoring.`; a retry without that switch reported `--load-extension is not allowed in Google Chrome, ignoring.` Consequently the extension did not run, its zoom marker remained absent, and this attempt did not apply zoom. Four temporary `@example.test` signup-only users were created during the repeated extension attempts; no household or ledger data was created for them, and passwords were generated in memory. The temporary extension, scripts, and profiles were removed.

### Real Chrome 200% Page zoom reflow — 2026-10-29

In a fresh temporary Chrome profile, opened `chrome://settings/appearance`, found the native **Page zoom** dropdown in the Settings accessibility tree, and changed its value from 100% to 200% through the Chrome Settings control's `change` handler. The initial Meta+Equal and Meta+Shift+Equal key events did not change zoom. After the setting applied, Chrome reported `devicePixelRatio=2` and halved the CSS viewport while `visualViewport.scale` remained 1, confirming browser Page zoom rather than page-scale pinch zoom.

Registered one synthetic account through Better Auth, then opened `/kezdes`, entered the create-household step, expanded optional fixed costs, and added one unsaved cost row. With 200% Page zoom and device viewport overrides of 320/390 px, `innerWidth` was 160/195 CSS px. The expanded form, all five cost fields, remove/add buttons, household submit button, and floating menu stayed within the document: `scrollWidth` was 160/187 and body width 160/188 respectively, with no horizontal overflow. The probe did not submit a household or create ledger data. Credentials remained in memory. The temporary Chrome profile and script were removed.

### Current task status — 2026-10-29

**Status: completed.** All current Acceptance criteria and Verification checklist items are checked against the dated implementation and tester evidence above. The final 200% Chrome Page zoom reflow check passed in a fresh isolated profile: at 320/390 px device viewports, the expanded optional fixed-cost form with one cost row had `innerWidth` 160/195 CSS px and `scrollWidth` 160/187 CSS px, with no horizontal overflow. VoiceOver is not a closure requirement per the user's dated scope decision; the CDP accessibility-tree and keyboard evidence remain recorded without representing them as VoiceOver testing. `git diff --check` passed.
