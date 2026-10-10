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
