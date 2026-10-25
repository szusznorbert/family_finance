# EPIC-03: Ledger and dashboard

## Goal

Provide one reliable household ledger for manual income, expenses, refunds, and posted source records.

## Scope

- Household expense categories and canonical ledger entries.
- Decimal-safe amounts and string serialization in the API.
- Filtered and paginated ledger views, editing, and archival.
- Monthly dashboard and category summaries based on ledger entries.

## Acceptance criteria

- A member can create, view, edit, and archive permitted ledger entries.
- Currency values retain decimal precision through storage, calculations, and API responses.
- Dashboard totals count each real-world transaction once.
- Archived financial records retain the agreed audit history.
