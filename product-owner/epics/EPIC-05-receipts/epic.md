# EPIC-05: Receipts

## Goal

Let household members capture itemized receipts, review extraction suggestions, and post an approved receipt once to the ledger.

## Scope

- Receipt photo/PDF upload and AI extraction status.
- Editable header fields and receipt line items with confidence and warnings.
- Retry and manual-entry paths for failed extraction.
- Validation and atomic, idempotent approval into the canonical ledger.
- Product purchase and price history from receipt lines.

## Acceptance criteria

- Users review and correct extracted data before approval.
- Failed extraction preserves the original file and supports retry or manual entry.
- Repeated or concurrent approval creates exactly one ledger entry.
- Receipt line items enrich the receipt and do not create extra ledger charges.
