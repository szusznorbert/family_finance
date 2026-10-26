# EPIC-03-T03: Browse and maintain ledger entries

## Goal and value

Members can find and correct permitted ledger entries while preserving the history needed to understand household finances.

## Scope

Provide household-scoped, filtered and paginated ledger listing, detail, permitted editing and archival. Apply the approved role and audit policy to manual and source-linked entries.

## Acceptance criteria

- [ ] A member sees only entries from the selected household and can filter/page without exposing another household's IDs or amounts.
- [ ] Only permitted roles and fields can be edited or archived; a foreign entry ID and a foreign category ID do not change records.
- [ ] An archived row remains available in the agreed audit view and is excluded from active totals according to the approved policy; receipt-linked entries cannot be changed in a way that breaks their source relationship.

## Dependencies

EPIC-03-T02 and the approved edit/archive audit policy. Category changes from T01 must be handled consistently.

## Verification

- [ ] In the existing local app with synthetic data, check filters, pagination, allowed/denied edits, archive behavior and cross-household IDs. Do not add or run automated tests.

## Non-goals and open questions

Define whether posted receipt-derived expenses may be edited directly or only through their source workflow; retain a traceable correction path.
