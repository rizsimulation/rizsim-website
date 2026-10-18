"""Step 4 Owner visual acceptance: assembled PR portal with synthetic licensed sessions.
No production logins, writes, permissions, products, student records, or SQL.
This is a TRUE integrated page capture (not composited standalone dashboards).
"""
import http.server
import json
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright
import test_live_classroom_v5 as v5

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results'
OUT.mkdir(exist_ok=True)

PRODUCTS="""{id:'review-01',slug:'insight-to-implication-bystander',launch_path:'/simulation-insight-to-implication.html',title:'Insight to Implication',product_type:'simulation',status:'published',category_id:'cat-1'},
{id:'review-02',slug:'system-1-system-2-thinking',launch_path:'/simulation-system-1-system-2.html',title:'System 1 & System 2 Thinking',product_type:'simulation',status:'published',category_id:'cat-1'},
{id:'review-03',slug:'hotel-judgment-lab',launch_path:'/simulation-hotel-judgment.html',title:'Hotel Judgment Lab',product_type:'simulation',status:'published',category_id:'cat-1'},"""
added=("const key=new URLSearchParams(window.location.search).get('selection');"
       "if(['review-01','review-02','review-03'].includes(key)){"
       "state.sessions[0]=session(key,key,null,'Owner Review '+key.slice(-2));"
       "}")
rpc="""if(name==='get_my_rizsim_insight_session_records')return ok(window.__step4?.sim01||[]);
if(name==='get_my_rizsim_s1s2_session_records')return ok(window.__step4?.sim02||[]);
if(name==='get_my_rizsim_hotel_session_records')return ok((window.__step4?.sim03||[]).map(x=>({
  ...x,collection_revealed:window.__step4?.closed===true,
  record:window.__step4?.closed===true?x.record:null
})));
"""
base=v5.MOCK
assert base.count('const products=[')==1
assert base.count('state.sessionResources=[];')==1
assert base.count('async function rpc(name,args={}){')==1
v5.MOCK=base.replace('const products=[','const products=['+PRODUCTS).replace(
 'state.sessionResources=[];','state.sessionResources=[];'+added).replace(
 'async function rpc(name,args={}){','async function rpc(name,args={}){'+rpc)

SETUP=r"""() => {
 const stamp=new Date().toISOString();
 const C=window.InsightCore,D=window.InsightData;
 if(!C||!D)throw Error('Original Sim01 source module not loaded');
 const wrong=k=>['A','B','C','D'].find(x=>x!==k);
 function record(name,complete){
  const r=C.createRecord(name,'Synthetic Review Campus');
  D.review.forEach(q=>r.picks.kr[q.id]=wrong(q.key));
  r.locks.kr=true;r.lockedAt.kr=C.now();
  if(complete){
   r.picks.source=D.source.key;r.locks.source=true;r.locks.bridge=true;
   r.picks.transfer=D.transfer.key;r.locks.transfer=true;r.locks.feedback=true;
   D.review.forEach(q=>r.picks.kg[q.id]=q.key);
   r.locks.kg=true;r.lockedAt.kg=C.now();
  }
  if(!C.validRecord(r))throw Error('Bad Sim01 fixture');
  return r;
 }
 const assessment='riz-ai-pedagogy-2026-s1s2-v1';
 function sysRecord(name,complete){
  return {schema:'RizSimulation.Participant.v1',assessment,id:name,revision:10,
   profile:{name,group:'Group A',organization:'Synthetic University',session:'QA'},
   kr:{a:[0,1,2,3,0,1],at:stamp},
   kg:{a:complete?[0,1,2,3,0,1]:[null,null,null,null,null,null],at:complete?stamp:null},
   lt:[0,1].map(i=>({source:{a:complete?i:null,at:complete?stamp:null},
    transfer:{a:complete?i+1:null,at:complete?stamp:null}}))};
 }
 function metric(complete){
  return {kr:2,kg:complete?5:null,gain:complete?3:null,source:complete?1:null,
   transfer:complete?2:null,kr_locked:true,kg_locked:complete,
   source_locked:complete?2:0,transfer_locked:complete?2:0,
   item_kr:[true,true,false,false,false,false],
   item_kg:complete?[true,true,true,true,true,false]:[null,null,null,null,null,null],
   lt_source:complete?[true,false]:[null,null],
   lt_transfer:complete?[true,true]:[null,null],
   concepts:[{name:'Bystander Effect',kr:2,kg:complete?3:null},
    {name:'Confirmation Bias',kr:0,kg:complete?2:null}],
   committed:complete?16:6,total:16,percent:complete?100:38,completed:complete};
 }
 const conditions={A:'Does this hotel cost Less than PKR 1000 per night?',
  B:'Does this hotel cost More than PKR 80,000 per night?'};
 function hotel(id,name,group,price,answer){
   return {attempt_id:id,student_name:name,attempt_status:'submitted',joined_at:stamp,
    submitted_at:stamp,progress_percent:100,assignment_stage:'Submitted',
    record:{version:'hotel-judgment-v1',response_id:'synthetic-'+id,
     group,condition_question:conditions[group],binary_response:answer,
     willingness_to_pay_pkr:null,willing_to_pay_pkr:price,participant_code:'QA-'+id,
     submitted_at:stamp,attempt_id:id,session_id:'review-03',demo_only:false}};
 }
 window.__step4={
  closed:false,
  sim01:[
   {attempt_id:'one',student_name:'Synthetic Review Student A',attempt_status:'submitted',joined_at:stamp,response_data:{record:record('A',true)}},
   {attempt_id:'two',student_name:'Synthetic Review Student B',attempt_status:'in_progress',joined_at:stamp,response_data:{record:record('B',false)}},
   {attempt_id:'three',student_name:'Synthetic Review Student C',attempt_status:'in_progress',joined_at:stamp,response_data:null}
  ],
  sim02:[
   {attempt_id:'one',student_name:'Synthetic Review Student A',attempt_status:'submitted',joined_at:stamp,response_data:{record:sysRecord('A',true)},metrics:metric(true)},
   {attempt_id:'two',student_name:'Synthetic Review Student B',attempt_status:'in_progress',joined_at:stamp,response_data:{record:sysRecord('B',false)},metrics:metric(false)}
  ],
  sim03:[
   hotel('one','Synthetic Review Student A','A',12000,'Yes'),
   hotel('two','Synthetic Review Student B','B',38000,'No'),
   {attempt_id:'three',student_name:'Synthetic Review Student C',
    attempt_status:'in_progress',joined_at:stamp,progress_percent:0,
    assignment_stage:'Assigned',submitted_at:null,record:null}
  ]
 };
}"""

CASES=[
 ('01','RizSimInsightFaculty','rzInsightStudentResults','rzInsightFacultyAnalytics',3),
 ('02','RizSimSystemFaculty','rizsimSystemStudentResults','rizsimSystemFacultyResults',2),
 ('03','RizSimHotelFaculty','rizsimHotelStudentResults','rizsimHotelFacultyResults',3)
]

def capture(page,name):
 page.screenshot(path=str(OUT/name),full_page=True,animations='disabled')

def run(browser,base):
 for code,mod,student_id,insight_id,n in CASES:
  context,page,errors=v5.page_for(browser,base,'faculty',
   '?live=simulation-running&selection=review-'+code+
   '&live_session=review-'+code+'#classroom')
  try:
   page.wait_for_selector('#rzLiveV13Workspace:not([hidden])',timeout=20000)
   # Studio Share is now the only QR surface. The original session card is
   # still the sole source of the verified code, protected token and QR.
   assert page.locator('#rzLiveAccessFab,#rzLiveAccessLayer,#rzV13ShareOpen').count()==0
   page.locator('#rzV13SubviewShare').click()
   page.locator('#rzV13ShareQR svg:visible').wait_for(timeout=18000)
   shared=page.evaluate("""() => ({
     verified:RizSimLiveClassroom.verifiedShare(),
     studioCode:document.getElementById('rzV13ShareCode').textContent,
     studioLink:document.getElementById('rzV13ShareLink').textContent
   })""")
   assert shared['verified'] and shared['studioCode']==shared['verified']['code']
   assert shared['studioLink']==shared['verified']['link']
   capture(page,'step4-integrated-sim'+code+'-studio-share-desktop.png')
   page.locator('#rzV13SubviewOverview').click()
   page.evaluate(SETUP)
   page.evaluate("window['"+mod+"'].refresh()")
   try:
    counter='students' if code=='02' else 'joined'
    page.wait_for_function("window['"+mod+"'].state()."+counter+"=="+str(n),timeout=14000)
   except Exception:
    diag=page.evaluate("""({moduleName}) => ({
      href:location.href,
      moduleState:window[moduleName]?.state?.(),
      hasModule:!!window[moduleName],
      scriptTags:[...document.querySelectorAll('script[src*="-faculty.js"]')].map(x=>({src:x.src,defer:x.defer})),
      scriptResources:performance.getEntriesByType('resource').filter(x=>x.name.includes('faculty.js')).map(x=>({name:x.name,responseStatus:x.responseStatus,duration:x.duration})),
      facultyExports:{insight:!!window.RizSimInsightFaculty,system:!!window.RizSimSystemFaculty,hotel:!!window.RizSimHotelFaculty},
      bridge:window.RizSimFacultyBridge?.getSnapshot?.(),
      fixtureRows:{sim01:window.__step4?.sim01?.length,
        sim02:window.__step4?.sim02?.length,sim03:window.__step4?.sim03?.length},
      foundStud:!!document.getElementById('rzV13SimulationStudentResults'),
      v13:window.RizSimLiveWorkspace?.state?.(),
      errors:document.querySelectorAll('.rz-s02-error').length
    })""",mod)
    print('STEP4 DEBUG '+code+': '+json.dumps(diag,default=str)[:7000],flush=True)
    capture(page,'step4-debug-sim'+code+'.png')
    raise
   assert page.locator('#rzV13Tabstudio[aria-selected=true]').count()==1,'Studio first'
   page.locator('#rzV13Tabstudents').click()
   page.locator('#rzV13Tabstudents').hover()
   colors=page.locator('#rzV13Tabstudents').evaluate("""n=>({
     color:getComputedStyle(n).color,
     gradient:getComputedStyle(n).backgroundImage
   })""")
   assert colors['color']=='rgb(255, 255, 255)' and 'gradient' in colors['gradient'], 'Active selected tab contrast'
   page.locator('#'+student_id).wait_for(state='visible')
   assert page.locator('#rzLiveNoResults').is_hidden(), 'No misleading generic no-submission banner'
   assert page.locator('#'+insight_id).is_hidden(), 'Class Insights concealed in Student Results'
   assert page.locator('#'+student_id+' [role=progressbar]').count()>=n,'Per-student progress retained'
   assert page.locator('#rzLiveStudentRosterMount #classroomRosterPanel').is_hidden(), 'No duplicate V5 roster'
   if code=='02':
    assert page.locator('#rzS02RosterScrollHint').is_hidden(), 'V15 removes unwanted horizontal-scroll hint'
    assert page.locator('#rizsimSystemStudentResults .rz-s02-table-scroller[role="region"][tabindex="0"]').count()==1
    assert page.locator('#rizsimSystemStudentResults .rz-v15-compact-table').count()==1, 'V15 preserves all Student fields in responsive labelled cards'
   if code=='03':
    assert 'PKR 12,000' not in page.locator('#rzV13Panestudents').inner_text()
    assert 'Group A' not in page.locator('#rzV13Panestudents').inner_text()
    assert page.locator('#'+student_id+' button:has-text("View student result"):enabled').count()==0
   capture(page,'step4-integrated-sim'+code+'-student-results-desktop.png')
   page.locator('#rzV13Tabinsights').click()
   page.locator('#'+insight_id).wait_for(state='visible')
   assert page.locator('#'+student_id).is_hidden(), 'Student results not exposed in Class Insights'
   if code=='03':
    assert page.locator('#'+insight_id+' svg[role=img]').count()==0,'Sealed analytics before closure'
    capture(page,'step4-integrated-sim03-sealed-class-insights-desktop.png')
    page.evaluate("window.__step4.closed=true; window.RizSimHotelFaculty.refresh()")
    page.wait_for_function('RizSimHotelFaculty.state().revealed===true',timeout=15000)
    assert page.locator('#'+insight_id+' svg[role=img]').count()==1,'Original A/B dot plot'
   capture(page,'step4-integrated-sim'+code+'-class-insights-desktop.png')
   if code=='03':
    page.locator('#rzV13Tabstudents').click()
    assert page.locator('#'+student_id+' button:has-text("View student result"):enabled').count()==2
    page.locator('#'+student_id+' button:has-text("View student result"):enabled').first.click()
    assert page.locator('#rizsimHotelIndividual').is_visible()
   elif code=='02':
    page.locator('#rzV13Tabstudents').click()
    page.locator('#'+student_id+' button:has-text("View student result"):enabled').first.click()
    assert page.locator('#rizsimSystemIndividualResult').is_visible()
   else:
    page.locator('#rzV13Tabstudents').click()
    page.locator('#'+student_id+' button:has-text("View student result"):enabled').first.click()
    assert page.locator('#rizsimInsightIndividualResult').is_visible()
   capture(page,'step4-integrated-sim'+code+'-individual-results-desktop.png')
   page.set_viewport_size({'width':390,'height':844})
   page.locator('#rzV13Panestudents').wait_for(state='visible')
   assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 8'),'Mobile horizontal overflow'
   capture(page,'step4-integrated-sim'+code+'-student-results-mobile.png')
   assert not errors,errors
   print('PASS STEP4 INTEGRATED SIM'+code+': mounted Student Results, separate Class Insights, synthetic progress, mobile, sealed Hotel controls',flush=True)
  finally:
   v5.close(context)

if __name__=='__main__':
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),v5.Handler)
 base='http://127.0.0.1:'+str(server.server_port)
 threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  with sync_playwright() as pw:
   browser=pw.chromium.launch(headless=True)
   try:run(browser,base)
   finally:browser.close()
 finally:
  server.shutdown();server.server_close()
 print('PASS Step4 full assembled portal screenshots (synthetic, never production)')
