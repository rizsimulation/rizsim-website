# Phase 9F least-privilege table grants — staging evidence

On 2026-10-11 staging all 22 public tables initially allowed anon and authenticated to TRUNCATE, TRIGGER, REFERENCES and MAINTAIN. Production comparison showed TRUNCATE on 8/22 anon and 13/22 authenticated public tables. RLS does not govern TRUNCATE.

The staging-only existing-table revoke was committed, leaving zero anon/authenticated TRUNCATE and TRIGGER permissions on its 22 tables, and preserved authenticated SELECT on 18/22 tables. The postgres default-privilege revoke was subsequently committed to staging. A disposable CREATE TABLE / inspect permissions / ROLLBACK test returned false for both roles for TRUNCATE and TRIGGER.

The supabase_admin role's default ACLs have NOT changed: the current connection lacks permission. Creation under that owning role may still inherit broad permissions and needs a separate owner-level review.

The SQL is in `supabase/phase9f_pending_review/least_privilege_public_table_grants.sql` as a DRAFT and deliberately not placed in the canonical migration directory yet. This is not authorization to execute it on production. Review search paths, dependencies, and future defaults; regression-test real browser workflows before any production approval. Do not blindly revoke EXECUTE on existing RLS-protecting RPCs.

Release HOLD.