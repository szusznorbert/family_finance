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
