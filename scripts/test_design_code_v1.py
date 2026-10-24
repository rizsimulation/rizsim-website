"""Design Code v1: actual routes, synthetic role sessions, real browser interactions.
All external requests are intercepted or blocked. No production identities/data.
Reports every measured state; FAIL is never silently converted to an exemption.
"""
import http.server,json,re,threading,traceback,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results'/'design-code-v1';OUT.mkdir(parents=True,exist_ok=True)
FAC=(ROOT/'scripts/fixtures/live-classroom-backend.js').read_text()
STU=(ROOT/'scripts/fixtures/student-workspace-backend.js').read_text()
# Extend the existing fixture, not the application, for real Institution/Owner layouts.
FAC=FAC.replace('categories:[{id:',"institutions:window.__emptyInstitution?[]:[{id:'inst-qa',name:'Synthetic QA Institution',slug:'qa-institution',active:true,created_at:start}],institution_members:window.__emptyInstitution?[]:[{institution_id:'inst-qa',user_id:user.id,member_type:'institution_admin',active:true,created_at:start}],institution_faculty_requests:[],simulation_licenses:[],categories:[{id:",1)
CHECKS=[];STATES=[];ERRORS=[]
def check(name,ok=True,detail=None):
 CHECKS.append({'name':name,'passed':bool(ok),'detail':detail})
 print(('PASS ' if ok else 'FAIL ')+name+((' '+str(detail)) if not ok and detail is not None else ''),flush=True)
 (OUT/'report.json').write_text(json.dumps({'checks':CHECKS,'states':STATES,'errors':ERRORS,'scope':'synthetic browser evidence, not authenticated production acceptance'},indent=2))
def slug(s):return re.sub('[^a-zA-Z0-9_-]+','-',s)
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*a,**k):super().__init__(*a,directory=str(ROOT),**k)
 def log_message(self,*a):pass

def open_page(browser,base,path,role=None,size=(1366,768),extra=''):
 ctx=browser.new_context(viewport={'width':size[0],'height':size[1]},device_scale_factor=1,reduced_motion='reduce',has_touch=size[0]<600,is_mobile=size[0]<600)
 ctx.add_init_script("sessionStorage.setItem('rizsimSplashSeen','true');window.__testRole="+json.dumps(role)+";"+extra)
 def route(r):
  u=r.request.url
  if u=='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm':
   body=STU if role=='student' else FAC
   if not role:body=body.replace('return ok({user})','return ok({user:null})').replace('return ok({session:{user}})','return ok({session:null})')
   r.fulfill(content_type='text/javascript',body=body)
  elif u.startswith(base+'/'):r.continue_()
  elif 'fonts.googleapis.com' in u:r.fulfill(content_type='text/css',body='')
  else:r.abort()
 ctx.route('**/*',route);p=ctx.new_page();p.set_default_timeout(7000);errors=[]
 p.on('pageerror',lambda e:errors.append(str(e)))
 p.on('dialog',lambda d:(check('No native app dialog: '+d.message,False),d.dismiss()))
 p.goto(base+'/'+path,wait_until='domcontentloaded',timeout=15000)
 if role=='student':p.wait_for_selector('#studentApp.show',timeout=20000)
 elif role in ['owner','admin','institution','faculty','course_lead']:p.wait_for_selector('#authenticatedApp.show',timeout=20000)
 p.wait_for_function('!!window.RizSimUI');p.wait_for_timeout(200)
 return ctx,p,errors

def measure(p,label,targets=(),screenshot=True,require_p1=True):
 p.evaluate('window.scrollTo({top:0,behavior:"instant"})');p.wait_for_timeout(100)
 m=p.evaluate("""() => ({width:innerWidth,height:innerHeight,scroll:document.documentElement.scrollWidth,
 appReady:document.body.dataset.rzAppReady,role:document.body.dataset.rzRole||null,
 theme:getComputedStyle(document.documentElement).getPropertyValue('--teal'),
 reduced:matchMedia('(prefers-reduced-motion:reduce)').matches,
 headings:[...document.querySelectorAll('.auth-view.active h1,.student-view.active h1')].filter(n=>n.getClientRects().length).map(n=>({text:n.textContent.trim(),px:parseFloat(getComputedStyle(n).fontSize)}))})""")
 m['name']=label;m['p1']=[]
 if m['scroll']>m['width']+2:
  m['overflow']=p.evaluate("() => [...document.querySelectorAll('body *')].filter(n=>n.getClientRects().length && n.getBoundingClientRect().right>innerWidth+2).slice(-20).map(n=>({tag:n.tagName,id:n.id,cls:n.className,x:n.getBoundingClientRect().x,w:n.getBoundingClientRect().width,text:n.textContent.slice(0,90)}))")
 check(label+' reflows within viewport',m['scroll']<=m['width']+2,m)
 for selector in targets:
  l=p.locator(selector).first
  if not l.count() or not l.is_visible():
   check(label+' P1 visible '+selector,False);continue
  b=l.bounding_box();fits=bool(b and b['y']>=0 and b['y']+b['height']<=m['height']-3 and b['x']>=-1 and b['x']+b['width']<=m['width']+1)
  m['p1'].append({'selector':selector,'bounds':b,'fits':fits})
  if m['width']>=1000 and require_p1:check(label+' P1 initial viewport '+selector,fits,b)
 if screenshot:p.screenshot(path=str(OUT/(slug(label)+'.png')),full_page=False,animations='disabled')
 STATES.append(m);return m

def open_menu(p):
 button=p.locator('#mobileMenuButton')
 if button.count() and button.is_visible() and button.get_attribute('aria-expanded')!='true':button.click()

def nav(p,role,view):
 # Exercise the deployed navigation, including the mobile drawer and My Account.
 if view=='account':
  p.locator('#accountButton').click()
  p.locator('#accountMenuAccount' if role=='student' else '#accountMenuAccountButton').click()
 else:
  open_menu(p)
  attr='data-student-view' if role=='student' else 'data-auth-view'
  link=p.locator('#mainNav ['+attr+'="'+view+'"]')
  if link.count() and link.first.is_visible():link.first.click()
  elif role=='student':p.evaluate('(v)=>RizSimStudentBridge.navigate(v)',view)
  else:raise AssertionError('Requested role navigation is unavailable: '+view)
 if role=='student' and view=='account':
  p.wait_for_selector('#rzStudentAccountDialog[open]');check('Student account opens in its established dialog',True);p.keyboard.press('Escape')
 else:p.wait_for_selector('#view-'+view+'.active',timeout=7000)
 p.wait_for_timeout(150)

def shared_interactions(p):
 # Genuine DOM controls: dialog focus, keyboard containment, Escape and state.
 p.evaluate("""()=>{const b=document.createElement('button');b.id='dcTestTrigger';b.textContent='Test task';document.body.append(b);b.focus();window.__dialogResult='waiting';b.onclick=()=>{RizSimUI.confirm('This synthetic action changes no data.',{title:'Test confirmation',action:'Delete class',danger:true}).then(x=>__dialogResult=x);};b.click();}""")
 d=p.locator('.rz-dc-dialog[open]');d.wait_for()
 check('Dialog uses specific action and safe initial Cancel focus',d.get_by_role('button',name='Delete class').is_visible() and p.evaluate("document.activeElement.textContent==='Cancel'"))
 p.keyboard.press('Shift+Tab');check('Dialog keyboard focus is contained',p.evaluate("document.activeElement.textContent==='Delete class'"))
 p.keyboard.press('Escape');p.wait_for_function('__dialogResult===false')
 check('Escape cancels and restores initiating focus',p.evaluate("document.activeElement.id==='dcTestTrigger'"))
 p.evaluate("() => {window.__note='waiting';RizSimUI.prompt('Optional note:','kept value',{action:'Save note'}).then(x=>__note=x)}")
 p.locator('.rz-dc-dialog input').fill('Edited note');p.locator('.rz-dc-dialog button').filter(has_text='Save note').click();p.wait_for_function("__note==='Edited note'")
 check('Prompt preserves entered note and resolves asynchronously')
 p.locator('#dcTestTrigger').focus()
 p.evaluate("() => {window.__twice=[];RizSimUI.confirm('Same intent',{action:'Proceed'}).then(x=>__twice.push(x));RizSimUI.confirm('Same intent',{action:'Proceed'}).then(x=>__twice.push(x))}")
 p.locator('.rz-dc-dialog').get_by_role('button',name='Proceed').click()
 p.wait_for_function('__twice.length===2')
 check('Double activation yields only one accepted operation',p.evaluate('__twice.filter(Boolean).length===1'))
 p.evaluate("const d=document.createElement('details');d.id='dcClosedDetails';d.innerHTML='<summary>Supporting field</summary><label>Reference<input id=dcHiddenField></label>';document.body.append(d);RizSimUI.invalid(document.getElementById('dcHiddenField'),'Check reference')")
 check('Invalid supporting field opens its section and receives focus',p.evaluate("document.getElementById('dcClosedDetails').open&&document.activeElement.id==='dcHiddenField'"))
 p.evaluate("document.getElementById('dcClosedDetails').remove()")
 # Test the website-native fallback without touching browser security prompts.
 p.evaluate("() => {window.__oldDialog=HTMLDialogElement.prototype.showModal;HTMLDialogElement.prototype.showModal=undefined;window.__fallback=null;RizSimUI.confirm('Fallback synthetic task',{action:'Proceed'}).then(x=>__fallback=x)}")
 p.locator('.rz-dc-fallback-scrim [role=dialog]').wait_for()
 check('Fallback dialog makes original workspace inert',p.evaluate("document.getElementById('authenticatedApp')?.inert===true"))
 p.locator('.rz-dc-fallback-scrim button').filter(has_text='Cancel').click();p.wait_for_function('__fallback===false')
 p.evaluate('()=>{HTMLDialogElement.prototype.showModal=__oldDialog;}')
 check('Fallback restores original inert state',p.evaluate("document.getElementById('authenticatedApp')?.inert===false"))
 # Small isolated form exercises the shared primitive, not a stand-in portal.
 p.evaluate("""()=>{const f=document.createElement('form');f.id='dcTestForm';f.innerHTML='<label>Required name<input id="dcTestName" required></label><label>Email<input id="dcTestEmail" type="email" required value="invalid"></label><button>Submit test</button>';f.onsubmit=e=>e.preventDefault();document.body.append(f);f.requestSubmit();}""")
 check('Required field is fully marked and receives first focus',p.evaluate("document.activeElement.id==='dcTestName' && document.getElementById('dcTestName').getAttribute('aria-invalid')==='true'"))
 p.locator('#dcTestName').fill('Preserved name');p.locator('#dcTestEmail').fill('valid@example.test')
 check('Resolved errors clear without changing entered data',p.evaluate("document.getElementById('dcTestName').value==='Preserved name'&&!document.getElementById('dcTestEmail').hasAttribute('aria-invalid')"))
 p.locator('#dcTestTrigger').focus();p.evaluate("RizSimUI.busyStart('dcTestBusy','Saving test')")
 check('Busy task disables only its initiating button',p.locator('#dcTestTrigger').is_disabled() and p.locator('#dcTestForm button').is_enabled())
 p.evaluate("RizSimUI.busyEnd('dcTestBusy')");check('Busy completion restores button and removes spinner',p.locator('#dcTestTrigger').is_enabled() and p.locator('#dcTestTrigger .rz-dc-busy-mark').count()==0)
 p.evaluate("RizSimUI.notify('Task saved successfully.','success');RizSimUI.notify('Unrecognized class code.','error');RizSimUI.notify('Request denied for this workspace.','denied')")
 for tone in ['success','error','denied']:
  check(tone+' outcome is labelled with a vector icon',p.locator('#rzDcToasts [data-rz-tone='+tone+'] svg').count()>=1)
 check('Reduced motion stops feedback animations',p.locator('#rzDcToasts [data-rz-tone=denied] .rz-dc-outcome').evaluate('(n)=>getComputedStyle(n).animationName')=='none')
 p.evaluate("document.getElementById('dcTestForm').remove();document.getElementById('dcTestTrigger').remove();document.getElementById('rzDcToasts').remove()")

ADMIN_TARGETS={'overview':[], 'categories':['#adminCategoryName','#saveAdminCategoryButton'],'simulations':['#adminSimulationTitle','#adminSimulationCategory','#adminSimulationLaunchPath','#adminSimulationAccessType','#adminSimulationPrice','#saveAdminSimulationButton'],'materials':['#adminResourceType','#adminResourceCategory','#adminResourceTitle','#adminResourceAccessType','#adminResourcePrice','#adminResourceFile','#saveAdminResourceButton'],'publishing':['#adminPublishingMessage']}
INST_TARGETS={'overview':['#institutionWorkspaceSelect'],'faculty':['#institutionFacultyName','#submitInstitutionFacultyRequest'],'classes':['#institutionClassesContent'],'simulations':['#institutionLicenceContent'],'analytics':['#institutionAnalyticsContent']}

def role_pass(browser,base,role,size):
 ctx,p,errors=open_page(browser,base,'access-in.html' if role=='student' else 'access-out.html',role,size)
 label=role+'-'+str(size[0])+'x'+str(size[1])
 try:
  check(label+' shared design available',p.evaluate("RizSimUI.version==='1.0'"))
  if role=='student':
   for view in ['home','resources','practice','learning','player','about','contact','account']:
    nav(p,role,view)
    targets=['#classCodeInput','#findClassButton'] if view=='player' else []
    measure(p,label+'-'+view,targets,screenshot=view in ['home','player','learning','practice'])
   nav(p,role,'player');p.locator('#classCodeInput').fill('');p.locator('#findClassButton').click()
   check(label+' actual code form focuses invalid field',p.evaluate("document.activeElement.id==='classCodeInput'"))
   p.locator('#classCodeInput').fill('TEST1234');p.locator('#findClassButton').click();p.wait_for_selector('.rz-c155-start')
   measure(p,label+'-classroom',['.rz-c155-start','#rzC155Resources'])
   check(label+' classroom file icons are graphical',p.locator('.rz-c155-material-icon svg').count()>0)
   p.locator('.rz-c155-start').click();p.locator('.rz-c155-erp[open]').wait_for();check(label+' original ERP consent dialog remains',p.locator('.rz-c155-erp input[type=checkbox]').count()==1);p.keyboard.press('Escape')
  else:
   open_menu(p)
   views=p.locator('#mainNav [data-auth-view]').evaluate_all("ns=>ns.filter(n=>n.getClientRects().length && !n.classList.contains('hidden')).map(n=>n.dataset.authView).filter(v=>v!=='account')")
   check(label+' role navigation exists',len(views)>0,views)
   if p.locator('#mobileMenuButton').is_visible() and p.locator('#mobileMenuButton').get_attribute('aria-expanded')=='true':p.locator('#mobileMenuButton').click()
   for view in [*views,'account']:
    nav(p,role,view)
    targets={'classroom':['#rzLiveChoices button'], 'records':['#rzSearchStudents','#rzClearRecords'], 'courses':['.rz-author-paths .rz-author-btn'], 'account':[]}.get(view,[])
    targets=[x for x in targets if p.locator(x).count() and p.locator(x).first.is_visible()]
    measure(p,label+'-'+view,targets,screenshot=view in ['home','classroom','institution','administration','courses','account'])
   if role in ['owner','admin']:
    nav(p,role,'administration')
    for tab,targets in ADMIN_TARGETS.items():
     p.locator('[data-admin-tab='+tab+']').click();p.wait_for_timeout(120)
     targets=[x for x in targets if p.locator(x).count() and p.locator(x).first.is_visible()]
     measure(p,label+'-admin-'+tab,targets)
    p.locator('[data-admin-tab=categories]').click();p.locator('#adminCategoryName').fill('');p.locator('#saveAdminCategoryButton').click()
    check(label+' real category validation focuses field',p.evaluate("document.activeElement.id==='adminCategoryName' && document.getElementById('adminCategoryName').getAttribute('aria-invalid')==='true'"))
    check(label+' Owner tools remain role-gated',p.locator('#ownerLicensePanel').is_visible()==(role=='owner'))
    if role=='owner':
     for id,title in [('ownerLicensePanel','Licences'),('ownerInstitutionPanel','Institutions'),('ownerFacultyRequestPanel','Faculty requests'),('ownerMembershipPanel','Memberships')]:
      p.locator('.rz-dc-section-links').get_by_role('link',name=title,exact=True).click();check(label+' owner shortcut '+title,p.evaluate('(id)=>document.activeElement.id===id',id))
   if role=='institution':
    nav(p,role,'institution')
    for tab,targets in INST_TARGETS.items():
     p.locator('[data-institution-tab='+tab+']').click();p.wait_for_timeout(120)
     measure(p,label+'-institution-'+tab,targets)
    p.locator('[data-institution-tab=faculty]').click();p.locator('#submitInstitutionFacultyRequest').click()
    check(label+' institution form identifies first missing input',p.evaluate("document.activeElement.id==='institutionFacultyName'"))
    check(label+' Institution has no content/governance tab',not p.locator('#mainNav [data-auth-view=administration]').is_visible())
   if role=='faculty' and size==(1366,768):shared_interactions(p)
  if size==(1366,768):
   p.add_style_tag(content='html{font-size:200% !important;}')
   measure(p,label+'-text200',require_p1=False)
  check(label+' no unhandled script errors',not errors,errors)
 finally:
  ctx.close()

def main():
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base='http://127.0.0.1:'+str(server.server_port)
 try:
  with sync_playwright() as pw:
   browser=pw.chromium.launch(headless=True,args=['--disable-dev-shm-usage'])
   for role in filter(None,os.getenv('RIZSIM_QA_ROLES','faculty,course_lead,student,owner,admin,institution').split(',')):
    for size in [(1366,768),(1440,900),(390,844)]:
     try:role_pass(browser,base,role,size)
     except Exception as e:check(role+' '+str(size)+' flow completed',False,str(e));ERRORS.append(traceback.format_exc())
   for path in ([] if os.getenv('RIZSIM_QA_SKIP_PUBLIC') else ['index.html','simulations.html','about.html','contact.html','access-in.html','access-out.html','course-material-viewer.html','resource-viewer.html','simulation-insight-to-implication.html','simulation-system-1-system-2.html','simulation-hotel-judgment.html']):
    for size in [(1366,768),(1440,900),(390,844)]:
     ctx=None
     try:
      ctx,p,_=open_page(browser,base,path,size=size)
      targets=['#googleLogin'] if path in ['access-in.html','access-out.html'] else []
      measure(p,path+'-'+str(size[0])+'x'+str(size[1]),targets)
      if targets:
       check(path+' Google icon preserved',p.locator('#googleLogin img.google-mark').get_attribute('src')=='google-g.svg')
      if path.startswith('simulation-'):
       check(path+' assessment has no operational outcome decorations',p.locator('.rz-dc-feedback').count()==0)
      if size==(390,844):
       p.add_style_tag(content='html{font-size:200% !important;}');p.wait_for_timeout(120)
       measure(p,path+'-text200',screenshot=True,require_p1=False)
     except Exception as e:check(path+' responsive pass completed',False,str(e));ERRORS.append(traceback.format_exc())
     finally:
      if ctx:ctx.close()
   # Existing unsupported role gate remains denied, not upgraded by UI.
   try:
    ctx,p,_=open_page(browser,base,'access-out.html','category_manager')
    check('Legacy Category Manager never gets active Owner or Admin workspace',not p.locator('#authenticatedApp').is_visible() and p.locator('#legacyGate').is_visible());ctx.close()
   except Exception as e:check('Legacy role gate',False,str(e))
   browser.close()
 finally:
  server.shutdown();(OUT/'report.json').write_text(json.dumps({'checks':CHECKS,'states':STATES,'errors':ERRORS,'scope':'synthetic browser evidence, not authenticated production acceptance'},indent=2))
 failures=[x for x in CHECKS if not x['passed']]
 print(json.dumps({'passed':len(CHECKS)-len(failures),'failed':len(failures),'states':len(STATES)}),flush=True)
 if failures:raise SystemExit(1)
if __name__=='__main__':main()
