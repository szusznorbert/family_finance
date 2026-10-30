# Household Finance — shared agent rules

These instructions apply to every agent working in this repository. Read the nearest `AGENTS.md` files as well; application-level instructions add framework-specific rules.

## Project facts and sources of truth

- The product is a self-hosted household finance application for a Romanian household; RON is the default currency.
- The stack is a pnpm monorepo with separate Next.js web and API apps, PostgreSQL, Prisma, and Better Auth.
- `docs/architecture.md` describes the current implemented architecture. Keep implemented facts separate from plans and update the document when architecture, data flow, tools, or run commands change.
- `product-owner/README.md` and the epic files under `product-owner/epics/` are the product-planning source of truth.
- Implementation work uses task IDs in the form `EPIC-XX-TYY`; an epic breakdown may use `plan/EPIC-XX-<epic-slug>` before its task files exist. Follow `docs/branching-strategy.md` for branch, commit, and PR rules.
- Follow the closest `AGENTS.md` file. In particular, read the generated Next.js instructions under `apps/web/` or `apps/api/` and consult the installed Next.js documentation before changing Next.js code.
- Relevant project skills are in `.agents/skills/`; load the skill that matches the assigned role and work. Skills supplement this file and do not override repository rules or user instructions.

## Shared rules

1. Stay within the role and task explicitly assigned. Do not silently take over another agent’s responsibility.
2. Preserve user approval boundaries. Do not deploy, contact third parties, create external resources, commit, push, or run destructive database operations unless the user explicitly requested that action or explicitly assigned the work to the corresponding project agent.
3. Never read, print, commit, or transmit secret values from `.env`. Use `.env.example` for variable names and safe placeholders.
4. Never use real household financial data in tests, examples, screenshots, or logs. Prefer synthetic data and local development databases.
5. Keep the browser isolated from PostgreSQL. Database access and authorization belong in the API.
6. Make the smallest change that satisfies the accepted task. Call out assumptions and unresolved product or architecture decisions instead of presenting them as settled facts.
7. When an accepted change alters the architecture, stack, data flow, or tool versions, update `docs/architecture.md` and review the affected `.codex/agents/*.toml` instructions and `.agents/skills/` mappings. Update those instructions when their responsibilities or assumptions changed; update skill content or `skills-lock.json` only after reviewing and explicitly accepting a skill update. Record any new architecture decision in `docs/decisions/` when appropriate.
8. Report concrete file references, commands, and observed verification results. Do not claim checks that were not run.
9. Respond in the user’s language; use Hungarian by default for user-facing summaries unless the user asks otherwise.
10. The product_owner plans an epic **once**, writing its `tasks/plan.md` and `EPIC-XX-TYY` task records. Task execution reads these existing records and does not repeat Product Owner planning; replan only if the epic's scope or dependencies materially change.

## Rapid deterministic workflow policy

- The **product_owner** splits each epic into tasks once. Keep the existing `product-owner/epics/<epic>/tasks/plan.md`, task dependencies and acceptance criteria.
- `epic-planning`: run Product Owner and the planning Skill once; `task-execution`: Main Agent implements an existing task then performs a small verification; `epic-stabilization`: full checks at epic completion.
- The local Python engine validates step ordering. YAML definitions are custom data, not native Codex workflow automation. Hooks are best-effort and must be tested in the IDE.
- Default mode `auto`. `plan-only` pauses for a real user approval. Never treat agent-generated approvals as user approvals.
- Routine task execution uses the **Main Agent**. Invite architect, designer, developer, tester or reviewer only when their specialist knowledge is actually needed. Git Workflow is reserved for explicitly authorized epic delivery.
- For code tasks, run a small relevant check, default `pnpm typecheck`. For documentation/cosmetic tasks, a manual report is sufficient if explicitly marked as untested. Authentication, isolation, financial logic, data integrity, migrations or security changes require targeted validation before completion.
- Use `engine.py iterate --task EPIC-XX-TYY --reason '...'` for in-task refinements without replanning. An iteration invalidates earlier implementation and verification completion. New material scope needs an epic/task decision.
- Natural-language requests such as “Implementáld az EPIC-03-T04-et” are sufficient. The three-line `Workflow`/`Mode`/`Task` header is optional for explicit overrides, not required from the user.
- The Activity dashboard reports engine state, not an AI guess. Token attribution must be verifiable; unknown values remain Unattributed. Do not log prompts, secrets, source code or financial data.
- Preserve existing Git delivery, security and external-action approval restrictions.

## Mandatory Main Agent execution protocol

This section applies to the **main Codex thread**, not the optional specialist subagents. The user never needs to run Python commands manually.

1. **Classify** the user request by explicit task/epic ID and intent. Existing task implementation/fix -> `task-execution`; new epic breakdown -> `epic-planning`; epic release checks -> `epic-stabilization`. Routine in-task copy, color, layout or behavior refinement stays in the same task. Do not automatically start work for mere status questions or references to a task ID.
2. **Synchronize state first** using `python3 scripts/workflow/engine.py status`. If a matching run exists, continue its recorded step instead of starting a duplicate. If there is no active run, start the appropriate workflow with `python3 scripts/workflow/engine.py start --workflow task-execution --mode auto --task EPIC-XX-TYY` (or the selected epic workflow). The trusted `UserPromptSubmit` Hook may have already started it. A completed task refined later uses `python3 scripts/workflow/engine.py iterate --task EPIC-XX-TYY --reason "Short safe summary"` instead of a new epic plan. Never claim the Hook ran if it did not.
3. **Before editing**, confirm the existing epic `tasks/plan.md`, the specific task file and dependencies; do not rerun Product Owner planning. If a dependency or material product decision is unresolved, report it instead of inventing completion.
4. **Advance deterministically**: call `python3 scripts/workflow/engine.py begin --step implementation` before any task code edits, complete the actual implementation, then call `python3 scripts/workflow/engine.py complete --step implementation --summary "Short factual implementation summary"`. For an epic planning run, use `begin --step planning` and `complete --step planning --evidence <epic-tasks/plan.md>`. Do not bypass `begin`/`complete` or directly edit `.workflow/active.json` or run state files.
5. **Quick verification**: call `begin --step verification` and then `complete --step verification`. A normal task runs the default `pnpm typecheck`; only for explicitly cosmetic/docs work selected with `--check none`, use `complete --step verification --verdict pass --summary "What was manually inspected; automated checks not run"`. Security/financial/household-isolation/migration logic needs appropriate targeted checks and review, regardless of the quick profile. Do not mark a failed check as passed.
6. **Failure or interruption**: preserve the actual engine state and give a concise blocker. Repair/retry the failed step, or `iterate` to reopen implementation and verification; never repeat Epic Planning for routine fixes. In `plan-only` wait for a real user's `Approve plan: run-<id>` before implementation.
7. **Finish**: report the task ID, actual engine status, changes, checks that really ran, and remaining blockers. No automatic commit, push, deployment, external writes or destructive operations. Follow the existing epic delivery authorization rules.

The Hooks provide a convenience trigger and a one-time continuation nudge. **The main thread must follow this protocol even when Hooks are unavailable or untrusted.** The engine validates step transitions; Hook tool interception is not a complete security boundary.
11. Write project task files in English using the `product-owner/README.md` template, including `Implementation checklist`, `Acceptance criteria`, and `Verification checklist` in that order. The implementing `developer` or `designer` owns the `Implementation checklist` and updates it, `Current status and evidence`, and `work/current-task.md` at the end of each coding/verification slice and before phase handoff. Mark an acceptance criterion `[x]` only when the complete criterion is factually verified; leave partial or unverified work `[ ]` and record its blocker. The `tester` may mark only `Verification checklist` items for checks they actually ran, never implementation acceptance based on code review alone. The `product_owner` owns task breakdown and dependencies and updates status summaries from implementer evidence, not by independently declaring implementation complete.
12. Keep one active resume record in `work/current-task.md` using `work/README.md`. The agent doing the active phase updates its status, last completed step, next step, blocker, and observed verification at every status change and before handoff; the tester records only checks actually run. Before the coordinator or `product_owner` advances to the next task, compare the task checklist, status summary, and work record. If they disagree, do not advance: record the open gate and reconcile the evidence first. The coordinator selects the next active task. Archive a `completed` record before replacing it with the next task. The product-owner task file remains the acceptance and planning source of truth.
