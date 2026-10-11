# Phase 9F Staging Checklist

This document records non-production tests required before activating Owner MFA in RizSim.

- Test Owner Google sign-in and authenticator enrollment using disposable test accounts.
- Verify that Owner features need a completed second-factor challenge.
- Check that Admin, Faculty and Course Lead functionality remains unchanged.
- Test unsuccessful code entry, lost-device recovery and sign-out.
- Review all affected database permission checks separately before deployment.
- Preserve the current premium website design and production user data.

**Status:** Planning only. No production changes are authorized by this file.

## 2026-10-11 follow-on checkpoint

- [x] Staging protected resource and course-material Edge Functions deployed with JWT verification enabled.
- [x] Unauthenticated GET to both staging function URLs returned HTTP 401 (no data leaked).
- [x] Owner AAL1 rejected; AAL2 accepted; missing AAL rejected in authenticated-role SQL claim simulations.
- [x] Admin/Faculty/Course Lead/Institution/Category Manager role checks simulated inside rollback-only transactions.
- [x] Added prototype backup-TOTP factor enrollment (AAL2 required), factor selection, and staging QA smoke-test controls in draft PR.
- [x] Serve the draft prototype under an isolated staging test host; HTML and JavaScript both returned successfully. Owner sign-in remains pending; never use a production account.
- [ ] Complete actual TOTP enrollment and verification with a second device; do not share the secret or code.
- [ ] Run the smoke-test button in AAL1 and again in AAL2; record only the check outcomes.
- [ ] Verify both signed-in endpoints respond HTTP 400 to invalid IDs, plus authorized and unauthorized attempts with private test PDF/PNG fixtures.
- [ ] Exercise second authenticator and lost-device recovery; do not depend on undocumented recovery codes.
- [ ] Confirm cross-role browser regressions and restore drill before any production roll-out.

**Release state: HOLD.** Static review and anonymous-denial tests alone are insufficient for approval. No production deployment or PR merge.

## Isolated test URL (staging)

[Open the staging Owner MFA preview](https://sqjosrywtevdnkdxflns.supabase.co/functions/v1/rizsim-owner-mfa-staging-preview)

- Hosted by Supabase staging Edge Function `rizsim-owner-mfa-staging-preview` v2.
- This **public static login-page endpoint** has `verify_jwt=false` so the sign-in page can load. It does not expose private files or privileged server credentials. Owner database actions still require the authenticated staging session and verified AAL2.
- The two private streaming Edge Functions retain `verify_jwt=true`.
- Smoke test: page and /app.js were both successfully retrieved. Early route 404 corrected and re-verified.
- **Pending:** actual Owner sign-in, TOTP code, AAL1/AAL2 self-test, failed-code flow, backup factor and recovery checks, authorized/denied PDF test.

## Phase 9F checkpoint — 11 October 2026 (continued)

- [x] Independently verified staging-only services: resource stream v1 JWT-on, course material stream v1 JWT-on, isolated static Owner preview v2 (public login-page delivery only).
- [x] Read-only baseline: staging 1 Auth user, 1 active Owner, 0 Auth sessions, 0 verified MFA factors, 0 products, 0 Storage objects.
- [x] Read-only production comparison: 4 Auth users, 6 products, 6 Storage objects, 0 MFA factors; Owner helper remains unchanged in production.
- [x] **RPC security regression:** `public.admin_get_rizsim_products()` under simulated authenticated claims: Owner aal1 DENIED (42501), Owner aal2 ALLOWED (empty staging dataset), missing aal DENIED (42501), Admin aal1 ALLOWED, Faculty aal1 DENIED (42501). Role substitutions and tests were transaction-scoped with rollback; no persistent membership edits.
- [x] Definer-access audit: 0 public SECURITY DEFINER routines executable by `anon`; 69 callable by `authenticated` and require continued per-routine least-privilege review. No public views found. No additional RLS policies with raw Owner checks detected by current scan.
- [ ] Interactive browser and TOTP sign-in test. Dedicated `RizSim Staging Owner MFA Phase 9F` browser profile still has no saved staging credentials; no Auth sessions or factors exist. Previous live-browser inspection was inconclusive; independent container Chromium navigation blocked by environment policy, not by confirmed website error.
- [ ] Real authenticated file preview and denied-user access tests using staging-only test fixtures.
- [ ] Second authenticator, lost-device recovery, and isolated database/Storage restore rehearsal.

**Do not merge/deploy to production. Release remains HOLD.**
