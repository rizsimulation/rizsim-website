# RizSim Design Code - Version 1.0

Approved specification: 24 October 2026. Workstream: Frontend.

This document governs current and future public pages, authentication, role-specific
workspaces, shared components, viewers and runner chrome. It is a coordinated
refinement of the existing identity, not a new theme or platform rewrite.

The rules below are the user-approved Design Code. Implementation conventions and
verification scope follow the rules. Changes require an explicit version and
change note; a future feature must not silently abandon an existing rule.

## Non-negotiable boundaries

**Preserve RizSim’s current visual identity and functionality.** This is a coordinated interface refinement, not a replacement theme or a rebuild of the platform.

Retain the existing primary theme colors, RizSim branding, R logo, authentication methods, role-based permissions, navigation structure, features, and workflows. Preserve existing content, records, integrations, live synchronization, simulation logic, assessment rules, and answer-key release controls.

Do not remove features, merge role-specific workspaces, change business logic, or relocate features to unrelated tabs simply to make the interface appear cleaner.

**Do not change the existing Google login logo.**

---

## 1. Compact, clean, and readable design

The defining characteristic of RizSim must be a **compact, premium, clearly organized workspace**.

Previous attempts at compactness have not achieved the required result. Treat this as a measurable layout requirement, not simply a request to reduce a few margins.

The objective is to **minimize unnecessary scrolling for essential tasks while maintaining readability and visual clarity**. Compact does not mean crowded, confusing, or difficult to interact with.

### Apply the Priority Scheme to every page and tab

Classify the content of each active workspace into two groups:

**Priority 1 — Essential to the immediate task**

These are the controls and information users need to understand the current state and complete the main task on that page. Depending on the actual workspace, this may include its primary action, essential inputs, active-session information, important status indicators, core navigation, or the current question and response controls.

**Priority 2 — Supporting or non-immediate information**

These are details that remain useful but are not required for the initial task, such as extended explanations, historical records, detailed analytics, supplementary guidance, or less frequently used settings.

**At normal desktop viewing sizes and 100% browser zoom, the initial viewport should contain the relevant Priority 1 content without unnecessary scrolling. Place Priority 2 content below this initial working area, accessible through intentional scrolling.**

Where appropriate, clearly labelled expandable sections may organize supporting details. However, do not hide essential controls inside collapsed sections merely to claim that the page fits on one screen.

Apply this classification **per role, per page, per active tab, and per relevant workflow state**. Do not attempt to place every feature from the entire website into a single screen.

### Layout and typography requirements

Use available horizontal space intelligently. Reduce oversized banners, unnecessary empty areas, excessive padding, repeated information, and unnecessarily tall cards.

Avoid large page headings that occupy a substantial portion of the screen. Prefer modest, clearly differentiated headings and subheadings. Use bold text selectively rather than making every heading or label visually dominant.

Use smaller but comfortably readable typography. As starting points, consider approximately **14–16 px for ordinary interface text, 12–13 px for secondary labels, and 20–24 px for workspace page headings**, adjusting where necessary for the actual design. These are guides, not permission to shrink important content excessively.

Create separation through restrained cards, light borders, dividers, spacing, icons, and subtle background differences. Avoid both extremes: an undifferentiated wall of content and an excessive number of nested boxes.

**Do not achieve compactness through tiny text, clipped content, CSS scaling, hidden overflow, overlapping elements, or multiple unnecessary internal scrollbars.** Keep controls comfortable to click or tap.

For smaller screens and enlarged text, allow sensible reflow and scrolling rather than sacrificing usability. On mobile, present essential actions first; do not force a desktop-style one-screen layout.

---

## 2. A broader, coordinated color system

The existing blue, dark-blue, and green theme colors must remain the foundation of RizSim’s identity. However, **the primary brand colors should not be the only colors used throughout the interface**.

Introduce a restrained range of complementary secondary colors to distinguish features, sections, statuses, and actions. Suitable directions may include muted amber, violet, coral, warm neutrals, or other accents that complement the existing theme.

These are possible accents, not a requirement to use every color on every page. Avoid a rainbow appearance, excessive saturation, or colors that make the website feel unrelated to its current identity.

Use color purposefully and consistently:

- **Positive or successful states:** appropriate green treatment.
- **Errors, destructive actions, and negative states:** appropriate red treatment.
- **Warnings or matters requiring attention:** appropriate amber treatment.
- **Informational, neutral, and inactive states:** suitable theme-aligned or neutral treatments.

Use subtle tinted backgrounds and small accent areas where they provide distinction without overwhelming the interface.

**Color must support understanding, not be the only way to communicate meaning.** Pair important statuses with clear labels or icons.

Do not use success or error colors on simulation answer choices in ways that reveal correctness or interfere with the established learning protocol.

---

## 3. Purposeful animations and feedback

Improve animation quality so the website feels responsive and polished. Motion must explain an interaction or communicate a state—not decorate every element.

Keep animations subtle, brief, consistent, and appropriate to an academic and professional platform. Avoid excessive bouncing, flashing, large movements, unnecessary delays, or distracting effects.

Respect reduced-motion preferences by providing static or minimally animated alternatives.

### A. Missing or invalid form inputs

When a user submits a form with a required field missing or an invalid entry:

**Highlight the entire affected input field**, using a clear red border and a restrained red-tinted background where appropriate. Show a specific explanation beside or below the field.

Move keyboard focus to the **first invalid field** and bring it into view when necessary. The user should not have to search the page to discover what went wrong.

Preserve all information already entered. Clear or update the error when the issue is resolved.

Do not repeatedly move focus while the user is typing, and do not confuse an incorrect simulation answer with an invalid form entry.

### B. Loading states

Replace dry, ambiguous loading states with a refined loading treatment consistent with RizSim’s identity.

Use an appropriate combination of a subtle branded animation, loading indicator, skeleton content, or button-level progress state. Add a short message that describes the operation, such as “Loading your workspace” or “Joining the session.”

Use full-page loading only when the entire page genuinely needs to wait. Otherwise, keep the loading indicator close to the affected component or action.

Prevent duplicate submissions while an operation is processing, without unnecessarily disabling unrelated features.

**Do not introduce artificial waiting times, fake progress percentages, or animations that continue after loading has finished.** A failed operation must transition to a clear error state rather than remain indefinitely on a loading screen.

### C. Live indicators

Use subtle animated indicators for genuinely live states, such as an active session or live connection.

Pair the animation with a readable status label. The indicator must reflect the actual system state; do not display “Live” or “Connected” merely as decoration.

### D. Task outcome animations

Use the following treatments where they are genuinely appropriate:

| Outcome | Required treatment |
|---|---|
| A non-assessment task completes successfully | A green tick animated within a circle, accompanied by a suitable message. |
| An operation fails, such as an unrecognized access code | A red cross animated within a circle, accompanied by a clear explanation. |
| A request is denied | A discreet black or neutral sad-face icon with a gentle nod, accompanied by a respectful explanation. Maintain visibility against the background. |

These animations may appear beside a button, within a status message, or inside a compact notification. **They should not automatically take over the whole screen.**

Do not force these treatments into inappropriate contexts. A missing field should normally receive inline validation, not a dramatic failure animation.

**These task-outcome animations are not for judging simulation answers. Preserve existing assessment feedback, learning-stage transitions, and answer-release rules.**

---

## 4. Hover, focus, and interaction responses

Every interactive element should provide a clear, consistent response appropriate to its function.

Buttons, links, clickable cards, tabs, menus, and icon controls should have suitable hover, active, selected, disabled, and keyboard-focus states.

Use restrained changes in background, border, shadow, or position. Avoid large movements or effects that make the layout shift.

A user should be able to distinguish an interactive element from a decorative one. Do not make non-clickable cards appear clickable.

Provide equivalent clarity for keyboard and touch interaction. Essential information or controls must not be available only on hover.

---

## 5. Website-native confirmations and dialogs

Replace application-generated browser pop-ups with confirmations and dialogs that belong visually and functionally to RizSim.

Remove the use of JavaScript **`alert()`**, **`confirm()`**, and **`prompt()`** for ordinary website workflows. Replace them with appropriately designed in-site dialogs, inline messages, or notifications.

For destructive or consequential actions, use a compact confirmation dialog that clearly explains what will happen. Give the action a specific label, such as **“Delete class,”** instead of a vague **“OK.”** Provide an obvious cancel option.

Ensure dialogs support keyboard navigation, manage focus correctly, and return focus to the initiating control when closed. Preserve existing permission checks and safeguards.

**Do not add confirmations to every minor action.** Use them where they prevent meaningful mistakes.

This requirement concerns website-generated prompts. Do not attempt to bypass browser-controlled security permissions or operating-system dialogs, and do not remove essential protection against losing unsaved work merely to suppress a browser warning.

---

## 6. Consistent, professionally drawn icons

Use recognizable, high-quality graphical icons throughout the interface.

Do not substitute emoji, arbitrary text characters, or plain text abbreviations for proper icons.

Use suitable vector icons or existing project assets for file types and actions—for example, a PDF document icon for PDFs, a presentation-file icon for PowerPoint files, a document icon for Word files, and a play icon for videos.

These icons do not need to reproduce every original brand color. A monochrome or lightly accented treatment is acceptable where it preserves recognition and blends with RizSim’s design.

Maintain consistent icon sizing, stroke weight, alignment, and visual style. Use meaningful, distinct icons rather than repeating the same generic symbol for unrelated functions.

Include accessible names for icon-only controls and visible labels where the action would otherwise be ambiguous.

**Leave the currently deployed Google login logo unchanged.**

---

## 7. Apply the code across every login role and workspace

Audit the actual application before implementing changes.

Identify the public pages, authentication screens, every existing login role, and each role’s pages, tabs, forms, dialogs, and shared components.

Apply the RizSim Design Code throughout these areas—not just to the homepage or the most visible dashboard.

Shared components should feel consistent across roles, while each role retains its own relevant tasks, information, permissions, and navigation.

Where roles share a component, improve the shared implementation rather than creating several slightly different versions.

Cover normal, empty, loading, validation, success, failure, denied-access, and disabled states wherever those states exist.

**Interface improvements must not expose another role’s information, alter access restrictions, or interfere with student–faculty workflows.**

---

## 8. Make the design code persistent and extendable

Treat this as **RizSim Design Code, Version 1.0**. I may add further rules later.

Create a persistent project document, such as **`RIZSIM_DESIGN_CODE.md`**, containing the agreed rules and the implementation conventions used to satisfy them.

Define reusable design tokens and shared components for typography, spacing, colors, borders, corner radii, shadows, icons, motion, buttons, inputs, dialogs, notifications, and loading states.

Use the existing technology stack and suitable existing libraries wherever possible. Do not introduce unnecessary dependencies or a replacement framework solely for this visual upgrade.

Before implementing any future page, tab, feature, or component, consult and apply this design code. Reference the document from the project’s existing development instructions where appropriate.

Future rules should extend or explicitly revise the code through a clear version update. Do not silently discard earlier requirements.

**The standard must live in the project, not depend solely on remembering this conversation.**

---

## 9. Implementation and verification

Begin by reviewing the existing project and identifying its shared styling, components, routes, roles, and recurring layout problems. Briefly state the implementation approach, then proceed with the changes.

Implement the shared design foundations first, then update role-specific pages and components. Avoid unrelated functional changes.

Validate the result on representative desktop and mobile sizes, including desktop viewports around **1366 × 768** and **1440 × 900**, at normal browser zoom. Also check that increased text size and narrower screens do not cause clipping or inaccessible controls.

For each important workspace, verify that:

- Priority 1 content is visible without unnecessary desktop scrolling, while Priority 2 content remains accessible.
- Text, controls, icons, and spacing remain readable and usable.
- Colors, animations, validation, loading states, and confirmations follow the shared code.
- Existing navigation, authentication, permissions, data handling, and workflows still function correctly.

Test actual interactions, not just screenshots. Where access or testing is unavailable, identify the limitation explicitly rather than claiming that area is verified.

### Completion report

Provide a concise summary of the pages and roles updated, the shared components changed, and the checks performed. Clearly distinguish **implemented and verified**, **implemented but not verified**, and **blocked or incomplete** areas.

Do not describe the whole website as compliant when only selected pages have been updated.

## 10. Repository implementation conventions

### Shared foundation

Current production HTML entrypoints include `/rizsim-design-code.css` last in the
head and `/rizsim-design-code.js` before their application scripts. Each body has
`data-rz-design-code="1.0"` and a `data-rz-surface` value: `public`, `portal`,
`viewer` or `runner`. No framework, package, icon CDN or new external service is
introduced. Archived `preview/` snapshots and standalone QA harness pages are not
production role workspaces and are intentionally not rewritten.

Tokens use `--rz-dc-*`. Brand tokens in `site.css`, the official logo assets,
`google-g.svg`, OAuth/session code and assessment assets remain authoritative.
Shared spacing is based on 4/8/12/16/24 px; ordinary UI is 15 px, secondary text
13 px and labels 12 px, expressed in rem for enlargement. Workspace headings are
24 px; public storytelling headings may be larger without becoming banners.

### Priority 1 and Priority 2

The role/tab/state matrix is in `docs/design-code-v1-coverage.md`. Classify the
*active task*, not the entire role. Do not collapse or omit a required field to
make a screenshot pass. Optional descriptive prose can use native `details` with
an explicit `summary`. Owner governance stays in Administration; same-page
shortcuts focus existing panels and do not create new permissions or move tools
to unrelated tabs. Long record lists and details follow the task controls.

Existing authorization visibility (`hidden`, role gates, selected views and
server-checked contracts) must never be overridden by broad `display` rules.

### Operational feedback, not assessment feedback

`window.RizSimUI` exposes:

- `confirm(message, {title, action, cancel, danger}) -> Promise<boolean>` and
  `prompt(message, initialValue, options) -> Promise<string|null>`. Always await
  before the existing consequential action; Cancel/Escape returns false/null.
- `feedback(elementOrId, message, tone)` and `notify(message, tone)`, with tones
  `success`, `error`, `denied`, `warning`, `info`, `loading`. Use explicit tones
  when integrating new workflows; existing operational status containers have
  a conservative adapter. Clear failures stay visible until corrected/dismissed.
- `fieldError(input, message)`, `invalid(input, message)` and `reveal(input)`.
  Only validation on submission may move focus; correction events clear an error
  without moving focus or discarding entered values.
- `busyStart(key, operationLabel)` / `busyEnd(key)`. Pair through `finally` in new
  asynchronous actions. Do not disable unrelated navigation. Existing
  server-side authorization and original application loading guards remain.
- `icon(name)` and `fileIcon(metadata)` return safe SVG DOM nodes. Icon-only
  buttons need an accessible action name; decorative SVGs are aria-hidden.

Never pass an assessment choice, mark, answer validity, feedback stage or sealed
result to operational outcome helpers. Runner integration changes chrome and the
local-record import/reset confirmations only, not stimuli or score logic.

Dialogs use native HTML dialog semantics, a keyboard containment implementation,
safe initial focus and restored initiating focus. A fallback uses an inert
background; it never falls back to browser `confirm`. Messages use `textContent`,
not untrusted HTML. Unsaved-work and browser-controlled security prompts remain.

Publication shows actual Checking/Saving/Refreshing/Complete stages, not fake
percentages or timed completion pauses. Live dots remain driven by the existing
session state and timestamps. Reduced-motion preferences stop decorative motion.

### Role and environment boundaries

The inspected V15.5.3 application has active Student, Faculty, Course Lead,
Institution, Admin and Owner workspaces. Course Lead is the premium Faculty tier.
`category_manager`, `publisher`, `teacher`, `simulation_manager` and
`analytics_viewer` are legacy portal roles in current source, not new workspaces
that the design layer may activate. Preserve their existing gates.

No migration, RLS policy, database function, Edge Function, auth method, payment
integration or backend gate is changed by this frontend release. Backend Phase
9F Gate 4B/Gate 5 certification is a separate workstream.

### Verification and change control

Run `node scripts/validate_design_code_v1.cjs` and
`python scripts/test_design_code_v1.py`, plus affected existing regression suites.
The browser matrix uses the actual HTML and intercepted synthetic backend modules
at 1366x768, 1440x900 and 390x844, plus enlarged text. External requests are blocked;
no real learner account or production write is permitted. Save JSON measurements,
interaction outcomes and screenshots as GitHub Actions artifacts. Inspect visual
output before release; passing a syntax check alone is not visual acceptance.

Record implemented-and-verified, implemented-but-not-verified and incomplete
areas separately in release notes. A successful synthetic test is not proof of
signed-in production acceptance, full backend security or disaster recovery.
Check current `main` before merging and verify GitHub Pages and deployed assets.
Never use TinyFish. Consult this file before future UI changes.

## 11. Version history

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-10-24 | Initial approved Design Code; shared foundation and role-specific adoption. Actual acceptance evidence is recorded with the release, not assumed by this document. |

## Design Code 1.4 - learner return, code errors and analytical surfaces

The 25 October 2026 Frontend extension is defined by `RIZSIM_ANALYTICS_DASHBOARD_CODE.md` and `docs/design-code-v1.4-analytics.md`. Existing primitive API and `data-rz-design-code="1.0"` opt-in remain compatible; the extension does not rename or remove them.

Original-tab return must preserve the simulation and saved choices. Request focus synchronously from a learner action, target only the original same-origin Classroom, and treat browser focus as best-effort. Use one compact inline status with an explicit retry/reopen action. Do not automatically open another Classroom or claim a messaging acknowledgement proves foreground focus.

A complete unrecognized eight-character Practice code uses exactly **Session not found**, the whole input in red, the shared brief circled-cross animation, retained input text and restored keyboard focus. Editing clears the error. Incomplete codes, closed/scheduled sessions, expired/revoked access, Live-only sessions and authorization failures retain their distinct existing meanings. Never change permission checks to simplify an error screen.

Analytics Dashboard Code 1.0 applies to every currently integrated simulation Presenter Dashboard and Live Responses interface. Prioritize live participation and presenter decisions, paired learning change, supported transfer pathways and honest denominators. Deeper distributions, comparisons and existing native detail reports follow below. No fabricated example values, private keys, new backend queries or unsupported causal claims are allowed. Empty and small-sample states are part of the design, not a reason to insert mock data.

Release completion requires actual mounted-interface regression tests, source review, a scoped PR, main reconciliation and exact production-asset verification. See the Master Status and release evidence for the tested state; documentation alone is not deployment proof.
