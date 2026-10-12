# Phase 9F — production security and recovery audit (read-only)

Audit date: 2026-10-11. Production project: `rizsim-production` (`rvmumpvtvjvvuyimeybc`).

**This document proposes follow-up controls and does not authorize modifying the production database, accounts, or approved RizSim website design.** This branch starts from the Phase 9E reconciliation PR head; merge Phase 9E first after its own review, then rebase this branch before evaluating Phase 9F.

## Confirmed production checks

| Control | Observed state |
|---|---|
| Supabase database | Healthy; six registered migrations |
| Products / Auth users | 6 products / 4 users |
| Courses / attempts / payment orders | 4 / 10 / 2 |
| Public SECURITY DEFINER routines executable by authenticated | 69 |
| Public SECURITY DEFINER routines executable by anon | 0 |
| Among the 69, search_path=public | 39 |
| Among the 69, search_path includes pg_temp explicitly | 15 |
| Among the 69, search_path empty | 15 |
| PostgreSQL TEMP privilege for authenticated users | Yes |
| CREATE privilege on public for authenticated users | No |
| Auth MFA factors | 0 enrolled, 0 verified |
| Storage file entries | 5 actual file records plus 1 empty folder placeholder |
| Security advisor | 69 callable-definer warning instances; leaked password protection disabled; two RLS no-policy notices |

The two RLS-enabled tables without policies (`public.rizsim_product_assets`, `public.rizsim_publication_events`) intentionally lack direct user SELECT privileges. Do not add policies indiscriminately.

## Legacy function inventory (39)

```
add_simulation_to_my_rizsim_course(uuid,uuid)
can_manage_rizsim_course(uuid)
can_manage_rizsim_course_path(text)
can_manage_rizsim_institution(uuid)
can_read_rizsim_course(uuid)
can_read_rizsim_course_path(text)
can_update_my_rizsim_classroom_attempt(uuid)
check_my_rizsim_classroom_attempt_access(uuid)
claim_approved_institution_access()
close_rizsim_classroom_session(uuid)
create_my_rizsim_course(text,text)
create_rizsim_classroom_session(uuid,text,text,timestamp with time zone,timestamp with time zone,timestamp with time zone,timestamp with time zone)
create_rizsim_course_classroom_session(uuid,uuid,text,text,timestamp with time zone,timestamp with time zone,timestamp with time zone,timestamp with time zone)
end_my_rizsim_course(uuid)
ensure_standard_faculty_access()
get_my_classroom_session_students(uuid)
get_my_rizsim_classroom_sessions()
get_my_rizsim_course_classroom_sessions(uuid)
get_my_rizsim_course_results(uuid)
get_my_rizsim_course_simulations(uuid)
get_my_rizsim_courses()
get_my_simulation_license_access(uuid)
get_my_simulation_license_catalogue()
get_visible_simulation_submission_context()
has_my_active_simulation_license(uuid)
is_active_rizsim_course_lead()
is_rizsim_owner()
join_rizsim_classroom_session(text,uuid,text)
owner_assign_institution_account(uuid,text)
owner_create_rizsim_institution(text,text)
owner_grant_faculty_simulation_license(uuid,text,text,timestamp with time zone,timestamp with time zone,text)
owner_grant_institution_simulation_license(uuid,uuid,text,timestamp with time zone,timestamp with time zone,text)
owner_revoke_simulation_license(uuid,text)
owner_set_institution_active(uuid,boolean)
remove_simulation_from_my_rizsim_course(uuid,uuid)
resolve_rizsim_classroom_access(text,uuid)
review_institution_faculty_request(uuid,text,text)
submit_institution_faculty_request(uuid,text,text,text)
submit_my_rizsim_classroom_attempt(uuid)
```

**Important:** Function availability to `authenticated` is not automatically a vulnerability. Existing callers, RLS roles, and function authorization checks must be verified before changing any grant or function definition. Preliminary static examination did not establish unqualified persistent-table references or dynamic SQL injection in the 69 public routines, but it is not a complete penetration test.

## Required acceptance gates

1. Review the body and dependencies of each of the 39 legacy-path functions. In an isolated staging database, test whether an explicit `pg_temp` final entry or an empty `search_path` with qualified references is appropriate **per function**.
2. Run differential Owner, Admin, Faculty and Course Lead behavior tests before/after every proposed search-path adjustment, including licensing, course access, payment, class sessions and publication. Run under least-privilege identities. No mass revoke of `EXECUTE`.
3. Enable and verify MFA for RizSim privileged application accounts through supported user-enrollment flows; do not enroll users behind their backs. Review Supabase dashboard organization account MFA independently.
4. The Supabase advisor still flags leaked-password protection; Supabase docs say it is Pro-plan-and-higher. Decide whether to upgrade or record compensating controls and explicit risk acceptance.
5. Verify encrypted off-device copies of the custom PostgreSQL archive and independently back up five real Storage objects. The archive's `pg_restore --list` succeeded, **not** a full isolated restore rehearsal.
6. Rehearse restoration into a disposable *separate* Postgres project, never production; then validate tables, roles and application permissions. **Do not upload the archive to this issue or pull request.**
7. Re-run security advisors and check genuine record baselines. Only merge code/migrations after formal review.

## Recovery / storage notes

Observed Storage metadata: 2 real files in `course-materials`; 3 real files and 1 empty-folder placeholder in `platform-content`. Actual file bytes are not contained in a PostgreSQL dump. The standalone `.emptyFolderPlaceholder` should only be removed by the Storage UI/API with exact-path confirmation; do not delete `storage.objects` directly with SQL.

Baseline: six products, four Auth users, four courses, ten simulation attempts, two payment orders; six migration versions. Preserve all genuine records and the approved RizSim premium visual system.

References:
- https://supabase.com/docs/guides/deployment/going-into-prod
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth/password-security
- https://supabase.com/docs/guides/storage/security/access-control
- https://github.com/rizsimulation/rizsim-website/issues/4
