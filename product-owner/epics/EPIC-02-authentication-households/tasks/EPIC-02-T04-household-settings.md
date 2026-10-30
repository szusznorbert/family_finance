# EPIC-02-T04: View and update household settings

## Goal and user value

Members can view the household they are using; an OWNER can correct its name.

## Scope

Add household detail and permitted name updates in the API and web. Apply the T03 policy and validate values. The MVP currency is fixed to RON and cannot be edited through the UI or API.

## Pre-implementation planning record — 2026-10-26

- **Bounded scope and order:** Add an ID-scoped household detail read and name update to the API, then show the selected household's details and an OWNER-only name form in the existing web panel. Reuse the T03 authorization policy on every request. Keep currency visible as `RON` and immutable; do not add category, membership, invitation or deletion controls.
- **Likely files:** Add `apps/api/src/app/api/v1/households/[householdId]/route.ts` for GET/PATCH; use the existing `apps/api/src/lib/household-authorization.ts` helper; extend `apps/web/src/app/households-panel.tsx`; record the implemented API/data flow in `docs/architecture.md` and observed verification in this task file. The existing Household name and currency fields are sufficient, so no Prisma schema or migration change is expected.
- **Dependency and role matrix:** T03 is complete. For a target household, GET uses `read` and permits OWNER, MEMBER and VIEWER; PATCH uses `manage` and permits only OWNER. An unauthenticated request returns 401. A nonexistent household or a nonmember's ID returns the same 404. A current MEMBER or VIEWER attempting PATCH receives 403. The browser's selected ID and displayed role are preferences, never authorization evidence; the API reads current membership from the database.
- **Validation and integrity:** Accept only a valid name of 1–100 characters after trimming. Reject unsupported fields, including any attempt to submit currency, and leave the record unchanged on invalid or unauthorized requests. A successful update affects only the addressed household. Return user-specific detail with `Cache-Control: no-store`; keep the web's displayed name in sync after save and reload.
- **Manual verification:** In the existing local app, use synthetic accounts and at least two households. Verify all three roles can read their household, only OWNER can rename it, and a second household is unchanged. Check 401 without a session, identical 404 behavior for missing and foreign IDs, 403 for MEMBER/VIEWER PATCH, empty and overlong names, unsupported/currency fields, a tampered selected ID, and the saved name after page reload. Run lint/typecheck/build as implementation quality checks; record actual results. Do not add or run automated tests for this MVP task.
- **Risks and decisions:** MEMBER/VIEWER manual cases need synthetic local membership fixtures because invitation acceptance is a later task. Avoid leaking household existence through error differences or stale client state. No new product decision blocks this bounded task; the OWNER settings permission and RON-only rule are approved.
- **Planning pass confirmation — 2026-10-26:** The product-owner read-only planning review confirmed this record covers scope, files, dependency, role matrix, validation, risks and manual verification. No blocking decision or schema change is needed.

## CSRF hardening follow-up plan — 2026-10-26

- **Scope and files:** Before this security fix is coded, require the cookie-authenticated `PATCH /api/v1/households/[householdId]` request to carry an `Origin` matching the configured public `WEB_ORIGIN` and JSON `Content-Type`; reject missing, `null`, malformed or different origins and missing/non-JSON media types before any update. Use a shared API request guard if useful for the T05 routes; likely files are this route, a small module under `apps/api/src/lib/`, `docs/architecture.md` and this task record. The current web PATCH already sends JSON; GET and household-name behavior remain in their existing scope. This follow-up plan was made after the initial T04 implementation, before the CSRF edit.
- **Dependencies, acceptance and verification:** Preserve T03 session/membership/OWNER policy and the existing 401/404/403 behavior for otherwise valid requests. With synthetic local households, send a valid OWNER PATCH through the web proxy and direct API using the configured origin and JSON media type; it must still save. Repeat with absent/foreign/`null` Origin and form, text, multipart or absent `Content-Type`; each must be rejected without changing the name. Confirm MEMBER/VIEWER and foreign-household denials remain effective. Use the existing local app and direct requests, record observed results, and run relevant lint/typecheck/build checks; no automated tests are added or run.
- **Risks and decisions:** Compare parsed origins rather than trusting the request Host or proxy headers; allow a JSON media type with a charset parameter. Browser and proxy behavior must be checked with the configured local web origin. No new product decision is required.

## Implementation checklist

- [x] `apps/api/src/app/api/v1/households/[householdId]/route.ts` provides detail GET and name PATCH with current membership and OWNER-only mutation.
- [x] The route rejects invalid names and currency changes and retains the established no-store/error behavior.
- [x] `apps/web/src/app/households-panel.tsx` supports household selection and OWNER rename while preserving the selected household context.

## Acceptance criteria

- [x] A current member can view the selected household's name, default currency and their role; an unrelated account cannot retrieve it by ID.
- [x] Only OWNER can update the name; MEMBER and VIEWER direct API requests, invalid input and attempts to change the currency leave the record unchanged.
- [x] A user belonging to two households can update one without changing the other, and the web reflects the saved value after reload. The API's second-household state was manually confirmed unchanged; a later independent browser pass confirmed the renamed value persists after reload.

## Verification checklist

- **CSRF hardening follow-up implementation — 2026-10-26:** Added a shared `WEB_ORIGIN` + JSON media-type guard to authenticated OWNER PATCH requests. Missing/malformed/mismatched Origin, absent/non-JSON Content-Type, or missing/invalid `WEB_ORIGIN` are rejected before the household update. API ESLint and `tsc --noEmit` passed after the T05 Prisma client was regenerated. A subsequent independent manual round checked runtime requests; no automated tests were added or run.
- **Independent manual verification — 2026-10-26 (reported by the checking agent):** The OWNER renamed the household in the browser and the saved name remained after page reload. Direct requests confirmed the 401/200/403/404 session, role and household-ID matrix. Invalid Origin and Content-Type requests were rejected without an update. Invalid name and currency submissions remained rejected without changing the record; the second household remained unchanged. The temporary second-household and role fixtures were cleaned up; the synthetic test account and primary synthetic household were retained. This record reports that agent's results rather than a second run by the product-owner agent.

- [x] With synthetic local accounts and two synthetic households, manually verified OWNER GET/PATCH success; MEMBER and VIEWER GET `200`/PATCH `403`; no-session GET/PATCH `401`; and foreign and nonexistent household IDs both `404` with the same error code/message.
- [x] Manually submitted blank and 101-character names and attempted both `currency: "EUR"` and `currency: "RON"`; each returned `400 VALIDATION_ERROR`. Follow-up GETs confirmed the target name and RON currency were unchanged. A second household's name/currency/OWNER role remained unchanged after updating the first.
- [x] MEMBER/VIEWER coverage used a temporary synthetic membership fixture in the local database. It was restored to MEMBER after the checks; the OWNER membership and both households were preserved. Temporary cookie jars and response bodies were stored under `/private/tmp` and removed by a shell trap; cookie values were never printed.
- [x] In the browser, verify that the OWNER form displays the saved name after a real page reload. An earlier browser session was interrupted; the later independent manual round completed the rename-and-reload scenario successfully.
- [x] Quality checks passed: API and web `tsc --noEmit`; web ESLint; repository API/shared ESLint; API `next build`; web `next build --webpack`. The aggregate `pnpm lint` command attempted a dependency-directory reconciliation and stopped at pnpm's non-interactive confirmation prompt; no install was performed. Direct lint commands passed instead.
- [x] `git diff --check` passed. No automated tests were added or run, per the current project preference.

## Dependencies

EPIC-02-T03. May proceed independently of invitations after the settings permissions are approved.

## Non-goals and open questions

Currency editing and conversion, financial transaction behavior and household deletion are outside this task. T03 supplies the 401/404/403 API policy: missing session, foreign or missing household, and member with insufficient role, respectively.
