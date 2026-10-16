"""One-time deterministic UI integration. No RPC, authorization or persistence changes."""
from pathlib import Path
import re
ROOT = Path(__file__).resolve().parents[1]
p = ROOT / 'access-out.html'
s = p.read_text()
original = s
for name, course in [('closeCourseClassroomSession', 'true'), ('closeClassroomSession', 'false')]:
    start = s.index('async function ' + name + '(')
    end = s.index('\nasync function ', start + 1)
    block = s[start:end]
    needle = 'const confirmed =\nwindow.confirm('
    replacement = 'const confirmed =\nwindow.RizSimSessionConfirmation\n? await window.RizSimSessionConfirmation.ask(sessionId, ' + course + ')\n: window.confirm('
    if replacement not in block:
        assert block.count(needle) == 1, name + ' confirmation changed unexpectedly'
        block = block.replace(needle, replacement, 1)
        s = s[:start] + block + s[end:]
marker = '<script src="rizsim-session-confirmation.js"></script>'
if marker not in s:
    pos = s.index('<script', s.index('rizsim-live-classroom.css'))
    s = s[:pos] + marker + '\n' + s[pos:]
p.write_text(s)
p = ROOT / 'rizsim-live-classroom.css'
s = p.read_text()
if 'RizSim explicit session confirmation' not in s:
    s += '''
/* RizSim explicit session confirmation: cancel is the initial focus. */
.rz-session-confirm{width:min(440px,calc(100vw - 40px));box-sizing:border-box;border:1px solid #b6d4cb;border-radius:20px;padding:26px;background:#f7fcf8;color:#173f49;box-shadow:0 24px 70px rgba(12,49,60,.24);font-family:inherit}
.rz-session-confirm::backdrop{background:rgba(9,35,47,.48);backdrop-filter:blur(4px)}
.rz-session-confirm h2{margin:0 0 12px;font-size:1.25rem;color:#173f49;letter-spacing:-.025em}
.rz-session-confirm p{font-size:.9rem;line-height:1.6;color:#345d66}
.rz-session-confirm .rz-session-confirm-name{font-weight:750;overflow-wrap:anywhere;color:#173f49}
.rz-session-confirm-actions{display:flex;flex-wrap:wrap;gap:12px;justify-content:flex-end;margin-top:24px}
.rz-session-confirm button{min-height:44px;padding:10px 15px;border-radius:10px;border:1px solid #9ebfb7;color:#234e58;background:#fff;font:inherit;font-weight:700;cursor:pointer}
.rz-session-confirm button:hover{background:#e5f0eb}
.rz-session-confirm .rz-session-confirm-danger{background:#8d352a;border-color:#8d352a;color:white}
.rz-session-confirm .rz-session-confirm-danger:hover{background:#70291f}
.rz-session-confirm button:focus-visible{outline:3px solid #98732c;outline-offset:3px}
'''
p.write_text(s)
p = ROOT / 'scripts/test_live_classroom_v5_extended.py'; s = p.read_text()
needle = "    page.locator('.classroom-created-card:visible [data-close-classroom-session]').click()\n"
replacement = needle + "    page.locator('#rzEndSessionConfirm').click()\n"
if replacement not in s:
    assert s.count(needle) == 1
    s = s.replace(needle, replacement)
p.write_text(s)
print('Integrated explicit confirmation into the two original session-close handlers only.')
