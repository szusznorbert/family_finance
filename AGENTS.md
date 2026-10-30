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
10. Before coding on every implementation task, run a read-only planning pass with the `planning-and-task-breakdown` skill and the `product_owner` agent. Record the planning date, task-specific scope, likely files, dependencies, acceptance/verification steps, and open decisions in the task file before the first code edit. If the plan record is missing, do the planning pass first; do not skip it for small tasks. Planning does not require switching the app's Plan mode or an extra user approval unless a product decision is unresolved.
11. Write project task files in English using the `product-owner/README.md` template, including `Implementation checklist`, `Acceptance criteria`, and `Verification checklist` in that order. The implementing `developer` or `designer` owns the `Implementation checklist` and updates it, `Current status and evidence`, and `work/current-task.md` at the end of each coding/verification slice and before phase handoff. Mark an acceptance criterion `[x]` only when the complete criterion is factually verified; leave partial or unverified work `[ ]` and record its blocker. The `tester` may mark only `Verification checklist` items for checks they actually ran, never implementation acceptance based on code review alone. The `product_owner` owns task breakdown and dependencies and updates status summaries from implementer evidence, not by independently declaring implementation complete.
12. Keep one active resume record in `work/current-task.md` using `work/README.md`. The agent doing the active phase updates its status, last completed step, next step, blocker, and observed verification at every status change and before handoff; the tester records only checks actually run. Before the coordinator or `product_owner` advances to the next task, compare the task checklist, status summary, and work record. If they disagree, do not advance: record the open gate and reconcile the evidence first. The coordinator selects the next active task. Archive a `completed` record before replacing it with the next task. The product-owner task file remains the acceptance and planning source of truth.
