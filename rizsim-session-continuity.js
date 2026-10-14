/*
 * RizSim session continuity.
 * Stores only the last successfully opened workspace (not passwords, JWTs,
 * tokens, roles or authentication decisions). Supabase owns session storage.
 *
 * A saved preference NEVER grants access. Call resumeTarget() only after
 * supabase.auth.getUser() has verified the user against the Auth server.
 */
(function(root) {
  "use strict";

  const KEY = "rizsim-last-workspace-v1";
  const TYPES = { student: "access-in.html#home", faculty: "access-out.html#home" };

  function store() {
    try { return root.localStorage || null; }
    catch (_) { return null; }
  }

  function remember(portal, userId) {
    if (!Object.prototype.hasOwnProperty.call(TYPES, portal)) return false;
    if (typeof userId !== "string" || !userId.trim()) return false;
    try {
      const storage = store();
      if (!storage) return false;
      storage.setItem(KEY, JSON.stringify({ userId, portal }));
      return true;
    } catch (_) { return false; }
  }

  function forget() {
    try {
      const storage = store();
      if (!storage) return false;
      storage.removeItem(KEY);
      return true;
    } catch (_) { return false; }
  }

  function resumeTarget(user) {
    if (!user || typeof user.id !== "string") return null;
    try {
      const saved = JSON.parse(store()?.getItem(KEY) || "null");
      if (!saved || saved.userId !== user.id) return null;
      return Object.prototype.hasOwnProperty.call(TYPES, saved.portal)
        ? TYPES[saved.portal] : null;
    } catch (_) { return null; }
  }

  /*
   * Returning visitors go straight to their last *verified* workspace.
   * The caller MUST first verify the currently signed-in identity using
   * supabase.auth.getUser(); this preference never authenticates anyone.
   *
   * ?public=1 allows an intentional visit to the public Home page.
   * Only the two hard-coded portal URLs can ever be used as destinations.
   */
  function autoResume(verifiedUser, options) {
    if (!options || options.page !== "home" || options.forcePublic === true) {
      return false;
    }

    const target = resumeTarget(verifiedUser);
    if (!target || typeof options.replace !== "function") return false;

    options.replace(target);
    return true;
  }

  function isNonRetryable(error) {
    const status = Number(error?.status || 0);
    const code = String(error?.code || "").toLowerCase();
    const name = String(error?.name || "").toLowerCase();
    if (name === "authsessionmissingerror") return true;
    return status === 401 || status === 403 ||
      code === "session_not_found" || code === "invalid_refresh_token" ||
      code === "refresh_token_not_found";
  }

  async function verifyUser(client, options) {
    // getUser() verifies identity with Supabase Auth. Do not rely on user
    // objects from getSession(), local storage or user_metadata to grant access.
    const tries = Math.max(1, Math.min(3, Number(options?.tries) || 3));
    const sleep = options?.sleep || function(ms) {
      return new Promise(function(resolve) { setTimeout(resolve, ms); });
    };
    let last = { data: { user: null }, error: null };
    for (let i = 0; i < tries; i++) {
      try {
        last = await client.auth.getUser();
      } catch (error) {
        last = { data: { user: null }, error: error };
      }
      if (last?.data?.user || !last?.error || isNonRetryable(last.error)) {
        return last;
      }
      if (i < tries - 1) await sleep((i + 1) * 350);
    }
    return last;
  }

  root.RizSimSession = Object.freeze({ remember, forget, resumeTarget, autoResume, verifyUser });
})(typeof window !== "undefined" ? window : globalThis);
