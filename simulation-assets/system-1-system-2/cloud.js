/* Activity 02 - PROPOSED authenticated RizSim classroom runner (draft, NOT deployed).
   Uses the existing RizSim attempts, response RLS and submission RPC. No demo PIN server.
   Requires Owner-published product with slug and launch_path below and signed-in real attempt. */
(function(){
 'use strict';
 const PRODUCT_SLUG='system-1-system-2-thinking';
 const EXPECTED_PATH='/simulation-system-1-system-2.html';
 const SUPABASE_URL='https://rvmumpvtvjvvuyimeybc.supabase.co';
 const SUPABASE_PUBLISHABLE_KEY='sb_publishable_wufSxfg90bb4R6XarScaJQ_Dl5wlmtf';
 const KEY='system-1-system-2-v1-record';
 const qp=new URLSearchParams(location.search),uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 let client=null,user=null,attempt=null,latest=null,verified=false,busy=false,submitPending=false;
 const errorText=e=>e?.message||String(e);
 const required=(v,label)=>{if(!uuid.test(v||''))throw new Error('Valid '+label+' from a RizSim class launch is required.');return v};
 async function call(p){const {data,error}=await p;if(error)throw Error(error.message);return data}
 function gate(text){const app=document.getElementById('app');if(!app)return;
  app.innerHTML='';let node=document.createElement('section');node.className='panel';
  const h=document.createElement('h2');h.textContent='RizSim · System 1 & System 2 Thinking';
  const msg=document.createElement('p');msg.textContent=text;const a=document.createElement('a');a.href='/access-in.html';a.textContent='Return to RizSim Student Access';a.className='btn secondary';node.append(h,msg,a);app.append(node);
 }
 async function checkAccess(){
  const raw=await call(client.rpc('check_my_rizsim_classroom_attempt_access',{p_attempt_id:attempt.id}));
  const c=Array.isArray(raw)?raw[0]:raw;
  if(!c||String(c.attempt_id)!==attempt.id||String(c.session_id)!==String(attempt.classroom_session_id)||c.allowed!==true||c.attempt_status!=='in_progress')
    throw Error(c?.access_reason||'This classroom activity is not open for your account.');
  return c;
 }
 async function loadServerRecord(){
  const rows=await call(client.from('simulation_responses').select('id,response_data').eq('attempt_id',attempt.id).eq('question_key',KEY).limit(1));
  const rec=rows?.[0]?.response_data?.record||null;
  if(rec){const checked=validateRecord(rec);if(String(checked.profile.session)!=='RIZSIM-'+attempt.classroom_session_id)throw Error('Saved session does not match this classroom.');return checked}
  return null;
 }

 async function loadPersonal(){
  if(!attempt||!record?.kg.at||attempt.status!=='submitted')
    throw Error('The attempt must be submitted before personal results are available.');
  const raw=await call(client.rpc('get_my_rizsim_s1s2_personal_result',{p_attempt_id:attempt.id}));
  const result=Array.isArray(raw)?raw[0]:raw;
  if(!result||result.receipt!=='submitted'||String(result.attempt_id)!==attempt.id
     ||result.simulation_id!==DATA.meta.id||result.schema_version!==DATA.meta.version
     ||!result.metrics)
    throw Error('RizSim returned an invalid personal-result receipt.');
  const proof={schema:'RizSimulation.RGA.v1',
    assessment:DATA.meta.id,recordId:record.id,fingerprint:fingerprint(record),
    issuedAt:new Date().toISOString(),metrics:result.metrics};
  personalRGA=validRGA(proof);
  persist();render();
  return personalRGA;
 }
 async function init(){
  if(location.pathname!==EXPECTED_PATH)throw Error('Open the simulation through its official RizSim classroom link.');
  if(SUPABASE_PUBLISHABLE_KEY.includes('__RIZSIM_'))throw Error('The application publisher has not completed this simulation configuration.');
  const attemptId=required(qp.get('attempt'),'attempt ID'),sessionId=required(qp.get('session'),'classroom session ID');
  const mode=qp.get('access');if(!['live','practice'].includes(mode))throw Error('Open a verified Live or Practice class link.');
  /* This URL imports the same public browser library family used by the existing RizSim site.
     Authentication data come from the current real signed-in session, never URL credentials. */
  const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/+esm');
  client=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const auth=await call(client.auth.getUser());user=auth.user;
  if(!user)throw Error('Sign in to your RizSim Student account and reopen the class link.');
  attempt=await call(client.from('simulation_attempts').select('id,user_id,product_id,status,progress_percent,classroom_session_id,classroom_access_type,submitted_at').eq('id',attemptId).maybeSingle());
  if(!attempt||attempt.user_id!==user.id||attempt.classroom_session_id!==sessionId||attempt.classroom_access_type!==mode)
    throw Error('This attempt was not assigned to your signed-in Student account and classroom.');
  const product=await call(client.from('products').select('id,slug,status,product_type,launch_path').eq('id',attempt.product_id).maybeSingle());
  if(!product||product.slug!==PRODUCT_SLUG||product.status!=='published'||product.product_type!=='simulation'||product.launch_path!==EXPECTED_PATH)
    throw Error('The Owner has not yet published the matching licensed simulation runner.');
  latest=await loadServerRecord();
  if(attempt.status==='in_progress')await checkAccess();
  else if(attempt.status!=='submitted'||!latest?.kg.at)throw Error('This attempt is not currently available for completion.');
  /* Server-committed data is authoritative after a page reload. Locally drafted, uncommitted
     choices may be discarded, but no locked response is changed by an unverified local copy. */
  personalRGA=null;
  if(latest)record=clone(latest);
  else if(record){try{const local=validateRecord(record);if(local.profile.session!=='RIZSIM-'+sessionId)record=null}
    catch(e){record=null}}
  // Use the Google/RizSim identity already verified above.
  // Hosted classrooms never ask for Name / Organization a second time.
  if(!record && attempt.status==='in_progress'){
    const name=String(user.user_metadata?.full_name||user.email?.split('@')[0]||'RizSim Learner').trim().slice(0,120);
    record=newRecord({name,organization:'RizSim classroom',group:'Not specified',session:'RIZSIM-'+sessionId});
    persist();
  }
  verified=true;
  if(attempt.status==='submitted'){
    try{await loadPersonal()}catch(e){banner('Submission verified, but personal scoring is unavailable: '+errorText(e),true);}
  }
  render();if(!record){const u=document.getElementById('pname');if(u&&!u.value)u.value=user.user_metadata?.full_name||''}
  if(attempt.status==='submitted')banner(personalRGA?'Submitted and scored by RizSim. This attempt is read only.':'Submission verified. Personal scoring is pending.',!personalRGA);
  else banner('Authenticated classroom attempt. Choices remain drafts until a stage is locked and securely saved.',false);
 }
 function banner(message,isError){let b=document.getElementById('rzSim02HostedStatus');if(!b){b=document.createElement('section');b.id='rzSim02HostedStatus';b.className='notice';document.getElementById('app')?.prepend(b)}
  b.className='notice'+(isError?' red':'');b.textContent=message;
  if(attempt?.status==='submitted'&&!personalRGA){
    const retry=document.createElement('button');retry.type='button';retry.className='btn secondary compact';
    retry.textContent='Refresh verified results';retry.onclick=async()=>{
      try{await loadPersonal();banner('Verified results ready. This attempt is read only.',false)}
      catch(err){banner('Personal results unavailable: '+errorText(err),true)}
    };b.append(retry);
  }
  if(submitPending){const button=document.createElement('button');button.type='button';button.className='btn compact';button.textContent='Retry secure submission';button.style.marginLeft='10px';button.onclick=async()=>{try{await finishSubmit();banner('Submission confirmed by RizSim.',false)}catch(e){banner(errorText(e),true)}};b.append(button)}
 }
 async function saveStage(){
  if(!verified||!record||attempt.status!=='in_progress')throw Error('This attempt is not open for saving.');
  const safe=validateRecord(exportRecord(record));if(latest)assertExtension(latest,safe);
  await checkAccess();
  const body={format_version:2,value:DATA.meta.id,instrument_id:DATA.meta.id,schema_version:DATA.meta.version,record:safe,committed_count:lockedCount(safe)};
  const row=await call(client.from('simulation_responses').select('id').eq('attempt_id',attempt.id).eq('question_key',KEY).maybeSingle());
  if(row)await call(client.from('simulation_responses').update({response_data:body}).eq('id',row.id));
  else await call(client.from('simulation_responses').insert({attempt_id:attempt.id,question_key:KEY,response_data:body}));
  latest=clone(safe);
  const pct=Math.round(lockedCount(safe)/16*100);
  await call(client.from('simulation_attempts').update({progress_percent:pct}).eq('id',attempt.id).eq('status','in_progress'));
  attempt.progress_percent=pct;return safe;
 }
 async function finishSubmit(){
  if(!latest?.kg.at||lockedCount(latest)!==16)throw Error('All 16 decisions must be committed before final submission.');
  await checkAccess();
  const res=await call(client.rpc('submit_my_rizsim_classroom_attempt',{p_attempt_id:attempt.id}));
  const outcome=Array.isArray(res)?res[0]:res;
  if(!outcome||outcome.status!=='submitted'||String(outcome.attempt_id||outcome.id)!==attempt.id)
    throw Error('Submission has not been confirmed. Saved answers remain in your attempt.');
  attempt.status='submitted';attempt.submitted_at=outcome.submitted_at;submitPending=false;
  try{await loadPersonal();}
  catch(err){banner('Final submission is confirmed. Personal scoring is temporarily unavailable: '+errorText(err),true);}
 }
 function saving(on){busy=on;let b=document.getElementById('rzSim02PendingOverlay');if(!b){b=document.createElement('div');b.id='rzSim02PendingOverlay';b.style.cssText='position:fixed;inset:0;background:#12263b99;display:grid;place-items:center;z-index:199;color:#fff;font-size:22px;font-weight:700;';b.textContent='Securing your locked decision…';document.body.appendChild(b)}b.style.display=on?'grid':'none';b.hidden=!on}
 function commitWrapped(oldFn,valid,reason){return function(...args){if(!verified||busy||attempt?.status!=='in_progress')return;
   const before=record?clone(record):null;oldFn(...args);
   if(!valid(before,record,...args))return;
   saving(true);
   Promise.resolve().then(saveStage).then(async()=>{
     window.RizSimSim02StudentBridge?.emit(reason);
     if(record?.kg.at){submitPending=true;await finishSubmit();}
     banner(attempt.status==='submitted'?(personalRGA?'Submission confirmed and personal results verified.':'Submission confirmed. Personal scoring is pending; use Refresh verified results.'):'Locked decision securely saved.',false);
   }).catch(e=>{
     /* Preserve already-saved server state on partial failure; never mark submission successful without the RPC receipt. */
     if(submitPending){banner('Your locked responses were saved, but final submission needs verification: '+errorText(e),true)}
     else{record=before;persist();render();banner('Could not secure that lock: '+errorText(e)+' Your earlier confirmed work is preserved.',true)}
   }).finally(()=>{saving(false);if(verified&&record?.kg.at&&attempt.status==='submitted')banner('Submitted successfully. Your session is read only.',false)});
 }}
 const initialKR=lockReview;lockReview=commitWrapped(initialKR,(a,b,stage)=>!a?.[stage]?.at&&!!b?.[stage]?.at,'review-stage-locked');
 const initialLT=lockLT;lockLT=commitWrapped(initialLT,(a,b,i,k)=>!a?.lt?.[i]?.[k]?.at&&!!b?.lt?.[i]?.[k]?.at,'transfer-decision-locked');
 const initialFeedback=markFeedback;markFeedback=commitWrapped(initialFeedback,(a,b,i,k)=>!a?.lt?.[i]?.[k]?.seen&&!!b?.lt?.[i]?.[k]?.seen,'transfer-feedback-read');
 const previousStart=start;
 start=function(event){if(!verified||busy||attempt.status!=='in_progress')return;previousStart(event);if(record){record.profile.session='RIZSIM-'+attempt.classroom_session_id;persist();render()}};
 const previousRender=render;
 render=function(scroll=false){if(!verified){gate('Your class access is being verified.');return}previousRender(scroll);
   if(attempt.status==='submitted')document.querySelectorAll('#app input[name=decision],#app button[onclick^=\"lock\"]').forEach(n=>n.disabled=true);
   if(submitPending)banner('Your answers are locked. RizSim final submission is awaiting confirmation.',true);
 };
 resumeFile=async function(){toast('RizSim classroom responses resume from the verified saved attempt.');};
 importRGA=async function(){toast('Hosted personal results come only from RizSim after server-confirmed submission.');};
 resetParticipant=function(){toast('A RizSim classroom attempt cannot be erased from this device. Contact Faculty for assistance.');};
 init().catch(e=>{verified=false;gate(errorText(e))});
})();