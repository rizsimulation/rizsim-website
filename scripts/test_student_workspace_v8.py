"""Real student portal, isolated synthetic backend. No live login, writes or paid browser."""
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
 p.goto(base+'/access-in.html'+path,wait_until='networkidle');p.wait_for_selector('#studentApp.show');p.wait_for_selector('#rzStudentHistory .rz-st-history-card',state='attached');return ctx,p,errors

def nav(p,view):
 p.evaluate('(view)=>RizSimStudentBridge.navigate(view)',view);p.wait_for_selector('#view-'+view+'.active')

def run(browser,base):
 ctx,p,errors=open_page(browser,base)
 try:
  check('Requested Simulations and Account tabs removed',p.locator('#mainNav [data-student-view=simulations],#mainNav [data-student-view=account]').count()==0)
  check('My Learning is sidebar-only',p.locator('#mainNav [data-student-view=learning]').count()==0 and p.locator('#siteSidebar [data-rz-student-history]').count()==1)
  check('Practice and Library have visible main tabs',p.locator('#mainNav [data-student-view=practice]').is_visible() and p.locator('#mainNav [data-student-view=resources]').is_visible())
  p.wait_for_selector('#rizsimSharedHome.is-ready')
  tiles=p.locator('#rizsimSharedHome .bp-category-tile')
  check('Home has exactly two student destinations',tiles.count()==2 and 'Join a class' in tiles.nth(0).inner_text() and 'Simulation Library' in tiles.nth(1).inner_text())
  check('Shared Home hero and announcements retained',p.locator('#rizsimSharedHome .bp-hero').count()==1 and p.locator('#rizsimSharedHome .rizsim-announcement-card').count()==1)
  p.screenshot(path=str(OUT/'v8-student-home.png'),full_page=True)
  tiles.nth(0).click();p.wait_for_selector('#view-player.active')
  check('Join a class opens existing Player',p.locator('#classCodeInput').is_visible())
  p.locator('#classCodeInput').fill('test1234');p.locator('#findClassButton').click();p.wait_for_selector('[data-join-access=practice]')
  check('Original code normalization retained',p.locator('#classCodeInput').input_value()=='TEST1234')
  p.locator('[data-join-access=practice]').click();p.wait_for_selector('[data-launch-attempt]')
  check('Original join and launch handlers retained',p.evaluate('__studentFixture.calls.some(c=>c.name==="join_rizsim_classroom_session")'))
  p.wait_for_selector('#rzStudentPlayerMaterials .rz-st-resource-card')
  check('Authorized class resources are available in Player','Class handout' in p.locator('#rzStudentPlayerMaterials').inner_text())
  p.screenshot(path=str(OUT/'v8-student-player.png'),full_page=True)
  before=p.evaluate('__scrollCalls.length');nav(p,'practice')
  check('Practice navigation does not force scroll',p.evaluate('__scrollCalls.length')==before)
  check('Open and upcoming practice listed',p.locator('[data-practice-attempt]').count()==3)
  check('Submitted work omitted from active Practice',p.locator('[data-practice-attempt="attempt-2"]').count()==0)
  check('Expired work not reported as complete','unavailable or ended' in p.locator('#rzStudentPractice').inner_text())
  check('Upcoming practice disabled',p.locator('[data-practice-attempt="attempt-1"] button').is_disabled())
  first=p.locator('[data-practice-attempt="attempt-0"] [data-practice-countdown]');t1=first.inner_text();p.wait_for_timeout(1150);check('End-time countdown actually updates',first.inner_text()!=t1)
  p.screenshot(path=str(OUT/'v8-student-practice.png'),full_page=True)
  check('Multiple Practice class codes remain enterable',p.locator('.rz-v15-practice-join input').is_visible() and p.locator('.rz-v15-practice-join button[type=submit]').is_visible())
  check('No obsolete Practice launch modal',p.locator('.rz-st-launch-dialog').count()==0)
  check('Practice does not submit/reset answers',p.evaluate('__studentFixture.attempts.find(a=>a.id==="attempt-0").progress_percent')==35)
  nav(p,'learning');p.locator('#rzHistorySearch').fill('Attention')
  check('History search filters own records',p.locator('#rzStudentHistory [data-history-attempt]').count()==1)
  p.locator('#rzHistorySearch').fill('');p.locator('.rz-st-filter').filter(has_text='Submitted').click()
  check('Submission filter uses saved completion',p.locator('#rzStudentHistory [data-history-attempt]').count()==1)
  p.locator('.rz-st-filter').filter(has_text='All',has_not_text='Submitted').click()
  check('Another learner is never in history',p.locator('[data-history-attempt="foreign-attempt"]').count()==0)
  p.locator('.rz-st-event-detail').first.locator('summary').click()
  check('History shows real event dates','Last activity' in p.locator('.rz-st-event-detail').first.inner_text())
  p.screenshot(path=str(OUT/'v8-student-history.png'),full_page=True)
  nav(p,'resources');check('Library only lists participated simulations',p.locator('.rz-st-library-card').count()==2 and 'Unjoined Catalogue Simulation' not in p.locator('#rzStudentSimulationLibrary').inner_text())
  check('Existing eBook reading preserved',p.locator('#rzLibraryGrid').count()==1)
  p.screenshot(path=str(OUT/'v8-student-library.png'),full_page=True)
  p.locator('#sidebarToggle').click();p.locator('#siteSidebar [data-rz-student-history]').click();p.wait_for_selector('#view-learning.active')
  check('Sidebar history closes drawer',not p.locator('body').evaluate('(n)=>n.classList.contains("sidebar-open")'))
  p.locator('#sidebarToggle').click();p.locator('#siteSidebar .rz-profile-button').click();p.wait_for_selector('#rzStudentAccountDialog[open]')
  check('Account details open without Account tab','learner@example.test' in p.locator('#rzStudentAccountDialog').inner_text())
  p.locator('#rzStudentAccountDialog .rz-st-close').click()
  nav(p,'practice');p.evaluate('__studentFixture.failWorkspace=true');p.evaluate('RizSimStudentWorkspace.refresh(true)')
  check('Data failure never shows a false completion','could not be refreshed' in p.locator('#rzStudentPractice').inner_text() and 'Practice complete' not in p.locator('#rzStudentPractice').inner_text())
  p.evaluate('__studentFixture.failWorkspace=false');p.get_by_role('button',name='Try again').click();p.wait_for_selector('[data-practice-attempt]')
  check('Retry restores Practice list')
  p.evaluate('__studentFixture.failPractice=true');p.locator('[data-practice-attempt="attempt-0"] button').click();p.wait_for_selector('.rz-st-launch-dialog[open]')
  p.locator('.rz-st-launch-actions button').filter(has_text='Launch simulation').click()
  p.wait_for_selector('.rz-st-launch-feedback:visible')
  check('Revocation between modal and launch is denied','revoked' in p.locator('.rz-st-launch-feedback').inner_text().lower())
  check('Denied Practice stays on its page',p.locator('#view-practice.active').is_visible())
  p.locator('.rz-st-launch-dialog .rz-st-close').click();p.evaluate('__studentFixture.failPractice=false')
  p.evaluate('__studentFixture.attempts.filter(a=>a.user_id==="student-1").forEach(a=>{a.status="submitted";a.submitted_at=new Date().toISOString()})');p.evaluate('RizSimStudentWorkspace.refresh(true)')
  check('All-submitted state has completion treatment','Practice complete. Well done.' in p.locator('#rzStudentPractice').inner_text() and p.locator('[data-practice-attempt]').count()==0)
  p.screenshot(path=str(OUT/'v8-practice-completed.png'),full_page=True)
  check('No uncaught errors in desktop flows',not errors)
  p.evaluate('__studentFixture.delay=250;RizSimStudentWorkspace.refresh(true);__studentFixture.signOut()');p.wait_for_timeout(450)
  check('Sign-out clears cached learner content',p.locator('#rzStudentHistory [data-history-attempt]').count()==0 and p.locator('#studentApp.show').count()==0)
 finally:
  if sys.exc_info()[0]:p.screenshot(path=str(OUT/'v8-failure.png'),full_page=True)
  ctx.close()
 ctx,p,errors=open_page(browser,base,'#practice',True)
 try:
  check('Practice bookmark restores after sign-in',p.locator('#view-practice.active').is_visible())
  check('Mobile has no horizontal overflow',p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  p.screenshot(path=str(OUT/'v8-student-mobile.png'),full_page=True)
  nav(p,'resources');nav(p,'practice');p.go_back();p.wait_for_selector('#view-resources.active');p.go_forward();p.wait_for_selector('#view-practice.active');check('Back and Forward restore selected student tab')
  p.evaluate('__studentFixture.attempts.splice(0)');p.evaluate('RizSimStudentWorkspace.refresh(true)');check('New learner empty state does not invent submissions',"No practice sessions are available yet" in p.locator('#rzStudentPractice').inner_text())
  check('No mobile errors',not errors)
 finally:
  if sys.exc_info()[0]:p.screenshot(path=str(OUT/'v8-failure.png'),full_page=True)
  ctx.close()
 ctx,p,errors=open_page(browser,base,'?session=share-open#player')
 try:
  p.wait_for_selector('[data-join-access=practice]');check('Faculty invitation link still resolves the intended class','Decision Lab' in p.locator('#resolvedSessionCard').inner_text())
  p.evaluate('__studentFixture.attempts[0].status="submitted";__studentFixture.attempts[0].submitted_at=new Date().toISOString()');p.locator('[data-join-access=practice]').click();p.wait_for_selector('#joinedAttemptResult .launch-ready');check('Submitted attempt has no launch control',p.locator('[data-launch-attempt]').count()==0 and 'Submission complete' in p.locator('#joinedAttemptResult').inner_text())
  check('Invitation flow error-free',not errors)
 finally:
  if sys.exc_info()[0]:p.screenshot(path=str(OUT/'v8-failure.png'),full_page=True)
  ctx.close()


 ctx,p,errors=open_page(browser,base,'?session=share-open#player')
 try:
  p.wait_for_selector('[data-join-access=practice]');p.locator('[data-join-access=practice]').click();p.wait_for_selector('[data-launch-attempt]')
  p.evaluate('__studentFixture.delayAccess=400')
  original=p.url;p.locator('[data-launch-attempt]').click();p.evaluate('__studentFixture.signOut()');p.wait_for_timeout(550)
  check('Delayed launch response cannot navigate after sign-out',p.url==original and p.locator('#studentApp.show').count()==0 and not errors)
 finally:ctx.close()
 ctx,p,errors=open_page(browser,base,'?session=share-open#player')
 try:
  p.wait_for_selector('[data-join-access=practice]');p.locator('[data-join-access=practice]').click();p.wait_for_selector('#rzStudentPlayerMaterials .rz-st-resource-card button')
  p.evaluate('__studentFixture.delayMaterial=400')
  with p.expect_popup() as popup:
   p.locator('#rzStudentPlayerMaterials .rz-st-resource-card button').click()
  child=popup.value;p.evaluate('__studentFixture.signOut()');p.wait_for_timeout(550)
  check('Delayed material response closes its blank window after sign-out',child.is_closed() and not errors)
 finally:ctx.close()


 ctx,p,errors=open_page(browser,base)
 try:
  p.evaluate("__studentFixture.allowNewJoin=true;__studentFixture.sessions.push({...__studentFixture.sessions[0],session_id:'session-new',class_code:'NEWP1234',class_name:'Freshly joined class'});__studentFixture.materials.push({...__studentFixture.materials[0],material_id:'material-new',course_id:'session-new',title:'New class handout'})")
  nav(p,'player');p.locator('#classCodeInput').fill('NEWP1234');p.locator('#findClassButton').click();p.wait_for_selector('[data-join-access=practice]')
  p.locator('[data-join-access=practice]').click();p.wait_for_selector('[data-launch-attempt]')
  p.locator('#rzStudentPlayerMaterials .rz-st-resource-card').filter(has_text='New class handout').wait_for(timeout=5000)
  check('First-time join immediately reveals its authorized class resources')
  nav(p,'practice');p.wait_for_selector('[data-practice-attempt="attempt-new"]',timeout=5000)
  check('First-time join immediately appears in Practice without manual refresh',not errors)
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
  (OUT/'student-v8-summary.json').write_text(json.dumps({'status':'passed','checks':checks,'backend':'isolated synthetic only'},indent=2));print('PASS',len(checks),'student browser assertions')
 finally:server.shutdown()
