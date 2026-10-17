/* PROPOSED RizSim Activity 03 authenticated runner. DRAFT / NOT DEPLOYED.
   Fail-closed on missing authorized attempt OR missing original four source photos.
   Uses existing user-owned attempts/response RLS and classroom submit RPC;
   never deploy the uploaded classroom PIN server on the Internet. */
(function(){'use strict';
 const SUPABASE_URL='https://rvmumpvtvjvvuyimeybc.supabase.co';
 const SUPABASE_PUBLISHABLE_KEY='sb_publishable_wufSxfg90bb4R6XarScaJQ_Dl5wlmtf'; // Public key only: replace on authorized review
 const SLUG='hotel-judgment-lab';
 const PATH='/simulation-hotel-judgment.html';
 const RESPONSE_KEY='hotel-judgment-v1-locked';
 const QUESTION={A:'Does this hotel cost Less than PKR 1000 per night?',B:'Does this hotel cost More than PKR 80,000 per night?'};
 const qp=new URLSearchParams(location.search),isUUID=x=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x||'');
 let client=null,user=null,attempt=null,product=null,serverRecord=null,authorized=false,inFlight=false,ready=false;
 const gate=document.getElementById('rizHotelAuthGate');
 function showGate(message){if(gate){gate.hidden=false;gate.replaceChildren();const h=document.createElement('h2');h.textContent='RizSim · Hotel Judgment Lab';const p=document.createElement('p');p.textContent=message;const a=document.createElement('a');a.href='/access-in.html';a.textContent='Return to Student Access';a.className='secondary';gate.append(h,p,a)}document.documentElement.classList.remove('rizsim-authorized')}
 const request=async v=>{const {data,error}=await v;if(error)throw Error(error.message||'RizSim connection failed.');return data};
 async function checkAccess(){const raw=await request(client.rpc('check_my_rizsim_classroom_attempt_access',{p_attempt_id:attempt.id}));const s=Array.isArray(raw)?raw[0]:raw;if(!s||s.allowed!==true||String(s.attempt_id)!==attempt.id||String(s.session_id)!==String(attempt.classroom_session_id)||s.attempt_status!=='in_progress')throw Error(s?.access_reason||'This class is not accepting your response.');return s}
 function validRecord(r){return r&&r.version==='hotel-judgment-v1'&&r.group in QUESTION&&r.condition_question===QUESTION[r.group]&&['Yes','No'].includes(r.binary_response)&&Number.isSafeInteger(r.willing_to_pay_pkr)&&r.willing_to_pay_pkr>=0&&r.willing_to_pay_pkr<=1e12&&typeof r.response_id==='string'&&r.response_id.length>5&&!r.demo_only}
 function decisionEqual(a,b){return a.group===b.group&&a.binary_response===b.binary_response&&a.willing_to_pay_pkr===b.willing_to_pay_pkr&&String(a.participant_code||'')===String(b.participant_code||'')}
 function assetReady(){const all=[...document.querySelectorAll('img[data-hotel-view]')];return !!window.RizHotelStimuli?.ready&&all.length>=4}
 async function waitForStimuli(){
  const all=[...document.querySelectorAll('img[data-hotel-view]')];
  if(all.length!==4)throw Error('This simulation requires four hotel photographs.');
  await Promise.all(all.map(img=>new Promise(resolve=>{
   if(img.complete)return resolve();
   const settle=()=>resolve();
   img.addEventListener('load',settle,{once:true});
   img.addEventListener('error',settle,{once:true});
   setTimeout(settle,15000);
  })));
  if(!assetReady())throw Error('The four original Istanbul hotel photographs are unavailable or incomplete. Please notify the Course Lead.');
 }

 function restoreConfirmed(r){try{localStorage.setItem('RizSimulation.HotelJudgment.Activity03.Live.'+attempt.id,JSON.stringify({group:r.group,submitted:r}));sessionStorage.setItem('hotelJudgmentResponse',JSON.stringify(r))}catch{}}
 async function loadResponse(){const rows=await request(client.from('simulation_responses').select('id,response_data').eq('attempt_id',attempt.id).eq('question_key',RESPONSE_KEY).limit(1));const r=rows?.[0]?.response_data?.record;if(r&&!validRecord(r))throw Error('Saved response format is not recognized. Contact Faculty.');return r||null}
 async function verify(){
  if(location.pathname!==PATH)throw Error('Open through the official RizSim classroom link.');
  if(SUPABASE_PUBLISHABLE_KEY.includes('__RIZSIM_'))throw Error('The authorized publisher has not configured this simulation.');
  if(!isUUID(qp.get('attempt'))||!isUUID(qp.get('session'))||!['live','practice'].includes(qp.get('access')))throw Error('A verified classroom session and attempt ID are required.');
  const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/+esm');
  client=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const auth=await request(client.auth.getUser());user=auth.user;if(!user)throw Error('Sign in to RizSim Student Access and reopen your classroom.');
  attempt=await request(client.from('simulation_attempts').select('id,user_id,product_id,status,submitted_at,classroom_session_id,classroom_access_type').eq('id',qp.get('attempt')).maybeSingle());
  if(!attempt||attempt.user_id!==user.id||attempt.classroom_session_id!==qp.get('session')||attempt.classroom_access_type!==qp.get('access'))throw Error('The classroom attempt is not assigned to this account.');
  product=await request(client.from('products').select('id,slug,status,product_type,launch_path').eq('id',attempt.product_id).maybeSingle());
  if(!product||product.slug!==SLUG||product.status!=='published'||product.product_type!=='simulation'||product.launch_path!==PATH)throw Error('The matching simulation has not been authorized for this class.');
  await waitForStimuli();
  serverRecord=await loadResponse();
  if(attempt.status==='in_progress')await checkAccess();
  else if(attempt.status!=='submitted'||!serverRecord)throw Error('This attempt cannot be resumed.');
  if(serverRecord&&attempt.status==='submitted')restoreConfirmed(serverRecord);
  if(serverRecord&&attempt.status==='in_progress'){
    /* Fail closed for a saved-but-not-submitted decision; don't replace an original locked response. */
    const message='Your decision is securely saved and awaiting submission confirmation.';
    showGate(message);
    const retry=document.createElement('button');retry.textContent='Retry secure submission';retry.className='primary';retry.type='button';retry.addEventListener('click',async()=>{retry.disabled=true;try{await finishSubmit();restoreConfirmed(serverRecord);location.reload()}catch(e){showGate('Submission not confirmed: '+e.message)}});gate?.append(retry);
    return false;
  }
  authorized=true;ready=true;document.documentElement.classList.add('rizsim-authorized');if(gate)gate.hidden=true;return true;
 }
 async function finishSubmit(){if(!serverRecord)throw Error('No saved judgment was found.');await checkAccess();const raw=await request(client.rpc('submit_my_rizsim_classroom_attempt',{p_attempt_id:attempt.id}));const receipt=Array.isArray(raw)?raw[0]:raw;if(!receipt||receipt.status!=='submitted'||String(receipt.attempt_id||receipt.id)!==attempt.id)throw Error('RizSim has not confirmed submission. Your prior saved decision remains locked.');attempt.status='submitted';return receipt}
 async function submit(record){
  if(!authorized||!ready||inFlight||attempt.status!=='in_progress')throw Error('Your RizSim classroom attempt is not open.');
  if(!assetReady())throw Error('Original hotel photographs must load before submitting.');
  if(!validRecord(record))throw Error('Invalid or incomplete hotel judgment.');
  if(serverRecord&&!decisionEqual(serverRecord,record))throw Error('The original decision is locked on the server; it cannot be replaced.');
  inFlight=true;
  try{
    await checkAccess();
    if(!serverRecord){
      const payload={format_version:2,value:record.group,question_text:record.condition_question,answer_text:record.binary_response+'; PKR '+record.willing_to_pay_pkr,instrument_id:'RizHotelJudgment.v1',schema_version:'hotel-judgment-v1',record:{...record,attempt_id:attempt.id,session_id:attempt.classroom_session_id},committed_count:1};
      const existing=await request(client.from('simulation_responses').select('id,response_data').eq('attempt_id',attempt.id).eq('question_key',RESPONSE_KEY).maybeSingle());
      if(existing){const r=existing.response_data?.record;if(!validRecord(r)||!decisionEqual(r,record))throw Error('This attempt already contains a different locked judgment.');serverRecord=r}
      else {await request(client.from('simulation_responses').insert({attempt_id:attempt.id,question_key:RESPONSE_KEY,response_data:payload}));serverRecord=payload.record}
      await request(client.from('simulation_attempts').update({progress_percent:100}).eq('id',attempt.id).eq('status','in_progress'));
    }
    await finishSubmit();return {saved:true,submitted:true};
  }finally{inFlight=false}
 }
 const live={enabled:false,state:{},runId:null,init:async()=>{
  try{const allowed=await verify();if(!allowed)return false;live.enabled=true;live.runId=attempt.id;live.state={activity:'RizHotelJudgment.v1',runId:attempt.id,started:attempt.status==='in_progress',closed:attempt.status==='submitted',paused:false,revealed:false,total:0};return true}
  catch(error){showGate(error.message||'Could not verify this classroom.');return false}},
  refresh:async()=>{if(!authorized)throw Error('Classroom authorization ended.');if(attempt.status==='in_progress'){await checkAccess();if(!assetReady())throw Error('The required source photographs are missing.')}return live.state},
  submit};
 window.RizHotelParticipantLive=live;
})();