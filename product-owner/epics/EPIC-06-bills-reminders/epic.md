# EPIC-06: Bills and reminders

## Goal

Track household bills from approval through payment and surface upcoming or overdue obligations.

## Scope

- Manual and document-backed bill entry.
- Bill approval linked to one canonical ledger entry.
- Paid/unpaid state and due-date reminders.
- Expense-date and cash-paid reporting.

## Acceptance criteria

- An approved bill appears once in the ledger.
- Marking a bill paid changes cash-flow reporting without creating another expense.
- Overdue status is derived from due date and bill state.
- The agreed date and household time-zone rules are applied consistently.

## Boundary with EPIC-03 fixed monthly costs — 2026-10-27

EPIC-03-T09 creates one canonical ledger expense for each month of an optionally configured fixed household cost. This epic later adds bill approval, due dates, paid/unpaid state and reminders; it must link to an existing matching monthly occurrence where applicable and must not post a second expense. The future photo-based receipt flow remains an intended primary input path, with manual entry as a rare fallback. The exact matching/payment policy is open for this epic's task breakdown.
