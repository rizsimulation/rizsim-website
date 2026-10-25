/* SYNTHETIC browser adapter. CI-only; no application references or remote writes. */
const aid='11111111-1111-4111-8111-111111111111',sid='22222222-2222-4222-8222-222222222222';
const copy=x=>JSON.parse(JSON.stringify(x));
const ok=data=>({data:copy(data),error:null}),bad=message=>({data:null,error:{message}});
const seed={user:{id:'student-1',user_metadata:{full_name:'Synthetic Greenwashing Learner'}},attempt:{id:aid,user_id:'student-1',product_id:'sim-1',status:'in_progress',progress_percent:0,classroom_session_id:sid,classroom_access_type:'practice',submitted_at:null},product:{id:'sim-1',slug:'seven-sins-greenwashing',launch_path:'/simulation-greenwashing.html',product_type:'simulation',status:'published'},row:null,seq:0,submissions:0};
const old=JSON.parse(localStorage.getItem('gw-synthetic-server')||'null');
const state=window.__gw={...seed,...old,...(window.__gwInit||{}),calls:[]};
const persist=()=>localStorage.setItem('gw-synthetic-server',JSON.stringify({user:state.user,attempt:state.attempt,product:state.product,row:state.row,seq:state.seq,submissions:state.submissions}));
function query(table){let filters=[],kind='read',value=null,single=false;const chain={select(){return chain},eq(k,v){filters.push([k,v]);return chain},maybeSingle(){single=true;return chain},insert(v){kind='insert';value=v;return chain},update(v){kind='update';value=v;return chain},then(resolve,reject){return Promise.resolve().then(()=>{
 state.calls.push({table,kind,filters:copy(filters),value:copy(value)});
 if(state.failSave&&kind!=='read'){state.failSave=false;return bad('Synthetic save failure; your work is retained.');}
 if(state.expired&&kind!=='read')return bad('This Classroom has closed.');
 const match=x=>x&&filters.every(([k,v])=>x[k]===v);
 let rows=table==='simulation_attempts'?[state.attempt]:table==='products'?[state.product]:table==='simulation_responses'?(state.row?[state.row]:[]):[];
 rows=rows.filter(match);
 if(kind==='insert'&&table==='simulation_responses'){
  if(state.row)return bad('duplicate key violates unique attempt/question constraint');
  state.row={...copy(value),id:'response-1',updated_at:String(++state.seq)};rows=[state.row];persist();
 }else if(kind==='update'){
  if(state.stale){state.stale=false;return ok([]);}
  rows.forEach(r=>{Object.assign(r,copy(value));if(table==='simulation_responses')r.updated_at=String(++state.seq);});persist();
 }
 return ok(single?(rows[0]||null):rows);
 }).then(resolve,reject)}};return chain;}
async function rpc(name,args){state.calls.push({rpc:name,args});
 if(name==='check_my_rizsim_classroom_attempt_access')return ok([{attempt_id:aid,session_id:sid,allowed:!state.expired,access_reason:state.expired?'The Classroom is closed or access has expired.':'open',attempt_status:state.attempt.status}]);
 if(name==='submit_my_rizsim_classroom_attempt'){
  if(state.expired)return bad('The Classroom is closed.');
  if(state.failSubmit){state.failSubmit=false;return bad('Synthetic submission unavailable. Your answers are saved.');}
  if(state.attempt.status!=='submitted'){state.attempt.status='submitted';state.attempt.submitted_at=new Date().toISOString();state.submissions++;persist();}
  return ok([{attempt_id:aid,status:'submitted',submitted_at:state.attempt.submitted_at,progress_percent:100}]);
 }
 if(name==='get_rizsim_presenter_state')return ok({live_open:!state.expired,presenter_paused:!!state.paused});
 return ok([]);
}
const client={auth:{async getUser(){return ok({user:state.user});},async getSession(){return ok({session:state.user?{user:state.user}:null});},onAuthStateChange(){return{data:{subscription:{unsubscribe(){}}}};}},from:query,rpc};
export function createClient(){return client;}
