/* Source-compatible academic state machine. No authentication, RPC or persistence. */
(function(root){'use strict';
const D=typeof module==='object'&&module.exports?require('./questions.js'):root.BigFiveData;
const {DATA,SCORE_KEY,REMEDIATION,DIMS}=D,VERSION=D.version;
const ALL=[...DATA.review,...DATA.pairs.flatMap(p=>[p.source,p.transfer])],QMAP=Object.fromEntries(ALL.map(q=>[q.id,q])),RID=DATA.review.map(q=>q.id),PID=DATA.pairs.map(p=>p.id),PMAP=Object.fromEntries(DATA.pairs.map(p=>[p.id,p]));
const now=()=>new Date().toISOString(),mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0,clone=x=>JSON.parse(JSON.stringify(x)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function orderedPairs(r){return (r.ltOrder===undefined?PID:r.ltOrder).map(id=>PMAP[id]);}
function ltIds(r){return orderedPairs(r).flatMap(p=>[p.source.id,p.transfer.id]);}
function ltResponses(r,phase){return orderedPairs(r).map(p=>r.lt.find(a=>a.id===p[phase].id)).filter(Boolean);}
function count(r){return r.kr.length+r.lt.length+r.kg.length;}
function completed(r){return r.kg.length===10&&r.lt.length===10&&r.feedbackSeen.length===10&&!!r.finishedAt;}
function stageOf(r){if(r.kr.length<10)return 'KR';if(r.lt.length<10||r.feedbackSeen.length<10)return 'LT';if(r.kg.length<10)return 'KG';return 'RGA';}
function responseFingerprint(r){let parts=[r.version,r.attemptId,r.identity,r.order,r.kr,r.lt,r.kg,r.feedbackSeen,r.finishedAt];if(r.ltOrder!==undefined)parts.push(r.ltOrder);let t=JSON.stringify(parts),h=2166136261;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0');}
function isText(s,max=120){return typeof s==='string'&&s.trim().length>0&&s.length<=max;}
function validDate(s){return typeof s==='string'&&Number.isFinite(Date.parse(s));}
function validateRecord(r){
 if(!r||r.kind!=='riz-big-five-response'||r.schema!==1||r.version!==VERSION)throw Error('This is not a compatible Big Five response file.');
 if(!isText(r.attemptId,100)||!r.identity||!isText(r.identity.name,100)||!isText(r.identity.erp,50)||!isText(r.identity.section,60))throw Error('Student name, ERP No. and section are required.');
 if(!validDate(r.startedAt)||!validDate(r.updatedAt)||Date.parse(r.updatedAt)<Date.parse(r.startedAt))throw Error('The response dates are invalid.');
 if(!Array.isArray(r.order)||r.order.length!==10||new Set(r.order).size!==10||r.order.some(id=>!RID.includes(id)))throw Error('The ten-item review order is invalid.');
 if(r.ltOrder!==undefined&&(!Array.isArray(r.ltOrder)||r.ltOrder.length!==PID.length||new Set(r.ltOrder).size!==PID.length||r.ltOrder.some(id=>!PID.includes(id))))throw Error('The five-pair LT order is invalid.');
 const ltSequence=ltIds(r);
 for(const [name,limit,ids]of[['kr',10,r.order],['lt',10,ltSequence],['kg',10,r.order]]){
  if(!Array.isArray(r[name])||r[name].length>limit)throw Error('The response count is invalid.');
  r[name].forEach((a,i)=>{if(!a||a.id!==ids[i]||!Number.isInteger(a.choice)||a.choice<0||a.choice>3||![25,50,75,100].includes(a.confidence)||!validDate(a.committedAt)||(a.note!==undefined&&(typeof a.note!=='string'||a.note.length>600)))throw Error('A response is incomplete, out of order, or invalid.')});
 }
 if(!Array.isArray(r.feedbackSeen)||r.feedbackSeen.length>r.lt.length||r.feedbackSeen.some((id,i)=>id!==ltSequence[i])||r.lt.length-r.feedbackSeen.length>1)throw Error('The feedback sequence is invalid.');
 if(r.kr.length<10&&(r.lt.length||r.kg.length))throw Error('KR must be committed before LT.');
 if(r.kg.length&&(r.lt.length!==10||r.feedbackSeen.length!==10))throw Error('All five LT pairs and their feedback must precede KG.');
 if((r.kg.length===10)!==validDate(r.finishedAt))throw Error('The completion marker does not match the responses.');
 let dates=[r.startedAt,...r.kr.map(a=>a.committedAt),...r.lt.map(a=>a.committedAt),...r.kg.map(a=>a.committedAt),r.finishedAt||r.updatedAt,r.updatedAt].map(Date.parse);
 if(dates.some((x,i)=>i&&x<dates[i-1]))throw Error('Elapsed timestamps are out of order.');
 return r;
}
function outcomeOf(sourceCorrect,transferCorrect){
  if(!sourceCorrect&&!transferCorrect)return {id:'revise',title:'You need to revise the concept before proceeding to KG.',label:'Pause and strengthen the concept',needsReview:true};
  if(!sourceCorrect&&transferCorrect)return {id:'consolidated',title:'Great, you have consolidated the concept; proceed to KG.',label:'Understanding strengthened',needsReview:false};
  if(sourceCorrect&&transferCorrect)return {id:'secure',title:'You are doing great; proceed to KG.',label:'Consistent application',needsReview:false};
  return {id:'revisit',title:'You understood the source case; revisit how the concept applies in the new case before proceeding to KG.',label:'Revisit the application',needsReview:true};
}
function markAnswer(a){return a.choice===SCORE_KEY[a.id].answer?1:0}
function automaticScores(r){
  if(!completed(r))return null;
  const kr=r.kr.reduce((n,a)=>n+markAnswer(a),0),kg=r.kg.reduce((n,a)=>n+markAnswer(a),0),source=ltResponses(r,'source'),transfer=ltResponses(r,'transfer');
  const transitions={improved:0,retained:0,revisit:0,unresolved:0};
  r.kr.forEach((a,i)=>{const before=markAnswer(a),after=markAnswer(r.kg[i]);transitions[!before&&after?'improved':before&&after?'retained':before&&!after?'revisit':'unresolved']++});
  return {kr,kg,gainPoints:kg-kr,gainPP:(kg-kr)*10,source:source.reduce((n,a)=>n+markAnswer(a),0),transfer:transfer.reduce((n,a)=>n+markAnswer(a),0),
    concepts:DIMS.map(concept=>({concept,kr:r.kr.filter(a=>SCORE_KEY[a.id].concept===concept).reduce((n,a)=>n+markAnswer(a),0),kg:r.kg.filter(a=>SCORE_KEY[a.id].concept===concept).reduce((n,a)=>n+markAnswer(a),0)})),
    confidence:[['KR',r.kr],['KG',r.kg],['Source',source],['Transfer',transfer]].map(([stage,a])=>({stage,confidence:mean(a.map(x=>x.confidence)),accuracy:mean(a.map(markAnswer))*100})),transitions,
    outcomes:orderedPairs(r).map(p=>{const a=r.lt.find(x=>x.id===p.source.id),b=r.lt.find(x=>x.id===p.transfer.id);return {id:p.id,concept:REMEDIATION[p.id].concept,source:!!markAnswer(a),transfer:!!markAnswer(b),outcome:outcomeOf(!!markAnswer(a),!!markAnswer(b))}})};
}

function valid(r){try{validateRecord(r);return !!r.context&&r.context.attemptId===r.attemptId&&isText(r.context.sessionId,100)&&Number.isSafeInteger(r.revision)&&r.revision>=0;}catch(_){return false;}}
function shuffle(items,random=Math.random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function create(identity,context,random){const at=now(),r={kind:'riz-big-five-response',schema:1,version:VERSION,attemptId:context.attemptId,identity:clone(identity),order:shuffle(RID,random),ltOrder:shuffle(PID,random),startedAt:at,updatedAt:at,finishedAt:null,kr:[],lt:[],kg:[],feedbackSeen:[],context:clone(context),revision:0};if(!valid(r))throw Error('Return to Classroom to confirm your identity before starting.');return r;}
function current(r){const stage=stageOf(r);if(stage==='RGA')return {stage};const phase=stage.toLowerCase(),feedback=phase==='lt'&&r.lt.length>r.feedbackSeen.length,id=phase==='lt'?ltIds(r)[feedback?r.lt.length-1:r.lt.length]:r.order[r[phase].length];return {stage,phase,feedback,id,question:QMAP[id]};}
function apply(record,action,payload={}){
 if(!valid(record)||completed(record))throw Error('This attempt is invalid or already complete.');
 const r=clone(record),c=current(r),at=now();
 if(action==='commit'){
  if(c.feedback||payload.id!==c.id||!Number.isInteger(payload.choice)||payload.choice<0||payload.choice>3||![25,50,75,100].includes(payload.confidence))throw Error('Choose an answer and confidence for the current question.');
  const a={id:c.id,choice:payload.choice,confidence:payload.confidence,committedAt:at};
  if(c.phase==='lt'&&typeof payload.note==='string'&&payload.note.trim())a.note=payload.note.trim().slice(0,600);
  r[c.phase].push(a);if(c.phase==='kg'&&r.kg.length===10)r.finishedAt=at;
 }else if(action==='ack'){
  if(!c.feedback||payload.id!==c.id)throw Error('Read the current feedback before continuing.');
  const index=Math.floor((r.lt.length-1)/2),p=orderedPairs(r)[index],isTransfer=r.lt.length%2===0;
  if(isTransfer&&!markAnswer(r.lt[r.lt.length-1])&&payload.reviewed!==true)throw Error('Review the conceptual explanation and example before continuing.');
  r.feedbackSeen.push(c.id);
 }else throw Error('Unsupported learning action.');
 r.revision++;r.updatedAt=at;if(!valid(r))throw Error('The learning sequence is invalid.');return r;
}
function compatible(old,next){
 if(!valid(old)||!valid(next)||completed(old)||next.revision!==old.revision+1)return false;
 if(!['attemptId','identity','context','startedAt','order','ltOrder','version','kind','schema'].every(k=>same(old[k],next[k])))return false;
 if(!['kr','lt','kg','feedbackSeen'].every(k=>next[k].length>=old[k].length&&same(old[k],next[k].slice(0,old[k].length))))return false;
 return (count(next)-count(old))+(next.feedbackSeen.length-old.feedbackSeen.length)===1&&Date.parse(next.updatedAt)>=Date.parse(old.updatedAt);
}
function progress(r){return {count:count(r),total:30,percent:Math.floor(count(r)/30*100)};}
function imported(x){validateRecord(x);if(!completed(x))throw Error('Import a completed KR, LT and KG response; missing answers are not scored.');return clone(x);}
function control(packet,r){
 validateRecord(r);if(!completed(r)||!packet||packet.kind!=='riz-big-five-key-control'||packet.schema!==1||packet.version!==VERSION||packet.attemptId!==r.attemptId||packet.responseFingerprint!==responseFingerprint(r)||!packet.identity||['name','erp','section'].some(k=>packet.identity[k]!==r.identity[k]))throw Error('This key control does not match the completed attempt.');
 if(!['release','revoke'].includes(packet.action)||!Number.isSafeInteger(packet.revision)||packet.revision<1||!validDate(packet.issuedAt))throw Error('Invalid faculty key control.');
 if(packet.action==='release'){
  if(!packet.keys||Object.keys(packet.keys).length!==ALL.length)throw Error('The faculty key is incomplete.');
  for(const q of ALL){const k=packet.keys[q.id];if(!k||k.answer!==SCORE_KEY[q.id].answer||k.concept!==SCORE_KEY[q.id].concept||!isText(k.rationale,4000)||(k.misconception!==undefined&&typeof k.misconception!=='string'))throw Error('The key is incompatible with this instrument.');}
 }
 return clone(packet.action==='revoke'?{kind:packet.kind,schema:packet.schema,version:packet.version,attemptId:packet.attemptId,identity:packet.identity,responseFingerprint:packet.responseFingerprint,revision:packet.revision,issuedAt:packet.issuedAt,action:'revoke'}:packet);
}
function summarize(rows){
 const records=rows.map(x=>x.record||x).filter(r=>{try{validateRecord(r);return completed(r);}catch(_){return false;}}),s=records.map(automaticScores),n=s.length;
 const avg=(key,scale=1)=>n?mean(s.map(x=>x[key]))*scale:null;
 const transitions={improved:0,retained:0,revisit:0,unresolved:0},pathways={secure:0,consolidated:0,revisit:0,revise:0};
 s.forEach(x=>{for(const k in transitions)transitions[k]+=x.transitions[k];x.outcomes.forEach(o=>pathways[o.outcome.id]++);});
 const gains=s.map(x=>x.gainPP).sort((a,b)=>a-b),gainMean=avg('gainPP'),median=n?(gains[Math.floor((n-1)/2)]+gains[Math.ceil((n-1)/2)])/2:null,sd=n>1?Math.sqrt(gains.reduce((a,v)=>a+(v-gainMean)**2,0)/(n-1)):null;
 return {records,scores:s,n,kr:avg('kr',10),kg:avg('kg',10),gain:gainMean,source:avg('source',20),transfer:avg('transfer',20),transitions,pathways,median,sd,
  concepts:DIMS.map(concept=>({concept,kr:n?mean(s.map(x=>x.concepts.find(c=>c.concept===concept).kr))*50:null,kg:n?mean(s.map(x=>x.concepts.find(c=>c.concept===concept).kg))*50:null})),
  confidence:['KR','KG','Source','Transfer'].map((stage,i)=>({stage,confidence:n?mean(s.map(x=>x.confidence[i].confidence)):null,accuracy:n?mean(s.map(x=>x.confidence[i].accuracy)):null})),
  histogram:Array.from({length:21},(_,i)=>({gain:i-10,n:s.filter(x=>x.gainPoints===i-10).length})),
  pairs:DATA.pairs.map(p=>({id:p.id,title:p.title,concept:REMEDIATION[p.id].concept,counts:s.reduce((m,x)=>{m[x.outcomes.find(o=>o.id===p.id).outcome.id]++;return m;},{secure:0,consolidated:0,revisit:0,revise:0})}))};
}
const api={D,ALL,QMAP,RID,PID,clone,same,now,mean,validDate,validateRecord,valid,create,current,apply,compatible,progress,count,completed,stageOf,orderedPairs,ltIds,ltResponses,responseFingerprint,markAnswer,outcomeOf,automaticScores,imported,control,summarize};
if(typeof module==='object'&&module.exports)module.exports=Object.freeze(api);else root.BigFiveCore=Object.freeze(api);
})(typeof window==='object'?window:globalThis);
