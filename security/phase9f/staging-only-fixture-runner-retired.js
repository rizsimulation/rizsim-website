// RizSim Phase 9F: retired disposable STAGING-ONLY upload/probe endpoint.
// The successful 2026-10-11 byte integrity and denial tests are complete.
// Do not re-enable without a new explicit staging QA approval.
// No credentials, signed URLs, or fixture paths are served.
Deno.serve((_req) => Response.json(
  { error: "Phase 9F staging fixture runner is retired. Test complete." },
  { status: 410, headers: {
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer"
  } }
));
