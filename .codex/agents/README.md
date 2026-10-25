# Project agents

Codex loads project-scoped custom agents from this directory. Each agent has one TOML file with its role and instructions; the repository-wide rules are in the root `AGENTS.md`.

| Agent | Use for |
|---|---|
| `architect` | Architecture options, decisions, ADRs, and cross-cutting technical risks |
| `tester` | Focused test planning, execution, and evidence-based test reports |
| `reviewer` | Read-only code reviews with security as the primary focus |
| `developer` | Implementing an approved, scoped task |
| `designer` | Designing and implementing the visual/frontend layer within approved product behavior |
| `product_owner` | Breaking an epic into ordered, testable task files |
| `git_workflow` | Creating task-linked branches, reviewing/staging commits, pushing, and preparing PRs when asked |

In Codex, name the agent explicitly in the request, for example: “Use `product_owner` to break down EPIC-02 into tasks,” “Ask `reviewer` to review the current changes with a security focus,” “Ask `designer` to implement the approved frontend task,” or “Use `git_workflow` to create the task branch and prepare a commit.” Specify explicitly when a task should be pushed or turned into a PR. Agent instructions define role boundaries; the project’s shared rules in the root `AGENTS.md` apply to all of them.
