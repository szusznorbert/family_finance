# Parked task: EPIC-04-T06

- **Task:** [EPIC-04-T06 — mobile document upload](../../product-owner/epics/EPIC-04-private-documents/tasks/EPIC-04-T06-mobile-document-upload-ui.md)
- **Status:** `pending completion`
- **Phase owner:** designer → tester (synthetic mobile acceptance)
- **Last completed step:** The tester checked the prerequisites for T06 manual UI verification: web and API returned HTTP `200`, but no verified synthetic browser session was available; no authenticated UI or upload check ran.
- **Next step:** After a verified synthetic OWNER/MEMBER/VIEWER browser login, run manual QA at 320/390 px for the UI, picker, household switching, errors/retries, success, and T03 byte readback. Only then evaluate the checklist.
- **Blocker:** The account behind the existing browser session is unknown, and passwords/cookies from the earlier T03 `example.test` API smoke were not retained. The browser credential rule requires a new password to be provided by the user for takeover; no workaround API-created browser session was made. The T01 Compose named-volume and DB constraint checks and T02's remaining acceptance items are separate open gates.
- **Verification evidence:** T03 acceptance and T02 synthetic HTTP smoke were recorded earlier; T06 web `tsc --noEmit` under Node `v24.22.1`, targeted ESLint, and diff-check were previously clean. The 3000/3001 listeners, web `/`, and API auth-session HTTP `200` were verified now. T06 manual mobile QA did not run, and no automated test was created.

**Parked — 2026-10-28:** The status and open verification are unchanged; the coordinator made the T07-A API slice active for the user's document-viewing request. This record is not `completed`.
