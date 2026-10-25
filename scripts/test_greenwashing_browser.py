"""Real mounted RizSim interfaces, synthetic adapters only. No production learner data."""
import http.server,json,os,re,threading,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
import test_design_code_v1 as portal
import test_student_workspace_v8 as student
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results/greenwashing';OUT.mkdir(parents=True,exist_ok=True)
AID='11111111-1111-4111-8111-111111111111';SID='22222222-2222-4222-8222-222222222222'
MOCK=(ROOT/'scripts/fixtures/greenwashing-backend.js').read_text()
CHECKS=[];STATES=[]
def check(label,value,details=None):
 CHECKS.append({'name':label,'passed':bool(value),'detail':details});print(('PASS ' if value else 'FAIL ')+label,flush=True)
 if not value:print(details,flush=True)
 (OUT/'report.json').write_text(json.dumps({'checks':CHECKS,'states':STATES},indent=2))
def shot(p,label):
 p.evaluate('scrollTo({top:0,behavior:"instant"})');p.wait_for_timeout(80)
 geom=p.evaluate('({viewport:innerWidth,width:document.documentElement.scrollWidth})');check(label+' no horizontal overflow',geom['width']<=geom['viewport']+2,geom)
 p.screenshot(path=str(OUT/(label+'.png')),full_page=False,animations='disabled');STATES.append(label)
def saved(p):p.wait_for_function("document.querySelector('#gwSaveStatus')?.textContent==='Saved to your Classroom'")
def open_runner(browser,base,size=(1366,768),init=None):
 ctx=browser.new_context(viewport={'width':size[0],'height':size[1]},has_touch=size[0]<600,is_mobile=size[0]<600,reduced_motion='no-preference',accept_downloads=True)
 ctx.add_init_script('window.__gwInit='+json.dumps(init or {})+';')
 ctx.add_init_script("if(!sessionStorage.getItem('rizsim:v154:participant'))sessionStorage.setItem('rizsim:v154:participant',JSON.stringify({name:'Synthetic Learner',erp:'GW-QA',institution:'Synthetic University',user:'student-1',attempt:"+json.dumps(AID)+",session:"+json.dumps(SID)+",at:Date.now()}));")
 def route(r):
  u=r.request.url
  if '@supabase/supabase-js@2.49.8' in u:r.fulfill(content_type='text/javascript',body=MOCK)
  elif u.startswith(base+'/'):r.continue_()
  else:r.abort()
 ctx.route('**/*',route);p=ctx.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.set_default_timeout(12000)
 p.goto(base+'/simulation-greenwashing.html?attempt='+AID+'&session='+SID+'&access=practice',wait_until='domcontentloaded')
 return ctx,p,errors

def finish_audit(p):
 p.get_by_role('button',name='Start audit',exact=True).click();saved(p)
 for i in range(10):
  p.locator('input[name=auditAns][value="'+('0' if i<6 else '1')+'"]').check();saved(p)
  if i<9:p.get_by_role('button',name='Save & next',exact=True).click();saved(p)
  else:
   p.get_by_role('button',name='Submit audit',exact=True).click()
   p.get_by_role('dialog').get_by_role('button',name='Submit audit',exact=True).click();saved(p)

def student_flow(browser,base,size):
 ctx,p,errors=open_runner(browser,base,size);label='student-'+str(size[0])
 try:
  p.get_by_role('button',name='Start audit',exact=True).wait_for();shot(p,label+'-intro')
  check(label+' no duplicated identity form',p.locator('#name,#sid,#section,input[type=text]').count()==0)
  check(label+' official shared Classroom header',p.locator('.rz-v155-resource-return').count()==1)
  p.get_by_role('button',name='Start audit',exact=True).click();saved(p)
  p.locator('input[name=auditAns][value="1"]').check();saved(p);order=p.evaluate('__gw.row.response_data.record.optionOrder')
  check(label+' baseline no correctness feedback',p.locator('.gw-feedback').count()==0 and p.evaluate('GreenwashingCore.observations(__gw.row.response_data.record).audit.length')==0)
  p.reload(wait_until='domcontentloaded');p.locator('input[name=auditAns]').first.wait_for()
  check(label+' saved answer and order survive reload',p.locator('input[name=auditAns][value="1"]').is_checked() and p.evaluate('__gw.row.response_data.record.optionOrder')==order)
  shot(p,label+'-audit')
  for i in range(10):
   p.locator('input[name=auditAns][value="'+('0' if i<6 else '1')+'"]').check();p.wait_for_timeout(25)
   # Radio checks on the already-selected item may be a no-op; server remains saved.
   if i<9:p.get_by_role('button',name='Save & next',exact=True).click();saved(p)
   else:
    p.get_by_role('button',name='Submit audit',exact=True).click();p.get_by_role('dialog').get_by_role('button',name='Submit audit',exact=True).click();saved(p)
  check(label+' baseline is locked with 6 of 10',p.evaluate('__gw.row.response_data.record.auditSubmitted') and '6 of 10' in p.locator('#app').inner_text())
  p.get_by_role('button',name='Continue to diagnosis',exact=True).click();saved(p)
  check(label+' no final observations before first check',p.evaluate('GreenwashingCore.summarize(GreenwashingCore.observations(__gw.row.response_data.record)).finalN')==0)
  p.locator('input[name=labAns][value="1"]').check();check(label+' tentative lab choice not saved',p.evaluate('Object.keys(__gw.row.response_data.record.lab).length')==0)
  p.get_by_role('button',name='Check reasoning',exact=True).click();saved(p)
  check(label+' wrong answer cannot advance',p.locator('#gwNext').is_disabled());shot(p,label+'-diagnosis-feedback')
  p.locator('input[name=labAns][value="0"]').check();p.get_by_role('button',name='Check reasoning',exact=True).click();saved(p)
  check(label+' first response retained after correction',p.evaluate('Object.values(__gw.row.response_data.record.lab)[0].initial')==1)
  p.locator('input[name=labAns][value="2"]').check();check(label+' changed option needs recheck',p.locator('#gwNext').is_disabled())
  p.evaluate("dispatchEvent(new CustomEvent('rizsim:presenter-state',{detail:{paused:true,live:true}}))")
  check(label+' presenter pause freezes controls',p.get_by_role('button',name='Check reasoning').is_disabled())
  p.evaluate("dispatchEvent(new CustomEvent('rizsim:presenter-state',{detail:{paused:false,live:true}}))")
  check(label+' resume does not bypass recheck',p.locator('#gwNext').is_disabled())
  p.locator('input[name=labAns][value="0"]').check();p.locator('#gwNext').click();saved(p)
  for i in range(1,14):
   p.locator('input[name=labAns][value="0"]').check();p.get_by_role('button',name='Check reasoning').click();saved(p)
   if i==7:shot(p,label+'-transfer')
   p.locator('#gwNext').click();saved(p)
  p.get_by_role('button',name='Submit to Classroom',exact=True).wait_for();shot(p,label+'-complete')
  check(label+' 24 committed answers and stored progress',p.evaluate('__gw.attempt.progress_percent')==100 and p.evaluate('GreenwashingCore.progress(__gw.row.response_data.record).count')==24)
  p.evaluate('__gw.failSubmit=true');p.get_by_role('button',name='Submit to Classroom',exact=True).click();p.wait_for_function("document.querySelector('#gwSaveStatus').textContent.includes('submission unavailable')")
  check(label+' failed submission not falsely confirmed',p.evaluate('__gw.attempt.status')=='in_progress')
  p.get_by_role('button',name='Submit to Classroom',exact=True).click();p.get_by_role('heading',name='Submitted to your Classroom',exact=True).wait_for()
  check(label+' exactly one successful server submission',p.evaluate('__gw.submissions')==1)
  with p.expect_download() as download:p.get_by_role('button',name='Export my response').click()
  payload=json.loads(Path(download.value.path()).read_text());check(label+' complete export matches original schema',payload['schema']=='educational-simulation-response' and len(payload['responses'])==14 and len(payload['auditResponses'])==10)
  p.evaluate('window.__printCalled=false;window.print=()=>{window.__printCalled=true;}');p.get_by_role('button',name='Print / Save PDF').click();check(label+' printable student report',p.evaluate('__printCalled') and p.locator('.gw-print p').count()==26)
  p.emulate_media(media='print');check(label+' print retains source title and response report',p.locator('.gw-print').is_visible());p.emulate_media(media='screen',reduced_motion='reduce')
  p.reload(wait_until='domcontentloaded');p.get_by_role('heading',name='Submitted to your Classroom',exact=True).wait_for();check(label+' submitted reload read-only',p.locator('input[type=radio]').count()==0 and p.get_by_role('button',name='Submit to Classroom',exact=True).count()==0)
  check(label+' no page exceptions',not errors,errors)
 finally:
  if __import__('sys').exc_info()[0]:
   try:shot(p,label+'-failure')
   except Exception:pass
  ctx.close()

def safety(browser,base):
 for label,init in [('signed-out',{'user':None}),('wrong-owner',{'user':{'id':'another-user'}}),('unpublished',{'product':{'slug':'seven-sins-greenwashing','status':'draft'}}),('expired',{'expired':True})]:
  ctx,p,errors=open_runner(browser,base,init=init)
  try:
   p.get_by_role('heading',name='Open from your RizSim Classroom').wait_for();check(label+' runner fails closed',p.locator('input[type=radio]').count()==0 and p.get_by_role('button',name='Start audit',exact=True).count()==0)
  finally:ctx.close()
 ctx,p,errors=open_runner(browser,base)
 try:
  p.get_by_role('button',name='Start audit',exact=True).click();saved(p)
  p.evaluate('__gw.failSave=true');p.locator('input[name=auditAns][value="1"]').check();p.locator('#gwRetry').wait_for()
  check('save failure freezes advance and retains retry',p.get_by_role('button',name='Save & next').is_disabled())
  p.locator('#gwRetry').click();saved(p);check('retry persists retained choice once',p.evaluate('Object.values(__gw.row.response_data.record.auditSelections)[0]')==1)
  p.evaluate('__gw.stale=true');p.locator('input[name=auditAns][value="2"]').check();p.wait_for_function("document.querySelector('#gwSaveStatus').textContent.includes('another tab')")
  check('optimistic conflict does not overwrite newer response',p.evaluate('Object.values(__gw.row.response_data.record.auditSelections)[0]')==1)
 finally:ctx.close()

FAC_INIT="""()=>{
 const D=GreenwashingData,C=GreenwashingCore;
 window.__gwRoster=[];window.__gwRows=[];window.__gwQueries=[];window.__gwDeny=false;window.__gwRedact=false;
 window.__gwPopulate=(n=8)=>{
  __gwRoster=[];__gwRows=[];
  for(let i=0;i<n;i++){
   const aid='gw-attempt-'+i,student={name:'Synthetic Learner '+i,studentId:'QA'+i,classSection:i%2?'Class B':'Class A with a deliberately long descriptive section title',organization:'Synthetic university'};
   let r=C.action(C.create(student,{attemptId:aid,sessionId:'existing-1'},()=>.37),'begin');
   for(let q=0;q<10;q++){r=C.action(r,'audit-choice',q<=i%10?0:1);if(q<9)r=C.action(r,'audit-index',q+1);}
   r=C.action(C.action(r,'audit-submit'),'continue');
   for(let q=0;q<14;q++){r=C.action(r,'check',q<i?0:1);if(q>=i)r=C.action(r,'check',0);r=C.action(r,'next');}
   __gwRoster.push({session_id:'existing-1',attempt_id:aid,student_name:student.name,attempt_status:'submitted',progress_percent:100,submitted_at:r.completedAt});
   __gwRows.push({attempt_id:aid,question_key:'greenwashing-v1-record',response_data:{record:r}});
  }
  __gwRoster.push({session_id:'existing-1',attempt_id:'draft-1',student_name:'Synthetic In Progress',attempt_status:'in_progress',progress_percent:42});
 };__gwPopulate();
 window.__gwQuery=()=>{let ids=[],key='',filters=[];const q={select(){return q},in(k,v){ids=v;filters.push([k,v]);return q},eq(k,v){key=v;filters.push([k,v]);return q},then(a,b){__gwQueries.push(filters);return Promise.resolve({data:__gwRedact?[]:__gwRows.filter(x=>ids.includes(x.attempt_id)&&x.question_key===key),error:null}).then(a,b)}};return q;};
}"""
def faculty(browser,base,size):
 old=portal.FAC
 f=old.replace("id:'sim-1',title:'Decision Lab',","id:'sim-1',slug:'seven-sins-greenwashing',title:'Greenwashing Audit & Decision Lab',")
 f=f.replace('function query(table){','function query(table){if(table===\'simulation_responses\'&&window.__gwQuery)return window.__gwQuery();')
 f=f.replace("async function rpc(name,args={}){state.calls.push({kind:'rpc',name,args});", "async function rpc(name,args={}){state.calls.push({kind:'rpc',name,args});if(name==='get_my_classroom_session_students'&&window.__gwRoster)return window.__gwDeny?{data:null,error:{message:'Synthetic authorization denied'}}:ok(window.__gwRoster);")
 portal.FAC=f
 try:ctx,p,errors=portal.open_page(browser,base,'access-out.html?live=simulation-running&selection=sim-1&live_session=existing-1#classroom','faculty',size)
 finally:portal.FAC=old
 label='faculty-'+str(size[0]);root='#rzGreenwashingFacultyAnalytics';live='#rzGreenwashingStudentResults'
 def tab(name):
  if p.locator('#rzV13MobileToggle').is_visible():p.locator('#rzV13MobileToggle').click()
  p.locator('#rzV13Tab'+name).click();p.wait_for_timeout(120)
 def refresh():
  p.evaluate('RizSimGreenwashingFaculty.refresh()');p.wait_for_function('!RizSimGreenwashingFaculty.state().loading')
 try:
  p.wait_for_selector('#rzLiveV13Workspace:not([hidden])');p.evaluate(FAC_INIT);refresh();tab('insights');p.locator(root+' .rz-a-dashboard').wait_for()
  check(label+' correct native simulation mounted',p.locator(root).is_visible() and p.evaluate('RizSimGreenwashingFaculty.state().records')==8)
  check(label+' only roster-submitted IDs queried',p.evaluate("__gwQueries.every(q=>q.some(([k,ids])=>k==='attempt_id'&&ids.length===8&&!ids.includes('draft-1')))") )
  check(label+' distinct source graphs',p.locator(root+' svg[role=img]').count()==3)
  check(label+' source cautions visible','100%' in p.locator(root).inner_text() and 'first' in p.locator(root).inner_text().lower());shot(p,label+'-presenter')
  summary=p.locator(root+' .rz-a-data summary').first;summary.focus();summary.press('Enter');check(label+' data tables keyboard accessible',summary.locator('..').get_attribute('open') is not None);summary.press('Enter')
  p.locator(root+' .gw-notes summary').click();check(label+' original faculty source note retained','TerraChoice' in p.locator(root+' .gw-notes').inner_text());p.locator(root+' .gw-notes summary').click()
  tab('students');p.locator(live+' tbody tr').first.wait_for();search=p.locator(live+' input[type=search]');search.fill('no match');check(label+' real live filter hides all rows',p.locator(live+' tbody tr:visible').count()==0)
  search.fill('Synthetic');search.focus();search.evaluate('n=>n.setSelectionRange(1,4)');refresh();check(label+' live search and cursor survive refresh',search.input_value()=='Synthetic' and search.evaluate('n=>n===document.activeElement&&n.selectionStart===1&&n.selectionEnd===4'))
  search.fill('');p.locator(live+' select').select_option('in_progress');check(label+' in-progress roster without private result',p.locator(live+' tbody tr:visible').count()==1 and 'Not submitted' in p.locator(live+' tbody tr:visible').inner_text());p.locator(live+' select').select_option('all');shot(p,label+'-live')
  p.locator(live).get_by_role('button',name='View student result').first.click();check(label+' individual report uses actual record',p.locator('#rzGreenwashingIndividualResult').is_visible());p.get_by_role('button',name='Close student result').click()
  tab('insights');p.evaluate('__gwRedact=true');refresh();check(label+' RLS-hidden data not invented',p.evaluate('RizSimGreenwashingFaculty.state().records')==0 and '0 analyzed of 8 submitted' in p.locator(root).inner_text())
  p.evaluate('__gwDeny=true');refresh();check(label+' denied refresh clears old analysis',p.locator(root+' svg').count()==0 and 'authorization denied' in p.locator(root).inner_text())
  p.evaluate('__gwDeny=false;__gwRedact=false;__gwRoster=[];__gwRows=[]');refresh();shot(p,label+'-empty');check(label+' empty values not sample numbers',p.evaluate('RizSimGreenwashingFaculty.state().joined')==0)
  p.evaluate('__gwPopulate(3)');refresh();check(label+' small sample warnings present',p.locator(root+' .rz-a-caution').count()>0);shot(p,label+'-small')
  p.evaluate('__gwPopulate(12)');refresh();check(label+' native refresh updates counts',p.evaluate('RizSimGreenwashingFaculty.state().records')==12)
  check(label+' two class comparisons with long label', 'deliberately long' in p.locator(root).inner_text())
  p.locator(root+' .gw-offline summary').click()
  payload=p.evaluate('GreenwashingCore.exportRecord(__gwRows[0].response_data.record)');payload['scores']['audit']['accuracy']=1
  p.locator(root+' input[type=file]').set_input_files({'name':'synthetic-response.json','mimeType':'application/json','buffer':json.dumps(payload).encode()})
  p.wait_for_function("document.querySelector('#rzGreenwashingFacultyAnalytics').textContent.includes('LOCAL FILE REVIEW - 1')")
  check(label+' fallback import separate from session',p.evaluate('RizSimGreenwashingFaculty.state().records')==12)
  p.locator(root+' input[type=file]').set_input_files({'name':'invalid.json','mimeType':'application/json','buffer':b'{}'})
  p.wait_for_function("document.querySelector('#rzGreenwashingFacultyAnalytics .gw-offline').textContent.includes('Incompatible')")
  check(label+' invalid import error readable',True)
  p.get_by_role('button',name='Return to session data').click();check(label+' restores authorized session not uploaded files','LOCAL FILE REVIEW' not in p.locator(root).inner_text())
  p.emulate_media(reduced_motion='reduce');check(label+' reduced motion',p.locator(root+' .rz-a-dashboard').evaluate('n=>getComputedStyle(n).animationName')=='none')
  p.add_style_tag(content='html{font-size:200%!important}');shot(p,label+'-text200')
  check(label+' no uncaught errors',not errors,errors)
 finally:
  if __import__('sys').exc_info()[0]:
   try:shot(p,label+'-failure')
   except Exception:pass
  ctx.close()

def tabs(browser,base):
 old=student.MOCK
 src=old.replace("slug:'decision-lab'","slug:'seven-sins-greenwashing'").replace("launch_path:'/simulation-test.html'","launch_path:'/simulation-greenwashing.html'").replace("'session-open'",json.dumps(SID))
 src=src.replace("id:'attempt-'+i", "id:i===0?"+json.dumps(AID)+":'attempt-'+i")
 student.MOCK=src
 try:ctx,p,errors=student.open_page(browser,base,'#home')
 finally:student.MOCK=old
 ctx.route('https://esm.sh/@supabase/supabase-js@2.49.8',lambda r:r.fulfill(content_type='text/javascript',body=MOCK))
 try:
  student.go_classroom(p);p.locator('.rz-c155-start').click();p.locator('.rz-c155-erp[open] input[type=text]').fill('GW-TABS')
  with ctx.expect_page() as info:p.locator('.rz-c155-erp[open]').get_by_role('button',name='Continue').click()
  runner=info.value;runner.get_by_role('button',name='Start audit',exact=True).wait_for();runner.get_by_role('button',name='Start audit',exact=True).click();saved(runner)
  runner.locator('input[name=auditAns][value="1"]').check();saved(runner)
  check('Classroom identity handoff without second form',runner.evaluate('__gw.row.response_data.record.student.studentId')=='GW-TABS')
  before=runner.evaluate('JSON.stringify(__gw.row.response_data.record)');runner.locator('.rz-v155-resource-return').click();p.wait_for_selector('#view-player.active.rz-c155-classroom')
  check('Class Resources targets original tab and keeps choices',len(ctx.pages)==2 and runner.evaluate('JSON.stringify(__gw.row.response_data.record)')==before)
  p.evaluate('window.focus=()=>{}');runner.bring_to_front();runner.locator('.rz-v155-resource-return').click();runner.wait_for_timeout(500)
  check('blocked focus compact fallback on new runner',runner.locator('.rz-v14-return-status').count()==1)
  runner.evaluate('window.opener=null');runner.reload(wait_until='domcontentloaded');runner.locator('input[name=auditAns]').first.wait_for();runner.locator('.rz-v155-resource-return').click();runner.wait_for_timeout(500)
  check('missing opener does not duplicate Classroom',len(ctx.pages)==2)
  shot(runner,'greenwashing-class-resources')
 finally:ctx.close()

def main():
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),portal.Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base='http://127.0.0.1:'+str(server.server_port)
 try:
  with sync_playwright() as pw:
   browser=pw.chromium.launch(headless=os.getenv('RIZSIM_HEADED')!='1');scope=os.getenv('GW_SCOPE','all');jobs=[]
   if scope in ['all','student']:
    jobs=[('safety',lambda:safety(browser,base)),('tabs',lambda:tabs(browser,base))]
    for size in [(1366,768),(768,1024),(390,844)]:jobs.append(('student-'+str(size),lambda s=size:student_flow(browser,base,s)))
   if scope in ['all','faculty']:
    for size in [(1366,768),(768,1024),(390,844)]:jobs.append(('faculty-'+str(size),lambda s=size:faculty(browser,base,s)))
   for label,fn in jobs:
    try:fn()
    except Exception:check(label+' flow',False,traceback.format_exc())
   browser.close()
 finally:server.shutdown()
 report={'checks':CHECKS,'states':STATES,'scope':'Actual mounted website and runner; synthetic adapters; no production learner data'};(OUT/'report.json').write_text(json.dumps(report,indent=2));failed=sum(not x['passed'] for x in CHECKS);print(json.dumps({'passed':len(CHECKS)-failed,'failed':failed,'states':len(STATES)}))
 if failed:raise SystemExit(1)
if __name__=='__main__':main()
