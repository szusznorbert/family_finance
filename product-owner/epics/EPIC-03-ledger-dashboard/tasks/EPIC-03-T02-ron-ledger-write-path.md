# EPIC-03-T02: Establish the RON canonical ledger write path

## Goal and user value

A household has one authoritative record for each financial transaction, with precise RON amounts and a safe source boundary for later receipts.

## Scope

Add the canonical ledger record and a permitted manual-create flow through the API and web. Amounts use decimal-safe storage/calculation and decimal strings at the API boundary. Establish a source/link rule so later approved receipts can refer to exactly one ledger entry without line-item charges.

## Implementation checklist

- [x] RON ledger model, decimal-safe fields, source identification, and additive migration.
- [x] Household-scoped manual-create API with validation, category checks, and role checks.
- [x] Web UI for manual entries with decimal-string field handling.
- [ ] Connect EPIC-05 receipt approval to the canonical expense; this is an EPIC-05 dependency.

## Acceptance criteria

- [ ] A permitted member can create one household-scoped manual income, expense or refund in RON; invalid amounts, non-RON currency and foreign household/category IDs are rejected.
- [ ] An amount such as 12.35 RON retains its exact decimal value in storage and API output; browser inputs do not rely on binary floating-point arithmetic for financial totals.
- [ ] The ledger contract can associate one approved receipt with at most one canonical expense; receipt lines are not ledger rows.

## Dependencies

EPIC-02-T02 and EPIC-02-T03. T01 category management can proceed in parallel because EPIC-02 already seeds categories, but shared schema changes need coordination. This task's receipt source/link boundary is required before EPIC-05-T05.

## Verification checklist

- [ ] In the existing local app with synthetic households, manually create each transaction type, check exact decimal round-trip, non-RON rejection and cross-household category-ID rejection. Review the receipt source/link constraint before EPIC-05 integration. No project copies or automated tests.

## Non-goals and open questions

Receipt upload and approval belong to EPIC-05. Decide the exact edit/archive audit policy in T03; do not silently broaden the MVP to multiple currencies.

## Historical implementation planning record — 2026-10-26

### Current baseline and task boundary

The implemented database has `Household`, `HouseholdMember`, and seeded `ExpenseCategory`, but no financial ledger model, migration, or ledger API. `authorizeHouseholdOperation` already permits `OWNER` and `MEMBER` for `financial-write`, `VIEWER` for read only, and gives `401` without a session, `404` for an unknown/foreign household, and `403` for an insufficient role. Existing JSON mutations use `validateSameOriginJsonMutation`; the web calls the API through its same-origin proxy. T01 category management may proceed independently, but its category schema migration must be coordinated with this task's migration.

T02 delivers manual creation of a canonical income, expense, or refund, including a usable web entry path and a response that returns the exact RON amount as a decimal string. It reserves a source/link contract for EPIC-05 receipt approval: one approved receipt maps to at most one canonical expense, and receipt lines never become ledger entries. Browsing, filtering, editing, archiving, monthly totals, upload, and receipt approval remain in T03/T04/EPIC-05.

### Likely implementation sequence and files

1. Agree the open product rules below, then define the ledger's field/amount/source contract. Extend `apps/api/prisma/schema.prisma` and add one migration under `apps/api/prisma/migrations/`; coordinate the shared schema with T01 and the later EPIC-05 receipt link. Keep amounts in exact decimal storage and never convert them through browser `Number` for ledger arithmetic.
2. Add a household-scoped create endpoint under `apps/api/src/app/api/v1/households/[householdId]/` and its focused validation/serialization helper under `apps/api/src/lib/` if needed. Reuse `apps/api/src/lib/household-authorization.ts` with `financial-write`, the existing same-origin mutation check, and the repository's no-store response/error conventions. Confirm that a supplied category belongs to this household and is eligible for new entries at write time.
3. Add the manual entry UI in `apps/web/src/app/` as a real route or focused component linked from the implemented overview. Reuse the responsive shell and persistent field labels; only expose actions allowed by the current role. The API remains the authorization boundary. Update `docs/architecture.md` after implementation to describe the actual model, endpoint, and data flow; review affected agent/skill assumptions per the shared rules.

These are coordinated implementation slices within T02, not independent deployed features. Schema/source contract precedes the API and UI; the UI must not expose a nonworking navigation target. Avoid changing T01's category-management UI or T03/T04's future read/report screens here.

### Acceptance and manual verification

- [ ] In an existing local synthetic household, an `OWNER` and `MEMBER` can create permitted manual income, expense, and refund entries; a `VIEWER` cannot write. Unauthenticated, foreign household, and foreign/archived category attempts fail without creating a row; inspect status and no-store/error behavior.
- [ ] Exact amounts such as `12.35` and `0.01` round-trip as decimal strings in API responses and storage. Zero, negative, malformed, excessive-precision, out-of-range, and non-RON inputs are rejected according to the accepted field contract; the browser does not calculate ledger amounts with binary floating-point numbers.
- [ ] Review the database uniqueness/source rule with the EPIC-05 owner: a receipt source ID cannot attach to two canonical expenses, and its item rows are not ledger rows. Manual creation cannot impersonate the later receipt-posting path.
- [ ] Manually exercise the create UI at 320 and 390 CSS px and desktop with synthetic values, including keyboard focus and visible validation. Use the currently running local app/database; do not copy the project, write automated tests, or perform destructive operations on real household data. Static lint/typecheck and migration diagnostics may be used as implementation quality checks.

### Decision questions identified during planning

The refund, date, category and amount-scale questions were resolved by the user's 2026-10-27 approval below. The source-boundary design remains an architect decision.

- **Refund meaning:** Is a refund a standalone positive household inflow, a reduction of expense, or always linked to an earlier expense? This affects storage sign, category requirements, and T04 totals. Do not infer it from the UI label alone.
- **Entry date:** Which date does a manual entry record and which time zone governs it? The T04 monthly reporting rule must align with this contract; decide whether a date-only local household date is sufficient for MVP.
- **Category rule:** Must expenses and refunds select one active expense category, and should income have no expense category? Coordinate with T01's archive rule so historical references remain visible.
- **Amount contract:** Confirm two decimal places for RON, strict positive entry amounts, and a practical maximum. Reject non-RON instead of silently converting it.
- **Source boundary:** Architecture should choose how the receipt source relationship is represented and uniquely enforced before EPIC-05 integrates, while keeping manual creation unable to mark itself receipt-derived. T03 decides later edit/archive audit policy.

### Product decisions approved by the user — 2026-10-27

The user explicitly approved these T02 MVP rules, resolving the matching questions identified on 2026-10-26:

- A positive `REFUND` reduces expense and category net totals in the refund's own month; it is not counted as income.
- `occurredOn` is the Romanian household's date-only `YYYY-MM-DD` calendar date.
- `EXPENSE` and `REFUND` require an active expense category from the same household. `INCOME` has no expense category.
- RON amounts must be positive and have at most two fractional digits.

The UI's `Europe/Bucharest` default date, exact two-digit API string serialization, and maximum amount `999999999.99` are implementation details proposed in [ADR-0001](../../../../docs/decisions/ADR-0001-canonical-ron-ledger.md), **not** part of this specific user approval. A future optional link from a refund to an earlier expense is also outside this MVP decision. The ADR's server-assigned source identity, manual idempotency key, and unique receipt source are technical architecture decisions rather than user-approved product policy. T03 separately settles edit/archive audit behavior; EPIC-05 settles receipt approval and later corrections.

### Separate recurring-cost request — 2026-10-27

The user wants a household's once-configured fixed monthly costs, such as rent, a loan payment or tax, to enter each month's accounting automatically. Plan this as a separate EPIC-03 implementation task with its own recurrence, timing, failure/retry and duplicate-posting rules. T02 remains the manual and receipt-source ledger write foundation; do not insert an unfinished recurring scheduler into its API or claim that automatic posting is implemented here.

### Implementation status — 2026-10-28

**Status: pending completion.** The canonical ledger schema/migration, manual write API and web entry flow are present in `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20261027062804_add_ron_ledger_entries/migration.sql`, `apps/api/src/app/api/v1/households/[householdId]/ledger-entries/route.ts`, `apps/api/src/lib/ledger-entry.ts`, and `apps/web/src/app/naplo/uj/`. The database source uniqueness contract is in the model/migration; the public manual API does not accept receipt source identity. EPIC-05 receipt approval/link integration remains a dependency for end-to-end receipt verification, not evidence that receipt posting is already implemented.

**Verification status:** The task's synthetic write, exact-decimal, invalid-input, role and category checks remain open; the acceptance and verification checkboxes above are intentionally unchecked.
