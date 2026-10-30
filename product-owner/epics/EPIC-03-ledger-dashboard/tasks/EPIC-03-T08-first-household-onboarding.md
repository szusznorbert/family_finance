# EPIC-03-T08: Onboard a newly registered account into a household

## Goal and user value

After account registration, guide a new user through one short, separate flow to create a household or join one with an invitation, before showing the household financial overview.

## Scope

- After successful registration, direct an account without a household to a distinct onboarding route.
- Present two clear paths: create a household, or provide/open an existing invitation link and join.
- Keep household creation to a household-name field; RON is fixed and visible as the currency. Create the existing default categories in the normal backend flow, but do not display or ask users to choose those categories in onboarding.
- On successful create/join, go to the financial overview. Preserve invitation acceptance for signed-out invitees through sign-in/registration and keep token handling in the existing safe acceptance flow.

## Implementation checklist

- [x] The separate create-or-join onboarding route and UI are implemented without a category list.
- [x] Registration handoff, household creation, and the existing invitation-acceptance flow are connected.

## Acceptance criteria

- [ ] New registration without a household opens a short onboarding flow with exactly the create-household and join-by-invitation choices; an account already attached to a household is not trapped in onboarding.
- [ ] Household creation asks for a name and confirms fixed RON; it never shows the nine seeded categories.
- [ ] Joining accepts an existing invitation link and visibly handles valid, expired, already-used and unauthorized cases without leaking a token to query parameters, logs or referrers.
- [ ] Successful create/join routes to the household financial overview; failure preserves user-entered non-secret form values where appropriate and provides a clear retry path.
- [ ] At 390 px and 320 px widths, each step remains operable with safe-area, persistent field labels, accessible errors/focus, enlarged text and no horizontal scrolling; desktop uses a narrow centered flow.
- [ ] Existing EPIC-02 API contracts, one-time invitation semantics, household isolation, OWNER defaults, CSRF and server authorization remain unchanged.

## Dependencies

EPIC-03-T05 responsive shell/tokens and EPIC-03-T06 registration UI. Reuse existing EPIC-02 household-create/select and invitation-accept behavior. Does not depend on ledger APIs or the nine-category presentation.

## Likely files

- `apps/web/src/app/regisztracio/` and the registration success handoff
- A new onboarding route/component under `apps/web/src/app/`
- Existing household and invitation components/API client as needed, without changing their contracts
- Shared shell/tokens from T05

## Verification checklist

- [ ] Manually register a synthetic user and choose household creation; verify the created household opens at the overview and categories are not listed during onboarding.
- [ ] Repeat with a synthetic valid invitation; check expired/used invitation messaging and preserve the existing token-fragment/no-referrer safeguards.
- [ ] Inspect at 320/390 px, tablet and desktop; check keyboard, focus, field labels and enlarged text.
- [ ] Do not use real household data or add automated test suites for this MVP task.

## Non-goals and open questions

No email verification, new invitation type, account/auth policy, household schema or API changes. The onboarding is mandatory for a newly registered account that has no household; invite recipients should continue their invitation acceptance after authentication rather than be diverted into an unrelated new-household choice.

## Preimplementation planning record — 2026-10-26

- **Scope:** add the separate registration handoff and create-or-join experience; make no backend or permission changes.
- **Likely files:** registration route/client flow; new `/kezdes`-style page and local component; shared responsive shell; existing household/invitation UI/API client. Confirm exact route and client/server boundaries before coding; read `apps/web/AGENTS.md` and installed Next.js docs.
- **Dependencies/order:** after T05 and T06; reuse EPIC-02 household and invitation flows. T07 Settings work is independent.
- **Acceptance/verification:** synthetic new account creates household or accepts invite; verify no category list, RON fixed, token safeguards and responsive/accessibility behavior.
- **Open decisions:** exact route and final Hungarian copy. No unresolved business rule blocks planning.
- **Design evidence:** `docs/research/mobile-responsive-cupertino-ui.md`, including the 390 px onboarding wireframes.

### Implementation status — 2026-10-28

**Status: pending completion.** The distinct `/kezdes` route and create-or-join onboarding UI are present in `apps/web/src/app/kezdes/page.tsx` and `apps/web/src/app/kezdes/onboarding.tsx`; registration handoff is implemented in `apps/web/src/app/regisztracio/`. Household and invitation operations reuse the existing API flows. No task-level synthetic onboarding or responsive QA evidence is recorded. All acceptance and verification boxes remain unchecked.
