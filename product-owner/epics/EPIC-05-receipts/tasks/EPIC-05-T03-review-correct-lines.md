# EPIC-05-T03: Review and correct receipt lines

## Goal and value

A household member can correct every extracted or manually entered line before the receipt becomes a financial transaction.

## Scope

Provide editable receipt header and item-line review, including add/remove/correct actions and visible warnings about line totals versus the receipt total. Persist corrections as draft data; do not post to the ledger.

## Acceptance criteria

- [ ] A permitted member can review, add, remove and correct each line's description, quantity, unit, unit price and line total, then reload without losing corrections.
- [ ] RON totals are recalculated or validated with decimal precision; unresolved mismatches, discounts or unreadable values are clearly surfaced before approval.
- [ ] Another household cannot read or modify the draft or any line by ID, and a viewer cannot mutate it under the approved role matrix.

## Dependencies

EPIC-05-T02's itemized draft and manual entry path. Agree on discounts/tax and total-reconciliation behavior before approval work.

## Verification

- [ ] In the existing local app, manually correct a synthetic multi-line receipt, reload, check warnings and attempt unauthorized cross-household edits. No copies or automated tests.

## Non-goals and open questions

Product identity follows T04 and ledger approval follows T05. Decide how to represent discounts, returns and non-product lines without losing the printed total.
