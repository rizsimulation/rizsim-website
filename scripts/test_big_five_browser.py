"""Real mounted RizSim interfaces, synthetic adapters only. No production learner data."""
import http.server,json,os,re,threading,traceback
from pathlib import Path
from playwright.sync_api import sync_playwright
import test_design_code_v1 as portal
import test_student_workspace_v8 as student
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results/big-five';OUT.mkdir(parents=True,exist_ok=True)
AID='11111111-1111-4111-8111-111111111111';SID='22222222-2222-4222-8222-222222222222'
MOCK=(ROOT/'scripts/fixtures/big-five-backend.js').read_text()
CHECKS=[];STATES=[]
def check(label,value,details=None):
 CHECKS.append({'name':label,'passed':bool(value),'detail':details});print(('PASS ' if value else 'FAIL ')+label,flush=True)
 if not value:print(details,flush=True)
 (OUT/'report.json').write_text(json.dumps({'checks':CHECKS,'states':STATES},indent=2))
def shot(p,label):
 p.evaluate('scrollTo({top:0,behavior:"instant"})');p.wait_for_timeout(80)
 geom=p.evaluate('({viewport:innerWidth,width:document.documentElement.scrollWidth})');check(label+' no horizontal overflow',geom['width']<=geom['viewport']+2,geom)
 p.screenshot(path=str(OUT/(label+'.png')),full_page=False,animations='disabled');STATES.append(label)
def saved(p):p.wait_for_function("document.querySelector('#bfSaveStatus')?.textContent==='Saved to your Classroom'")
def open_runner(browser,base,size=(1366,768),init=None):
 ctx=browser.new_context(viewport={'width':size[0],'height':size[1]},has_touch=size[0]<600,is_mobile=size[0]<600,reduced_motion='no-preference',accept_downloads=True)
 ctx.add_init_script('window.__bfInit='+json.dumps(init or {})+';')
 ctx.add_init_script("if(!sessionStorage.getItem('rizsim:v154:participant'))sessionStorage.setItem('rizsim:v154:participant',JSON.stringify({name:'Synthetic Learner',erp:'BF-QA',institution:'Synthetic University',user:'student-1',attempt:"+json.dumps(AID)+",session:"+json.dumps(SID)+",at:Date.now()}));")
 def route(r):
  u=r.request.url
  if '@supabase/supabase-js@2.49.8' in u:r.fulfill(content_type='text/javascript',body=MOCK)
  elif u.startswith(base+'/'):r.continue_()
  else:r.abort()
 ctx.route('**/*',route);p=ctx.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.set_default_timeout(12000)
 p.goto(base+'/simulation-big-five.html?attempt='+AID+'&session='+SID+'&access=practice',wait_until='domcontentloaded')
 return ctx,p,errors


def choose(p,correct=True,confidence=75):
 choice=p.evaluate("()=>{const c=BigFiveCore.current(__bf.row.response_data.record);return (BigFiveData.SCORE_KEY[c.id].answer+"+('0' if correct else '1')+")%4}")
 p.locator('input[name=answer][value="'+str(choice)+'"]').check()
 p.locator('input[name=confidence][value="'+str(confidence)+'"]').check()
 p.locator('#bfCommit').click();saved(p)

def ack(p):
 if p.locator('#bfRevisionReviewed').count():p.locator('#bfRevisionReviewed').check()
 p.locator('#bfAcknowledge').click();saved(p)

def student_flow(browser,base,size):
 ctx,p,errors=open_runner(browser,base,size);label='student-'+str(size[0])
 try:
  p.get_by_role('button',name='Start Knowledge Review',exact=True).wait_for()
  check(label+' no duplicated name or ERP form',p.locator('input[type=text]').count()==0)
  shot(p,label+'-intro');p.get_by_role('button',name='Start Knowledge Review',exact=True).click();saved(p)
  check(label+' baseline choice and confidence start blank',p.locator('input:checked').count()==0 and p.locator('#bfCommit').is_disabled())
  p.locator('input[name=answer][value="1"]').check();check(label+' confidence mandatory',p.locator('#bfCommit').is_disabled())
  p.locator('input[name=confidence][value="50"]').check();check(label+' tentative choices not analytic observations',p.evaluate('BigFiveCore.count(__bf.row.response_data.record)')==0)
  p.reload(wait_until='domcontentloaded');p.locator('#bfCommit').wait_for()
  check(label+' tentative tab-scoped choices survive reload',p.locator('input[name=answer][value="1"]').is_checked() and p.locator('input[name=confidence][value="50"]').is_checked())
  shot(p,label+'-kr')
  for i in range(10):
   choose(p,i<5)
   if i==0:
    first=p.evaluate('__bf.row.response_data.record.kr[0]');p.reload(wait_until='domcontentloaded');p.locator('#bfCommit').wait_for()
    check(label+' committed first answer survives reload',p.evaluate('__bf.row.response_data.record.kr[0]')==first)
  check(label+' KR locked before source phase',p.evaluate('__bf.row.response_data.record.kr.length')==10 and p.get_by_role('button',name='Commit source').count()==1)
  check(label+' baseline no premature scores',p.locator('.bf-personal').count()==0)
  for i in range(10):
   if i==0:
    p.evaluate("dispatchEvent(new CustomEvent('rizsim:presenter-state',{detail:{paused:true,live:true}}))")
    check(label+' presenter pause freezes answer inputs',p.locator('input[name=answer]').first.is_disabled())
    p.evaluate("dispatchEvent(new CustomEvent('rizsim:presenter-state',{detail:{paused:false,live:true}}))")
   choose(p,False if i<2 else True)
   if i==0:
    check(label+' source feedback cannot alter committed answer',p.locator('input[name=answer]').count()==0 and p.locator('.bf-feedback').is_visible())
    shot(p,label+'-source-feedback')
   if i==1:
    check(label+' incorrect transfer requires conceptual review',p.locator('#bfRevisionReviewed').count()==1 and p.locator('#bfAcknowledge').is_disabled())
    check(label+' source and transfer first judgments preserved',p.evaluate('__bf.row.response_data.record.lt.length')==2)
    shot(p,label+'-transfer-feedback')
   ack(p)
  check(label+' KG starts blank after all five pair feedback',p.locator('input:checked').count()==0 and p.evaluate('__bf.row.response_data.record.feedbackSeen.length')==10)
  check(label+' exact matched KR order in KG',p.evaluate('BigFiveCore.current(__bf.row.response_data.record).id===__bf.row.response_data.record.kr[0].id'))
  shot(p,label+'-kg')
  for i in range(10):choose(p,i<8)
  p.get_by_role('button',name='Submit to Classroom',exact=True).wait_for();shot(p,label+'-rga')
  check(label+' automatic RGA before final key release',p.locator('.bf-personal').is_visible() and 'withheld' in p.locator('#app').inner_text())
  check(label+' exact paired gain not forced perfect',p.evaluate('BigFiveCore.automaticScores(__bf.row.response_data.record)') ['gainPP']==30 and p.evaluate('BigFiveCore.automaticScores(__bf.row.response_data.record).kg')==8)
  check(label+' 30 decisions and server progress complete',p.evaluate('BigFiveCore.count(__bf.row.response_data.record)')==30 and p.evaluate('__bf.attempt.progress_percent')==100)
  p.evaluate('__bf.failSubmit=true');p.get_by_role('button',name='Submit to Classroom',exact=True).click();p.get_by_role('dialog').get_by_role('button',name='Submit response',exact=True).click()
  p.wait_for_function("document.querySelector('#bfSaveStatus').textContent.includes('submission unavailable')")
  check(label+' failed submit not marked successful',p.evaluate('__bf.attempt.status')=='in_progress')
  p.get_by_role('button',name='Submit to Classroom',exact=True).click();p.get_by_role('dialog').get_by_role('button',name='Submit response',exact=True).click();p.get_by_role('heading',name='Submitted to Classroom',exact=True).wait_for()
  check(label+' exactly one confirmed server submission',p.evaluate('__bf.submissions')==1)
  with p.expect_download() as dl:p.get_by_role('button',name='Export my responses').click()
  raw=json.loads(Path(dl.value.path()).read_text());check(label+' source-compatible JSON export',raw['kind']=='riz-big-five-response' and len(raw['kr'])==len(raw['kg'])==len(raw['lt'])==10)
  with p.expect_download() as dl:p.get_by_role('button',name='Download my RGA').click()
  summary=json.loads(Path(dl.value.path()).read_text());check(label+' exported RGA scores equal live report',summary['scores']['gainPP']==30 and summary['responseFingerprint']==p.evaluate('BigFiveCore.responseFingerprint(__bf.row.response_data.record)'))
  # Supply a matching test Faculty packet through the real Student file input.
  key=json.loads(re.search(r'^const KEY=(.*);$',(ROOT/'simulation-assets/big-five/teaching.js').read_text(),re.M).group(1))
  packet={'kind':'riz-big-five-key-control','schema':1,'version':raw['version'],'attemptId':raw['attemptId'],'identity':raw['identity'],'responseFingerprint':summary['responseFingerprint'],'revision':1,'issuedAt':raw['updatedAt'],'action':'release','keys':key}
  control=p.locator('input[aria-label="Import faculty key control"]');control.set_input_files({'name':'release.json','mimeType':'application/json','buffer':json.dumps(packet).encode()})
  p.get_by_text('View released final answers and explanations',exact=True).wait_for()
  check(label+' key release separate from automatic RGA',p.locator('.bf-personal').is_visible())
  packet.pop('keys');packet.update(action='revoke',revision=2);p.locator('input[aria-label="Import faculty key control"]').set_input_files({'name':'revoke.json','mimeType':'application/json','buffer':json.dumps(packet).encode()})
  p.wait_for_function("!document.querySelector('.bf-key-item')")
  check(label+' revocation hides key without deleting RGA',p.locator('.bf-key-item').count()==0 and p.locator('.bf-personal').is_visible())
  packet.update(action='release',revision=1,keys=key);p.locator('input[aria-label="Import faculty key control"]').set_input_files({'name':'stale.json','mimeType':'application/json','buffer':json.dumps(packet).encode()})
  p.wait_for_function("document.querySelector('#bfSaveStatus').textContent.includes('older')")
  check(label+' stale key release rejected',p.locator('.bf-key-item').count()==0)
  p.evaluate('window.__printed=false;window.print=()=>{__printed=true;}');p.get_by_role('button',name='Print / Save PDF').click();check(label+' print response action works',p.evaluate('__printed'))
  p.emulate_media(media='print');check(label+' print includes all 30 raw responses',p.locator('.bf-print').is_visible() and p.locator('.bf-print p').count()==32);p.emulate_media(media='screen',reduced_motion='reduce')
  p.reload(wait_until='domcontentloaded');p.get_by_role('heading',name='Submitted to Classroom').wait_for();check(label+' submitted reload read-only',p.locator('input[name=answer]').count()==0 and p.get_by_role('button',name='Submit to Classroom').count()==0)
  check(label+' no page exceptions',not errors,errors)
 finally:
  if __import__('sys').exc_info()[0]:
   try:shot(p,label+'-failure')
   except Exception:pass
  ctx.close()

def safety(browser,base):
 for label,init in [('signed-out',{'user':None}),('wrong-owner',{'user':{'id':'another-user'}}),('unpublished',{'product':{'slug':'big-five-personality','status':'draft'}}),('expired',{'expired':True})]:
  ctx,p,errors=open_runner(browser,base,init=init)
  try:
   p.get_by_role('heading',name='Open from your RizSim Classroom').wait_for();check(label+' runner fails closed',p.locator('input[type=radio]').count()==0 and p.get_by_role('button',name='Start Knowledge Review').count()==0)
  finally:ctx.close()
 ctx,p,errors=open_runner(browser,base)
 try:
  p.get_by_role('button',name='Start Knowledge Review').click();saved(p)
  p.locator('input[name=answer][value="1"]').check();p.locator('input[name=confidence][value="50"]').check();p.evaluate('__bf.failSave=true');p.locator('#bfCommit').click();p.locator('#bfRetry').wait_for()
  check('save failure freezes advance without losing draft',p.locator('#bfCommit').is_disabled() and p.locator('input[name=answer][value="1"]').is_checked())
  check('failed save not counted as committed',p.evaluate('__bf.row.response_data.record.kr.length')==0)
  p.locator('#bfRetry').click();saved(p);check('retry saves first choice exactly once',p.evaluate('__bf.row.response_data.record.kr.length')==1 and p.evaluate('__bf.row.response_data.record.kr[0].choice')==1)
  p.evaluate('__bf.stale=true');choose_choice=p.locator('input[name=answer][value="2"]');choose_choice.check();p.locator('input[name=confidence][value="75"]').check();p.locator('#bfCommit').click();p.wait_for_function("document.querySelector('#bfSaveStatus').textContent.includes('another tab')")
  check('concurrent conflict does not overwrite newer data',p.evaluate('__bf.row.response_data.record.kr.length')==1)
 finally:ctx.close()

FAC_INIT="""()=>{
 const D=BigFiveData,C=BigFiveCore;
 window.__bfRoster=[];window.__bfRows=[];window.__bfQueries=[];window.__bfDeny=false;window.__bfRedact=false;
 window.__bfPopulate=(n=8,progress=true)=>{
  __bfRoster=[];__bfRows=[];
  for(let i=0;i<n;i++){
   const aid='bf-attempt-'+i,identity={name:'Synthetic Learner '+i,erp:'QA'+i,section:i%2?'Class B':'Class A with a deliberately long descriptive section title'};
   let r=C.create(identity,{attemptId:aid,sessionId:'existing-1'},()=>.37);
   const commit=(right)=>{const c=C.current(r);r=C.apply(r,'commit',{id:c.id,choice:(D.SCORE_KEY[c.id].answer+(right?0:1))%4,confidence:75});};
   for(let q=0;q<10;q++)commit(q<i%11);
   for(let q=0;q<10;q++){commit((q+i)%3!==0);r=C.apply(r,'ack',{id:C.current(r).id,reviewed:true});}
   for(let q=0;q<10;q++)commit(q<(i+3)%11);
   __bfRoster.push({session_id:'existing-1',attempt_id:aid,student_name:identity.name,attempt_status:'submitted',progress_percent:100,submitted_at:r.finishedAt});
   __bfRows.push({attempt_id:aid,question_key:'big-five-v1-record',response_data:{record:r}});
  }
  if(progress)__bfRoster.push({session_id:'existing-1',attempt_id:'draft-1',student_name:'Synthetic In Progress',attempt_status:'in_progress',progress_percent:42});
 };__bfPopulate();
 window.__bfQuery=()=>{let ids=[],key='',filters=[];const q={select(){return q},in(k,v){ids=v;filters.push([k,v]);return q},eq(k,v){key=v;filters.push([k,v]);return q},then(a,b){__bfQueries.push(filters);return Promise.resolve({data:__bfRedact?[]:__bfRows.filter(x=>ids.includes(x.attempt_id)&&x.question_key===key),error:null}).then(a,b)}};return q;};
}"""

def faculty(browser,base,size):
 old=portal.FAC
 f=old.replace("id:'sim-1',title:'Decision Lab',","id:'sim-1',slug:'big-five-personality',title:'Big Five Personality',")
 f=f.replace('function query(table){',"function query(table){if(table==='simulation_responses'&&window.__bfQuery)return window.__bfQuery();")
 f=f.replace("async function rpc(name,args={}){state.calls.push({kind:'rpc',name,args});", "async function rpc(name,args={}){state.calls.push({kind:'rpc',name,args});if(name==='get_my_classroom_session_students'&&window.__bfRoster)return window.__bfDeny?{data:null,error:{message:'Synthetic authorization denied'}}:ok(window.__bfRoster);")
 portal.FAC=f
 try:ctx,p,errors=portal.open_page(browser,base,'access-out.html?live=simulation-running&selection=sim-1&live_session=existing-1#classroom','course_lead',size)
 finally:portal.FAC=old
 p.set_default_timeout(12000);label='faculty-'+str(size[0]);root='#rzBigFiveFacultyAnalytics';live='#rzBigFiveStudentResults'
 def tab(name):
  if p.locator('#rzV13MobileToggle').is_visible():p.locator('#rzV13MobileToggle').click()
  p.locator('#rzV13Tab'+name).click();p.wait_for_timeout(150)
 def refresh():
  p.evaluate('RizSimBigFiveFaculty.refresh()');p.wait_for_function('!RizSimBigFiveFaculty.state().loading')
 try:
  p.wait_for_selector('#rzLiveV13Workspace:not([hidden])');p.evaluate(FAC_INIT);refresh();tab('insights');p.locator(root+' .bf-dashboard').wait_for()
  check(label+' Course Lead native mounted module',p.locator(root).is_visible() and p.evaluate('RizSimBigFiveFaculty.state().records')==8)
  check(label+' only authorized submitted roster IDs queried',p.evaluate("__bfQueries.every(q=>q.some(([k,ids])=>k==='attempt_id'&&ids.length===8&&!ids.includes('draft-1')))") )
  check(label+' projection hides scores while any learner still working',p.locator(root+' svg').count()==0 and 'Learning is still in progress' in p.locator(root).inner_text())
  shot(p,label+'-progress-only')
  p.locator(root+' input[aria-label="Presentation-safe mode"]').uncheck()
  check(label+' private analysis graphs are real and complete',p.locator(root+' svg[role=img]').count()==4)
  check(label+' concepts not personality diagnosis','not personality' in p.locator(root).inner_text())
  p.locator(root+' input[aria-label="Presentation-safe mode"]').check();p.evaluate('__bfRoster=__bfRoster.filter(r=>r.attempt_status==="submitted")');refresh()
  check(label+' completed group projection exposes aggregates only',p.locator(root+' svg').count()==4 and 'Synthetic Learner' not in p.locator(root).inner_text() and p.locator(root+' .bf-notes').count()==0)
  shot(p,label+'-presenter')
  if size[0]>=1050:
   b=p.locator(root+' .bf-priority').bounding_box();check(label+' priority graphs fit first screen',b['y']>=0 and b['y']+b['height']<=size[1]+2,b)
  summary=p.locator(root+' .rz-a-data summary').first;summary.focus();summary.press('Enter');check(label+' chart data keyboard accessible',summary.locator('..').get_attribute('open') is not None);summary.press('Enter')
  select=p.locator(root+' select[aria-label="Big Five class filter"]');select.select_option('Class B');check(label+' section filter changes matched denominator',p.locator(root+' [data-metric="Analyzed"] strong').inner_text()=='4');select.select_option('')
  p.locator(root+' input[aria-label="Presentation-safe mode"]').uncheck();p.locator(root+' .bf-notes > summary').click();check(label+' faculty key stays in private notes',p.locator(root+' .bf-notes').get_attribute('open') is not None);p.locator(root+' .bf-notes > summary').click()
  p.evaluate('__bfPopulate(8)');refresh();tab('students');p.locator(live+' tbody tr').first.wait_for();search=p.locator(live+' input[type=search]');search.fill('no match');check(label+' live search filters actual rows',p.locator(live+' tbody tr:visible').count()==0)
  search.fill('Synthetic');search.focus();search.evaluate('n=>n.setSelectionRange(1,4)');refresh();check(label+' search focus and cursor survive refresh',search.input_value()=='Synthetic' and search.evaluate('n=>n===document.activeElement&&n.selectionStart===1&&n.selectionEnd===4'))
  search.fill('');p.locator(live+' select').select_option('in_progress');check(label+' no private answers in unsubmitted roster',p.locator(live+' tbody tr:visible').count()==1 and 'Not submitted' in p.locator(live+' tbody tr:visible').inner_text());p.locator(live+' select').select_option('all');shot(p,label+'-live')
  p.locator(live).get_by_role('button',name='View student result').first.click();check(label+' individual real record report',p.locator('#rzBigFiveIndividualResult').is_visible())
  p.get_by_role('button',name='Export key release',exact=True).click()
  with p.expect_download() as dl:p.get_by_role('dialog').get_by_role('button',name='Export control',exact=True).click()
  packet=json.loads(Path(dl.value.path()).read_text());check(label+' Faculty exports source-compatible scoped control',p.evaluate('(packet)=>BigFiveCore.control(packet,__bfRows[0].response_data.record).action',packet)=='release')
  p.get_by_role('button',name='Close student result').click();tab('insights')
  p.evaluate('__bfRedact=true');refresh();check(label+' RLS inaccessible records stay missing',p.evaluate('RizSimBigFiveFaculty.state().records')==0 and '0 analyzed' in p.locator(root).inner_text())
  p.evaluate('__bfDeny=true');refresh();check(label+' denied refresh clears all old data',p.locator(root+' svg').count()==0 and 'authorization denied' in p.locator(root).inner_text())
  p.evaluate('__bfDeny=false;__bfRedact=false;__bfRoster=[];__bfRows=[]');refresh();shot(p,label+'-empty');check(label+' empty means missing not fabricated',p.locator(root+' [data-metric="Mean KR"] strong').inner_text()=='—')
  p.evaluate('__bfPopulate(1,false)');refresh();check(label+' one-learner warning and no SD fabrication','Small sample' in p.locator(root).inner_text());shot(p,label+'-single')
  p.evaluate('__bfPopulate(12,false)');refresh();check(label+' refresh reflects new submitted count',p.evaluate('RizSimBigFiveFaculty.state().records')==12)
  check(label+' cross-section comparison retains long labels','deliberately long' in p.locator(root).inner_text())
  p.locator(root+' .bf-offline > summary').click();payload=p.evaluate('__bfRows[0].response_data.record');payload['scores']={'kr':10,'kg':10}
  p.locator(root+' input[type=file]').set_input_files({'name':'complete.json','mimeType':'application/json','buffer':json.dumps(payload).encode()});p.wait_for_function("document.querySelector('#rzBigFiveFacultyAnalytics').textContent.includes('LOCAL FILE REVIEW')")
  check(label+' imported data separated and re-scored',p.locator(root+' [data-metric="Analyzed"] strong').inner_text()=='1' and p.locator(root+' [data-metric="Mean KR"] strong').inner_text()=='0.0%')
  p.locator(root+' input[type=file]').set_input_files({'name':'duplicate.json','mimeType':'application/json','buffer':json.dumps(payload).encode()});p.wait_for_function("document.querySelector('.bf-offline [role=status]').textContent.includes('0 file record')");check(label+' repeated completed attempt not duplicated',p.locator(root+' [data-metric="Analyzed"] strong').inner_text()=='1')
  p.locator(root+' input[type=file]').set_input_files({'name':'invalid.json','mimeType':'application/json','buffer':b'{}'});p.wait_for_function("document.querySelector('.bf-offline [role=status]').textContent.includes('compatible')");check(label+' invalid file error readable',True)
  p.get_by_role('button',name='Return to session data').click();check(label+' local files never overwrite authorized session',p.evaluate('RizSimBigFiveFaculty.state().records')==12 and 'LOCAL FILE REVIEW' not in p.locator(root).inner_text())
  p.emulate_media(reduced_motion='reduce');check(label+' reduced motion',p.locator(root+' .bf-dashboard').evaluate('n=>getComputedStyle(n).animationName')=='none')
  p.add_style_tag(content='html{font-size:200%!important}');shot(p,label+'-text200')
  p.evaluate("RizSimBigFiveFaculty.draw({userId:'other',role:'student'}, {stage:'running',session:'existing-1'})")
  check(label+' disallowed role immediately clears records',p.locator(root).is_hidden() and p.evaluate('RizSimBigFiveFaculty.state().records')==0)
  check(label+' no page exceptions',not errors,errors)
 finally:
  if __import__('sys').exc_info()[0]:
   try:shot(p,label+'-failure')
   except Exception:pass
  ctx.close()

def tabs(browser,base):
 old=student.MOCK
 src=old.replace("slug:'decision-lab'","slug:'big-five-personality'").replace("launch_path:'/simulation-test.html'","launch_path:'/simulation-big-five.html'").replace("'session-open'",json.dumps(SID))
 src=src.replace("id:'attempt-'+i", "id:i===0?"+json.dumps(AID)+":'attempt-'+i")
 student.MOCK=src
 try:ctx,p,errors=student.open_page(browser,base,'#home')
 finally:student.MOCK=old
 ctx.route('https://esm.sh/@supabase/supabase-js@2.49.8',lambda r:r.fulfill(content_type='text/javascript',body=MOCK))
 try:
  student.go_classroom(p);p.locator('.rz-c155-start').click();p.locator('.rz-c155-erp[open] input[type=text]').fill('BF-TABS')
  with ctx.expect_page() as info:p.locator('.rz-c155-erp[open]').get_by_role('button',name='Continue').click()
  runner=info.value;runner.get_by_role('button',name='Start Knowledge Review',exact=True).wait_for();runner.get_by_role('button',name='Start Knowledge Review',exact=True).click();saved(runner);choose(runner)
  check('Classroom identity reused without a second form',runner.evaluate('__bf.row.response_data.record.identity.erp')=='BF-TABS')
  before=runner.evaluate('JSON.stringify(__bf.row.response_data.record)');runner.locator('.rz-v155-resource-return').click();p.wait_for_selector('#view-player.active.rz-c155-classroom')
  check('Class Resources targets original tab preserving answers',len(ctx.pages)==2 and runner.evaluate('JSON.stringify(__bf.row.response_data.record)')==before)
  p.evaluate('window.focus=()=>{}');runner.bring_to_front();runner.locator('.rz-v155-resource-return').click();runner.wait_for_timeout(500);check('blocked-focus compact fallback',runner.locator('.rz-v14-return-status').count()==1)
  runner.evaluate('window.opener=null');runner.reload(wait_until='domcontentloaded');runner.locator('#bfCommit').wait_for();runner.locator('.rz-v155-resource-return').click();runner.wait_for_timeout(500);check('missing opener does not duplicate Classroom',len(ctx.pages)==2)
  shot(runner,'big-five-class-resources')
 finally:ctx.close()

def original_previews(browser,base,which):
 html=json.loads((ROOT/'scripts/fixtures/big-five-originals.json').read_text())[which]
 ctx=browser.new_context(viewport={'width':1366,'height':900});ctx.route('**/__bigfive_original_'+which,lambda r:r.fulfill(content_type='text/html',body=html));p=ctx.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 try:
  p.goto(base+'/__bigfive_original_'+which,wait_until='domcontentloaded');p.wait_for_timeout(150);shot(p,'original-'+which);check('Original '+which+' uploaded source renders',not errors,errors)
 finally:ctx.close()

def main():
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),portal.Handler);threading.Thread(target=server.serve_forever,daemon=True).start();base='http://127.0.0.1:'+str(server.server_port)
 try:
  with sync_playwright() as pw:
   browser=pw.chromium.launch(headless=os.getenv('RIZSIM_HEADED')!='1');scope=os.getenv('BF_SCOPE','all');jobs=[]
   if scope in ['all','student']:
    jobs=[('original student',lambda:original_previews(browser,base,'student')),('safety',lambda:safety(browser,base)),('tabs',lambda:tabs(browser,base))]
    for size in [(1366,768),(768,1024),(390,844)]:jobs.append(('student-'+str(size),lambda s=size:student_flow(browser,base,s)))
   if scope in ['all','faculty']:
    jobs.append(('original faculty',lambda:original_previews(browser,base,'faculty')))
    for size in [(1366,768),(768,1024),(390,844)]:jobs.append(('faculty-'+str(size),lambda s=size:faculty(browser,base,s)))
   for label,fn in jobs:
    try:fn()
    except Exception:check(label+' flow',False,traceback.format_exc())
   browser.close()
 finally:server.shutdown()
 report={'checks':CHECKS,'states':STATES,'scope':'Actual mounted website and runner; synthetic authorized and denied adapters; no production learner data'};(OUT/'report.json').write_text(json.dumps(report,indent=2));failed=sum(not x['passed'] for x in CHECKS);print(json.dumps({'passed':len(CHECKS)-failed,'failed':failed,'states':len(STATES)}))
 if failed:raise SystemExit(1)
if __name__=='__main__':main()
