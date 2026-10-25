# Greenwashing native integration - verified deployment

Workstream: Frontend. Baseline: `4d1ccafe4e672971b7284786e2265f5ceb771435`.
User authorization: preview and deploy the supplied Student and Faculty dashboards
within existing RizSim design and workflow. No new access permission, schema,
server function, authentication or payment change is authorized by this release.

## Source preservation

Both uploaded HTML dashboards were opened and previewed. The source manifest records
their SHA-256 values. All 10 audit cases, 7 diagnosis cases, 7 transfer cases, options,
keys, feedback explanations and Ladder rungs are copied without academic edits.
Original Faculty debrief and teaching-note text is retained. Source content version
3.0 and completed JSON schema 1.0 keep their original identities.

The hosted edition removes duplicate identity entry, oversized hero/footer chrome,
restart, import-first workflow and destructive-looking data controls. Website identity
and Classroom context are reused. The original Class Resources mechanism is loaded
unchanged. Optional JSON import is a local-only Faculty review, never a server write.

## Existing contracts only

The Student adapter validates the authenticated owner, attempt/session/access type,
published product slug/path and existing session-access RPC before writes. Each saved
choice keeps stable order and first-response history. Optimistic updated-at matching
rejects concurrent overwrites. Pending failures retain a tab-scoped retry copy, not
an invented cloud-success message. The original server submit RPC confirms completion.

Live roster/progress use `get_my_classroom_session_students`, whose existing server
contract checks session ownership/institution scope. Detailed responses are selected
only for submitted IDs from that roster and remain subject to `simulation_responses`
RLS. No in-progress raw-response query, widened permission or new RPC is introduced.
Show analyzed/submitted denominator and inaccessible/missing states honestly.

The baseline no-feedback rule and audit lock are enforced in the native formative
UI and transition validator. This is **not** a new tamper-proof summative assessment:
there is no new server-enforced academic-stage guard or hidden-key service. Adding
those, or detailed pre-submission Faculty analytics, requires separate Backend approval.

## Analytics

Do not treat final 100% mastery as independent learning proof: successful revision
is required by the source. Use paired first/final observations on the same lab items,
separate diagnosis and transfer, audit distribution, seven-sin baseline accuracy,
item difficulty, first-attempt scatter, and descriptive correction mean/median/SD.
Use zero-based labeled scales and explicit item/learner denominators. No significance,
causal, psychometric or durable-learning claims. With zero initial errors, display
Not needed / not applicable; legacy JSON rate=1 remains documented by zero-error
metadata rather than changing the source export convention silently.

## Publication and acceptance gates

The application passed reviewed PR merge, successful Pages deployment and exact
runtime asset verification. The published restricted catalogue product points to
`/simulation-greenwashing.html`, slug `seven-sins-greenwashing`; no public-free access,
price, license grant, or billing configuration is implied. Existing licenses and
class creation rules remain authoritative. Catalogue activation was independently verified after the production asset checks;
it does not grant a license or create a public-free route.

Tests use synthetic fixtures, never production learner accounts or records. Actual
mounted browser tests cover native Student/Faculty interfaces, complete progression,
reload, failures, response locking, JSON, print, access-denied states, submitted-only
queries, live updates, long labels, data tables, keyboard/reduced-motion and responsive
layouts. A standalone in-memory render is preview evidence, not mounted acceptance.

The original three simulation engines and backend files remain byte-identical.
Legacy exact-source tests permit only the precise three integration hooks and newly
added Greenwashing assets; source guards still reject modifications to existing
assessments. Narrow guard tests verify unrelated adjacent source mutations fail.


## Verified application and catalogue release

Application [PR #63](https://github.com/rizsimulation/rizsim-website/pull/63) was merged
on 25 October 2026 at 13:27:45 PKT. Released commit:
`d6b8facc184651a28927654029f5197233cf7506`.
Reviewed head `afdeea1cec23c553e17fb0316f4292514880750e`, tested PR merge
`e0caea22dda809346cb2e5a6a783d4a3bb440450` and application release all share tree
`dc105257cd6db662fba83635658bf5ff1c3a4dfb`.

**All 32 final-head application PR workflows passed.** Source review 5642251304
records the exact-head review and resolved findings. There were no unresolved
inline review threads at merge. This is assistant source/visual review, not
independent human approval.

[Final mounted run 40176297142](https://github.com/rizsimulation/rizsim-website/actions/runs/40176297142)
passed **88 Student and 79 Faculty checks**, across **31 screenshot states** at
1366x768, 768x1024 and 390x844. There were **42 core/source-fidelity checks**,
**74 Design Code invariants** and **36 V15.5 invariants**. Existing simulation,
Classroom, role, material, course and design regressions also passed.

[Pages run 40176708612](https://github.com/rizsimulation/rizsim-website/actions/runs/40176708612)
completed build and deployment successfully.
[Post-merge run 40176708382](https://github.com/rizsimulation/rizsim-website/actions/runs/40176708382)
passed the Student/Faculty/source checks and verified **105/105 active runtime
assets** at rizsim.com with HTTP 200 and exact SHA-256 equality to the application
release commit. Artifact `greenwashing-production`, ID **12593075999**, was generated
at **13:29:51 PKT**. All 105 hashes were independently reconciled against reviewed
source; verification succeeded on attempt 1. This checks runtime bytes, not merely
a homepage version label.

Only after those checks, the new catalogue product was published at **14:02:52 PKT**
and read back at **14:03:11 PKT** on 25 October 2026:

| Field | Verified value |
|---|---|
| Product | `fe78d177-08a7-40b1-8529-18f78960b3dc` |
| Title | Seven Sins Greenwashing Audit & Decision Lab - Pakistan |
| Slug | `seven-sins-greenwashing` |
| Route | `/simulation-greenwashing.html` |
| Category | Active `learning` category |
| Status / access | `published` / `restricted` |
| Publication journal | `178ee665-82ef-46eb-a98c-0b645e63262e` |

Registration/publication used existing catalogue fields and an atomic publication
journal entry. An initial publication statement failed before any write because
it named a nonexistent journal column; the corrected statement used the inspected
`product_title_snapshot` and `product_slug_snapshot` columns and passed read-back
verification. There was no schema change or impersonated user. The catalogue price
retains its zero metadata default; **restricted access is not free access** and no
payment offer, license, role or entitlement was added.

## Practical launch path and remaining boundaries

Faculty select the simulation through their existing licensed Classroom/catalogue
workflow and create/open a Live or Practice session. Students join that session
through the normal Classroom/code flow; the host supplies an authorized attempt.
The runner intentionally refuses a direct URL without that context. Accounts that
lack a license require the normal existing license-assignment process; none was
automatically granted during deployment.

Full browser acceptance used synthetic adapters on actual mounted pages in headed
Chromium, not independent real-account production classroom tests or physical
Safari/Firefox devices. No production learner data was accessed. Final correct lab
answers are required by the supplied source, so the dashboard highlights first
attempts and within-session corrections without unsupported significance or causal
claims. Greenwashing's formative frontend locks do not add server-enforced academic
stage protection; that, new in-progress detailed analytics or broader cross-session
access requires separately authorized Backend work. Phase 9F certification remains
unchanged.

The repository Master Status and permanent Analytics Design Code extension are
updated. A documentation-only follow-up may record these facts without changing
application bytes; its final SHA and deployment must be checked separately. Updating
the repository does not automatically replace the older ChatGPT Project attachment.
