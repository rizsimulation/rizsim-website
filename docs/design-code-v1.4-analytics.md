# Frontend release candidate: Design Code 1.4 / Analytics Dashboard 1.0

Base checked: `997c064f5f6e2e2628d3973b36a3b974a8951d6e` (Design Code 1.3).
Branch: `frontend/design-code-1-4-analytics-1-0`.
Authorization: user explicitly requested implementation, test, reviewed PR merge and production deployment on 25 October 2026.

## Implemented scope

1. Class Resources now carries a non-authorizing original-tab identity through the existing first-party launch handoff. It focuses synchronously from the learner click, targets the original same-origin Classroom over the existing session channel, and preserves the running simulation. A compact inline retry/reopen fallback replaces the large repeated notification. A newly created empty context from a severed named-tab lookup is closed without touching any loaded tab. Reopening Student Classroom is an explicit action only.
2. Complete unrecognized Practice codes show `Session not found`, full-field red styling, a brief shared circled-cross animation, preserved text and restored input focus. Editing clears the error. Existing incomplete/closed/scheduled/expired/Live-only/authorization messages and server permission checks remain distinct.
3. The three integrated simulation dashboards receive the shared analytics extension described in `RIZSIM_ANALYTICS_DASHBOARD_CODE.md`. No academic engine, cloud adapter, schema, RLS, authentication, backend function or learner data is changed.

## Verification status

The initial production baseline check passed: 21/21 assets matched the checked Design Code 1.3 commit. New arithmetic and source-boundary checks pass locally. Browser testing and release verification are required before this candidate can be described as deployed.

Browser focus remains a request controlled by browser security and user settings. A ready-message acknowledgement does not prove a tab became foreground. Test and report the actual focus state or the visible actionable fallback.

## Remaining boundaries

No new cross-session analytics contract. No independent real-account production classroom acceptance or backend security/recovery certification is implied by synthetic browser tests. Exact visual correspondence to the referenced screenshots cannot be certified without those image files.
