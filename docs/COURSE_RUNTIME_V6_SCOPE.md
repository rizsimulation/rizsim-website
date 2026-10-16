# Course-running environment and resource publishing (V6)

This phase changes the faculty Live Classroom course-running experience and resource publishing. It does not redesign the Courses builder or student workspace.

## Approved interpretation
The user's final explicit clarification permits ordinary Faculty to add files or links to a standalone simulation session. This is a manual, session-bound composer, not a reusable course library. Owned courses are Course Lead-only; purchased courses may be used by licensed Faculty or Course Leads but their publisher content cannot be edited.

## Course environment
The left column lists included simulations and the account's sessions. Run opens the existing authorized setup for the selected simulation. Codes, links, QR, closure, roster and results retain existing mechanisms. The right column contains reusable resources. Publish to Class confirms visibility without asking for the source or metadata again; Revoke removes classroom visibility without deleting the resource. Owned-course Add New Resource opens the shared composer. Purchased-course consumers have no Add or editing controls.

Publication applies to eligible learner sessions of the owned course, or eligible sessions under the purchaser's own course licence. This phase does not introduce a separate cohort-management model. Existing student data-read and protected-stream interfaces are extended without changing the student layout. Previously downloaded files or copied external links cannot be recalled; subsequent RizSim access checks enforce current publication state.

## Unified composer
Enter a complete HTTP/HTTPS link or browse/drop a file. Link-format validation and file-header validation precede the enabled source Publish action. Selected filename, type icon and size appear below the drop area. The floating metadata form asks for title, description and a selectable resource-type option, not the source again. Final publication waits for server confirmation. Failed saves do not show success; retries reuse the resource/upload identifier. The success dialog has a top-right close control.

Protected formats remain PDF, PNG and JPEG, up to 25 MB, matching the secured viewer. Unsupported files are rejected with an explanation. No public bucket or long-lived public file URL is introduced.

## Authorization and preservation
Existing server-backed roles, ownership and simulation licences remain authoritative. New session-resource operations require the creator's active standalone session. New tables have RLS; ordinary Faculty cannot directly write entitlements or the publisher catalogue. Controlled functions validate resource/course/licence/account bindings. Account-bound caches discard stale asynchronous results after account changes.

Existing student-visible resources retain visibility during schema transition. Previously private teaching notes and other nonstudent resources are not silently published. Builder-created resources now default to unpublished and can be released from the runtime. Revoke never deletes materials, courses, sessions or submissions.

## Purchased courses
Runtime lists only active publisher-listed explicitly assigned course licences. It never relabels faculty-created courses as purchases or grants access from a URL. No products, purchases, orders or user entitlements are fabricated. Publisher checkout, authoring and provisioning UI remain future work. Provision a purchased-course licence alongside the included simulations' existing entitlements: creation checks both and session timing cannot exceed either licence. Revocation closes only sessions linked to the revoked purchased-course licence, preserving records. A production catalogue may therefore remain empty until actual content and entitlements are provisioned.

## Verification
Initial complete successful run: 38901877290, tested source commit 3cc0e962b8cf9c9c92fcd3b6e333050eb9f230dd. It passed 118 browser assertions (45 original, 18 extended, 16 session confirmation, 39 course/resource), 27 isolated PostgreSQL assertions and 16 protected-stream contract checks. The browser uses the actual portal with synthetic backend fixtures; database and stream tests use isolated fixtures. No paid TinyFish run or new signed-in production rehearsal is claimed.

Temporary source-transport and generating workflows are removed from the release tree. Permanent CI checks exact committed source read-only. The final release must pass it again. Production checks compare 15 public files with the release and check the protected endpoint denies unauthenticated requests.

## Deployment and limitations
Apply the additive migration only after green tests/review, verify schema/grants, deploy the protected stream extension with JWT verification, merge the frontend, confirm Pages success and matching production hashes. Do not deploy test fixtures or identities to the backend. No new user grants or licence creation is part of deployment.

Pre-existing Supabase advisor notices include authenticated SECURITY DEFINER RPC exposure warnings, two deny-by-default RLS tables without policies and disabled leaked-password protection. RPCs are intentionally auth/ownership checked; this release does not claim to eliminate unrelated baseline notices. New service-only tables intentionally have no client policies or grants.

Student-interface redesign and Courses-builder configuration are explicitly deferred. Live-account acceptance is not a substitute for these automated checks, nor are automated checks proof of every live-account scenario.
