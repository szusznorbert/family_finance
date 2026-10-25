# EPIC-01-T03: Complete workspace quality checks

## Goal and value

Give contributors trustworthy root commands for linting, typechecking, and building every code workspace affected by platform changes.

## Scope

Review the current root and package scripts and add only the missing configuration needed for web, API, and shared TypeScript sources to participate in the relevant checks.

## Acceptance criteria

- [ ] Root lint/typecheck/build commands cover the applicable web, API, and shared source files, with skipped packages documented rather than silently treated as checked.
- [ ] The checks pass on the baseline code or produce actionable failures that are resolved within this task's platform scope.
- [ ] `README.md` documents the exact commands and what each command covers.

## Verification

- [ ] Run and record `pnpm lint`, `pnpm typecheck`, and `pnpm build` from the repository root.
- [ ] Report package coverage for each command and any known check that remains outside the baseline.

## Dependencies

EPIC-01-T01 establishes the baseline. This task can proceed independently of EPIC-01-T02.

## Likely files

Root and workspace `package.json` files, lint/TypeScript configuration, and `README.md`.

## Estimated scope

Medium.
