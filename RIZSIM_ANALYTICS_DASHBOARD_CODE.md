# RizSim Analytics Dashboard Code 1.0

Extension of RizSim Design Code 1.4. Frontend only; the existing Faculty modules remain the owners of authorization, data loading, scoring contracts, selection, refresh and printing.

## Scope and visual hierarchy

The production integrations are Insight to Implication, System 1 & System 2 Thinking, and Hotel Judgment Lab. Each actual Presenter Dashboard and Live Responses mount receives the shared presentation adapter. The logo, splash, sea-glass navigation, teal primary actions and academic instruments remain unchanged.

Presenter order: live participation; paired learning shift and transfer pathways where applicable; matched item transitions and distributions; source/transfer choices; within-classroom group comparison; expandable original item analysis, comparison controls and teaching notes. Live Responses prioritizes recorded checkpoints, participant search/status filters and the existing individual result actions. Supplemental legacy reports remain available, not deleted.

Use compact readable headings, restrained borders, muted teal/violet/amber/blue accents, responsive columns, accessible labels and textual equivalents. Essential counts and chart headings precede detailed tables. Never shrink or clip content to fabricate viewport compliance. Use a single inline status for browser-navigation fallback, not a recurring overlay. Reduced motion must remove nonessential animation.

## Data contracts and denominators

| Simulation | Authoritative existing input | Presentation calculation |
|---|---|---|
| Insight | `get_my_rizsim_insight_session_records`; native `InsightCore.validRecord` and `InsightCore.analyse/rga/score/ltFlags` | Started = valid saved records, not merely roster entries. KR/KG = locked stages. LT reviewed = recorded feedback acknowledgement. Both means use the same learners with both reviews locked. Change = (mean KG - mean KR) / 6 * 100 percentage points. Matched transitions count item answers, six per paired learner. |
| Systems | `get_my_rizsim_s1s2_session_records`; native validated record and server metrics | Academic scores, correctness and transitions use released server metrics only. No private answer key is shipped. Two LT cases per learner: pathway counts are case pairs, not distinct learners. Four feedback acknowledgements define LT reviewed. Source/transfer choices count only their own locked stages. |
| Hotel | `get_my_rizsim_hotel_session_records`; native `collection_revealed` and canonical-record gate | Progress is public within the authorized Faculty session. Group, binary response and PKR remain absent until the server release gate passes. Only valid submitted released records enter price comparisons. No invented KR, KG, grades or learning-gain metric. |

Null scores never become zero. No sample rows or fixed mockup numbers are used as production fallback. The adapter does not query, persist, change roles or write responses. It receives only the records already authorized and validated by the native simulation module. Errors remove the analytical display until a successful refresh.

## Charts and honest interpretation

- Paired mean comparison: fixed 0-100 percent scale, identical paired population for KR and KG, change in percentage points.
- Transfer donut: four explicit pathways with counts and a stated denominator. Systems counts up to two case pairs per learner. Option bars have stage-specific denominators and a 0-100 percent scale.
- Paired scatter: both axes run from 0 to 6 correct answers. Coincident coordinates are aggregated; bubble area is proportional to count, with exact counts available. The diagonal indicates no change, not a fitted causal model.
- Change histogram: all integer differences from -6 to +6; vertical axis counts matched learners.
- Group dot plots: shared -100 to +100 percentage-point scale. Include recorded n, paired n, transfer-pair n and response mix. Missing group labels remain a separate category, never an inferred institution. Fewer than five matched learners triggers an explicit descriptive small-sample caution; this is a display rule, not a statistical significance threshold.
- Hotel distributions: common linear PKR scale, observed price dots and, for group n >= 5, interpolated quartiles, median and min-max whiskers. Boxes describe observed spread, not confidence intervals. A and B Yes/No responses refer to different anchoring questions and must not be interpreted as equivalent items.

No density estimate, radar chart, causal effect, significance, durable learning claim or uncertainty interval is fabricated simply to add visual variety. Exact chart data and native original reports remain available. Zero/insufficient-data states explain why a visual is absent.

## Group and access boundaries

The current RPC contracts are session-scoped. Organization and class/faculty-group comparisons are within the currently authorized classroom, using recorded profile labels. Cross-session institutional comparisons require a separately authorized Backend contract; do not add broad queries or imply that the current release has this capability. Learner record access, live polling, request-generation guards, tenant isolation and Hotel sealing remain unchanged.

## Integration and verification

`rizsim-analytics-v1.js` exports a pure model plus a presentation adapter. The three native modules invoke the adapter after their existing renders; their data/RPC/security logic is otherwise byte-identical. `access-out.html` loads the shared JS/CSS. The legacy reports and native result controls are retained in an expandable section. Filters use only the authorized mounted roster and remain in memory for that session, not in URLs or persistent storage.

Regression evidence must include independently reconciled arithmetic, actual mounted empty/populated/error states, real tabs, input errors and focus, each simulation, responsive layouts, long labels, reduced motion, native controls and existing permission regressions. Historical source-equality tests permit only the documented UI insertions/form region, preserving all surrounding source exactly. Production completion additionally requires a merged PR, successful Pages deployment, and exact runtime-asset hash verification against the deployed commit.

## Benchmark availability

The written approved benchmark is the implementation specification. The three referenced screenshot image files and original approved mockup were not present in the retrieved attachments or current repository. Exact pixel correspondence to those images is therefore not certified. Their absence does not authorize new branding or changes to the protected academic instruments.


## Greenwashing native extension - source content 3.0

The Seven Sins Greenwashing module preserves the uploaded 10-item no-feedback audit,
7 diagnosis and 7 transfer items. Audit answers lock together before feedback.
First checked judgments remain distinct from final corrected judgments. Final lab
accuracy is forced to 100% by the source completion rule: never describe it as an
independent post-test, durable learning, or a causal treatment effect.

Use native Presenter Dashboard / Live Responses containers. Live participation and
progress use the existing authorized roster RPC. Detailed response analysis requests
only submitted attempt IDs from that roster and is further limited by existing RLS.
Show analyzed versus submitted counts when some data are not accessible. Do not add
permissions or use another simulation's RPC as a workaround.

Appropriate views are matched same-item initial/final bars, baseline accuracy by sin,
0-10 baseline score distribution, 0-7 diagnosis/transfer first-attempt scatter, item
mastery, recorded section comparisons and descriptive correction mean/median/SD.
Keep unanswered data missing; correction rate is not applicable when initial errors
are zero. Different audit/diagnosis/transfer items are not matched pre/post measures.
Imported source JSON is re-scored from raw choices in a separate local-only review;
never merge it silently into live session records or upload it as production data.

Use the official shared runner/Class Resources header, website identity and Classroom
submission. Omit duplicate registration, oversized branding, restart and destructive
server-data buttons. Retain private learner JSON/print exports and original Faculty
teaching note/debrief below priority analytics. No new summative-security claim:
this Frontend module does not add server-enforced stage/key protection.
