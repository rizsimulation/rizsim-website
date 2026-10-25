# Greenwashing native integration - release candidate

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

This is a candidate until reviewed PR merge, successful Pages deployment and exact
runtime asset verification. A restricted catalogue product must point to
`/simulation-greenwashing.html`, slug `seven-sins-greenwashing`; no public-free access,
price, license grant, or billing configuration is implied. Existing licenses and
class creation rules remain authoritative. Catalogue activation must be verified
separately from static-file deployment.

Tests use synthetic fixtures, never production learner accounts or records. Actual
mounted browser tests cover native Student/Faculty interfaces, complete progression,
reload, failures, response locking, JSON, print, access-denied states, submitted-only
queries, live updates, long labels, data tables, keyboard/reduced-motion and responsive
layouts. A standalone in-memory render is preview evidence, not mounted acceptance.

The original three simulation engines and backend files remain byte-identical.
Legacy exact-source tests permit only the precise three integration hooks and newly
added Greenwashing assets; source guards still reject modifications to existing
assessments. Narrow guard tests verify unrelated adjacent source mutations fail.
