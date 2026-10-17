/* RizSim Activity 01 - non-authoritative Player messaging bridge.
   No credentials, keys or uncommitted observations cross the bridge. */
(function (root) {
 'use strict';
 const D=root.InsightData,C=root.InsightCore;
 const bridgeVersion='rizsim-sync-v1';
 const schemaVersion=1;
 const params=new URLSearchParams(root.location?.search||'');
 const session=params.get('session')||'';
 const course=params.get('course')||'';
 const instance=params.get('simulation_instance_id')||'';
 const attempt=params.get('attempt')||'';
 const frame=root.parent&&root.parent!==root;
 let revision=0;
 let getCurrent=()=>null;
 let ingest=()=>{};
 const sameOrigin=e=>e.source===root.parent&&(e.origin===root.location.origin||root.location.protocol==='file:');
 const base=()=>({source:'rizsimulation-dashboard',bridge_version:bridgeVersion,simulation_id:D.id,schema_version:schemaVersion,
  attempt_id:attempt,session_id:session,course_id:course,simulation_instance_id:instance});
 function send(type,attrs) {
  const payload={...base(),...attrs,type};
  if(frame)root.parent.postMessage(payload,root.location.origin==='null'?'*':root.location.origin);
  root.dispatchEvent(new CustomEvent('rizsim:sync-outbound',{detail:payload}));
 }
 function committedRecord(rec){
  if(!C.validRecord(rec))return null;
  const copy=C.clone(rec);
  if(!copy.locks.kr)copy.picks.kr={};
  if(!copy.locks.source)copy.picks.source=null;
  if(!copy.locks.transfer)copy.picks.transfer=null;
  if(!copy.locks.kg)copy.picks.kg={};
  return copy;
 }
 function snapshot(reason='request-state',increase=false){
  const rec=committedRecord(getCurrent());if(!rec)return;
  if(increase)revision=Math.max(revision,Number(rec.revision)||0)+1;
  const data={schema:'rizsimulation-insight-record',version:schemaVersion,simulation:{id:D.id,title:D.title},student:{name:rec.profile.name,organization:rec.profile.organization},
   record:rec,finalized_decisions:C.committed(rec),completed:rec.locks.kg,
   integration:{bridge_version:bridgeVersion,attempt_id:attempt||rec.id,session_id:session,course_id:course,simulation_instance_id:instance,sync_revision:revision}};
  send('rizsim:student-response',{kind:'simulation-response',event:'student_response',reason,revision,payload:data});
 }
 function student(start) {
  getCurrent=start;
  send('rizsim:student-ready',{kind:'bridge-ready',event:'student_ready',capabilities:['decision-snapshots','completed-export','request-state','session-context']});
 }
 function faculty(onRecord) {
  ingest=onRecord;
  send('rizsim:faculty-ready',{kind:'bridge-ready',event:'faculty_ready',capabilities:['progressive-upsert','revision-replace','analytics-refresh']});
 }
 root.addEventListener('message',ev=>{
  if(!sameOrigin(ev)||!ev.data||typeof ev.data!=='object')return;
  const o=ev.data;
  if(['rizsim:request-state','rizsim:ping'].includes(o.type))snapshot('request-state',false);
  if(o.type==='rizsim:faculty-response'||o.type==='rizsim:student-response'||o.event==='student_response') {
   if(o.simulation_id&&o.simulation_id!==D.id)return;
   let payload=o.payload||o;
   const list=Array.isArray(payload?.records)?payload.records:Array.isArray(payload?.payloads)?payload.payloads:[payload];
   for(const item of list){const rec=item?.record||item?.payload?.record||item;
    if(!C.validRecord(rec)||item?.schema_version&&Number(item.schema_version)!==schemaVersion)continue;
    const meta=item.integration||item?.payload?.integration||o?.payload?.integration||{};
    ingest(C.clone(rec),{attempt_id:String(meta.attempt_id||o.attempt_id||rec.id),sync_revision:Number(meta.sync_revision??o.revision??rec.revision)||0,session_id:String(meta.session_id||o.session_id||''),course_id:String(meta.course_id||o.course_id||'')});
   }
  }
 });
 root.RizSimInsightBridge=Object.freeze({student,faculty,committedRecord,
  committed:reason=>snapshot(reason,true),requestState:()=>snapshot('request-state',false),context:()=>base()});
})(window);