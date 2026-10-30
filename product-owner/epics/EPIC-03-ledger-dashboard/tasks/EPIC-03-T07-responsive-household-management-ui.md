# EPIC-03-T07: Organize household management under Settings

## Goal and user value

Make account and household administration easy to find on phones by using a short Settings index and focused detail pages, while preserving existing privacy and role boundaries.

## Scope

- Build a Settings index with grouped navigation rows for `Fiók`, `Háztartás`, and `Tagok és meghívók`. Each row has a clear label and disclosure chevron and links to a real, implemented detail route.
- Split the all-in-one household panel into focused Settings destinations: account/session controls, household selection and name management, and member/invitation management. A narrow `HouseholdsPanel` `view` prop may select the household or member/invitation presentation so the existing client-side business logic is reused without duplication or behavior changes. Keep the selected household context visible on household-scoped pages and reuse the existing household selection behavior.
- Use grouped/inset rows for navigation and separate, persistently labeled forms for edits. Do not nest unrelated panels or place household administration on the financial overview.
- Do not display the seeded category count or category-name preview in household creation, household selection/details, or onboarding. The backend continues creating the existing defaults; category management belongs to EPIC-03-T01.
- Preserve server authorization and email visibility: only OWNER and the relevant member see an account email; no general role modification; role selection remains at invitation time; sole-OWNER transfer-and-leave remains atomic.

## Implementation checklist

- [x] Grouped Settings index and separate account, household, and member/invitation pages.
- [x] Reuse of existing household/member management logic; category preview removed.
- [x] Existing controls and back navigation respect OWNER/MEMBER/VIEWER roles.

## Acceptance criteria

- [ ] Settings opens to a grouped index with exactly the implemented account, household, and member/invitation destinations; every row navigates to its real route. The Settings index and every Settings detail page provide a “Vissza” navigation link to the financial overview (`/`), never to another Settings route.
- [ ] The floating mobile `Menü` button opens the general navigation bottom sheet; its `Beállítások`, `Fiók`, `Háztartás`, and `Tagok és meghívók` destinations link to the same real routes as the Settings index. The menu contains navigation only; it exposes no administrative actions and does not change role-gated controls on each destination. Existing route paths remain unchanged.
- [ ] Household selection/name management and member/invitation management live on separate Settings detail pages; no rename, member, invite, or household-admin form appears on the financial overview. The existing `HouseholdsPanel` can render these destinations through a narrow view prop without duplicating or changing its business logic.
- [ ] Household creation, onboarding, household rows, and household details do not show category names, category count, or a category preview; RON and household role/context remain available where relevant.
- [ ] OWNER, MEMBER and VIEWER see only controls allowed by current behavior at phone and desktop sizes. E-mail redaction and OWNER-only invitation controls remain unchanged.
- [ ] At 320/390 CSS px, member management remains in its existing single white card with the existing visible actions. The role label sits close to the member name; privacy text is concise; eligible OWNER removal stays visibly attached to its member row but uses restrained styling. The existing transfer-and-leave action is not styled as a green primary action. No nested cards, overflow popup, or structural rebuild is introduced; no general role-change control is added.
- [ ] Existing household IDs, API requests, CSRF headers, invitation fragment handling, server-side authorization, privacy rules, and atomic sole-OWNER transfer-and-leave behavior remain unchanged.
- [ ] At 320/390 CSS px there is no horizontal page overflow or clipped primary control; controls remain keyboard reachable, visibly focused, labeled, and at least 44 CSS px high. Enlarged text and reduced-motion settings remain usable.

## Dependencies

EPIC-03-T05 shared tokens and shell. The UI can proceed independently of T06 after that foundation is stable. Reuse the merged EPIC-02 household, member, and invitation contracts; do not change API behavior. T08 is a separate registration onboarding flow and also keeps default categories hidden.

## Likely files and ownership

- `apps/web/src/app/beallitasok/page.tsx` — Settings grouped index.
- `apps/web/src/app/beallitasok/fiok/page.tsx` — existing account/session controls.
- `apps/web/src/app/beallitasok/haztartas/page.tsx` — household selection, create, and rename.
- `apps/web/src/app/beallitasok/tagok/page.tsx` — member and invitation management.
- `apps/web/src/app/households-panel.tsx` — refactor the current combined panel to accept a household or members/invitations view; remove visible category count/list without changing data or business behavior.
- `apps/web/src/app/invitations-manager.tsx` and `apps/web/src/app/members-manager.tsx` — focused management views; preserve existing API behavior.
- `apps/web/src/app/household-management.module.css` — T07-only presentation styles as needed.
- Use the shared shell/tokens from T05; coordinate its navigation entry with the T05 owner rather than changing its shared files here.

## Verification checklist

- [ ] Manually open the floating `Menü` button and navigate through `Beállítások`, account, household, and member/invitation pages; from the Settings index and each detail page, use “Vissza” and confirm it returns directly to `/`. Confirm every entry points to a working route and the bottom sheet does not cover content, the safe area, or any live tab bar.
- [ ] Inspect OWNER, MEMBER, and VIEWER views at 320/390 px, tablet, and desktop with synthetic accounts. Verify household context, available actions, e-mail redaction, and category-free create/onboarding surfaces.
- [ ] At 320 and 390 px, inspect the existing single white member card, including compact heading/description spacing, name-to-role proximity, permitted email, visible restrained removal button, and the existing leave/ownership-transfer controls. Confirm no nested card or popup menu appears and no content/action clips. Check OWNER, MEMBER, VIEWER, sole OWNER with/without transfer candidate, removal confirmation, and existing action availability using synthetic accounts; do not perform destructive membership changes on real accounts.
- [ ] Check keyboard navigation, visible focus, persistent field labels, reduced motion, enlarged text, safe areas, touch-target height, and absence of horizontal overflow.
- [ ] Confirm the existing API authorization and privacy behavior remains in force. Do not perform destructive membership changes on real accounts. Run web lint/typecheck and diff-check; do not add or run an automated test suite.

## Non-goals and open questions

No new household/member/invitation business rules, API routes, authorization changes, role modification, category management, ledger, or dashboard behavior. The Settings destinations are the three specified sections; no placeholder Settings links are shown. No product decision remains open.

## Preimplementation planning record — 2026-10-26

Historical pre-implementation plan: the live Settings route rendered `AccountStatus` and the combined `HouseholdsPanel`, which also showed category count/names. The presentation was to be split into three Settings destinations using a narrow `HouseholdsPanel` view prop, preserving business logic. Remove category previews without changing backend seeding; keep T05 shell/token files unchanged. Dependencies, acceptance, likely files, manual responsive/role checks, and open decisions were recorded; no API or data-model change was expected.

### Implementation status — 2026-10-28

**Status: pending completion.** Grouped Settings and separate account, household, member/invitation and category-free household surfaces are present in `apps/web/src/app/beallitasok/`, `apps/web/src/app/households-panel.tsx`, and `apps/web/src/app/members-manager.tsx`. Manual role, privacy, navigation and responsive QA remains open; acceptance/verification boxes remain unchecked.

**Approved navigation decision — 2026-10-28:** The floating hamburger button is named `Menü` and opens the general mobile navigation bottom sheet. `Beállítások` is one destination inside the menu, not the trigger name. This resolves the earlier wording discrepancy with T05. Manual role, privacy, navigation and responsive QA remains open; acceptance and verification boxes remain unchecked.

### Navigation steering — 2026-10-26

Read-only inspection found a single shared detail-page back link in `apps/web/src/app/beallitasok/settings-section.tsx`, used by the account, household, and members/invitations routes; it currently points to `/beallitasok`. The Settings index in `apps/web/src/app/beallitasok/page.tsx` currently has no back link. Acceptance now requires a back-to-home link on the index and all detail pages, with every such link targeting `/` directly. Keep this as a UI navigation change only; route access and role/API behavior are unchanged. Verify the link from the index and each subpage manually.

### Superseded member panel proposal — 2026-10-26

The earlier grouped-list/overflow-popup/separate-footer redesign was rejected by the user as visually worse. Do not implement that proposal. The live design direction returns to the existing single white card and current visible controls, with only small typographic and spacing refinements; the updated plan below is authoritative.

### Member panel visual refinement replanning — 2026-10-26

Historical visual-refinement plan: the existing single white member card, visible removal action, footer, and transfer control were the reference structure; no new hierarchy or hidden menu was prescribed. The user asked to keep the active mobile screen simple and recognizable, with tighter but legible spacing and stronger name/role association.

- Scope and 390 px treatment: preserve one white member card, existing member rows, visible row-level `Eltávolítás` button, and existing bottom leave/transfer controls. Do not add nested cards, a three-dot/overflow popup, a new `Saját tagság` section, or structurally rebuild the panel. Make only small typography and spacing adjustments: compact heading-to-description and row gaps, keep clear separation between members, place the role badge inline or close to the member name, and shorten the explanation without changing its privacy meaning (for example: `A tagok neve és szerepe mindenki számára látható. Az e-mail-címet csak a tulajdonos és az érintett tag látja.`). Keep allowed e-mail as secondary text below the identity line. Keep removal visibly attached to its row, understated, keyboard reachable, and at least 44 px with existing confirmation. Preserve the footer; make `Tulajdon átadása és kilépés` a restrained neutral/outline action instead of a green primary action. At 320 px, allow existing elements to wrap/stack without clipping or changing available controls.
- Likely files: `apps/web/src/app/members-manager.tsx` for a minimal identity/role grouping and concise privacy copy if needed; `apps/web/src/app/household-management.module.css` for typography, spacing, role association, and restrained action styling. No other routes/components, APIs, authorization, business logic, or data changes.
- Dependencies and invariants: T05 tokens/shell and the existing T07 Settings page; merged EPIC-02 membership behavior. Preserve role-gated OWNER removal, current permitted e-mail visibility, owner-count safeguards, confirmation prompts, candidate eligibility, and atomic sole-OWNER transfer-and-leave. Do not add role modification, actions, menus, or card layers.
- Acceptance and manual verification: at 390 px, retain one white member card, familiar ordering, and visible controls; the name and role should read as one identity, privacy copy should be shorter but accurate, row spacing balanced, and removal quiet yet attached to its member row. Transfer must not be green-filled. At 320 px, controls remain reachable, labeled, unclipped, and without horizontal overflow; inspect 390 px and desktop too. Check OWNER/MEMBER/VIEWER, sole-OWNER candidate/no-candidate states, permitted e-mail visibility, keyboard focus, and existing confirmation. Use synthetic accounts only; no destructive membership action on real data.
- Open decisions: none. The user selected the single-card/existing-action direction and rejected the structural/menu redesign. No screenshot was available in the planning workspace, so acceptance uses the live restored screen and the user’s visual feedback rather than inferred pixel details.
