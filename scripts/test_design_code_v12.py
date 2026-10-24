"""Sitewide Design Code 1.2 audit. Actual HTML + existing synthetic role fixtures.
Collect every rendered button/input/tab in the exercised states. No production data.
Existing workflow tests separately exercise simulations, publication and resource modes.
"""
import json,os,re,subprocess
from pathlib import Path
from html.parser import HTMLParser
import test_design_code_v1 as base
ROOT=base.ROOT
OUT=ROOT/'test-results'/'design-code-v12';OUT.mkdir(parents=True,exist_ok=True)
base.OUT=OUT
INVENTORY=[]
ORIGINAL_MEASURE=base.measure
ROUTES=['index.html','simulations.html','about.html','contact.html','access-in.html','access-out.html','resource-viewer.html','course-material-viewer.html','simulation-insight-to-implication.html','simulation-system-1-system-2.html','simulation-hotel-judgment.html']
# Explicit families, not a universal button reset. Excludes Google, global navigation,
# assessment answers/stimuli, native PDF internals and intentionally hidden controls.
FAMILIES='.management-action,.small-action,.rz-action,.rz-action-secondary,.rz-author-btn,.rz-runtime-btn,.rz-st-button,.admin-mini-button,.admin-cancel-button,.admin-operation-action,.rz-i01-btn,.rz-s02-btn,.rz-h03-btn,.rz-run-button,.rz-support-send,.rz-v15-button,.viewer-button,.toolbar button,.btn,.rz-st-filter,.rz-v13-subtab,.catalogue-filter,.faculty-license-option,.modal-license-option'
CAPTURE=r'''(families)=>{
 const roots=[document];for(const n of document.querySelectorAll('*'))if(n.shadowRoot)roots.push(n.shadowRoot);
 const lum=c=>{const a=(c.match(/[\d.]+/g)||[]).slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4});return a.reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0)};
 const buttons=[];
 for(const root of roots)for(const n of root.querySelectorAll('button,a[href],[role=tab],input,select,textarea,summary')){
  const s=getComputedStyle(n),r=n.getBoundingClientRect();if(!r.width||!r.height||s.visibility==='hidden')continue;
  let p=n,bg='rgb(255, 255, 255)',gradient=false;
  while(p){const c=getComputedStyle(p);if(c.backgroundImage!=='none')gradient=true;const v=(c.backgroundColor.match(/[\d.]+/g)||[]).map(Number);if(v.length===3||v[3]>.99){bg=c.backgroundColor;break}p=p.parentElement||p.getRootNode()?.host}
  const a=lum(s.color),b=lum(bg);const text=(n.textContent||n.getAttribute('aria-label')||n.placeholder||'').trim();
  buttons.push({tag:n.tagName,id:n.id,classes:typeof n.className==='string'?n.className:'',label:text.slice(0,100),family:n.matches(families),foreground:s.color,background:bg,gradient,font:parseFloat(s.fontSize),weight:s.fontWeight,contrast:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),opacity:parseFloat(s.opacity),disabled:n.disabled===true,selected:n.getAttribute('aria-selected')||n.getAttribute('aria-pressed'),bounds:{x:r.x,y:r.y,w:r.width,h:r.height}});
 }
 return {url:location.pathname+location.search+location.hash,surface:document.body.dataset.rzSurface,ready:getComputedStyle(document.documentElement).getPropertyValue('--rz-v12-ready').trim(),buttons};
}'''

def measure(page,label,*args,**kwargs):
    # Keep every pre-existing viewport/priority assertion. Add evidence, not exemptions.
    kwargs['screenshot']=True
    m=ORIGINAL_MEASURE(page,label,*args,**kwargs)
    row=page.evaluate(CAPTURE,FAMILIES);row['state']=label
    INVENTORY.append(row)
    base.check(label+' sitewide refinement loaded',row['ready']=='1')
    eligible=[b for b in row['buttons'] if b['family'] and not b['disabled'] and b['opacity']>.99 and b['label']]
    # No contrast claim for a gradient/mixed backdrop; preserve those in the inventory.
    bad=[b for b in eligible if b['font']<13.9 or (not b['gradient'] and b['contrast']<4.49)]
    base.check(label+' readable action hierarchy',not bad,bad)
    (OUT/'control-inventory.json').write_text(json.dumps(INVENTORY,indent=2))
    return m
base.measure=measure

class SourceInventory(HTMLParser):
 def __init__(self):super().__init__();self.controls=[]
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  if tag in ['button','input','select','textarea'] or d.get('role')=='tab':self.controls.append({'tag':tag,'id':d.get('id'),'class':d.get('class'),'label':d.get('aria-label'),'type':d.get('type')})

def static_checks():
 inventories={}
 for route in ROUTES:
  s=(ROOT/route).read_text();p=SourceInventory();p.feed(s);inventories[route]=p.controls
  dependency='rizsim-participant-finish-v14.css' if route.startswith('simulation-') else 'rizsim-viewer-finish-v14.css' if route in ['resource-viewer.html','course-material-viewer.html'] else 'rizsim-sitewide-finish-v14.css'
  base.check(route+' retains existing stylesheet entry',dependency in s)
 for name in ['rizsim-visual-refinement-v11.css','rizsim-participant-finish-v14.css','rizsim-viewer-finish-v14.css']:
  base.check(name+' imports v1.2 once',(ROOT/name).read_text().count('@import url("rizsim-design-code-v12.css")')==1)
 css=(ROOT/'rizsim-design-code-v12.css').read_text()
 base.check('No clipping, scaling or authorization visibility rules',not re.search(r'overflow(?:-x|-y)?\s*:\s*hidden|\bzoom\s*:|scale\(|display\s*:\s*(?:none|block|flex)|\[hidden\]',css))
 base.check('No assessment answer or stimulus selectors',not re.search(r'\.(?:choice|option|stimulus|question-stem|q-stem|case-board|hotel-card|confidence)\b',css))
 base.check('Reduced motion retained','prefers-reduced-motion:reduce' in css)
 ref=os.getenv('RIZSIM_V12_BASE','origin/main')
 protected=['google-g.svg','RizSim finalized logo.png','rizsim-r.png','site.css','site.js','rizsim-design-code.js','rizsim-shared-home.js','rizsim-live-classroom.js','rizsim-student-workspace.js','rizsim-course-authoring.js','rizsim-course-environment.js']+ROUTES
 for name in protected:
  old=subprocess.check_output(['git','show',ref+':'+name],cwd=ROOT)
  base.check(name+' source unchanged',old==(ROOT/name).read_bytes())
 changed=subprocess.check_output(['git','diff','--name-only',ref],cwd=ROOT,text=True).splitlines()
 base.check('Backend and assessment assets unchanged',not any(x.startswith(('supabase/','edge-functions/','migrations/','simulation-assets/')) for x in changed))
 (OUT/'source-control-inventory.json').write_text(json.dumps(inventories,indent=2))

if __name__=='__main__':
 static_checks()
 try:base.main()
 finally:
  (OUT/'control-inventory.json').write_text(json.dumps({'states':INVENTORY,'scope':'Synthetic role/state inventory, not real-account production acceptance','all_static_routes':ROUTES},indent=2))
