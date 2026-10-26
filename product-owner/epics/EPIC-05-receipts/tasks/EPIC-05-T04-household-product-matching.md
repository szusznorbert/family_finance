# EPIC-05-T04: Match household products

## Goal and value

Corrected receipt lines can be connected to the same product across purchases, enabling a trustworthy price history for the household.

## Scope

Offer household-scoped product suggestions and a way to confirm, create or correct a product match for each comparable receipt line. Keep product identities separate between households. Preserve the reviewed line values and source receipt.

## Acceptance criteria

- [ ] A member can assign two lines from different receipt drafts to the same product, or keep different products separate when a suggestion is wrong.
- [ ] Product suggestions and assignments use only the selected household; a foreign product or receipt-line ID cannot be attached to the draft.
- [ ] The matched line retains its quantity, unit, RON price and receipt date needed for later history; a product match does not create a ledger row.

## Dependencies

EPIC-05-T03. Resolve product identity and comparable-unit rules before implementation.

## Verification

- [ ] In the existing local app with two synthetic households, manually match repeated products, reject a false match and try a foreign product ID. No copies or automated tests.

## Non-goals and open questions

Cross-store price comparison, buying recommendations and purchase optimization are later work. Decide treatment of brand, package size and unit conversion; do not imply that unlike units are directly comparable.
