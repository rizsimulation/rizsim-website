/* ISOLATED TEST FIXTURE ONLY. Never import from a production page. */
const start=Date.now();const stamp=ms=>new Date(start+ms).toISOString();
const user={id:'student-1',email:'learner@example.test',user_metadata:{full_name:'Sample Learner'}};
const products=[{id:'sim-1',title:'Decision Lab',slug:'decision-lab',product_type:'simulation',status:'published',short_description:'Apply your judgement.',launch_path:'/simulation-test.html'},{id:'sim-2',title:'Attention Lab',slug:'attention-lab',product_type:'simulation',status:'published',short_description:'Explore attention.',launch_path:'/simulation-test.html'},{id:'unjoined',title:'Unjoined Catalogue Simulation',product_type:'simulation',status:'published'}];
function session(id,extra={}){return {session_id:id,product_id:'sim-1',simulation_title:'Decision Lab',class_name:'Practice seminar '+id,class_code:id==='session-open'?'TEST1234':id==='session-both'?'BOTH1234':id.toUpperCase().slice(-8).padStart(8,'A'),access_mode:'practice',faculty_name:'Sample Faculty',institution_name:'Example School',practice_starts_at:stamp(-3600000),practice_ends_at:stamp(7200000),license_expires_at:stamp(86400000),practice_open:true,live_open:false,access_status:'open',...extra};}
const sessions=[session('session-open'),session('session-upcoming',{product_id:'sim-2',simulation_title:'Attention Lab',practice_starts_at:stamp(3600000),practice_open:false,access_status:'scheduled'}),session('session-done'),session('session-expired',{practice_ends_at:stamp(-3600000),practice_open:false,access_status:'ended'}),session('session-both',{access_mode:'both',live_open:true,live_starts_at:stamp(-3600000),live_ends_at:stamp(3600000)})];
const attempts=sessions.map((s,i)=>({id:'attempt-'+i,user_id:user.id,product_id:s.product_id,classroom_session_id:s.session_id,classroom_access_type:i===4?'live':'practice',status:i===2?'submitted':'in_progress',progress_percent:i===2?100:i===0?35:0,started_at:stamp(-3600000*(i+1)),last_activity_at:stamp(-60000*(i+1)),created_at:stamp(-3600000*(i+1)),joined_at:stamp(-3600000*(i+1)),submitted_at:i===2?stamp(-120000):null}));
attempts.push({id:'foreign-attempt',user_id:'stranger',product_id:'sim-1',status:'submitted',progress_percent:100});
const material={material_id:'material-1',course_id:'session-open',course_title:'Practice seminar',title:'Class handout',description:'Published class reading',source_type:'file',file_name:'handout.pdf',mime_type:'application/pdf',material_type:'student_handout'};
const state=window.__studentFixture={user,products,sessions,attempts,materials:[material],calls:[],failWorkspace:false,failMaterials:false,failResolve:false,failPractice:false,delay:0,authCallbacks:[],serverOffset:0,signOut(){this.user=null;this.authCallbacks.forEach(f=>f('SIGNED_OUT',null));}};
const ok=data=>({data:structuredClone(data),error:null});const err=message=>({data:null,error:{message}});
function query(table){const filters=[];const q={select(){return q},eq(k,v){filters.push([k,v]);return q},order(){return q},in(){return q},limit(){return q},upsert(){return Promise.resolve(ok(null))},async maybeSingle(){return result(true)},then(a,b){return Promise.resolve(result(false)).then(a,b)}};
function result(single){state.calls.push({kind:'query',table,filters:structuredClone(filters)});let rows=table==='profiles'?[{id:state.user?.id,email:'learner@example.test',display_name:'Sample Learner',account_status:'active',created_at:stamp(-86400000)}]:table==='products'?products:table==='categories'?[{id:'cat-1',name:'Learning',active:true}]:table==='simulation_attempts'?attempts:[];rows=rows.filter(r=>filters.every(([k,v])=>r[k]===v));return ok(single?rows[0]||null:rows)}return q;}
async function rpc(name,args={}){state.calls.push({kind:'rpc',name,args});
 if(name==='get_my_rizsim_resource_catalogue')return ok([{product_id:'book-1',title:'Reading Companion',product_type:'ebook'}]);
 if(name==='get_my_rizsim_student_courses')return ok([]);
 if(name==='get_my_rizsim_student_course_materials')return state.failMaterials?err('Resource read failed'):ok(state.materials);
 if(name==='can_access_rizsim_product')return ok(false);
 if(name==='get_my_rizsim_student_workspace'){
  const capturedUser=state.user?.id;if(state.delay)await new Promise(r=>setTimeout(r,state.delay));if(state.failWorkspace)return err('Fixture network unavailable');
  return ok({server_time:new Date(Date.now()+state.serverOffset).toISOString(),attempts:attempts.filter(a=>a.user_id===capturedUser).map(a=>{
   const s=sessions.find(s=>s.session_id===a.classroom_session_id);let phase=a.status==='submitted'||a.submitted_at?'submitted':s?.access_status==='closed'?'closed':s?.practice_open?'open':s?.access_status==='scheduled'?'scheduled':'expired';
   return {...a,title:products.find(p=>p.id===a.product_id)?.title||'Learning record',class_name:s?.class_name,class_code:s?.class_code,has_practice:!!s,course_id:null,practice_starts_at:s?.practice_starts_at,practice_ends_at:s?.practice_ends_at,practice_access_ends_at:s?.practice_ends_at,practice_state:phase,can_practice:phase==='open'};
  })});
 }
 if(name==='resolve_rizsim_classroom_access'){
  if(state.failResolve)return err('Classroom session not found.');const s=sessions.find(s=>s.class_code===args.p_class_code||args.p_share_token==='share-open'&&s.session_id==='session-open');return s?ok([s]):err('Classroom session not found.');
 }
 if(name==='join_rizsim_classroom_session'){
  const s=sessions.find(s=>s.class_code===args.p_class_code||args.p_share_token==='share-open'&&s.session_id==='session-open');if(!s||s.access_status!=='open')return err('Class is not currently open');
  let a=attempts.find(a=>a.classroom_session_id===s.session_id&&a.user_id===state.user?.id);if(!a&&state.allowNewJoin&&state.user){a={id:s.session_id==='session-new'?'attempt-new':'attempt-'+s.session_id,user_id:state.user.id,product_id:s.product_id,classroom_session_id:s.session_id,classroom_access_type:args.p_requested_access_type,status:'in_progress',progress_percent:0,started_at:stamp(0),last_activity_at:stamp(0),created_at:stamp(0),joined_at:stamp(0),submitted_at:null};attempts.push(a);}if(!a)return err('Fixture join requires existing attempt');
  return ok([{attempt_id:a.id,session_id:s.session_id,product_id:a.product_id,classroom_access_type:a.classroom_access_type,attempt_status:a.status,submitted_at:a.submitted_at,is_existing_attempt:true}]);
 }
 if(name==='check_my_rizsim_classroom_attempt_access'){
  const a=attempts.find(a=>a.id===args.p_attempt_id&&a.user_id===state.user?.id);if(!a)return err('Unknown attempt');const s=sessions.find(s=>s.session_id===a.classroom_session_id);const result=ok([{allowed:s.access_status==='open',attempt_status:a.status,submitted_at:a.submitted_at}]);if(state.delayAccess)await new Promise(r=>setTimeout(r,state.delayAccess));return result;
 }
 if(name==='resume_my_rizsim_student_practice'){
  if(state.failPractice)return err('Practice was revoked by Faculty');const a=attempts.find(a=>a.id===args.p_attempt_id&&a.user_id===state.user?.id);if(!a||a.status==='submitted'||a.submitted_at)return err('Already submitted');const s=sessions.find(s=>s.session_id===a.classroom_session_id);if(!s||!s.practice_open||s.access_status!=='open')return err('Practice unavailable');a.classroom_access_type='practice';return ok({attempt_id:a.id,session_id:s.session_id,product_id:a.product_id,classroom_access_type:'practice'});
 }
 if(name==='get_rizsim_course_material_view_context'){const m=state.materials.find(m=>m.material_id===args.p_material_id);const result=ok(m?[m]:[]);if(state.delayMaterial)await new Promise(r=>setTimeout(r,state.delayMaterial));return result;}
 return ok([]);
}
const client={auth:{async getUser(){return ok({user:state.user})},async getSession(){return ok({session:state.user?{user:state.user}:null})},onAuthStateChange(f){state.authCallbacks.push(f);return{data:{subscription:{unsubscribe(){}}}}},async signOut(){state.signOut();return ok(null)},async signInWithOAuth(){return ok(null)}},from:query,rpc};
export function createClient(){return client;}
