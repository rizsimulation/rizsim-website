# RizSim Phase 9F — Recovery rehearsal and release gate (DRAFT)

Audit checkpoint: 2026-10-11 (staging security and production **read-only** inventory only).  
Production Supabase project `rvmumpvtvjvvuyimeybc`; isolated staging `sqjosrywtevdnkdxflns`.

**Never run restore operations against production.** This is a checklist, not deployment authorization. Do not commit database dumps, Auth credentials, encryption keys, personal student information, or real Storage file bytes to GitHub.

## A. Independently verified inventory

| Item | Production observed | Evidence |
|---|---:|---|
| Existing database migrations | 6 | Supabase migration list |
| Auth accounts | 4 | read-only SQL count |
| Products | 6 | read-only SQL count |
| Courses | 4 | read-only SQL count |
| Simulation attempts | 10 | read-only SQL count |
| Payment orders | 2 | read-only SQL count |
| `course-materials` actual Storage files | 2 | 3,757,270 metadata bytes |
| `platform-content` actual Storage files | 3 | 896,610 metadata bytes |
| Placeholder folder marker in `platform-content` | 1 | not a fifth file there |
| Total actual Storage files | **5** | **4,653,880 metadata bytes (~4.65 MB)** |

Staging currently contains four disposable protected-stream QA files. They are **not** substitutes for backing up the five production files.

**Existing backup evidence:** Prior archive inspection reportedly passed `pg_restore --list`. Archive filename, encrypted destination, current access to archive, and off-device retention **not independently verified** in this checkpoint. `pg_restore --list` is not a successful restore.

No development branches appear in either Supabase project. Supabase branch data is not automatically a substitute for encrypted off-site backups.

## B. Recovery proof requirements — not yet passed

- [ ] Verify *current* recoverable PostgreSQL backup (custom archive or supported platform backup) with creation time, version, size, and SHA-256. Keep artifact and integrity proof in encrypted restricted storage, not the repository.
- [ ] Confirm encrypted, geographically/off-device independent retention and authorized access controls. Do not store a recovery password in this document.
- [ ] Enumerate **all five production file objects** through an authorized Storage API/client; download each in binary form to a restricted encrypted backup destination; record source bucket/path, byte size and SHA-256 in a *private* manifest. Exclude the folder placeholder.
- [ ] Confirm backup includes required roles, extension inventory, RLS/policies, functions, migration history, Auth configuration/identities where applicable; understand exclusions based on backup method.
- [ ] Arrange **separate disposable restore destination** with confirmed cost, billing authorization, region and data handling. Disable outbound student email, webhooks, payments, notifications, and any production integrations for the rehearsal.
- [ ] Restore database into disposable destination only. Inspect migration history, authorization policies, permission grants, extensions and schema dependencies.
- [ ] Independently verify restored **baseline counts** listed in Section A. Exceptions require investigation, not silent reconciliation.
- [ ] Restore all five actual file bytes into *separate* private Storage buckets in the disposable environment, then verify the SHA-256 manifest and content-type data.
- [ ] Redeploy necessary Edge Functions and safely configure new **test-only** Auth, CORS/origin, environment, and Storage settings. No production secrets reused in a public browser.
- [ ] Test that an authorized user can view allowed content **inside RizSim's controlled viewer** and that unauthorized/student-out-of-window users are denied. Course materials should not become a permanent downloadable student library. Browser restrictions are deterrents; they cannot categorically prevent screen capture.
- [ ] Re-run owner MFA/role/Staff & Student test matrices in the isolated test environment; verify recovery operator can restore a working service.
- [ ] Record start/end timestamps, observed recovery time, data freshness, object integrity, discrepancies and a reviewer sign-off. Delete disposable environment only after separate data-retention approval.

**Important Supabase platform limitation:** Cloning/restoring a backed-up project to a new project copies database material, but **not actual Storage object bytes**, Edge Functions, Auth settings/API keys, or other configuration; these require independent transfer/reconfiguration. Some clone/restore features require paid eligibility and may incur charges.

## C. Remaining application release gates

| Gate | Status | Acceptance criteria |
|---|---|---|
| Primary Owner TOTP fresh login | PASS in staging | User-verified AAL2 |
| Backup TOTP fresh login | PASS in staging | Independent backup-factor challenge verified; device independence still unverified |
| Four protected server-to-server PDF/PNG bytes | PASS in staging | HTTP 200, correct MIME, checksum and protected header |
| Unauthorized/invalid stream requests | PASS in scoped staging probe | Rejected; not full browser matrix |
| Database student course permission rules | PASS in rollback-only staging test | Joined versus unjoined, licence expiry/revocation, suspended/closed, handout versus teacher material |
| Legacy read-only path differential | PASS for tested subset | 11 functions × 7 personas, 77 equal first-result comparisons; many further cases remain |
| Permission hardening on existing staging tables | PASS | No anon/authenticated TRUNCATE on 22/22 tables |
| New-table defaults for `postgres` on staging | PASS | Disposable table dry-run; no excess TRUNCATE/TRIGGER grants |
| `supabase_admin` defaults | OPEN | Requires role-level review; prior edit not permitted |
| Mutating privileged functions, classroom join/close authorization | OPEN | Run safe isolated positive/negative tests and remedy only confirmed findings |
| Real Faculty/Course Lead/Student browser identities | OPEN | Valid licensed classroom and role inheritance, controlled HTTPS staging origin |
| Content viewer with protected Live/Practice period | OPEN | Authorized in-app previews; no publicly downloadable original or permanent student library |
| Five production Storage objects plus DB isolated restore | OPEN | Requirements in Section B |
| Production database excessive `TRUNCATE` grants | OPEN | Separate reviewed remediation, not authorized by this note |
| PR review (#3, #5, #6) | OPEN | Validate dependencies, migrations, regression evidence, design lock |
| Production deployment | **HOLD** | Explicit release-specific approval only |

## D. Boundaries and next actions

1. Keep existing production data and the approved RizSim premium splash, branding, sea-glass navigation, teal actions, layouts, and interactions unchanged.
2. Finish read-only inventory and safely isolated regressions while waiting for backup destination arrangements.
3. Do not delete real Storage objects, MFA factors, or production records.
4. Do not merge PRs or deploy to production without an explicit reviewed go/no-go decision.
5. For a **new billable Supabase project/branch**, obtain a project-specific cost quote and explicit confirmation before creating it. A user granting general permission to *continue staging checks* is not billing authorization.

References:
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/clone-project
- https://supabase.com/docs/guides/storage/management/download-objects
- https://supabase.com/docs/guides/storage/s3/compatibility
