# EPIC-02-T04: View and update household settings

## Goal and user value

Members can view the household they are using; an OWNER can correct its name.

## Scope

Add household detail and permitted name updates in the API and web. Apply the T03 policy and validate values. The MVP currency is fixed to RON and cannot be edited through the UI or API.

## Acceptance criteria

- [ ] A current member can view the selected household's name, default currency and their role; an unrelated account cannot retrieve it by ID.
- [ ] Only OWNER can update the name; MEMBER and VIEWER direct API requests, invalid input and attempts to change the currency leave the record unchanged.
- [ ] A user belonging to two households can update one without changing the other, and the web reflects the saved value after reload.

## Verification

- [ ] Exercise allowed and forbidden reads/updates across two synthetic households and the approved role matrix.
- [ ] In the existing local app with synthetic households, test invalid names and a direct API attempt to set a non-RON currency; run lint/typecheck/build as quality checks. Do not add or run automated tests for this MVP planning scope.

## Dependencies

EPIC-02-T03. May proceed independently of invitations after the settings permissions are approved.

## Non-goals and open questions

Currency editing and conversion, financial transaction behavior and household deletion are outside this task. T03 supplies the 401/404/403 API policy: missing session, foreign or missing household, and member with insufficient role, respectively.
