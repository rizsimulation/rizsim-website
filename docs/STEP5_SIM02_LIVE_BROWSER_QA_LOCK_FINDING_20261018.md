# P0 Live QA — Simulation 02 confirmation compatibility fix

**Finding:** An authenticated Student used the verified live session `QA 2026-10-18 SIM02 end-to-end acceptance`; all six KR drafts were selected. TinyFish repeatedly clicked `Lock KR · 6 responses` but a native `window.confirm()` was not visibly accepted. Independent production SQL inspection showed the attempt remained `in_progress`, `0%`, with **zero persisted response rows**. This proves completion was not achieved; it does **not** prove a server scoring defect.

**Root-cause evidence:** `simulation-system-1-system-2.html` uses native JS `confirm()` in both `lockReview` and `lockLT`. The original synthetic Playwright test explicitly installed `page.on('dialog', ... accept())`. TinyFish's visual browser could not handle the native dialog.

**Fix:** Replace only these classroom decision confirmation paths with an accessible on-page dialog with explicit `Go back` and `Confirm & lock` controls and Escape support. The original six KR, four LT, six KG decisions, randomized order, private scoring and server permissions stay unchanged.

**Critical integration detail:** The hosted adapter wraps `lockReview` and `lockLT` to enforce server-side updates. The on-page `Confirm & lock` button re-invokes the globally WRAPPED function with `confirmed=true`, so the server write occurs only after confirmation. A cancelled dialog must leave the stage as an editable draft.

**Regression gates:** The isolated browser test now checks dialog visible, KR cancel/no write, KR accept/persist, each of four LT accept/persist, KG accept/submit, authenticated personal result, reload read-only, and no unexpected native JS dialog. Existing SQL security tests remain unchanged.

**Release limitation:** Until browser CI passes and a new production SHA is deployed, do not claim TinyFish E2E pass. Run the real Student attempt again after release, then verify the real Faculty results and segregate QA attempts from academic research records.

**Resolution identified in isolated CI:** An older `bridge_student.js` proxy accepted only the original stage/index arguments. The accessible confirmation callback passes a `confirmed=true` flag through the wrapper chain. That proxy initially dropped it, so the dialog reopened and no database request occurred. Both `lockReview` and `lockLT` bridge wrappers now transparently forward additional arguments. With this correction, the isolated Student+Faculty Playwright browser suite and PostgreSQL security suite succeeded at commit `7b0a2e5`.

**Release gate:** Run the full suite again on the clean (noninstrumented) tests; then obtain Owner authorization before merging PR #39 and retrying live E2E. No paid TinyFish browser action can be considered passed until that new deployment is verified.
