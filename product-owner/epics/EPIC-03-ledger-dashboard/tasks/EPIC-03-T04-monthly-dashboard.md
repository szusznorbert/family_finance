# EPIC-03-T04: Show monthly household totals

## Goal and value

Members can see trustworthy monthly RON totals and category summaries from the canonical ledger.

## Scope

Show monthly income, expense and refund summaries and category breakdowns for the selected household. Count source-linked ledger entries once and exclude receipt item lines from ledger aggregation.

## Acceptance criteria

- [ ] Monthly and category totals derive from permitted active canonical ledger rows in the selected household and retain decimal precision in RON.
- [ ] An approved receipt with several lines changes the household expense total by its one linked Expense amount, never by adding its lines again.
- [ ] A nonmember cannot request another household's dashboard by ID, and archived rows follow the approved reporting policy.

## Dependencies

EPIC-03-T02; align archived-row treatment with T03. EPIC-05-T05 later supplies receipt-linked entries for the receipt-specific checkpoint.

## Verification

- [ ] In the existing local app with synthetic entries, manually reconcile monthly/category totals, then repeat after EPIC-05 approval with an itemized receipt. Check foreign household access. Do not copy the project or add automated tests.

## Non-goals and open questions

Product price trends belong to EPIC-05 and are calculated from receipt lines separately. Decide the household reporting date/time-zone rule before implementation.
