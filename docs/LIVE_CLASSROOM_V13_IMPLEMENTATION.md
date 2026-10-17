# RizSim Live Classroom V13 — Collapsible workspace (implementation draft)

**Release status:** Separate draft PR, **not published**. Built on production `main` without incorporating Simulation 01/02/03 draft commits. Step 2 will integrate all three modules on a separate combined staging branch after this sidebar is reviewed.

## Approved internal navigation

**Expanded by default; icon-only collapsed state** (user preference persists locally). Desktop has a sticky sea-glass left rail; mobile has a labeled drawer with keyboard/Escape dismiss. All navigation occurs **inside** the existing authenticated Live Classroom screen. Public Home / Simulations / About / Contact and sidebar/swipe mechanics remain locked.

1. **Session Studio** — original authorized course environment, Live Classroom session setup, drag/drop course/session resources and existing form controls. Separate **Overview** and **Share Access** subviews. Share Access only enables after an authorized session exists. Its QR/code/link are copied from the **same V12 verified session card**, not generated, minted, or accepted from a URL parameter. Floating V12 session panel and minimize/reopen button remain intact.
2. **Student Results** — authorized Student roster and progress with existing read-only response modal, no second roster. Source panels retain original secure listener state. Simulation 01/02's full individual results modules will join here in Step 2.
3. **Class Insights** — authorized course-level aggregate results and the existing filtered course results viewer. The reserved `#rzLiveResultsAnchor` is deliberately placed here to host simulation-specific collective analytics when Simulation 01/02/03 PRs are combined in Step 2. No invented sample student data or placeholder charts.

## Role and course distinctions

- **Ordinary Faculty running licensed simulations:** Session Studio session creation, live access QR, reusable standalone session resources; no Course Lead edit grants. Individual roster/results and class analytics for the authorized session only.
- **Course Lead running their own course:** Studio opens the original editable Course Environment and included simulations, with resource composer and *separate* Share Access subview. Individual Student Results is separate from Class Insights. Existing `Create & Save` / `Publish to Class` semantics are untouched.
- **Faculty running a purchased course:** Studio opens the purchased **read-only course environment** and existing authorized publication controls; it never introduces a Course Lead add/edit/upload privilege. Sharing uses the same session card and separate subview after a valid session.
- **Owner:** Retains existing supervision/Owner-only restrictions, without acquiring a new session creation path.
- **Student, Admin and Category Manager:** V13 is not shown; permission checks remain in original authenticated Live Classroom/RLS systems.

## Technical boundaries

New `rizsim-live-workspace.js` and `.css` manage DOM organization only. They do not make a Supabase call, create/edit an account, licence or session, write records, or mint QR credentials. V5 Live Classroom source makes only targeted, backward-compatible mount adjustments, a protected read-only `verifiedShare()` facade, and route-aware sidebar drawing. All original resource components retain their JS handlers and unsaved input values when switching tabs.

V13 respects keyboard tab semantics, a sticky/collapsible desktop rail, accessible mobile drawer, aria-expanded/selected, reduced motion and focus-return on Escape. Stage and role changes reset to **Session Studio** so a new class cannot inherit the previous classroom's results tab or share card.

## Development and acceptance tests

- `node scripts/validate_live_workspace_v13.js` (includes public nav, roles, verified share and no-new-RPC contracts).
- `python scripts/test_live_workspace_v13_dom.py` for responsive layout, tab controls, accessible collapse/drawer, preserved input state and denied roles; saves **synthetic** screenshots in test-results/.
- `python scripts/test_live_workspace_v13_portal.py` for real assembled RizSim portal with **synthetic mocked** Faculty, Course Lead and purchased-course backend, authorized session link, class data/QR, original modal and role isolation.
- Original `scripts/test_live_classroom_v5.py`, `scripts/test_live_classroom_v5_extended.py`, `scripts/test_course_environment_v6.py` (only assertions for intentionally moved panels updated).
- All existing V5–V12 regression workflows must pass on this branch prior to Step 2.

## Release gates remain explicit

Step 1 approval authorizes **isolated draft code and testing**, not production changes. Step 2: combine V13 with the three simulations, resolve conflicting `access-out.html` and `rizsim-live-classroom.js` hooks, route each simulation's individual results under Student Results and class analytics under Class Insights. Step 3: run all combined and real-role acceptance tests, including private scoring/Hotel Judgment experiments and policies. Only after separate Owner approval can migration, code merge, licensing and product publishing proceed.
