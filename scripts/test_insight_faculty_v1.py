"""SIM01 Faculty integration browser QA, synthetic fixtures in memory only."""
from pathlib import Path
import asyncio
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]
ASSETS=[
    "simulation-assets/insight-to-implication/questions.js",
    "simulation-assets/insight-to-implication/engine.js",
    "rizsim-insight-faculty.js",
]

async def main():
  async with async_playwright() as p:
    browser=await p.chromium.launch(headless=True)
    page=await browser.new_page(viewport={"width":1280,"height":850})
    errors=[]
    page.on("pageerror",lambda e:errors.append(str(e)))
    await page.set_content("""<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
       <link rel="stylesheet" href="data:text/css,">
       <section id="view-classroom" class="active">
         <div id="rzLiveResultsAnchor"></div>
       </section>""")
    await page.add_style_tag(path=str(ROOT/"rizsim-insight-faculty.css"))
    await page.add_style_tag(path=str(ROOT/"rizsim-v15-premium.css"))
    for asset in ASSETS: await page.add_script_tag(path=str(ROOT/asset))
    await page.evaluate("""() => {
      const D=window.InsightData,C=window.InsightCore;
      const wrong=v=>['A','B','C','D'].find(x=>x!==v);
      function mk(name,complete){
        const r=C.createRecord(name,'Test University');
        D.review.forEach(q=>r.picks.kr[q.id]=wrong(q.key));
        r.locks.kr=true;r.lockedAt.kr=C.now();
        if(complete){
          r.picks.source=D.source.key;r.locks.source=true;r.locks.bridge=true;
          r.picks.transfer=D.transfer.key;r.locks.transfer=true;r.locks.feedback=true;
          D.review.forEach(q=>r.picks.kg[q.id]=q.key);
          r.locks.kg=true;r.lockedAt.kg=C.now();
        }
        if(!C.validRecord(r))throw Error('Invalid browser fixture');
        return r;
      }
      const fakeRows=[
        {attempt_id:'attempt-a',student_name:'Person A',attempt_status:'submitted',
          joined_at:new Date().toISOString(),response_data:{record:mk('A',true)}},
        {attempt_id:'attempt-b',student_name:'<img src=x onerror=alert(1)>',
          attempt_status:'in_progress',joined_at:new Date().toISOString(),
          response_data:{record:mk('B',false)}},
        {attempt_id:'attempt-c',student_name:'Person C — just joined',
          attempt_status:'in_progress',joined_at:new Date().toISOString(),
          response_data:null}
      ];
      window.__testRows={'session-a':fakeRows,'session-b':[]};
      window.__rpcArgs=[];
      window.rizsimSharedAuth={
        auth:{getUser:async()=>({data:{user:{id:'faculty-1'}},error:null})},
        rpc:async(name,args)=>{
          window.__rpcArgs.push({name,args});
          if(name!=='get_my_rizsim_insight_session_records')throw Error('Unapproved RPC');
          return {data:window.__testRows[args.p_session_id],error:null};
        }
      };
      window.__testFaculty={
        role:'faculty',
        licensed:[{id:'product-a',slug:'insight-to-implication-bystander',
                   launch_path:'/simulation-insight-to-implication.html'}],
        sessions:[
          {session_id:'session-a',product_id:'product-a',class_name:'Test Class A'},
          {session_id:'session-b',product_id:'product-a',class_name:'Test Class B'}
        ]
      };
      window.RizSimInsightFaculty.draw(window.__testFaculty,
        {stage:'running',session:'session-a',mode:'simulation'});
    }""")
    await page.wait_for_function("window.RizSimInsightFaculty.state().joined===3")
    assert await page.locator("#rzInsightFacultyAnalytics").is_visible()
    assert await page.locator("#rzInsightFacultyAnalytics .rz-i01-learning-shift").count()==1
    assert await page.get_by_text("One room. A visible learning shift.").count()==1
    assert await page.locator(".rz-i01-shift-metric").count()==4
    assert await page.locator(".rz-i01-shift-path").count()==4
    assert await page.locator(".rz-i01-shift-metric").first.locator("strong").inner_text()=="1", "Only one matched Student may contribute learning gain"
    assert await page.get_by_text("Six-concept item comparison").count()==1
    assert await page.locator(".rz-i01-card-wide .rz-i01-table tbody tr").count()==3
    assert await page.locator(".rz-i01-progress-cell").count()==3
    assert await page.locator(".rz-i01-progress-cell").nth(0).get_by_text("100%").count()==1
    assert await page.locator(".rz-i01-progress-cell").nth(1).get_by_text("43%").count()==1
    assert await page.locator(".rz-i01-progress-cell").nth(2).get_by_text("0%").count()==1
    assert await page.locator(".rz-i01-progress-track[role=progressbar]").count()==3
    assert await page.get_by_text("Test Class A").count()>=1
    assert await page.locator("#rzInsightFacultyAnalytics img").count()==0,"User-supplied name was injected as markup"
    assert await page.get_by_text("<img src=x onerror=alert(1)>",exact=True).count()==1
    assert await page.locator(".rz-i01-meter-row").count()>=10
    assert await page.evaluate("window.__rpcArgs.length")>=1
    await page.locator(".rz-i01-card-wide .rz-i01-table tbody tr").first.get_by_role("button",name="View student result").click()
    assert await page.get_by_text("Your learning in view",exact=True).count()==1
    assert await page.locator("#rizsimInsightIndividualResult .rz-i01-student-tiles .rz-i01-stat").count()==4
    assert await page.locator("#rizsimInsightIndividualResult .rz-i01-path-card").count()==4
    assert await page.locator("#rizsimInsightIndividualResult .rz-i01-personal-bar").count()==6
    assert await page.locator("#rizsimInsightIndividualResult .rz-i01-path-card.selected").count()==1
    assert await page.get_by_text("Faculty answer guide · six matched concepts").count()==1
    assert await page.locator("#rizsimInsightIndividualResult .rz-i01-progress-track").get_attribute("aria-valuenow")=="100"
    await page.set_viewport_size({"width":390,"height":844})
    assert await page.evaluate("window.innerWidth>=document.documentElement.scrollWidth-6"),"Mobile individual report overflow"
    await page.screenshot(path=str(ROOT/"test-results"/"sim01-student-result-from-faculty-mobile.png"),full_page=True)
    await page.set_viewport_size({"width":1280,"height":850})
    await page.locator("#rizsimInsightIndividualResult summary").click()
    assert await page.locator("#rizsimInsightIndividualResult .rz-i01-answer-guide .rz-i01-table tbody tr").count()==6
    assert await page.locator("#rizsimInsightIndividualResult button[data-action]").count()==0
    await page.locator("#rizsimInsightIndividualResult").screenshot(path=str(ROOT/"test-results"/"sim01-faculty-student-full-results.png"))
    await page.locator(".rz-i01-card-wide .rz-i01-table tbody tr").nth(1).get_by_role("button",name="View student result").click()
    assert await page.get_by_text("Learning activity in progress").count()==1
    assert await page.locator("#rizsimInsightIndividualResult .rz-i01-progress-track").get_attribute("aria-valuenow")=="43"
    assert await page.get_by_text("The completed Student Review Gain Analytics screen is available",exact=False).count()==1
    await page.evaluate("""() => window.RizSimInsightFaculty.draw(window.__testFaculty,
        {stage:'running',session:'session-b',mode:'simulation'})""")
    await page.wait_for_function("window.RizSimInsightFaculty.state().sessionId==='session-b' && window.RizSimInsightFaculty.state().joined===0")
    assert await page.get_by_text("No students have joined this session yet.").count()==1
    await page.evaluate("""() => window.RizSimInsightFaculty.draw({role:'student',sessions:[],licensed:[]},
        {stage:'running',session:'session-a',mode:'simulation'})""")
    assert not await page.locator("#rzInsightFacultyAnalytics").is_visible()
    await page.evaluate("""() => window.RizSimInsightFaculty.draw(window.__testFaculty,
        {stage:'running',session:'session-a',mode:'simulation'})""")
    await page.wait_for_function("window.RizSimInsightFaculty.state().joined===3")
    await page.set_viewport_size({"width":390,"height":844})
    await page.screenshot(path=str(ROOT/"test-results"/"sim01-faculty-mobile.png"),full_page=True)
    assert await page.locator("#rzInsightFacultyAnalytics").is_visible()
    assert await page.evaluate("window.innerWidth>=document.documentElement.scrollWidth-6"),"Mobile content overflow"
    assert not errors,errors
    await browser.close()
    print("SIM01 Faculty Chromium QA: PASS — session switch, valid/partial records, safe identity, roster and mobile.")

if __name__=="__main__":
  (ROOT/"test-results").mkdir(exist_ok=True)
  asyncio.run(main())
