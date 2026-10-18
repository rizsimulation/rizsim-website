/* Synthetic backend used ONLY by Playwright route interception. Never loaded by a production page. */
const role=window.__testRole||'faculty';
const now=new Date(),start=new Date(now-60000).toISOString(),end=new Date(+now+3600000).toISOString();
const user={id:'user-fixture',email:'fixture@example.test',user_metadata:{full_name:'QA Faculty'}};
const products=[{id:'sim-1',title:'Decision Lab',short_description:'Practice sound judgment.',product_type:'simulation',status:'published',category_id:'cat-1',created_at:start},{id:'sim-2',title:'Attention Lab',short_description:'Explore attention and perception.',product_type:'simulation',status:'published',category_id:'cat-1',created_at:start},{id:'sim-revoked',title:'Unlicensed Lab',product_type:'simulation',status:'published'}];
const courses=[{course_id:'course-1',title:'My Marketing Course',description:'My own structured course.',active:true,simulation_count:1},{course_id:'course-2',title:'My Leadership Course',description:'Another created course.',active:true,simulation_count:1},{course_id:'course-ended',title:'Ended Course',active:false,simulation_count:1}];
const session=(id,product,course,name)=>({session_id:id,product_id:product,course_id:course,class_name:name,simulation_title:products.find(x=>x.id===product).title,class_code:'QA'+id.replace(/\W/g,''),share_token:'qa-token-'+id,access_mode:'live',active:true,session_status:'active',created_at:start,live_starts_at:start,live_ends_at:end,license_expires_at:'2099-01-01T00:00:00Z'});
const state={sessions:[session('existing-1','sim-1',null,'Existing Seminar'),session('existing-course','sim-2','course-1','Existing Course Class')],materials:[],calls:[],courseDelay:0,failCreate:false,failCourse:false};
state.sessionResources=[];
state.failPublication=false;
state.purchased=window.__testPurchase===true;
if(window.__testV6Resources)state.materials=[{id:'saved-1',course_id:'course-1',title:'Case reading',description:'A reusable saved reading',source_type:'link',external_url:'https://example.org/reading',material_type:'reading',active:true,published_to_class:false},{id:'saved-2',course_id:'course-1',title:'Class slides',description:'Already published',source_type:'file',file_name:'slides.pdf',mime_type:'application/pdf',material_type:'slides',active:true,published_to_class:true}];
window.__fixture=state;
const submissions=[{attempt_id:'attempt-1',student_user_id:'student-1',student_name:'QA Student',simulation_title:'Decision Lab',simulation_id:'sim-1',submitted_at:start,created_at:start,progress_percent:100,status:'submitted',classroom_session_id:'existing-1',class_name:'Existing Seminar'},{attempt_id:'attempt-2',student_user_id:'student-2',student_name:'Course Student',simulation_title:'Attention Lab',simulation_id:'sim-2',submitted_at:start,created_at:start,progress_percent:100,status:'submitted',classroom_session_id:'existing-course',class_name:'Existing Course Class'}];
const clone=x=>JSON.parse(JSON.stringify(x));const ok=data=>({data:clone(data),error:null});
const licenses=products.map(p=>({product_id:p.id,license_status:p.id==='sim-revoked'?'unlicensed':'licensed',license_term:'year',access_source:'direct',expires_at:'2099-01-01T00:00:00Z',starts_at:'2020-01-01T00:00:00Z'}));
function query(table){let filters=[],single=false,write=null;const chain={select(){return chain},order(){return chain},eq(k,v){filters.push([k,v]);return chain},in(){return chain},limit(){return chain},maybeSingle(){single=true;return chain},single(){single=true;return chain},upsert(v){write=v;return chain},insert(v){write=v;return chain},update(v){write=v;return chain},then(resolve,reject){return Promise.resolve().then(()=>{state.calls.push({kind:'table',table,write});if(write&&table==='rizsim_course_materials'){state.materials.push({id:'material-'+state.materials.length,...write,active:true,created_at:start});return ok(null)}
const rows={profiles:[{id:user.id,display_name:'QA Faculty',email:user.email,account_status:'active',created_at:start}],access_out_members:(window.__testNoMembership&&!state.roleCreated)?[]:[{user_id:user.id,role,active:true,created_at:start}],categories:[{id:'cat-1',name:'Learning',slug:'learning',active:true}],products,simulation_license_options:[],rizsim_course_materials:state.materials,rizsim_session_resources:state.sessionResources,simulation_responses:[{question_key:'q1',response_data:{question:'What did you decide?',answer:'Evidence-based decision'},created_at:start}]}[table]||[];
const data=rows.filter(x=>filters.every(([k,v])=>x[k]===undefined||x[k]===v));return ok(single?(data[0]||null):data);}).then(resolve,reject)}};return chain;}
// V7 isolated authoring fixtures. Never included in application assets.
state.authorCourses=courses;state.authorSims={};state.authorRev={};state.authorReceipts={};state.authorSaveFail=false;
for(const c of courses){state.authorRev[c.course_id]=1;state.authorSims[c.course_id]=[{product_id:c.course_id==='course-1'?'sim-2':'sim-1',title:c.course_id==='course-1'?'Attention Lab':'Decision Lab',description:'Included activity'}];}
function authorData(id){const c=courses.find(c=>c.course_id===id&&!c.deleted);if(!c)return null;return {...c,revision:'rev-'+state.authorRev[id],can_edit:c.active,description:c.description||'',simulations:clone(state.authorSims[id]||[]),resources:clone(state.materials.filter(m=>m.course_id===id&&m.active!==false))};}
async function authorRPC(name,args){
 if(role!=='course_lead')return {data:null,error:{message:'Active Course Lead access is required.'}};
 if(name==='get_my_rizsim_course_authoring'){
  if(state.authorLoadFail)return {data:null,error:{message:'Fixture: authoring read failed'}};
  if(state.authorDelay)await new Promise(r=>setTimeout(r,state.authorDelay));
  if(!args.p_course_id)return ok(courses.filter(c=>!c.deleted));
  const data=authorData(args.p_course_id);return data?ok(data):{data:null,error:{message:'Course not found in your created courses.'}};
 }
 if(name==='prepare_rizsim_course_authoring')return ok({course_id:args.p_course_id});
 if(name==='save_my_rizsim_course_authoring'){
  if(state.authorSaveFail)return {data:null,error:{message:'Fixture: save rejected, draft preserved'}};
  if(state.authorReceipts[args.p_request_id])return ok(state.authorReceipts[args.p_request_id]);
  const old=authorData(args.p_course_id),p=args.p_data;
  if(old&&args.p_expected_revision!==old.revision)return {data:null,error:{message:'This course changed in another workspace. Reload before saving.'}};
  if(p.simulations.includes('sim-revoked'))return {data:null,error:{message:'Active simulation licence required'}};
  let c=courses.find(c=>c.course_id===args.p_course_id);
  if(!c){c={course_id:args.p_course_id,title:p.title,description:p.description,active:true};courses.push(c);state.authorRev[c.course_id]=0;}
  c.title=p.title;c.description=p.description;state.authorRev[c.course_id]++;
  state.authorSims[c.course_id]=p.simulations.map(id=>({product_id:id,title:products.find(x=>x.id===id).title,description:'Included activity'}));
  state.materials.filter(r=>r.course_id===c.course_id&&!p.keep_resources.includes(r.id)).forEach(r=>{r.active=false;r.published_to_class=false;});
  p.new_resources.forEach(r=>state.materials.push({...r,course_id:c.course_id,published_to_class:false,active:true}));
  const result=authorData(c.course_id);state.authorReceipts[args.p_request_id]=clone(result);
  if(state.authorLostResponse){state.authorLostResponse=false;return {data:null,error:{message:'Fixture: response lost after commit'}};}
  return ok(result);
 }
 if(name==='delete_my_rizsim_course_authoring'){
  const c=courses.find(c=>c.course_id===args.p_course_id);
  if(state.sessions.some(s=>s.course_id===args.p_course_id&&s.active))return {data:null,error:{message:'This course has open sessions. End them in Live Classroom before deleting.'}};
  c.deleted=true;c.active=false;return ok({course_id:c.course_id,deleted:true});
 }
 return {data:null,error:{message:'Unknown authoring operation'}};
}

async function rpc(name,args={}){state.calls.push({kind:'rpc',name,args}); if(name==='ensure_standard_faculty_access'){state.roleCreated=true;return ok([{user_id:user.id,role:'faculty',active:true,created_now:true}]);}
if(['get_my_rizsim_course_authoring','prepare_rizsim_course_authoring','save_my_rizsim_course_authoring','delete_my_rizsim_course_authoring'].includes(name))return authorRPC(name,args);
if(name==='get_rizsim_session_runtime_scope'){const x=state.sessions.find(x=>x.session_id===args.p_session_id);return x?ok({mode:x.course_id==='purchased-1'?'purchased':x.course_id&&role==='course_lead'?'own':'simulation',selection:x.course_id||x.product_id}):{data:null,error:{message:'Session not available'}};}
if(name==='get_my_rizsim_purchased_courses')return ok(state.purchased?[{course_id:'purchased-1',title:'Publisher Strategy Course',description:'Complete publisher course',active:true}]:[]);
if(name==='get_rizsim_course_runtime'){
 const purchased=args.p_kind==='purchased';
 if((purchased&&!state.purchased)||(!purchased&&role!=='course_lead'))return {data:null,error:{message:'Course access denied'}};
 const c=purchased?{course_id:'purchased-1',title:'Publisher Strategy Course',description:'Complete publisher course',active:true}:courses.find(c=>c.course_id===args.p_course_id&&c.active);
 if(!c)return {data:null,error:{message:'No authorized course'}};
 return ok({course_id:c.course_id,title:c.title,kind:args.p_kind,can_add:!purchased,
 simulations:[{product_id:'sim-2',title:'Attention Lab',description:'Explore attention.'},{product_id:'sim-1',title:'Decision Lab',description:'Explore decisions.'}],
 resources:purchased?[{id:'publisher-resource',title:'Publisher Guide',description:'Read-only publisher material',source_type:'link',external_url:'https://example.org/guide',material_type:'reading',published_to_class:!!state.purchasedPublished}]:state.materials.filter(m=>m.course_id===args.p_course_id),
 sessions:state.sessions.filter(x=>x.course_id===args.p_course_id)});
}
if(name==='get_rizsim_session_resources'){
 const session=state.sessions.find(x=>x.session_id===args.p_session_id&&!x.course_id);
 if(!session||!['faculty','course_lead'].includes(role))return {data:null,error:{message:'Not an authorized standalone session'}};
 return ok({can_add:session.active,resources:state.sessionResources.filter(x=>x.session_id===args.p_session_id)});
}
if(name==='set_rizsim_resource_publication'){
 if(state.failPublication)return {data:null,error:{message:'Fixture publication rejected'}};
 if(args.p_kind==='own'&&role!=='course_lead')return {data:null,error:{message:'Course Lead required'}};
 if(args.p_kind==='purchased'){
 if(!state.purchased||args.p_resource_id!=='publisher-resource')return {data:null,error:{message:'Licence required'}};
 state.purchasedPublished=args.p_published;
 }else{const arr=args.p_kind==='own'?state.materials:state.sessionResources;const r=arr.find(x=>x.id===args.p_resource_id);if(!r)return {data:null,error:{message:'Missing resource'}};r.published_to_class=args.p_published;}
 return ok({id:args.p_resource_id,published_to_class:args.p_published});
}
if(name==='create_rizsim_runtime_resource'){
 if(state.failPublication)return {data:null,error:{message:'Fixture publication rejected'}};
 if(args.p_kind==='purchased'||(args.p_kind==='own'&&role!=='course_lead'))return {data:null,error:{message:'Not allowed'}};
 const arr=args.p_kind==='own'?state.materials:state.sessionResources;
 if(!arr.some(x=>x.id===args.p_resource_id))arr.push({id:args.p_resource_id,...args.p_data,course_id:args.p_kind==='own'?args.p_scope_id:undefined,session_id:args.p_kind==='simulation'?args.p_scope_id:undefined,published_to_class:true,active:true,created_at:start});
 return ok({id:args.p_resource_id,published_to_class:true,delivery_mode:args.p_data.delivery_mode||'secure_view'});
}
if(name==='get_my_simulation_license_catalogue')return ok(licenses);
if(name==='get_my_rizsim_courses')return ok(role==='course_lead'||role==='owner'?courses:[]);
// Production's global sessions RPC does not expose course_id. Test that actual shape.
if(name==='get_my_rizsim_classroom_sessions')return ok(state.sessions.map(({course_id,...s})=>s));
if(name==='get_my_rizsim_course_simulations'){if(state.courseDelay)await new Promise(r=>setTimeout(r,state.courseDelay));if(state.failCourse)return {data:null,error:{message:'Fixture course failure'}};return ok([{product_id:args.p_course_id==='course-1'?'sim-2':'sim-1',simulation_title:args.p_course_id==='course-1'?'Attention Lab':'Decision Lab',sort_order:1,added_at:start}]);}
if(name==='get_my_rizsim_course_classroom_sessions')return ok(state.sessions.filter(s=>s.course_id===args.p_course_id));
if(name==='get_my_rizsim_course_results')return ok(submissions.filter(x=>state.sessions.some(s=>s.course_id===args.p_course_id&&s.session_id===x.classroom_session_id)));
if(name==='get_visible_simulation_submissions'||name==='get_visible_simulation_submission_context')return ok(submissions);
if(name==='create_rizsim_classroom_session'||name==='create_rizsim_course_classroom_session'||name==='create_rizsim_purchased_course_session'){if(state.failCreate)return {data:null,error:{message:'Fixture: session denied'}};if(!['faculty','course_lead'].includes(role)||(name==='create_rizsim_course_classroom_session'&&role!=='course_lead')||(name==='create_rizsim_purchased_course_session'&&!state.purchased))return {data:null,error:{message:'Not authorized'}};const s=session('new-'+state.sessions.length,args.p_product_id,args.p_course_id||null,args.p_class_name);Object.assign(s,{access_mode:args.p_access_mode,live_starts_at:args.p_live_starts_at,live_ends_at:args.p_live_ends_at,practice_starts_at:args.p_practice_starts_at,practice_ends_at:args.p_practice_ends_at});state.sessions.unshift(s);return ok(name==='create_rizsim_purchased_course_session'?{session_id:s.session_id,course_id:s.course_id}:[s]);}
if(name==='close_rizsim_classroom_session'){const s=state.sessions.find(x=>x.session_id===args.p_session_id);if(s){s.active=false;s.session_status='closed'}return ok(null)}
if(name==='admin_get_rizsim_products')return ok(products);if(name==='admin_get_rizsim_categories')return ok([{id:'cat-1',name:'Learning'}]);return ok([]);}
const client={auth:{async getUser(){await new Promise(r=>setTimeout(r,window.__authDelay||0));return ok({user})},async getSession(){return ok({session:{user}})},onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},from:query,rpc,storage:{from(bucket){return {async upload(path,file,options){state.calls.push({kind:'storage',bucket,path,name:file.name,options});return ok({path})},async remove(){return ok(null)}}}}};
export function createClient(){return client;}
