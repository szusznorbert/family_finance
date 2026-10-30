# EPIC-03-T05: Establish a responsive UI foundation

**MVP phase: `MVP now` — explicitly approved by the user.**

## Goal and user value

Make the existing Household Finance flows clear and comfortable on phones while establishing a reusable visual system for the upcoming ledger and dashboard. The accepted visual direction is Cupertino-inspired, with the product's own household-finance identity.

## User/business value

Household members can reach household, invitation and account actions on a small screen without scrolling through one dense administrative page. The ledger/dashboard tasks can build on consistent responsive patterns instead of introducing a second visual language.

## Scope

- Establish semantic CSS design tokens for background/surface hierarchy, text, borders, action tint and status colors, respecting light/dark system preference where supported by the shared tokens.
- Keep the mobile trigger within the safe area and above any implemented bottom tab bar. The sheet rises from the bottom, respects the top and bottom safe areas, and expands to approximately 90dvh or the available safe-area viewport, whichever is smaller. Keep the `Menü` header and close control visible while destination links scroll independently in the sheet. Selecting a destination navigates and closes the sheet; the close button, Escape, and a downward swipe dismiss it. Opening the modal focuses its close control or first destination; Tab remains within the modal, and dismissal restores focus to the trigger. Give it dialog semantics (`role="dialog"`, `aria-modal="true"`, and an accessible name) and ensure the background cannot receive focus while it is open. The sheet, close control, trigger and destination buttons meet the 44×44 CSS px target.
- Order mobile menu destinations by expected frequency: `Napló`, `Fájlkezelés`, `Áttekintés`, `Beállítások`, `Háztartás`, `Tagok és meghívók`, `Kiadási kategóriák`, `Fiók`. The Overview is the starting page, so it follows the primary destinations. Use 15 px destination-link text while retaining the existing accessible touch targets. Preserve the existing route paths and page-level role gating; only show destinations that are implemented and available to the current user.
- In the mobile `Menü`, preserve `aria-current` semantics for the active destination without a full-width active-row fill. Keep the links navigation container free of its own border, background, and rounded panel; separate rows with light inset dividers.
- On desktop, the trigger may open the same Settings menu as a compact bottom-corner anchored overlay/popover; it must not consume the page or behave like a full-height mobile sheet. Make the post-onboarding home the financial overview; household rename and administration belong under Settings, not on the overview. Use labeled bottom navigation only for implemented top-level views; do not show placeholder ledger or receipt actions before those features exist.
- Adapt the overview structure for narrow phones, tablets and desktop. The overview presents available monthly income/expense totals and recent ledger entries from T03/T04; until those capabilities are implemented, show a useful empty state, never invented balances or a budget remaining amount.
- Define shared semantic tokens, layout, typography, labeled form controls, grouped/inset list rows with chevrons, and feedback patterns that EPIC-03-T01–T04 and the onboarding task can reuse.
- Preserve existing Hungarian copy, RON display, Better Auth flows, household authorization, email visibility and the OWNER/MEMBER/VIEWER access behavior.

## Implementation checklist

- [x] T05 read-only planning and the UI implementation boundary are recorded in the 2026-10-26 plans; the shared shell, Menu, and Overview code are present in the selected web files (`apps/web/src/app/app-shell.tsx`, `mobile-settings-menu.tsx`, `page.tsx`, `globals.css`).
- [x] Semantic light/dark tokens, shared focus/form/row states, safe-area viewport, and reduced-motion CSS rules are present (`apps/web/src/app/globals.css:3`, `:34`, `:94`, `:701`, `:826`; `apps/web/src/app/layout.tsx:9`).
- [x] `AppShell` accepts mobile household context and provides a labeled desktop sidebar and sticky mobile header. The home Overview shows real monthly dashboard totals for the selected household/month, category breakdown, and Journal link, without a household-rename admin form (`apps/web/src/app/app-shell.tsx:10`, `:42`; `apps/web/src/app/page.tsx:254`, `:320`, `:332`, `:358`; `apps/web/src/app/globals.css:100`, `:740`).
- [x] Authenticated-session-gated code is present for the 56 px floating hamburger named “Menü” and its bottom sheet: working destinations, role-gated Documents link, dialog name/ARIA, close, Escape, grabber swipe, Tab containment, focus restoration, and body scroll lock (`apps/web/src/app/mobile-settings-menu.tsx:16`, `:41`, `:57`, `:108`, `:151`; `apps/web/src/app/globals.css:172`, `:221`, `:238`, `:302`). This is static implementation evidence, not manual accessibility acceptance.
- [x] Expand the mobile `Menü` sheet to approximately 90dvh or the available safe-area viewport, whichever is smaller.
- [x] Keep the mobile menu header and close control visible while its destination links scroll independently.
- [ ] Superseded historical implementation evidence: the earlier source order was `Áttekintés`, `Napló`, `Fájlkezelés`, `Beállítások`, `Háztartás`, `Tagok és meghívók`, `Kiadási kategóriák`, `Fiók`; this is no longer the active approved order.
- [x] The mobile menu destinations render in the updated order `Napló`, `Fájlkezelés`, `Áttekintés`, `Beállítások`, `Háztartás`, `Tagok és meghívók`, `Kiadási kategóriák`, `Fiók`, preserving existing route and role gating.
- [x] Mobile menu destination-link text uses 15 px while preserving its existing touch-target size.
- [x] Preserve `aria-current` for the active mobile menu destination while removing its full-width active-row fill.
- [x] Remove the navigation container's border, background, and rounded panel; style row separation with light inset dividers.
- [ ] The full T05 mobile/desktop/accessibility scope is not complete: desktop shows a sidebar rather than the requested compact corner menu/popover (`globals.css:740`, `:795`); there is no labeled mobile bottom tab bar for Overview and Journal despite both routes existing (`app-shell.tsx:10`, `:36`); the home page does not show recent ledger entries (`page.tsx:330`, `:396`); and the sheet does not make its background inert alongside focus containment (`mobile-settings-menu.tsx:57`, `:123`). Role-specific 320/390 px and keyboard QA is also unverified, so acceptance boxes remain unchecked.

## Acceptance criteria

- [ ] At 320–390 CSS px widths, the financial overview and mobile `Menü` sheet remain readable and operable without horizontal page overflow or clipped controls. The floating hamburger button, accessibly named `Menü`, respects safe-area and tab-bar clearance; the sheet scrolls internally, retains a visible close control, and does not hide its own actions. Desktop uses a compact bottom-corner menu overlay/popover rather than a full-height sheet.
- [ ] The mobile `Menü` sheet has an accessible dialog name, `role="dialog"`, `aria-modal="true"`, and a contained Tab sequence. The close button, Escape, and downward swipe dismiss it; route selection navigates and closes it; dismissal restores focus to the trigger. Trigger, close control, and every destination button provide at least 44×44 CSS px targets.
- [ ] At mobile viewport sizes, the `Menü` sheet expands to approximately 90dvh or the available safe-area viewport, whichever is smaller, without clipping destinations.
- [ ] While the menu is open, its header and close control remain visible as the destination list scrolls independently.
- [ ] The mobile menu destinations appear in this order: `Napló`, `Fájlkezelés`, `Áttekintés`, `Beállítások`, `Háztartás`, `Tagok és meghívók`, `Kiadási kategóriák`, `Fiók`; each destination retains its existing route and role gating.
- [ ] Mobile menu destination links use 15 px text and retain at least 44×44 CSS px touch targets.
- [ ] The active mobile menu destination retains `aria-current` but has no full-width row fill; non-active and active links keep readable text and the established link order.
- [ ] The destination-list container has no border, background, or rounded panel, and rows are separated by light inset dividers.
- [ ] The floating `Menü` trigger and its sheet are rendered only after the client confirms an authenticated session. During session loading, when signed out, or when session lookup fails, no trigger or sheet is visible. If the session becomes unauthenticated while the sheet is open, the sheet closes and releases any scroll lock.
- [ ] The overview contains household context, period, actual ledger totals/recent entries when available, and no household rename/admin forms; those controls are reachable from Settings.
- [ ] Navigation and section hierarchy work at phone and desktop widths, show labels for primary navigation, and expose no link/action for an unimplemented feature. On mobile the bottom bar contains Áttekintés and Napló only when both routes are implemented; Settings stays in the menu.
- [ ] Shared tokens and reusable patterns support future ledger/dashboard rows and summaries; color communicates hierarchy/status but is never the only status cue.
- [ ] Keyboard focus, reduced-motion preference, readable text scaling and at least 44 CSS px primary touch targets are preserved; responsive styling does not alter auth, API, authorization, household isolation or PII visibility.

## Dependencies

EPIC-02-T02 through T07 are merged to `main`. T05 establishes shell, overview layout and tokens, then precedes the EPIC-03 web UI changes. T03/T04 supply ledger rows and monthly aggregates to the overview; their API/data work can proceed without T05. T06 and T07 depend on the tokens and shell from T05. T08 onboarding depends on T06 registration and existing EPIC-02 household-create/invitation contracts.

## Likely files

- `apps/web/src/app/globals.css`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/app-shell.tsx` — shared desktop navigation and mobile shell.
- `apps/web/src/app/mobile-settings-menu.tsx` — authenticated mobile `Menü` trigger and navigation sheet, if kept separate from the shell.
- Relevant web-level `AGENTS.md` guidance and installed Next.js documentation (read before implementation)

## Verification checklist

- [ ] Manually inspect the overview and `Menü` trigger/sheet at 320, 375/390, tablet and desktop widths using synthetic accounts only; verify the accessible trigger name, safe-area and tab-bar clearance, internal scrolling, close button, swipe-down dismissal, route navigation, and no clipped actions. Confirm `Beállítások` is a destination inside the menu and desktop uses the compact corner overlay/popover. After T03/T04, verify recent rows and totals reflect the selected household and month.
- [ ] Keyboard through navigation and forms; verify modal focus entry/containment, Escape dismissal and focus return, visible focus, system light/dark appearance, reduced motion, zoom/text enlargement, no horizontal overflow and no hidden primary actions.
- [ ] At 320/390 px, open the mobile `Menü`, scroll its destination list to the end, and verify the header and close control stay visible, all eight destinations can be reached in the updated approved order, and safe-area spacing is respected.
- [ ] Verify destination-link text renders at 15 px and each link retains the approved touch target.
- [ ] With a destination active, inspect the menu visually and with accessibility semantics: confirm `aria-current` remains, no full-width active fill appears, the links container has no panel border/background/radius, and row dividers are light and inset.
- [ ] Verify the `Menü` trigger is absent while signed out, session loading, and session lookup error; visible after a valid session resolves; and removed on sign-out. If sign-out occurs with the sheet open, confirm it closes and page scrolling is restored.
- [ ] Confirm at least one OWNER/MEMBER/VIEWER household flow visually while retaining the existing backend authorization checks; do not use real household financial data.
- [ ] Run the project's lint/typecheck and relevant build quality checks; no automated test suite is added or run for this MVP work.

## Non-goals and open questions

- Does not implement ledger/category/dashboard APIs, receipt scanning or onboarding business flows; these remain in EPIC-03-T01–T04, EPIC-05 and T08.
- Does not change authorization, API contracts, account settings or invitation/member business rules.
- Exact brand palette and type scale are implementation choices guided by the research brief and requested Cupertino direction; do not copy Apple product screens or assets. Use the 390 px wireframes in the benchmark and research brief as design targets. Seeded categories are not displayed during onboarding.

### Implementation status — 2026-10-28

**Status: implementation partially complete; manual QA pending.** Static evidence for the shared shell, tokens, data-backed monthly Overview, and authenticated “Menü” bottom sheet is listed in the Implementation checklist above. The desktop corner popover, mobile Overview/Journal tab bar, recent ledger rows, and background focus prevention are missing from the current code. No 320/390 px, desktop, role-specific, focus, or auth-state manual QA was completed in this read-only review; acceptance and verification boxes remain open.

**Approved navigation decision — 2026-10-28:** The floating hamburger button is named `Menü` and opens the mobile bottom sheet titled `Menü`. `Beállítások` is a destination within that menu, not the trigger label. The older Settings-specific trigger/title wording in the historical planning records below is superseded. This resolves the product wording question; accessibility, authenticated-only visibility, safe-area, focus, role-gating, and manual QA requirements remain in force and unchecked pending Designer/Tester evidence.

## Preimplementation planning record — 2026-10-26

Read-only planning completed before implementation. Current web routes are `/`, `/bejelentkezes`, `/regisztracio` and `/invitations/accept`. The app uses Next.js 16/React 19 and Tailwind CSS 4; `globals.css` has only basic background/foreground variables, while page components contain hard-coded slate/emerald colors. There is no shared navigation shell or component/token system. The current household panel combines household selection/settings, invitation and member management. EPIC-03-T01–T04 are planned but not implemented. The approved UX direction makes the post-onboarding home a financial overview; household administration moves to Settings, and seeded categories are not shown during onboarding.

Historical planning record: implementation order was tokens, app shell, and overview structure first; then auth/invitation UI (T06), Settings/household management (T07), and post-registration create-or-join (T08). T03/T04 supplied overview data and T03 was to make the Journal tab real before showing it. UI work required no API or Prisma changes. Existing routes, rewrites, auth state, and server-side policy calls were to remain unchanged. The 390 px wireframes and token proposal are in `docs/research/mobile-responsive-cupertino-ui.md`.

Historical open decision: exact color and type scale were left to the designer. Product direction was set: separate onboarding after registration, financial Overview as home, no category list during onboarding, household administration under Settings, and only working destinations in mobile navigation.

## Navigation replanning — 2026-10-26

Historical 2026-10-26 direction: the mobile Settings entry was a lower-trailing floating action, not a top-right three-dot control. It opened a bottom sheet with a grabber, title, close button and vertically scrollable destination buttons for account, household, and members/invitations. This Settings-specific trigger/title wording was superseded by the approved general `Menü` direction recorded above. The established Settings routes and server-side role checks, safe-area and bottom-tab clearance, modal semantics, contained focus, Escape/swipe/route dismissal, focus restoration, desktop compact overlay, and manual QA requirements remain applicable.

## Mobile LAN access fix plan — 2026-10-26

Read-only planning completed with the product-owner agent before implementation. The phone can load the web HTML at the Mac's private Wi-Fi address, but the page remains in its session-loading state because Next.js dev assets are restricted to the default host. The auth session GET succeeds through the same-origin web proxy, while future browser mutations would still be rejected because Better Auth and the API CSRF guard currently trust only `WEB_ORIGIN`.

- Scope: enable local mobile development through the Mac's current private IPv4 address, limited to exact RFC1918 interface addresses in development. Keep production restricted to the configured `WEB_ORIGIN`; do not change auth, database, or authorization contracts.
- Likely files: `apps/web/next.config.ts`, `apps/api/src/lib/auth.ts`, `apps/api/src/lib/csrf-protection.ts`, and `docs/architecture.md`.
- Dependencies: existing Next.js 16.4.3 `allowedDevOrigins` configuration, Node network-interface APIs, and Better Auth 1.7.12 `trustedOrigins`; no new dependencies or migrations.
- Acceptance and verification: localhost and `http://<Mac-private-ip>:3000` hydrate, resolve unauthenticated session state, show login/registration, and allow the menu to open; both session GETs return 200. Do not create accounts or mutate household/member data. Run web/API lint and typecheck plus `git diff --check`; no automated tests. If no synthetic credential exists, do not attempt login and report it as unverified.
- Open decisions: none; the private-address allowlist and development-only boundary are fixed by the task assignment.

## Historical plan: authenticated navigation trigger — 2026-10-26

Historical read-only planning — 2026-10-26. `AppShell` mounted `MobileSettingsMenu` on home, auth, invitation, onboarding, and Settings routes. At that time the menu rendered its floating trigger unconditionally and did not read the Better Auth session; `authClient.useSession()` was already the established client-side session-state pattern.

- Scope: gate only the floating navigation trigger/sheet on a confirmed signed-in user. Keep it hidden while the session is pending, unavailable, or signed out. If the session becomes unauthenticated while open, close the sheet and release its body scroll lock. This is a presentation guard; existing server-side route authorization remains authoritative.
- Likely files: `apps/web/src/app/mobile-settings-menu.tsx`; no `AppShell`, API, auth configuration, route, or role-policy change is needed.
- Dependencies: the existing `authClient.useSession()` client hook and the T05 navigation sheet. No new API, dependency, or data contract.
- Acceptance and manual verification: with a signed-out session, pending session lookup, or lookup error, neither trigger nor sheet is visible; after a valid session resolves, the `Menü` trigger appears and its menu works; signing out hides it. If the session ends while the sheet is open, it closes and page scrolling is restored. Verify these states on home and at least one auth/Settings route, without changing route guards or role-specific controls.
- Open decisions: none. No secrets or environment values are needed for this UI-only change.

## General navigation menu replanning — 2026-10-26

Historical implementation planning — 2026-10-26. The signed-in menu was rendered by `apps/web/src/app/mobile-settings-menu.tsx`; at that time its trigger and sheet used the “Beállítások” label. The existing session gate was already in place. The approved 2026-10-28 decision above supersedes this Settings-specific trigger/title presentation while preserving the session gate, sheet dismissal/accessibility behavior, and route authorization requirements.

- Scope: replace the visible floating “Beállítások” control with a blue hamburger icon button whose accessible name is “Menü”. Recast the sheet as the app’s general navigation menu, titled/labeled “Menü”, and include only existing, working destinations: overview (`/`), Settings index (`/beallitasok`), account, household, and members/invitations. Keep it extensible for future real routes without showing placeholders. Preserve authenticated-only rendering and existing keyboard, focus, dismissal, safe-area, and touch-target behavior.
- Likely files: `apps/web/src/app/mobile-settings-menu.tsx` for trigger semantics/navigation items and `apps/web/src/app/globals.css` for the blue icon trigger and menu list styling. Do not change Better Auth, app routes, APIs, role policy, or the shell unless implementation shows a necessary, explicitly planned integration need.
- Dependencies: current authenticated-session gate, existing `/` and `/beallitasok` routes and three Settings detail routes, and T05 sheet behavior. No new route or data/API contract is required.
- Acceptance and manual verification: signed-out/loading/error sessions still render no menu trigger; a confirmed signed-in session sees a blue, icon-only hamburger exposed to assistive technology as “Menü”; activating it opens a sheet with a general navigation title and working links to the five existing destinations only. Selecting a link navigates and closes the sheet; Escape, close control, backdrop, and downward swipe dismiss it, restore focus, and release scroll lock. Verify visible focus, 44×44 px target, contrast, 320/390 px and desktop presentation, and no placeholder destination.
- Open decisions: none. Keep the trigger icon-only and use its accessible name for the label; the menu contains only routes that exist now.

## Menu sizing and order implementation — 2026-10-28

**Verification record:** Under Node 24.22.1, `pnpm --filter web typecheck` and `pnpm --filter web lint` passed; `git diff --check` passed. Source inspection confirms the sheet uses 90dvh height capped by the viewport remaining after safe-area and bottom-navigation insets, with the grabber/header fixed in a flex column and only the destination nav independently scrollable. At the time of this review, render order was `Áttekintés`, `Napló`, household-gated `Fájlkezelés`, `Beállítások`, `Háztartás`, `Tagok és meghívók`, `Kiadási kategóriák`, `Fiók`. The user's subsequent refinement supersedes that order and sets destination-link text to 15 px; the new implementation and acceptance items remain unchecked. No manual 320/390 px or keyboard QA was run; the relevant Verification checklist items remain open. No automated tests, database access, or fixture operations were performed.

## Destination order and typography refinement — 2026-10-28

**Verification record:** Updated the rendered mobile sequence to `Napló`, household-gated `Fájlkezelés`, `Áttekintés`, `Beállítások`, `Háztartás`, `Tagok és meghívók`, `Kiadási kategóriák`, `Fiók`; reduced only destination-link text to 15 px and retained the 60 px minimum row height. Node 24.22.1 web typecheck/lint and `git diff --check` passed. The earlier order is retained above as unchecked historical evidence, not an active completed item. No browser QA, automated test, database access, or fixture operation was performed; all manual Verification checklist items remain open.

## Menu active-state visual refinement — 2026-10-28

**Verification record:** The destination links keep their `aria-current="page"` attributes, while CSS no longer styles that attribute with a full-width fill. The nav container has no border, background, or rounded panel; individual rows use subtle inset dividers, and hover changes text color only. The approved order, 15 px text, 60 px row targets, sheet sizing, and independent scrolling are unchanged. Static source check and Node 24.22.1 web typecheck/lint plus `git diff --check` pass. No browser screenshot/keyboard QA or automated test was run; the corresponding manual Verification checklist item remains unchecked. No database or fixture access occurred.
