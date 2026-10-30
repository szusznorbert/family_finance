# EPIC-03-T06: Align authentication and invitation flows with the responsive system

## Goal and user value

Sign-in, registration and invitation acceptance feel like parts of the same mobile-friendly product and remain easy to complete on a phone.

## Scope

- Apply the shared tokens, large-title navigation, form fields, buttons and feedback patterns from EPIC-03-T05 to sign-in, registration and invitation acceptance.
- Preserve the existing post-hydration behavior, password confirmation, no-GET credential submission, bearer-token fragment handling and no-referrer protection.
- Keep validation, loading, success and failure messages understandable in Hungarian on narrow viewports.

## Implementation checklist

- [x] Sign-in, registration, and invitation-acceptance UI aligned with the shared app shell.
- [x] Registration hands off to the separate T08 onboarding route; the invitation token remains on its secure acceptance path.

## Acceptance criteria

- [ ] The three flows use the shared responsive design system and remain operable at 320–390 CSS px without horizontal overflow or hidden submit/cancel actions.
- [ ] Password confirmation and credential transport behavior are unchanged; invitation tokens remain in the URL fragment only until client-side scrubbing and are never placed in query parameters, persistent storage or logs.
- [ ] Labels, error associations, keyboard focus, readable scaling and touch targets meet T05 accessibility requirements.
- [ ] Successful registration hands the new account to the separate first-household onboarding in T08; invitation acceptance retains its current invitation-specific route and safe continuation behavior.

## Dependencies

EPIC-03-T05. Can proceed independently of T07 after T05 tokens are frozen. The onboarding screen itself is owned by T08.

## Likely files

- `apps/web/src/app/auth-form.tsx`
- `apps/web/src/app/bejelentkezes/page.tsx`
- `apps/web/src/app/regisztracio/page.tsx`
- `apps/web/src/app/invitations/accept/page.tsx`
- `apps/web/src/app/invitations/accept/invitation-acceptance.tsx`

## Verification checklist

- [ ] Manually verify login, registration password confirmation and invitation accept states at narrow phone and desktop widths with synthetic accounts.
- [ ] Confirm keyboard operation, validation visibility, no credential GET, no token query/referrer leak and no changed authorization behavior.
- [ ] Lint/typecheck and relevant build checks; no automated suite for this MVP task.

## Preimplementation planning record — 2026-10-26

Read-only planning completed. This task should be a focused visual/accessibility pass after T05 tokens/shell exist; no auth API or database changes are expected. Keep any page-specific CSS within shared component patterns; preserve current client/server boundaries and security behavior. Successful signup routes to T08; do not place household administration or categories on registration screens. Open product decisions: none.

### Implementation status — 2026-10-28

**Status: pending completion.** Responsive sign-in, registration and invitation acceptance UI code is present in `apps/web/src/app/auth-form.tsx`, `apps/web/src/app/bejelentkezes/`, `apps/web/src/app/regisztracio/`, and `apps/web/src/app/invitations/accept/`. Registration is wired to the separate onboarding route. No auth/invitation task acceptance or manual QA evidence is recorded; credential/token safety and responsive checks remain open, and the checkboxes above remain unchecked.
