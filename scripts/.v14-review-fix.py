from pathlib import Path
def replace(path,old,new):
 p=Path(path);s=p.read_text();assert s.count(old)==1,(path,s.count(old));p.write_text(s.replace(old,new))
replace('rizsim-analytics-v1.js',"node.addEventListener('blur',()=>{if(node.isConnected&&view.liveFocus===key)view.liveFocus=null;});","node.addEventListener('blur',()=>{queueMicrotask(()=>{if(node.isConnected&&document.activeElement!==node&&view.liveFocus===key)view.liveFocus=null;});});")
p=Path('rizsim-analytics-v1.css');p.write_text(p.read_text()+'''
@media(min-width:1050px){
body[data-rz-surface=portal] #rzLiveV13Workspace .rz-a-dashboard{gap:8px}
/* Keep the minimized live manager beside the heading, not over priority charts. */
body[data-rz-surface=portal]:has(#view-classroom.active .rz-v13-pane:not([hidden]) .rz-a-dashboard) .rz-v15-manager.is-minimized{top:135px;bottom:auto;right:max(18px,calc((100vw - 1180px)/2))}
}
''')
p='scripts/test_design_code_v14.py'
replace(p,"search.input_value()=='no matching person' and search.evaluate('n=>n===document.activeElement'))","search.input_value()=='no matching person' and search.evaluate('n=>n===document.activeElement'),search.evaluate('n=>({value:n.value,focused:n===document.activeElement,active:document.activeElement.outerHTML.slice(0,300),selection:[n.selectionStart,n.selectionEnd],visible:!!n.getClientRects().length})'))")
replace(p,"  p.locator(rootid+' > .rz-a-support > summary').click();check", """  if size[0]>=1050:
   manager=p.locator('.rz-v15-manager.is-minimized:not([hidden])')
   if manager.count():
    a=manager.bounding_box();b=p.locator(dash).bounding_box();check(label+' session control does not cover priority analytics',a['y']+a['height']<=b['y'] or a['x']+a['width']<=b['x'],a)
  p.locator(rootid+' > .rz-a-support > summary').click();check""")
