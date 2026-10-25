# Product Owner

This folder holds product planning artifacts for Household Finance.

## Epics

| Epic | Purpose |
|---|---|
| [EPIC-01 Platform foundation](epics/EPIC-01-platform-foundation/epic.md) | Monorepo, developer tooling, and local infrastructure |
| [EPIC-02 Authentication and households](epics/EPIC-02-authentication-households/epic.md) | Accounts, household membership, roles, and invitations |
| [EPIC-03 Ledger and dashboard](epics/EPIC-03-ledger-dashboard/epic.md) | Canonical financial ledger and household overview |
| [EPIC-04 Private documents](epics/EPIC-04-private-documents/epic.md) | Secure document upload, storage, and retrieval |
| [EPIC-05 Receipts](epics/EPIC-05-receipts/epic.md) | Receipt extraction, review, and ledger posting |
| [EPIC-06 Bills and reminders](epics/EPIC-06-bills-reminders/epic.md) | Bill tracking, payment state, and due reminders |
| [EPIC-07 Vehicles](epics/EPIC-07-vehicles/epic.md) | Vehicle records, costs, documents, and maintenance reminders |
| [EPIC-08 Release readiness](epics/EPIC-08-release-readiness/epic.md) | API documentation, security, deployment, and recovery |
| [EPIC-09 Project governance and agent tooling](epics/EPIC-09-project-governance-agent-tooling/epic.md) | Architecture records, project agents, skills, and engineering workflow maintenance |

Epics capture outcomes and acceptance criteria. Break the remaining epics into implementation tasks before starting their feature work.

The [EPIC-01 task plan](epics/EPIC-01-platform-foundation/tasks/plan.md) records the current platform-foundation breakdown and verification checkpoint.

Use task IDs in the form `EPIC-XX-TYY`, where `XX` is the two-digit epic number and `YY` is the two-digit task sequence within that epic (for example, `EPIC-02-T01`). Keep the task ID in its filename, branch name, commit message, and pull request title according to [the branching strategy](../docs/branching-strategy.md).

An epic breakdown can be proposed on a `plan/EPIC-XX-<epic-slug>` branch using the existing epic ID before its task files are created.
