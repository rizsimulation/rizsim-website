"""Simulation 02 native Faculty: Chromium tests with SYNTHETIC IN-MEMORY fixtures only."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]

async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  page=await browser.new_page(viewport={"width":1280,"height":900})
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  await page.set_content("""<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
   <section id="view-classroom" class="active"><div id="rzLiveResultsAnchor"></div></section>""")
  await page.add_style_tag(path=str(ROOT/'rizsim-system-faculty.css'))
  await page.add_script_tag(path=str(ROOT/'rizsim-system-faculty.js'))
  await page.evaluate("""() => {
    const stamp=new Date().toISOString(),id='riz-ai-pedagogy-2026-s1s2-v1';
    function record(name,group,org,completed){
      return {schema:'RizSimulation.Participant.v1',assessment:id,id:name,revision:10,
        profile:{name,group,organization:org,session:'DEMONSTRATION'},
        kr:{a:[0,1,2,3,0,1],at:stamp},
        kg:{a:completed?[0,1,2,3,0,1]:[null,null,null,null,null,null],at:completed?stamp:null},
        lt:[0,1].map(i=>({source:{a:completed?i:null,at:completed?stamp:null},
                           transfer:{a:completed?i+1:null,at:completed?stamp:null}}))}
    }
    function metrics(paired,variation=0){
      const kr=[true,true,false,false,false,false];
      const kg=paired?[true,true,true,true,true,false]:[null,null,null,null,null,null];
      return {kr:2,kg:paired?5:null,gain:paired?3:null,source:paired?1:null,
        transfer:paired?2:null,kr_locked:true,kg_locked:paired,
        source_locked:paired?2:0,transfer_locked:paired?2:0,
        item_kr:kr,item_kg:kg,
        lt_source:paired?[true,false]:[null,null],
        lt_transfer:paired?[true,true]:[null,null],
        concepts:[{name:'Bystander Effect',kr:2,kg:paired?3:null},
                  {name:'Confirmation Bias',kr:0,kg:paired?2:null}],
        committed:paired?16:6,total:16,percent:paired?100:38,completed:paired};
    }
    const rows=[
      {attempt_id:'a-100',student_name:'Completed participant A',attempt_status:'submitted',
        joined_at:stamp,response_data:{record:record('A','Group A','Campus A',true)},metrics:metrics(true)},
      {attempt_id:'b-100',student_name:'Completed participant B',attempt_status:'submitted',
        joined_at:stamp,response_data:{record:record('B','Group B','Campus B',true)},metrics:metrics(true,1)},
      {attempt_id:'c-038',student_name:'<img src=x onerror=alert(1)>',attempt_status:'in_progress',
        joined_at:stamp,response_data:{record:record('C','Group A','Campus A',false)},metrics:metrics(false)},
      {attempt_id:'d-000',student_name:'Just joined',attempt_status:'in_progress',
        joined_at:stamp,response_data:null,metrics:null}
    ];
    window.__requested=[];
    window.__classes={'session-01':rows,'session-02':[]};
    window.rizsimSharedAuth={
      auth:{getUser:async()=>({error:null,data:{user:{id:'authorized-faculty'}}})},
      rpc:async(name,args)=>{
        window.__requested.push({name,args});
        if(name!=='get_my_rizsim_s1s2_session_records')return{error:{message:'Wrong result endpoint'}};
        return{error:null,data:window.__classes[args.p_session_id]||[]}
      }
    };
    window.__snapshot={role:'faculty',
      licensed:[{id:'product-02',slug:'system-1-system-2-thinking',
                 launch_path:'/simulation-system-1-system-2.html'}],
      sessions:[{session_id:'session-01',product_id:'product-02',class_name:'Class 02'},
                {session_id:'session-02',product_id:'product-02',class_name:'Empty 02'}]};
    window.RizSimSystemFaculty.draw(window.__snapshot,
      {stage:'running',session:'session-01',mode:'simulation'});
  }""")
  await page.wait_for_function("window.RizSimSystemFaculty.state().students===4")
  assert await page.locator('#rizsimSystemFacultyResults').is_visible()
  assert await page.get_by_text('Two concepts · comparative profile').count()==1
  assert await page.locator('.rz-s02-table tbody tr').count()>=4
  assert await page.locator('.rz-s02-progress-cell').count()==4
  assert await page.locator('.rz-s02-progress-cell').nth(0).get_by_text('100%').count()==1
  assert await page.locator('.rz-s02-progress-cell').nth(2).get_by_text('38%').count()==1
  assert await page.locator('.rz-s02-progress-cell').nth(3).get_by_text('0%').count()==1
  assert await page.locator('#rizsimSystemFacultyResults img').count()==0
  assert await page.get_by_text('<img src=x onerror=alert(1)>',exact=True).count()==1
  assert await page.get_by_text('Compare educator groups').count()==1
  assert await page.evaluate("window.__requested[0].args.p_session_id") == 'session-01'
  await page.locator('.rz-s02-name').first.locator('..').get_by_role('button',name='View student result').click()
  await page.locator('#rizsimSystemIndividualResult').wait_for()
  assert await page.get_by_text('Your learning review',exact=True).count()==1
  assert await page.locator('#rizsimSystemIndividualResult .rz-s02-metric').count()>=4
  assert await page.get_by_text('Bystander Effect',exact=True).count()>=1
  assert await page.get_by_text('Confirmation Bias',exact=True).count()>=1
  await page.locator('#rizsimSystemIndividualResult summary').click()
  assert await page.locator('#rizsimSystemIndividualResult .rz-s02-table tbody tr').count()==6
  assert await page.locator('#rizsimSystemIndividualResult button').count()==1
  (ROOT/'test-results').mkdir(exist_ok=True)
  await page.locator('#rizsimSystemIndividualResult').screenshot(path=str(ROOT/'test-results'/'sim02-faculty-individual-desktop.png'))
  await page.set_viewport_size({'width':390,'height':850})
  assert await page.locator('#rizsimSystemIndividualResult').is_visible()
  assert await page.evaluate('window.innerWidth >= document.documentElement.scrollWidth-7'),'Mobile overflow'
  await page.locator('#rizsimSystemIndividualResult').screenshot(path=str(ROOT/'test-results'/'sim02-faculty-individual-mobile.png'))
  await page.set_viewport_size({'width':1280,'height':900})
  await page.evaluate("""() => window.RizSimSystemFaculty.draw(window.__snapshot,
       {stage:'running',session:'session-02',mode:'simulation'})""")
  await page.wait_for_function("window.RizSimSystemFaculty.state().sessionId==='session-02' && window.RizSimSystemFaculty.state().students===0")
  assert await page.get_by_text('No Students have joined this session yet.').count()==1
  await page.evaluate("""() => window.RizSimSystemFaculty.draw(
       {role:'student',licensed:[],sessions:[]},
       {stage:'running',session:'session-01',mode:'simulation'})""")
  assert not await page.locator('#rizsimSystemFacultyResults').is_visible()
  assert not errors,errors
  await browser.close()
  print('SIM02 FACULTY PASS: server-scoped data, progress 0/38/100, full personal report, XSS safety, mobile & role isolation')

if __name__=='__main__':asyncio.run(main())
