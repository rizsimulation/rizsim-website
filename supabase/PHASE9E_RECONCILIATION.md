# Phase 9E — production migration reconciliation (review before applying)

This change restores canonical timestamp-prefixed migration filenames in GitHub.

- Four versioned migration files were reconstructed byte-for-byte from the existing `supabase_migrations.schema_migrations.statements[1]` production ledger (versions 20261010050812, 20261010050849, 20261010062322, 20261010081830). These versions are **already applied** and must not run again.
- The original Phase 9B GitHub migration content matched the ledger exactly.
- Two Phase 9D migration files were renamed to canonical 14-digit prefixes: `20261010110000` and `20261010110100`. Their underlying production RPCs and trigger were previously observed and rollback-preflighted, but **these versions are not recorded** in the production migration ledger. Do not simply push them: first compare each function and trigger with the actual deployed definitions to prove parity.
- **Production migration ledger not changed by this PR.** Do not deploy the two Phase 9D migrations blindly.
- After parity verification, use the official Supabase CLI `supabase migration repair <version> --status applied` for both Phase 9D versions, following [Supabase documentation](https://supabase.com/docs/reference/cli/supabase-migration-repair). A linked local project, project-appropriate credentials, verified backups, and a `supabase migration list` comparison are required.
- Validate with `supabase db push --dry-run` and `supabase migration list` before any future push.
- Phase 9E QA cleanup: Storage PDF was manually removed; one isolated unpublished product row, its asset metadata, and an empty-folder placeholder still require narrowly scoped cleanup. The database deletion attempted through the connected SQL tool was blocked; do not bypass those controls. Verify exact UUID and zero dependencies first.
- Security advisory follow-up: 69 callable `public` SECURITY DEFINER functions should be individually reviewed; do not mass-revoke existing application access. Supabase Auth leaked-password protection remains to be enabled via approved admin controls.

This PR changes **only migration files and this review note**. No public website layout or users' data are changed.


## Live verification — 2026-10-10 (no production writes)

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
**Keep PR #3 unmerged** until a repository maintainer verifies a full migration listing and completes the supported, non-replaying migration history repair. The current connector blocked direct migration updates for safety. Review the actual production backup/restore plan first.

Using an appropriately linked Supabase CLI environment, with `supabase migration list` confirming the earlier four versions and identical SQL:

```sh
supabase migration repair 20261010110000 --status applied
supabase migration repair 20261010110100 --status applied
supabase migration list
supabase db push --dry-run
```

These commands **only mark the two previously deployed Phase 9D migrations as applied** in migration history; they do not replay their SQL. Do not run them against an unverified project or before reviewing the SQL and a backup. Recheck advisors and critical role boundaries after registry repair.
