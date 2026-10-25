# Frontend release candidate: Design Code 1.4 / Analytics Dashboard 1.0

Base checked: `997c064f5f6e2e2628d3973b36a3b974a8951d6e` (Design Code 1.3).
Branch: `frontend/design-code-1-4-analytics-1-0`. Pull request: **#61**.
Authorization: user explicitly requested implementation, test, reviewed PR merge and production deployment on 25 October 2026.

## Implemented scope

1. Class Resources carries a non-authorizing original-tab identity through the existing first-party launch handoff. It requests focus synchronously from the learner click, targets the original same-origin Classroom over the existing session channel, and preserves the running simulation. A compact inline retry/reopen fallback replaces the large repeated notification. A newly created empty context from a severed named-tab lookup is closed without touching any loaded tab. Reopening Student Classroom is an explicit action only.
2. Complete unrecognized Practice codes show `Session not found`, full-field red styling, a brief shared circled-cross animation, preserved text and restored input focus. Editing clears the error. Focus and selection survive asynchronous workspace refresh. Existing incomplete/closed/scheduled/expired/Live-only/authorization messages and server permission checks remain distinct.
3. The three integrated simulation dashboards receive the shared analytics extension described in `RIZSIM_ANALYTICS_DASHBOARD_CODE.md`. Source-backed paired means, percentage-point changes, matched item transitions, transfer paths/choices, distributions and within-session group comparisons retain precise denominators. Hotel prices and binary responses remain sealed until the existing release gate passes. Existing individual reports, presenter controls and print/download actions remain available.
4. Real mounted visual review corrected repeated headings, decorative mobile overflow, priority-chart fit and refresh-time Live Responses keyboard focus. Desktop Hotel price medians and the common-scale plot now share a compact row. Reduced motion and keyboard-expandable chart data tables are supported.

No academic engine, cloud adapter, schema, RLS, authentication, backend function, payment logic or learner data is changed. The three native Faculty modules contain only their single analytics upgrade call; surrounding data/security logic is preserved exactly. Temporary transport/review tooling is removed from the release tree. Permanent CI is read-only.

## Evidence and release gates

- Baseline production: run `40160034789`, 21/21 assets equal to checked main.
- Calculation contracts: 21/21 tests; existing structural gates: 74 Design Code and 36 V15.5 invariants.
- Mounted review run `40162378048`, application commit `4b9e0a183981396ca85125c8c45fdc8b1b023e7a`: 53/53 navigation/Practice and 260/260 analytics checks, with 45 analytics states at 1366x768, 768x1024 and 390x844. Actual separate tabs, blocked focus, missing/closed opener, preserved saved choices, denied/empty/populated records, live refresh, long labels, keyboard and reduced motion are covered using synthetic adapters.
- Final Hotel compact-plot refinement and final-head full regressions must pass before merge. Intermediate test results do not replace final-head checks.
- Release is not complete until main is rechecked, PR #61 is source-reviewed and merged, Pages succeeds, and all 96 active runtime assets exactly match the deployed commit. Production verification is read-only.

## Remaining boundaries

Browser focus remains controlled by browser security and user settings. A ready-message acknowledgement does not prove a tab became foreground. Current organization/class comparisons use recorded labels within the authorized session; institution-wide or cross-session queries need a separately authorized Backend contract.

Synthetic browser acceptance is not independent real-account production classroom acceptance or Backend security/recovery certification. Exact visual correspondence to the referenced mockup and three screenshots cannot be certified because those image files were unavailable. Assistant source review is not independent human approval.
