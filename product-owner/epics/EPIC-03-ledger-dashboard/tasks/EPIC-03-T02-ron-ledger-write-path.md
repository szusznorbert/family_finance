# EPIC-03-T02: Establish the RON canonical ledger write path

## Goal and value

A household has one authoritative record for each financial transaction, with precise RON amounts and a safe source boundary for later receipts.

## Scope

Add the canonical ledger record and a permitted manual-create flow through the API and web. Amounts use decimal-safe storage/calculation and decimal strings at the API boundary. Establish a source/link rule so later approved receipts can refer to exactly one ledger entry without line-item charges.

## Acceptance criteria

- [ ] A permitted member can create one household-scoped manual income, expense or refund in RON; invalid amounts, non-RON currency and foreign household/category IDs are rejected.
- [ ] An amount such as 12.35 RON retains its exact decimal value in storage and API output; browser inputs do not rely on binary floating-point arithmetic for financial totals.
- [ ] The ledger contract can associate one approved receipt with at most one canonical expense; receipt lines are not ledger rows.

## Dependencies

EPIC-02-T02 and EPIC-02-T03. T01 category management can proceed in parallel because EPIC-02 already seeds categories, but shared schema changes need coordination. This task's receipt source/link boundary is required before EPIC-05-T05.

## Verification

- [ ] In the existing local app with synthetic households, manually create each transaction type, check exact decimal round-trip, non-RON rejection and cross-household category-ID rejection. Review the receipt source/link constraint before EPIC-05 integration. No project copies or automated tests.

## Non-goals and open questions

Receipt upload and approval belong to EPIC-05. Decide the exact edit/archive audit policy in T03; do not silently broaden the MVP to multiple currencies.
