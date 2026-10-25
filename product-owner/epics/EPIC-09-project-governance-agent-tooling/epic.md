# EPIC-09: Project governance and agent tooling

## Goal

Keep the repository's architecture documentation, project-scoped agents, reusable skills, and engineering workflow rules aligned with the implemented system.

## Scope

- Maintain architecture and decision records as the implemented system changes.
- Maintain Codex project agent roles, boundaries, and skill mappings.
- Review and update repository-local skills with their source and lock metadata.
- Maintain task-linked Git branching and delivery guidance.

## Acceptance criteria

- Accepted architecture or tooling changes trigger review of affected documentation, agent instructions, and skill mappings.
- Project agents and skills are documented, version/source-tracked where applicable, and committed with the repository.
- Skill updates are reviewed and explicitly accepted; they are not silently upgraded as a side effect of architecture changes.
- Engineering workflow rules stay consistent with the repository's current task ID and branching strategy.

This is an internal engineering-maintenance epic. It does not define user-facing product functionality.
