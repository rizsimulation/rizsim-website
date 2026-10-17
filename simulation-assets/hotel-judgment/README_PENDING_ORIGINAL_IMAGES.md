# RizSim Simulation 03 — Hotel Judgment Lab (draft, release blocked)

**This is a staged Student runner, not a published course or an approved classroom experiment.**

Original activity: RizSimulation Activity 03 / My Hotel Choice. Group A sees "Does this hotel cost Less than PKR 1000 per night?"; Group B sees "Does this hotel cost More than PKR 80,000 per night?". Both must see the exact same original four Istanbul hotel images, in the same order and size. Both answer binary Yes/No and independently state one PKR willingness-to-pay amount. No correctness score is defined. Faculty compares group distributions and medians and reveals the anchor manipulation after collection.

## Missing source assets — blocking

The user uploaded seven HTML/JavaScript files only; two referenced CSS files and four original hotel PNGs were not among the files. CSS has been reconstructed, but **the experiment must not substitute stock photos or fabricated images**. Source hotel photos are required before merge/deployment/participant release:

- `simulation-assets/hotel-judgment/hotel_view_1.png`
- `simulation-assets/hotel-judgment/hotel_view_2.png`
- `simulation-assets/hotel-judgment/hotel_view_3.png`
- `simulation-assets/hotel-judgment/hotel_view_4.png`

The runner fails closed when they cannot load. The compiled Student/Faculty standalone copies are in the private handoff package. A deliberately marked `?preview=1` is allowed only in the standalone HTML: preview exports use `demo_only:true`, which the normal Faculty dashboard rejects. **Hosted preview does not bypass missing-photo checks.**

## Authorization / intended release path

- Proposed product slug: `hotel-judgment-lab`.
- Proposed Student route: `/simulation-hotel-judgment.html`.
- Existing `simulation_attempts`, `simulation_responses`, `check_my_rizsim_classroom_attempt_access`, `submit_my_rizsim_classroom_attempt` integration only. All authorization is checked against the current signed-in user, assigned classroom attempt, product ownership and status, with RLS/server final submission. Browser metadata alone never grants access.
- Proposed immutable response key: `hotel-judgment-v1-locked`.
- Student submitted record version `hotel-judgment-v1` and Player bridge `rizsim-sync-v1`; no graded outcomes.
- Faculty analytics, debrief and the original experimental manipulation are NOT published to the public website. Keep the Faculty dashboard private inside the authenticated Faculty experience.
- Never deploy the uploaded PIN-cookie Node localhost server publicly.

Before merge, require correct image files, Owner product publication/licence, pilot via a signed-in Student and authorized Faculty account, negative permissions tests, actual `simulation_responses` persistence and submission receipt, and live class reveal. No production records, licences, courses, or student access are created by this draft.

Saving an owned Course Lead course is a separate action from publishing it to a live classroom. Preserve the approved public RizSim nav, logo, sea-glass theme, teal action design, roles and sidebar unchanged.