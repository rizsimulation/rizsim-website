/* Authenticated native adapter. Reuses existing attempt/response RLS and submit RPC.
   No migration, new RPC, licence grant, or permission change. */
(function(root){'use strict';
const D=root.GreenwashingData,C=root.GreenwashingCore,KEY='greenwashing-v1-record';
const URL='https://rvmumpvtvjvvuyimeybc.supabase.co',PUBLIC_KEY='sb_publishable_wufSxfg90bb4R6XarScaJQ_Dl5wlmtf';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const q=async p=>{const r=await p;if(r.error)throw Error(r.error.message);return r.data;};
const one=x=>Array.isArray(x)?x[0]:x;
async function init(){
 const params=new URLSearchParams(location.search),aid=params.get('attempt'),sid=params.get('session'),access=params.get('access');
 if(location.pathname!==D.path||!uuid.test(aid||'')||!uuid.test(sid||'')||!['live','practice'].includes(access))throw Error('Open Greenwashing from your authorized RizSim Classroom.');
 const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.49.8');
 const client=createClient(URL,PUBLIC_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 const auth=await q(client.auth.getUser()),user=auth?.user;
 if(!user)throw Error('Sign in to RizSim with your Student account, then reopen the Classroom.');
 let attempt=await q(client.from('simulation_attempts').select('id,user_id,product_id,status,progress_percent,classroom_session_id,classroom_access_type,submitted_at').eq('id',aid).maybeSingle());
 if(!attempt||attempt.user_id!==user.id||attempt.classroom_session_id!==sid||attempt.classroom_access_type!==access||!['in_progress','submitted'].includes(attempt.status))throw Error('This attempt is not available to your signed-in account and session.');
 const product=await q(client.from('products').select('id,slug,status,launch_path,product_type').eq('id',attempt.product_id).maybeSingle());
 if(!product||product.slug!==D.slug||product.launch_path!==D.path||product.product_type!=='simulation'||product.status!=='published')throw Error('Greenwashing is not published for this Classroom.');
 let row=await q(client.from('simulation_responses').select('id,response_data,updated_at').eq('attempt_id',aid).eq('question_key',KEY).maybeSingle());
 let saved=row?.response_data?.record||null;
 if(saved&&(!C.valid(saved)||saved.context.attemptId!==aid||saved.context.sessionId!==sid))throw Error('The saved response is incompatible. Contact Faculty; it has not been overwritten.');
 if(attempt.status==='submitted'&&saved?.stage!=='results')throw Error('The submitted response is incomplete. Contact Faculty; existing records have not been changed.');
 async function allowed(){
  const current=await q(client.auth.getUser());if(current?.user?.id!==user.id)throw Error('Your signed-in account changed. Return to your Classroom.');
  const value=one(await q(client.rpc('check_my_rizsim_classroom_attempt_access',{p_attempt_id:aid})));
  if(!value||String(value.attempt_id)!==aid||String(value.session_id)!==sid||value.allowed!==true||value.attempt_status!=='in_progress')throw Error(value?.access_reason||'This Classroom is closed or your access has ended.');
 }
 if(attempt.status==='in_progress')await allowed();
 let handoff=null;try{handoff=JSON.parse(sessionStorage.getItem('rizsim:v154:participant')||'null');}catch(_){}
 if(!handoff||handoff.user!==user.id||handoff.attempt!==aid||handoff.session!==sid||handoff.at<Date.now()-600000)handoff=null;
 let classSection='';try{const s=root.opener?.RizSimStudentBridge?.snapshot?.();if(s?.userId===user.id&&s.resolved?.session_id===sid)classSection=s.resolved.class_name||'';}catch(_){}
 const identity={name:String(handoff?.name||user.user_metadata?.full_name||'RizSim Learner').slice(0,120),studentId:String(handoff?.erp||'').slice(0,40),organization:String(handoff?.institution||'').slice(0,160),classSection:String(classSection).slice(0,160)};
 return {record:saved?C.clone(saved):null,identity,attemptId:aid,sessionId:sid,userId:user.id,access,get submitted(){return attempt.status==='submitted';},get submittedAt(){return attempt.submitted_at;},
  async save(next){
   if(attempt.status!=='in_progress')throw Error('Submitted responses are read-only.');
   if(!C.valid(next)||next.context.attemptId!==aid||next.context.sessionId!==sid)throw Error('Invalid attempt record; nothing was uploaded.');
   const identical=saved&&JSON.stringify(saved)===JSON.stringify(next);
   if(saved&&!identical&&!C.compatible(saved,next))throw Error('An earlier locked response cannot be replaced. Reload this attempt before continuing.');
   await allowed();
   if(!identical){
    const response_data={format_version:2,value:D.id,instrument_id:D.id,schemaVersion:1,record:C.clone(next),committed_count:C.progress(next).count};
    let result;
    if(row){result=await q(client.from('simulation_responses').update({response_data}).eq('id',row.id).eq('updated_at',row.updated_at).select('id,response_data,updated_at'));if(!result?.length)throw Error('This attempt changed in another tab. Reload before continuing; no newer answers were overwritten.');row=result[0];}
    else {result=await q(client.from('simulation_responses').insert({attempt_id:aid,question_key:KEY,response_data}).select('id,response_data,updated_at'));if(!result?.length)throw Error('RizSim did not confirm saving your response.');row=result[0];}
    saved=C.clone(next);
   }
   const changed=await q(client.from('simulation_attempts').update({progress_percent:C.progress(next).percent}).eq('id',aid).eq('status','in_progress').select('id'));
   if(!changed?.length)throw Error('RizSim has not confirmed your progress. Your saved answers are preserved; retry saving.');
   return C.clone(saved);
  },
  async submit(){
   if(attempt.status==='submitted')return {submittedAt:attempt.submitted_at};
   if(!saved||saved.stage!=='results'||C.progress(saved).count!==24)throw Error('Complete the audit and all 14 lab challenges before submission.');
   await allowed();
   const result=one(await q(client.rpc('submit_my_rizsim_classroom_attempt',{p_attempt_id:aid})));
   if(result?.attempt_id!==aid||result.status!=='submitted')throw Error('RizSim has not confirmed submission. Your saved work is preserved.');
   attempt={...attempt,status:'submitted',submitted_at:result.submitted_at};return {submittedAt:result.submitted_at};
  }
 };
}
root.RizSimGreenwashingCloud=Object.freeze({init,responseKey:KEY});
})(window);
