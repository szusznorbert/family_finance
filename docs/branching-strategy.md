# Branching, commit and pull request strategy

Use one task branch per product-owner task. The task ID is the link between the epic, task file, branch, commits, and pull request. Epic planning can use a `plan/` branch before task files exist.

## Task IDs

Use `EPIC-XX-TYY`, where:

- `XX` is the two-digit epic number, such as `02` for authentication and households;
- `YY` is the task sequence within that epic, such as `01`.

The corresponding task file lives under `product-owner/epics/<epic-folder>/tasks/` and includes the same ID, for example `EPIC-02-T01-household-membership.md`.

Do not create a task branch or task commit without an existing task ID and task file. Ask the product owner agent to create the task first. For an epic breakdown, use the epic's existing `EPIC-XX` ID and epic file on a `plan/` branch.

## Branches

Task branch format:

```text
<branch-type>/<TASK-ID>-<short-kebab-case-slug>
```

Use `feature/` for new product capabilities and `fix/` for bug fixes. For work that does not fit either category, use `refactor/`, `test/`, `docs/`, or `chore/` as appropriate.

Examples:

```text
feature/EPIC-02-T01-household-membership
fix/EPIC-02-T02-auth-redirect
```

- The task ID must appear immediately after the branch-type prefix so branches can be searched and grouped by task.
- Use lowercase kebab-case for the short description. Keep it concise and aligned with the task file.
- Start from the latest `origin/main` when it is available; otherwise state which local base was used.
- Keep one task per branch. If work spans independent tasks, split it into separate tasks and branches unless the user explicitly asks to combine them.
- Never do product work directly on `main`.

Epic planning branch format:

```text
plan/EPIC-XX-<epic-slug>
```

Example: `plan/EPIC-01-platform-foundation`. The `EPIC-XX` ID must match an existing epic file. Use this branch to create or revise the epic plan and task files and any directly related planning rules. Keep application implementation on its later task branch.

## Commits

Use Conventional Commit headers with the task ID:

```text
<type>(<scope>): [<TASK-ID>] <imperative summary>
```

Examples:

```text
feat(auth): [EPIC-02-T01] add household membership
test(auth): [EPIC-02-T01] cover invitation permissions
docs(auth): [EPIC-02-T01] document membership decisions
```

Every commit on a task branch must include that task ID. Keep commits focused; do not mix unrelated tasks.

On a `plan/` branch, use the epic ID instead of a task ID, for example:

```text
docs(plan): [EPIC-01] define platform foundation tasks
```

## Pull requests

- Use the same task-linked Conventional Commit header as the PR title. For an epic planning PR, use an epic-linked planning commit header as the title.
- Target `main` unless the user or repository settings specify another base.
- For a task PR, include the task file path and summarize acceptance criteria, implementation, and verification. For a planning PR, link the epic and new task files and summarize the proposed order, dependencies, and open questions.
- Do not invent or create a GitHub issue number. The local epic-task ID is the project’s task reference.

## Git safety

- Review `git status`, the staged diff, and `.gitignore` coverage before committing.
- Never include `.env`, credentials, local database files, generated Prisma output, build output, or unrelated user changes.
- Do not amend or rewrite published commits, force push, reset user changes, or delete branches without explicit user instruction.
- Branch creation and commits require the user to ask for Git delivery or to assign that work to `git_workflow`. Pushes and PR creation require a request to publish that task.
