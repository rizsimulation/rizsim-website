# Phase 9E — production migration reconciliation (live registry repaired; PR review pending)

This change restores canonical timestamp-prefixed migration filenames in GitHub.

- Four versioned migration files were reconstructed byte-for-byte from the existing `supabase_migrations.schema_migrations.statements[1]` production ledger (versions 20261010050812, 20261010050849, 20261010062322, 20261010081830). These versions are **already applied** and must not run again.
- The original Phase 9B GitHub migration content matched the ledger exactly.
- Two Phase 9D migration files were renamed to canonical 14-digit prefixes: `20261010110000` and `20261010110100`. Deployed function bodies and the publication trigger were verified against the SQL files. On 2026-10-11, both versions were recorded as applied using the supported Supabase CLI migration-history repair, without rerunning either SQL file.
- **The GitHub PR itself does not modify production.** Separately, an authorized operator reconciled the live migration ledger on 2026-10-11. Do not redeploy or replay the already-present Phase 9D SQL.
- **Completed 2026-10-11:** With the target Supabase project confirmed, an operator ran `supabase migration repair <version> --status applied` for both Phase 9D versions, following [Supabase documentation](https://supabase.com/docs/reference/cli/supabase-migration-repair), using the verified session-pooler database URL. Supabase's migration API independently returned all six versioned records.
- **Verified 2026-10-11:** `supabase migration list` showed all six local/remote entries and `supabase db push --dry-run` returned `Remote database is up to date.` Continue to use dry-run checks before any future push.
- Phase 9E QA cleanup: The isolated Phase 9D PDF, product row and associated asset metadata were independently confirmed deleted. A Storage-generated `.emptyFolderPlaceholder` was previously observed in the old test folder; any follow-up cleanup must target that exact placeholder through the Storage API/UI and must not delete database rows directly.
- Security advisory follow-up: 69 signed-in-callable `public` SECURITY DEFINER functions remain flagged for risk review; do not mass-revoke existing application access. The leaked-password-protection warning remains active on the Free plan. Neither issue was resolved by the migration-history repair.

This PR changes **only migration files and this review note**. No public website layout or users' data are changed.


## Historical live verification — 2026-10-10 (no production writes; before ledger repair)

### Migration parity
- **4/4 existing migration records**: exact byte-for-byte match with their restored, 14-digit versioned GitHub SQL files, including the Phase 9B production migration.
- **7/7 Phase 9D public RPCs**: production `pg_get_functiondef` matches the canonical SQL text (six Admin mutation/attachment RPCs plus `admin_get_rizsim_publication_queue`).
- **Paid publication guard**: live `private.rizsim_guard_paid_publication_price()` has the same body as the Phase 9D migration. Differences are Postgres function formatting, delimiter and explicit/default `SECURITY INVOKER` syntax. The trigger is installed on `public.products`.
- **Missing ledger entries**: `20261010110000` and `20261010110100` remain unregistered. Do not replay these migrations on production when their equivalent logic is already live.

### Access-control regression (transaction-scoped, rolled back)
- Authenticated **Owner** and **Admin** can read Admin publishing metadata; Owner-only flag is true only for Owner.
- Authenticated **Faculty** and **Course Lead** cannot read Admin publishing metadata and cannot manage content.
- No public `SECURITY DEFINER` routine in the audited group is directly executable by the `anon` role.
- `public.rizsim_product_assets` and `public.rizsim_publication_events` are RLS-enabled, lack user-facing policies and have **no direct SELECT privilege** granted to `anon` or `authenticated`; they are intentionally accessible through guarded application functions.

### Privileged-function findings
- `public`: **72 SECURITY DEFINER** routines, **69** callable by `authenticated`; this accounts for the Supabase security-advisor warning. This count is not 69 confirmed vulnerabilities.
- `private`: **11 SECURITY DEFINER** routines including trigger helpers. Five private trigger routines inherit `EXECUTE` for `anon`, but `anon` has no `USAGE` permission on the `private` schema; trigger routines cannot be invoked as ordinary scalar functions.
- Public schema `CREATE` is denied to both `anon` and `authenticated`. Some older functions use `SET search_path=public`; **these require a separate object-qualification and temporary-schema review** before claiming full hardening. Avoid bulk grant changes.
- Password setting change to minimum 12 characters and secure password change was **reported saved by the Owner**, but it was not independently inspected by the connected database tools. Leaked-password protection remains flagged because the Supabase Free tier does not enable that Pro-only capability.

### QA cleanup and production data integrity
- The isolated Phase 9D PDF, product and asset metadata were independently confirmed deleted.
- One Storage-created `.emptyFolderPlaceholder` remains in the former test folder. Remove it through the Supabase Storage UI or API if necessary; never delete `storage.objects` rows directly with SQL.
- Production baseline after cleanup: 6 products, 3 product assets, 4 courses, 9 classrooms, 10 attempts and 4 active management memberships. No public-site design files were changed.

### Release condition
**Migration registry gate completed 2026-10-11.** Keep PR #3 unmerged until a maintainer reviews the reconstructed migration SQL, signs off the outstanding security advisories and confirms the recovery plan. The database backup passed `pg_restore --list` and includes table-data entries for `auth.users`, `public.products`, and `supabase_migrations.schema_migrations`; a full restore rehearsal was not performed. Supabase Storage file bytes require separate protection.

Executed against the verified production database on 2026-10-11, after confirming the existing four versions and SQL parity (shown here as the equivalent CLI subcommands without connection flags):

```sh
supabase migration repair 20261010110000 --status applied
supabase migration repair 20261010110100 --status applied
supabase migration list
supabase db push --dry-run
```

The `migration repair` commands **only marked already-deployed Phase 9D migrations as applied** in migration history; they did not replay SQL. Both succeeded. A Supabase connector recheck returned six migrations. The read-only CLI dry run returned `Remote database is up to date.` Post-repair security advisors continue to report 69 authenticated-callable definer routines and disabled leaked-password protection; these are separate release-review items.

## Follow-up audit: SECURITY DEFINER review (2026-10-10)

- Inventory: 69 signed-in-executable `public` SECURITY DEFINER routines. No `anon`-executable `public` SECURITY DEFINER function was found.
- `authenticated` cannot create objects in the `public` schema; this reduces the risk of schema-object hijacking in routines using `search_path=public`. Temporary objects and unqualified references still require testing before broader permission changes.
- Automated review of SQL `FROM` / `JOIN` / DML targets found no confirmed unintended unqualified permanent table references. Apparent exceptions were PL/pgSQL expressions or SQL CTE names, not confirmed security defects. This is a preliminary static check, not a comprehensive penetration test.
- Live role-boundary rollback tests verified Owner/Admin content access and Faculty/Course Lead denial. Do not blanket-revoke callable application RPCs.
- Supabase advisors still report 69 callable definer functions and leaked password prevention disabled (Pro-only). Password-hardening controls were manually reported saved, not independently confirmed from Auth configuration.
- Completed 2026-10-11: marked migration versions `20261010110000` and `20261010110100` applied using documented Supabase CLI `migration repair`; confirmed all six entries independently via Supabase and obtained `Remote database is up to date` in CLI dry-run. No migration SQL was executed again.


## Post-repair production validation — 2026-10-11

- Live Supabase project: `rizsim-production` (`rvmumpvtvjvvuyimeybc`), status `ACTIVE_HEALTHY`.
- Live migration history: **6/6 entries**, matching the local timestamp-prefixed files; previously absent Phase 9D entries `20261010110000` and `20261010110100` are both registered.
- Operator's Supabase CLI check: `supabase db push --dry-run` reported `Remote database is up to date.`; this was a non-applying dry run.
- Data-integrity baseline: 6 products (3 published, 3 drafts), 4 Auth users, 3 product assets and 6 Storage object metadata rows. Paid published products with nonpositive price: **0**.
- The paid-publication guard trigger remains enabled on `public.products`. All seven audited public administrative RPCs are still present; the `anon` role does not have direct `EXECUTE` privilege on them.
- Security advisors: 2 informational RLS-without-policy findings for intentionally private tables, **69** signed-in-executable definer routines requiring ongoing review, and leaked-password protection disabled. The count of warnings is not a finding of 69 vulnerabilities.
- Backup: an operator created `RizSim_Production_2026-10-11.backup` using pgAdmin and confirmed `pg_restore --list` exit code 0 and presence of key table-data entries. No full restoration rehearsal; actual Storage object blobs are not bundled with the PostgreSQL archive.
- **Release gate:** review source parity, safeguard remaining user records, complete risk acceptance, and confirm recovery measures before merging PR #3. This PR changes only migration files and documentation; public RizSim design remains unchanged.
