# RizSim Design Code 1.3 - learning interiors and mounted Faculty views

User-authorized on 24 October 2026 after the 1.2 release. This addresses the three
reported gaps: simulation interiors, missing practice feedback animation, and
Presenter Dashboard / Live Responses. It does not certify every production state.

## Explicit extension of earlier rules

The original Design Code excluded assessment-answer outcome animation and the
1.2 pass mainly covered runner chrome. The user now requests practice feedback
animation. Decorate ONLY feedback that the existing simulation has already
released. Never infer a verdict from a selection, ship private keys, change a
score or reveal a sealed answer. Correctness-neutral selection remains mandatory.

- Insight to Implication: replace the existing post-lock source/transfer marks
  with two labelled vector outcomes. Incorrect decisions draw a red circled cross;
  correct decisions draw a green circled tick. Keep the original explanation and
  acknowledgement requirement. Both decisions remain locked. Practice only.
- System 1 & System 2: the current contract releases instructional explanations,
  not per-choice verdicts during a case. Animate a neutral review arrow. Do not
  invent red/green judgments or expose private server keys. Per-choice correctness
  during practice would require a separately authorized backend contract.
- Hotel Judgment: Yes/No and willingness to pay have no correct answer. Keep
  assignment, photographs, submitted amounts and sealed results untouched. Invalid
  input explanations can animate; do not mark a price as wrong.
- Reduced motion is static. No autofocus, sound, confetti, fake result, artificial
  delay, repeated polling animation, or new response writes.

## Interior design

Compact current-stage headers, progress strips, neutral selectable choices,
readable question typography, quieter side guidance and consistent confirmations.
Use two columns for suitable answer cards on desktop and one on mobile. Keep
source wording/order and all four original Hotel photos unchanged. Long cases
may scroll naturally; never clip, scale, hide required tasks or shorten content.

## Faculty screens

Scope the refinement to the real mounted Live Workspace: all three simulation
report roots, live rosters, individual reports, core metrics, status, errors,
filters and actions. Remove oversized repeated headers and deep nested padding;
use readable violet supporting controls and subtle row/metric boundaries. Preserve
all authorization, metric calculations, correct handling of incomplete learners,
report printing/export and Hotel collection sealing. No new tab destinations.

## Verification

Run scripts/test_design_code_v13.py with runner/faculty scopes. Its tests open the
actual runner routes and actual access-out.html, then navigate the real inner
workspace tabs. Prior standalone module tests remain useful functional checks,
but are not proof of the deployed visual cascade. Capture KR, source, bridge,
transfer, feedback, KG/results, invalid/submitted Hotel states, mounted presenter,
responses, individual report, failure/retry, mobile and enlarged text. Assert the
absence of premature verdicts and preserved locked choices. Re-run the existing
role, resource, authoring, player/return and security-boundary regressions.

Application HTML, assessment instrument/engine/cloud and Faculty application
scripts stay byte-identical in this release. The existing runner-shell script
has a presentation-only appendage; no network or data operations in that helper.
CSS imports are shared, not a replacement application. No TinyFish. Backend
Phase 9F is separate. Record exact covered states, limitations and deployment
hash evidence. No claim of exhaustive all-browser or real-account acceptance.
