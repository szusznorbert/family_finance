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
10. Before coding on every implementation task, run a read-only planning pass with the `planning-and-task-breakdown` skill and the `product_owner` agent. Record the planning date, task-specific scope, likely files, dependencies, acceptance/verification steps, and open decisions in the task file before the first code edit. If the plan record is missing, do the planning pass first; do not skip it for small tasks. Planning approval follows the selected Codex workflow execution mode; see the workflow policy below.

## Codex workflow policy (EPIC-09)
- Keep all seven existing specialist agents, their role boundaries, and the project skills. A Skill is reusable knowledge, not a workflow state machine.
- For feature work, bug fixes, and refactoring, select the matching definition under `.codex/workflows/`. These YAML files are **project-owned data**, interpreted by `scripts/workflow/engine.py`; Codex does not run YAML workflows natively.
- Start every tracked implementation request with `Workflow: new-feature|bug-fix|refactoring`, `Mode: auto|plan-only`, and `Task: EPIC-XX-TYY` on three separate lines. Default to plan-only if the mode was not stated; ask only when a workflow must begin and no safe default applies.
- The main Codex agent coordinates each workflow, but may not mark steps as complete itself. Use `python3 scripts/workflow/engine.py begin --step NAME` before delegating and `complete --step NAME --evidence PATH` afterward. Respect `depends_on` and fail-closed verification gates. Keep one tracked workflow per checkout.
- Before editing application code, complete the read-only `planning` step with `product_owner` and `planning-and-task-breakdown`; use the existing `product-owner/epics/<epic>/tasks/EPIC-XX-TYY*.md` record, never create an unrelated `tasks/todo.md`.
- `auto`: proceed from validated planning to implementation, tests and review, provided no unresolved product/authorization/security decision remains.
- `plan-only`: stop after planning and report the run ID. The **user** must send `Approve plan: run-<id>` in the IDE chat. No agent may approve its own plan or proceed until the approval is recorded.
- Each verification step must execute the repository's configured quality gates and record exit codes. A failing verification or review requires repair and re-verification, never skipping failed steps or falsifying evidence.
- Follow the existing Git policy: one epic delivery, explicit permission for branch/commit/push/PR, no deployment or database destruction without explicit approval. Auto mode does not waive these.
- The local read-only Activity monitor displays current workflow/step/agent and any observed token statistics. Agent token attribution is **not** exact unless trace/session IDs prove it; record unknown usage as Unattributed. Never store prompts, secrets, code or real family financial data in telemetry.
- Hooks protect only tool paths supported by the installed Codex IDE version. They are a guardrail, not a complete security boundary. If a hook is untrusted/disabled, report the limitation instead of claiming enforcement.
