"""Hotel Judgment Faculty: sealed-before-close, real-record-like fixtures after close.
Browser synthetic rows ONLY; no live user data or production sessions.
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
JS=r"""() => {
 const ts=new Date().toISOString();
 const prompt={A:'Does this hotel cost Less than PKR 1000 per night?',
               B:'Does this hotel cost More than PKR 80,000 per night?'};
 function person(id,name,g,wtp,yes,code){
  const record={version:'hotel-judgment-v1',response_id:'HJ-'+id,
    group:g,condition_question:prompt[g],binary_response:yes,
    willing_to_pay_pkr:wtp,participant_code:code,
    submitted_at:ts,attempt_id:id,session_id:'session-hotel-1',demo_only:false};
  return {attempt_id:id,student_name:name,attempt_status:'submitted',
    progress_percent:100,assignment_stage:'Submitted',joined_at:ts,submitted_at:ts,
    collection_revealed:false,record};
 }
 window.__hotel03Roster=[
   person('s-a','Synthetic Student A','A',12000,'Yes','A-01'),
   person('s-b','Synthetic Student B','B',38000,'No','<img src=x onerror=alert(1)>'),
   {attempt_id:'s-c',student_name:'Synthetic not-yet-answered',attempt_status:'in_progress',
     progress_percent:0,assignment_stage:'Assigned',joined_at:ts,submitted_at:null,
     collection_revealed:false,record:null}
 ];
 window.__hotel03Closed=false;
 window.__hotel03RPCCalls=[];
 window.rizsimSharedAuth={
   auth:{getUser:async()=>({data:{user:{id:'faculty-test'}},error:null})},
   rpc:async(name,args)=>{
     window.__hotel03RPCCalls.push({name,args});
     if(name!=='get_my_rizsim_hotel_session_records')
       return{error:{message:'Bad endpoint'},data:null};
     if(args.p_session_id==='session-hotel-2')return{data:[],error:null};
     return{data:window.__hotel03Roster.map(x=>({
        ...x,collection_revealed:window.__hotel03Closed,
        record:window.__hotel03Closed?x.record:null
     })),error:null};
   }
 };
 window.__hotel03FacultySession={
   role:'faculty',
   licensed:[{id:'hotel-product',slug:'hotel-judgment-lab',
      launch_path:'/simulation-hotel-judgment.html'}],
   sessions:[{session_id:'session-hotel-1',product_id:'hotel-product',
      class_name:'Hotel Experiment — Class A'},
     {session_id:'session-hotel-2',product_id:'hotel-product',class_name:'Hotel Class B'}]
 };
 window.RizSimHotelFaculty.draw(window.__hotel03FacultySession,
  {stage:'running',session:'session-hotel-1',mode:'simulation'});
}"""
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  page=await browser.new_page(viewport={'width':1280,'height':900})
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  await page.set_content("""<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
    <section id="view-classroom" class="active"><div id="rzLiveResultsAnchor"></div></section>""")
  await page.add_style_tag(path=str(ROOT/'rizsim-hotel-faculty.css'))
  await page.add_script_tag(path=str(ROOT/'rizsim-hotel-faculty.js'))
  await page.evaluate(JS)
  await page.wait_for_function('window.RizSimHotelFaculty.state().joined===3')
  assert await page.locator('#rizsimHotelFacultyResults').is_visible()
  assert await page.get_by_text('Collection in progress · Responses sealed').count()==1
  assert await page.locator('#rizsimHotelFacultyResults .rz-h03-progress-wrap').count()==3
  assert await page.locator('#rizsimHotelFacultyResults .rz-h03-progress-wrap').first.get_by_text('100%').count()==1
  assert await page.locator('#rizsimHotelFacultyResults .rz-h03-progress-wrap').nth(2).get_by_text('0%').count()==1
  assert await page.locator('#rizsimHotelFacultyResults .rz-h03-table tbody tr').count()==3
  assert await page.locator('#rizsimHotelFacultyResults svg').count()==0
  assert await page.locator('#rizsimHotelFacultyResults button:has-text("View student result"):enabled').count()==0
  assert await page.get_by_text('PKR 12,000').count()==0
  assert await page.get_by_text('Group A').count()==0
  assert await page.evaluate("window.__hotel03RPCCalls[0].args.p_session_id")=='session-hotel-1'
  (ROOT/'test-results').mkdir(exist_ok=True)
  await page.locator('#rizsimHotelFacultyResults').screenshot(path=str(ROOT/'test-results'/'sim03-faculty-sealed-roster.png'))
  await page.evaluate("""() => {window.__hotel03Closed=true;window.RizSimHotelFaculty.refresh()}""")
  await page.wait_for_function('window.RizSimHotelFaculty.state().revealed===true')
  assert await page.get_by_text('Collection closed · Class Insights available').count()==1
  assert await page.locator('.rz-h03-chart svg[role="img"]').count()==1
  assert await page.locator('.rz-h03-chart circle').count()==2
  assert await page.get_by_text('Median · Group A').count()==1
  assert await page.get_by_text('Median · Group B').count()==1
  assert await page.get_by_text('PKR 12,000').count()>=1
  assert await page.get_by_text('PKR 38,000').count()>=1
  assert await page.get_by_text('Notice → Locate → Infer',exact=False).count()>=1
  assert await page.locator('#rizsimHotelFacultyResults .rz-h03-table tbody tr').count()>=6
  assert await page.locator('#rizsimHotelFacultyResults img').count()==0
  await page.locator('#rizsimHotelFacultyResults').screenshot(path=str(ROOT/'test-results'/'sim03-faculty-class-insights.png'))
  await page.locator('.rz-h03-card .rz-h03-table tbody tr').first.get_by_role('button',name='View student result').click()
  assert await page.locator('#rizsimHotelIndividual').is_visible()
  assert await page.get_by_text('Original price-comparison condition').count()==1
  assert await page.locator('#rizsimHotelIndividual').get_by_text('PKR 12,000').count()>=1
  assert await page.locator('#rizsimHotelIndividual').get_by_text('Does this hotel cost Less than PKR 1000 per night?').count()==1
  await page.locator('#rizsimHotelIndividual').screenshot(path=str(ROOT/'test-results'/'sim03-faculty-individual-result.png'))
  await page.set_viewport_size({'width':390,'height':844})
  assert await page.locator('#rizsimHotelIndividual').is_visible()
  assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth+7'),'mobile horizontal overflow'
  await page.screenshot(path=str(ROOT/'test-results'/'sim03-faculty-mobile.png'),full_page=True)
  await page.set_viewport_size({'width':1280,'height':900})
  await page.evaluate("""() => window.RizSimHotelFaculty.draw(window.__hotel03FacultySession,
      {stage:'running',session:'session-hotel-2',mode:'simulation'})""")
  await page.wait_for_function("window.RizSimHotelFaculty.state().sessionId==='session-hotel-2' && window.RizSimHotelFaculty.state().joined===0")
  assert await page.get_by_text('No students have joined this classroom yet.').count()==1
  await page.evaluate("""() => window.RizSimHotelFaculty.draw({role:'student',licensed:[],sessions:[]},
       {stage:'running',session:'session-hotel-1',mode:'simulation'})""")
  assert not await page.locator('#rizsimHotelFacultyResults').is_visible()
  assert not errors,errors
  await browser.close()
  print('SIM03 Faculty Chromium PASS: sealed pre-close, real results after close, two-group medians and dots, individual read-only, XSS, session/role isolation and mobile')

if __name__=='__main__':asyncio.run(main())
