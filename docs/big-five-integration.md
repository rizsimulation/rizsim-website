# Big Five native integration - release candidate

Workstream: Frontend. Base checked: `bd161b3be6543afc337c2a7a44402f33c5e35518`.
User requested the same source-preserving native deployment as Greenwashing and
explicit access for their existing Course Lead account to both simulations.

## Supplied material and learning contract

The supplied Student and Faculty Big Five HTML dashboards are the academic sources.
`big-five-source-manifest.json` records both uploaded hashes and the exact academic
constant hashes. Preserve all ten repeated review questions, five paired source/new
transfer cases, options, score keys, concepts, factual feedback, adaptive feedback,
conceptual remediation/examples, bibliography and complete Faculty answer rationales.
These measure **understanding of personality concepts, not participants' personalities**.

Flow: ten independent committed KR judgments; five shuffled LT pairs, each source
judgment -> factual explanation -> transfer judgment -> outcome-specific feedback;
ten KG judgments in the same review order, each starting blank; automatic RGA.
Every choice requires confidence 25/50/75/100. Optional LT notes remain unscored.
Incorrect transfer triggers a reviewed-concept acknowledgment, not a changed or
second scored answer. No forced final mastery or fabricated correction is introduced.

## Native website integration

Remove the duplicated standalone identity gate, oversized hero and footer, arbitrary
restart and import-first workflow. Reuse authenticated Student identity/ERP handoff,
Classroom Live/Practice, the existing runner shell and Class Resources, autosave,
resume, presenter pause and confirmed Classroom submission. Unsaved tentative choices
remain only in this user's tab/attempt recovery store. Failed committed saves do not
show success or reveal later feedback; explicit retry preserves the chosen answer.
Optimistic updated-at checks prevent silent concurrent overwrite.

Faculty Presenter Dashboard and Live Responses use the native running-session mounts.
The existing roster RPC authorizes the chosen session. Response queries include only
submitted IDs in that roster and are independently subject to existing RLS. Missing
or inaccessible responses are not zero scores. No raw in-progress answer query occurs.
Presentation-safe mode is on by default: it hides all scores while any learner in the
session is still working. Completed-group projection shows aggregates, not names,
ERP numbers, individual answers or keys. Private Live Responses is separate.

Charts: paired mean KR/KG and percentage-point change, four LT pathways with 5*n
case-pair denominators, five conceptual dimensions (2*n items per phase), confidence
vs accuracy, signed gain histogram, paired review scatter, matched item transitions,
source/transfer option distributions, recorded section comparisons and descriptive
mean/median/sample SD. Small samples and empty states remain explicit. No personality
profile, diagnosis, psychometric validity, significance or causal/lasting-learning claim.

## Final-key release and exports

RGA opens automatically after KG and is independent of the final answer key.
The supplied per-completed-attempt release/revoke file contract is preserved. Faculty
exports a control matching the attempt, identity, response fingerprint and instrument;
Student imports it. Stale or incompatible revisions are rejected. The new native
integration does not claim that a downloaded control was delivered or applied remotely.
Revocation cannot recall answers already viewed/exported. A synchronized, server-
enforced cross-device release service requires separately approved Backend work.
The formative scoring key remains inspectable as in the source; not a secure exam.

Completed response JSON and RGA exports and printable responses remain. Optional
Faculty JSON/archive import is local-only, validates completed raw records, re-scores
choices, rejects conflicting duplicates and uses latest ERP/section attempts for
analysis without changing or uploading live learner records.

## Access and boundaries

Grant only the user's verified existing Course Lead account access to Big Five and
Greenwashing, aligned to their existing semester expiry. Do not change the account's
role or other users' access. Use existing published/restricted catalogue entries,
license options, direct license records and specifically authorized product-scoped
report permissions; no platform-wide/category-wide permission is needed. Record
what actually changed and verify active dates and scope after any grant. No learner
records are inspected to verify access configuration.

No schema, RLS, authentication, privileged server function or payment change is part
of this release. Existing four simulation engines and brand assets stay unchanged.
Source academic stage rules are formative client checks, not new server grading.
No TinyFish. Tests must mount actual pages with synthetic adapters; record Chromium
coverage separately from real-account production acceptance and other browsers.

## Completion gates

Preview both uploads and native dashboards; run core/state/source and actual browser
checks plus the existing site regressions; source-review the exact final head; recheck
main before merge; verify Pages and exact deployed runtime assets; publish the
restricted catalogue record only after code verification; verify both account grants;
update Master Status and this release record with actual PR/commit/run evidence.
A candidate or merged source alone is not a completed deployment.
