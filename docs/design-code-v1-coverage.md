# Design Code v1 - implementation and verification map

Baseline inspected: `3492836608c456fd7f1cab2df235c6e8bbe88e33` (V15.5.3).
Implementation scope is the eleven current production entrypoints and their
shared UI. This map does not certify every workflow: use the measured browser
report and release record for actual verification results and limitations.

## Active roles and task priorities

| Surface / active tab or state | Priority 1: immediate task | Priority 2: below the working area |
|---|---|---|
| Public Home / shared role Home | Navigation, value statement, current entry actions | Extended pedagogy, examples, supporting content |
| Public Simulations / authorized Library | Category/filter, selection, current resource cards | Long catalogue, extended descriptions |
| Public About / role About | Brand purpose, concise section navigation | Full brand-promise explanation and supporting download |
| Public Contact / role Contact | Contact identity and communication action | Supporting guidance and history |
| Student and Faculty Google gate | Identity, Google sign-in, auth status | Supporting explanations; artwork preserved |
| Student Find a class: empty / invalid / resolved | Code, Find Class, inline error, joined Live class and safe Leave | No duplicate legacy detail cards |
| Student Classroom: Live / Practice / empty resources | Active simulation, Start, resource panel, real status, Leave when allowed | Extended resource list; original ERP consent at Start |
| Student Practice | Join code, available practice actions and status | Past/unavailable entries |
| Student Learning: activity / courses / materials / progress | Active-tab filters and current records/actions | Long personal record history and detail |
| Faculty Live Classroom: choose / setup / running | Mode choice, licensed simulation/course, required setup, launch/session controls | Guidance, older sessions, roster detail and aggregates |
| Faculty Records / Results | Existing filters, selected class and response access | Longer history and detailed authorized analytics |
| Faculty Courses | Existing premium Course Lead information/action | Extended premium explanation; no permission expansion |
| Course Lead Courses: list / draft / edit | Course selection, title, content controls, save and validation | Supporting authoring guidance and long lists |
| Course Lead Own / Purchased Classroom | Active mode, course/session selection, launch and resource actions | Additional course resources/history; purchased course stays read-only |
| Institution Overview | Authorized institution selector, headline status and active tab | Extended institutional records |
| Institution Faculty | Required request fields, submit, first invalid field | Associated Faculty and request history |
| Institution Classes / Simulations / Analytics | Selected authorized scope and current tab results | Long tables and detailed metrics; no editing rights added |
| Admin Overview / Categories | Active content tab, category input/save/validation | Existing category list, boundary explanation |
| Admin Simulations / Materials | Active create/edit form, required fields, save and file state | Product catalogue and supporting instructions |
| Admin Publishing | Draft/published status, publish/unpublish action and actual stage | Long publication list and explanation |
| Owner Administration | Same content operations plus same-page governance shortcuts | Long governance records; controls remain in original panels |
| Owner licence / institution / request / membership task | Existing selected tool fields and action with confirmation/validation | Supporting record history |
| Account dialogs | Existing identity/actions and close control | Supporting account information |
| Secure PDF viewers: authorized / denied / loading | Original auth state, document title and top/bottom controls | Document content, intentionally scrollable at selected zoom |
| Three simulation runners: gate / activity / result | Existing task and original response controls, runner chrome | Existing feedback/results only when authorized; no assessment redesign |
| Unsupported/legacy role or disabled access | Existing access explanation and permitted next action | No active workspace invented by the design layer |

## Shared components and safeguards

Typography/spacing, restrained semantic accents, true-state feedback, loading,
whole-field validation, focus/hover/disabled states, SVG file/action icons and
accessible confirmations are shared. Existing scripts still decide roles,
licences, active sessions, publication, submissions, records and answer release.
No design helper imports Supabase or stores records.

`test_design_code_v1.py` visits actual public/gate/viewer/runner routes and active
role tabs using the existing synthetic backend fixtures; its JSON lists exactly
which states and Priority 1 bounds were measured. Existing specialised regression
suites exercise course authoring, session creation/end, practice, secure viewers,
ERP/resource continuity and all three simulation save/submit/analytics paths.

## Explicit verification limits

- The synthetic fixtures do not establish live production permissions, data
  quality, institution-wide analytics correctness or real Google OAuth success.
- Actual PDF content can exceed the viewport by design; chrome and authorization
  remain the frontend test targets, not forced scaling of documents.
- Assessment stimuli and timings are deliberately not redesigned. A long
  question or explanation is not clipped to force a one-screen score.
- Archived preview snapshots and diagnostic HTML are not active production role
  workspaces. Their historical versions are intentionally retained.
- Phase 9F security/recovery certification remains a Backend responsibility.
- Any failed measurements or flows must remain visible in the release report;
  this inventory alone is not a compliance claim.
