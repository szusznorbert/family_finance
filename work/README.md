# Resuming active work

`current-task.md` is a short handoff record for one active task. The product-owner task file remains the source of truth for the plan, acceptance criteria, and detailed verification log; do not duplicate them here.

## Statuses

| Status | Meaning | Usual next status |
| --- | --- | --- |
| `pending planning` | The coordinator selected the task, but the required task-level plan is still missing. | `planning` |
| `planning` | The product owner and relevant agent are clarifying the task-level plan, dependencies, or decisions. | `pending implementation` |
| `pending implementation` | The plan is recorded and implementation has not started. | `implementing` |
| `implementing` | The implementing agent is working or fixing a discovered defect. | `pending completion` |
| `pending completion` | Implementation appears ready, but verification or evidence needed for acceptance is still missing. | `completed`, or `implementing` if a defect is found |
| `completed` | Every acceptance criterion is factually verified and the task file can be closed. | archive, then the next task at `pending planning` or `pending implementation` |

If the plan proves incomplete, return the task to `planning`. Finished code or one successful partial check does not justify `completed`.

## Updates and handoffs

The Product Owner owns task selection and the active pointer in `current-task.md`: select the next task only after checking dependencies, explicit MVP phase approval, and open gates; maintain its active status and phase owner; and archive or park the prior full record before replacing the pointer. Keep the current record concise and synchronized with the task file.

At every status change and before handoff, the agent doing the current phase updates observed progress in `current-task.md`, including **Last completed step**, **Next step**, **Blocker**, and **Verification evidence** as applicable. The Developer/Designer owns the task's `Implementation checklist` and implementation evidence; the Tester owns its `Verification checklist` and test evidence. The Product Owner reconciles those records and may summarize their facts, but does not change role-owned checklist states or claim checks that were not performed. Record only observed results; the tester marks only checks actually run.

Before handoff, the implementing agent updates the `Implementation checklist` and `Current status and evidence` sections in the English task file defined by `product-owner/README.md`, then reconciles them with `current-task.md`. Only the role that actually performed a check updates its `Verification checklist` item. Before moving to the next task, the Product Owner checks that the task file and work record agree. If they differ, preserve the discrepancy as an open gate and do not mark the task completed. `pending completion` can have open QA when both records show the pending check and blocker; `completed` requires fully verified acceptance.

When a record reaches `completed`, the coordinator or handing-off agent saves the full record to `work/archive/<task-id>.md` **before** replacing `current-task.md` with the next task. The coordinator may also park an unfinished record there when making another task active: preserve its original status, verification evidence, and blockers, and name the outstanding follow-up. Placement in `archive/` **does not itself mean `completed`**; the archive is a history, not a second active task. Name open external dependencies separately so they are not mistaken for verification of the current task.
