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
