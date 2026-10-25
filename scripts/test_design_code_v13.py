from frontend_v14_scope import presentation_equivalent, runner_suffix_equivalent
"""Design Code 1.3: real runner stages and real mounted Faculty tabs.
Synthetic adapters only. No production login, data access or writes.
"""
import ast, http.server, json, os, re, subprocess, sys, threading, traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
import test_design_code_v1 as base
from test_insight_student_v1 import MOCK_CLOUD
from test_sim02_student_v1 import MOCK as SYSTEM_MOCK, AID as SYSTEM_AID, SID
from test_sim03_student_v1 import FAKE_JS as HOTEL_MOCK, AID as HOTEL_AID
ROOT=base.ROOT
OUT=ROOT/'test-results'/'design-code-v13';OUT.mkdir(parents=True,exist_ok=True)
CHECKS=[];STATES=[]

def check(label,passed,detail=None):
 CHECKS.append({'name':label,'passed':bool(passed),'detail':detail})
 print(('PASS ' if passed else 'FAIL ')+label,flush=True)
 (OUT/'report.json').write_text(json.dumps({'checks':CHECKS,'states':STATES,'scope':'actual HTML and mounted tabs with synthetic adapters'},indent=2))

def capture(p,label,targets=()):
 p.evaluate('window.scrollTo({top:0,behavior:"instant"})');p.wait_for_timeout(100)
 result=p.evaluate("""() => ({width:innerWidth,height:innerHeight,scroll:document.documentElement.scrollWidth,learning:document.body.dataset.rzLearning,
 headers:[...document.querySelectorAll('#app h1,#app h2,#rzLiveV13Workspace h2')].filter(n=>n.getClientRects().length).map(n=>({text:n.textContent,px:parseFloat(getComputedStyle(n).fontSize)}))})""")
 result['name']=label;result['targets']=[]
 check(label+' no horizontal overflow',result['scroll']<=result['width']+2,result)
 for selector in targets:
  n=p.locator(selector).first
  check(label+' visible '+selector,n.count()>0 and n.is_visible())
  if n.count() and n.is_visible():
   b=n.bounding_box();fit=b['y']>=0 and b['y']+b['height']<=result['height']
   result['targets'].append({'selector':selector,'bounds':b,'fit':fit})
   if result['width']>=1000:check(label+' Priority 1 fits '+selector,fit,b)
 p.screenshot(path=str(OUT/(re.sub('[^a-zA-Z0-9_-]','-',label)+'.png')),full_page=False,animations='disabled')
 STATES.append(result)

def runner(browser,url,name,size,access='practice'):
 ctx=browser.new_context(viewport={'width':size[0],'height':size[1]},reduced_motion='no-preference',has_touch=size[0]<600,is_mobile=size[0]<600,accept_downloads=True)
 if name=='systems':ctx.add_init_script(SYSTEM_MOCK)
 if name=='hotel':ctx.add_init_script("window.__hotel03Group='A';"+HOTEL_MOCK)
 def route(r):
  u=r.request.url
  if u.endswith('/simulation-assets/insight-to-implication/rizsim-cloud.js'):r.fulfill(content_type='text/javascript',body=MOCK_CLOUD)
  elif u.endswith('/simulation-assets/system-1-system-2/cloud.js') or u.endswith('/simulation-assets/hotel-judgment/cloud.js'):
   path=u.split(url+'/')[1];src=(ROOT/path).read_text();needle="const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/+esm');"
   assert src.count(needle)==1
   src=src.replace(needle,'const createClient=window.'+('__sim02CreateClient' if name=='systems' else '__sim03CreateClient')+';')
   r.fulfill(content_type='text/javascript',body=src)
  elif u.startswith(url+'/'):r.continue_()
  else:r.abort()
 ctx.route('**/*',route);p=ctx.new_page();p.set_default_timeout(9000);errors=[]
 p.on('pageerror',lambda e:errors.append(str(e)))
 p.on('dialog',lambda d:(errors.append('native dialog: '+d.message),d.dismiss()))
 path={'insight':'simulation-insight-to-implication.html','systems':'simulation-system-1-system-2.html','hotel':'simulation-hotel-judgment.html'}[name]
 aid=HOTEL_AID if name=='hotel' else SYSTEM_AID
 ctx.add_init_script("sessionStorage.setItem('rizsim:v154:participant',JSON.stringify({at:Date.now(),attempt:"+json.dumps(aid)+",session:"+json.dumps(SID)+",erp:'QA13',name:'Synthetic Learner',institution:'Synthetic class'}))")
 p.goto(url+'/'+path+'?attempt='+aid+'&session='+SID+'&access='+access,wait_until='domcontentloaded')
 p.wait_for_function("document.body.dataset.rzLearning==="+json.dumps(name))
 return ctx,p,errors

def insight(browser,url,size,access='practice',correct=False):
 ctx,p,errors=runner(browser,url,'insight',size,access);label=f'insight-{access}-{size[0]}-'+('correct' if correct else 'review')
 try:
  p.wait_for_selector('[data-action=choose-review]')
  capture(p,label+'-KR',['.choices','.actions.end'])
  for i in range(6):
   capture(p,label+'-KR-q'+str(i+1),['.choices','.actions.end'])
   p.locator('[data-action=choose-review]').first.click()
   check(label+' no verdict before KR lock '+str(i),p.locator('.rz-learning-verdict').count()==0)
   if i<5:p.locator('[data-action=next]').click()
  p.locator('[data-action=lock-review]').click();capture(p,label+'-confirmation')
  p.locator('[data-action=accept-confirm]').click();p.wait_for_selector('[data-action=choose-case]')
  chosen=[]
  for phase in ['source','transfer']:
   key=p.evaluate('InsightData.'+phase+'.key');letter=key if correct else next(x for x in ['A','B','C','D'] if x!=key);chosen.append(letter)
   p.locator('[data-action=choose-case][data-letter='+letter+']').click()
   capture(p,label+'-'+phase)
   check(label+' selection is neutral '+phase,p.locator('.rz-learning-verdict').count()==0)
   p.locator('[data-action=lock-case]').click();p.locator('[data-action=accept-confirm]').click()
   if phase=='source':
    p.wait_for_selector('#bridge-check');capture(p,label+'-bridge');p.locator('#bridge-check').check();p.locator('[data-action=bridge-ack]').click();p.wait_for_selector('[data-action=choose-case]')
  p.wait_for_selector('[data-action=feedback-ack]');p.wait_for_timeout(80)
  capture(p,label+'-feedback')
  if access=='practice':
   state='success' if correct else 'review';marks=p.locator('.rz-learning-verdict[data-outcome='+state+']')
   check(label+' released verdict icons',marks.count()==2)
   check(label+' visible labelled feedback',all(marks.nth(i).get_attribute('aria-label') for i in range(marks.count())))
   check(label+' verdict and explanation never overlap',p.locator('.outcome').evaluate('n=>{const a=n.querySelector(".outcome-mark").getBoundingClientRect(),b=n.lastElementChild.getBoundingClientRect();return a.right<=b.left+1||a.bottom<=b.top+1}'))
   check(label+' stroke animation exists',p.locator('.rz-learning-outcome path').first.evaluate('(n)=>getComputedStyle(n).animationName')=='rzLearningStroke')
   p.emulate_media(reduced_motion='reduce')
   check(label+' reduced motion',p.locator('.rz-learning-outcome path').first.evaluate('(n)=>getComputedStyle(n).animationName')=='none')
  else:check(label+' live verdict decoration not injected',p.locator('.rz-learning-verdict').count()==0)
  rec=p.evaluate("JSON.parse(localStorage.getItem('sim01-ci-fake-authorized-attempt')).record")
  check(label+' original locked choices unchanged',[rec['picks']['source'],rec['picks']['transfer']]==chosen and rec['locks']['source'] and rec['locks']['transfer'])
  if p.locator('#feedback-check').count():p.locator('#feedback-check').check()
  p.locator('[data-action=feedback-ack]').click();p.wait_for_selector('[data-action=choose-review][data-phase=kg]');capture(p,label+'-KG',['.choices','.actions.end'])
  for i in range(6):
   capture(p,label+'-KG-q'+str(i+1),['.choices','.actions.end'])
   p.locator('[data-action=choose-review]').first.click()
   if i<5:p.locator('[data-action=next]').click()
  p.locator('[data-action=lock-review]').click();p.locator('[data-action=accept-confirm]').click()
  p.get_by_text('Submission confirmed by RizSim').wait_for();capture(p,label+'-results')
  check(label+' exactly one verified submission',p.evaluate('window.__sim01SubmissionCount')==1)
  check(label+' no page errors',not errors,errors)
 finally:
  if sys.exc_info()[0]:
   try:p.screenshot(path=str(OUT/(label+'-failure.png')),full_page=False)
   except Exception:pass
  ctx.close()

def systems(browser,url,size):
 ctx,p,errors=runner(browser,url,'systems',size);label=f'systems-{size[0]}'
 try:
  p.get_by_role('heading',name='Your starting understanding').wait_for();capture(p,label+'-KR',['.options','.workspace>.panel>.actions'])
  def reviews(stage):
   for i in range(6):
    capture(p,label+'-'+stage+'-q'+str(i+1),['.options','.workspace>.panel>.actions'])
    p.locator('label.option').first.click()
    if i<5:p.get_by_role('button',name='Next question').click()
   p.get_by_role('button',name=f'Lock {stage}').click();p.get_by_role('dialog',name='Confirm your decision').get_by_role('button',name='Confirm & lock').click()
  reviews('KR');p.wait_for_selector('.case-board')
  for i in range(2):
   for kind in ['source','transfer']:
    capture(p,label+f'-pair{i}-{kind}')
    p.locator('label.option').first.click();p.get_by_role('button',name=re.compile('Commit '+kind+' decision')).click()
    p.get_by_role('dialog',name='Confirm your decision').get_by_role('button',name='Confirm & lock').click()
    p.wait_for_selector('.feedback-icon[data-rz-enhanced]')
    check(label+f'-{i}-{kind} truthful instructional feedback',p.locator('.feedback').get_attribute('data-rz-feedback')=='instructional' and p.locator('.rz-learning-verdict').count()==0)
    capture(p,label+f'-pair{i}-{kind}-feedback')
    p.get_by_role('button',name=re.compile('Apply in a new case|Continue to the second pair|Begin Knowledge Gain')).click()
  p.get_by_role('heading',name='Your fresh review').wait_for();capture(p,label+'-KG',['.options','.workspace>.panel>.actions']);reviews('KG')
  p.get_by_role('heading',name='Your learning review').wait_for();capture(p,label+'-results')
  d=p.evaluate('window.__sim02FakeState()');check(label+' 16 decisions and one submission',d['submits']==1 and d['saved']['response_data']['committed_count']==16)
  check(label+' no page errors',not errors,errors)
 finally:
  if sys.exc_info()[0]:
   try:p.screenshot(path=str(OUT/(label+'-failure.png')),full_page=False)
   except Exception:pass
  ctx.close()

def hotel(browser,url,size):
 ctx,p,errors=runner(browser,url,'hotel',size);label=f'hotel-{size[0]}'
 try:
  p.wait_for_selector('#stimulusStage:not(.hidden)');p.wait_for_function('RizHotelStimuli.ready')
  capture(p,label+'-assigned-stimulus')
  check(label+' four original pictures',p.locator('img[data-hotel-view]').count()==4)
  dimensions=p.locator('img[data-hotel-view]').evaluate_all('ns=>ns.map(n=>({src:n.getAttribute("src"),width:n.naturalWidth,height:n.naturalHeight}))')
  check(label+' actual image bytes loaded',all(x['width']>0 and 'hotel_view_' in x['src'] for x in dimensions),dimensions)
  p.locator('#responseForm button[type=submit]').click();capture(p,label+'-invalid')
  check(label+' existing invalid response explanation',bool(p.locator('#validation').inner_text().strip()))
  p.locator('#yesBtn').click();p.locator('#wtp').fill('12500');p.locator('#responseForm button[type=submit]').click()
  p.wait_for_selector('#submittedStage:not(.hidden)');capture(p,label+'-submitted')
  check(label+' judgment not labelled right/wrong',p.locator('.rz-learning-verdict').count()==0)
  check(label+' original one submission',p.evaluate('__hotel03FakeState().submits')==1)
  check(label+' no page errors',not errors,errors)
 finally:
  if sys.exc_info()[0]:
   try:p.screenshot(path=str(OUT/(label+'-failure.png')),full_page=False)
   except Exception:pass
  ctx.close()

# Reuse the existing test datasets, but mount them in the actual portal instead of a
# set_content harness. Original client remains the Faculty auth/runtime owner.
def fixture(kind):
 names={'insight':('test_insight_faculty_v1.py','const fakeRows=','RizSimInsightFaculty','session-a'), 'systems':('test_sim02_faculty_v1.py','window.__classes=','RizSimSystemFaculty','session-01'), 'hotel':('test_sim03_faculty_v1.py','window.__hotel03Roster=','RizSimHotelFaculty','session-hotel-1')}
 path,marker,module,sid=names[kind]
 strings=[n.value for n in ast.walk(ast.parse((ROOT/'scripts'/path).read_text())) if isinstance(n,ast.Constant) and isinstance(n.value,str) and marker in n.value]
 s=max(strings,key=len);s=s[:s.rfind('window.'+module+'.draw')]+'}'
 s=s.replace('window.rizsimSharedAuth=','window.__v13AnalyticsAuth=')
 return s,module,sid

def faculty(browser,url,kind,size,role='faculty'):
 original=base.FAC
 slug,title={'insight':('insight-to-implication-bystander','Insight to Implication'),'systems':('system-1-system-2-thinking','System 1 & System 2 Thinking'),'hotel':('hotel-judgment-lab','Hotel Judgment Lab')}[kind]
 src=original.replace("id:'sim-1',title:'Decision Lab',", "id:'sim-1',slug:"+json.dumps(slug)+",title:"+json.dumps(title)+",")
 hook="if(name.startsWith('get_my_rizsim_')&&name.endsWith('_session_records'))return window.__v13RPC?window.__v13RPC(name,args):ok([]);"
 src=src.replace("async function rpc(name,args={}){state.calls.push({kind:'rpc',name,args});", "async function rpc(name,args={}){state.calls.push({kind:'rpc',name,args});"+hook)
 base.FAC=src;ctx=None;label=f'{role}-{kind}-{size[0]}'
 try:
  ctx,p,errors=base.open_page(browser,url,'access-out.html?live=simulation-running&selection=sim-1&live_session=existing-1#classroom',role,size)
  p.wait_for_selector('#rzLiveV13Workspace:not([hidden])');script,module,sid=fixture(kind);p.evaluate(script)
  p.evaluate('(sid)=>{window.__v13RPC=(name,args)=>window.__v13Fail?Promise.resolve({data:null,error:{message:"Synthetic result unavailable"}}):__v13AnalyticsAuth.rpc(name,{...args,p_session_id:sid})}',sid)
  p.evaluate('window.'+module+'.refresh()')
  rootid={'insight':'#rzInsightFacultyAnalytics','systems':'#rizsimSystemFacultyResults','hotel':'#rizsimHotelFacultyResults'}[kind]
  def tab(name):
   if p.locator('#rzV13MobileToggle').is_visible():p.locator('#rzV13MobileToggle').click()
   p.locator('#rzV13Tab'+name).click();p.wait_for_timeout(150)
  tab('students');p.wait_for_selector('#rzV13SimulationStudentResults tbody tr')
  check(label+' actual portal styling loaded',p.locator('#rzLiveV13Workspace').evaluate('(n)=>getComputedStyle(n).getPropertyValue("--rz-faculty-ready").trim()')=='1')
  capture(p,label+'-live-responses',['#rzV13SimulationStudentResults h2','#rzV13SimulationStudentResults tbody tr:first-child'])
  check(label+' actual headers compact',p.locator('#rzV13SimulationStudentResults h2').first.evaluate('(n)=>parseFloat(getComputedStyle(n).fontSize)')<=24)
  if kind=='hotel':
   check(label+' collection stays sealed',p.locator('#rzV13Panestudents button:has-text("View student result"):enabled').count()==0)
   p.evaluate('window.__hotel03Closed=true;window.RizSimHotelFaculty.refresh()');p.wait_for_function('RizSimHotelFaculty.state().revealed')
  p.locator('#rzV13Panestudents').get_by_role('button',name='View student result').first.click();p.wait_for_timeout(100)
  capture(p,label+'-individual')
  report=p.locator('#rzV13Panestudents '+{'insight':'#rizsimInsightIndividualResult','systems':'#rizsimSystemIndividualResult','hotel':'#rizsimHotelIndividual'}[kind])
  report.wait_for(state='visible')
  report.screenshot(path=str(OUT/(label+'-individual-detail.png')),animations='disabled')
  check(label+' individual report remains readable',report.locator('h3').first.is_visible())
  close=p.locator('#rzV13Panestudents').get_by_role('button',name=re.compile('Close (student|result)|Back to'))
  if close.count():close.first.click()
  tab('insights');p.locator(rootid).wait_for(state='visible')
  capture(p,label+'-presenter',[rootid+' h2',rootid+' '+{'insight':'.rz-i01-stat-grid','systems':'.rz-s02-metrics','hotel':'.rz-h03-metrics'}[kind]])
  p.locator('#rzV15insightsMetrics').wait_for(state='visible',timeout=7000)
  check(label+' general session summary remains available',p.locator('#rzV15insightsMetrics').count()==1 and p.locator('#rzV15insightsMetrics').is_visible())
  check(label+' simulation report precedes supporting summary',p.locator(rootid).bounding_box()['y']<p.locator('#rzV15insightsMetrics').bounding_box()['y'])
  p.locator(rootid).screenshot(path=str(OUT/(label+'-presenter-detail.png')),animations='disabled')
  before=p.locator(rootid).inner_text();p.locator(rootid).get_by_role('button',name=re.compile('Refresh')).first.click();p.wait_for_timeout(200)
  check(label+' refresh remains functional',p.locator(rootid+' h2').is_visible())
  p.evaluate('window.__v13Fail=true;window.'+module+'.refresh()');p.wait_for_selector(rootid+' '+{'insight':'.rz-i01-error','systems':'.rz-s02-error','hotel':'.rz-h03-error'}[kind]);capture(p,label+'-error')
  check(label+' failed refresh not disguised as success','Synthetic result unavailable' in p.locator(rootid).inner_text())
  p.evaluate('window.__v13Fail=false;window.'+module+'.refresh()');p.wait_for_timeout(150)
  p.add_style_tag(content='html{font-size:200%!important}');capture(p,label+'-text200')
  check(label+' no page errors',not errors,errors)
 finally:
  base.FAC=original
  if ctx:
   if sys.exc_info()[0]:
    try:p.screenshot(path=str(OUT/(label+'-failure.png')),full_page=False)
    except Exception:pass
   ctx.close()

def static():
 ref=os.environ.get('RIZSIM_V13_BASE','origin/main')
 protected=['simulation-insight-to-implication.html','simulation-system-1-system-2.html','simulation-hotel-judgment.html','access-out.html','access-in.html','google-g.svg','RizSim finalized logo.png','rizsim-insight-faculty.js','rizsim-system-faculty.js','rizsim-hotel-faculty.js','rizsim-live-workspace.js','rizsim-live-classroom.js']
 protected += [str(p.relative_to(ROOT)) for p in (ROOT/'simulation-assets').rglob('*') if p.is_file()]
 for path in protected:check('Unchanged '+path,presentation_equivalent(subprocess.check_output(['git','show',ref+':'+path],cwd=ROOT),(ROOT/path).read_bytes(),path))
 old=subprocess.check_output(['git','show',ref+':rizsim-v154-runner-shell.js'],cwd=ROOT,text=True)
 check('Original participant handoff and assessment feedback retained',runner_suffix_equivalent(old,(ROOT/'rizsim-v154-runner-shell.js').read_text()))
 for file in ['rizsim-learning-interiors-v13.css','rizsim-faculty-surfaces-v13.css']:
  css=(ROOT/file).read_text();check(file+' no clipping or scaling',not re.search(r'overflow(?:-x|-y)?\s*:\s*hidden|\bzoom\s*:|scale\(',css))

def main():
 static();srv=http.server.ThreadingHTTPServer(('127.0.0.1',0),base.Handler);threading.Thread(target=srv.serve_forever,daemon=True).start();url='http://127.0.0.1:'+str(srv.server_port)
 try:
  with sync_playwright() as pw:
   b=pw.chromium.launch(headless=True)
   scope=os.getenv('RIZSIM_V13_SCOPE','all')
   for size in [(1366,768),(1440,900),(390,844)]:
    cases=[]
    if scope in ['all','runners']:cases=[('insight',lambda:insight(b,url,size)),('systems',lambda:systems(b,url,size)),('hotel',lambda:hotel(b,url,size))]
    if scope in ['all','faculty']:cases += [(k,lambda k=k:faculty(b,url,k,size)) for k in ['insight','systems','hotel']]
    for label,fn in cases:
     try:fn()
     except Exception:check(label+' '+str(size)+' flow',False,traceback.format_exc())
   if scope in ['all','runners']:
    for access,correct in [('live',False),('practice',True)]:
     try:insight(b,url,(1366,768),access,correct)
     except Exception:check('feedback control '+access,False,traceback.format_exc())
   if scope in ['all','faculty']:
    for role in ['course_lead','owner']:
     for kind in ['insight','systems','hotel']:
      try:faculty(b,url,kind,(1366,768),role)
      except Exception:check(role+' '+kind+' mounted flow',False,traceback.format_exc())
   b.close()
 finally:srv.shutdown()
 (OUT/'report.json').write_text(json.dumps({'checks':CHECKS,'states':STATES,'scope':'Actual production HTML and mounted tabs; synthetic data and Chromium only'},indent=2))
 failures=[c for c in CHECKS if not c['passed']];print(json.dumps({'passed':len(CHECKS)-len(failures),'failed':len(failures),'states':len(STATES)}))
 if failures:raise SystemExit(1)
if __name__=='__main__':main()
