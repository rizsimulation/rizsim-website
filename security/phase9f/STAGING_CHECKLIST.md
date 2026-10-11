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
- [ ] Serve the draft prototype under an isolated test host and sign in with the *disposable staging Owner only*; never use a production account.
- [ ] Complete actual TOTP enrollment and verification with a second device; do not share the secret or code.
- [ ] Run the smoke-test button in AAL1 and again in AAL2; record only the check outcomes.
- [ ] Verify both signed-in endpoints respond HTTP 400 to invalid IDs, plus authorized and unauthorized attempts with private test PDF/PNG fixtures.
- [ ] Exercise second authenticator and lost-device recovery; do not depend on undocumented recovery codes.
- [ ] Confirm cross-role browser regressions and restore drill before any production roll-out.

**Release state: HOLD.** Static review and anonymous-denial tests alone are insufficient for approval. No production deployment or PR merge.
