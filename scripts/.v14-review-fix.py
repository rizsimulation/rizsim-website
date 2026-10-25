from pathlib import Path
ROOT=Path.cwd()
def replace(path,old,new,n=1):
 p=ROOT/path;s=p.read_text();assert s.count(old)==n,(path,s.count(old),old[:100]);p.write_text(s.replace(old,new))
def append(path,text):
 p=ROOT/path;p.write_text(p.read_text()+text)
p='rizsim-student-workspace.js'
replace(p,'practiceErrorFresh=false','practiceErrorAt=0',4)
replace(p,'practiceErrorFresh=true','practiceErrorAt=Date.now()')
replace(p,"  const target=$('rzStudentPractice');if(!target)return;target.replaceChildren();", "  const target=$('rzStudentPractice');if(!target)return;\n  const focused=$('rzPracticeCode'),selection=focused===document.activeElement?[focused.selectionStart,focused.selectionEnd]:null;target.replaceChildren();")
replace(p,"if(!practiceErrorFresh)note.classList.add('rz-practice-error-settled');", "const elapsed=Date.now()-practiceErrorAt;if(elapsed>=300)note.classList.add('rz-practice-error-settled');else{const path=note.querySelector('svg path');if(path){path.style.animationDuration='300ms';path.style.animationDelay=-Math.max(0,elapsed)+'ms';}}")
replace(p,"  target.append(joinForm);", "  target.append(joinForm);if(selection){input.focus({preventScroll:true});input.setSelectionRange(...selection);}")
replace(p,"practiceErrorAt=0;}}", "}}")
p='scripts/frontend_v14_scope.py'
replace(p,"practiceErrorFresh=false", "practiceErrorAt=0",2)
replace(p,"  start=\"  const joinForm=el('form','rz-v15-practice-join')\"", "  new=new.replace(\"  const target=$('rzStudentPractice');if(!target)return;\\n  const focused=$('rzPracticeCode'),selection=focused===document.activeElement?[focused.selectionStart,focused.selectionEnd]:null;target.replaceChildren();\",\"  const target=$('rzStudentPractice');if(!target)return;target.replaceChildren();\").replace(\"  target.append(joinForm);if(selection){input.focus({preventScroll:true});input.setSelectionRange(...selection);}\",\"  target.append(joinForm);\")\n  start=\"  const joinForm=el('form','rz-v15-practice-join')\"")
append('rizsim-student-classroom-v155.css', '\n@media(prefers-reduced-motion:reduce){#rzPracticeCodeMessage .rz-dc-outcome path{animation:none!important;stroke-dashoffset:0!important}}\n')
p='rizsim-v154-runner-shell.js'
replace(p,"original=null,channel=null,request='',ack=false,settleTimer=0;", "original=null,channel=null,request='',ack=false,settleTimer=0,originalLookupMissing=false;")
replace(p,'   original=w;return true;','   original=w;originalLookupMissing=false;return true;')
replace(p,'   if(!validName(originalName))return null;','   if(originalLookupMissing||!validName(originalName))return null;')
replace(p,"if(w&&w!==window&&!w.closed&&w.location.href==='about:blank')w.close();", "if(w&&w!==window&&!w.closed&&w.location.href==='about:blank'){w.close();originalLookupMissing=true;}")
append('rizsim-analytics-v1.css','''
/* Consolidate repeated context once a mounted, authorized analytics surface exists. */
body[data-rz-surface=portal] #view-classroom:has(.rz-v13-pane:not([hidden]) .rz-a-dashboard) .rz-live-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 4px}
body[data-rz-surface=portal] #view-classroom:has(.rz-v13-pane:not([hidden]) .rz-a-dashboard) .rz-live-heading>span,
body[data-rz-surface=portal] #view-classroom:has(.rz-v13-pane:not([hidden]) .rz-a-dashboard) .rz-live-heading>p{display:none}
body[data-rz-surface=portal] #view-classroom:has(.rz-v13-pane:not([hidden]) .rz-a-dashboard) .rz-live-heading>h1{font-size:17px!important;line-height:1.4;margin:0}
body[data-rz-surface=portal] #view-classroom:has(.rz-v13-pane:not([hidden]) .rz-a-dashboard) .rz-live-breadcrumb{margin:0 0 6px;padding:0;font-size:12px}
body[data-rz-surface=portal] #rzLiveV13Workspace:has(.rz-v13-pane:not([hidden]) .rz-a-dashboard) .rz-v13-region-heading{display:flex;align-items:center;gap:8px;padding:0 0 7px;margin:0 0 7px}
body[data-rz-surface=portal] #rzLiveV13Workspace:has(.rz-v13-pane:not([hidden]) .rz-a-dashboard) .rz-v13-region-heading>:is(span,p){display:none}
body[data-rz-surface=portal] #rzLiveV13Workspace:has(.rz-v13-pane:not([hidden]) .rz-a-dashboard) .rz-v13-region-heading>h2{font-size:16px!important;line-height:1.4;margin:0}
body[data-rz-surface=portal] #rzLiveV13Workspace #rzLiveResultsAnchor:has(.rz-a-dashboard)>.rz-v5-results-heading{order:2;margin:8px 0 0}
body[data-rz-surface=portal] #rzLiveV13Workspace :is(.rz-i01-root,.rz-s02-root,.rz-h03-root):has(>.rz-a-dashboard){padding:0;border:0;background:transparent;box-shadow:none}
body[data-rz-surface=portal] #rzLiveV13Workspace :is(.rz-i01-head,.rz-s02-header,.rz-h03-head):has(+.rz-a-dashboard){padding:0 0 8px;margin:0 0 8px;gap:8px;align-items:center}
body[data-rz-surface=portal] #rzLiveV13Workspace :is(.rz-i01-head,.rz-s02-header,.rz-h03-head):has(+.rz-a-dashboard) :is(.rz-i01-eyebrow,.rz-s02-eyebrow,.rz-h03-kicker){display:none}
body[data-rz-surface=portal] #rzLiveV13Workspace :is(.rz-i01-head,.rz-s02-header,.rz-h03-head):has(+.rz-a-dashboard) h2{font-size:16px!important;margin:0 0 3px;line-height:1.4}
body[data-rz-surface=portal] #rzLiveV13Workspace :is(.rz-i01-head,.rz-s02-header,.rz-h03-head):has(+.rz-a-dashboard) p{margin:0;font-size:12px}
body[data-rz-surface=portal] #rzLiveV13Workspace tr.rz-a-filtered{display:none!important}
@media(max-width:760px){body[data-rz-surface=portal] #rzLiveV13Workspace :is(.rz-i01-head,.rz-s02-header,.rz-h03-head):has(+.rz-a-dashboard) :is(.rz-i01-actions,.rz-s02-actions,.rz-h03-actions){display:flex;flex-wrap:wrap;width:auto}body[data-rz-surface=portal] #rzLiveV13Workspace :is(.rz-i01-head,.rz-s02-header,.rz-h03-head):has(+.rz-a-dashboard) button{width:auto;flex:1}}
''')
p='scripts/test_design_code_v14.py'
replace(p," width=p.evaluate('document.documentElement.scrollWidth');check(label+' no horizontal overflow',width<=p.viewport_size['width']+2,width)",''' diagnostic=p.evaluate("""()=>({width:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,inner:innerWidth,offenders:[...document.querySelectorAll('body *')].filter(n=>{const b=n.getBoundingClientRect();return b.width&&b.height&&(b.right>innerWidth+1||b.left< -1)&&!n.closest('[hidden]')}).slice(0,20).map(n=>({tag:n.tagName,id:n.id,cls:typeof n.className==='string'?n.className:'svg',left:n.getBoundingClientRect().left,right:n.getBoundingClientRect().right,width:n.getBoundingClientRect().width,position:getComputedStyle(n).position}))})""")
 check(label+' no horizontal overflow',diagnostic['width']<=p.viewport_size['width']+2,diagnostic)''')
replace(p,"   p.emulate_media(reduced_motion='no-preference')", "   p.emulate_media(reduced_motion='no-preference')\n   p.evaluate(\"window.__practiceAnimated=false;document.addEventListener('animationstart',e=>{if(e.target.closest('#rzPracticeCodeMessage')&&e.animationName==='rzDcDraw')window.__practiceAnimated=true;},true)\")")
replace(p,"note.locator('svg path').first.evaluate('n=>getComputedStyle(n).animationName')!='none'", "p.evaluate('window.__practiceAnimated')")
replace(p,"   shot(p,label+'-unknown')", "   p.wait_for_timeout(1200);check(label+' focus survives async refresh',field.evaluate('n=>n===document.activeElement'))\n   shot(p,label+'-unknown')")
replace(p,"  search.fill('');f=p.locator", "  check(label+' filtered rows actually concealed',p.locator('#rzV13SimulationStudentResults tbody tr:visible').count()==0)\n  search.fill('');f=p.locator")
replace(p,"[(1366,900),(768,1024),(390,844)]", "[(1366,768),(768,1024),(390,844)]")
p='scripts/test_v15_3_focus.py'
replace(p,'import threading\n','import threading\nfrom datetime import datetime, timezone\n')
replace(p,"        assert 'Sunday 25 October 2026' in page.locator('#rzV15LibraryLaunch').inner_text()", "        page.clock.set_fixed_time(datetime(2026,10,24,0,0,tzinfo=timezone.utc))\n        page.wait_for_function(\"document.querySelector('#rzV15LibraryLaunch').textContent.includes('Sunday 25 October 2026')\")\n        assert 'Sunday 25 October 2026' in page.locator('#rzV15LibraryLaunch').inner_text()\n        page.clock.set_fixed_time(datetime(2026,10,26,0,0,tzinfo=timezone.utc))\n        page.wait_for_function(\"document.querySelector('#rzV15LibraryTime').textContent==='Launch date reached'\")\n        assert 'Publication Update' in page.locator('#rzV15LibraryLaunch').inner_text()")
p='scripts/test_v13_step4_owner_combined.py'
replace(p,"    assert page.locator('#'+insight_id+' svg[role=img]').count()==1,'Original A/B dot plot'", "    assert page.locator('#'+insight_id+' .rz-a-dashboard svg[role=img]').count()==1,'Released source-backed A/B distribution'\n    assert page.locator('#'+insight_id+' .rz-a-support svg[role=img]').count()==1,'Original A/B dot plot retained in detailed report'")
