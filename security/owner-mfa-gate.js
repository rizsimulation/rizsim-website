// Phase 9F. Staging-only Owner MFA gate. This is UI assistance, NOT an
// authorization boundary; the server must separately require aal2 for Owner RPCs.
const GATES = ["authGate", "disabledGate", "legacyGate", "ownerMfaGate"];

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

function openGate(message, enrollment) {
  for (const id of GATES) document.getElementById(id)?.classList.add("hidden");
  document.getElementById("authenticatedApp")?.classList.remove("show");
  document.getElementById("authenticatedHeader")?.classList.add("hidden");
  const gate = document.getElementById("ownerMfaGate");
  if (!gate) throw new Error("Owner verification screen is unavailable");
  gate.classList.remove("hidden");
  setText("ownerMfaGateStatus", message);
  document.getElementById("ownerMfaEnrollActions").hidden = !enrollment;
  document.getElementById("ownerMfaChallengeForm").hidden = enrollment;
}

function errorToMessage(error) {
  if (!error) return "Authentication could not be verified.";
  // Do not expose tokens or raw backend messages in the browser.
  return "Authenticator verification failed. Check the six-digit code and try again.";
}

/**
 * Only call after getUser() and the active Owner membership have been checked.
 * Returns false for an Owner without an enrolled factor (requires voluntary setup).
 * Returns true only after Supabase reports AAL2 on the current session.
 * Note: a server-side AAL2 check is still mandatory for every Owner privileged route.
 */
export async function requireOwnerAal2(supabase, expectedUserId) {
  let gate = document.getElementById("ownerMfaGate");
  if (!gate) throw new Error("Owner verification screen is unavailable");

  try {
    const { data: assurance, error: assuranceError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError) throw assuranceError;
    if (assurance?.currentLevel === "aal2") {
      gate.classList.add("hidden");
      return true;
    }

    const { data: listing, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) throw listError;
    const factor = (listing?.totp || []).find(f => f.status === "verified");
    if (!factor) {
      openGate(
        "Your Owner account needs a verified authenticator before Owner controls can be opened.",
        true
      );
      return false;
    }

    openGate("Enter the code from your authenticator app to continue.", false);
    const form = document.getElementById("ownerMfaChallengeForm");
    const input = document.getElementById("ownerMfaCode");
    const submit = document.getElementById("ownerMfaVerifyButton");
    if (!form || !input || !submit) throw new Error("Owner verification form is unavailable");

    // Code is never transmitted through analytics or persisted by this gate.
    return await new Promise(resolve => {
      let working = false;
      form.onsubmit = async event => {
        event.preventDefault();
        if (working) return;
        const code = input.value.trim();
        if (!/^\d{6}$/.test(code)) {
          setText("ownerMfaGateStatus", "Enter a valid six-digit code.");
          return;
        }
        working = true;
        submit.disabled = true;
        try {
          const { data: identity, error: userError } = await supabase.auth.getUser();
          if (userError || identity?.user?.id !== expectedUserId)
            throw new Error("Owner session changed. Please sign in again.");
          const { data: challenge, error: challengeError } =
            await supabase.auth.mfa.challenge({ factorId: factor.id });
          if (challengeError) throw challengeError;
          const { error: verifyError } = await supabase.auth.mfa.verify({
            factorId: factor.id, challengeId: challenge.id, code
          });
          if (verifyError) throw verifyError;
          const { data: confirmed, error: recheckError } =
            await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (recheckError || confirmed?.currentLevel !== "aal2")
            throw new Error("Additional verification is required.");
          input.value = "";
          form.onsubmit = null;
          gate.classList.add("hidden");
          resolve(true);
        } catch (error) {
          input.value = "";
          setText("ownerMfaGateStatus", errorToMessage(error));
        } finally {
          working = false;
          submit.disabled = false;
        }
      };
    });
  } catch (error) {
    openGate("Owner MFA could not be verified. Sign out and try again.", true);
    document.getElementById("ownerMfaEnrollActions").hidden = true;
    return false;
  }
}
