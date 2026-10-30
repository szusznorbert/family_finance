# Branching, commit and pull request strategy

Work locally through an epic and its `EPIC-XX-TYY` tasks. Create one branch, commits, push and pull request only when the epic is complete and its manual checks are recorded. There are no task-level branches or task-level PRs.

## Task IDs and planning

Keep task IDs and files under `product-owner/epics/<epic-folder>/tasks/`; they link requirements, implementation notes and verification within the epic. Run `planning-and-task-breakdown` once per epic when Product Owner prepares the epic task files and `tasks/plan.md`. Each task execution reads that existing plan, task dependencies and acceptance criteria; it does not repeat planning unless the epic's scope or required decisions change. Minor UI iterations remain part of the current task.

## Epic branch and local work

At epic completion, the `git_workflow` agent prepares one branch from the appropriate current base, preserving all local epic work:

```text
feature/EPIC-XX-<epic-slug>
fix/EPIC-XX-<epic-slug>
```

Use `feature/` for a new epic capability and `fix/` for an epic-wide correction. The slug is short lowercase kebab-case and matches the epic. Do not create `feature/EPIC-XX-TYY-*`, `fix/EPIC-XX-TYY-*` or a separate `plan/` branch for individual tasks. Keep task planning, implementation and manual verification in the local epic workspace until the end-of-epic Git delivery. Do not switch or reset a dirty checkout without preserving its work.

## Commits and pull request

At epic completion, after reviewing the combined diff and recorded checks, create focused Conventional Commits. Include the task ID for a task-specific commit, or the epic ID for a combined change:

```text
feat(auth): [EPIC-02-T07] manage household members
docs(auth): [EPIC-02] record completed epic decisions
```

Push the single epic branch and open one PR targeting `main` unless the user specifies another base. The PR links the epic and completed task files, summarizes the accepted scope and manual verification, and lists any checks that remain open. Do not invent GitHub issue numbers.

## Git safety

- Git delivery still requires the user's request or explicit assignment to `git_workflow`; do not commit, push or open a PR during an unfinished epic.
- Before committing, review `git status`, the staged diff and `.gitignore` coverage. Keep `.env`, credentials, local database files, generated Prisma output, build output and unrelated changes out of the commit.
- Do not amend or rewrite published commits, force push, reset user changes or delete branches without explicit user instruction.
