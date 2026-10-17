/* Contract tests of the actual Edge handler with isolated auth/database/storage doubles. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('edge-functions/rizsim-course-material-stream/index.ts','utf8').replace(/^import .*;$/m,'').replace('(s:number,msg:string)','(s,msg)');
const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', scope='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
let count=0;
async function request(options={}){
 let handler,calls=0,downloads=0;
 const context={material_id:id,course_id:scope,source_type:'file',mime_type:'application/pdf'};
 const file={course_id:scope,storage_path:scope+'/'+id+'-sample.pdf',source_type:'file',mime_type:'application/pdf',active:true};
 const user={auth:{getUser:async()=>({data:{user:options.signedOut?null:{id:'test-user'}},error:null})},rpc:(name)=>{
  if(name==='get_rizsim_material_delivery_mode')return Promise.resolve({data:options.modeChanged?'secure_view':options.file?.delivery_mode||'secure_view',error:null});
  return {maybeSingle:async()=>({data:options.denied||(++calls>1&&options.revoked)?null:{...context,...options.context},error:null})};
 }};
 function chain(value){const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:value,error:null})};return q;}
 const admin={from:t=>chain(t==='rizsim_course_materials'?(options.solo?null:{...file,...options.file}):{session_id:scope,storage_path:'sessions/'+scope+'/'+id+'-sample.pdf',source_type:'file',mime_type:'application/pdf',...options.file}),storage:{from:()=>({download:async()=>{downloads++;return {data:new Uint8Array([37,80,68,70,45]),error:options.missing?{message:'not found'}:null};}})}};
 const sandbox={Deno:{serve:fn=>handler=fn,env:{get:name=>({SUPABASE_URL:'https://test.invalid',SUPABASE_ANON_KEY:'fake-public',SUPABASE_SERVICE_ROLE_KEY:'fake-private'})[name]}},createClient:(url,key)=>key==='fake-public'?user:admin,Response,console:{error:()=>{}}};
 vm.runInNewContext(source,sandbox);
 const headers={origin:options.origin||'https://rizsim.com','content-type':'application/json'};
 if(!options.noAuth)headers.authorization='Bearer test-token-not-real';
 const method=options.method||'POST';
 const res=await handler(new Request('https://test.invalid/stream',{method,headers,...(method==='POST'?{body:JSON.stringify({material_id:options.id||id,purpose:options.purpose||'view'})}:{})}));
 return {res,downloads};
}
async function test(label,opts,status){const r=await request(opts);assert.equal(r.res.status,status,label);count++;console.log('PASS',label);return r;}
(async()=>{
 await test('No authorization rejected',{noAuth:true},401);
 await test('Wrong origin rejected',{origin:'https://malicious.invalid'},403);
 await test('GET does not stream',{method:'GET'},405);
 await test('Invalid identifier rejected',{id:'../../private'},400);
 await test('Expired identity rejected',{signedOut:true},401);
 await test('Authenticated but unauthorized resource rejected',{denied:true},403);
 await test('Link resource is not streamed',{context:{source_type:'link'}},400);
 await test('Cross-course file binding rejected',{file:{course_id:'different'}},403);
 await test('Parent path rejected',{file:{storage_path:scope+'/../secret'}},403);
 await test('Unsafe preview MIME rejected',{file:{mime_type:'text/html'}},415);
 await test('Missing storage object does not leak detail',{missing:true},404);
 const own=await test('Existing authorized course file streams',{},200);
 assert.match(own.res.headers.get('cache-control'),/no-store/);assert.equal(own.res.headers.get('x-content-type-options'),'nosniff');assert.equal(own.res.headers.get('content-type'),'application/pdf');count++;console.log('PASS Private content and MIME security headers');
 await test('Authorized standalone-session file streams',{solo:true},200);
 await test('Secure course material denies explicit download',{purpose:'download'},403);
 await test('Downloaded material requires a recognized mode',{purpose:'download',file:{delivery_mode:'untrusted'}},403);
 const downloadable=await test('Explicitly downloadable file permits attachment',{purpose:'download',file:{delivery_mode:'downloadable'}},200);
 assert.match(downloadable.res.headers.get('content-disposition'),/^attachment;/);count++;console.log('PASS Explicit attachment mode for authorized file');
 await test('Previously authorized download fails if mode changed',{purpose:'download',file:{delivery_mode:'downloadable'},modeChanged:true},403);
 const inline=await test('Downloadable material also opens as in-RizSim view',{file:{delivery_mode:'downloadable'}},200);
 assert.equal(inline.res.headers.get('content-disposition'),'inline');count++;console.log('PASS Downloadable view preserves inline reader');
 await test('Wrong standalone prefix rejected',{solo:true,file:{storage_path:scope+'/sample.pdf'}},403);
 await test('Revocation during download blocks response',{revoked:true},403);
 fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/v6-stream.json',JSON.stringify({passed:count,mode:'isolated handler contract tests; no live credentials'},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
