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

## Task-file standard

Task prose must be written in English. Keep approved Hungarian UI copy as quoted or code-formatted literals and preserve exact API names, identifiers, commands, dates, evidence, and historical records. Every task must record an explicit **MVP phase** decision: `MVP now` or `post-MVP`. Before planning or implementation starts for each future task, ask the user which phase applies; do not infer it from epic order or dependencies. If the decision is unresolved, keep the task in planning and do not begin implementation. A post-MVP task remains deferred until the user explicitly resumes or rephases it. Preserve an already explicit user-approved phase without asking again.

Every task must use these checklist sections in this order: **Implementation checklist**, **Acceptance criteria**, and **Verification checklist**. Keep the surrounding planning sections in this order where applicable: **MVP phase**, **Goal and user value**, **Scope**, **Dependencies**, **Current status and evidence**, and **Non-goals and open decisions**. Implementation checklist items are task-specific, actionable slices; only the responsible Developer or Designer records completion against evidence. If the implementation checklist has not yet been reconciled, include `Developer reconciliation pending` without adding checkboxes; the Developer will add only evidence-backed items and update their states. Acceptance criteria describe observable outcomes, and verification items record checks actually performed; only their responsible roles update those checkbox states. Dated planning, decision, implementation, and verification records may follow the standard sections and must be labeled historical when superseded. Editorial normalization must not change existing checkbox states or implementation/QA claims. Preserve exact commands, dates, evidence, and historical context.

The [EPIC-01 task plan](epics/EPIC-01-platform-foundation/tasks/plan.md) records the current platform-foundation breakdown and verification checkpoint.

The [EPIC-02 task plan](epics/EPIC-02-authentication-households/tasks/plan.md) records the authentication and household breakdown, task order, and decisions required before implementation.

The [EPIC-03 task plan](epics/EPIC-03-ledger-dashboard/tasks/plan.md) defines the RON-only canonical ledger foundation needed before receipt approval.

The [EPIC-03-T09 fixed monthly cost task](epics/EPIC-03-ledger-dashboard/tasks/EPIC-03-T09-fixed-monthly-costs.md) records the optional once-configured recurring cost and its dependency on the canonical ledger. The current MVP direction retains the five onboarding/Settings fields (name, RON amount, category, monthly day, start month) provisionally; no further user clarification is pending for that field set.

The [EPIC-04 task plan](epics/EPIC-04-private-documents/tasks/plan.md) breaks private document storage, upload, authorized access, duplicate detection, and backup/restore into ordered tasks.
The [EPIC-04-T06 mobile upload task](epics/EPIC-04-private-documents/tasks/EPIC-04-T06-mobile-document-upload-ui.md) adds a visible private photo/PDF upload path after authorized read is manually verified; it does not include receipt extraction or ledger posting.
The [EPIC-04-T07 document list and preview task](epics/EPIC-04-private-documents/tasks/EPIC-04-T07-household-document-library-preview.md) queues a household-scoped, paginated private library after T06, with separate API and mobile UI slices.

The [EPIC-03 responsive UI research brief](../docs/research/mobile-responsive-cupertino-ui.md) and task plan record the user's mobile-first product direction, 390 px screen flows, draft design tokens, and implementation planning records for T05–T08.

The [EPIC-05 task plan](epics/EPIC-05-receipts/tasks/plan.md) requires item review, product matching and a visible price trend in the first receipt feature release.

Use task IDs in the form `EPIC-XX-TYY`, where `XX` is the two-digit epic number and `YY` is the two-digit task sequence within that epic (for example, `EPIC-02-T01`). Keep the task ID in its filename, branch name, commit message, and pull request title according to [the branching strategy](../docs/branching-strategy.md).

An epic breakdown can be proposed on a `plan/EPIC-XX-<epic-slug>` branch using the existing epic ID before its task files are created.
