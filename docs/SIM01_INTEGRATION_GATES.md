# Simulation 01 — Three-surface authenticated RizSim release candidate

**Status:** OPEN DRAFT only. No deployment, Owner publication, user creation, licence grant or production SQL write is authorised by this branch.

## Source of truth
- Original user-supplied three-core capture: 01_Insight_to_Implication/CAPTURE_SPEC.md
- Stable ID: rizsimulation.insight-to-implication.bystander.v1 and schema version 1
- Source Student runner: draft PR #26; assets copied without question rewrites
- Website base: PR #32, main 251b4fd4553fa859e08f6e4c9b0b6d6fcc519c4e

## Preserved surfaces
1. Student: six Knowledge Review MCQs, source judgment, factual bridge, transfer, feedback, six Knowledge Gain MCQs, personal Review Gain Analytics.
2. Individual: KR and KG scores /6, matched changes, six paired answer transitions, CC/IC/CI/II source-to-transfer pathway and personal feedback. A completed Student attempt reopens read-only.
3. Faculty: a native section inside existing Live Classroom Session & Results. Joined/KR/LT/KG counts, paired KR/KG means, transition totals, transfer pathway and choice distributions, six item comparisons, group comparisons, authenticated participant records and an individual inspector. Scores are independently recomputed from raw answers.

## Existing website integration
- Future product launch path: /simulation-insight-to-implication.html
- Future catalogue slug: insight-to-implication-bystander
- Student requires an existing authorized attempt, live/practice session and published catalogue product. Existing server-side access and submit RPCs remain authoritative; no private keys embedded.
- Faculty obtains saved committed records from a new session-scoped, Owner/Faculty/Course Lead/Institution-authorized Postgres RPC. Polls for changed committed responses while an authorized classroom session is open, with manual refresh.
- No synthetic cohort data is bundled into the public branch. Original source captures remain private QA references.
- Academic limitation: several incorrect-choice alternatives were reconstructed from a teaching note, not verified verbatim source. Require academic author review before Owner publication.

## Staged SQL — NOT APPLIED
- sql/insight_faculty_session_v1.sql: get_my_rizsim_insight_session_records(p_session_id) returns rows only for a classroom the caller is entitled to see. Anonymous execution is revoked.
- sql/sim01_response_policy_hardening_v1.sql: narrows permissive Student response INSERT and UPDATE policies so the classroom window cannot be bypassed via the broader attempt policies. Check against other deployed products before execution.

## Release gates
- [ ] Academic author signs off reconstructed distractors, answer keys, explanations and debrief.
- [ ] New joint Node and Chromium QA pass on the combined release branch.
- [ ] Existing Student V8/V9, Live Classroom V5, Course Runtime V6, Course Authoring V7 and site regressions pass.
- [ ] Execute isolated RLS negative tests for anonymous, Student, unrelated Faculty, creator Faculty, Course Lead, Owner and Institution.
- [ ] Obtain explicit approval before any production migration or change to existing RLS.
- [ ] Controlled signed-in class test: Faculty creates session; Student joins via QR/code; stages save; refresh/resume; server confirms submission; Student sees own read-only result; Faculty sees correctly scoped aggregated records.
- [ ] Verify expired windows/licences, other-Faculty session, wrong product/session, results after closure, mobile screens and session isolation.
- [ ] Obtain explicit approval before merging PR into main, Owner product publishing, granting licences or creating test users.

## Interpretation
A paired within-session KR versus KG difference must not be described as a causal or durable learning effect. Unanswered and uncommitted items are missing, not wrong. Use the original captured Faculty graphs as visual references, not as evidence from real learners.
