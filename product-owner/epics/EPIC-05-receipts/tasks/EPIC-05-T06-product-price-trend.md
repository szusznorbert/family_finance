# EPIC-05-T06: Show product price history and trend

## Goal and value

A household member can see how the price of a product changed across their approved receipts from the first receipt feature release.

## Scope

Provide a household-scoped product search/history API and a user-visible view of approved purchases, dates, comparable RON prices and the change between purchases. Source each point from a reviewed receipt line, with a way to inspect its receipt.

## Acceptance criteria

- [ ] For a product bought on two dates at different RON prices, a member sees both purchases and the price change in the app, including date and source receipt.
- [ ] Unapproved/rejected receipt drafts do not appear in history; unlike units or package sizes are distinguished rather than silently plotted as comparable unit prices.
- [ ] A nonmember cannot retrieve another household's product, receipt line or history using known IDs; history does not add charges to the ledger or dashboard.

## Dependencies

EPIC-05-T04 product identity and T05 approved receipt/Expense link. The first receipt release is not complete until this task is manually verified with the other receipt tasks.

## Verification

- [ ] In the existing local app, approve two synthetic receipts for the same matched product with different dates/prices, inspect the visible trend and source receipts, then check a second household sees none of it. Confirm ledger totals still include one Expense per receipt. No copies or automated tests.

## Non-goals and open questions

Cross-store comparisons, purchase recommendations and household optimization are later work. Decide price basis after discounts/tax and the allowed unit comparison before implementation.
