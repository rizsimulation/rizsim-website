/* Independent arithmetic checks for the frontend projection. No production data. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),A=require('../rizsim-analytics-v1.js'),C=require('../simulation-assets/insight-to-implication/engine.js');
let count=0;const check=(name,fn)=>{fn();count++;console.log('PASS '+name);};
function record(kr,kg,source=true,transfer=true,org='Organization A',group='Class A'){
 const r=C.createRecord('Synthetic learner',org);r.facultyGroup=group;
 for(const id of C.IDS){const key=C.BY_ID[id].key,wrong=['A','B','C','D'].find(x=>x!==key);const i=C.IDS.indexOf(id);r.picks.kr[id]=i<kr?key:wrong;r.picks.kg[id]=i<kg?key:wrong;}
 r.picks.source=source?C.D.source.key:['A','B','C','D'].find(x=>x!==C.D.source.key);r.picks.transfer=transfer?C.D.transfer.key:['A','B','C','D'].find(x=>x!==C.D.transfer.key);
 for(const k in r.locks)r.locks[k]=true;return r;
}
const rows=[[1,4,true,true],[2,3,false,true],[4,2,true,false],[3,1,false,false]].map((args,i)=>({attempt:'a'+i,status:'submitted',record:record(...args)}));
const krOnly=record(6,6);krOnly.locks={kr:true,source:false,bridge:false,transfer:false,feedback:false,kg:false};
rows.push({attempt:'partial',record:krOnly},{attempt:'joined',record:null});
const m=A.model('insight',{rows,core:C});
check('Started excludes roster-only rows',()=>assert.equal(m.started,5));
check('KR participation counts partial learners',()=>assert.equal(m.krLocked,5));
check('KG and LT reviewed preserve recorded stage locks',()=>{assert.equal(m.kgLocked,4);assert.equal(m.reviewed,4);});
check('Paired means exclude the unpaired perfect KR',()=>{assert.equal(m.krMean,2.5);assert.equal(m.kgMean,2.5);assert.equal(m.changePP,0);});
check('All four transfer paths counted once',()=>assert.deepEqual(m.pathways,[1,1,1,1]));
check('Transition denominator equals 6 matched items per paired learner',()=>assert.equal(m.transitions.reduce((a,b)=>a+b,0),24));
check('Original analysis contract reconciles',()=>{const o=C.analyse(rows.map(x=>x.record));assert.equal(m.krMean,o.krAvg);assert.equal(m.kgMean,o.kgAvg);assert.equal(m.changePP,o.changePP);assert.deepEqual(m.pathways,Object.values(o.clusters));});
check('Choices only include locked stages',()=>assert.equal(m.choices.length,8));
check('Group paired denominator excludes partial learners',()=>{const g=A.groupStats(m,'organization')[0];assert.equal(g.n,5);assert.equal(g.paired,4);assert.equal(g.pathN,4);assert.equal(g.change,0);});
check('Blank label not merged with genuine named group',()=>{const mm={people:[{organization:'',kr:0,kg:6,paths:[]},{organization:'Not provided',kr:6,kg:0,paths:[]}]};const gs=A.groupStats(mm,'organization');assert.equal(gs.length,2);assert.equal(gs.filter(x=>x.missing).length,1);});
check('Empty is null, not zero performance',()=>{const empty=A.model('insight',{rows:[],core:C});assert.equal(empty.krMean,null);assert.equal(empty.changePP,null);assert.equal(empty.pairs.length,0);});
check('Invalid records excluded before scoring',()=>{assert.equal(A.model('insight',{rows:[{record:{}}],core:C}).started,0);});
const systemRecord={profile:{organization:'Organization B',group:'Class B'},lt:[0,1].map((x)=>({source:{a:x,at:'locked',seen:'read'},transfer:{a:x+1,at:'locked',seen:'read'}}))};
const metrics={kr:2,kg:5,kr_locked:true,kg_locked:true,item_kr:[true,true,false,false,false,false],item_kg:[true,true,true,true,true,false],lt_source:[true,false],lt_transfer:[false,true]};
const sm=A.model('systems',{rows:[{attempt:'s1',status:'submitted',record:systemRecord,metrics}]});
check('Systems uses released server scores',()=>{assert.equal(sm.krMean,2);assert.equal(sm.kgMean,5);assert.equal(sm.changePP,50);});
check('Systems paired cases denominator distinct from learners',()=>{assert.equal(sm.started,1);assert.equal(sm.pathways.reduce((a,b)=>a+b,0),2);assert.deepEqual(sm.pathways,[0,1,1,0]);assert.equal(sm.choices.length,4);});
check('Systems matches item transitions',()=>assert.deepEqual(sm.transitions,[2,3,0,1]));
check('Systems feedback acknowledgement not inferred',()=>{assert.equal(sm.reviewed,1);const r=JSON.parse(JSON.stringify(systemRecord));delete r.lt[1].transfer.seen;assert.equal(A.model('systems',{rows:[{record:r,metrics}]}).reviewed,0);});
check('Systems missing metrics are not replaced by a local key',()=>assert.equal(A.model('systems',{rows:[{record:systemRecord,metrics:null}]}).started,0));
const hr=[{status:'submitted',attempt:'h1',progress:100,record:{group:'A',willing_to_pay_pkr:12000,binary_response:'Yes'}}];
check('Hotel defense in depth ignores leaked early record',()=>assert.equal(A.model('hotel',{rows:hr,revealed:false}).people.length,0));
check('Hotel no fake review or transfer scores',()=>{const h=A.model('hotel',{rows:hr,revealed:true});assert.equal(h.people[0].value,12000);assert.equal(h.pairs.length,0);assert.equal(h.krMean,undefined);});
check('Quantiles documented linear interpolation',()=>{assert.equal(A.quantile([0,10,20,30,40],.25),10);assert.equal(A.quantile([0,10,20,30],.5),15);assert.equal(A.quantile([],.5),null);});
check('No network or persistence in analytics adapter',()=>assert(!/\bfetch\s*\(|\bXMLHttpRequest\b|localStorage|sessionStorage|\.rpc\(/.test(fs.readFileSync('rizsim-analytics-v1.js','utf8'))));
console.log(JSON.stringify({passed:count,failed:0}));
