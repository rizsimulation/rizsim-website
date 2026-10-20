"""V9 cross-workspace browser checks on synthetic client only. Never touches live accounts."""
import http.server,threading,json,os,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
MOCK=(ROOT/'scripts/fixtures/student-workspace-backend.js').read_text()+r"""
// V9 additions are isolated: there is no production fixture import.
products[0].slug='rizsim-secure-submission-test';products[0].launch_path='/simulation-test.html';
products[0].short_description='Three situational questions for browser QA';
const saved=JSON.parse(localStorage.getItem('v9state')||'{}');
const qa=attempts.find(a=>a.id==='attempt-4');
if(saved.attempt)Object.assign(qa,saved.attempt);
const answers=saved.answers||{};
state.v9Answers=answers;state.failSubmit=false;
function persist(){localStorage.setItem('v9state',JSON.stringify({
 attempt:{status:qa.status,submitted_at:qa.submitted_at,progress_percent:qa.progress_percent,classroom_access_type:qa.classroom_access_type},
 answers}));}
const rpcBefore=client.rpc.bind(client);
client.rpc=async(name,args={})=>{
 if(name==='submit_my_rizsim_classroom_attempt'||name==='submit_simulation_attempt'){
  state.calls.push({name,args});
  if(state.failSubmit)return err('Temporary submission service failure');
  const a=attempts.find(x=>x.id===args.p_attempt_id&&x.user_id===state.user?.id);
  if(!a)return err('Attempt not owned');
  if(a.status==='submitted')return err('Already submitted');
  if((answers[a.id]||[]).length!==3)return err('Not all questions saved');
  a.status='submitted';a.progress_percent=100;a.submitted_at=new Date().toISOString();persist();
  return ok([{attempt_id:a.id,status:a.status,progress_percent:100,submitted_at:a.submitted_at}]);
 }
 const response=await rpcBefore(name,args);
 if(name==='resume_my_rizsim_student_practice'&&!response.error)persist();
 return response;
};
const fromBefore=client.from.bind(client);
client.from=(table)=>{
 if(table==='simulation_responses'){
  const filters=[];
  const matching=()=>Object.values(answers).flat().filter(row=>filters.every(([key,val])=>row[key]===val));
  const query={
   select(){return query},eq(key,val){filters.push([key,val]);return query},
   maybeSingle(){return Promise.resolve(ok(matching()[0]||null))},
   then(a,b){return Promise.resolve(ok(matching())).then(a,b)},
   insert(row){const list=answers[row.attempt_id]||[];list.push({...row,id:'response-'+(list.length+1)});answers[row.attempt_id]=list;persist();return Promise.resolve(ok(null))},
   update(row){return {eq(k,v){const found=Object.values(answers).flat().find(x=>x[k]===v);if(found)Object.assign(found,row);persist();return Promise.resolve(ok(null));}}}
  };
  return query;
 }
 const query=fromBefore(table);
 if(table==='products'||table==='profiles')query.single=()=>query.maybeSingle();
 if(table==='simulation_attempts')query.update=values=>({eq(k,v){const a=attempts.find(x=>x[k]===v);if(a)Object.assign(a,values);persist();return Promise.resolve(ok(null));}});
 return query;
};
"""
checks=[]
def check(label,value):
 assert value,label
 checks.append(label);print('PASS '+label,flush=True)
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*a,**k):super().__init__(*a,directory=str(ROOT),**k)
 def log_message(self,*a):pass
def open_test(browser,base,mobile=False):
 ctx=browser.new_context(viewport={'width':390 if mobile else 1366,'height':844 if mobile else 920},has_touch=mobile,is_mobile=mobile,reduced_motion='reduce')
 ctx.add_init_script("""Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async t=>{window.__copied=t;}}});
 window.print=()=>{window.__printCount=(window.__printCount||0)+1};
 window.confirm=()=>{throw Error('Native confirmation must not be used');};""")
 def route(r):
  u=r.request.url
  if u=='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm':r.fulfill(content_type='text/javascript',body=MOCK)
  elif u.startswith(base+'/'):r.continue_()
  elif 'fonts.googleapis.com' in u:r.fulfill(content_type='text/css',body='')
  else:r.abort()
 ctx.route('**/*',route)
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 return ctx,page,errors
def run(browser,base):
 ctx,p,errors=open_test(browser,base)
 try:
  p.goto(base+'/access-in.html#practice',wait_until='networkidle');p.wait_for_selector('#studentApp.show')
  check('Practice code field stays available',p.locator('.rz-v15-practice-join input').count()==1)
  hub=p
  hub.locator('[data-practice-attempt="attempt-4"] button').click()
  hub.wait_for_selector('#view-player.rz-c155-classroom #rzC155Classroom .rz-c155-start')
  check('Practice secure resume opens the on-site Classroom',hub.locator('#view-player.rz-c155-classroom').count()==1)
  hub.locator('#rzC155Classroom .rz-c155-start').click()
  hub.wait_for_selector('.rz-c155-erp[open]')
  check('ERP confirmation requested before starting, without another Name/Organization form',hub.locator('.rz-c155-erp input[type=text]').count()==1 and hub.locator('#rzV154JoinName,#rzV154JoinInstitution').count()==0)
  hub.locator('.rz-c155-erp input[type=text]').fill('V9-ERP-04')
  with ctx.expect_page() as launch:
   hub.locator('.rz-c155-erp').get_by_role('button',name='Continue').click()
  p=launch.value
  p.on('pageerror',lambda e:errors.append(str(e)))
  p.wait_for_url('**/simulation-test.html?*',timeout=15000)
  check('Runner opens in its own tab while the resources website remains open',
    'attempt=attempt-4' in p.url and 'access=practice' in p.url and
    '/access-in.html' in hub.url and not hub.is_closed())
  p.wait_for_selector('#simulation.show')
  check('Questionnaire visible before submission',p.locator('.question:visible').count()==3 and p.locator('#submitButton').is_disabled())
  for name,value in [('q1','review_priorities'),('q2','provisional'),('q3','process')]:
   p.locator('input[name="'+name+'"][value="'+value+'"]').check()
   p.wait_for_function("(name)=>Object.values(window.__studentFixture.v9Answers).flat().some(x=>x.question_key===name)",arg=name)
  p.wait_for_function('!document.querySelector("#submitButton").disabled')
  check('Three answers saved',p.evaluate('Object.values(__studentFixture.v9Answers).flat().length')==3)
  p.locator('#submitButton').click();p.wait_for_selector('#submissionConfirmDialog[open]')
  check('Submission uses an accessible on-page confirmation','Submit your simulation?' in p.locator('#submissionConfirmDialog').inner_text())
  p.locator('#cancelSubmitButton').click()
  check('Cancel submission keeps paper editable',p.locator('#simulation.show').count()==1 and p.locator('#submitButton').is_enabled())
  p.evaluate('__studentFixture.failSubmit=true')
  p.locator('#submitButton').click();p.locator('#confirmSubmitButton').click()
  p.wait_for_function('document.querySelector("#statusBox").textContent.includes("Temporary submission service failure")')
  check('Server error does not falsely show submitted results',p.locator('#simulation.show').count()==1 and p.locator('#resultsPanel[hidden]').count()==1 and p.locator('#submitButton').is_enabled())
  p.evaluate('__studentFixture.failSubmit=false')
  p.locator('#submitButton').click();p.locator('#confirmSubmitButton').click();p.wait_for_selector('#resultsPanel:not([hidden])',timeout=10000)
  check('After server confirmation question paper disappears',p.locator('#simulation.show').count()==0 and p.locator('.question:visible').count()==0)
  check('Results show three saved response cards and an explicit non-graded label',p.locator('.results-answer').count()==3 and 'not a graded score' in p.locator('#resultsPanel').inner_text())
  check('Real completion status locked',p.evaluate('__studentFixture.attempts.find(a=>a.id==="attempt-4").status')=='submitted' and p.locator('#submitButton').is_disabled())
  check('Sharing answers opt-in is off by default',not p.locator('#shareIncludeAnswers').is_checked())
  p.locator('#copyResultsButton').click();p.wait_for_function('!!window.__copied')
  check('Summary omits private IDs and responses by default','attempt-4' not in p.evaluate('window.__copied') and 'My selected responses:' not in p.evaluate('window.__copied'))
  p.locator('#shareIncludeAnswers').check();p.locator('#shareResultsButton').click()
  p.wait_for_function('window.__copied.includes("My selected responses:")')
  check('Share results can include answers after explicit consent','Review priorities before reallocating effort' in p.evaluate('window.__copied'))
  p.locator('#printResultsButton').click();check('Print button invokes browser print',p.evaluate('window.__printCount')==1)
  p.screenshot(path=str(OUT/'v9-result-desktop.png'),full_page=True)
  p.reload(wait_until='networkidle');p.wait_for_selector('#resultsPanel:not([hidden])')
  check('Submitted state restores results after reload',p.locator('.results-answer').count()==3 and p.locator('.question:visible').count()==0)
  p.locator('#resultsPanel a[href="access-in.html#learning"]').click()
  p.wait_for_selector('#view-learning.active')
  check('My Learning shows this submitted attempt','Submitted' in p.locator('[data-history-attempt="attempt-4"]').inner_text())
  check('Desktop checks produced no script errors',not errors)
 except Exception:
  p.screenshot(path=str(OUT/'v9-failure.png'),full_page=True)
  raise
 finally:ctx.close()
 ctx,p,errors=open_test(browser,base,True)
 try:
  p.goto(base+'/access-in.html#practice',wait_until='networkidle');p.wait_for_selector('[data-practice-attempt="attempt-4"]')
  check('Persistent Practice code field on mobile',p.locator('.rz-v15-practice-join input').is_visible())
  check('Mobile layout has no horizontal overflow',p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  p.evaluate('__studentFixture.failPractice=true')
  p.locator('[data-practice-attempt="attempt-4"] button').click()
  p.wait_for_selector('.rz-st-dialog[open]')
  check('Server Practice revocation blocks Classroom entry before ERP or new tab',
    'revoked' in p.locator('.rz-st-dialog[open]').inner_text().lower() and
    '/simulation-test.html' not in p.url and
    p.locator('.rz-c155-erp[open]').count()==0 and
    p.evaluate('!window.__rzV154RunnerTab || window.__rzV154RunnerTab.closed'))
  check('No mobile browser exceptions',not errors)
 finally:ctx.close()
if __name__=='__main__':
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler)
 threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  with sync_playwright() as pw:
   options={'headless':True}
   if os.getenv('RIZSIM_TEST_CHROMIUM'):options.update(executable_path=os.environ['RIZSIM_TEST_CHROMIUM'],args=['--no-sandbox'])
   b=pw.chromium.launch(**options)
   try:run(b,'http://127.0.0.1:'+str(server.server_port))
   finally:b.close()
  (OUT/'v9-summary.json').write_text(json.dumps({'status':'passed','checks':checks,'backend':'synthetic only'},indent=2))
  print('PASS',len(checks),'V9 browser assertions')
 finally:server.shutdown()
