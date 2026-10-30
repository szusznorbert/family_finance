# Active task: EPIC-04-T04

- **Task:** [EPIC-04-T04 — duplicate detection](../product-owner/epics/EPIC-04-private-documents/tasks/EPIC-04-T04-duplicate-detection.md)
- **Status:** `pending completion` — navigation state reset and bounded list-request error handling are implemented; browser reproduction remains unverified.
- **Phase owner:** developer
- **Last completed step:** Keyed the library client subtree to Next's fresh-navigation `bfcacheId` and bounded list requests to 30 seconds; timeout now transitions to a retryable error. Node 24 web typecheck/lint and targeted diff-check pass.
- **Next step:** Manually repeat menu→library, navigate away, reopen via menu, and verify the list loads; if an API stall is induced, verify the timeout exposes retry. Confirm full refresh, pagination and household switching still behave normally.
- **Blocker:** Prior T04 data/log evidence gaps remain: two legacy duplicate groups lack an existing authorized synthetic session, and buffered server logs were not request-correlated. This web follow-up performs no DB/API data operations; do not delete any existing synthetic fixtures.
- **Verification evidence:** `PATH=/Users/norbertszasz/.nvm/versions/node/v24.22.1/bin:$PATH pnpm --filter web typecheck`, corresponding `pnpm --filter web lint`, and `git diff --check` passed. No browser navigation, API request, DB access, fixture creation, app stop, or automated suite was run. Earlier T04 HTTP/data evidence and open legacy/log gates remain documented in the task file.

## Parked task

The full previous T07 work record remains in `work/archive/EPIC-04-T07-household-document-library-preview.md` with status `pending completion`. The code is ready, but synthetic OWNER/MEMBER/VIEWER mobile QA at 320/390 px and the manual HTTP check for invalid cursor/pageSize remain open. Archiving does not mean completion.
