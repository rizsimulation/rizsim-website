# RizSim development instructions

Before adding or changing a page, tab, component or UI state, read
`RIZSIM_DESIGN_CODE.md`, `docs/design-code-v1-coverage.md`, and the current
`docs/design-code-v1.1-refinement.md` and `docs/design-code-v1.2-sitewide.md` addenda. Design Code 1.3 (`docs/design-code-v1.3-interiors.md`) extends these rules;
its quiet-button, accessible hover-reveal and motion refinements also govern
future additions. Preserve rules not explicitly revised by an addendum.

## Shared project rules

- Inspect current `main` and deployment evidence. Create a scoped branch and PR;
  recheck `main` before merging and rerun affected tests. No unrequested changes.
- Preserve official RizSim branding, splash, sea-glass navigation, teal actions,
  Google login logo, routes, permissions, learner records, analytics, resource
  authorization, live synchronization and assessment/answer-release protocols.
- Frontend owns presentation and client experience within existing contracts.
  Backend owns Supabase, auth/RLS, data integrity, payments, recovery and security.
  Cross-boundary changes need an agreed contract and user authorization.
- Never use TinyFish or production learner accounts/data for tests. Use local
  synthetic browser fixtures, code review, GitHub Actions and deployment checks.
- Do not merge an old draft merely because it is open. Do not bypass a role gate,
  alter a permission, or remove a failing security test for a visual change.
- Secrets and raw learner records must not enter git, screenshots or reports.

## Frontend conventions

Reuse `rizsim-design-code.css` tokens, `rizsim-visual-refinement-v11.css`, `rizsim-design-code-v12.css`, and
`window.RizSimUI` primitives. Keep ordinary interface copy readable, essential
task actions first, complementary colors purposeful, and every consequential
action accessible by keyboard/touch. Explore reveal must never hide Start,
Submit, validation or entitlement guidance. Native application `alert`,
`confirm`, `prompt` are not allowed; await the in-site helper. Browser security
and unsaved-work safeguards are not application dialogs. No fake progress,
artificial waits or correctness-colored answer selections. Only already-released practice feedback may receive outcome animation as specified in the 1.3 addendum.

Run the Design Code structural/browser tests, `scripts/test_design_code_v11.py`,
`scripts/test_design_code_v12.py`, `scripts/test_design_code_v13.py`, and existing relevant suites. Changes to old exact-source tests must allow only
specifically authorized presentation changes while keeping original academic,
data and security invariants. At release record workstream, PR, exact deployed
SHA, test evidence, limitations, other-stream impact and remaining items. Keep
shared Master Status current after verification; project-source files are
snapshots, not automatically synchronized.

### Analytics and learner UI extension

Read `RIZSIM_ANALYTICS_DASHBOARD_CODE.md` before changing Presenter or Live Responses screens. Preserve its session-scoped data contracts, paired denominators, Hotel sealing, chart scales and accessible empty states. Read `RizSim_Master_Status.md` for evidence, then recheck current main. Design Code 1.4 source exceptions are narrow UI-only insertions; do not relax academic, authorization or backend preservation tests.

### Greenwashing simulation

The additive Greenwashing module uses Design Code 1.4 and Analytics Code 1.0.
Read `docs/greenwashing-integration.md` and its source manifest before changes.
Run `scripts/test_greenwashing_core.cjs`, `scripts/validate_greenwashing_source.py`
and the mounted `scripts/test_greenwashing_browser.py`. Existing assessments remain
protected by the old guards; the narrow new-asset allowance is not permission to
change old engines, permissions or scoring.

## Big Five native module

For `big-five-personality`, preserve `docs/big-five-source-manifest.json` and the
source learning contract in `docs/big-five-integration.md`. Concept scores are not
personality measurements. RGA is automatic; final-key control is separately scoped.
Retain KR locks, source/transfer sequence, confidence, adaptive-review acknowledgment,
submitted-only native Faculty access and the projection-safe unfinished-group rule.
Run Big Five core, exact-source and mounted browser checks with existing regressions.
