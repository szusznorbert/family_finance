# Household Finance — shared agent rules

These instructions apply to every agent working in this repository. Read the nearest `AGENTS.md` files as well; application-level instructions add framework-specific rules.

## Project facts and sources of truth

- The product is a self-hosted household finance application for a Romanian household; RON is the default currency.
- The stack is a pnpm monorepo with separate Next.js web and API apps, PostgreSQL, Prisma, and Better Auth.
- `docs/architecture.md` describes the current implemented architecture. Keep implemented facts separate from plans and update the document when architecture, data flow, tools, or run commands change.
- `product-owner/README.md` and the epic files under `product-owner/epics/` are the product-planning source of truth.
- Product work uses task IDs in the form `EPIC-XX-TYY`; follow `docs/branching-strategy.md` for branches, commits, and PRs tied to those IDs.
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
