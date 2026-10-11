# Phase 9F — Owner TOTP preview: NOT FOR PRODUCTION

This is an **isolated, review-only** proof of concept at `security/owner-mfa.html` and `security/owner-mfa.js`.

**Do not merge or deploy this prototype until complete security gates are met.** The existing RizSim Google OAuth login remains unchanged, so TOTP enrollment here does NOT enforce MFA on subsequent Owner operations, and no AAL2 requirement exists yet on Owner database RPCs. No RizSim premium visual system or user content is altered by this PR.

## Preliminary UI behavior
- Uses the existing logged-in Supabase session via the public publishable key.
- Verifies the current user's active **Owner** membership using `access_out_members` before offering self-enrollment.
- Calls Supabase's documented MFA APIs (`listFactors`, `enroll`, `challenge`, `verify`, `getAuthenticatorAssuranceLevel`) and keeps the QR code and setup secret in memory. They are not sent to any external QR generation service.
- Gives access-denied or sign-in guidance instead of creating a factor for a non-Owner account.
- Protects the preview from search indexing and adds a page-level Content Security Policy. **This is not an authorization or data-access boundary.**
- No `auth.mfa.unenroll` or automatic account-side administration is included; losing the authenticator requires an established account recovery policy.

## Blockers before enabling on RizSim
1. **Server-side enforcement:** Guard all privileged Owner-only and commercial RPCs, and their direct RLS alternatives, with an AAL2 policy that preserves existing authorization. A frontend prompt is insufficient. Test the distinction between Owner and Admin, Faculty, Course Lead.
2. **Authentication integration:** After Google OAuth, detect `nextLevel` and challenge the existing factor before exposing Owner controls. Handle expired challenges, errors, sign-out, recovery and future AAL2 downgrades. Never call non-read-only Owner RPCs before assurance checks.
3. **Enrollment & recovery:** Explicit Owner opt-in and QR scan; private TOTP challenge entered only on trusted deployed host. Document second-factor recovery, device loss, and support ownership. Provide staged rollout to avoid locking out the sole Owner.
4. **Staging QA:** Validate the code with a test Supabase project/user, including failed OTP, existing factor, no factor, non-owner, revoked Owner, and session refresh. Use separate staging credentials and no genuine user data.
5. **Security testing:** Test RLS and privileged function calls under both `aal1` and `aal2` using actual Auth-issued JWTs. Re-run advisor checks and regression tests.
6. **Design parity:** Future integrated screens must preserve the locked premium RizSim brand, sea-glass palette, teal actions, floating login, navigation, hover states and existing swipe behavior.

**Current production baseline (2026-10-11):** 4 Auth users, 0 enrolled MFA factors; this prototype has not changed either count. No production MFA changes or deployment were performed.

Reference: https://supabase.com/docs/guides/auth/auth-mfa


## Staging Owner sign-in challenge module

The review branch contains `security/owner-mfa-gate.js`, a **non-deployed** JavaScript module exporting `requireOwnerAal2(supabase, expectedUserId)`. It checks Supabase's AAL, checks for a verified factor and challenges the current session; it must be wired into `access-out.html` in a subsequent isolated test commit, **not on the public live website**.

Integration requirements before use:
1. Add a hidden `ownerMfaGate` section with `ownerMfaGateStatus`, `ownerMfaEnrollActions`, `ownerMfaChallengeForm`, `ownerMfaCode`, and `ownerMfaVerifyButton`. The enrollment action must direct the Owner to the verified setup route only after review and must not expose private QR data to logs.
2. Import `requireOwnerAal2` in the existing module script. In `verifyAccess()`, **after verified active Owner membership, and before `claimApprovedInstitutionAccess()`, `showAuthenticatedApp()` or `loadPortalData()`**, invoke `await requireOwnerAal2(supabase, currentUser.id)`. If it returns false, exit immediately without loading Owner data.
3. Review and modify `verifyAccess()`'s exception/fallback path so that an Owner can **never** fall back to `showAuthenticatedApp()` without a fresh AAL2 check. A frontend gate by itself is not security; it is merely UX.
4. Audit Owner-only `private.is_rizsim_owner()`, `public.is_rizsim_owner()`, and related `can_manage_rizsim_content()` role checks, their direct RLS policies, privileged write RPCs, plus historical session/response read paths. Implement **database-side AAL2 enforcement** without accidentally denying existing Admin/Faculty/Course Lead access or turning Account recovery into a lockout.
5. Exercise a deliberately enrolled **staging Owner** with correct and incorrect codes, token refresh, Google OAuth, multiple browsers, sign-out, no factor, and revoked role. An isolated Supabase project is currently **not present**; therefore this module has not been authenticated end-to-end.
6. Ensure the proposed hidden gate is not inserted into the production website until staging tests and the recovery plan pass. Do not mark the review PR ready or merge solely because the JavaScript file compiles.

No production database access controls or MFA enrollments have been altered.
