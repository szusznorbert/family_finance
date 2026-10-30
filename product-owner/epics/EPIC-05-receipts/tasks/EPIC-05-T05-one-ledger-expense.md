# EPIC-05-T05: Approve one canonical ledger expense

## Goal and user value

An approved itemized receipt affects household financial totals exactly once.

## Scope

Validate the reviewed receipt, then atomically create and link one RON Expense with source RECEIPT and mark the receipt approved. Preserve item lines for product history; they remain details rather than financial ledger rows.

## Implementation checklist

- [ ] Define the approved receipt state transition and required header/line-total review, role, category, product, and RON validations before posting.
- [ ] Implement an atomic, idempotent approval operation that links exactly one canonical RON Expense to the receipt and records the approved state.
- [ ] Prevent replay/concurrent approval from creating duplicate or partial expenses; keep receipt lines out of ledger totals and enforce household authorization.

## Acceptance criteria

- [ ] Approval requires the agreed header/line-total review and permitted role; invalid RON amounts or foreign household/category/product references block posting.
- [ ] One approval creates exactly one linked Expense, while repeated or near-simultaneous approval requests cannot create another Expense or a partial approved state.
- [ ] Receipt lines do not create Expense rows or add a second amount to the household ledger or dashboard; a nonmember cannot approve a known receipt ID.

## Dependencies

EPIC-05-T03, EPIC-05-T04 and EPIC-03-T02's canonical RON Expense/source boundary. Coordinate linked schema and transactions with the ledger owner.

## Verification checklist

- [ ] In the existing local app with synthetic multi-line receipts, manually approve once, replay and issue near-simultaneous API requests; inspect receipt status, linked Expense count and household totals. Check foreign ID rejection. No copies or automated tests.

## Non-goals and open questions

Price history display follows T06. Decide how corrected/reversed approved receipts affect the ledger and audit history before adding post-approval edits.
