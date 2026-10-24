# RizSim Design Code 1.1 - quiet controls and purposeful motion

Authorized frontend refinement, 24 October 2026. Extends the canonical v1.0 rules;
this addendum takes precedence only for the refinements below. Branding, Google
artwork, assessments, permissions and backend contracts are not changed.

## What changes

1. Faculty Classroom menu Explore actions use warm amber text and a pale amber
   surface, rather than the same heavy teal treatment as primary task actions.
   On fine-pointer, hover-capable devices they appear on card hover or keyboard
   focus within the card. Touch users always see the control. Space is retained
   so revealing the control does not reflow the card. Only the menu Explore
   affordance is concealed; Start, Submit, validation and locked-tier guidance
   remain visible. Do not use visibility:hidden, display:none, tabindex=-1 or
   aria-hidden on these interactive links to implement the desktop reveal.
2. Supporting buttons and tab navigation use readable, purposeful text colors,
   restrained surfaces and lighter font weight. Teal anchors primary operations;
   violet distinguishes results; red remains destructive/negative. Color is
   always accompanied by the existing action label. No arbitrary rainbow palette
   and no pale text on light backgrounds.
3. Existing cards become lighter, with white-dominant backgrounds, muted tints,
   thin borders and subtle hover depth. Do not make non-interactive content look
   clickable. Keep existing headings, descriptions, routes and entitlement gates.
4. Motion is local and brief: hover reveal, small card elevation, perceptible
   outcome strokes/nod and refined existing loading indicators. Never add a
   fake Live status, timed success, delay, fake progress or correctness animation.
   Reduced-motion preference removes nonessential movement.

## Integration

`rizsim-visual-refinement-v11.css` is imported by the existing
`rizsim-sitewide-finish-v14.css` and is also loaded into the existing shared Home
Shadow DOM. The stylesheet does not redefine root brand variables or modify
assessment content. The production site remains static HTML/CSS/JavaScript;
React is used only for the separate MagicPath interaction study, not installed
as a production framework.

The MagicPath study is in project `464749143970189312`, component
`464749253311492096`, initial revision `464749253311492097`. It is a design
prototype, not production data or proof of signed-in acceptance. The screenshot
mentioned in the request was not available in this conversation; the actual
Explore controls were located in source at `#rzLiveChoices .rz-v5-card-action`.

## Verification

Run the existing Design Code and workflow regression gates plus
`python scripts/test_design_code_v11.py`. Verify actual synthetic Faculty,
Course Lead and Owner cards at desktop and mobile sizes: initial hide, hover
reveal, keyboard reveal, touch availability, unchanged navigation, current role
gates, no horizontal overflow, legible contrast and reduced motion. Save
measured results and screenshots. The separate post-merge verification checks
live stylesheet/JavaScript bytes and unchanged Google artwork against the exact
commit. Confirm deployment before marking released. Prototype completion, PR
status, CI success and actual production deployment are distinct.

## Limits

This increment refines existing public/portal presentation and the specific
Classroom Explore interaction. It does not redesign simulation stimuli, secure
PDF content, unsupported legacy roles, branding, authentication or backend
Phase 9F. Full real-account visual acceptance is separate from synthetic tests.
