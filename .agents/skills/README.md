# Project agent skills

These repository-local skills provide role-specific guidance to the project agents in [`.codex/agents/`](../../.codex/agents/). Skill source revisions are recorded in [`skills-lock.json`](../../skills-lock.json); update the lockfile when updating a skill.

| Skill | Source | Primary agent | Use |
|---|---|---|---|
| `frontend-design` | [anthropics/skills](https://www.skills.sh/anthropics/skills/frontend-design) | `designer` | Build polished, distinctive, responsive UI in the existing frontend stack. |
| `vercel-react-best-practices` | [vercel-labs/agent-skills](https://www.skills.sh/vercel-labs/agent-skills/vercel-react-best-practices) | `developer`, `designer` | React and Next.js implementation and performance practices. |
| `api-and-interface-design` | [addyosmani/agent-skills](https://www.skills.sh/addyosmani/agent-skills/api-and-interface-design) | `architect` | API contracts and service boundaries. |
| `planning-and-task-breakdown` | [addyosmani/agent-skills](https://www.skills.sh/addyosmani/agent-skills/planning-and-task-breakdown) | `product_owner` | Convert epics into ordered, verifiable tasks. |
| `playwright-best-practices` | [currents-dev/playwright-best-practices-skill](https://www.skills.sh/currents-dev/playwright-best-practices-skill/playwright-best-practices) | `tester` | Reliable browser and end-to-end testing practices. |
| `prisma-orm-setup` | [prisma/skills](https://www.skills.sh/prisma/skills/prisma-orm-setup) | `developer` | Prisma schema, client, and database workflow guidance. |
| `better-auth-best-practices` | [better-auth/skills](https://www.skills.sh/better-auth/skills/better-auth-best-practices) | `developer` | Better Auth implementation guidance. |

## Usage and update notes

- Skills are installed locally under `.agents/skills/`, so Codex can load them with this repository. See the [Codex skills documentation](https://learn.chatgpt.com/docs/build-skills).
- Keep implementation aligned with the versions in the project lockfiles. In particular, the Better Auth skill received a **Medium Risk** scanner rating despite reporting zero alerts; its generic `@latest` CLI examples must not be run as-is. The developer agent requires preserving the project's pinned Better Auth and Prisma versions and prohibits unrequested upgrades or automatic migrations.
- This application uses Next.js route handlers. An Express-specific skill was not added because its middleware and routing assumptions do not match this repository.
- To update a skill, review its source and changes, reinstall it into `.agents/skills/`, and review the resulting skill diff and `skills-lock.json` before accepting the update.
