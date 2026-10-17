/* RizSim Simulation 03 — authenticated, server-randomized Hotel Judgment Lab.
   DRAFT ONLY. Group A/B allocation, response locking, completion and debrief
   visibility are determined by restricted Postgres RPCs, NOT by this browser.
   Four original hotel PNGs are mandatory and unchanged. */
(function(){'use strict';
 const URL='https://rvmumpvtvjvvuyimeybc.supabase.co';
 const KEY='sb_publishable_wufSxfg90bb4R6XarScaJQ_Dl5wlmtf';
 const SLUG='hotel-judgment-lab',PATH='/simulation-hotel-judgment.html';
 const qp=new URLSearchParams(location.search);
 const uuid=x=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x||'');
 const gate=document.getElementById('rizHotelAuthGate');
 let client=null,attempt=null,user=null,authorized=false,busy=false;
 let assignedGroup='',assignedQuestion='',savedRecord=null;
 const text=x=>x?.message||String(x);
 const get=async p=>{const {data,error}=await p;if(error)throw Error(error.message||'RizSim classroom request failed.');return data;};
 const unwrap=x=>Array.isArray(x)?x[0]:x;
 function status(message,isError=false){
   if(gate){gate.hidden=false;gate.replaceChildren();
     const title=document.createElement('h2');title.textContent='Hotel Judgment Lab';
     const line=document.createElement('p');line.textContent=message;
     const link=document.createElement('a');link.href='/access-in.html';
     link.textContent='Return to RizSim Student workspace';link.className='secondary';
     gate.append(title,line,link);
   }
   document.documentElement.classList.remove('rizsim-authorized');
 }
 function genuinePhotoReady(){
   const all=[...document.querySelectorAll('img[data-hotel-view]')];
   return all.length===4&&window.RizHotelStimuli?.ready===true&&
     all.every((img,i)=>img.dataset.hotelView===String(i+1)&&img.complete&&img.naturalWidth>0&&
       img.getAttribute('src')==='/simulation-assets/hotel-judgment/hotel_view_'+(i+1)+'.png');
 }
 async function photos(){
   const all=[...document.querySelectorAll('img[data-hotel-view]')];
   if(all.length!==4)throw Error('All four original Istanbul hotel photographs are required.');
   await Promise.all(all.map(img=>new Promise(resolve=>{
     if(img.complete)return resolve();
     const finish=()=>resolve();
     img.addEventListener('load',finish,{once:true});
     img.addEventListener('error',finish,{once:true});
     setTimeout(finish,15000);
   })));
   // The image load event and the source-integrity banner may settle on
   // adjacent browser tasks. Wait briefly for the independent integrity check;
   // never substitute placeholder imagery or grant access if it stays invalid.
   for(let n=0;n<60&&!genuinePhotoReady();n++){
     await new Promise(resolve=>setTimeout(resolve,50));
   }
   if(!genuinePhotoReady())throw Error('An original hotel image is missing or out of order. Contact Faculty before starting.');
 }
 async function access(){
   const answer=unwrap(await get(client.rpc('check_my_rizsim_classroom_attempt_access',{p_attempt_id:attempt.id})));
   if(!answer||answer.allowed!==true||
     String(answer.attempt_id)!==attempt.id||
     String(answer.session_id)!==String(attempt.classroom_session_id)||
     answer.attempt_status!=='in_progress')
     throw Error('This signed-in classroom or licence is not open for responses.');
   return answer;
 }
 function validReceived(r){
   return r&&r.version==='hotel-judgment-v1'&&
     r.attempt_id===attempt?.id&&r.session_id===attempt?.classroom_session_id&&
     r.group===assignedGroup&&r.condition_question===assignedQuestion&&
     ['Yes','No'].includes(r.binary_response)&&
     typeof r.willing_to_pay_pkr==='number'&&
     r.willing_to_pay_pkr>=0&&r.willing_to_pay_pkr<=1000000000000&&
     Math.floor(r.willing_to_pay_pkr)===r.willing_to_pay_pkr&&
     typeof r.response_id==='string'&&r.response_id.startsWith('HJ-')&&r.demo_only===false;
 }
 async function initialize(){
   if(location.pathname!==PATH)throw Error('Open this simulation through the official RizSim classroom link.');
   const attemptId=qp.get('attempt'),sessionId=qp.get('session'),mode=qp.get('access');
   if(!uuid(attemptId)||!uuid(sessionId)||!['live','practice'].includes(mode))
     throw Error('A valid authenticated classroom launch is required.');
   if(KEY.includes('__RIZSIM_'))throw Error('RizSim has not configured this published simulation.');
   const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.8/+esm');
   client=createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
   const auth=await get(client.auth.getUser());user=auth.user;
   if(!user)throw Error('Sign in as the enrolled Student and reopen this classroom.');
   attempt=await get(client.from('simulation_attempts')
     .select('id,user_id,product_id,status,submitted_at,classroom_session_id,classroom_access_type')
     .eq('id',attemptId).maybeSingle());
   if(!attempt||attempt.user_id!==user.id||
      attempt.classroom_session_id!==sessionId||
      attempt.classroom_access_type!==mode)
     throw Error('This attempt was not assigned to your Student account and classroom.');
   const product=await get(client.from('products')
     .select('id,slug,status,product_type,launch_path')
     .eq('id',attempt.product_id).maybeSingle());
   if(!product||product.slug!==SLUG||product.status!=='published'||
      product.product_type!=='simulation'||product.launch_path!==PATH)
     throw Error('The Owner has not published the matching authorized simulation.');
   await photos();
   if(attempt.status==='in_progress')await access();
   else if(attempt.status!=='submitted')throw Error('This attempt is not active.');
   const assigned=unwrap(await get(client.rpc('get_my_rizsim_hotel_assignment',{p_attempt_id:attempt.id})));
   if(!assigned||String(assigned.attempt_id)!==attempt.id||
      String(assigned.session_id)!==sessionId||
      !['A','B'].includes(assigned.group)||
      typeof assigned.condition_question!=='string'||
      assigned.condition_question.length<15)
     throw Error('The signed-in experimental assignment could not be verified.');
   assignedGroup=assigned.group;assignedQuestion=assigned.condition_question;
   if(attempt.status==='submitted'){
     const receipt=unwrap(await get(client.rpc('get_my_rizsim_hotel_personal_result',{p_attempt_id:attempt.id})));
     if(receipt?.status!=='submitted'||String(receipt.attempt_id)!==attempt.id||
        !validReceived(receipt.record))
       throw Error('Your submitted hotel response was not verified.');
     savedRecord=receipt.record;
   }
   authorized=true;
   document.documentElement.classList.add('rizsim-authorized');
   if(gate)gate.hidden=true;
   return true;
 }
 async function commit(draft){
   if(!authorized||busy||attempt?.status!=='in_progress')
     throw Error('Your classroom response is already closed or not authorized.');
   if(!genuinePhotoReady())throw Error('Original hotel photographs must be available before submission.');
   if(draft?.group!==assignedGroup||draft.condition_question!==assignedQuestion)
     throw Error('The randomized experimental condition cannot be changed.');
   if(!['Yes','No'].includes(draft.binary_response)||
      !Number.isSafeInteger(draft.willing_to_pay_pkr)||
      draft.willing_to_pay_pkr<0||draft.willing_to_pay_pkr>1000000000000)
     throw Error('Please enter Yes or No and a valid whole-number PKR amount.');
   busy=true;
   try{
     await access();
     const value=unwrap(await get(client.rpc('submit_my_rizsim_hotel_judgment',{
       p_attempt_id:attempt.id,p_binary_response:draft.binary_response,
       p_willingness_to_pay_pkr:draft.willing_to_pay_pkr,
       p_participant_code:String(draft.participant_code||'').slice(0,40)
     })));
     if(value?.status!=='submitted'||String(value.attempt_id)!==attempt.id||
        !validReceived(value.record))
       throw Error('RizSim has not confirmed your locked judgment.');
     attempt.status='submitted';savedRecord=value.record;
     return {saved:true,submitted:true,record:savedRecord};
   }finally{busy=false}
 }
 const live={
   enabled:false,runId:null,assignedGroup:'',assignedQuestion:'',savedRecord:null,
   state:{activity:'RizHotelJudgment.v1',started:false,paused:false,closed:true,
     revealed:false,total:0},
   init:async()=>{
     try{
       const ok=await initialize();if(!ok)return false;
       live.enabled=true;live.runId=attempt.id;
       live.assignedGroup=assignedGroup;live.assignedQuestion=assignedQuestion;
       live.savedRecord=savedRecord;
       live.state={activity:'RizHotelJudgment.v1',runId:attempt.id,
         started:attempt.status==='in_progress',paused:false,
         closed:attempt.status==='submitted',revealed:false,total:0};
       return true;
     }catch(e){status(text(e));return false;}
   },
   refresh:async()=>{
     if(!authorized)throw Error('The signed-in Student session is not authorized.');
     if(attempt.status==='in_progress'){await access();if(!genuinePhotoReady())throw Error('An original photo has become unavailable.');}
     return live.state;
   },
   submit:async draft=>{
     const result=await commit(draft);
     live.savedRecord=savedRecord;live.state.started=false;live.state.closed=true;
     return result;
   }
 };
 window.RizHotelParticipantLive=live;
})();
