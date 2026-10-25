# EPIC-09-T01: Refresh architecture, agent, and skill baseline

**Description:** Align the current architecture documentation, project-scoped agent instructions, repository skills and their lock metadata, and task-linked branching rules. Capture the current local agent and skill setup in the repository so it can be reviewed and shared with future checkouts. This is internal project maintenance and does not change product behavior.

**Acceptance criteria:**
- [ ] `docs/architecture.md` describes the implemented stack and current project agent/skill setup.
- [ ] Each project agent has a clear role boundary and relevant skill or workflow references.
- [ ] Repository-local skills are listed with their sources, and `skills-lock.json` matches the installed set.
- [ ] Architecture/tooling changes require review of affected architecture docs, agent rules, and skill mappings; skill updates are reviewed before acceptance.
- [ ] The task-linked branch/commit/PR conventions are documented and consistent with the agent rules.
- [ ] The related repository changes are committed and pushed to the configured GitHub repository on this task's branch.

**Verification:**
- [ ] Parse `.codex/config.toml` and all `.codex/agents/*.toml` files.
- [ ] Confirm each skill in `skills-lock.json` has a corresponding `.agents/skills/<name>/SKILL.md` directory and no extra installed skill is untracked in the lock.
- [ ] Run `git diff --check` on project-authored files and review the staged diff for secrets, generated files, or unrelated changes. Preserve third-party skill source formatting and verify its locked file set instead of rewriting upstream content.
- [ ] Confirm the task ID appears in the branch name, commit subject, and pull request title if a PR is created.

**Dependencies:** None.

**Files likely touched:**
- `AGENTS.md`
- `.codex/agents/`
- `.codex/config.toml`
- `.agents/skills/`
- `skills-lock.json`
- `docs/`
- `product-owner/`

**Estimated scope:** Medium.
