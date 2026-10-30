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
- Start tracked requests using the lines `Workflow: epic-planning|task-execution|epic-stabilization`, `Mode: auto|plan-only`, `Task: EPIC-XX` (epic) or `Task: EPIC-XX-TYY` (task).
- The Activity dashboard reports engine state, not an AI guess. Token attribution must be verifiable; unknown values remain Unattributed. Do not log prompts, secrets, source code or financial data.
- Preserve existing Git delivery, security and external-action approval restrictions.
