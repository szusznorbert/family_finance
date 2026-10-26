# EPIC-05: Receipts

## Goal

Let household members capture itemized receipts from the first receipt release, review and correct each line, and see how the prices of their household's products change over time. An approved receipt posts once to the ledger.

## Scope

- Receipt photo/PDF upload and AI extraction status.
- Editable header fields and receipt line items with confidence and warnings.
- Retry and manual-entry paths for failed extraction.
- Validation and atomic, idempotent approval into the canonical ledger.
- Household-scoped product identity, purchase history and a user-visible per-product RON price trend from approved receipt lines.

## Acceptance criteria

- Users review and correct extracted data before approval.
- From the first receipt release, users can review, add and correct item descriptions, quantities, units and prices, and match items to household products before approval.
- Failed extraction preserves the original file and supports retry or manual entry.
- Repeated or concurrent approval creates exactly one ledger entry.
- Receipt line items enrich the receipt and do not create extra ledger charges.
- For a product bought on multiple dates, a household member can see its purchase history and RON price change; another household cannot access the product or its receipt lines by ID.

## MVP boundary — 2026-10-26

The initial receipt release includes the full itemized review, product matching/history and price-trend flow. Comparing prices across stores, recommending where to buy, and optimizing household purchases are later work. The MVP uses RON only; other currencies and conversion are out of scope.

The [EPIC-05 task plan](tasks/plan.md) defines the dependent slices and a release checkpoint that requires all of them before the first receipt feature release.
