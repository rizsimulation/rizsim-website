// Phase 9F review-only prototype. Do not deploy until Owner sign-in challenge
// and database-side AAL2 enforcement have passed staging regression tests.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/+esm";

const supabase = createClient(
  "https://sqjosrywtevdnkdxflns.supabase.co",
  "sb_publishable_ClR9KlRd5l7gtp2lQHrciA_9AD6HHAQ"
);
const $ = id => document.getElementById(id);
// STAGING ONLY: this test harness never signs users into production.
let factorId = null;
let secret = null;
let challengeId = null;
let working = false;

function status(message, type = "") {
  $("status").textContent = message;
  $("status").className = "status" + (type ? " " + type : "");
}
function panel(id) {
  ["signInPanel","deniedPanel","enrollPanel","scanPanel","challengePanel","verifiedPanel"]
    .forEach(k => { $(k).hidden = k !== id; });
  $("qaPanel").hidden = !["enrollPanel","scanPanel","challengePanel","verifiedPanel"].includes(id);
}
function busy(value) {
  working = value;
  ["beginEnroll","verifyButton","stepUpButton","runStagingChecks","backupEnrollButton"].forEach(id => {
    const b = $(id); if (b) b.disabled = value;
  });
}
function safeError(error) {
  status(error?.message || "Unable to complete this step. Please try again.", "error");
}
async function ownerIsActive(user) {
  if (!user) return false;
  const { data, error } = await supabase.from("access_out_members")
    .select("role,active").eq("user_id", user.id).maybeSingle();
  if (error) throw error;
  return data?.role === "owner" && data?.active === true;
}
async function currentAssurance() {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  return data;
}
async function showFactorState() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  const verified = data?.totp?.filter(x => x.status === "verified") || [];
  if (verified.length) {
    if (!verified.some(f => f.id === factorId)) factorId = verified[0].id;
    const factorPicker = $("factorPicker");
    factorPicker.replaceChildren();
    verified.forEach((f, i) => {
      const option = document.createElement("option");
      option.value = f.id;
      option.textContent = f.friendly_name || ("Authenticator " + (i + 1));
      factorPicker.append(option);
    });
    factorPicker.value = factorId;
    $("factorPickerWrap").hidden = verified.length < 2;
    $("verifiedCount").textContent = String(verified.length);
    const a = await currentAssurance();
    $("backupEnrollButton").hidden = a?.currentLevel !== "aal2" || verified.length >= 2;
    panel("verifiedPanel");
    $("assuranceText").textContent = a?.currentLevel === "aal2"
      ? "Your current session has authenticator assurance level AAL2."
      : "A factor is enrolled, but this session still requires authenticator verification.";
    $("stepUpButton").hidden = a?.currentLevel === "aal2";
    status("An authenticator is already enrolled for this Owner account.", "success");
  } else {
    panel("enrollPanel");
    status("Owner membership confirmed. No verified TOTP factor found.");
  }
}
async function beginEnroll() {
  if (working) return;
  busy(true);
  try {
    const { data: identity, error: idError } = await supabase.auth.getUser();
    if (idError) throw idError;
    if (!await ownerIsActive(identity?.user)) {
      panel("deniedPanel");
      status("Owner access verification failed.", "error");
      return;
    }
    const { data: existing, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) throw listError;
    const enrolled = existing?.totp?.filter(f => f.status === "verified") || [];
    if (enrolled.length >= 2) throw Error("Two verified authenticators are already registered.");
    if (enrolled.length) {
      const assurance = await currentAssurance();
      if (assurance?.currentLevel !== "aal2") {
        throw Error("Verify an existing authenticator before adding a backup factor.");
      }
    }
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: enrolled.length
        ? "RizSim Owner Backup Authenticator" : "RizSim Owner Authenticator"
    });
    if (error) throw error;
    factorId = data.id;
    secret = data.totp?.secret || null;
    const rawQr = data.totp?.qr_code || "";
    // Supabase returns an SVG data URI; never fetch from external image services.
    if (!rawQr.startsWith("data:image/svg+xml") || rawQr.length > 30000) {
      throw Error("The authenticator QR code had an unexpected format.");
    }
    $("qrCode").src = rawQr;
    $("manualKey").textContent = "";
    $("manualKey").hidden = true;
    $("showManual").hidden = false;
    panel("scanPanel");
    $("challengePanel").hidden = false;
    $("codeHeading").textContent = "Confirm your authenticator";
    status("Scan the private QR code and enter the current six-digit code.");
  } catch (e) { safeError(e); } finally { busy(false); }
}
async function verifyCode(event) {
  event.preventDefault();
  if (working) return;
  const code = $("otp").value.trim();
  if (!/^\d{6}$/.test(code)) {
    status("Enter exactly six digits.", "error"); return;
  }
  busy(true);
  try {
    const { data: identity, error: idError } = await supabase.auth.getUser();
    if (idError) throw idError;
    if (!await ownerIsActive(identity?.user)) throw Error("This is not an active Owner session.");
    if (!factorId) throw Error("Start the setup process before verifying a code.");
    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) throw challengeError;
    challengeId = challenge.id;
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
    if (error) throw error;
    $("otp").value = "";
    $("qrCode").removeAttribute("src");
    secret = null;
    $("manualKey").textContent = "";
    challengeId = null;
    await showFactorState();
  } catch (e) { safeError(e); } finally { busy(false); }
}
async function stepUp() {
  if (!factorId) return;
  panel("challengePanel");
  $("scanPanel").hidden = true;
  $("codeHeading").textContent = "Verify this sign-in";
  $("otp").value = "";
  status("Enter a fresh six-digit code to upgrade this session.");
}
async function stagingSignIn(event) {
  event.preventDefault();
  if (working) return;
  const email = $("stagingEmail").value.trim();
  const password = $("stagingPassword").value;
  if (!email || !password) {
    status("Use the disposable staging test account.", "error");
    return;
  }
  busy(true);
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    $("stagingPassword").value = "";
    await init();
  } catch (error) {
    $("stagingPassword").value = "";
    status("Staging sign-in unsuccessful. Check your test credentials.", "error");
  } finally { busy(false); }
}
async function stagingSignOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    $("stagingPassword").value = "";
    $("qrCode").removeAttribute("src");
    secret = null;
    factorId = null;
    challengeId = null;
    panel("signInPanel");
    status("Signed out of staging.");
  } catch (error) {
    status("Could not sign out of staging. Try again.", "error");
  }
}


/* Real staging-session smoke tests. No passwords, tokens, TOTP values,
   user identities or private files are included in the visible report.
   Deliberately invalid file IDs test the authenticated request path only. */
async function runStagingChecks() {
  if (working) return;
  busy(true);
  $("qaResults").textContent = "Testing staging session and protected endpoints…";
  try {
    const identity = await supabase.auth.getUser();
    if (identity.error || !identity.data?.user || !await ownerIsActive(identity.data.user)) {
      throw Error("Sign in with the disposable staging Owner test account first.");
    }
    const assurance = await currentAssurance();
    const actualAal = assurance?.currentLevel || "aal1";
    const expectingOwner = actualAal === "aal2";
    const [ownerGate, contentGate] = await Promise.all([
      supabase.rpc("is_rizsim_owner"),
      supabase.rpc("can_manage_rizsim_content")
    ]);
    if (ownerGate.error || contentGate.error) {
      throw Error("One or both staging permission RPCs could not be checked.");
    }
    const ownerOk = ownerGate.data === expectingOwner;
    const contentOk = contentGate.data === expectingOwner;
    // Both test calls intentionally contain invalid IDs and must return HTTP 400.
    // They prove a valid signed-in user reached the deployed function, NOT
    // permission to retrieve a protected asset.
    const [resource, course] = await Promise.all([
      supabase.functions.invoke("rizsim-resource-stream", { body: { product_id: "" } }),
      supabase.functions.invoke("rizsim-course-material-stream", { body: { material_id: "not-a-uuid" } })
    ]);
    const codeOf = result => result?.error?.context?.status ?? result?.response?.status ?? null;
    const resourceStatus = codeOf(resource), courseStatus = codeOf(course);
    const resourceOk = resourceStatus === 400, courseOk = courseStatus === 400;
    const checks = [
      ["Authenticated Owner identity", true],
      ["Owner database guard (AAL " + actualAal + ")", ownerOk],
      ["Content database guard (AAL " + actualAal + ")", contentOk],
      ["Protected resource function (expected HTTP 400; got " + (resourceStatus ?? "no status") + ")", resourceOk],
      ["Protected course file function (expected HTTP 400; got " + (courseStatus ?? "no status") + ")", courseOk]
    ];
    $("qaResults").textContent = checks.map(([name, ok]) => (ok ? "PASS — " : "FAIL — ") + name).join("\n");
    const passed = checks.every(([, ok]) => ok);
    status(passed
      ? "Staging checks passed for this session. Real file-access tests remain outstanding."
      : "At least one staging check failed. Do not approve a release.", passed ? "success" : "error");
  } catch {
    $("qaResults").textContent = "FAIL — Unable to complete the staging checks.";
    status("Staging checks could not complete. Do not approve a release.", "error");
  } finally {
    busy(false);
  }
}

async function init() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      panel("signInPanel");
      status("Sign in using your disposable staging test account only.");
      return;
    }
    if (!await ownerIsActive(data.user)) {
      panel("deniedPanel");
      status("Access denied. Active Owner membership is required.", "error");
      return;
    }
    await showFactorState();
  } catch (e) {
    panel("deniedPanel");
    safeError(e);
  }
}
$("stagingSignInForm").addEventListener("submit", stagingSignIn);
$("stagingSignOut").addEventListener("click", stagingSignOut);
$("stagingDeniedSignOut").addEventListener("click", stagingSignOut);
$("beginEnroll").addEventListener("click", beginEnroll);
$("verifyForm").addEventListener("submit", verifyCode);
$("stepUpButton").addEventListener("click", stepUp);
$("backupEnrollButton").addEventListener("click", beginEnroll);
$("factorPicker").addEventListener("change", event => {
  factorId = event.target.value;
});
$("runStagingChecks").addEventListener("click", runStagingChecks);
$("showManual").addEventListener("click", () => {
  if (!secret) return;
  $("manualKey").textContent = secret;
  $("manualKey").hidden = false;
  $("showManual").hidden = true;
});
window.addEventListener("pagehide", () => {
  secret = null;
  $("manualKey").textContent = "";
  $("qrCode").removeAttribute("src");
});
init();
