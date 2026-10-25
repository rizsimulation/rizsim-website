/* Pure, source-grounded formative engine. No network, permissions or participant writes. */
(function(root){'use strict';
const D=root.GreenwashingData||(typeof require==='function'?require('./questions.js'):null);
const all=[...D.audit,...D.lab],ids=all.map(i=>i.id),byId=Object.fromEntries(all.map(i=>[i.id,i]));
const clone=x=>JSON.parse(JSON.stringify(x)),own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
const option=v=>Number.isInteger(v)&&v>=0&&v<4;
const text=(v,n=160)=>typeof v==='string'&&v.length<=n;
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function shuffled(a,random=Math.random){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function sameSet(a,b){return Array.isArray(a)&&a.length===b.length&&new Set(a).size===b.length&&a.every(x=>b.includes(x));}
function create(student,context={},random=Math.random){return {schema:'rizsim-greenwashing-attempt',version:1,simulationId:D.id,contentVersion:D.contentVersion,
 student:{name:String(student.name||'RizSim Learner').slice(0,120),studentId:String(student.studentId||'').slice(0,40),classSection:String(student.classSection||'').slice(0,160),organization:String(student.organization||'').slice(0,160)},
 context:{attemptId:String(context.attemptId||''),sessionId:String(context.sessionId||'')},
 auditOrder:shuffled(D.audit.map(i=>i.id),random),order:[...shuffled(D.lab.filter(i=>i.mode==='diagnosis').map(i=>i.id),random),...shuffled(D.lab.filter(i=>i.mode==='transfer').map(i=>i.id),random)],
 optionOrder:Object.fromEntries(ids.map(id=>[id,shuffled([0,1,2,3],random)])),auditSelections:{},auditSubmitted:false,auditIndex:0,labIndex:0,lab:{},stage:'intro',startedAt:new Date().toISOString(),completedAt:null,revision:0};}
function valid(r){
 try{
  if(!r||r.schema!=='rizsim-greenwashing-attempt'||r.version!==1||r.simulationId!==D.id||r.contentVersion!==D.contentVersion)return false;
  if(!r.student||!text(r.student.name,120)||!r.student.name.trim()||!text(r.student.studentId,40)||!text(r.student.classSection)||!text(r.student.organization))return false;
  if(!r.context||!text(r.context.attemptId,80)||!text(r.context.sessionId,80)||!Number.isInteger(r.revision)||r.revision<0)return false;
  if(!sameSet(r.auditOrder,D.audit.map(i=>i.id))||!sameSet(r.order.slice(0,7),D.lab.filter(i=>i.mode==='diagnosis').map(i=>i.id))||!sameSet(r.order.slice(7),D.lab.filter(i=>i.mode==='transfer').map(i=>i.id)))return false;
  if(!r.optionOrder||ids.some(id=>!sameSet(r.optionOrder[id],[0,1,2,3])))return false;
  if(!Number.isInteger(r.auditIndex)||r.auditIndex<0||r.auditIndex>9||!Number.isInteger(r.labIndex)||r.labIndex<0||r.labIndex>14||typeof r.auditSubmitted!=='boolean')return false;
  if(!['intro','audit','audit-summary','lab','results'].includes(r.stage)||!Number.isFinite(Date.parse(r.startedAt)))return false;
  if(!r.auditSelections||Object.keys(r.auditSelections).some(id=>!D.audit.some(i=>i.id===id)||!option(r.auditSelections[id])))return false;
  if(r.auditSubmitted&&Object.keys(r.auditSelections).length!==10)return false;
  if(!r.lab||Object.keys(r.lab).some(id=>!D.lab.some(i=>i.id===id)))return false;
  for(const [id,v] of Object.entries(r.lab)){
   if(!v||!Array.isArray(v.checks)||!v.checks.length||v.checks.length>250||v.checks.some(x=>!option(x))||v.initial!==v.checks[0]||v.final!==v.checks.at(-1)||v.attempts!==v.checks.length||typeof v.done!=='boolean')return false;
   if(v.done&&v.final!==byId[id].correct)return false;
  }
  if(!r.auditSubmitted&&(Object.keys(r.lab).length||['audit-summary','lab','results'].includes(r.stage)))return false;
  if(r.order.slice(0,r.labIndex).some(id=>!r.lab[id]?.done))return false;
  if(Object.keys(r.lab).some(id=>r.order.indexOf(id)>r.labIndex))return false;
  if(r.stage==='results'&&(r.labIndex!==14||!r.completedAt||!Number.isFinite(Date.parse(r.completedAt))))return false;
  if(r.completedAt&&r.stage!=='results')return false;
  if(r.labIndex===14&&r.stage!=='results')return false;
  if(['intro','audit','audit-summary'].includes(r.stage)&&(r.labIndex!==0||Object.keys(r.lab).length))return false;
  if(r.stage==='intro'&&Object.keys(r.auditSelections).length)return false;
  if(r.auditSubmitted&&['intro','audit'].includes(r.stage))return false;
  return true;
 }catch(_){return false;}
}
function progress(r){if(!valid(r))return {count:0,percent:0};const count=(r.auditSubmitted?10:0)+Object.values(r.lab).filter(v=>v.done).length;return {count,percent:Math.round(count/24*100)};}
function compatible(old,next){
 if(!valid(old)||!valid(next)||!eq(old.context,next.context)||!eq(old.student,next.student)||!eq(old.auditOrder,next.auditOrder)||!eq(old.order,next.order)||!eq(old.optionOrder,next.optionOrder)||old.startedAt!==next.startedAt||next.revision<=old.revision)return false;
 if(old.completedAt)return false;
 if(old.auditSubmitted&&(!next.auditSubmitted||!eq(old.auditSelections,next.auditSelections)))return false;
 if(next.labIndex<old.labIndex)return false;
 for(const [id,v] of Object.entries(old.lab)){const n=next.lab[id];if(!n||n.initial!==v.initial||n.checks.length<v.checks.length||!eq(n.checks.slice(0,v.checks.length),v.checks)||(v.done&&!eq(v,n)))return false;}
 return true;
}
function action(record,type,value){
 if(!valid(record)||record.completedAt)throw Error('This response is read-only or incompatible.');
 const r=clone(record);
 if(type==='begin'){if(r.stage!=='intro')throw Error('Audit already started.');r.stage='audit';}
 else if(type==='audit-choice'){if(r.stage!=='audit'||r.auditSubmitted||!option(value))throw Error('Choose one valid audit finding.');r.auditSelections[r.auditOrder[r.auditIndex]]=value;}
 else if(type==='audit-index'){if(r.stage!=='audit'||!Number.isInteger(value)||value<0||value>9)throw Error('Invalid audit question.');r.auditIndex=value;}
 else if(type==='audit-submit'){if(r.stage!=='audit'||Object.keys(r.auditSelections).length!==10)throw Error('Complete all 10 audit questions before submitting.');r.auditSubmitted=true;r.stage='audit-summary';}
 else if(type==='continue'){if(r.stage!=='audit-summary')throw Error('Submit the audit first.');r.stage='lab';}
 else if(type==='check'){
  if(r.stage!=='lab'||r.labIndex>=14||!option(value))throw Error('Choose one response before checking.');
  const id=r.order[r.labIndex],v=r.lab[id];if(v?.done)throw Error('This challenge has already been finalized.');
  if((v?.checks.length||0)>=250)throw Error('The supported number of checks has been reached. Contact Faculty.');
  const checks=[...(v?.checks||[]),value];r.lab[id]={initial:checks[0],final:value,checks,attempts:checks.length,done:false};
 }else if(type==='next'){
  const id=r.order[r.labIndex],v=r.lab[id];if(r.stage!=='lab'||!v||v.final!==byId[id].correct)throw Error('Check a defensible answer before continuing.');
  v.done=true;r.labIndex++;if(r.labIndex===14){r.completedAt=new Date().toISOString();r.stage='results';}
 }else throw Error('Unknown learning action.');
 r.revision++;if(!valid(r))throw Error('The response could not be validated. Nothing was changed.');return r;
}
function observations(r){
 if(!valid(r))return {audit:[],lab:[]};
 return {audit:r.auditSubmitted?r.auditOrder.map(id=>({itemId:id,response:r.auditSelections[id],sin:byId[id].sin,correct:r.auditSelections[id]===byId[id].correct})):[],
 lab:r.order.filter(id=>r.lab[id]).map(id=>{const v=r.lab[id],i=byId[id];return {itemId:id,mode:i.mode,sin:i.sin,dimension:i.dimension,initialResponse:v.initial,finalResponse:v.final,initialCorrect:v.initial===i.correct,finalCorrect:v.final===i.correct,attempts:v.attempts,finalized:v.done};})};
}
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
function summarize(o){
 const audit=o.audit,lab=o.lab,final=lab.filter(r=>r.finalized),errors=final.filter(r=>!r.initialCorrect),corrected=errors.filter(r=>r.finalCorrect);
 return {auditN:audit.length,auditCorrect:audit.filter(r=>r.correct).length,auditAccuracy:mean(audit.map(r=>+r.correct)),initialN:lab.length,initialAccuracy:mean(lab.map(r=>+r.initialCorrect)),finalN:final.length,finalAccuracy:mean(final.map(r=>+r.finalCorrect)),initialErrors:errors.length,correctedErrors:corrected.length,finalErrors:final.filter(r=>!r.finalCorrect).length,correctionRate:errors.length?corrected.length/errors.length:null,
 modes:['diagnosis','transfer'].map(mode=>{const first=lab.filter(r=>r.mode===mode),paired=final.filter(r=>r.mode===mode);const initial=mean(paired.map(r=>+r.initialCorrect)),last=mean(paired.map(r=>+r.finalCorrect));return {mode,firstN:first.length,first:mean(first.map(r=>+r.initialCorrect)),n:paired.length,initial,final:last,changePP:initial==null?null:100*(last-initial),checks:mean(paired.map(r=>r.attempts))};})};
}
function exportRecord(r,submittedAt=r.completedAt){
 if(!valid(r)||r.stage!=='results')throw Error('Finish the complete simulation before exporting a response.');
 const o=observations(r),s=summarize(o);
 return {schema:'educational-simulation-response',version:'1.0',simulation:{id:D.id,title:D.title,contentVersion:D.contentVersion},student:clone(r.student),submittedAt,
 auditResponses:o.audit.map(x=>({...x,correctResponse:byId[x.itemId].correct})),responses:o.lab.map(x=>({...x,correctResponse:byId[x.itemId].correct})),scores:{audit:{accuracy:s.auditAccuracy,bySin:[...new Set(D.audit.map(i=>i.sin))].map(sin=>{const a=o.audit.filter(x=>x.sin===sin);return {sin,n:a.length,accuracy:mean(a.map(x=>+x.correct))};})},lab:{initialErrors:s.initialErrors,finalErrors:s.finalErrors,correctedErrors:s.correctedErrors,correctionRate:s.correctionRate==null?1:s.correctionRate,byMode:Object.fromEntries(s.modes.map(m=>{const a=o.lab.filter(x=>x.mode===m.mode),e=a.filter(x=>!x.initialCorrect),c=e.filter(x=>x.finalCorrect);return [m.mode,{initialAccuracy:m.initial,finalAccuracy:m.final,correctionRate:e.length?c.length/e.length:1}];}))}},
 metadata:{startedAt:r.startedAt,pedagogy:'baseline-audit-plus-learning-transfer',frameworks:['Ladder of Inference','Seven Sins of Greenwashing'],correctionDenominator:s.initialErrors,zeroInitialErrors:s.initialErrors===0},integration:{attempt_id:r.context.attemptId,session_id:r.context.sessionId,sync_revision:r.revision}};
}
function imported(x){
 if(!x||x.schema!=='educational-simulation-response'||x.version!=='1.0'||x.simulation?.id!==D.id||x.simulation.contentVersion!==D.contentVersion||!text(x.student?.name,120)||!x.student.name.trim()||!text(x.student?.studentId,40)||!text(x.student?.classSection)||!Number.isFinite(Date.parse(x.submittedAt)))throw Error('Incompatible completed Greenwashing response.');
 if(!Array.isArray(x.auditResponses)||!Array.isArray(x.responses)||!sameSet(x.auditResponses.map(r=>r.itemId),D.audit.map(i=>i.id))||!sameSet(x.responses.map(r=>r.itemId),D.lab.map(i=>i.id)))throw Error('A complete file must contain all 10 audit and 14 lab items exactly once.');
 const audit=x.auditResponses.map(r=>{if(!option(r.response))throw Error('Invalid audit choice.');const i=byId[r.itemId];return {itemId:i.id,sin:i.sin,response:r.response,correct:r.response===i.correct};});
 const lab=x.responses.map(r=>{const i=byId[r.itemId];if(!option(r.initialResponse)||!option(r.finalResponse)||!Number.isInteger(r.attempts)||r.attempts<1||r.attempts>250||r.finalResponse!==i.correct)throw Error('Invalid completed lab response.');return {itemId:i.id,mode:i.mode,sin:i.sin,dimension:i.dimension,initialResponse:r.initialResponse,finalResponse:r.finalResponse,initialCorrect:r.initialResponse===i.correct,finalCorrect:r.finalResponse===i.correct,attempts:r.attempts,finalized:true};});
 return {audit,lab};
}
root.GreenwashingCore=Object.freeze({create,valid,compatible,action,progress,observations,summarize,exportRecord,imported,clone,mean,byId});
if(typeof module!=='undefined')module.exports=root.GreenwashingCore;
})(typeof window!=='undefined'?window:globalThis);
