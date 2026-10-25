/* Exact academic-content fidelity and pure source-compatible state/calculation contracts. */
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const C=require('../simulation-assets/big-five/engine.js'),D=C.D;let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name);}
const identity={name:'Synthetic Learner',erp:'QA-1',section:'Section A'},context={attemptId:'qa-attempt',sessionId:'qa-session'};
const fresh=()=>C.create(identity,context,()=>.37);
function commit(r,correct=true,confidence=75){const c=C.current(r);return C.apply(r,'commit',{id:c.id,choice:(D.SCORE_KEY[c.id].answer+(correct?0:1))%4,confidence});}
function full(seed=0){let r=fresh();for(let i=0;i<10;i++)r=commit(r,i<seed);for(let i=0;i<10;i++){r=commit(r,i%2===0?i<4:i<8);r=C.apply(r,'ack',{id:C.current(r).id,reviewed:true});}for(let i=0;i<10;i++)r=commit(r,i<8);return r;}
const manifest=JSON.parse(fs.readFileSync('docs/big-five-source-manifest.json','utf8'));
test('10 review questions, five paired cases, five dimensions',()=>{assert.equal(D.DATA.review.length,10);assert.equal(D.DATA.pairs.length,5);assert.equal(D.DIMS.length,5);assert.equal(C.ALL.length,20);});
test('every option retains balanced original eleven-word wording',()=>{for(const q of C.ALL){assert.equal(q.options.length,4);for(const text of q.options)assert.equal(text.trim().split(/\s+/).length,11,q.id);}});
test('new record validates and contains no invented answers',()=>{const r=fresh();assert(C.valid(r));assert.equal(C.count(r),0);assert.equal(C.automaticScores(r),null);});
test('sequences stable within attempt; pair source and transfer stay together',()=>{const r=fresh();assert.deepEqual(C.ltIds(r),C.orderedPairs(r).flatMap(p=>[p.source.id,p.transfer.id]));assert.equal(new Set(r.order).size,10);});
test('identity required rather than silently invented',()=>assert.throws(()=>C.create({...identity,erp:''},context)));
test('confidence starts missing and must be explicitly provided',()=>{let r=fresh();assert.throws(()=>C.apply(r,'commit',{id:C.current(r).id,choice:0}));assert.throws(()=>commit(r,true,0));});
test('one committed answer adds one revision and preserves the prefix',()=>{let r=fresh(),n=commit(r);assert.equal(n.kr.length,1);assert.equal(n.revision,1);assert(C.compatible(r,n));});
test('committed answers cannot be overwritten',()=>{let r=commit(fresh()),n=commit(r);n.kr[0].choice=(n.kr[0].choice+1)%4;assert(!C.compatible(r,n));});
test('out of sequence choice cannot be submitted',()=>assert.throws(()=>C.apply(fresh(),'commit',{id:'P1S',choice:0,confidence:100})));
test('KR must precede LT',()=>{let r=fresh();r.lt.push({id:'P1S',choice:0,confidence:25,committedAt:C.now()});assert(!C.valid(r));});
test('LT source decision awaits factual feedback',()=>{let r=fresh();for(let i=0;i<10;i++)r=commit(r);r=commit(r);assert(C.current(r).feedback);assert.throws(()=>commit(r));assert.equal(C.count(r),11);});
test('feedback acknowledgment adds no new academic decision',()=>{let r=fresh();for(let i=0;i<11;i++)r=commit(r);let n=C.apply(r,'ack',{id:C.current(r).id});assert.equal(C.count(n),11);assert.equal(n.feedbackSeen.length,1);assert(C.compatible(r,n));});
test('incorrect transfer requires conceptual-review acknowledgment',()=>{let r=fresh();for(let i=0;i<11;i++)r=commit(r);r=C.apply(r,'ack',{id:C.current(r).id});r=commit(r,false);assert.throws(()=>C.apply(r,'ack',{id:C.current(r).id}));assert.doesNotThrow(()=>C.apply(r,'ack',{id:C.current(r).id,reviewed:true}));});
test('wrong transfer is retained, never corrected by acknowledgment',()=>{let r=full();let a=r.lt.find((v,i)=>i%2===1&&!C.markAnswer(v));assert(a);assert.equal(C.automaticScores(r).transfer,4);});
test('four pathways correctly distinguish independent source and transfer judgments',()=>{assert.equal(C.outcomeOf(false,false).id,'revise');assert.equal(C.outcomeOf(false,true).id,'consolidated');assert.equal(C.outcomeOf(true,false).id,'revisit');assert.equal(C.outcomeOf(true,true).id,'secure');});
test('KG begins blank and repeats exactly the KR question order',()=>{let r=fresh();for(let i=0;i<10;i++)r=commit(r);for(let i=0;i<10;i++){r=commit(r);r=C.apply(r,'ack',{id:C.current(r).id,reviewed:true});}assert.equal(C.current(r).stage,'KG');assert.equal(r.kg.length,0);assert.equal(C.current(r).id,r.kr[0].id);});
test('completed record has 30 decisions and ten feedback acknowledgments',()=>{const r=full();assert(C.completed(r));assert.equal(C.count(r),30);assert.equal(C.progress(r).percent,100);assert.equal(r.feedbackSeen.length,10);});
test('final results are not forced to 100 percent',()=>{const s=C.automaticScores(full(3));assert.equal(s.kr,3);assert.equal(s.kg,8);assert.equal(s.gainPP,50);});
test('completion is read-only',()=>assert.throws(()=>commit(full())));
test('paired transitions reconcile to ten items',()=>{let s=C.automaticScores(full(3));assert.equal(Object.values(s.transitions).reduce((a,b)=>a+b),10);assert.equal(s.transitions.improved,5);assert.equal(s.transitions.retained,3);});
test('summary re-scores raw answers, ignores supplied totals',()=>{let r=full(3);r.scores={kr:10,kg:10};r.kr.forEach(a=>a.correct=true);assert.equal(C.summarize([r]).kr,30);});
test('missing and partial attempts excluded, never scored zero',()=>{const m=C.summarize([fresh(),full(3)]);assert.equal(m.n,1);assert.equal(m.kr,30);});
test('empty means remain missing',()=>{const m=C.summarize([]);assert.equal(m.n,0);assert.equal(m.kr,null);assert.equal(m.sd,null);});
test('matched means, median and sample SD use same learners',()=>{const m=C.summarize([full(3),full(5)]);assert.equal(m.kr,40);assert.equal(m.kg,80);assert.equal(m.gain,40);assert.equal(m.median,40);assert(Math.abs(m.sd-Math.sqrt(200))<1e-9);});
test('single-learner SD is not fabricated',()=>assert.equal(C.summarize([full()]).sd,null));
test('transfer pathways sum to five pairs per learner',()=>{const m=C.summarize([full(3),full(5)]);assert.equal(Object.values(m.pathways).reduce((a,b)=>a+b),10);});
test('confidence stays percent units, distinct from accuracy',()=>{const m=C.summarize([full(3)]);assert.equal(m.confidence[0].confidence,75);assert.equal(m.confidence[0].accuracy,30);});
test('histogram includes negative and positive changes with correct counts',()=>{const m=C.summarize([full(10),full(3)]);assert.equal(m.histogram.find(b=>b.gain===-2).n,1);assert.equal(m.histogram.find(b=>b.gain===5).n,1);});
test('source completed JSON remains valid without hosted context',()=>{let r=full();delete r.context;delete r.revision;assert.doesNotThrow(()=>C.imported(r));assert(!C.valid(r));});
test('incomplete import rejected',()=>assert.throws(()=>C.imported(fresh())));
test('invalid option, confidence, duplicate order and timestamp rejected',()=>{for(const mutate of [r=>r.kr[0].choice=7,r=>r.kr[0].confidence=99,r=>r.order[1]=r.order[0],r=>r.updatedAt='bad']){let r=full();mutate(r);assert.throws(()=>C.imported(r));}});
test('stale revision and changed identity rejected',()=>{const r=fresh(),n=commit(r);n.revision=0;assert(!C.compatible(r,n));n.revision=1;n.identity.erp='other';assert(!C.compatible(r,n));});
test('final key requires exact completed record fingerprint',()=>{const r=full(),p={kind:'riz-big-five-key-control',schema:1,version:D.version,attemptId:r.attemptId,identity:r.identity,responseFingerprint:C.responseFingerprint(r),revision:1,issuedAt:C.now(),action:'revoke'};assert.equal(C.control(p,r).action,'revoke');assert.throws(()=>C.control({...p,responseFingerprint:'wrong'},r));});
test('incompatible release key is rejected',()=>{let r=full(),p={kind:'riz-big-five-key-control',schema:1,version:D.version,attemptId:r.attemptId,identity:r.identity,responseFingerprint:C.responseFingerprint(r),revision:1,issuedAt:C.now(),action:'release',keys:{}};assert.throws(()=>C.control(p,r));});
test('faculty key is not loaded by Student runner',()=>{const html=fs.readFileSync('simulation-big-five.html','utf8');assert(!html.includes('teaching.js'));assert(!html.includes('rizsim-big-five-faculty.js'));});
test('source manifest retains all source constants exactly',()=>{const src=fs.readFileSync('simulation-assets/big-five/questions.js','utf8');for(const [name,expected] of Object.entries(manifest.constants||{})){const m=src.match(new RegExp('^const '+name+'=.*;$','m'));assert(m,name);assert.equal(crypto.createHash('sha256').update(m[0]).digest('hex'),expected,name);}});
console.log('Big Five core checks: '+passed+' passed');
