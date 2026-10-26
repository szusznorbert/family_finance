# EPIC-03: Ledger and dashboard

## Goal

Provide one reliable household ledger for manual income, expenses, refunds, and posted source records.

## Scope

- Household expense categories and canonical ledger entries.
- RON-only, decimal-safe amounts and string serialization in the API.
- Filtered and paginated ledger views, editing, and archival.
- Monthly dashboard and category summaries based on ledger entries.

## Acceptance criteria

- A member can create, view, edit, and archive permitted ledger entries.
- RON values retain decimal precision through storage, calculations, and API responses; non-RON writes are rejected in the MVP.
- Dashboard totals count each real-world transaction once.
- Archived financial records retain the agreed audit history.

## MVP boundary — 2026-10-26

The canonical ledger supplies the one-expense-per-approved-receipt boundary used by EPIC-05. Receipt item prices are details for product history, not additional ledger entries. Multi-currency input, conversion and reporting are later work.

The [EPIC-03 task plan](tasks/plan.md) separates category management, the RON ledger write path, ledger browsing and the dashboard. EPIC-05 depends on the ledger write path; it need not wait for the dashboard.
