# EPIC-09-T01: Refresh architecture, agent, and skill baseline

## Goal and user value

Align the current architecture documentation, project-scoped agent instructions, repository skills and their lock metadata, and task-linked branching rules. Capture the current local agent and skill setup in the repository so it can be reviewed and shared with future checkouts. This is internal project maintenance and does not change product behavior.

## Scope

Maintain the repository's architecture records, project agent roles and workflow references, repository-local skills and lock metadata, and task-linked Git branching/delivery guidance. Review only project-authored content; preserve third-party skill source formatting and verify its locked file set rather than rewriting upstream content.

## Implementation checklist

- [x] `docs/architecture.md` records the current Next.js web/API, PostgreSQL/Prisma, Better Auth, recurring-worker and private-document architecture, plus current agent/skill and run-command guidance.
- [x] `AGENTS.md`, `.codex/config.toml` and the seven `.codex/agents/*.toml` files define shared rules, agent role boundaries, applicable skill references and the configured concurrency limit.
- [x] `.agents/skills/README.md` inventories repository skills and their sources; `skills-lock.json` locks the seven externally sourced skills, while the project-authored `product-research` skill is documented separately.
- [x] `docs/branching-strategy.md` records task-linked planning and one-branch/one-PR-at-epic-completion rules, consistent with the shared and Git workflow agent instructions.
- [x] Update the stale “EPIC-03-T04 monthly dashboard” entry in `docs/architecture.md`'s missing-features list; the dashboard API and home-page UI are present in `apps/api/src/app/api/v1/households/[householdId]/dashboard/route.ts` and `apps/web/src/app/page.tsx`.

## Acceptance criteria

- [ ] `docs/architecture.md` describes the implemented stack and current project agent/skill setup.
- [ ] Each project agent has a clear role boundary and relevant skill or workflow references.
- [ ] Repository-local skills are listed with their sources, and `skills-lock.json` matches the installed set.
- [ ] Architecture/tooling changes require review of affected architecture docs, agent rules, and skill mappings; skill updates are reviewed before acceptance.
- [ ] The task-linked branch/commit/PR conventions are documented and consistent with the agent rules.
- [ ] The related repository changes are committed and pushed to the configured GitHub repository on this task's branch.

## Dependencies

None.

## Likely files

- `AGENTS.md`
- `.codex/agents/`
- `.codex/config.toml`
- `.agents/skills/`
- `skills-lock.json`
- `docs/`
- `product-owner/`

## Verification checklist

- [ ] Parse `.codex/config.toml` and all `.codex/agents/*.toml` files.
- [ ] Confirm each skill in `skills-lock.json` has a corresponding `.agents/skills/<name>/SKILL.md` directory and no extra installed skill is untracked in the lock.
- [ ] Run `git diff --check` on project-authored files and review the staged diff for secrets, generated files, or unrelated changes. Preserve third-party skill source formatting and verify its locked file set instead of rewriting upstream content.
- [ ] Confirm the task ID appears in the branch name, commit subject, and pull request title if a PR is created.

## Estimated scope

Medium.
