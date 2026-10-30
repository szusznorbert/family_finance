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

## Implementation checklist

- [x] Better Auth user, session and account persistence is configured in `apps/api/src/lib/auth.ts` and `apps/api/prisma/schema.prisma`.
- [x] Registration and sign-in UI use `apps/web/src/app/auth-form.tsx`; password confirmation is validated client-side and omitted from the auth request.
- [x] `apps/api/src/app/api/v1/me/route.ts` and auth routes derive identity from the authenticated session; sign-out/session handling uses Better Auth.

## Acceptance criteria

- [x] A new person can register with email/password, then sign in; registering an account alone grants no household access.
- [x] Registration asks for the password twice and refuses a mismatch before making an API request; the confirmation value is never sent to Better Auth.
- [x] A valid account can sign in, reload/navigate without losing its valid session, sign out, and no longer reach the authenticated `/api/v1/me` endpoint or household actions with the ended session. Household actions start in T02 and must enforce the same server-side session check.
- [x] Invalid credentials, expired sessions and unauthenticated API calls produce clear, non-sensitive responses; browser redirects and session cookies work through the chosen web/API origin arrangement.

## Verification checklist

- [x] Exercise sign-in, reload, sign-out and expired/invalid session through both the browser and API with synthetic accounts.
- [x] Manually check that mismatched passwords show an accessible Hungarian error without an auth request, matching passwords register successfully, and login has no confirmation field. Do not add or run automated tests for this follow-up.
- [x] Confirm that a forged request `userId` does not affect the server-recognized identity; run focused manual auth checks and root lint/typecheck/build.

## Dependencies

No EPIC-02 task dependency. Open registration is an approved MVP product decision; T02 creates the first OWNER of each household.

## Non-goals and open questions

Password reset, social login, mobile/Flutter session transport and account deletion are outside this task. The MVP's invitation policy treats a link as a bearer secret, not a claim that the signed-in account controls the invitation's informational e-mail address.

## Current status and evidence — manual verification record, 2026-10-26

- `CI=true pnpm typecheck`, `CI=true pnpm lint` and `CI=true pnpm build` passed with Node.js 24.22.1. The web dependency and lockfile use the existing Better Auth 1.7.12 version.
- On a separate local PostgreSQL 17 container and web/API instances at `localhost:3100`/`:3101`, a synthetic account registered through `/api/auth/sign-up/email` and immediately reached `GET /api/v1/me` with HTTP 200. The same endpoint returned 401 without a session and after sign-out.
- A wrong password returned HTTP 401; a correct password restored the session. `GET /api/v1/me?userId=forged-user-id` returned the account from the session, not the supplied ID.
- In the browser, registration redirected to the home page with the synthetic account shown; the session remained after reload. Sign-out showed the login/register links, a wrong password showed a generic error, and correct login returned to the home page. Expiring the synthetic database sessions made the browser show the signed-out state after reload.
- The normal development environment was then started with `./scripts/dev.sh` at `localhost:3000`/`:3001`; it reported no pending migrations. Read-only smoke requests returned HTTP 200 for `/`, `/bejelentkezes` and `/regisztracio`, and HTTP 401 for unauthenticated `/api/v1/me`. Automated regression tests are deferred until the project is complete, per the user's request. T02 must verify household-route authorization when those routes exist.
- On the running `localhost:3000` application, submitting a synthetic registration with mismatched passwords displayed `A két jelszó nem egyezik.` and kept the user on the registration page. With matching passwords, a separate synthetic account registered and reached the home page signed in. Source inspection confirmed the mismatch branch returns before calling the auth client, and the sign-up payload contains only name, e-mail, and password; the confirmation value is excluded. No automated tests were run.
