# EPIC-03 implementation plan — 2026-10-26

## Outcome and boundary

Build a household-scoped, RON-only canonical ledger. An approved receipt in EPIC-05 creates exactly one ledger expense; receipt lines supply product history and never increase ledger totals. Tasks below are proposals for implementation, not implemented system facts. The user also requested a responsive, Cupertino-inspired UI foundation after EPIC-02; the UI tasks below establish and apply that foundation before the EPIC-03 screens.

## Order and dependencies

### UI foundation — before EPIC-03 web screens

1. [EPIC-03-T05: Establish a responsive UI foundation](EPIC-03-T05-responsive-ui-foundation.md) — Cupertino-inspired tokens, mobile app shell, financial overview structure and Settings entry point.
2. [EPIC-03-T06: Align authentication and invitation flows](EPIC-03-T06-auth-and-invitation-ui.md) — apply T05 to sign-in, registration and invite acceptance; registration hands off to T08.
3. [EPIC-03-T07: Organize household management under Settings](EPIC-03-T07-responsive-household-management-ui.md) — grouped Settings index, focused detail routes, and category-free household creation UI.
4. [EPIC-03-T08: Onboard newly registered accounts into a household](EPIC-03-T08-first-household-onboarding.md) — one short create-or-join flow after registration; seeded categories stay hidden from the user.

T05 was the visual prerequisite for EPIC-03 web UI; T06 and T07 could proceed independently once its tokens were stable. T08 depends on T05, T06 registration, and existing EPIC-02 household/invitation behavior. The ledger, dashboard API, and home-page dashboard UI code are present, but task acceptance remains open: the T03 edit/archive migration has not been applied locally, and its manual role/audit checks remain open; T04 synthetic reconciliation evidence is still needed. `docs/architecture.md` has been corrected to reflect the implemented monthly dashboard; manual task acceptance remains open. Do not show non-functional navigation for future features. The bottom bar gains `Áttekintés` and `Napló` only after both are accepted; Settings stays in the top context/menu hierarchy.

## Current evidence snapshot — 2026-10-28

This is a product-planning index, not implementation or QA sign-off. Task acceptance and verification checklists remain the evidence source and are intentionally unchanged by this audit. Architecture records implementation code for T01–T04 and T09; it records T03 migration/runtime verification and T09 worker database verification as open. T05–T08 implementation is present in the working tree, but task-level manual acceptance evidence remains open. Developer owns implementation/migration facts in task records; Tester owns synthetic runtime and responsive QA results. No task is accepted solely because code is present.

### Ledger and dashboard implementation

4. [EPIC-03-T01: Manage household categories](EPIC-03-T01-household-categories.md) — extend the nine defaults seeded by EPIC-02 with permitted category management.
5. [EPIC-03-T02: Establish the RON canonical ledger write path](EPIC-03-T02-ron-ledger-write-path.md) — decimal-safe manual entries and a receipt source/link boundary. This is the blocking EPIC-03 dependency for EPIC-05 receipt approval.
6. [EPIC-03-T03: Browse and maintain ledger entries](EPIC-03-T03-ledger-browse-maintain.md) — household-scoped list, filter, edit and archive.
7. [EPIC-03-T04: Show monthly household totals](EPIC-03-T04-monthly-dashboard.md) — summarize canonical ledger rows once.
8. [EPIC-03-T09: Configure fixed monthly costs once](EPIC-03-T09-fixed-monthly-costs.md) — optional fixed costs during household creation; one real ledger entry per month, with audited updates when the rule changes retroactively.

T01 and T02 can be planned independently after EPIC-02 household authorization exists; coordinate any schema changes. T03 depends on T02. T04 depends on T02 and should use the same canonical source as T03. EPIC-05 does not need to wait for T03 or T04 to begin its draft/review work, but its first release must verify receipt posting against this ledger and the monthly totals once the dashboard exists. The UI foundation has no dependency on the ledger API and must not block API-only portions of T01/T02.

T09 builds on T02's canonical entries, T03's append-only audit principle, T04's aggregation, and T08's household-creation UI. Before coding, the architect must extend ADR-0001's `MANUAL`/`RECEIPT` source contract with a source unique to each monthly occurrence of a recurring rule. EPIC-06 may later add payment status and reminders to those same monthly occurrences, without a second ledger entry. Primary input paths are T09 fixed costs and EPIC-05's photo receipt flow; T02 manual entry is a rare fallback.

The user's 2026-10-27 clarification, “`egyelőre maradjon`” (“leave it as is for now”), retains the provisional MVP fields for optional setup during household creation and later Settings management: name, RON amount, category, monthly day, and start month, with dates adjusted to the last day of shorter months. The T09 file contains five sequentially verifiable architect/developer/designer/tester slices and separately identified coordinator routine foundations. A real monthly ledger entry and audited updates to the rule's own past entries are explicitly approved; the field set remains provisional.

## Manual checkpoints

- After T05–T08, manually inspect the overview, auth/invitation, onboarding and Settings flows at 320/390 px, tablet and desktop widths, including safe areas, keyboard focus, enlarged text and role-specific visibility. Use synthetic accounts only; no automated tests.

- After T01–T02, use the existing local app and synthetic households to verify separate categories, RON-only decimal amounts and a single canonical entry per manual transaction. No project copies or automated test code.
- After T03–T04, manually verify one household cannot read or mutate another's ledger IDs, archived entries keep the agreed audit history, and totals count an approved receipt once even when it has multiple lines. Lint/typecheck/build may be run as quality checks; no automated tests are added or run for this MVP planning scope.
- After T09, manually verify one rule produces one real row per month, a rule change updates only its own past occurrences with append-only audit, and restart/retry cannot duplicate an occurrence. Use synthetic households only.

### Historical final EPIC-03 mobile UI review before EPIC-04 — 2026-10-27

After functional manual verification of EPIC-03, the designer and reviewer should separately inspect the full mobile flow using the [four-app research benchmark](../../../../docs/research/household-finance-mobile-ui-benchmark.md) and [Cupertino direction](../../../../docs/research/mobile-responsive-cupertino-ui.md): registration → household creation with fixed costs or invitation → `Áttekintés` → `Napló` → `Menü`/`Beállítások`. Make focused fixes for hierarchy, spacing, navigation, role, and long-copy issues actually observed; do not add buttons to unfinished screens. Manually inspect Hungarian/RON content, focus, enlarged text, safe areas, accessible 44 px targets, and horizontal overflow at 320/390 px and desktop, using synthetic OWNER/MEMBER/VIEWER data. Record closure findings and fixes in EPIC-03 documentation; EPIC-04 implementation starts afterward.

#### Historical first focused mobile-refinement slice — 2026-10-27

**Audit findings and boundary:** In the Journal at 320/390 px, many expanded filters push entries down, a long RON amount may wrap between digits at 320 px, access to manual entry is not equally clear from every list state, and the selected household name is missing from the mobile header. This first slice addresses only these four visible issues; it adds no financial feature or API/authorization change and does not rearrange navigation on other pages.

**File ownership and dependency:** A `designer` owns `apps/web/src/app/naplo/ledger-list.tsx` and `apps/web/src/app/naplo/ledger-list.module.css`. Use the existing `AppShell` `mobileContext` prop for the household name or, for multiple households, the selector; do not modify shared `app-shell.tsx` or `globals.css` in this slice. The existing Journal API, household list, role, and `/naplo/uj` route are the foundation. Do not overwrite another agent's parallel file changes.

**Brief acceptance:** On mobile, filters are collapsed by default and all existing filters/labels work when expanded; active filters and errors remain noticeable while collapsed. At 320 px, the full amount and `RON` remain readable, the number does not wrap between digits, and there is no horizontal page scroll. `OWNER` and `MEMBER` can reach the real `/naplo/uj` page from the Journal through a discreet `Kézi tétel` link; `VIEWER` does not see it, and server authorization is unchanged. The mobile header shows the selected household name and updates on household switch; the existing brand remains during signed-out/loading states. Filters and Journal remain convenient on desktop.

**Manual verification:** With synthetic OWNER/MEMBER/VIEWER sessions, inspect at 320 and 390 px and then desktop: keyboard expansion and retained filter values, active-filter indicator, date error, empty and long-amount rows, household switching, role-gated manual-entry link, focus indication, and overflow. Keep the app running; no data changes are needed, and no automated tests are written or run. Web typecheck, lint, and diff-check are static gates. Decide separately on later mobile refinements involving other files after this slice.

#### Historical second and final mobile-refinement slice — 2026-10-27

**Audit and research basis:** The [mobile benchmark](../../../../docs/research/household-finance-mobile-ui-benchmark.md) recommends a concise, clear household overview; the [Cupertino direction](../../../../docs/research/mobile-responsive-cupertino-ui.md) recommends accessible real financial views and consistent household context. On the current home page, the `Napló megnyitása` link follows the full category list and can be far from monthly totals in longer months. The first mobile refinement handles Journal filters, amount rows, and header household context separately; this slice rearranges only the home-page entry point and performs focused regression checks.

**File ownership and dependency:** After the first Journal mobile refinement and T09's E-slice Journal labeling are complete, a `designer` modifies only the home view/styles in `apps/web/src/app/page.tsx` and `apps/web/src/app/overview.module.css`. Settings, onboarding, Journal, API, and shared `app-shell.tsx` are manual regression targets in this slice, not parallel edit targets. A `reviewer` checks context/navigation consistency between screens, and a `tester` performs manual 320/390 px QA with synthetic sessions. If a concrete issue appears on another screen, coordinate a separate focused fix with its file owners; do not overwrite another agent's changes.

**Acceptance criteria:**

1. The real `/naplo` link is easy to find without scrolling near the monthly-summary heading or figures on the home page, both with an empty category list and a long one; the rare `Kézi tétel` action does not take visual priority.
2. The selected household is consistent between home-page mobile/desktop context and the Journal mobile header; after household switch, monthly figures and Journal data belong to the new household, and the Settings entry works.
3. At 320 and 390 px, there is no horizontal page scroll or amount/name wrapping issue; the Journal link remains usable above the safe area with at least a 44 px touch target, keyboard focus, and enlarged text.
4. With synthetic OWNER/MEMBER/VIEWER sessions, Journal collapsible filters, the `RECURRENT` label, fixed-cost Settings view, and short optional onboarding work with existing role/navigation behavior; signed-out state has no broken menu/link. The tester records observations; no automated test is written.

## Decisions before implementation

- Define the allowed edit/archive behavior and audit retention for posted ledger rows.
- Define date and time-zone presentation for household reports. RON-only input and the nine initial Hungarian categories are already approved.
- The design tasks use the accepted Cupertino-inspired direction; exact palette and type scale are designer choices guided by the research wireframes. Do not copy Apple screens/assets or add unimplemented navigation targets. Household administration belongs under Settings, and default categories must not be listed during onboarding.

## Release dependency for EPIC-05

EPIC-05-T05 depends on T02's canonical Expense model and receipt source/link boundary. Product history in EPIC-05 reads receipt lines and must not contribute an additional amount to the ledger or dashboard.
