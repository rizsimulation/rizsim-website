/* RizSim Activity 01 - authenticated attempt adapter.
   Only for the RizSim-hosted classroom page, never for local standalone files.
   Requires a real owner-published catalogue entry and an already-authorized attempt.
   The browser has only a public/publishable API key; database RLS and RPC enforce rights. */
(function (root) {
 'use strict';
 const D=root.InsightData,C=root.InsightCore;
 const SUPABASE_URL='https://rvmumpvtvjvvuyimeybc.supabase.co';
 const SUPABASE_PUBLIC_KEY='sb_publishable_wufSxfg90bb4R6XarScaJQ_Dl5wlmtf';
 const PRODUCT_SLUG='insight-to-implication-bystander';
 const RESPONSE_KEY='insight-bystander-v1-record';
 const expectedPath='/simulation-insight-to-implication.html';
 const url=new URL(root.location.href),qp=url.searchParams;
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const errText=e=>e?.message||String(e);
 const required=(value,name)=>{if(!uuid.test(value||''))throw new Error('A valid '+name+' from the RizSim classroom launch is required.');return value;};
 let client=null,user=null,attempt=null,latestRecord=null;
 async function query(p){const {data,error}=await p;if(error)throw new Error(error.message);return data;}
 async function checkAccess(){
   const data=await query(client.rpc('check_my_rizsim_classroom_attempt_access',{p_attempt_id:attempt.id}));
   const status=Array.isArray(data)?data[0]:data;
   if(!status||String(status.attempt_id)!==attempt.id||String(status.session_id)!==String(attempt.classroom_session_id)||status.allowed!==true||status.attempt_status!=='in_progress')
      throw new Error(status?.access_reason||'The classroom is closed or this attempt is not authorized.');
   return status;
 }
 async function init(){
   if(root.location.pathname!==expectedPath)throw new Error('Open the simulation through the official RizSim classroom launch.');
   if(SUPABASE_PUBLIC_KEY.includes('__RIZSIM_'))throw new Error('Simulation deployment configuration is incomplete.');
   const attemptId=required(qp.get('attempt'),'attempt ID');
   const sessionId=required(qp.get('session'),'classroom session ID');
   if(!['live','practice'].includes(qp.get('access')))throw new Error('Launch the simulation through a Faculty Live or Practice window.');
   const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.49.8');
   client=createClient(SUPABASE_URL,SUPABASE_PUBLIC_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
   const auth=await query(client.auth.getUser());user=auth.user;
   if(!user)throw new Error('Sign in to RizSim with your Student account, then reopen your classroom attempt.');
   attempt=await query(client.from('simulation_attempts').select('id,user_id,product_id,status,progress_percent,classroom_session_id,classroom_access_type,submitted_at').eq('id',attemptId).maybeSingle());
   if(!attempt||attempt.user_id!==user.id||attempt.classroom_session_id!==sessionId||attempt.classroom_access_type!==qp.get('access'))
     throw new Error('The requested classroom attempt does not belong to your authorized session.');
   const product=await query(client.from('products').select('id,slug,status,launch_path,product_type').eq('id',attempt.product_id).maybeSingle());
   if(!product||product.slug!==PRODUCT_SLUG||product.launch_path!==expectedPath||product.product_type!=='simulation'||product.status!=='published')
     throw new Error('The simulation is not published or its catalogue launch configuration is not valid.');
   const rows=await query(client.from('simulation_responses').select('id,response_data').eq('attempt_id',attempt.id).eq('question_key',RESPONSE_KEY).limit(1));
   const record=rows?.[0]?.response_data?.record;
   if(record!=null&&!C.validRecord(record))throw new Error('A saved response record is incompatible; please contact Faculty.');
   latestRecord=record?C.clone(record):null;
   if(attempt.status==='in_progress')await checkAccess();
   if(attempt.status==='submitted'&&(!latestRecord||!latestRecord.locks.kg))throw new Error('A submitted attempt is missing its completed response record. Ask Faculty for support.');
   if(!['in_progress','submitted'].includes(attempt.status))throw new Error('This classroom attempt is not available for use.');
   return {record:latestRecord,attemptId:attempt.id,status:attempt.status,displayName:user.user_metadata?.full_name||user.email||'',
       get submitted(){return attempt.status==='submitted'},
       async saveRecord(next){
         if(attempt.status!=='in_progress')throw new Error('Submitted responses are read only.');
         if(!C.validRecord(next))throw new Error('Invalid simulation record; nothing was uploaded.');
         if(latestRecord&&!C.compareLocked(latestRecord,next))throw new Error('An already-locked response cannot be changed.');
         await checkAccess();
         const payload={format_version:2,value:D.id,instrument_id:D.id,schemaVersion:1,record:C.clone(next),committed_count:C.committed(next)};
         let existing=await query(client.from('simulation_responses').select('id').eq('attempt_id',attempt.id).eq('question_key',RESPONSE_KEY).maybeSingle());
         if(existing){await query(client.from('simulation_responses').update({response_data:payload}).eq('id',existing.id));}
         else{await query(client.from('simulation_responses').insert({attempt_id:attempt.id,question_key:RESPONSE_KEY,response_data:payload}));}
         latestRecord=C.clone(next);
         const progress=Math.round(C.committed(next)/14*100);
         await query(client.from('simulation_attempts').update({progress_percent:progress}).eq('id',attempt.id).eq('status','in_progress'));
         return latestRecord;
       },
       async submit(){
         if(attempt.status==='submitted')return true;
         if(!latestRecord?.locks.kg||C.committed(latestRecord)!==14)throw new Error('Complete and lock all 14 decisions before submission.');
         await checkAccess();
         const resp=await query(client.rpc('submit_my_rizsim_classroom_attempt',{p_attempt_id:attempt.id}));
         const done=Array.isArray(resp)?resp[0]:resp;
         if(!done||done.status!=='submitted'||String(done.attempt_id||done.id)!==attempt.id)
           throw new Error('RizSim has not confirmed this submission. Your saved decisions are preserved.');
         attempt.status='submitted';attempt.submitted_at=done.submitted_at||new Date().toISOString();attempt.progress_percent=100;
         return true;
       }
   };
 }
 root.RizSimInsightCloud=Object.freeze({init});
})(window);