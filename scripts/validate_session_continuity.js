const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const code = fs.readFileSync('rizsim-session-continuity.js','utf8');
const data = new Map();
const localStorage = {
 getItem:k=>data.has(k)?data.get(k):null,
 setItem:(k,v)=>data.set(k,v),
 removeItem:k=>data.delete(k)
};
const window={localStorage};
vm.runInNewContext(code,{window,globalThis:window});
const api=window.RizSimSession;
assert.equal(api.resumeTarget({id:'abc'}),null);
assert.equal(api.remember('faculty','abc'),true);
assert.equal(api.resumeTarget({id:'abc'}),'access-out.html#home');
assert.equal(api.resumeTarget({id:'other'}),null);
api.remember('student','abc');
assert.equal(api.resumeTarget({id:'abc'}),'access-in.html#home');
assert.equal(api.autoResume({id:'abc'},{page:'simulations',replace:()=>{throw Error('unexpected redirect')}}),false);
let routed=null;
assert.equal(api.autoResume({id:'abc'},{page:'home',replace:path=>{routed=path}}),true);
assert.equal(routed,'access-in.html#home');
routed=null;
assert.equal(api.autoResume({id:'abc'},{page:'home',forcePublic:true,replace:path=>{routed=path}}),false);
assert.equal(routed,null);
assert.equal(api.autoResume({id:'someone-else'},{page:'home',replace:path=>{routed=path}}),false);
assert.equal(routed,null);
api.forget();
assert.equal(api.resumeTarget({id:'abc'}),null);
assert.equal(api.autoResume({id:'abc'},{page:'home',replace:path=>{routed=path}}),false);
async function run(){
 let n=0;
 const after=await api.verifyUser({auth:{getUser:async()=>{n++;if(n<3)return{data:{user:null},error:{status:503}};return{data:{user:{id:'abc'}},error:null}}}},{sleep:async()=>{}});
 assert.equal(after.data.user.id,'abc');assert.equal(n,3);
 n=0;
 const missing=await api.verifyUser({auth:{getUser:async()=>{n++;return{data:{user:null},error:{name:'AuthSessionMissingError'}}}}},{sleep:async()=>{}});
 assert.equal(missing.data.user,null);assert.equal(n,1);
 for(const file of ['access-in.html','access-out.html']){
 const content=fs.readFileSync(file,'utf8');
 assert.match(content,/RizSimSession\.remember/);
 assert.match(content,/RizSimSession\.verifyUser/);
 assert.match(content,/RizSimSession\.forget/);
 assert.match(content,/persistSession:true/);
 }
 for(const file of ['index.html','simulations.html','about.html','contact.html']){
  assert.match(fs.readFileSync(file,'utf8'),/src="rizsim-session-continuity.js"/);
 }
 console.log('PASS session continuity and routing invariants');
}
run().catch(e=>{console.error(e);process.exitCode=1});
