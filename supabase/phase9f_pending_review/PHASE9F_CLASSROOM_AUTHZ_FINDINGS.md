# Phase 9F classroom authorization hardening — DRAFT, untested

Read-only inspection of staging definitions on 2026-10-11 found two potential bypasses. **Execution of the proposed tests was blocked; do not label either as an exploited vulnerability yet.**

1. `join_rizsim_classroom_session` authenticates via `auth.uid()`, upserts `public.profiles`, and resolves class/participation windows, but has **no direct active-profile check**. By contrast, `rizsim_can_student_access_course_now` checks `profiles.account_status='active'`. Risk: suspended users might create/return a class attempt despite being denied access to its materials.
2. `close_rizsim_classroom_session` authorizes `classroom_sessions.created_by=auth.uid()` OR `is_rizsim_owner()`, but it does **not** recheck the creator's membership/profile status at closure. Risk: a deactivated previous class creator might close an active class.

Proposed minimal changes are in `PHASE9F_CLASSROOM_AUTHZ_HARDENING_DRAFT.sql`, which preserves original return types and most logic, adds a profile check after the join-profile upsert, and requires a currently active Faculty/Course Lead membership and profile for creator-closure. Owner closure remains possible through existing `is_rizsim_owner()` AAL2 authorization. Also adds explicit `pg_temp` last to both `SECURITY DEFINER` search paths.

**Not tested / not deployed:** Neither runtime scenario nor the proposed replacement function has passed a fresh isolated test. Do not execute these replacements until a controlled test identity and temporary classroom exist and owner/staff/student negative and positive flows can be tested. Avoid altering the real Owner's account, real student attempts, or production data to manufacture test cases.

## Required acceptance matrix

| Scenario | Expected |
|---|---|
| Active Faculty creating and closing own class | ALLOW |
| Active Course Lead creating and closing own class | ALLOW |
| Active AAL2 Owner closing any class | ALLOW |
| Owner AAL1 closing class by Owner override | DENY |
| Inactive Faculty / Course Lead trying to close their former class | DENY |
| Suspended Faculty / Course Lead trying to close their former class | DENY |
| Active unrelated Faculty attempting closure | DENY |
| Active Student joining open licensed class | ALLOW, create/return attempt |
| Suspended Student joining open class | DENY |
| Active Student joining expired, revoked or closed class | DENY |
| Legitimate course materials: authorized handout vs Faculty-only | EXISTING RLS DENIALS HOLD |
| Real browser Faculty, Course Lead, Student sessions | UNTESTED |

**Additional risks to review separately:** Suspended students attempting direct submit/update of an existing attempt; suspended student resolves a class code; institution association review and licence issuance; `supabase_admin` future-table default grants. Function-body replacements alone do not certify their use across the public website.

Nothing in this note approves production rollout, infrastructure expenditure, MFA factor deletion, or website design changes. Release remains HOLD.
