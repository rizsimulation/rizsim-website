"""Idempotent final presentation refinements; no backend or authorization changes."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'rizsim-live-classroom.css'
s=p.read_text()
if 'V5 contrast regression fix' not in s:
 s+='''
/* V5 contrast regression fix: legacy session panels were designed for dark backgrounds. */
.rz-live-running .classroom-session-meta{background:#e4f1eb;border:1px solid #bfd5cc;border-radius:10px;padding:12px}
.rz-live-running .classroom-session-meta span{color:#285e68;font-size:.68rem}
.rz-live-running .classroom-session-meta strong{color:#143d4b;font-size:.82rem;line-height:1.5}
.rz-live-running .classroom-created-actions .small-action{color:#164653;background:#fff;border-color:#adc8c8;font-size:.76rem;min-height:36px}
.rz-live-running .classroom-created-actions .small-action:hover{background:#dcefe9;color:#123e4c}
.rz-live-running .classroom-created-actions .classroom-end-button{color:#872e22;background:#fde7e1;border-color:#d1a398}
.rz-live-running .classroom-created-actions .classroom-end-button:hover{background:#f6d5cb;color:#6d211a}
.rz-live-running .management-primary-button,.rz-live-running .rz-action{background:linear-gradient(115deg,#0a7277,#0a5d70);color:#fff}
.rz-v5-results-heading{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-top:12px}
.rz-v5-results-heading h3{margin:0;color:#174754;font-size:1.1rem}
.rz-v5-results-heading .rz-action-secondary{font-size:.79rem;white-space:nowrap}
'''
 p.write_text(s)
p=ROOT/'rizsim-live-classroom.js';s=p.read_text()
if 'rzLiveRefreshResults' not in s:
 old="    const noResults = el('p','rz-v5-empty'); noResults.id = 'rzLiveNoResults'; noResults.hidden = true; $('rzLiveResultsAnchor').append(noResults);"
 new=old+'''
    const resultsHeading = el('div','rz-v5-results-heading');
    const refresh = button('Refresh results','rz-action-secondary',() => location.reload());
    refresh.id = 'rzLiveRefreshResults';
    refresh.title = 'Reload this session to retrieve the latest authorized submissions';
    resultsHeading.append(el('h3','','Session results'),refresh);
    $('rzLiveResultsAnchor').before(resultsHeading);
'''
 assert old in s
 s=s.replace(old,new)
 old="    panel.classList.toggle('rz-v5-hidden',!available);"
 new=old+"\n    const empty = $('rzLiveNoResults'); if (empty.parentNode.lastElementChild !== empty) empty.parentNode.append(empty);"
 assert old in s
 s=s.replace(old,new)
 p.write_text(s)
print('V5 contrast and explicit results refresh refinements applied.')
