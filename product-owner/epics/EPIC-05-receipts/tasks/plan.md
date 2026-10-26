# EPIC-05 itemized receipt MVP plan — 2026-10-26

## Outcome and release boundary

The first receipt feature release must let a household upload a receipt, obtain or manually enter item lines, review and correct each line, match products within that household, approve the receipt into exactly one canonical Expense, and see a per-product RON purchase history and price trend. Partial receipt flows are implementation checkpoints, not the first feature release.

Receipt lines never create additional ledger charges. Product history reads approved receipt lines only and stays separate from financial totals. All receipt, product and document operations require the current household's API-side authorization.

## Dependencies and order

1. [EPIC-05-T01: Capture a private receipt draft](EPIC-05-T01-private-receipt-draft.md) — depends on EPIC-02 household policy and EPIC-04 private document upload/read.
2. [EPIC-05-T02: Extract or enter itemized receipt data](EPIC-05-T02-itemized-extraction-manual-entry.md) — depends on T01.
3. [EPIC-05-T03: Review and correct receipt lines](EPIC-05-T03-review-correct-lines.md) — depends on T02's draft item model and manual path.
4. [EPIC-05-T04: Match household products](EPIC-05-T04-household-product-matching.md) — depends on T03's corrected lines.
5. [EPIC-05-T05: Approve one canonical ledger expense](EPIC-05-T05-one-ledger-expense.md) — depends on T03/T04 and EPIC-03-T02's RON ledger write path.
6. [EPIC-05-T06: Show product price history and trend](EPIC-05-T06-product-price-trend.md) — depends on T04's product identity and T05's approved receipt lines.

The draft/review work can begin after the private document capability exists while EPIC-03 builds its ledger path. Approval waits for EPIC-03-T02. EPIC-03 browsing and dashboard may be developed separately, but the first receipt release must manually verify the one-expense result against the ledger and, when available, its dashboard. Coordinate any shared Prisma schema changes; do not implement two competing receipt/ledger models.

## Manual checkpoints in the existing app

- After T01–T03, use synthetic RON receipts in the existing local app to verify private upload, failed extraction preservation, retry/manual entry and every line's correction. No project copy and no automated tests.
- After T04–T05, approve a corrected multi-line receipt; manual API replay and near-simultaneous requests must yield one Expense and one approved receipt state. Another household cannot read the receipt, document, product or line by known ID.
- **First receipt release gate after T06:** Enter at least two synthetic receipts for the same matched household product on different dates with different RON prices. The user can see both approved purchases and the price change in the UI. Ledger totals increase once per receipt, never by an extra sum of lines. Check an unrelated household sees none of the history. Manually test in place; do not add or run automated tests. Lint/typecheck/build are quality checks when implementation changes warrant them.

## Decisions before implementation

- Define when two lines represent the same product: brand, size/unit and renamed descriptions; give the user a way to correct a bad match without leaking another household's products.
- Define which RON price is plotted when discounts, coupons or tax affect a line, and how to compare quantities or units without misleading users.
- Define how later corrections to approved receipts affect product history while preserving the one-ledger-entry invariant and an audit trail.
- Decide the AI provider, user disclosure and failure/rate-limit behavior before sending private receipts to an external service. Manual entry must remain usable.

## Explicit non-goals

Comparing prices across stores, recommending where to buy, optimizing household purchases, multi-currency support and conversion are later work.
