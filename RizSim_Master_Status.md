# RizSim Master Status

**Version:** 1.2 - Greenwashing deployment and catalogue publication verified
**As of:** 25 October 2026 (Asia/Karachi)  
**Scope:** RizSim Frontend + Backend coordination; not a production security or recovery certificate.

GitHub main, merged PRs and verified deployment artifacts are authoritative. Historical conversation handoffs do not override repository evidence or prove that deferred Backend gates have passed.

## 1. Latest verified application release

**Greenwashing is deployed as the fourth native simulation**, under the existing Design Code 1.4 and Analytics Dashboard Code 1.0. Both uploaded Student/Faculty dashboards were previewed; redundant standalone UI was removed without changing the 24 source questions, options, keys, explanations or teaching/debrief content.

| Item | Verified state |
|---|---|
| Production | https://rizsim.com |
| Application pull request | [#63](https://github.com/rizsimulation/rizsim-website/pull/63), merged 25 October 2026 |
| Application release commit | `d6b8facc184651a28927654029f5197233cf7506` |
| Reviewed head | `afdeea1cec23c553e17fb0316f4292514880750e` |
| Released application tree | `dc105257cd6db662fba83635658bf5ff1c3a4dfb`, identical to the reviewed and tested PR tree |
| Final-head application workflows | **32/32 successful** |
| New mounted acceptance | **88 Student + 79 Faculty checks passed**, 31 screenshot states |
| Core/source invariants | **42 Greenwashing checks**, 74 Design Code and 36 V15.5 invariants passed |
| Pages | [Run 40176708612](https://github.com/rizsimulation/rizsim-website/actions/runs/40176708612): build and deployment successful |
| Production verification | [Run 40176708382](https://github.com/rizsimulation/rizsim-website/actions/runs/40176708382): **105/105 HTTP 200 runtime files with exact SHA-256 equality** |
| Verification artifact | `greenwashing-production`, ID 12593075999, generated 25 October at 13:29:51 PKT; hashes independently reconciled with reviewed source |
| Catalogue | `seven-sins-greenwashing`, published **restricted**, Learning category, route `/simulation-greenwashing.html` |
| Catalogue publication | 25 October 2026 at **14:02:52 PKT**; read-only verification at 14:03:11 PKT |
| Product / publication event | `fe78d177-08a7-40b1-8529-18f78960b3dc` / `178ee665-82ef-46eb-a98c-0b645e63262e` |

Catalogue publication is not a license grant or public-free access. Existing Faculty/Institution licensing and session rules remain authoritative. A direct runner URL without an authorized attempt/session fails closed. No production learner account or response was used for acceptance testing.

The SHA above identifies the released application. A subsequent documentation-only main commit may record this evidence without changing any runtime bytes. Recheck current main and deployment when resuming work. Detailed evidence, academic-source hashes and limitations are in `docs/greenwashing-integration.md` and `docs/greenwashing-source-manifest.json`.

## 2. Completed Frontend scope

**Class Resources:** targets the originating same-origin Student Classroom tab when browser policy allows. The simulation stays open with its answers/progress. One compact retry/reopen fallback replaces repeated large notices; recovery does not silently open another Classroom. Actual separate tabs, blocked focus and missing/closed opener scenarios passed.

**Practice codes:** a complete unknown eight-character code displays `Session not found`, full-field red styling and brief circled-cross feedback. Submitted text, focus and selection persist through asynchronous refresh; editing clears the error. Incomplete, closed, expired, Live-only and authorization cases keep their existing distinct behavior and secure permission checks.

**Prior simulation analytics:** the three previously integrated Presenter Dashboard / Live Responses interfaces retain the shared extension: Insight to Implication, System 1 & System 2, and Hotel Judgment. Paired KR/KG and percentage-point change, matched transitions, transfer paths and choices, participant distributions and session-scoped organization/class comparisons use existing authorized records. Sample sizes, denominators, empty states and small-sample cautions are explicit. Hotel private responses/prices remain sealed until the original authorized release condition permits them. Original reports, presenter controls and live synchronization remain available.

**Greenwashing:** the 10-item baseline audit locks before feedback, followed by seven diagnosis and seven transfer challenges. Existing identity, ERP handoff, Classroom, Live/Practice, save/resume, first-response history, submission and Class Resources are integrated. Native Faculty screens show live roster/progress and submitted-response statistics, with accessible charts, per-item details and recorded section comparisons. Optional JSON review remains local-only and separate from live session data. Student and Faculty print reports are retained.

Permanent standards: `RIZSIM_DESIGN_CODE.md`, `RIZSIM_ANALYTICS_DASHBOARD_CODE.md`. Earlier Design 1.4 release evidence remains in `docs/design-code-v1.4-analytics.md`; Greenwashing evidence is in `docs/greenwashing-integration.md`.

## 3. Workstreams and protected boundaries

Frontend owns presentation, usability, navigation, responsive and accessible interfaces. Backend owns database integrity, authentication, authorization/RLS, privileged functions, payments, recovery and security certification. Cross-workstream changes require an agreed contract and explicit approval before implementation.

Greenwashing adds its own source-preserving simulation engine and UI, plus narrow native hooks. It changes no existing simulation engine or academic asset, schema, RLS, authentication, payment infrastructure or server function. The only production database writes were the specifically requested new catalogue content registration/publication and its journal event; no licenses, entitlements or learner records were changed. No production learner record was accessed or changed. The official logo, splash, sea-glass navigation, teal actions and published resources remain protected. Course Lead remains a premium Faculty tier. No TinyFish was used.

Analytics receive only each native module's existing authorized session result. No broad data query or institution-wide access was added. Comparisons across sessions or institutions need a separately authorized Backend contract.

## 4. Backend gate register - not re-certified here

The shared 21 October snapshot recorded Phase 9F Gate 4B and Gate 5 as incomplete. This Frontend task has not rerun them or resolved historic Backend draft PRs.

| Gate | Evidence retained / next action |
|---|---|
| Gate 1 - identity/MFA | Historical staging partial pass; backup-factor recovery and present production safeguards require Backend verification. |
| Gate 2 - authorization | Historical mixed findings; establish current remediation and rerun negative access tests. Frontend CI does not replace this certification. |
| Gate 3 - protected resources | Historical staging pass; current security certification remains a Backend responsibility. |
| Gate 4A - backup integrity | Historical archive/USB integrity checks, not proof of a successful restore. |
| Gate 4B - recovery rehearsal | No new verified completion. Inspect effective local Docker port bindings before handling confidential restoration; do not assume the historical warning proved public exposure or has been resolved. |
| Gate 5 - security/release | No new verified completion. Requires independent Backend review of recovery, MFA, permissions, privileged functions, monitoring and approvals. |

Do not expose keys, MFA seeds, private backups or learner records. Do not run production migrations/restores as a shortcut. Payment expansion and advanced institution management remain separately authorized work, not implied by this Frontend release.

## 5. Release ledger

| Date (PKT) | Workstream | Change | PR / application commit | Verification | Other-stream impact / remaining |
|---|---|---|---|---|---|
| 20 Oct 2026 | Frontend | V15.5.3, historical | #56 / `3492836` | Previously recorded Pages and production checks | Backend gates remained separate |
| 25 Oct 2026 | Frontend | Fresh Design Code 1.3 baseline | `997c064` | Pages 40118384152; fresh run 40160034789, 21/21 assets | No Backend writes |
| 25 Oct 2026 | Frontend | Design Code 1.4 / Analytics 1.0 | **#61 / `154e3d1`** | 31 successful PR workflows; 357 new mounted checks; Pages + 96/96 exact production assets | Existing secure contracts preserved; limitations below |
| 25 Oct 2026 | Frontend record / QA | Design 1.4 final record | #62 / `4d1ccaf` | 14 successful follow-up workflows; final Pages and 96/96 runtime assets verified | Two documentation files and two test-only lines; no runtime change |
| 25 Oct 2026 | Frontend + catalogue content | Greenwashing native integration | **#63 / `d6b8fac`** | 32 successful PR workflows; 167 new mounted checks; Pages + 105/105 runtime hashes | Restricted publication verified; existing licenses unchanged; no Backend contract change |

## 6. Remaining limitations and acceptance boundaries

Browser foreground switching remains controlled by browser policy; an acknowledgement does not prove focus. The compact fallback is intentional. Automated acceptance used headed Chromium with synthetic authorized/denied data at desktop/tablet/mobile sizes, not independent real-account production classroom acceptance or Safari/Firefox certification.

Group comparisons are within the currently authorized session. Greenwashing live progress is available before submission, but detailed response analytics use only submitted records allowed by existing RLS. Source-required final mastery is not an independent post-test or durable-learning estimate. Academic-stage/first-response checks are formative client-side rules, not new tamper-proof server grading; stronger summative safeguards or pre-submission answer analytics need separate Backend approval.

No licenses were automatically assigned to the new simulation. The existing licensing workflow is required where an account lacks access. The historical Design 1.4 mockup-image limitation remains recorded in its release note; the two supplied Greenwashing HTML dashboards were available, previewed and source-verified. Source and visual review were assistant-performed, not independent human approval.

The repository Master Status is updated here. Updating it does **not** automatically replace the older attachment in the ChatGPT Project sources; the updated downloadable copy must be attached separately. No release permission beyond the explicitly requested work is implied.
