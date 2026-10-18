/* Activity 02 · RizSim Player bridge (Student). No privileged credentials.
   Same-origin host messages only; standalone file mode remains offline. */
(function(){
 'use strict';
 const SIM=DATA.meta.id,VER=DATA.meta.version,BRIDGE='rizsim-sync-v1';
 const q=new URLSearchParams(location.search),framed=window.parent!==window;
 const context={attempt_id:q.get('attempt')||q.get('attempt_id')||'',session_id:q.get('session')||q.get('session_id')||'',course_id:q.get('course_id')||q.get('course')||'',simulation_instance_id:q.get('simulation_instance_id')||''};
 let emitted=0;
 const validInbound=e=>framed&&e.source===window.parent&&(location.protocol==='file:'||e.origin===location.origin);
 function wire(type,other={}){
  const msg={source:'rizsimulation-dashboard',bridge_version:BRIDGE,type,event:type==='rizsim:student-ready'?'student_ready':'student_response',
    kind:type==='rizsim:student-ready'?'bridge-ready':'simulation-response',simulation_id:SIM,schema_version:VER,...context,...other};
  if(framed)window.parent.postMessage(msg,location.protocol==='file:'?'*':location.origin);
  window.dispatchEvent(new CustomEvent('rizsim:sync-outbound',{detail:msg}));
 }
 function snapshot(reason='request-state',advance=false){
  if(!record)return null;
  let safe;try{safe=validateRecord(exportRecord(record))}catch(e){return null}
  if(advance)emitted=Math.max(emitted+1,safe.revision+1);
  else emitted=Math.max(emitted,safe.revision);
  const attempt=context.attempt_id||safe.id;
  const count=(safe.kr.at?6:0)+(safe.kg.at?6:0)+safe.lt.reduce((sum,p)=>sum+Number(!!p.source.at)+Number(!!p.transfer.at),0);
  const payload={schema:'RizSimulation.Participant.v1',schema_version:VER,simulation:{id:SIM,title:DATA.meta.title},
    participant:{name:safe.profile.name,organization:safe.profile.organization,group:safe.profile.group,session:safe.profile.session},
    record:safe,finalized_decisions:count,completed:!!safe.kg.at,
    integration:{bridge_version:BRIDGE,attempt_id:attempt,session_id:context.session_id,course_id:context.course_id,simulation_instance_id:context.simulation_instance_id,sync_revision:emitted}};
  wire('rizsim:student-response',{reason,attempt_id:attempt,revision:emitted,payload});return payload;
 }
 function onCommit(reason){if(!window.__RIZSIM_SIM02_HOSTED__)snapshot(reason,true)}
 const beforeReview=lockReview;
 lockReview=function(stage,...rest){const old=!!record?.[stage]?.at;beforeReview(stage,...rest);if(!old&&record?.[stage]?.at)onCommit(stage+'-locked')};
 const beforeLT=lockLT;
 lockLT=function(i,kind,...rest){const old=!!record?.lt?.[i]?.[kind]?.at;beforeLT(i,kind,...rest);if(!old&&record?.lt?.[i]?.[kind]?.at)onCommit('lt-'+kind+'-locked')};
 const beforeFeedback=markFeedback;
 markFeedback=function(i,kind){const old=!!record?.lt?.[i]?.[kind]?.seen;beforeFeedback(i,kind);if(!old&&record?.lt?.[i]?.[kind]?.seen)onCommit('lt-'+kind+'-feedback-read')};
 window.addEventListener('message',ev=>{
  if(!validInbound(ev)||!ev.data||typeof ev.data!=='object')return;
  const d=ev.data;
  if(d.type==='rizsim:request-state'||d.type==='rizsim:ping')snapshot('request-state',false);
  if(d.type==='rizsim:session-context'){
    const host=d.context||{};
    for(const key of ['course_id','session_id','simulation_instance_id']){
      if(!context[key]&&typeof host[key]==='string'&&host[key].length<=100)context[key]=host[key];
    }
    if(!record){const n=document.getElementById('pname'),org=document.getElementById('porg');
      if(n&&!n.value&&typeof host.name==='string')n.value=host.name.slice(0,120);
      if(org&&!org.value&&typeof host.organization==='string')org.value=host.organization.slice(0,180);
    }
  }
 });
 window.RizSimSim02StudentBridge=Object.freeze({emit:reason=>snapshot(reason,true),request:()=>snapshot('request-state',false),context:()=>({...context}),id:SIM,version:VER});
 wire('rizsim:student-ready',{capabilities:['decision-snapshots','completed-export','request-state','session-context']});
 /* Standalone printable report. No faculty answer key is included. */
 function addPrintButton(){if(!record||document.getElementById('rzSim02Print'))return;
  const near=document.querySelector('#app .aside .actions')||document.querySelector('#app .panel.no-print .actions')||document.querySelector('#app .actions');
  if(!near)return;
  const b=document.createElement('button');b.id='rzSim02Print';b.className='btn secondary compact';b.type='button';b.textContent='Print / Save PDF';b.addEventListener('click',printResponse);near.appendChild(b);
 }
 function reportRows(r){return DATA.review.map((item,i)=>`<tr><td>${esc(item.id)}</td><td>${esc(item.stem)}</td><td>${r.kr.at?esc(LETTERS[r.kr.a[i]]+' · '+item.options[r.kr.a[i]]):'Not locked'}</td><td>${r.kg.at?esc(LETTERS[r.kg.a[i]]+' · '+item.options[r.kg.a[i]]):'Not locked'}</td></tr>`).join('')}
 function printResponse(){if(!record)return;
  const r=exportRecord(record);let o=document.getElementById('rzSim02Printable');if(o)o.remove();
  o=document.createElement('article');o.id='rzSim02Printable';o.className='rz-sim02-print-only';
  o.innerHTML=`<h1>RizSimulation · System 1 &amp; System 2 Thinking</h1><p>Participant response report · ${esc(DATA.meta.event)}</p><p><b>Name:</b> ${esc(r.profile.name)} · <b>Organization:</b> ${esc(r.profile.organization)} · <b>Session:</b> ${esc(r.profile.session)}</p><p><b>Record:</b> ${esc(r.id)} · <b>Completed:</b> ${esc(r.completedAt||'In progress')} · <b>Committed:</b> ${lockedCount(r)}/16</p><h2>Knowledge Review → Knowledge Gain</h2><table><thead><tr><th>Item</th><th>Question</th><th>KR choice</th><th>KG choice</th></tr></thead><tbody>${reportRows(r)}</tbody></table><h2>Learning Transfer</h2>${DATA.pairs.map((p,i)=>`<section><h3>${esc(p.concept)}</h3>${['source','transfer'].map(k=>`<p><b>${esc(k==='source'?'Source':'Transfer')} · ${esc(p[k].title)}:</b> ${r.lt[i][k].at?esc(LETTERS[r.lt[i][k].a]+' · '+p[k].options[r.lt[i][k].a]):'Not locked'}</p>`).join('')}</section>`).join('')}
  ${r.kg.at&&personalRGA?.metrics?`<h2>Personal learning summary</h2><p>KR ${personalRGA.metrics.kr}/6 · KG ${personalRGA.metrics.kg}/6 · Change ${personalRGA.metrics.kg-personalRGA.metrics.kr} points · Source ${personalRGA.metrics.source}/2 · Transfer ${personalRGA.metrics.transfer}/2</p>`:''}<p>Immediate workshop results; not proof of retained learning. This report contains no answer key.</p>`;
  document.body.appendChild(o);window.print();
 }
 const priorRender=render;
 render=function(scroll=false){priorRender(scroll);addPrintButton()};addPrintButton();
 const css=document.createElement('style');css.textContent='.rz-sim02-print-only{display:none}@media print{body>#rzSim02Printable{display:block!important;font:10pt/1.45 Arial,sans-serif;color:#173347}body>.topbar,body>#app,body>.watermark,body>.toast{display:none!important}#rzSim02Printable table{width:100%;border-collapse:collapse;font-size:8.5pt}#rzSim02Printable th,#rzSim02Printable td{border:1px solid #c5d5dc;padding:7px;vertical-align:top;overflow-wrap:break-word}#rzSim02Printable h2{margin-top:20px;page-break-after:avoid}#rzSim02Printable section{break-inside:avoid}}';document.head.appendChild(css);
})();