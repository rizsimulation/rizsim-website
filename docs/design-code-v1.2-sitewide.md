# RizSim Design Code 1.2 - sitewide consistency

Authorized by the user on 24 October 2026: replicate the approved 1.1 visual
improvements across existing tabs, controls, simulations and resources.
Baseline: `c75035bc499f8122883281dc50b8b32adfd4a523` (PR #58).
This extends 1.0 and 1.1, not a new brand or application framework.

## Design contract

Keep compact readable task controls, white-dominant cards, light boundaries,
restrained complementary accents and brief feedback. Solid teal means the main
operation; light teal/neutral surfaces mean supporting actions; violet denotes
resources/results; amber marks exploration; red remains destructive/negative.
Labels, shapes, selected indicators and keyboard focus carry meaning as well as
color. No new user permissions, content movement or navigation destinations.

Desktop Classroom Explore stays hover/focus-revealed; touch shows it. Do not
extend hover hiding to Start, Save, Submit, required inputs, errors, disabled
explanations or entitlement guidance. These must remain discoverable.

## Audit and implementation register

| Surface | Reviewed controls and presentation | Preserved boundaries |
|---|---|---|
| Public Home and embedded role Home | Environment tiles, modest headings, supporting text; approved 1.1 cards | Official artwork, splash, shared content and destination handlers |
| Public Simulations | Compact introductory area, catalogue filters, licence options, details/purchase actions | Product/price information and existing access decisions |
| About and Contact | Document actions, smaller Contact heading, support actions | Existing content, contact destination and protected downloads |
| Student | Find a Class, Classroom, Practice, history, resource cards, account/dialog controls | ERP consent, original-tab return, Live/Practice access, saved work |
| Faculty | Classroom, session tools, records, results, Courses premium information | Premium-tier boundary, original class and response handlers |
| Course Lead | Course cards, authoring actions, fields, file/link publish/revoke dialogs, course resources | Draft/save semantics, purchased read-only courses, authoring ownership |
| Institution | Overview, Faculty requests, Classes, Simulations, Analytics | Institution scope and authorized read/write boundaries |
| Admin/Owner | Content tabs, creation/edit actions, publishing, governance fields, support/analytics controls | All visibility gates, roles, authorization and submission records |
| Three Faculty simulation reports | Refresh, print, individual result actions, table labels and rows | Answer release, report values, filtering and aggregation logic |
| Both resource viewers | Page/zoom/download controls, title, metadata and status surfaces | Secure vs downloadable modes, watermark, canvas/image dimensions, original natural-flow bottom toolbar |
| Three participant runners | Task/navigation/export/confirmation buttons and outer runner heading | Exact stimuli, choices, selection feedback, timing, scoring, locks, response storage and sealed results |

Existing archived previews, diagnostic HTML, unsupported roles and private file
contents are not redesigned or activated. The resource viewer interface is the
scope, not editing a faculty's published PDF/image. Long documents, scenarios
and data tables remain scrollable; do not clip them to manufacture a fit.

## Implementation

`rizsim-design-code-v12.css` is shared through three existing entry stylesheets:
`rizsim-visual-refinement-v11.css`, `rizsim-participant-finish-v14.css`, and
`rizsim-viewer-finish-v14.css`. Thus all eleven active HTML entrypoints and the
existing Home Shadow DOM receive it without changing HTML, handlers or server
contracts. Explicit component-family selectors avoid resetting Google login,
brand navigation, assessment answer choices or protected document internals.

New rules must be checked against the full cascade, not assumed to win because
they are present in a file. UI state/role visibility remains controlled by the
original scripts. CSS must not override hidden/inert/role gates or change data.

## Evidence and release gates

Run existing structural and functional regressions, the 1.1 hover suite, and
`python scripts/test_design_code_v12.py`. The new suite retains v1 priority and
reflow checks and adds action text/contrast checks and a machine-readable
inventory of rendered controls in every exercised state. Reports explicitly
list gradient backdrops where simple solid-color contrast is not asserted.
Use 1366x768, 1440x900, 390x844 and 200% text. Record actual screenshots, not a
separate static design mockup. Check all three Student journeys, all three
Faculty reports, secure/downloadable resources and course-authoring/touch flows.

A source inventory is not proof that every possible runtime state was tested.
Synthetic permissions/tests are not real signed-in production acceptance.
Publish precise covered states and outstanding limitations with the release.
GitHub Pages and the 16-asset byte comparison are separate post-merge gates.

The local assistant environment blocks browser navigation; source inspection
and baseline GitHub evidence were used locally. Actual interaction/visual tests
run in isolated GitHub Actions Chromium with synthetic fixtures. No protection
is disabled, no real learner test writes, no TinyFish, no backend migration.

## Future maintenance

Consult this addendum along with 1.0/1.1 before adding any new surface. Extend the
explicit control family and audit matrix for new components, then test normal,
hover/focus, selected, disabled, loading, invalid, denied and completion states.
Keep changes separated from Backend Phase 9F and update Master Status only from
verified release evidence. This document alone is not a claim of deployment.
