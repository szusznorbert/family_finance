# EPIC-03-T01: Manage household categories

## Goal and value

Authorized household members can organize ledger entries without changing another household's categories.

## Scope

Provide household-scoped category listing and the approved create, rename and archive operations. Start from the nine default expense categories seeded by EPIC-02-T02.

## Acceptance criteria

- [ ] The nine defaults are available to the household, and permitted users can create, rename and archive categories without changing another household's list.
- [ ] Category names and states are validated; unauthorized roles and foreign household or category IDs cannot modify categories.
- [ ] Archiving a category preserves references needed by existing financial records under the agreed retention rule.

## Dependencies

EPIC-02-T02 and EPIC-02-T03. Confirm the role matrix and archival behavior before implementation.

## Verification

- [ ] In the existing local app, use two synthetic households to check allowed/denied category actions, duplicate names and archived-category behavior. Do not copy the project or add automated tests.

## Non-goals and open questions

Receipt product identity is separate from ledger categories. Decide whether default categories may be renamed or archived and how archived categories appear on old rows.
