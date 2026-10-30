# EPIC-03: Ledger and dashboard

## Goal

Provide one reliable household ledger for manual income, expenses, refunds, and posted source records.

## Scope

- Household expense categories and canonical ledger entries.
- RON-only, decimal-safe amounts and string serialization in the API.
- Filtered and paginated ledger views, editing, and archival.
- Monthly dashboard and category summaries based on ledger entries.
- A short post-registration onboarding flow to create a household or join by invitation, with seeded categories created silently.
- The household financial overview as the home screen, with household administration in Settings and mobile navigation limited to implemented screens.
- Optional fixed monthly household costs entered once at household creation and automatically represented by one real ledger expense per month; edits to the rule update its own past occurrences with preserved audit history.

## Acceptance criteria

- A member can create, view, edit, and archive permitted ledger entries.
- RON values retain decimal precision through storage, calculations, and API responses; non-RON writes are rejected in the MVP.
- Dashboard totals count each real-world transaction once.
- Archived financial records retain the agreed audit history.
- A fixed monthly cost appears once in each counted month; editing its rule cannot change unrelated manual or receipt-derived rows.

## MVP boundary — 2026-10-26

The canonical ledger supplies the one-expense-per-approved-receipt boundary used by EPIC-05. Receipt item prices are details for product history, not additional ledger entries. Multi-currency input, conversion and reporting are later work.

The [EPIC-03 task plan](tasks/plan.md) includes responsive UI, post-registration onboarding, and Settings-based household administration before or alongside ledger UI. The [mobile UI research](../../../docs/research/mobile-responsive-cupertino-ui.md) includes 390 px wireframes and token proposals. EPIC-05 depends on the ledger write path; it need not wait for the dashboard.

The [T09 fixed-monthly-cost task](tasks/EPIC-03-T09-fixed-monthly-costs.md) records the 2026-10-27 user requirement. Fixed monthly costs and EPIC-05's later photo-based receipt flow are the intended primary input paths; manual ledger entry is a rare fallback. EPIC-06 owns due dates, paid/unpaid state and reminders, and must avoid posting a second expense for the same occurrence.
