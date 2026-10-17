# RizSim Live Classroom V13 — Side-panel workspace (APPROVED CONCEPT, DEFERRED IMPLEMENTATION)

**Status:** Historical approved concept, superseded where specified by the Owner's 18 October 2026 Step 4 refinements. The implemented V13+three-simulation experience remains in draft PR #37; no production release is approved.

## Objective
Classroom hosts should switch functions within one authenticated workspace instead of scrolling through a long single page. Keep the official sea-glass navigation, teal buttons, verified session access and identity/role permissions. The former floating/pinned QR feature is superseded by Studio-only Share Access.

## Navigation
A premium, compact vertical workspace rail inside **Live Classroom**:
1. **Session Studio**: authenticated session control, learning content and access
2. **Student Results**: authorized roster, per-Student progress and full individual learning report
3. **Class Insights**: real aggregate results, KR/KG changes, question breakdown, source-transfer pathways and group comparisons

The rail is **expanded by default**, with a labeled collapse control (to icons with tooltips); a single selected section shows in the content pane at once. Restore expanded state on the next visit by default unless the same browser explicitly collapsed it. Preserve keyboard focus, aria-current/aria-expanded semantics, announcements and mobile behavior. Small screens should use an accessible drawer, not permanently consume page width.

## Session Studio by account mode
- **Ordinary Faculty running a licensed simulation**: existing session setup and Live/Practice status; drag-and-drop permitted class materials, and QR/code/link for student entry. Use the dedicated Studio Share Access QR/code/link view; do not show a pinned or floating button.
- **Course Lead, running their own course**: course environment opens first with add simulation / add learning resource and existing authorized resource controls. The same Studio has a clearly separated **Share Access** subview for QR, session code and join link; faculty should not need to scroll to the bottom to find it. Creating or saving a course remains separate from Publish to Class.
- **Faculty running a purchased course**: purchased course resources/environment opens first, with **Share Access** as the distinct subview. No editing privileges beyond actual purchase and account role.
- Preserve all existing session identifiers, tokens, expiry, licences and real data access checks. No duplicate token/link generation.
- Where a specific role or course cannot use an operation, hide or disable just that operation without showing an alternate unauthorized workflow.

## Student Results
- Per-Student row: real name, % **committed** progress, 0–14 committed decisions (Simulation 01), current KR/LT/KG stage, submitted/in-progress status.
- Open full read-only Student Results mirror: four scores, KR/KG comparison, transition totals, CC/IC/CI/II transfer, individual source/transfer explanation and Faculty-only answer review.
- When incomplete, show only committed stages and clearly label the result pending. Never infer missing scores, duplicate participation or reveal another course/Faculty's students.
- Long list stays scrollable **inside** Student Results, not in the overall classroom pane.

## Class Insights
- Same server-scoped Faculty analytics introduced in Simulation 01. Only show for a selected authorized session and compatible simulation.
- Real data, no synthetic class observations or inferred denominator from partial responses.
- Group comparisons descriptive and explicit about within-session change versus causal claims.

## Safeguards & acceptance
- One persistent Live Classroom session context shared by Studio, Results and Insights.
- All three views use the existing DOM and listeners wherever feasible; no parallel Player or separate login.
- Session access remains discoverable after expanding the collapsed rail and opening Studio → Share Access. No independent floating QR reopen control.
- Switch tabs without reloading/resubmitting forms or losing unsent text/upload state.
- Desktop at 1280px, laptop 1024px, iPad and 390px phone keyboard/tab order and active tab semantics.
- Retain V5–V12 regression and V13 browser tests, Course Lead authoring, purchased course read-only rights and personal session scope.
- Implement and QA on a separate **draft branch** before requesting Owner approval to merge and release the first licensed simulation.

## Delivery priority
First: Simulation 01 Faculty individual report and 0–100% per-Student progress (PR #33).
Next: V13 side-panel implementation, integrated with the first simulation release candidate only after separate QA.
Last: owner-approved migrations, authenticated acceptance, deployment and actual product publication. 
