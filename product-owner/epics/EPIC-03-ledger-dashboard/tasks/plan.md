# EPIC-03 implementation plan — 2026-10-26

## Outcome and boundary

Build a household-scoped, RON-only canonical ledger. An approved receipt in EPIC-05 creates exactly one ledger expense; receipt lines supply product history and never increase ledger totals. The four tasks below are proposals for implementation, not implemented system facts.

## Order and dependencies

1. [EPIC-03-T01: Manage household categories](EPIC-03-T01-household-categories.md) — extend the nine defaults seeded by EPIC-02 with permitted category management.
2. [EPIC-03-T02: Establish the RON canonical ledger write path](EPIC-03-T02-ron-ledger-write-path.md) — decimal-safe manual entries and a receipt source/link boundary. This is the blocking EPIC-03 dependency for EPIC-05 receipt approval.
3. [EPIC-03-T03: Browse and maintain ledger entries](EPIC-03-T03-ledger-browse-maintain.md) — household-scoped list, filter, edit and archive.
4. [EPIC-03-T04: Show monthly household totals](EPIC-03-T04-monthly-dashboard.md) — summarize canonical ledger rows once.

T01 and T02 can be planned independently after EPIC-02 household authorization exists; coordinate any schema changes. T03 depends on T02. T04 depends on T02 and should use the same canonical source as T03. EPIC-05 does not need to wait for T03 or T04 to begin its draft/review work, but its first release must verify receipt posting against this ledger and the monthly totals once the dashboard exists.

## Manual checkpoints

- After T01–T02, use the existing local app and synthetic households to verify separate categories, RON-only decimal amounts and a single canonical entry per manual transaction. No project copies or automated test code.
- After T03–T04, manually verify one household cannot read or mutate another's ledger IDs, archived entries keep the agreed audit history, and totals count an approved receipt once even when it has multiple lines. Lint/typecheck/build may be run as quality checks; no automated tests are added or run for this MVP planning scope.

## Decisions before implementation

- Define the allowed edit/archive behavior and audit retention for posted ledger rows.
- Define date and time-zone presentation for household reports. RON-only input and the nine initial Hungarian categories are already approved.

## Release dependency for EPIC-05

EPIC-05-T05 depends on T02's canonical Expense model and receipt source/link boundary. Product history in EPIC-05 reads receipt lines and must not contribute an additional amount to the ledger or dashboard.
