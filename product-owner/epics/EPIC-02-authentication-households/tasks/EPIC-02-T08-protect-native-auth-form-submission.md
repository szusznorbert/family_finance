# EPIC-02-T08: Protect credential forms from native GET submission

## Goal and user value

Credentials entered into login or registration must never become part of a URL when the browser submits a form before hydration or with JavaScript disabled.

## Scope

Fix the native HTML submission behavior of the existing login and registration form in `apps/web/src/app/auth-form.tsx` only, while preserving the Better Auth client submission after hydration. If another application file proves necessary, revise this task before implementation. Authentication redesign and backend changes are out of scope.

## Pre-implementation planning record — 2026-10-26

- **Evidence and likely file:** `apps/web/src/app/auth-form.tsx` currently renders `<form onSubmit={submit}>` without an HTML `method` or `action`. Before client hydration, the browser's native default is GET, so named `email`, `password` and registration-only `confirmPassword` inputs can enter the request query.
- **Order and dependency:** T01 provides the form. Implement T08 before wider login/registration testing or any external exposure. T08 can proceed independently of T03's household policy work; its new ID records when the finding was made, not a later priority.
- **Security risks:** A query can reach browser history, copied URLs, referrer paths and access logs. A fix must make pre-hydration/no-JS submission safe without accidentally sending credentials to an unrelated route or storing/logging them. Normal hydrated Better Auth client handling must continue to work.
- **Open decisions:** None; the required behavior is defined by the acceptance criteria. Choose the smallest safe HTML/client behavior during implementation.

## Acceptance criteria

- [ ] Native submission before hydration or with JavaScript disabled never places `email`, `password` or `confirmPassword` values in the URL, browser history or request URI/access logs for both login and registration.
- [ ] If JavaScript is unavailable, the form fails safely with no credential-bearing GET request. After hydration, valid and invalid login/registration continue through the existing Better Auth client flow and retain their current user-facing feedback.
- [ ] No credential value is included in application logs, redirects or error URLs as a consequence of this fix.

## Verification

- [x] In the existing local app, use only synthetic credentials. Verify server-rendered login and registration HTML both use a same-page `method="post"`, include a `<noscript>` explanation and render the submit button disabled before hydration. This rules out a native credential-bearing GET/query request by construction.
- [x] With JavaScript enabled, manually verify successful and failed login/registration through Better Auth using synthetic accounts. Login success reached the authenticated household page; invalid password showed the existing sign-in error. Registration success created a synthetic account; mismatched passwords and a duplicate email showed validation/error feedback. After the final hydration-gating change, also confirmed the login button becomes enabled after hydration and repeated successful/failed login.
- [ ] Directly submit with JavaScript disabled and inspect browser URL/history, Network request URI and local access logs. The browser policy blocked opening `chrome://settings` to disable JavaScript, and no supported in-page setting was available; no workaround was attempted. Thus this network/history observation remains unverified. No credential was entered or submitted in a no-JavaScript flow.
- [x] Quality checks passed in `apps/web`: `PATH="/Users/norbertszasz/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" ./node_modules/.bin/tsc --noEmit`, the same PATH prefix with `./node_modules/.bin/eslint`, and `./node_modules/.bin/next build --webpack`.
- [x] No automated tests were added or run, per the current project preference. `git diff --check` is recorded at handoff.

## Dependencies and non-goals

Depends on EPIC-02-T01. Household roles, sessions beyond this form, password reset and backend credential policy are outside this task.
