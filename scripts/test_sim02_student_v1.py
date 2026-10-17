"""Simulation 02 Student integration browser QA with an isolated fake data adapter.
No actual RizSim user, product, session, academic answer key, or DB write is used.
"""
import asyncio
import re
import threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]
AID='10000000-0000-4000-8000-000000000001'
SID='20000000-0000-4000-8000-000000000001'
MOCK=r"""
(function(){
 const AID='10000000-0000-4000-8000-000000000001';
 const SID='20000000-0000-4000-8000-000000000001';
 const dataKey='__sim02_browser_fake_backend';
 const fresh=()=>({id:AID,user_id:'mock-user-1',product_id:'fake-product-02',
   classroom_session_id:SID,classroom_access_type:'practice',
   status:'in_progress',progress_percent:0,submitted_at:null});
 const current=()=>{try{return JSON.parse(localStorage.getItem(dataKey)||'null')||{attempt:fresh(),saved:null,saves:0,submits:0}}catch(e){return{attempt:fresh(),saved:null,saves:0,submits:0}}};
 const keep=x=>localStorage.setItem(dataKey,JSON.stringify(x));
 window.__sim02Events=[];
 window.addEventListener('rizsim:sync-outbound',e=>window.__sim02Events.push(e.detail));
 window.__sim02FakeState=()=>current();
 function query(table){
   let filters={},action='select',body=null;
   const result=()=>{
     const d=current();
     if(action==='update'){
       if(table==='simulation_responses'){if(d.saved)d.saved.response_data=body.response_data;}
       else if(table==='simulation_attempts'){
         if(body.progress_percent!==undefined)d.attempt.progress_percent=body.progress_percent;
       }keep(d);return{data:null,error:null};
     }
     return{data:table==='simulation_attempts'?d.attempt:table==='products'?
       {id:'fake-product-02',slug:'system-1-system-2-thinking',
         status:'published',product_type:'simulation',
         launch_path:'/simulation-system-1-system-2.html'}:
         (d.saved?{id:'response-1',response_data:d.saved.response_data}:null),error:null};
   };
   const api={
     select(){return api;},eq(k,v){filters[k]=v;return api;},
     limit:async()=>{const q=result();return{data:q.data?[q.data]:[],error:q.error}},
     maybeSingle:async()=>result(),
     insert:async payload=>{
       const d=current();d.saved={id:'response-1',response_data:payload.response_data};
       d.saves++;keep(d);return{data:null,error:null};
     },
     update(payload){action='update';body=payload;return api;},
     then(resolve,reject){return Promise.resolve(result()).then(resolve,reject)}
   };
   return api;
 }
 window.__sim02CreateClient=()=>({
   auth:{getUser:async()=>({data:{user:{id:'mock-user-1',
     user_metadata:{full_name:'Synthetic Learner'}}},error:null})},
   from:query,
   rpc:async(name,args)=>{
     const d=current();
     if(name==='check_my_rizsim_classroom_attempt_access')
       return{data:[{allowed:d.attempt.status==='in_progress',
         attempt_id:AID,session_id:SID,attempt_status:d.attempt.status}],error:null};
     if(name==='submit_my_rizsim_classroom_attempt'){
       if(d.attempt.progress_percent!==100||d.saved?.response_data?.committed_count!==16)
          return{data:null,error:{message:'Incomplete saved response'}};
       d.attempt.status='submitted';d.attempt.submitted_at=new Date().toISOString();d.submits++;
       keep(d);return{data:[{attempt_id:AID,status:'submitted',
         submitted_at:d.attempt.submitted_at,progress_percent:100}],error:null};
     }
     if(name==='get_my_rizsim_s1s2_personal_result'){
       if(d.attempt.status!=='submitted')return{data:null,error:{message:'Not submitted'}};
       return{error:null,data:{receipt:'submitted',attempt_id:AID,
         simulation_id:'riz-ai-pedagogy-2026-s1s2-v1',schema_version:'1.0.0',
         metrics:{kr:3,kg:5,source:1,transfer:2,
           concepts:[{name:'Bystander Effect',kr:2,kg:3},
                     {name:'Confirmation Bias',kr:1,kg:2}]}}};
     }
     return{data:null,error:{message:'Unknown operation'}};
   }
 });
})();
"""
class Quiet(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def log_message(self,format,*args):pass

async def main():
 server=ThreadingHTTPServer(('127.0.0.1',0),Quiet)
 thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
 try:
  async with async_playwright() as p:
   browser=await p.chromium.launch(headless=True)
   context=await browser.new_context(viewport={'width':1260,'height':880})
   await context.add_init_script(MOCK)
   page=await context.new_page()
   errors=[]
   page.on('pageerror',lambda e:errors.append(str(e)))
   page.on('dialog',lambda d:asyncio.create_task(d.accept()))
   source=(ROOT/'simulation-assets/system-1-system-2/cloud.js').read_text()
   old="const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/+esm');"
   assert source.count(old)==1,'Hosted client import contract moved'
   patched=source.replace(old,'const createClient=window.__sim02CreateClient;')
   async def serve_cloud(route):
    await route.fulfill(status=200,content_type='application/javascript',body=patched)
   await page.route('**/simulation-assets/system-1-system-2/cloud.js',serve_cloud)
   url=f'http://127.0.0.1:{server.server_address[1]}/simulation-system-1-system-2.html?attempt={AID}&session={SID}&access=practice'
   await page.goto(url,wait_until='domcontentloaded')
   await page.locator('#joinForm').wait_for()
   await page.locator('#pname').fill('Synthetic Learner')
   await page.locator('#porg').fill('RizSim Browser QA')
   await page.get_by_role('button',name=re.compile('Begin Knowledge Review')).click()
   async def reviews(label):
    for i in range(6):
     await page.locator('label.option').first.click()
     if i<5:await page.get_by_role('button',name='Next question').click()
    await page.get_by_role('button',name=f'Lock {label} · 6 responses').click()
   async def synced(expected):
    await page.wait_for_function(f"window.__sim02FakeState()?.attempt.progress_percent==={expected}",timeout=10000)
    await page.wait_for_function("!document.querySelector('#rzSim02PendingOverlay') || document.querySelector('#rzSim02PendingOverlay').hidden",timeout=10000)
   await reviews('KR')
   await synced(38)
   for i in range(2):
    for kind in ('source','transfer'):
     await page.locator('label.option').first.click()
     await page.get_by_role('button',name=re.compile('Commit '+kind+' decision')).click()
     await page.get_by_role('button',name=re.compile('Apply in a new case|Continue to the second pair|Begin Knowledge Gain')).click()
   await page.get_by_role('heading',name='Your fresh review').wait_for()
   await reviews('KG')
   await page.get_by_role('heading',name='Your learning review').wait_for(timeout=15000)
   await page.get_by_text('Knowledge Review',exact=True).first.wait_for()
   result=await page.evaluate('window.__sim02FakeState()')
   assert result['attempt']['status']=='submitted'
   assert result['attempt']['progress_percent']==100
   assert result['saved']['response_data']['committed_count']==16
   assert result['submits']==1
   assert result['saved']['response_data']['record']['kg']['at']
   assert await page.get_by_role('heading',name='Your learning review').count()==1
   assert await page.get_by_text('Bystander Effect',exact=True).count()>=1
   assert await page.get_by_text('Confirmation Bias',exact=True).count()>=1
   assert len(await page.evaluate('window.__sim02Events'))>=1
   (ROOT/'test-results').mkdir(exist_ok=True)
   await page.screenshot(path=str(ROOT/'test-results'/'sim02-student-complete-desktop.png'),full_page=True)
   await page.reload()
   await page.get_by_role('heading',name='Your learning review').wait_for(timeout=15000)
   assert await page.get_by_text('RizSim Student account').count()==0
   await page.set_viewport_size({'width':390,'height':844})
   await page.screenshot(path=str(ROOT/'test-results'/'sim02-student-results-mobile.png'),full_page=True)
   assert not errors,errors
   await browser.close()
   print('SIM02 STUDENT PASS: original KR+4LT+KG 16 locked, server receipt, private-score RGA, Player snapshots and read-only resume.')
 finally:server.shutdown();server.server_close()

if __name__=='__main__':asyncio.run(main())
