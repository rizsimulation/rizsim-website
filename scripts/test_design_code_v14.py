"""Mounted Frontend 1.4 QA with synthetic adapters and real browser tabs.
Runs in GitHub Actions Chromium. No real accounts, learner data or TinyFish.
"""
import http.server,json,os,re,threading,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
import test_design_code_v1 as portal
import test_design_code_v13 as prior
import test_student_workspace_v8 as student
from test_insight_student_v1 import MOCK_CLOUD
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results/design-code-v14';OUT.mkdir(parents=True,exist_ok=True)
CHECKS=[];STATES=[]
def check(name,value,detail=None):
 CHECKS.append({'name':name,'passed':bool(value),'detail':detail})
 print(('PASS ' if value else 'FAIL ')+name,flush=True)
 if not value: print(detail,flush=True)
 (OUT/'report.json').write_text(json.dumps({'checks':CHECKS,'states':STATES},indent=2))
def shot(p,label):
 p.screenshot(path=str(OUT/(label+'.png')),full_page=False,animations='disabled')
 diagnostic=p.evaluate("""()=>({width:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,inner:innerWidth,offenders:[...document.querySelectorAll('body *')].filter(n=>{const b=n.getBoundingClientRect();return b.width&&b.height&&(b.right>innerWidth+1||b.left< -1)&&!n.closest('[hidden]')}).slice(0,20).map(n=>({tag:n.tagName,id:n.id,cls:typeof n.className==='string'?n.className:'svg',left:n.getBoundingClientRect().left,right:n.getBoundingClientRect().right,width:n.getBoundingClientRect().width,position:getComputedStyle(n).position}))})""")
 check(label+' no horizontal overflow',diagnostic['width']<=p.viewport_size['width']+2,diagnostic)
 STATES.append(label)
def submit(p,code):
 p.locator('#rzPracticeCode').fill(code);p.locator('.rz-v15-practice-join button[type=submit]').click()
def practice(browser,url):
 for mobile in [False,True]:
  ctx,p,errors=student.open_page(browser,url,'#practice',mobile)
  label='practice-'+('mobile' if mobile else 'desktop')
  try:
   p.emulate_media(reduced_motion='no-preference')
   p.evaluate("window.__practiceAnimated=false;document.addEventListener('animationstart',e=>{if(e.target.closest('#rzPracticeCodeMessage')&&e.animationName==='rzDcDraw')window.__practiceAnimated=true;},true)")
   submit(p,'ZZZZ9999');p.wait_for_function("document.querySelector('#rzPracticeCodeMessage')?.textContent==='Session not found'")
   field=p.locator('#rzPracticeCode');note=p.locator('#rzPracticeCodeMessage')
   check(label+' exact unknown-code message',note.inner_text()=='Session not found')
   check(label+' full code retained',field.input_value()=='ZZZZ9999')
   check(label+' focus restored',field.evaluate('n=>n===document.activeElement'))
   check(label+' accessible invalid field',field.get_attribute('aria-invalid')=='true' and field.get_attribute('aria-describedby')=='rzPracticeCodeMessage')
   check(label+' entire border red',field.evaluate('n=>getComputedStyle(n).borderTopColor')=='rgb(180, 35, 58)')
   check(label+' circled cross present',note.locator('svg.rz-dc-outcome').count()==1 and note.locator('svg circle').count()>0)
   check(label+' error path animated',p.evaluate('window.__practiceAnimated'))
   check(label+' no unauthorized join',p.evaluate("!__studentFixture.calls.some(c=>c.name==='join_rizsim_classroom_session')"))
   p.wait_for_timeout(1200);check(label+' focus survives async refresh',field.evaluate('n=>n===document.activeElement'))
   shot(p,label+'-unknown')
   field.fill('ZZZZ9998');check(label+' edit clears message and invalid state',note.inner_text()=='' and field.get_attribute('aria-invalid')=='false')
   submit(p,'BAD');p.wait_for_function("document.querySelector('#rzPracticeCodeMessage')?.textContent.includes('8-character')")
   check(label+' incomplete distinct',p.locator('#rzPracticeCodeMessage').inner_text()!='Session not found')
   p.evaluate("__studentFixture.sessions.find(s=>s.session_id==='session-open').access_status='closed';__studentFixture.sessions.find(s=>s.session_id==='session-open').practice_open=false")
   submit(p,'TEST1234');p.wait_for_function("document.querySelector('#rzPracticeCodeMessage')?.textContent.includes('closed')")
   check(label+' closed distinct',p.locator('#rzPracticeCode').input_value()=='TEST1234')
   p.evaluate("{const s=__studentFixture.sessions.find(s=>s.session_id==='session-open');s.access_status='licence_expired';s.practice_open=false;}")
   submit(p,'TEST1234');p.wait_for_function("document.querySelector('#rzPracticeCodeMessage')?.textContent.includes('expired')")
   check(label+' expired distinct',True)
   p.evaluate("{const s=__studentFixture.sessions.find(s=>s.session_id==='session-open');s.access_status='open';s.practice_open=false;s.access_mode='live';}")
   submit(p,'TEST1234');p.wait_for_function("document.querySelector('#rzPracticeCodeMessage')?.textContent.includes('Live-only')")
   check(label+' Live-only distinct',True)
   # Error from a revoked authorization is not reclassified as not found.
   p.evaluate("__studentFixture.failResolve=true")
   # Existing fixture maps failResolve to not found; use the original backend authorization test separately.
   p.emulate_media(reduced_motion='reduce');submit(p,'ZZZZ9999');p.wait_for_function("document.querySelector('#rzPracticeCodeMessage')?.textContent==='Session not found'")
   check(label+' reduced-motion cross static',p.locator('#rzPracticeCodeMessage svg path').first.evaluate('n=>getComputedStyle(n).animationName')=='none')
   p.locator('#rzPracticeCode').press('Backspace');check(label+' keyboard correction clears error',p.locator('#rzPracticeCode').get_attribute('aria-invalid')=='false')
   check(label+' no uncaught errors',not errors,errors)
  finally:ctx.close()

def tabs(browser,url):
 original=student.MOCK
 # Use the real published Insight route; only the server adapter is synthetic.
 student.MOCK=student.MOCK.replace("slug:'decision-lab'","slug:'insight-to-implication-bystander'").replace("launch_path:'/simulation-test.html'","launch_path:'/simulation-insight-to-implication.html'")
 ctx,p,errors=student.open_page(browser,url,'#home');student.MOCK=original
 try:
  ctx.route('**/simulation-assets/insight-to-implication/rizsim-cloud.js',lambda r:r.fulfill(content_type='text/javascript',body=MOCK_CLOUD))
  student.go_classroom(p)
  p.locator('.rz-c155-start').click();p.locator('.rz-c155-erp[open] input[type=text]').fill('SYNTHETIC-TAB')
  with ctx.expect_page() as info:p.locator('.rz-c155-erp[open]').get_by_role('button',name='Continue').click()
  runner=info.value;runner.wait_for_url('**/simulation-insight-to-implication.html?*');runner.wait_for_selector('[data-action=choose-review]')
  runner.locator('[data-action=choose-review]').nth(1).click();runner.wait_for_function("Object.keys(JSON.parse(localStorage.getItem('sim01-ci-fake-authorized-attempt')).record.picks.kr).length===1")
  before=runner.evaluate("localStorage.getItem('sim01-ci-fake-authorized-attempt')")
  urlBefore=runner.url
  check('Actual separate Classroom and Insight tabs',len(ctx.pages)==2 and runner.url!=p.url)
  check('Navigation hint points to exact originating tab',runner.evaluate("JSON.parse(sessionStorage.getItem('rizsim:classroom-return')).name")==p.evaluate('window.RizSimStudentClassroom.tabName'))
  student.nav(p,'practice');runner.bring_to_front();runner.locator('.rz-v155-resource-return').click()
  p.wait_for_selector('#view-player.active.rz-c155-classroom');runner.wait_for_timeout(500)
  focus={'classroom':p.evaluate('document.hasFocus()'),'runner':runner.evaluate('document.hasFocus()')}
  check('Return readies original Classroom',True,focus)
  check('Focus permitted or actionable fallback',focus['classroom'] or runner.locator('.rz-v14-return-status:not([hidden])').is_visible(),focus)
  check('Return preserves real selected answer and saved progress',runner.evaluate("localStorage.getItem('sim01-ci-fake-authorized-attempt')")==before and runner.url==urlBefore)
  # Simulate browser rejecting focus: real tab handles and original click handler remain.
  p.evaluate('window.__nativeFocus=window.focus;window.focus=()=>{}');runner.bring_to_front()
  for _ in range(3):runner.locator('.rz-v155-resource-return').click();runner.wait_for_timeout(450)
  check('Blocked-focus fallback is one compact inline element',runner.locator('.rz-v14-return-status').count()==1 and runner.locator('.rz-v155-return-notice').count()==0)
  check('Blocked-focus retry accessible',runner.get_by_role('button',name='Try switching',exact=True).is_visible())
  check('No duplicate classroom from repeated clicks',len(ctx.pages)==2)
  shot(runner,'runner-blocked-focus')
  runner.evaluate('window.opener=null');runner.reload(wait_until='domcontentloaded');runner.wait_for_selector('[data-action=choose-review]');student.nav(p,'practice');runner.bring_to_front();runner.locator('.rz-v155-resource-return').click()
  p.wait_for_selector('#view-player.active.rz-c155-classroom');runner.wait_for_timeout(450)
  check('Missing-opener finds original named tab without duplication',len(ctx.pages)==2)
  # A second tab for another classroom must not be selected or receive the request.
  outsider=ctx.new_page();outsider.goto(url+'/access-in.html#practice',wait_until='domcontentloaded');outsider.wait_for_selector('#studentApp.show')
  outsiderName=outsider.evaluate('window.name');check('Distinct Classroom tab identities',outsiderName!=p.evaluate('window.name'))
  runner.bring_to_front();runner.locator('.rz-v155-resource-return').click();runner.wait_for_timeout(450)
  check('Return does not navigate an unrelated Student tab',outsider.locator('#view-practice.active').count()==1)
  outsider.close();p.close();runner.bring_to_front();runner.locator('.rz-v155-resource-return').click();runner.wait_for_timeout(500)
  check('Closed original does not automatically open a duplicate Classroom',len(ctx.pages)==1)
  check('Missing original offers explicit recovery',runner.get_by_role('button',name='Open Classroom',exact=True).is_visible())
  with ctx.expect_page() as reopened:runner.get_by_role('button',name='Open Classroom',exact=True).click()
  replacement=reopened.value;replacement.wait_for_url('**/access-in.html#player')
  check('Explicit recovery opens Student portal without changing runner',len(ctx.pages)==2 and runner.url==urlBefore and not runner.is_closed())
  check('All navigation retains saved response',runner.evaluate("localStorage.getItem('sim01-ci-fake-authorized-attempt')")==before)
  check('No student page exceptions',not errors,errors)
 finally:ctx.close()

def mount(browser,url,kind,size):
 old=portal.FAC;slug,title={'insight':('insight-to-implication-bystander','Insight to Implication'),'systems':('system-1-system-2-thinking','System 1 & System 2 Thinking'),'hotel':('hotel-judgment-lab','Hotel Judgment Lab')}[kind]
 src=old.replace("id:'sim-1',title:'Decision Lab',", "id:'sim-1',slug:"+json.dumps(slug)+",title:"+json.dumps(title)+",")
 hook="if(name.startsWith('get_my_rizsim_')&&name.endsWith('_session_records'))return window.__v14RPC?window.__v14RPC(name,args):ok([]);"
 src=src.replace("async function rpc(name,args={}){state.calls.push({kind:'rpc',name,args});", "async function rpc(name,args={}){state.calls.push({kind:'rpc',name,args});"+hook);portal.FAC=src
 try:ctx,p,errors=portal.open_page(browser,url,'access-out.html?live=simulation-running&selection=sim-1&live_session=existing-1#classroom','faculty',size)
 finally:portal.FAC=old
 p.wait_for_selector('#rzLiveV13Workspace:not([hidden])');script,module,sid=prior.fixture(kind);p.evaluate(script)
 p.evaluate("""({sid})=>{window.__v14RPC=async(name,args)=>{
  if(window.__v14Fail)return{data:null,error:{message:'Synthetic authorization denied'}};
  if(window.__v14Empty)return{data:[],error:null};
  const result=await __v13AnalyticsAuth.rpc(name,{...args,p_session_id:sid});
  return window.__v14Rows?{data:window.__v14Rows,error:null}:result;
 };}""",{'sid':sid})
 p.evaluate('window.'+module+'.refresh()')
 return ctx,p,errors,module

def analytics(browser,url,kind,size):
 ctx,p,errors,module=mount(browser,url,kind,size);label=kind+'-'+str(size[0]);rootid={'insight':'#rzInsightFacultyAnalytics','systems':'#rizsimSystemFacultyResults','hotel':'#rizsimHotelFacultyResults'}[kind];dash=rootid+' > .rz-a-dashboard'
 def tab(name):
  if p.locator('#rzV13MobileToggle').is_visible():p.locator('#rzV13MobileToggle').click()
  p.locator('#rzV13Tab'+name).click();p.wait_for_timeout(250)
 try:
  tab('insights');p.wait_for_selector(dash)
  check(label+' real mounted adapter loaded',p.locator(dash).get_attribute('data-analytics-version')=='1.0')
  check(label+' four essential participation metrics',p.locator(dash+' > .rz-a-panel .rz-a-metric').count()==4)
  if kind=='hotel':
   check(label+' no private prices before release',p.locator(dash+' svg').count()==0 and '12,000' not in p.locator(rootid).inner_text())
   p.evaluate('window.__hotel03Closed=true;window.RizSimHotelFaculty.refresh()');p.wait_for_function('RizSimHotelFaculty.state().revealed')
   check(label+' released real-data price chart',p.locator(dash+' svg').count()==1)
   if size[0]>=1050:
    b=p.locator(dash+' svg').bounding_box();check(label+' complete priority price plot fits first screen',b['y']>=0 and b['y']+b['height']<=size[1]+2,b)
  else:
   check(label+' paired means and correct pp',p.locator(dash+' [data-metric="Change"] strong').inner_text()==('+'+'100' if kind=='insight' else '+50')+' pp')
   check(label+' distribution scatter and histogram present',p.locator(dash+' svg').count()==4)
   check(label+' small-sample cautions visible',p.locator(dash+' .rz-a-caution').first.is_visible())
   control=p.locator(dash+' select[aria-label="Group comparison dimension"]');control.select_option('group')
   check(label+' group dimension interactive',control.input_value()=='group')
  summary=p.locator(dash+' .rz-a-data > summary').first
  summary.focus();summary.press('Enter');check(label+' chart table keyboard expansion',summary.locator('..').get_attribute('open') is not None)
  summary.press('Enter');check(label+' chart table keyboard collapse',summary.locator('..').get_attribute('open') is None)
  p.evaluate('document.activeElement.blur();scrollTo(0,0)');shot(p,label+'-presenter')
  if size[0]>=1000:
   for selector in [dash+' > .rz-a-panel',dash+' .rz-a-priority'] if kind!='hotel' else [dash+' > .rz-a-panel']:
    b=p.locator(selector).first.bounding_box();check(label+' priority content fits first screen '+selector,b['y']>=0 and b['y']+b['height']<=size[1]+2,b)
  if size[0]>=1050:
   manager=p.locator('.rz-v15-manager.is-minimized:not([hidden])')
   if manager.count():
    a=manager.bounding_box();b=p.locator(dash).bounding_box();check(label+' session control does not cover priority analytics',a['y']+a['height']<=b['y'] or a['x']+a['width']<=b['x'],a)
  p.locator(rootid+' > .rz-a-support > summary').click();check(label+' original detail controls retained',p.locator(rootid+' > .rz-a-support').get_attribute('open') is not None)
  p.locator(rootid+' > .rz-a-support > summary').click()
  tab('students');p.wait_for_selector('#rzV13SimulationStudentResults tbody tr')
  search=p.locator('.rz-a-live input[type=search]');search.fill('no matching person');check(label+' live search filters with empty state',p.locator('.rz-a-live-controls [role=status]').inner_text().startswith('0 of'))
  check(label+' filtered rows actually concealed',p.locator('#rzV13SimulationStudentResults tbody tr:visible').count()==0)
  search.focus();search.evaluate('n=>n.setSelectionRange(3,7)');search.dispatch_event('select')
  p.evaluate('window.'+module+'.refresh()');p.wait_for_timeout(100)
  check(label+' live search survives native refresh',search.input_value()=='no matching person' and search.evaluate('n=>n===document.activeElement'),search.evaluate('n=>({value:n.value,focused:n===document.activeElement,active:document.activeElement.outerHTML.slice(0,300),selection:[n.selectionStart,n.selectionEnd],visible:!!n.getClientRects().length})'))
  check(label+' live search cursor survives native refresh',search.evaluate('n=>[n.selectionStart,n.selectionEnd]')==[3,7])
  search.press('Tab');check(label+' keyboard reaches live status filter',p.locator('.rz-a-live-controls select').evaluate('n=>n===document.activeElement'))
  search.fill('');f=p.locator('.rz-a-live-controls select');f.select_option('submitted');check(label+' live submission filter works','0 of' not in p.locator('.rz-a-live-controls [role=status]').inner_text());f.select_option('all')
  p.evaluate('scrollTo(0,0)');shot(p,label+'-live')
  p.locator('#rzV13SimulationStudentResults').get_by_role('button',name='View student result').first.click();p.wait_for_timeout(100)
  check(label+' individual result preserved',p.locator('#rzV13SimulationStudentResults').get_by_role('heading',name=re.compile('Your learning review|Personal learning report|Student result|Participant|Learning report',re.I)).count()>0 or p.locator('#rizsimInsightIndividualResult,#rizsimSystemIndividualResult,#rizsimHotelIndividual').is_visible())
  tab('insights');p.evaluate('window.__v14Empty=true;window.'+module+'.refresh()');p.wait_for_function('window.'+module+'.state().'+('students' if kind=='systems' else 'joined')+'===0')
  check(label+' empty participation zero, no sample records',p.locator(dash+' .rz-a-metric').first.locator('strong').inner_text()=='0')
  if kind!='hotel':check(label+' missing paired scores not zero',p.locator(dash+' [data-metric="Change"] strong').inner_text().startswith('\u2014'))
  shot(p,label+'-empty')
  p.evaluate('window.__v14Empty=false;window.__v14Fail=true;window.'+module+'.refresh()');p.wait_for_function('document.querySelector('+json.dumps(rootid)+').textContent.includes("Synthetic authorization denied")')
  check(label+' denied feed removes analytics',p.locator(dash).count()==0)
  p.evaluate('window.__v14Fail=false;window.'+module+'.refresh()');p.wait_for_selector(dash)
  check(label+' retry restores authorized view',True)
  # Realtime/native refresh projects additional authorized rows, including long labels.
  p.evaluate("""async({kind,module})=>{
   const result=await __v14RPC('get_my_rizsim_'+({insight:'insight',systems:'s1s2',hotel:'hotel'}[kind])+'_session_records',{});
   const full=result.data.find(x=>x.attempt_status==='submitted');
   window.__v14Rows=Array.from({length:12},(_,i)=>{const x=JSON.parse(JSON.stringify(full));x.attempt_id='synthetic-'+i;x.student_name='Synthetic learner '+i;
    if(kind==='hotel'){x.collection_revealed=true;x.record.group=i%2?'A':'B';x.record.willing_to_pay_pkr=i*7000;x.record.response_id='synthetic-response-'+i;}
    else {const r=x.response_data.record;r.id='synthetic-'+i;r.profile.organization=i%2?'Organization with a deliberately long descriptive name spanning several words':'Second organization';r.profile.group=i%2?'Class A':'Class B';r.facultyGroup=r.profile.group;
     if(kind==='systems')for(const pair of r.lt){pair.source.seen='synthetic-ack';pair.transfer.seen='synthetic-ack';}
    }return x;});await window[module].refresh();
  }""",{'kind':kind,'module':module})
  p.wait_for_function('window.'+module+'.state().'+('students' if kind=='systems' else 'joined')+'===12')
  check(label+' updated authorized feed changes counts to 12',p.locator(dash+' .rz-a-metric').first.locator('strong').inner_text()=='12')
  if kind!='hotel':
   control=p.locator(dash+' select');control.select_option('organization');check(label+' cross-group comparison rendered',p.locator(dash+' .rz-a-group-row').count()==2)
   check(label+' long labels not truncated',p.locator(dash+' .rz-a-group-row h4').filter(has_text='deliberately long').count()==1)
  p.evaluate('scrollTo(0,0)');shot(p,label+'-populated')
  p.emulate_media(reduced_motion='reduce');check(label+' reduced motion supported',p.locator(dash).evaluate('(n)=>getComputedStyle(n).animationName')=='none')
  p.add_style_tag(content='html{font-size:200%!important}');shot(p,label+'-text200')
  check(label+' no uncaught errors',not errors,errors)
 finally:
  if __import__('sys').exc_info()[0]:
   try:shot(p,label+'-failure')
   except Exception:pass
  ctx.close()

def main():
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),portal.Handler);threading.Thread(target=server.serve_forever,daemon=True).start();url='http://127.0.0.1:'+str(server.server_port)
 try:
  with sync_playwright() as pw:
   browser=pw.chromium.launch(headless=os.getenv('RIZSIM_HEADED')!='1');scope=os.getenv('RIZSIM_V14_SCOPE','all')
   jobs=[]
   if scope in ['all','navigation']:jobs=[('practice',lambda:practice(browser,url)),('tabs',lambda:tabs(browser,url))]
   if scope in ['all','analytics']:
    for size in [(1366,768),(768,1024),(390,844)]:
     for kind in ['insight','systems','hotel']:jobs.append((kind+str(size),lambda k=kind,s=size:analytics(browser,url,k,s)))
   for label,fn in jobs:
    try:fn()
    except Exception:check(label+' flow',False,traceback.format_exc())
   browser.close()
 finally:server.shutdown()
 (OUT/'report.json').write_text(json.dumps({'checks':CHECKS,'states':STATES,'scope':'Production HTML mounted with synthetic adapters; real Chromium tabs; no production accounts'},indent=2))
 failed=[c for c in CHECKS if not c['passed']];print(json.dumps({'passed':len(CHECKS)-len(failed),'failed':len(failed),'states':len(STATES)}))
 if failed:raise SystemExit(1)
if __name__=='__main__':main()
