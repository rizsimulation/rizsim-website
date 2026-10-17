# Simulation 02: authenticated three-surface integration (DRAFT ONLY)

No production merges, product publication, SQL application, licensing, user creation or simulated classroom records are authorized by this branch.

## Source of truth
User's Capture 02 exact core design from 2026-10-17. Simulation ID: riz-ai-pedagogy-2026-s1s2-v1. Participant schema: RizSimulation.Participant.v1; version: 1.0.0.

The unchanged academic instrument has six Knowledge Review (KR) questions, two Bystander Effect/Confirmation Bias source-to-transfer case pairs (four locked decisions), six independently randomized Knowledge Gain (KG) questions and an individual RGA report.

## Three preserved surfaces
1. Student: KR, LT, KG, results. The hosted runner requires an authorized, real signed-in attempt. It sends committed-only Player snapshots, resumes verified responses, preserves locks and confirms final submission through the existing server RPC.
2. Individual results: KR/6, KG/6, review change in points and percentage points, source/2, transfer/2, Bystander Effect and Confirmation Bias concept comparison. Hosted scores are provided only after verified submission by a restricted server RPC; pending failure must not invent a score.
3. Faculty: one native component in the existing Live Classroom. Authorized live roster, completion percentage from sixteen committed decisions, individual read-only personal result, paired KR/KG and concept means, gain histogram, progress, item and transfer comparison, educator groups and suitably qualified paired inference.

## Academic-key confidentiality
The original hosted HTML contained a local scoring answer array and obsolete local-network endpoints. Those were removed from the hosted runner while keeping the original source questions and transfer cases.
An unseeded private table in the staged migration will hold the actual answer key after a separate authorized secure installation. The public repo, browser assets and academic source files MUST NOT include this key.
CI fixtures use a DIFFERENT fictional all-zero test key solely for reproducible security and scoring contract checks.

## Database files are STAGED, not applied
sql/sim02_secure_results_v1.sql proposes:
- a private, unseeded scoring-key vault;
- a private score function;
- a Student-owned, submitted-only personal RGA RPC;
- a session-scoped authenticated Faculty/Owner/Institution class-record RPC.

No production data is changed in this work. Existing broad response table policies and server-side lock transition enforcement must be reviewed before deployment: browser locks alone are not a security control.

## Release gates
- [ ] Academic answer keys and distractors reviewed against the user's teaching source.
- [ ] New Chromium Student/Faculty tests, isolated RLS and role tests, all website regression checks pass.
- [ ] Actual session/attempt authority checked under Student, Faculty, unrelated Faculty, Owner and Institution; no anonymous access.
- [ ] Stage-lock integrity and response RLS hardening tested against all released products and closing windows.
- [ ] Real signed-in classroom trial: Student QR/code join, KR/LT/KG save, resume, server submission receipt, personal RGA, Faculty analytics.
- [ ] Finish Simulation 03 and the planned V13 three-tab collapsible Live Classroom sidebar.
- [ ] Owner separately approves production SQL, private scoring-key installation, licensing, product publication and merging.

## Interpretation
KR/KG gain is an immediate within-session repeated-item difference, not evidence of durable cognitive rewiring or causal learning efficacy. Missing, tentative and uncommitted responses must not be treated as wrong. Never present synthetic preview data as learner evidence.
