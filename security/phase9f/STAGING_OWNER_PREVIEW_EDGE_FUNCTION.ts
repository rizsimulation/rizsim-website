// RizSim Phase 9F -- intentionally retired staging HTML preview endpoint.
// Supabase Edge Functions rewrite GET text/html into text/plain. This URL
// cannot be an HTML login page. Keep the credential flow OFF this endpoint.
// Browser MFA testing must use a properly hosted static HTML origin, or the
// approved local staging-only test file. Production website is untouched.
const message = [
  "RizSim Phase 9F — staging preview not available at this URL.",
  "",
  "Supabase Edge Functions do not serve HTML pages. The GET response is",
  "deliberately rewritten to plain text by Supabase.",
  "",
  "Do not enter staging or production credentials here.",
  "Open the reviewed staging-only local HTML test file from the Phase 9F handoff",
  "or wait for a separate static staging host.",
  "",
  "This is not a production RizSim website page. Release remains on HOLD."
].join("\n");
Deno.serve((_request: Request) => new Response(message, {
  status: 410,
  headers: {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY"
  }
}));
