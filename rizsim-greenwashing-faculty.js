/* Native fourth-simulation Faculty integration. Existing authorization contracts only.
   Live roster/progress: get_my_classroom_session_students (server session scope).
   Detailed analysis: only submitted attempt IDs from that roster, filtered again by
   existing simulation_responses RLS. No raw in-progress data fetch or permission bypass. */
(function(root){'use strict';
const D=root.GreenwashingData,C=root.GreenwashingCore,V=root.GreenwashingViews,E=V.E;
if(!D||!C||!V)return;
const roles=new Set(['owner','faculty','course_lead','institution']),KEY='greenwashing-v1-record';
let host=null,studentHost=null,sessionId='',userId='',sessionName='',roster=[],records=[],error='',loading=false,request=0,timer=null,fetched=0,selected='',search='',filter='all',manual=[],source='session',importMessage='';
const $=id=>document.getElementById(id),str=(v,n=160)=>String(v??'').slice(0,n);
const button=(text,fn,secondary=false)=>{const n=E('button','gw-btn'+(secondary?' secondary':''),text);n.type='button';n.addEventListener('click',fn);return n;};
function match(s,route){
 if(!s?.userId||!roles.has(s.role)||route?.stage!=='running'||!route.session||!$('view-classroom')?.classList.contains('active'))return null;
 const session=(s.sessions||[]).find(x=>String(x.session_id)===String(route.session));
 return session&&[...(s.products||[]),...(s.licensed||[]),...(s.simulations||[])].some(p=>String(p.id||p.product_id)===String(session.product_id)&&p.slug===D.slug)?session:null;
}
function hide(){request++;sessionId='';userId='';roster=[];records=[];manual=[];selected='';source='session';importMessage='';loading=false;clearInterval(timer);timer=null;if(host){host.replaceChildren();host.hidden=true;}if(studentHost){studentHost.replaceChildren();studentHost.hidden=true;}}
function mount(){const anchor=$('rzLiveResultsAnchor'),sa=$('rzV13SimulationStudentResults');if(!anchor||!sa)return false;if(!host){host=E('section','gw-faculty');host.id='rzGreenwashingFacultyAnalytics';host.setAttribute('aria-label','Greenwashing Presenter Dashboard');}if(host.parentNode!==anchor)anchor.append(host);if(!studentHost){studentHost=E('section','gw-faculty');studentHost.id='rzGreenwashingStudentResults';studentHost.setAttribute('aria-label','Greenwashing Live Responses');}if(studentHost.parentNode!==sa)sa.append(studentHost);host.hidden=false;studentHost.hidden=false;return true;}
function draw(s,route){const session=match(s,route);if(!session){if(sessionId)hide();return;}if(!mount())return;
 if(sessionId!==String(session.session_id)||userId!==String(s.userId)){request++;loading=false;sessionId=String(session.session_id);userId=String(s.userId);sessionName=str(session.class_name);roster=[];records=[];manual=[];source='session';importMessage='';selected='';search='';filter='all';error='';render();void refresh();}
 if(!timer)timer=setInterval(()=>{if(sessionId&&!document.hidden&&!host.hidden&&!host.contains(document.activeElement)&&!studentHost.contains(document.activeElement))void refresh();},20000);
}
async function refresh(){
 if(!sessionId||loading)return;loading=true;const token=++request,sid=sessionId,uid=userId;
 try{
  const client=root.rizsimSharedAuth;if(!client)throw Error('Your authenticated Faculty workspace is unavailable.');
  const auth=await client.auth.getUser();if(auth.error||auth.data?.user?.id!==uid)throw Error('Your signed-in account changed. Reopen the authorized Faculty workspace.');
  const response=await client.rpc('get_my_classroom_session_students',{p_session_id:sid});if(response.error)throw Error(response.error.message);
  if(!Array.isArray(response.data))throw Error('The server did not return an authorized session roster.');
  if(response.data.some(x=>String(x.session_id)!==sid))throw Error('The roster did not match the selected session. No records were displayed.');
  const nextRoster=response.data.map(x=>({attempt:str(x.attempt_id,80),name:str(x.student_name||'RizSim Learner',120),status:str(x.attempt_status,32),percent:Math.max(0,Math.min(100,Number(x.progress_percent)||0)),submittedAt:x.submitted_at||null}));
  const submitted=nextRoster.filter(x=>x.status==='submitted').map(x=>x.attempt),responses=[];
  for(let i=0;i<submitted.length;i+=100){const ids=submitted.slice(i,i+100);const res=await client.from('simulation_responses').select('attempt_id,response_data,updated_at').in('attempt_id',ids).eq('question_key',KEY);if(res.error)throw Error(res.error.message);if(!Array.isArray(res.data))throw Error('Response records are unavailable.');responses.push(...res.data);}
  if(token!==request||sid!==sessionId||uid!==userId)return;
  const nextRecords=[],seen=new Set();
  for(const row of responses){const attempt=nextRoster.find(x=>x.attempt===String(row.attempt_id)&&x.status==='submitted'),r=row.response_data?.record;if(!attempt||seen.has(attempt.attempt)||!C.valid(r)||r.stage!=='results'||r.context.attemptId!==attempt.attempt||r.context.sessionId!==sid)continue;seen.add(attempt.attempt);nextRecords.push({attempt:attempt.attempt,name:attempt.name,student:r.student,record:C.clone(r),observations:C.observations(r),submittedAt:attempt.submittedAt});}
  roster=nextRoster;records=nextRecords;error='';fetched=Date.now();
 }catch(e){if(token===request){error=str(e.message||e,600);roster=[];records=[];selected='';}}
 finally{if(token===request){loading=false;render();}}
}
function printReport(node){
 const copy=node.cloneNode(true);copy.querySelectorAll('button,input,select,.gw-roster-toolbar,.gw-offline').forEach(n=>n.remove());copy.querySelectorAll('details').forEach(d=>d.open=true);
 const w=root.open('','_blank');if(!w){root.RizSimUI?.notify('Allow this site to open the print report, then try again.','warning');return;}
 w.document.open();w.document.write('<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>Greenwashing Faculty report | RizSim</title><link rel="stylesheet" href="/rizsim-analytics-v1.css"><link rel="stylesheet" href="/simulation-assets/greenwashing/styles.css"><style>body{font-family:system-ui,sans-serif;padding:20px;max-width:1100px;margin:auto}details{break-inside:auto}.gw-heading{display:block}.rz-a-grid{display:block}.rz-a-panel{margin:12px 0;break-inside:avoid}</style></head><body></body></html>');w.document.close();w.document.body.append(copy);w.opener=null;w.addEventListener('load',()=>{w.focus();w.print();},{once:true});
}
function top(parent,title){const h=E('header','gw-heading'),copy=E('div');copy.append(E('h2','',title),E('p','',sessionName||'Authorized Classroom'));const actions=E('div','gw-actions');const refreshButton=button('Refresh',()=>void refresh(),true);refreshButton.disabled=loading;actions.append(refreshButton,button('Print / Save PDF',()=>printReport(parent),true));h.append(copy,actions);parent.append(h);}
function notes(){const details=E('details','rz-a-support gw-notes');details.append(E('summary','','Faculty debrief and teaching note'));const body=E('div');body.innerHTML=root.GreenwashingTeaching||'';body.querySelectorAll('[id]').forEach(x=>x.removeAttribute('id'));details.append(body,E('p','gw-note','Integration note: the website supplies learner identity and session context. Live progress is available through the authorized roster; detailed scores use submitted records. Final lab mastery is required by the source, so prioritize first-attempt patterns and descriptive corrections. No new causal or psychometric claim is introduced.'));return details;}
function localReview(){const d=E('details','rz-a-support gw-offline');d.append(E('summary','','Offline JSON review (optional)'));d.append(E('p','rz-a-note','Imported files remain in this tab, are never uploaded, and are analyzed separately from the live Classroom. Clearing here never deletes saved learner records.'));const file=E('input');file.type='file';file.multiple=true;file.accept='.json,application/json';file.setAttribute('aria-label','Import completed Greenwashing responses');const msg=E('p','gw-status',importMessage);msg.setAttribute('role','status');
 file.addEventListener('change',async()=>{let n=0,errors=[];for(const f of file.files){try{if(f.size>1000000)throw Error('File exceeds 1 MB');const x=JSON.parse(await f.text()),observations=C.imported(x);const key=x.integration?.attempt_id?str(x.integration.attempt_id,80):[x.student.studentId,x.student.classSection,x.submittedAt].join('|');const revision=Number(x.integration?.sync_revision)||0;const old=manual.find(t=>t.attempt===key);if(old&&old.revision>=revision)continue;manual=manual.filter(t=>t.attempt!==key);manual.push({attempt:key,revision,name:str(x.student.name,120),student:x.student,observations,submittedAt:x.submittedAt});n++;}catch(e){errors.push(f.name+': '+e.message);}}
  importMessage=n+' file(s) accepted.'+(errors.length?' '+errors.join(' | '):'');msg.textContent=importMessage;if(n){source='manual';render();}});
 const actions=E('div','gw-actions');actions.append(button('View imported files ('+manual.length+')',()=>{source='manual';render();},true),button('Return to session data',()=>{source='session';render();},true),button('Clear imported files',async()=>{if(await root.RizSimUI.confirm('Remove only imported files from this browser tab? Saved Classroom responses are unchanged.',{title:'Clear local review?',action:'Clear imported files',cancel:'Keep files',danger:true})){manual=[];source='session';importMessage='Imported files cleared from this tab.';render();}},true));d.append(file,msg,actions);return d;}
function renderRoster(){
 studentHost.replaceChildren();top(studentHost,'Greenwashing | Live Responses');
 if(error){studentHost.append(E('p','gw-status',error));return;}
 const stats=E('div','rz-a-stats');V.stat(stats,'Joined',roster.length,'Authorized roster');V.stat(stats,'In progress',roster.filter(r=>r.status==='in_progress').length,'Saved attempts');V.stat(stats,'Submitted',roster.filter(r=>r.status==='submitted').length,'Server-confirmed');V.stat(stats,'Analyzed',records.length,'Readable validated responses');studentHost.append(stats,E('p','gw-note','Live progress updates every 20 seconds. Detailed answers appear only after submission and only when existing permissions allow them.'));
 const tools=E('div','gw-roster-toolbar'),label=E('label','','Find participant '),input=E('input');input.type='search';input.value=search;input.placeholder='Name';input.setAttribute('aria-label','Search Greenwashing participants');label.append(input);const select=E('select');select.setAttribute('aria-label','Greenwashing response status');[['all','All statuses'],['in_progress','In progress'],['submitted','Submitted']].forEach(([v,l])=>{const o=E('option','',l);o.value=v;o.selected=v===filter;select.append(o);});const count=E('span','gw-status');count.setAttribute('role','status');tools.append(label,select,count);studentHost.append(tools);
 const wrap=E('div','rz-a-table-wrap'),table=E('table','gw-roster-table'),thead=E('thead'),tr=E('tr');['Participant','Progress','Status','Audit','Diagnosis first','Transfer first','Result'].forEach(s=>{const th=E('th','',s);th.scope='col';tr.append(th);});thead.append(tr);table.append(thead);const body=E('tbody');
 roster.forEach(row=>{const rec=records.find(r=>r.attempt===row.attempt),s=rec?C.summarize(rec.observations):null,tr=E('tr');tr.dataset.name=row.name.toLowerCase();tr.dataset.status=row.status;tr.append(E('td','',row.name),E('td','',row.percent+'%'),E('td','',row.status==='submitted'?'Submitted':'In progress'),E('td','',s?V.pct(s.auditAccuracy):'\u2014'),E('td','',s?V.pct(s.modes[0].first):'\u2014'),E('td','',s?V.pct(s.modes[1].first):'\u2014'));const td=E('td');if(rec)td.append(button('View student result',()=>{selected=row.attempt;renderRoster();},true));else td.textContent=row.status==='submitted'?'Not accessible':'Not submitted';tr.append(td);body.append(tr);});table.append(body);wrap.append(table);wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Greenwashing participant responses');studentHost.append(wrap);
 function apply(){search=input.value;filter=select.value;let shown=0;body.querySelectorAll('tr').forEach(tr=>{tr.hidden=!(tr.dataset.name.includes(search.trim().toLowerCase())&&(filter==='all'||tr.dataset.status===filter));if(!tr.hidden)shown++;});count.textContent=shown+' of '+roster.length+' participants';}input.addEventListener('input',apply);select.addEventListener('change',apply);apply();
 if(!roster.length)V.empty(studentHost,loading?'Loading the authorized session roster...':'No learners have joined this session yet.');
 const rec=records.find(r=>r.attempt===selected);if(rec){const individual=E('section','gw-card');individual.id='rzGreenwashingIndividualResult';individual.append(E('h3','',rec.name+' | Read-only result'),button('Close student result',()=>{selected='';renderRoster();},true),V.personal(rec.record));studentHost.append(individual);}
}
function render(){if(!host||!sessionId)return;
 const active=document.activeElement;const focus=active?.getAttribute('aria-label'),range=active?.type==='search'?[active.selectionStart,active.selectionEnd]:null;
 const open=new Set([...host.querySelectorAll('details[open]')].map(d=>d.querySelector('summary')?.textContent));
 host.replaceChildren();top(host,'Greenwashing | Presenter Dashboard');
 if(error){const n=E('p','gw-status',error);n.dataset.tone='error';n.setAttribute('role','alert');host.append(n);renderRoster();return;}
 if(source==='manual')host.append(E('p','gw-note','LOCAL FILE REVIEW - '+manual.length+' imported completed responses. These are not live Classroom records.'));
 const data=source==='manual'?manual:records;host.append(V.report(data,source==='manual'?manual.length:roster.length));
 if(source==='session')host.append(E('p','rz-a-provenance','Source: current authorized session. '+records.length+' analyzed of '+roster.filter(r=>r.status==='submitted').length+' submitted. '+(fetched?'Last refreshed '+new Date(fetched).toLocaleTimeString()+'.':'Loading records...')+' In-progress answers are not requested.'));
 host.append(notes(),localReview());host.querySelectorAll('details').forEach(d=>{if(open.has(d.querySelector('summary')?.textContent))d.open=true;});renderRoster();
 if(focus&&['Search Greenwashing participants','Greenwashing response status'].includes(focus)&&document.activeElement===document.body){const n=[...studentHost.querySelectorAll('[aria-label]')].find(n=>n.getAttribute('aria-label')===focus);if(n?.getClientRects().length){n.focus({preventScroll:true});if(range)n.setSelectionRange(...range);}}
}
root.RizSimGreenwashingFaculty=Object.freeze({draw,refresh,state:()=>({sessionId,joined:roster.length,records:records.length,error,loading})});
})(window);
