# EPIC-02-T04: View and update household settings

## Goal and user value

Members can view the household they are using; authorized administrators can correct its name or default currency.

## Scope

Add household detail and permitted settings updates in the API and web. Apply the T03 policy and validate values. Changing default currency is a setting change, not a conversion of any future financial records.

## Acceptance criteria

- [ ] A current member can view the selected household's name, default currency and their role; an unrelated account cannot retrieve it by ID.
- [ ] Only roles approved for settings changes can update the name or default currency; invalid input and lower-privilege direct API requests leave the record unchanged.
- [ ] A user belonging to two households can update one without changing the other, and the web reflects the saved value after reload.

## Verification

- [ ] Exercise allowed and forbidden reads/updates across two synthetic households and the approved role matrix.
- [ ] Test invalid name/currency values and run focused checks plus root lint/typecheck/build.

## Dependencies

EPIC-02-T03. May proceed independently of invitations after the settings permissions are approved.

## Non-goals and open questions

Currency conversion, financial transaction behavior and household deletion are outside this task. Confirm which roles may change each setting.
