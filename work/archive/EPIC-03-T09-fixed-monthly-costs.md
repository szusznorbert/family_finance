# Active task: EPIC-03-T09

- **Task:** [EPIC-03-T09 — Configure optional recurring monthly costs](../product-owner/epics/EPIC-03-ledger-dashboard/tasks/EPIC-03-T09-fixed-monthly-costs.md)
- **MVP phase:** `MVP now` — user-approved current MVP feature.
- **Status:** `completed` — implementation, acceptance criteria, and verification checklist are supported by dated evidence.
- **Phase owner:** tester
- **Last completed step:** The tester completed isolated-browser UI checks: onboarding and the optional fixed-cost form at 320/390 px, no-cost submission, keyboard-only submission, accessible names/roles, measured 44 px touch targets, OWNER/MEMBER/VIEWER Settings and Journal behavior, and household switching. API checks also verified rollback (`400`, household count 0→0), exact decimal serialization (`"88.01"`), OWNER stop (`200`) versus MEMBER/VIEWER (`403`), archived `archivedAt` preservation, receipt-row invariance, and stopped-rule future generation.
- **Next step:** Archive this completed resume record before replacing the active pointer with the next coordinator-selected task.
- **Blocker:** None for EPIC-03-T09. Actual VoiceOver was removed from scope by the user's 2026-10-29 decision; semantic roles/names and keyboard behavior remain documented as observed evidence.
- **Verification evidence:** Targeted catch-up/retry/two concurrent replays covered one synthetic rule over 2026-10 through 2026-12; stopped-rule future generation returned `inactive`. Invalid final fixed-cost item returned `400` without creating a household. Rule GET returned exact decimal string `"88.01"`. MEMBER/VIEWER stop attempts returned `403`, OWNER stop returned `200`; archived occurrence timestamp remained unchanged after rule edit; a fixture-scoped RECEIPT row retained amount/date/note/archive state. Isolated Chrome CDP verified no-cost onboarding, 320/390 px flow, keyboard submission, semantic names/roles, OWNER/MEMBER/VIEWER UI and household switching, 44 px touch targets, and actual 200% Page zoom reflow with no horizontal overflow. See the T09 task file for dated evidence.

## Parked tasks

The full EPIC-03-T04 record is preserved at `work/archive/EPIC-03-T04-monthly-dashboard.md` with `pending completion` and its open manual UI gate. The EPIC-04-T04 record remains at `work/archive/EPIC-04-T04-duplicate-detection.md` with its own `pending completion` gates. Archiving does not mean completion.
