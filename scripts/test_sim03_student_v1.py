"""RizSim SIM03 Student hosted browser QA. Fake signed-in database, never production.
Runs both centrally assigned arms with the original uploaded hotel PNG bytes.
"""
import asyncio, re, threading, json
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]
AID='30000000-0000-4000-8000-000000000011'
SID='20000000-0000-4000-8000-000000000001'
HOSTED='simulation-hotel-judgment.html'
FAKE_JS=r"""
(function(){
 const ATTEMPT='30000000-0000-4000-8000-000000000011';
 const SESSION='20000000-0000-4000-8000-000000000001';
 const KEY='__rzHotel03FakeServer';
 const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')||
   {status:'in_progress',record:null,assign:null,submits:0}}
   catch{return {status:'in_progress',record:null,assign:null,submits:0}}};
 const save=x=>localStorage.setItem(KEY,JSON.stringify(x));
 window.__hotel03FakeState=read;
 window.__hotel03RPCs=[];
 window.__hotel03Bridge=[];
 window.addEventListener('rizsim:student-bridge',e=>window.__hotel03Bridge.push(e.detail));
 const q={
   A:'Does this hotel cost Less than PKR 1000 per night?',
   B:'Does this hotel cost More than PKR 80,000 per night?'
 };
 const chosen=window.__hotel03Group||'A';
 function query(table){
   const state=read();
   return {select(){return this},eq(){return this},async maybeSingle(){
     if(table==='simulation_attempts')return{data:{
       id:ATTEMPT,user_id:'fake-student',product_id:'fake-hotel-product',
       classroom_session_id:SESSION,classroom_access_type:'practice',
       status:state.status,submitted_at:state.record?.submitted_at||null},error:null};
     if(table==='products')return{data:{id:'fake-hotel-product',slug:'hotel-judgment-lab',
       product_type:'simulation',status:'published',
       launch_path:'/simulation-hotel-judgment.html'},error:null};
     throw Error('Direct table access not allowed: '+table);
   }};
 }
 window.__sim03CreateClient=()=>({
  auth:{getUser:async()=>({data:{user:window.__hotel03AuthDenied?null:{id:'fake-student'}},error:null})},
  from:query,
  rpc:async(name,args)=>{
    window.__hotel03RPCs.push({name,args});
    const state=read();
    if(name==='check_my_rizsim_classroom_attempt_access')return{data:[{
      attempt_id:ATTEMPT,session_id:SESSION,allowed:state.status==='in_progress',
      attempt_status:state.status}],error:null};
    if(name==='get_my_rizsim_hotel_assignment'){
      if(!state.assign){state.assign=chosen;save(state)}
      return{data:{attempt_id:ATTEMPT,session_id:SESSION,
        group:state.assign,condition_question:q[state.assign]},error:null};
    }
    if(name==='submit_my_rizsim_hotel_judgment'){
      if(state.status==='submitted')return{error:null,data:{
        status:'submitted',attempt_id:ATTEMPT,record:state.record,idempotent:true}};
      const group=state.assign;if(!group)return{error:{message:'No allocated group'},data:null};
      if(!['Yes','No'].includes(args.p_binary_response)||!Number.isSafeInteger(args.p_willingness_to_pay_pkr))
        return{error:{message:'Invalid response'},data:null};
      state.status='submitted';state.submits++;
      state.record={version:'hotel-judgment-v1',response_id:'HJ-12345678-1234-4234-8234-123456789abc',
        group,condition_question:q[group],binary_response:args.p_binary_response,
        willingness_to_pay_pkr:args.p_willingness_to_pay_pkr,
        participant_code:args.p_participant_code,submitted_at:new Date().toISOString(),
        attempt_id:ATTEMPT,session_id:SESSION,demo_only:false};
      save(state);
      return{data:{status:'submitted',attempt_id:ATTEMPT,record:state.record},error:null};
    }
    if(name==='get_my_rizsim_hotel_personal_result'){
      if(state.status!=='submitted')return{data:null,error:{message:'No submission'}};
      return{data:{status:'submitted',attempt_id:ATTEMPT,record:state.record},error:null};
    }
    throw Error('Unknown RPC '+name);
  }
 });
})();
"""
class Quiet(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):
  super().__init__(*args,directory=str(ROOT),**kwargs)
 def log_message(self,*args):pass

async def run_arm(browser,port,arm):
 context=await browser.new_context(viewport={'width':1280,'height':860},accept_downloads=True)
 await context.add_init_script("window.__hotel03Group="+json.dumps(arm)+";\n"+FAKE_JS)
 page=await context.new_page()
 errors=[]
 page.on('pageerror',lambda error:errors.append(str(error)))
 src=(ROOT/'simulation-assets/hotel-judgment/cloud.js').read_text()
 needle="const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/+esm');"
 assert src.count(needle)==1
 patched=src.replace(needle,"const createClient=window.__sim03CreateClient;")
 # Only in the isolated mock-loaded JavaScript, collect every receipt criterion
 # without altering the published cloud source or bypassing a failed check.
 receipt_check="if(value?.status!=='submitted'||String(value.attempt_id)!==attempt.id||\n        !validReceived(value.record))"
 instrument="window.__hotel03ReceiptCheck={value,attempt,assignedGroup,assignedQuestion,valid:validReceived(value.record),parts:{id:String(value.attempt_id)===attempt.id,group:value.record?.group===assignedGroup,question:value.record?.condition_question===assignedQuestion,session:value.record?.session_id===attempt.classroom_session_id,number:Number.isSafeInteger(Number(value.record?.willing_to_pay_pkr)),rawType:typeof value.record?.willing_to_pay_pkr,rawNumber:value.record?.willing_to_pay_pkr,numberConstructor:String(Number),castNumber:Number(value.record?.willing_to_pay_pkr),castNumberType:typeof Number(value.record?.willing_to_pay_pkr),nativeInteger:Number.isSafeInteger(12000),isFinite:Number.isFinite(Number(value.record?.willing_to_pay_pkr)),floor:Math.floor(value.record?.willing_to_pay_pkr),floorMatch:Math.floor(value.record?.willing_to_pay_pkr)===value.record?.willing_to_pay_pkr,firstSevenProps:Object.keys(value.record||{}).slice(0,15),demo:value.record?.demo_only===false,version:value.record?.version}};"+receipt_check
 assert patched.count(receipt_check)==1
 patched=patched.replace(receipt_check,instrument)
 async def stub(route):
  await route.fulfill(status=200,content_type='application/javascript',body=patched)
 await page.route('**/simulation-assets/hotel-judgment/cloud.js',stub)
 url=f'http://127.0.0.1:{port}/{HOSTED}?attempt={AID}&session={SID}&access=practice'
 await page.goto(url)
 try:
  await page.locator('#stimulusStage:not(.hidden)').wait_for(timeout=14000)
 except Exception:
  print('SIM03 hosted startup diagnostics',await page.evaluate("""() => ({
    htmlClass:document.documentElement.className,
    gate:document.getElementById('rizHotelAuthGate')?.innerText,
    status:document.getElementById('connectionStatus')?.innerText,
    photoReady:window.RizHotelStimuli?.ready,
    photos:[...document.querySelectorAll('img[data-hotel-view]')].map(x=>({
      src:x.getAttribute('src'),complete:x.complete,natural:x.naturalWidth,
      missing:x.dataset.missing
    })),
    live:window.RizHotelParticipantLive?{
      enabled:window.RizHotelParticipantLive.enabled,
      assignedGroup:window.RizHotelParticipantLive.assignedGroup,
      assignedQuestion:window.RizHotelParticipantLive.assignedQuestion
    }:null,
    calls:window.__hotel03RPCs||[]
  })"""))
  (ROOT/'test-results').mkdir(exist_ok=True)
  await page.screenshot(path=str(ROOT/'test-results'/'sim03-startup-diagnostic.png'),full_page=True)
  raise
 assert await page.locator('#groupStage').is_hidden(),'students must not self-select A/B'
 assert await page.locator('#groupBadge').inner_text()=='Group '+arm
 await page.wait_for_function('window.RizHotelStimuli?.ready===true')
 assert await page.locator('img[data-hotel-view]').count()==4
 checks=await page.locator('img[data-hotel-view]').evaluate_all(
   "(imgs)=>imgs.map((x,i)=>({n:x.dataset.hotelView,ready:x.complete&&x.naturalWidth>=200,src:x.getAttribute('src'),order:i+1}))")
 assert all(x['n']==str(i+1) and x['ready'] and x['src'].endswith(f'hotel_view_{i+1}.png')
   for i,x in enumerate(checks))
 prompt=await page.locator('#comparisonQuestion').inner_text()
 assert prompt==('Does this hotel cost Less than PKR 1000 per night?' if arm=='A' else
                'Does this hotel cost More than PKR 80,000 per night?')
 assert await page.evaluate('window.__hotel03FakeState().submits')==0
 assert len([x for x in await page.evaluate('window.__hotel03Bridge') if x['type']=='rizsim:student-response'])==0
 (ROOT/'test-results').mkdir(exist_ok=True)
 await page.screenshot(path=str(ROOT/'test-results'/f'sim03-student-condition-{arm}.png'),full_page=True)
 await page.locator('#yesBtn').click()
 await page.locator('#wtp').fill('12000' if arm=='A' else '38000')
 await page.locator('#participant').fill('Test '+arm)
 await page.get_by_role('button',name='Submit & lock response').click()
 try:
  await page.locator('#submittedStage:not(.hidden)').wait_for(timeout=8000)
 except Exception:
  print('SIM03 submission diagnostic',await page.evaluate("""() => ({
    validation:document.getElementById('validation')?.innerText,
    status:document.getElementById('connectionStatus')?.innerText,
    yes:document.getElementById('yesBtn')?.getAttribute('aria-pressed'),
    wtp:document.getElementById('wtp')?.value,
    fakeServer:window.__hotel03FakeState?.(),
    rpcCalls:window.__hotel03RPCs,
    live:{enabled:window.RizHotelParticipantLive?.enabled,
      group:window.RizHotelParticipantLive?.assignedGroup,
      state:window.RizHotelParticipantLive?.state},
    sourceCommitted:window.RizHotelSim03GetRecord?.(),
    receiptCheck:window.__hotel03ReceiptCheck,
    gate:document.getElementById('rizHotelAuthGate')?.innerText
  })"""),errors)
  await page.screenshot(path=str(ROOT/'test-results'/f'sim03-submit-failure-{arm}.png'),full_page=True)
  raise
 assert await page.locator('#sumGroup').inner_text()=='Group '+arm
 assert await page.locator('#sumYN').inner_text()=='Yes'
 assert await page.locator('#sumWTP').inner_text()==('PKR 12,000' if arm=='A' else 'PKR 38,000')
 assert await page.locator('#sumPrompt').inner_text()==prompt
 saved=await page.evaluate('window.__hotel03FakeState()')
 assert saved['submits']==1 and saved['status']=='submitted'
 assert saved['record']['group']==arm
 assert saved['record']['demo_only'] is False
 assert await page.locator('#submittedStage .actions').is_visible()
 async with page.expect_download() as dl:
  await page.get_by_role('button',name='Download response JSON').click()
 exported=json.loads(Path(await (await dl.value).path()).read_text())
 assert exported['group']==arm and exported['response_id']==saved['record']['response_id']
 assert exported['attempt_id']==AID and exported['version']=='hotel-judgment-v1'
 await page.screenshot(path=str(ROOT/'test-results'/f'sim03-student-result-{arm}.png'),full_page=True)
 await page.reload()
 await page.locator('#submittedStage:not(.hidden)').wait_for(timeout=16000)
 assert await page.locator('#groupStage').is_hidden()
 assert await page.locator('#stimulusStage').is_hidden()
 assert await page.evaluate('window.__hotel03FakeState().submits')==1,'reload must not resubmit'
 assert await page.locator('#sumWTP').inner_text()==('PKR 12,000' if arm=='A' else 'PKR 38,000')
 await page.set_viewport_size({'width':390,'height':844})
 await page.screenshot(path=str(ROOT/'test-results'/f'sim03-student-mobile-{arm}.png'),full_page=True)
 assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth+7'),'mobile horizontal overflow'
 assert not errors,errors
 await context.close()
 print(f'SIM03 Student Group {arm}: PASS, 4 original photos, assigned comparison, one locked PKR judgment, canonical receipt, JSON, read-only resume')

async def negative(browser,port):
 context=await browser.new_context(viewport={'width':1100,'height':800})
 await context.add_init_script(FAKE_JS)
 await context.add_init_script("window.__hotel03AuthDenied=true")
 page=await context.new_page()
 src=(ROOT/'simulation-assets/hotel-judgment/cloud.js').read_text()
 old="const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/+esm');"
 async def cloud(route):await route.fulfill(status=200,content_type='application/javascript',body=src.replace(old,'const createClient=window.__sim03CreateClient;'))
 await page.route('**/simulation-assets/hotel-judgment/cloud.js',cloud)
 await page.goto(f'http://127.0.0.1:{port}/{HOSTED}?attempt={AID}&session={SID}&access=practice')
 await page.get_by_text('Sign in as the enrolled Student',exact=False).wait_for(timeout=18000)
 assert await page.locator('.app').is_hidden(),'unauthenticated site content must fail closed'
 assert await page.locator('#stimulusStage').is_hidden()
 await context.close()
 print('SIM03 Unauthorized Student: PASS — fail closed')

async def main():
 server=ThreadingHTTPServer(('127.0.0.1',0),Quiet)
 thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
 try:
  async with async_playwright() as p:
   browser=await p.chromium.launch(headless=True)
   for arm in ['A','B']:await run_arm(browser,server.server_address[1],arm)
   await negative(browser,server.server_address[1])
   await browser.close()
 finally:server.shutdown();server.server_close()

if __name__=='__main__':asyncio.run(main())
