# EPIC-02-T01: Establish account access and session flow

## Goal and user value

A person can securely enter the web app with an email/password account, keep an authenticated session across navigation/reload, and sign out. This supplies the identity required for all household operations.

## Scope

Connect the existing Better Auth API configuration to open email/password sign-up and web sign-in flows. Handle authenticated, unauthenticated and expired-session states. Keep identity and session validation on the API; the browser does not assert a `userId` as proof of identity.

## Follow-up planning record — 2026-10-26

This record covers the follow-up request to require password confirmation during registration and establish a planning gate for future implementation tasks. It does not claim that this planning pass preceded the original T01 implementation.

- **Scope:** Add a registration-only confirmation field; reject mismatches before making an auth request; never send the confirmation value to Better Auth. Add a repository rule requiring a read-only planning pass before every implementation task and recording its result in the task file.
- **Likely files:** `apps/web/src/app/auth-form.tsx`, `AGENTS.md`, `.codex/agents/developer.toml`, `.codex/agents/product_owner.toml`, and `docs/branching-strategy.md`.
- **Dependencies:** Existing T01 registration form; existing `planning-and-task-breakdown` skill and `product_owner` agent.
- **Acceptance and verification:** The confirmation field appears only during registration; mismatch prevents the API call and shows an accessible Hungarian error; matching passwords preserve the existing registration flow. Future task files include a dated planning record before code changes. Per the user's instruction, do not add or run automated tests for this change.
- **Open decisions:** None.

## Acceptance criteria

- [ ] A new person can register with email/password, then sign in; registering an account alone grants no household access.
- [ ] Registration alone asks for the password twice; a mismatch prevents any auth API call, and the confirmation value is never sent to Better Auth.
- [ ] A valid account can sign in, reload/navigate without losing its valid session, sign out, and no longer reach authenticated household actions with the ended session.
- [ ] Invalid credentials, expired sessions and unauthenticated API calls produce clear, non-sensitive responses; browser redirects and session cookies work through the chosen web/API origin arrangement.

## Verification

- [ ] Exercise sign-in, reload, sign-out and expired/invalid session through both the browser and API with synthetic accounts.
- [ ] Manually check that mismatched passwords show an accessible Hungarian error without an auth request, matching passwords register successfully, and login has no confirmation field. Do not add or run automated tests for this follow-up.
- [ ] Confirm that a forged request `userId` does not affect the server-recognized identity; run focused auth checks and root lint/typecheck/build.

## Dependencies

No EPIC-02 task dependency. Open registration is an approved MVP product decision; T02 creates the first OWNER of each household.

## Non-goals and open questions

Password reset, social login, mobile/Flutter session transport and account deletion are outside this task. The MVP's invitation policy treats a link as a bearer secret, not a claim that the signed-in account controls the invitation's informational e-mail address.
