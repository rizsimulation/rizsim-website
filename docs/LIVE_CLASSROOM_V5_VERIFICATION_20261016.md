# Live Classroom V5: implementation and verification

Date: 16 October 2026. Development branch: `feat/live-classroom-compact-v5-20261015`.

## Release status

The supported Live Classroom UI is implemented and has passed automated browser integration checks. V5 has NOT been merged or deployed. Production remains outside this change set. A final authenticated Faculty/Course Lead acceptance check is still required before release; the browser tests below use a simulated backend, not live credentials or a real class.

## Implemented

- One Live Classroom tab with Run Simulation, Run My Own Course and Run Purchased Course. Records stays separate. The course builder is not redesigned.
- Compact authenticated headings replace dark title blocks, including Records and the resource library. Selection cards use differentiated pastel fills, heading/subheading only, and bottom actions revealed on hover or focus. Touch actions remain visible; reduced-motion behavior is respected.
- Licensed simulation grid, Add More Simulations to Home, selected simulation prepopulation, existing session creation, exact-session link/code/local QR, results and explicit View Results navigation.
- Active owned-course grid restricted to Course Lead, muted Faculty promotion without privilege elevation, Create More Courses to the existing Courses workspace, existing course-session creation, secure materials/drop area, and original course response viewer.
- Stage URLs, browser Back/Forward, authenticated deep-link restoration, unauthorized-selection handling, failed-creation handling and session closure without discarding submissions.
- Existing panels are moved, not cloned. V4 result mounting yields to V5. Course panels are returned to Courses on exit. Course selection is asynchronous and guarded against recursion.
- No selection-triggered scrolling. View Results scrolls intentionally. Refresh results reloads the same exact session URL to retrieve the latest authorized submissions.
- Session metadata and action colors no longer inherit white-on-pastel text from the old dark design.

## Verification evidence

Successful GitHub Actions run: https://github.com/rizsimulation/rizsim-website/actions/runs/38880416808

The tested and committed application-assets revision is `ff01c3c125a3a8622ebef23dffa26067e75f28af`. Later documentation/CI cleanup does not change those application assets.

45 browser checks in `scripts/test_live_classroom_v5.py` and 18 additional checks in `scripts/test_live_classroom_v5_extended.py` passed: **63 total**. These use the actual portal DOM and original event handlers with isolated synthetic Faculty, Course Lead, Owner, licence, session and submission fixtures. No live account, entitlement or student data is written.

Coverage includes both supported creation flows, correct session transitions, independently decoded QR links, drag/drop into the original upload input, correct course storage target, response modals, exact-session filters, closed-session preservation, keyboard and touch access, mobile menu overflow, delayed role loading, forged URLs, Back/Forward and reload. Targeted session metadata/button contrast checks meet 4.5:1; this is not a site-wide accessibility certification.

Static V5 syntax/integration checks, existing Faculty workspace checks, session-continuity checks, premium UI V3 checks and category-release checks also passed. Final CI is read-only and tests committed source directly; temporary integration generators have been removed.

The evidence artifact contains screenshots, JSON check summaries and contrast measurements. Its displayed people, course names, classes and tokens are synthetic test data, not production records.

## Security and scope

No Supabase migrations, RLS policies, authentication logic, role grants, licence RPCs, student dashboard, submission handlers or protected upload RPCs are changed. Compared with the inherited V5 HTML, the only additional inline-module change removes the legacy tab-switch `window.scrollTo(0,0)`. QR encoding is bundled locally with the upstream MIT notice and a pinned checksum.

## Intentionally not activated

Ready-made purchased RizSim courses are not yet a supported product type in the published licensed catalogue. The separate Purchased Course screen therefore displays a truthful empty state and Add More Courses to Home. It does not relabel Faculty-created courses or expose unsupported purchased-course session/upload operations.

Course-builder redesign, ordinary-Faculty course uploads, student/enrollment deletion, checkout/licensing changes and unrelated public-policy work remain outside this UI change. Student removal stays disabled.

## Remaining release gate

Confirm a real signed-in Faculty/Course Lead browser session, perform the final authorized session/material/results acceptance check, then review and merge the V5 PR only when ready. After merge, require a successful GitHub Pages deployment and verify the live HTML, V5 JS/CSS and QR asset. Until those steps succeed, report V5 as development-only, not live.
