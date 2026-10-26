# EPIC-05-T02: Extract or enter itemized receipt data

## Goal and value

Each receipt draft has individual product lines from extraction or manual entry, so price history can exist from the first receipt release.

## Scope

Capture RON receipt header and item-line suggestions with processing status, confidence and warnings where available. Preserve the original file on extraction failure and support retry or manual line entry.

## Acceptance criteria

- [ ] A processed receipt draft exposes separate item descriptions, quantities, units, unit prices and line totals as suggestions when extraction can identify them; no suggestion is approved automatically.
- [ ] Failed or unreadable extraction keeps the private original, reports a useful status and permits retry or manual header and item-line entry.
- [ ] All amounts are RON decimal-safe values; non-RON input and malformed numbers are rejected without writing a ledger entry.

## Dependencies

EPIC-05-T01. Decide provider disclosure, retention and retry/rate-limit behavior before external AI processing.

## Verification

- [ ] In the existing local app, manually check a synthetic itemized receipt, an unreadable file, retry and manual entry. Confirm the draft has item lines and no Expense. No project copies or automated tests.

## Non-goals and open questions

Product matching and final totals validation follow T03/T04. Decide how to present extraction confidence when the provider omits it.
