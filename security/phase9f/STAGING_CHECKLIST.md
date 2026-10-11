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
