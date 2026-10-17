# V9 student Practice launch and post-submission results

## Scope
Correct two observed production shortcomings without redesigning existing locked RizSim branding:
1. Student Practice opens a premium floating confirmation with selected simulation, class, saved progress, deadline and a countdown. The student can cancel/X or explicitly launch. Upon confirmation the student goes directly to the authorised simulation runner; it does **not** route via RizSimulation Player.
2. The existing secure-submission demonstration runner `simulation-test.html` no longer leaves the submitted question paper on screen with a disabled button. A **server-confirmed** success removes the questionnaire and shows a premium result summary and review of the actual saved answers, with sharing, copying and Print/Save PDF.

## Security and behavior
- Practice remains limited to the current account's joined session and existing attempt. The on-page confirmation has no server side effect until Launch. Launch reconfirms the student's account, unsubmitted state, practice window and existing RLS-protected server RPC. Never reset/create an attempt from Practice. Browser navigation goes directly to the licensed product's configured launch URL.
- The server-side original `resume_my_rizsim_student_practice` and `check_my_rizsim_classroom_attempt_access` RPCs remain authoritative and unchanged.
- Submission uses original `submit_my_rizsim_classroom_attempt` or `submit_simulation_attempt` RPC depending on attempt. Confirmation is an accessible in-page modal instead of a native browser `window.confirm`. Only a successful server response reporting status `submitted` reveals results. Failure leaves question paper and saved answers available for retry. Submitted attempts reopen in results-only mode, without edit/submit controls.
- The result view reports **responses**, **saved percentage**, and the **server-submission timestamp where available**, never inventing a grade, ranking or correctness. Review answers are loaded from the signed-in learner's current attempt and output only as text. The shareable summary omits answers by default; a checkbox explicitly opts in. No attempt UUID, classroom join code, email, or auth credentials are included. Share uses native Web Share when available, otherwise clipboard; Print/Save PDF uses the local browser.
- No new public results endpoints, shared response URLs, schemas, roles, licence grants, students or course resources. No back-end change needed. The share control is a user-initiated export; this cannot prevent deliberate onward forwarding after sharing.

## Coverage and limitations
These improvements to the submission/results page cover the bundled **RizSim Secure Submission Test** browser runner. Other independently authored simulation runners may need a corresponding post-submission integration; no universal scoring is claimed.
Preserve original public nav, Home, Faculty/Course Lead workspaces, course builder, Student sidebar, V6 resource security and historical submissions. No existing real attempt or enrolled student is changed by this release.

Tests run using pinned, isolated Playwright Chromium and PostgreSQL fixtures on GitHub Actions, **never TinyFish**, and include mobile and return-to-My-Learning behavior plus V5-V8 regressions. Production validation compares 22 public assets to the exact release SHA, but that asset check is not a signed-in student rehearsal.
