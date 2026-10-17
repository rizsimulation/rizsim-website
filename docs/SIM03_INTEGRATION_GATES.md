# Simulation 03 — Hotel Judgment Lab / My Hotel Choice
## Status: OPEN DRAFT ONLY

Production RizSim remains unchanged. No merge, deployment, product publication, SQL execution, licence grant, users, or real classroom records are authorized.

## Authoritative academic/design sources
Original user-supplied Capture 03 (RizSim_Three_Simulations_Exact_Core_Capture), and PR #28. Activity RizHotelJudgment.v1, schema hotel-judgment-v1. Exact reusable title: Hotel Judgment Lab; neutral Student subtitle: My Hotel Choice.

Four original user-uploaded PNG photographs, unchanged Git blobs and order:
simulation-assets/hotel-judgment/hotel_view_1.png through hotel_view_4.png. Verify with ORIGINAL_HOTEL_PHOTO_MANIFEST.json SHA-256 values. A and B receive the same four pictures in the same order.

## Original experiment, deliberately unscored
- Group A: "Does this hotel cost Less than PKR 1000 per night?"
- Group B: "Does this hotel cost More than PKR 80,000 per night?"
- Yes/No, plus ONE whole-number PKR willingness-to-pay judgment, optional 40-character participant code, permanent lock.
- Neither Yes/No nor PKR amount has a "correct answer." Do not fabricate grades, Knowledge Review, Knowledge Gain, learning gain, or causal conclusions.

## Three hosted RizSim surfaces
1. Student: signed-in, genuine attempt checks, server-assigned randomized A/B (balanced and sticky per session), original photo gallery, assigned-only prompt, committed judgment, server-canonical submitted result, personal JSON and Print/Save PDF fallback.
2. Individual: assigned group, source question, Yes/No, PKR, participant code, server-owned timestamp and read-only submission.
3. Faculty: existing Live Classroom component. Pre-close view shows Student roster, commitment progress and submitted counts ONLY. After every collection window closes, same module reveals authorized A/B records, counts, separate medians, two-group SVG dot plot with markers, B minus A contrast, means, individual result inspector, activity table and Notice → Locate → Infer teaching debrief.

No separate public Faculty site, PIN-cookie server, preview JSON data, or independently deployed student dashboards.

## Why a PRIVATE experiment database is essential
Existing RizSim general simulation_responses SELECT policies allow authorized people to view submitted answers while collection might still be running. Hotel Judgment must not prematurely expose who saw which prompt or how much they offered. The staged SQL therefore:
- keeps assignments in private.rizsim_hotel_assignments;
- keeps actual original judgments in private.rizsim_hotel_judgments;
- writes only a non-sensitive opaque completion marker to public.simulation_responses;
- makes a per-attempt balanced randomized assignment through get_my_rizsim_hotel_assignment;
- atomically locks and submits through submit_my_rizsim_hotel_judgment, reusing the existing completion receipt RPC;
- gives only the Student their own result through get_my_rizsim_hotel_personal_result;
- only lets authorized Faculty/Owner/Institution request selected session data through get_my_rizsim_hotel_session_records;
- masks group and actual answers server-side until the collection closes;
- uses triggers to block direct Student writes to this product, overriding otherwise broad permissive RLS policies.

The SQL is in sql/sim03_secure_hotel_experiment_v1.sql — REVIEW ONLY, NEVER EXECUTED ON PRODUCTION BY THIS DRAFT.

## Final release gates
- [ ] Academic Owner verifies the two exact prompts, photo order and debrief interpretation against original materials.
- [ ] All original photo SHA-256, A/B hosted browser, mobile and Faculty UI regression checks pass.
- [ ] Disposable PostgreSQL tests validate correct role access, stable balanced allocation, rejection of edits and spoofed group values, atomic receipts, no early reveal, only Owner-authorized class access.
- [ ] Inspect trigger impact and SECURITY DEFINER ownership/search_path in the real Supabase environment (no production changes until explicitly authorized).
- [ ] Authenticated real-account positive/negative session tests: Live, Practice, expired window, Owner, Institution, creator vs unrelated Faculty, Student and anonymous.
- [ ] Confirm class closure/reveal occurs only after ALL possible response windows end or authorized class closure.
- [ ] Complete and test combined three-simulation integration + the shared V13 collapsible Live Classroom navigation before proposing one production release.
- [ ] Obtain separate explicit permission for SQL deployment, code merge, product creation, licensing and publishing.

## Pedagogical caution
The class comparison is descriptive and exploratory. Random assignment supports an experimentally meaningful comparison, but a small convenience cohort, possible prior price knowledge, imbalance, outliers or incomplete compliance limit inference. WTP is subjective. Do not claim a clinical judgment profile, causal anchoring magnitude, durable learning, valid psychometric scale or individual bias diagnosis.

The source Faculty capture's preview rows are illustrative and must NEVER be passed off as observed RizSim results.
