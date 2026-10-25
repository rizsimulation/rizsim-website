from pathlib import Path
def replace(path,old,new,n=1):
 p=Path(path);s=p.read_text();assert s.count(old)==n,(path,s.count(old),old[:100]);p.write_text(s.replace(old,new))
p='rizsim-analytics-v1.js'
replace(p,"m.pairs.length+' matched learners'","'n = '+m.pairs.length+' paired'")
replace(p,"'Same matched learners'","'Same learners'")
replace(p,"'KG minus KR; scale 0-100%'","'KG minus KR (pp)'")
replace(p,"'Paired means only. Observed change is not proof of causal or lasting learning.'","'Paired learners only; descriptive, not causal.'")
replace(p,"  }search.addEventListener('input',apply);filter.addEventListener('change',apply);apply();", """  }
  for(const [key,node]of [['search',search],['filter',filter]]){
   node.addEventListener('focus',()=>{view.liveFocus=key;});
   node.addEventListener('blur',()=>{if(node.isConnected&&view.liveFocus===key)view.liveFocus=null;});
  }
  search.addEventListener('input',()=>{view.selection=[search.selectionStart,search.selectionEnd];apply();});
  for(const event of ['select','keyup','mouseup'])search.addEventListener(event,()=>{view.selection=[search.selectionStart,search.selectionEnd];});
  filter.addEventListener('change',apply);apply();
  // Native refresh rebuilds this subtree. Restore only a removed active control,
  // never steal focus from another control or a different workspace.
  if(view.liveFocus&&document.activeElement===document.body&&host.getClientRects().length){
   const node=view.liveFocus==='search'?search:filter;node.focus({preventScroll:true});
   if(node===search&&view.selection)search.setSelectionRange(...view.selection);
  }""")
p='rizsim-analytics-v1.css';s=Path(p).read_text();s+='''
@media(min-width:1050px){
body[data-rz-surface=portal] #rzLiveV13Workspace .rz-a-priority>.rz-a-panel>.rz-a-chart{margin-top:5px;margin-bottom:3px}
body[data-rz-surface=portal] #rzLiveV13Workspace .rz-a-priority .rz-a-legend{gap:6px}
}
''';Path(p).write_text(s)
p='scripts/test_design_code_v14.py'
replace(p,"  p.evaluate('scrollTo(0,0)');shot(p,label+'-presenter')", """  summary=p.locator(dash+' .rz-a-data > summary').first
  summary.focus();summary.press('Enter');check(label+' chart table keyboard expansion',summary.locator('..').get_attribute('open') is not None)
  summary.press('Enter');check(label+' chart table keyboard collapse',summary.locator('..').get_attribute('open') is None)
  p.evaluate('document.activeElement.blur();scrollTo(0,0)');shot(p,label+'-presenter')""")
replace(p,"  search.fill('');f=p.locator", """  search.focus();search.evaluate('n=>n.setSelectionRange(3,7)');search.dispatch_event('select')
  p.evaluate('window.'+module+'.refresh()');p.wait_for_timeout(100)
  check(label+' live search survives native refresh',search.input_value()=='no matching person' and search.evaluate('n=>n===document.activeElement'))
  check(label+' live search cursor survives native refresh',search.evaluate('n=>[n.selectionStart,n.selectionEnd]')==[3,7])
  search.press('Tab');check(label+' keyboard reaches live status filter',p.locator('.rz-a-live-controls select').evaluate('n=>n===document.activeElement'))
  search.fill('');f=p.locator""")
