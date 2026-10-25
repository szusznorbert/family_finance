# Project agents

Codex loads project-scoped custom agents from this directory. Each agent has one TOML file with its role and instructions; the repository-wide rules are in the root `AGENTS.md`.

| Agent | Use for |
|---|---|
| `architect` | Architecture options, decisions, ADRs, and cross-cutting technical risks |
| `tester` | Focused test planning, execution, and evidence-based test reports |
| `developer` | Implementing an approved, scoped task |
| `product_owner` | Breaking an epic into ordered, testable task files |

In Codex, name the agent explicitly in the request, for example: “Use `product_owner` to break down EPIC-02 into tasks” or “Ask `architect` to review the proposed storage design.” Agent instructions define role boundaries; the project’s shared rules in the root `AGENTS.md` apply to all of them.
