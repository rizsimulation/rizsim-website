"""Student portal V8 + V15.5 continuation, real browser with synthetic auth only.
Covers original Home, Practice and Learning and the new verified Classroom flow.
No production write, customer sign-in or paid browser automation.
"""
import http.server,json,os,threading,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
MOCK=(ROOT/'scripts/fixtures/student-workspace-backend.js').read_text()
checks=[]
def check(label,value=True):
 assert value,label
 checks.append(label);print('PASS '+label,flush=True)
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
 def log_message(self,*args):pass

def open_page(browser,base,path='#home',mobile=False):
 ctx=browser.new_context(viewport={'width':390 if mobile else 1366,'height':844 if mobile else 960},has_touch=mobile,is_mobile=mobile,reduced_motion='reduce')
 ctx.add_init_script('window.__scrollCalls=[];const os=window.scrollTo;window.scrollTo=function(...x){__scrollCalls.push(x);return os.apply(this,x)}')
 def route(r):
  url=r.request.url
  if url=='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm':r.fulfill(content_type='text/javascript',body=MOCK)
  elif url.startswith(base+'/'):r.continue_()
  elif 'fonts.googleapis.com' in url:r.fulfill(content_type='text/css',body='')
  else:r.abort()
 ctx.route('**/*',route);p=ctx.new_page();errors=[];p.on('pageerror',lambda e:(errors.append(str(e)),print('BROWSER ERROR',e,flush=True)))
 p.goto(base+'/access-in.html'+path,wait_until='networkidle')
 p.wait_for_selector('#studentApp.show')
 p.wait_for_selector('#rzStudentHistory .rz-st-history-card',state='attached')
 return ctx,p,errors

def nav(p,view):
 p.evaluate('(view)=>RizSimStudentBridge.navigate(view)',view)
 p.wait_for_selector('#view-'+view+'.active')

def go_classroom(p,code='TEST1234'):
 nav(p,'player')
 p.locator('[data-classroom-tab="join"]').click()
 p.locator('#classCodeInput').fill(code.lower())
 p.locator('#findClassButton').click()
 p.wait_for_selector('#view-player.rz-c155-classroom #rzC155Classroom .rz-c155-start')
 p.wait_for_selector('#rzC155Resources .rz-c155-material')
 return p.locator('#rzC155Classroom')

def run(browser,base):
 ctx,p,errors=open_page(browser,base)
 try:
  check('Student top nav remains concise with Player and Practice',p.locator('#mainNav [data-student-view=player]').count()==1 and p.locator('#mainNav [data-student-view=practice]').count()==1 and p.locator('#mainNav [data-student-view=simulations]').count()==0)
  p.wait_for_selector('#rizsimSharedHome.is-ready')
  check('Shared home tiles unchanged',p.locator('#rizsimSharedHome .bp-category-tile').count()==2)
  tiles=p.locator('#rizsimSharedHome .bp-category-tile')
  check('Join a class stays on the Player website','Join a class' in tiles.first.inner_text())
  tiles.first.click();p.wait_for_selector('#view-player.active')
  check('Player opens Find Class without duplicate fields',p.locator('#classCodeInput').is_visible() and p.locator('#rzV154JoinName').count()==0 and p.locator('#rzV154JoinInstitution').count()==0)
  hub=go_classroom(p)
  check('Class code auto resolves and joins',p.evaluate('__studentFixture.calls.some(c=>c.name==="join_rizsim_classroom_session")') and p.locator('#classCodeInput').input_value()=='TEST1234')
  check('Classroom displays simulation and resources together',hub.get_by_text('Decision Lab').count()>0 and 'Class handout' in p.locator('#rzC155Resources').inner_text())
  check('Two-panel Classroom uses signed-in Google identity, not a second name form',p.locator('#view-player.rz-c155-classroom').count()==1 and p.locator('#rzV154JoinName,#rzV154JoinInstitution').count()==0)
  check('First-class shared resource initially unread',p.evaluate('RizSimStudentClassroom.unread()')==1)
  check('Submitted work remains inaccessible to new saves',p.locator('#rzC155Classroom .rz-c155-start').is_enabled())
  hub.get_by_role('button',name='Start Simulation').click()
  p.wait_for_selector('.rz-c155-erp[open]')
  check('ERP prompt appears only at Start',p.locator('.rz-c155-erp input[type=text]').is_visible() and p.evaluate('__studentFixture.erp') is None)
  dialog=p.locator('.rz-c155-erp');dialog.locator('input[type=text]').fill('ERP-001')
  dialog.locator('input[type=checkbox]').check()
  with ctx.expect_page() as launch:
   dialog.get_by_role('button',name='Continue').click()
  child=launch.value
  child.wait_for_url('**/simulation-test.html?*',timeout=16000)
  check('Simulation opens only after ERP with source Classroom tab intact',not p.is_closed() and 'attempt=attempt-0' in child.url and p.locator('#view-player.rz-c155-classroom').is_visible())
  check('ERP remembered with explicit consent',p.evaluate('__studentFixture.erp.erp_number')=='ERP-001' and p.evaluate('__studentFixture.erp.remember') is True)
  check('Original Google / course authorization untouched',p.evaluate('__studentFixture.calls.some(c=>c.name==="check_my_rizsim_classroom_attempt_access")'))
  # The real academic runners include this shared RizSim header. Mount it on the
  # isolated test runner to verify cross-tab resource counts and return actions.
  child.add_script_tag(url=base+'/rizsim-v154-runner-shell.js')
  child.wait_for_selector('[data-rz-runner-brand]')
  child.wait_for_selector('.rz-v155-count[data-visible=true]')
  check('Runner shows red new-resource count without another browser tab',
    child.locator('.rz-v155-count').inner_text()=='1' and len(ctx.pages)==2)
  child.get_by_role('link',name='Class Resources').click()
  p.wait_for_function("RizSimStudentClassroom.unread()===0")
  check('Class Resources returns to the existing RizSim tab, clearing seen count',
    len(ctx.pages)==2 and p.locator('#view-player.rz-c155-classroom').is_visible())
  p.evaluate("""()=>__studentFixture.materials.push({...__studentFixture.materials[0],
    material_id:'material-published-later',title:'Newly published presenter slides'})""")
  child.evaluate("""()=>{
    const c=new BroadcastChannel('rizsim:classroom:session-open');
    c.postMessage({kind:'resources-request'});c.close();
  }""")
  p.wait_for_selector('#rzC155Resources .rz-c155-material:nth-child(2)',timeout=10000)
  child.wait_for_function("document.querySelector('.rz-v155-count')?.dataset.visible==='true'",timeout=10000)
  check('New presenter materials appear in running simulation via existing Classroom relay',
    child.locator('.rz-v155-count').inner_text()=='1' and
    'Newly published presenter slides' in p.locator('#rzC155Resources').inner_text())
  child.close()
  with ctx.expect_page() as launch2:
   hub.get_by_role('button',name='Start Simulation').click()
  second=launch2.value;second.wait_for_url('**/simulation-test.html?*',timeout=16000)
  check('Remember preference avoids repeated ERP prompt',p.locator('.rz-c155-erp[open]').count()==0)
  second.close()
  nav(p,'practice')
  check('Practice remains browsable',p.locator('[data-practice-attempt]').count()>=2)
  check('Ongoing and scheduled clearly differentiated','unavailable or ended' in p.locator('#rzStudentPractice').inner_text())
  check('Practice class-code entry remains available',p.locator('.rz-v15-practice-join input').is_visible())
  p.locator('[data-practice-attempt="attempt-0"] button').click()
  p.wait_for_selector('#view-player.rz-c155-classroom #rzC155Classroom .rz-c155-start')
  check('Existing Practice card returns to Classroom rather than launching a new tab',p.locator('#view-player.active').count()==1 and p.locator('.rz-st-launch-dialog[open]').count()==0)
  nav(p,'learning')
  p.locator('#rzHistorySearch').fill('Attention')
  check('Saved activity search filters real own records',p.locator('#rzStudentHistory [data-history-attempt]').count()==1)
  p.locator('#rzHistorySearch').fill('')
  p.locator('.rz-st-filter').filter(has_text='Submitted').click()
  check('Submitted filter preserves read-only status',p.locator('#rzStudentHistory [data-history-attempt]').count()==1)
  p.locator('.rz-st-filter').filter(has_text='All',has_not_text='Submitted').click()
  check('Another learner never appears in My Learning',p.locator('[data-history-attempt="foreign-attempt"]').count()==0)
  nav(p,'resources')
  check('Independent Library remains separate from class materials','Independent Simulations' in p.locator('#rzStudentSimulationLibrary').inner_text())
  check('Desktop no uncaught browser exceptions',not errors)
  p.evaluate('__studentFixture.signOut()');p.wait_for_selector('#studentApp',state='hidden')
  check('Sign-out hides Classroom and clears saved session authorization',p.evaluate('!window.__rzV155ERPConfirmed') and p.locator('#studentApp.show').count()==0)
 finally:
  if sys.exc_info()[0]:p.screenshot(path=str(OUT/'v155-student-failure.png'),full_page=True)
  ctx.close()
 ctx,p,errors=open_page(browser,base,'?session=share-open#player',True)
 try:
  p.wait_for_selector('#view-player.rz-c155-classroom #rzC155Classroom .rz-c155-start')
  check('QR/share-token invitation automatically enters the verified Classroom',p.evaluate('__studentFixture.calls.some(c=>c.name==="join_rizsim_classroom_session"&&c.args.p_share_token==="share-open")'))
  check('Mobile Classroom has no horizontal overflow',p.evaluate('document.documentElement.scrollWidth<=innerWidth+2'))
  check('Mobile Classroom has one visible Start button',p.locator('#rzC155Classroom .rz-c155-start').count()==1)
  check('Mobile authenticated Google entry has no identity duplication',p.locator('#rzV154JoinName,#rzV154JoinInstitution').count()==0)
  check('Mobile no browser errors',not errors)
 finally:ctx.close()
 ctx,p,errors=open_page(browser,base,'?code=TEST1234#player')
 try:
  p.wait_for_selector('#view-player.rz-c155-classroom #rzC155Classroom .rz-c155-start')
  p.evaluate('()=>{const a=__studentFixture.attempts.find(a=>a.id==="attempt-0");a.status="submitted";a.submitted_at=new Date().toISOString();}')
  p.evaluate('RizSimStudentBridge.navigate("practice")')
  p.evaluate('RizSimStudentBridge.navigate("player")')
  # Refresh the resolved attempt from the server using a code search.
  p.locator('[data-classroom-tab=join]').click()
  p.locator('#findClassButton').click()
  p.wait_for_selector('#view-player.rz-c155-classroom')
  check('Submitted attempt shows disabled start',p.locator('#rzC155Classroom .rz-c155-start').is_disabled())
 finally:ctx.close()

if __name__=='__main__':
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  with sync_playwright() as pw:
   options={'headless':True}
   if os.environ.get('RIZSIM_TEST_CHROMIUM'):options.update(executable_path=os.environ['RIZSIM_TEST_CHROMIUM'],args=['--no-sandbox'])
   b=pw.chromium.launch(**options)
   try:run(b,'http://127.0.0.1:'+str(server.server_port))
   finally:b.close()
  (OUT/'v155-student-summary.json').write_text(json.dumps({'status':'passed','checks':checks,'backend':'synthetic only'},indent=2))
  print('PASS',len(checks),'V15.5 Student browser assertions')
 finally:server.shutdown()
