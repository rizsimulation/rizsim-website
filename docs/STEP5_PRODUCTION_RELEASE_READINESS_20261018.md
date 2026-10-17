# RizSim Step 5 — Final Production Deployment: Release Readiness and Hold Points

**Prepared:** 18 October 2026 (Asia/Karachi). **Status:** RELEASE PREPARATION ONLY / PRODUCTION NO-GO pending approvals and real-account acceptance.
**Release candidate:** Draft PR #37 — `feat/v13-all-three-simulations-integration-20261018`, commit `5a7f8d07bf385f9c6fcf44321d3afb0a4ed59a92`.
**Current production:** `main` commit `251b4fd4553fa859e08f6e4c9b0b6d6fcc519c4e` (five website fixes already shipped).

## Definition of Step 5 completion

Step 5 concludes with a **final, functional RizSim deployment** of three authenticated simulations, not merely merged code: live approved database functions, protected academic scoring, final V13 Faculty Live Classroom navigation, approved published product catalogue entries, authorized Faculty/Institution licence/access paths, actual Student join/play/resume/submit/own-report, Faculty personal review and permitted cohort analytics, and mobile/desktop verified user journeys.

Simulations: 01 `insight-to-implication-bystander` (`/simulation-insight-to-implication.html`); 02 `system-1-system-2-thinking` (`/simulation-system-1-system-2.html`); 03 `hotel-judgment-lab` (`/simulation-hotel-judgment.html`).

**Owner change request incorporated:** Studio → Share Access is the **only** QR/class-code/join-link interface. The old floating/pinned button/popup is intentionally absent. The original verified server-backed `share_token` remains the authority; never replace it with `session_id`.

## Read-only preflight findings

- PR #37 is OPEN, DRAFT, UNMERGED and mergeable; current head `5a7f8d07...`; 18 of 18 GitHub Actions workflows succeeded at that exact SHA. Tests include synthetic authenticated Chromium fixtures and isolated SQL tests; this is not live-account acceptance.
- Live `main` remains `251b4fd4553fa859e08f6e4c9b0b6d6fcc519c4e`.
- Supabase `rvmumpvtvjvvuyimeybc`: zero catalogue rows at the three exact slugs; no production `public.get_my_rizsim_insight_session_records(uuid)`, `public.get_my_rizsim_s1s2_session_records(uuid)`, or `public.get_my_rizsim_hotel_session_records(uuid)` yet; no private Sim02 academic key table or private Sim03 assignments/judgments tables.
- Supabase migration history ends with the already-deployed support-reports V11 migration. The four new simulation SQL files remain **staged and unapplied**.
- Existing security advisor flags **93 authenticated-callable SECURITY DEFINER functions (review required, not automatically 93 vulnerabilities)**, **one disabled leaked-password-protection setting**, and **four RLS-enabled tables without policies**. Classify affected functions/policies before release; do not automatically change unrelated working production services.

## Release blockers — all must be cleared, with recorded evidence

| Gate | Current status | Minimum evidence |
|---|---|---|
| Step 4 Owner visual sign-off | PENDING | Explicit Owner approval of refined screenshots, V13, Studio-only QR, desktop/mobile |
| Sim01 academic verification | PENDING | Confirm reconstructed distractors, KR/KG keys and explanation/debrief |
| Sim02 academic key and grading | PENDING | Confirm original question/option mappings; provision the *real* key privately, never in GitHub/browser/CI |
| Sim03 experimental review | PENDING | Approve four photo hashes/order, exact A/B prompts, non-graded WTP and cautious debrief |
| Staging migration and RLS review | PENDING | Verify schema-compatible SQL, grants, private table isolation, triggers, lock-stage enforcement and no public answer leakage |
| Authenticated end-to-end role matrix | PENDING | Approved real accounts: Student, creator vs unrelated Faculty, Course Lead, Institution, Owner, restricted Admin/Category Manager and anonymous negatives; both Live and Practice windows, closed/expired/revoked |
| Product publication settings | PENDING | Owner-approved title/category, descriptions, price/access options, intended publishing/visibility and licence scopes; no invented offers |
| Backup/recovery and release approval | PENDING | Verified database recovery point, planned rollback/forward-fix, explicit separate approval for each live mutation |
| Combined draft automated CI | PASS | 18/18 workflows at `5a7f8d07...` (re-run after any subsequent changes) |

## Four staged SQL files — dependency order for an approved rehearsed rollout

1. `sql/insight_faculty_session_v1.sql` — session-scoped Faculty retrieval RPC; inspect authorization, execute grants and data shape.
2. `sql/sim01_response_policy_hardening_v1.sql` — alters existing **permissive** `simulation_responses` INSERT/UPDATE policies; first regression-test all existing released student flows and live/practice windows in a disposable clone.
3. `sql/sim02_secure_results_v1.sql` — private **unseeded** scoring-key storage and protected Student/Faculty result RPCs. Do not deploy a scoring-dependent simulation before separate secure academic-key installation and verification.
4. `sql/sim03_secure_hotel_experiment_v1.sql` — private sealed A/B assignment and judgment, triggers on existing response/attempt tables, atomic submit and closure-aware results. Verify cross-product effects, sticky balanced assignment, no direct write/backdoor reveal and final closure of all possible collection windows.

The order above is a **review sequence**, not executable authorization. None has been applied to production. Migration history must be tracked and recoverable, not pasted informally into production in an unrecorded way.

## Proposed controlled release sequence (each production stage is a separate HOLD point)

0. **Freeze the candidate:** reconfirm exact PR head, 18/18 CI, original image hashes, no client-side private key, no other live changes; record Owner visual/academic approval.
1. **Staging rehearsal:** work on an authorized isolated environment restored from representative schema (not customer data without approval). Apply all four migrations; install a fictional key in testing only; test RLS/role/expiry/Hotel closure/response update paths.
2. **Secure key/permission review:** approve installation mechanism for the *real* Sim02 answer map in private DB storage; verify no GitHub/Pages/browser/CI exposure and least-privilege SQL grants.
3. **Backup and production SQL HOLD:** confirm production point-in-time recovery and a tested restoration/forward-fix strategy, then request explicit authorization **for these exact database changes**. Deploy reviewed migrations in approved order; re-query functions, tables, triggers, grants, RLS and product regressions.
4. **Application code HOLD:** request explicit approval to merge **PR #37 only** to `main`; confirm GitHub Pages deployment is complete at the merged SHA. Do not merge superseded draft PRs #29–#31 or separate #33–#36 individually.
5. **Catalogue/publication HOLD:** create or publish only Owner-approved product records with correct slugs and hosted launch paths; confirm authorized licence/price/access and publication visibility. No automatic licence grants, student accounts or sample student records.
6. **Real-account activation acceptance:** test controlled authorized Student/Faculty/Course Lead/Institution accounts, QR scanning on phone, live and practice sessions, 14-step Sim01 and 16-step Sim02 committed progress, server scoring, Sim03 sealed pre-close and disclosure post-close, Faculty report filters and role negatives.
7. **Go-live sign-off:** verify critical user journeys, privacy, monitoring and non-regression; explicitly record Owner APPROVE/REJECT before general availability.

## Recovery plan

- If failure occurs before PR merge: do not release; fix draft/staging. Database functions/tables require *deliberate* review even when no product is published.
- If static-site deploy fails: roll back **website code** to pre-release `main` SHA `251b4fd...` using a reviewed Git revert and verify Pages; avoid resetting unrelated later commits.
- If schema/RLS/triggers fail: **do not assume website rollback reverts database changes**. Stop publication, disable/restrict affected product access with Owner approval, restore through a tested database backup or forward-fix migration that protects submitted learning data. Do not blindly DROP private judgment tables or scoring history.
- If Sim03 disclosure is uncertain: fail closed before collection closure; do not reveal A/B assignments, any personal prices or analytics. If Sim02 key installation is unverified: fail closed instead of showing synthetic/predicted grades.

## Explicit NON-AUTHORIZATIONS

This readiness document does not authorize production SQL, key insertion, new accounts, licence changes, merges, GitHub Pages release, product creation/publication, real records, outbound emails or changing existing unrelated security settings. The user has authorized Step 5 **preparation and verification**; each high-impact action remains held until its own clear authorization and all prerequisite gates.

## Evidence

- Draft PR: https://github.com/rizsimulation/rizsim-website/pull/37
- Owner synthetic screenshot packet: previously generated Step 4 refined preview bundle and Step4 full-portal QA GitHub Actions artifacts.
- Supabase function/grant/RLS security checklist: https://supabase.com/docs/guides/database/functions
- Supabase migrations: https://supabase.com/docs/guides/deployment/database-migrations
- Supabase advisor reference: https://supabase.com/docs/guides/database/database-linter

**Final determination: PREPARED FOR CONTROLLED STAGING, NOT APPROVED FOR PRODUCTION RELEASE.**
