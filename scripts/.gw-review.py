from pathlib import Path

def replace(path,old,new):
 p=Path(path);s=p.read_text();assert s.count(old)==1,(path,s.count(old),old[:120]);p.write_text(s.replace(old,new))

replace('simulation-assets/greenwashing/student.js',"options(item,'auditAns',r.auditSelections[item.id],", "options(item,'auditAns',pending?.auditSelections[item.id]??r.auditSelections[item.id],")
replace('simulation-assets/greenwashing/student.js','selected=rec?.final??null;', 'selected=pending?.lab[item.id]?.final??rec?.final??null;')
replace('rizsim-greenwashing-faculty.js',"file.addEventListener('change',async()=>{let n=0,errors=[];for(const f of file.files){", "file.addEventListener('change',async()=>{const sid=sessionId,uid=userId;let n=0,errors=[];for(const f of [...file.files]){")
replace('rizsim-greenwashing-faculty.js',"const x=JSON.parse(await f.text()),observations=C.imported(x);", "const text=await f.text();if(sid!==sessionId||uid!==userId)return;const x=JSON.parse(text),observations=C.imported(x);")
replace('rizsim-greenwashing-faculty.js',"if(n){source='manual';render();}", "if(n&&sid===sessionId&&uid===userId){source='manual';render();}")
replace('rizsim-greenwashing-faculty.js',"button('Clear imported files',async()=>{if(await", "button('Clear imported files',async()=>{const sid=sessionId,uid=userId;if(await")
replace('rizsim-greenwashing-faculty.js',"danger:true})){manual=[];", "danger:true})){if(sid!==sessionId||uid!==userId)return;manual=[];")
p=Path('simulation-assets/greenwashing/styles.css');p.write_text(p.read_text()+'''
/* Native workspace: replace duplicated pane introduction with the simulation report. */
body[data-rz-surface=portal] #rzLiveV13Workspace .rz-v13-pane:has(.gw-faculty:not([hidden]))>.rz-v13-pane-note{display:none}
body[data-rz-surface=portal] #rzLiveV13Workspace .gw-faculty .gw-heading{margin-top:0}
body[data-rz-surface=portal] #rzLiveV13Workspace .rz-v13-region:has(.rz-v13-pane:not([hidden]) .gw-faculty:not([hidden]))>.rz-v13-region-heading{display:none}
@media(min-width:1050px){
body[data-rz-surface=portal] #rzLiveV13Workspace .gw-dashboard .gw-priority>.rz-a-panel{padding:10px 12px}
body[data-rz-surface=portal] #rzLiveV13Workspace .gw-dashboard .gw-priority .rz-a-note{margin-bottom:6px}
body[data-rz-surface=portal] #rzLiveV13Workspace .gw-dashboard .gw-priority .rz-a-chart{margin:5px auto}
body[data-rz-surface=portal] #rzLiveV13Workspace .gw-dashboard .gw-priority .rz-a-bars{gap:6px}
}
''')
replace('scripts/test_greenwashing_browser.py',"check('save failure freezes advance and retains retry',p.get_by_role('button',name='Save & next').is_disabled())", "check('save failure freezes advance and retains retry',p.get_by_role('button',name='Save & next').is_disabled())\n  check('failed save keeps selected answer visible',p.locator('input[name=auditAns][value=\"1\"]').is_checked())")
replace('scripts/test_greenwashing_browser.py',"check(label+' source cautions visible','100%' in p.locator(root).inner_text() and 'first' in p.locator(root).inner_text().lower());shot(p,label+'-presenter')", "check(label+' source cautions visible','100%' in p.locator(root).inner_text() and 'first' in p.locator(root).inner_text().lower());shot(p,label+'-presenter')\n  if size[0]>=1050:\n   b=p.locator(root+' .gw-priority').bounding_box();check(label+' priority charts complete in first screen',b['y']>=0 and b['y']+b['height']<=size[1]+2,b)")
