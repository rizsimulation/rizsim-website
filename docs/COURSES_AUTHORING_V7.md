# V7 Courses authoring workspace

## Scope
Courses is a Course Lead authoring workspace only. It contains Create new course and Manage created courses, but no visible session-creation, run/end, roster or results controls. Live Classroom retains the original session workflows. Hidden legacy panel homes are retained so the established runtime can move/restore its original nodes without cloning event handlers.

## Design and behavior
- Two vertical mint/lavender entry cards with icons and hover/focus actions; touch actions stay visible.
- Compact title/description bar, Add learning resource and Add simulation, followed by simulations on the left and files/URLs on the right.
- Resource source picker uses one near-screen-size dialog: browse/drop with immediate filename/type/size caption, and valid-link input below. Publish opens metadata-only details with selectable types, not a dropdown. Both windows have close controls.
- Licensed simulation picker is searchable, internally scrollable, and uses + Add to course rather than Run. Duplicate additions are prevented.
- New resources and changes are draft state until PUBLISH COURSE or SAVE CHANGES. Saving a course does not publish it to students. New resources default to private; class publication remains in Live Classroom.
- Manage loads saved course details and items into the same editor. Removed items are staged until saving. Course deletion needs confirmation.
- Ended and publisher-listed courses are read-only. Course deletion is a non-destructive authoring tombstone: historical sessions, submissions and stored files remain. Courses with open sessions or live publisher licences are refused deletion.

## Persistence and security
The new bounded adapter retains the existing authenticated client in its closure. All authoring RPCs require the verified active Course Lead and ownership. No roles, licences, session execution functions or student UI are modified. New simulation additions require active entitlements; legacy included simulations can remain when a licence expires. Removing a simulation with an open course session is rejected.

Complete course changes are committed in one database transaction after private file staging. A revision token rejects stale edits. Request receipts support unchanged network retries without duplicate courses; changed payloads cannot reuse an old receipt. Storage and database are separate services: abandoned private staged objects may require later maintenance and are not represented as an atomic cross-service transaction.

Two new RLS-protected tables track upload reservations and save receipts. Direct client writes are revoked; signed-in reads are owner-scoped. Public/anonymous RPC execution is revoked. The staged storage prefix is bound to a reserved course UUID, the authenticated uploader and a resource UUID, and cannot access standalone-session prefixes. Existing stream authorization remains unchanged.

## Verification and release limits
The verification workflows use isolated synthetic browser fixtures and a disposable PostgreSQL database, never production test users. They include the established V5/V6 suites, protected-stream checks, desktop/mobile authoring, creation/edit/removal, error/retry, role restrictions, private-resource defaults and stale-edit safeguards. Production verification compares 18 served public asset hashes to the exact release; it is not a signed-in acceptance test.

A successful exact-source workflow, a verified additive schema application and successful Pages plus production-byte checks are required before calling V7 live. Chronological PR comments carry run IDs and final deployment status.

Student workspace redesign, publisher checkout/provisioning and further purchased-course authoring are outside this phase. Existing protected upload limits remain PDF/PNG/JPEG up to 25 MB. Nothing requires paid browser automation.
