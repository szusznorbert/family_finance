# Family Finance rapid deterministic Codex workflows

This is a project-owned workflow state machine. It is not a native Codex workflow engine. The Main Codex Agent is instructed in the root `AGENTS.md` to call the Python engine automatically; the user should not run these commands manually. IDE Hooks are best-effort and must be validated in the installed Codex IDE Extension.

## Daily use in Codex IDE

Say: **Implementáld az EPIC-03-T04 taskot.**

The Main Agent:
1. Reads existing epic planning (`product-owner/epics/<epic>/tasks/plan.md`) and the accepted task file; **does not replan**.
2. Checks workflow engine status; starts `task-execution` only when no run exists.
3. Calls engine `begin --step implementation`, implements the requested task, records a brief implementation summary via `complete --step implementation --summary "..."`.
4. Calls `begin --step verification`, runs the default minimal `pnpm typecheck` via `complete --step verification`, and reports actual results.
5. For cosmetic-only/docs work the agent may explicitly choose `--check none`, with manual verdict and summary. This is never a substitute for security, finance, database, or authorization testing.

For a small refinement say: **Az EPIC-03-T04 gombja legyen kék.** The agent stays in the same task and, if already completed, uses `engine.py iterate --task EPIC-03-T04 --reason "..."` to reopen only implementation and verification.

For new epics say: **Bontsd le az EPIC-XX-et taskokra, csak planning.** This invokes `epic-planning` once. For release checks say: **Stabilizáld az EPIC-XX-et.** This runs the full lint, typecheck, and build gates.

Use `plan-only` only when you specifically want to approve the execution plan before implementation. A user approval must be explicit. Git changes, deployment, destructive actions and external writes remain under existing authorizations.

## Automatic Activity startup with the development environment

The existing `./scripts/dev.sh` starts the Activity dashboard automatically on `http://127.0.0.1:8765` alongside the web and API development servers. It does **not** start a Codex agent or workflow run; it only displays the workflow state recorded by the engine.

Install the Python dependency once: `python3 -m pip install -r scripts/workflow/requirements.txt`.

The Activity server is optional: if PyYAML is missing, or port 8765 is already occupied, `dev.sh` warns and continues starting the application. When `dev.sh` exits, it terminates only the Activity process it started. Set `CODEX_ACTIVITY=0 ./scripts/dev.sh` to disable the automatic Activity server.

## Manual diagnostics (not daily user workflow)

```sh
python3 -m pip install -r scripts/workflow/requirements.txt
python3 -m unittest discover -s scripts/workflow -p 'test_*.py' -v
python3 scripts/workflow/engine.py status
python3 scripts/workflow/status.py
python3 scripts/workflow/activity.py --port 8765
```

The Activity UI is at http://127.0.0.1:8765, reads local `.workflow/` JSON, and refreshes every two seconds. `status.py` derives epic and task statuses from plan/task files and recorded runs; untracked previous work is not silently treated as completed.

## Design and limits

- Main agent normally implements and verifies, with optional specialist subagents only for complexity or risk. Product Owner plans once per epic.
- The state engine validates step order, but currently does not itself launch agents or independently intercept all IDE tools.
- Real model tool/hook event schemas are version-dependent. Project Hooks cannot be assumed to enforce a security boundary without an actual IDE integration test.
- Agent events and token usage are only as complete as their event sources. Unavailable token data is Unknown, not zero. The token importer requires normalized, verified usage deltas.
- The engine allows one active workflow per checkout. It records local state under gitignored `.workflow/`. Never commit personal/financial data or secrets.
- Existing epic-based Git delivery rules still apply.
