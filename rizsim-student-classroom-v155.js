/* V15.5 Change 3: unified authenticated Student Classroom. No separate website tabs. */
(()=>{'use strict';
 if(document.body.dataset.rizsimHomePortal!=='student')return;
 const $=id=>document.getElementById(id),bridge=()=>window.RizSimStudentBridge;
 const E=(tag,cls,copy)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(copy!==undefined)x.textContent=String(copy??'');return x};
 const id=v=>String(v||''),safeERP=v=>/^[A-Za-z0-9][A-Za-z0-9._/-]{1,39}$/.test(String(v||'').trim());
 let mode='join',lastRoom='',lastSignature='',ready=false,launching=false,currentUser='',channel=null,erpPreference=null,erpUser='',lastCount=-1,statusError='';
 const element=id=>$(id);
 const snap=()=>bridge()?.snapshot?.()||null;
 function initialize(){
  if(ready)return;const view=$('view-player'),root=view?.querySelector('.content-shell'),layout=view?.querySelector('.player-layout');
  if(!root||!layout||!bridge())return;
  ready=true;
  const tabs=E('div','rz-c155-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','RizSimulation Player');
  for(const [key,label] of [['join','Find a class'],['classroom','Classroom']]){
   const b=E('button','rz-c155-tab',label);b.type='button';b.dataset.classroomTab=key;b.setAttribute('role','tab');b.addEventListener('click',()=>setMode(key));tabs.append(b);
  }
  const classroom=E('section','rz-c155-classroom');classroom.id='rzC155Classroom';classroom.setAttribute('aria-label','Your active classroom');
  root.insertBefore(tabs,layout);root.insertBefore(classroom,layout);
  for(const evt of ['rizsim:student-ready','rizsim:student-data','rizsim:student-view'])window.addEventListener(evt,render);
  // Explicit Find/QR/class-code resolution must reopen Classroom even for the same room.
  window.addEventListener('rizsim:classroom-resolved',()=>{if(sourceInfo()){mode='classroom';lastSignature='';}render();});
  window.addEventListener('rizsim:student-cleared',clear);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshResources();});
  window.addEventListener('focus',()=>refreshResources());
  window.setInterval(()=>{if(!document.hidden)refreshResources();},25000);
  render();
 }
 function setMode(next){if(next==='classroom'&&!snap()?.resolved)return;mode=next;render();}
 function sourceInfo(){const s=snap();return s?.resolved?.session_id?{s,room:s.resolved,attempt:s.joined}:null;}
 function courseResources(s,room){
  if(!s?.joined?.attempt_id)return [];
  const found=(s.attempts||[]).find(x=>id(x.id)===id(s.joined.attempt_id));
  const keys=new Set([room.session_id,s.joined.course_id,found?.course_id,found?.classroom_session_id].filter(Boolean).map(id));
  return(s.materials||[]).filter(x=>keys.has(id(x.course_id))||keys.has(id(x.classroom_session_id))).filter(x=>x.material_id);
 }
 function seenStorage(info){return'rizsim:class-resources-seen:'+info.s.userId+':'+info.room.session_id;}
 function getSeen(info){try{const v=JSON.parse(localStorage.getItem(seenStorage(info))||'[]');return new Set(Array.isArray(v)?v.map(id):[]);}catch(_){return new Set()}}
 function markSeen(all=true,item=''){
  const info=sourceInfo();if(!info)return;
  const keys=getSeen(info);
  for(const x of courseResources(info.s,info.room)){if(all||id(x.material_id)===item)keys.add(id(x.material_id))}
  try{localStorage.setItem(seenStorage(info),JSON.stringify([...keys].slice(-350)));}catch(_){}
  render();broadcastCount();
 }
 function unreadCount(info){const seen=getSeen(info);return courseResources(info.s,info.room).filter(x=>!seen.has(id(x.material_id))).length;}
 function setChannel(room){
  if(room===lastRoom)return;
  channel?.close();channel=null;lastRoom=room;lastCount=-1;
  if(room&&typeof BroadcastChannel==='function'){
   try{channel=new BroadcastChannel('rizsim:classroom:'+room);channel.onmessage=e=>{
    if(e.data?.kind==='resources-request')broadcastCount(true);
    if(e.data?.kind==='open-resources')openResources(room);
   }}catch(_){}
  }
 }
 function broadcastCount(force=false){
  const info=sourceInfo();if(!info||!channel)return;
  const count=unreadCount(info);
  if(!force&&count===lastCount)return;
  lastCount=count;try{channel.postMessage({kind:'resources-count',session:id(info.room.session_id),count});}catch(_){}
 }
 async function refreshResources(){const info=sourceInfo();if(!info||mode!=='classroom'||!$('view-player')?.classList.contains('active'))return;
  try{await bridge().refreshResources();}catch(_){/* Explicit resource controls retain retry. */}
 }
 function statusText(room){return room.live_open===true?'Session Live':room.practice_open===true?'Practice active':'Session not currently open';}
 function render(){
  if(!ready)return;
  const data=snap(),info=sourceInfo(),user=data?.userId||'';
  if(user!==currentUser){currentUser=user;erpPreference=null;erpUser='';statusError='';lastSignature='';lastRoom='';}
  const currentRoom=id(info?.room?.session_id);
  if(info && currentRoom!==lastRoom){setChannel(currentRoom);mode='classroom';statusError='';lastSignature='';void loadERP(user);}
  if(!info){setChannel('');mode='join';}
  const view=$('view-player');view?.classList.toggle('rz-c155-classroom',mode==='classroom'&&!!info);
  const buttons=view?.querySelectorAll('[data-classroom-tab]')||[];
  buttons.forEach(b=>{const selected=b.dataset.classroomTab===mode;b.setAttribute('aria-selected',String(selected));b.disabled=b.dataset.classroomTab==='classroom'&&!info;});
  if(!info||mode!=='classroom')return;
  const {s,room,attempt}=info,resources=courseResources(s,room);
  const product=(s.products||[]).find(p=>id(p.id)===id(room.product_id)),title=room.simulation_title||product?.title||'RizSim simulation';
  const desc=product?.short_description||product?.description||room.class_name||'A guided classroom decision-making activity.';
  const enabled=room.access_status==='open'&&(room.live_open===true||room.practice_open===true)&&attempt?.attempt_id&&!attempt?.submitted_at&&attempt?.attempt_status!=='submitted';
  const signature=JSON.stringify([currentRoom,mode,room.access_status,room.live_open,room.practice_open,attempt?.attempt_id,attempt?.attempt_status,resources.map(x=>[x.material_id,x.title,x.source_type,x.file_name,x.description]),unreadCount(info)]);
  if(signature===lastSignature){broadcastCount();return;}
  lastSignature=signature;
  const root=$('rzC155Classroom');root.replaceChildren();
  const heading=E('div','rz-c155-heading'),titleBox=E('div');
  titleBox.append(E('span','','RIZSIM PLAYER · CLASSROOM'),E('h1','','Your Classroom'));
  heading.append(titleBox);root.append(heading);
  const grid=E('div','rz-c155-grid'),left=E('article','rz-c155-panel'),right=E('article','rz-c155-panel');
  const ltop=E('div','rz-c155-top');ltop.append(E('span','rz-c155-eyebrow','LIVE SIMULATION'));
  const state=E('span','rz-c155-state'+(room.live_open===true||room.practice_open===true?'':' offline'));
  state.append(E('i','rz-c155-dot'),E('span','',statusText(room)));ltop.append(state);
  left.append(ltop,E('h2','',title),E('p','',desc));
  if(room.class_name && room.class_name!==title)left.append(E('p','',room.class_name));
  const start=E('button','rz-c155-start',attempt?.attempt_status==='submitted'?'Submitted': 'Start Simulation ↗');
  start.type='button';start.disabled=!enabled||launching;
  start.addEventListener('click',onStart);left.append(start);
  const status=E('p','rz-c155-status');status.id='rzC155Status';status.setAttribute('role','status');if(statusError){status.textContent=statusError;status.dataset.error='true';}
  if(!enabled&&!statusError)status.textContent=attempt?.attempt_status==='submitted'?'Your submitted response is available in My Learning.':room.access_status!=='open'?'The presenter has not opened this class for participation.':'Classroom access has not yet been confirmed.';
  left.append(status);
  const rtop=E('div','rz-c155-top');rtop.append(E('span','rz-c155-eyebrow','SHARED BY YOUR PRESENTER'),E('span','rz-c155-eyebrow',resources.length+' resources'));right.append(rtop,E('h2','','Class Resources'));
  const list=E('div','rz-c155-resources');list.id='rzC155Resources';
  if(!resources.length){const e=E('div','rz-c155-empty');e.append(E('div','rz-c155-empty-icon','▤'),E('strong','','No resources shared yet'),E('p','','Resources published by your presenter will appear here.'));list.append(e);}
  else for(const m of resources){
   const row=E('article','rz-c155-material'),icon=E('span','rz-c155-material-icon',m.source_type==='file'?(m.mime_type==='application/pdf'?'PDF':'FILE'):'↗');
   const meta=E('div','rz-c155-material-name');meta.append(E('strong','',m.title||'Class resource'),E('small','',m.description||m.file_name||'Published by your presenter'));
   const action=E('button','','Open');action.type='button';action.addEventListener('click',()=>{markSeen(false,id(m.material_id));void openMaterial(m);});
   row.append(icon,meta,action);list.append(row);
  }
  right.append(list);grid.append(left,right);root.append(grid);
  broadcastCount();
 }
 function setStatus(message,error=false){statusError=error?String(message||''):'';const e=$('rzC155Status');if(e){e.textContent=message;e.dataset.error=String(!!error);}}
 async function loadERP(user){if(!user||erpUser===user)return;erpUser=user;erpPreference=null;
  try{const result=await bridge().fetchERP();if(erpUser!==user||snap()?.userId!==user)return;erpPreference=result;}
  catch(_){if(erpUser===user)erpPreference=null;}
 }
 function reserveTab(){
  const tab=window.open('about:blank','_blank');
  if(tab){try{tab.document.title='Opening RizSim simulation…';tab.document.body.textContent='Verifying your classroom access…';}catch(_){}window.__rzV154RunnerTab=tab;}
  return tab;
 }
 async function launchWithERP(erp,remember,stored,dialog,submit){
  if(launching)return;const info=sourceInfo();if(!info)return;
  const popup=reserveTab();
  if(!popup){setStatus('Your browser blocked the simulation window. Allow pop-ups for rizsim.com and try again.',true);return;}
  statusError='';launching=true;if(submit)submit.disabled=true;render();const originalUser=info.s.userId,room=id(info.room.session_id);
  try{
   if(!stored && remember)await bridge().saveERP(erp,true);
   if(!snap()||snap().userId!==originalUser||id(snap().resolved?.session_id)!==room)throw Error('Your Classroom changed. Reopen the simulation.');
   erpPreference={erp_number:erp,remember:!!remember};window.__rzV155ERPConfirmed={user:originalUser,session:room,erp};
   await bridge().startClassroom();
   if(dialog?.open)dialog.close();
  }catch(err){setStatus(err?.message||'Unable to launch simulation.',true);if(dialog?.open){const msg=dialog.querySelector('.rz-c155-error');if(msg)msg.textContent=err?.message||'Please try again.';}
  }finally{
   if(window.__rzV154RunnerTab===popup){window.__rzV154RunnerTab=null;try{popup.close();}catch(_){}}
   launching=false;if(submit)submit.disabled=false;render();
  }
 }
 function onStart(){
  const info=sourceInfo();if(!info||launching||!info.attempt?.attempt_id)return;
  const saved=erpPreference;
  if(saved?.remember&&safeERP(saved.erp_number)){void launchWithERP(saved.erp_number,true,true,null,null);return;}
  const n=E('dialog','rz-c155-erp');n.setAttribute('aria-label','ERP number before simulation');
  const form=E('form','rz-c155-erp-inner');form.method='dialog';form.noValidate=true;
  form.append(E('h2','','Start your simulation'),E('p','','Your Google sign-in identifies you. Enter your ERP number once for this launch.'));
  const label=E('label','','ERP number'),input=E('input');input.type='text';input.maxLength=40;input.required=true;input.autocomplete='off';input.placeholder='Your ERP number';input.value=String(saved?.erp_number||'');label.append(input);form.append(label);
  const option=E('label','rz-c155-remember'),remember=E('input');remember.type='checkbox';option.append(remember,E('span','','Do not ask again on future launches'));form.append(option);
  const err=E('p','rz-c155-error');err.setAttribute('role','alert');form.append(err);
  const buttons=E('div','rz-c155-actions'),cancel=E('button','','Cancel'),launch=E('button','primary','Continue ↗');
  cancel.type='button';launch.type='submit';cancel.addEventListener('click',()=>{if(!launching)n.close();});buttons.append(cancel,launch);form.append(buttons);n.append(form);document.body.append(n);
  n.addEventListener('close',()=>n.remove(),{once:true});
  form.addEventListener('submit',e=>{e.preventDefault();const val=input.value.trim();if(!safeERP(val)){err.textContent='Enter a valid ERP number (2–40 letters, digits or . _ / -).';input.focus();return;}void launchWithERP(val,remember.checked,false,n,launch);});
  n.showModal();input.focus({preventScroll:true});
 }
 async function openMaterial(m){
  const originalUser=snap()?.userId,originalRoom=id(snap()?.resolved?.session_id);
  if(!originalUser||!originalRoom)return;
  const popup=window.open('about:blank','_blank');if(popup)popup.opener=null;
  try{
   const result=await bridge().material(m.material_id);
   if(snap()?.userId!==originalUser||id(snap()?.resolved?.session_id)!==originalRoom){popup?.close();return;}
   let destination;
   if(result.source_type==='file')destination='/course-material-viewer.html?material='+encodeURIComponent(m.material_id);
   else {const url=new URL(result.external_url);if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error('Invalid resource address.');destination=url.href;}
   if(popup)popup.location.replace(destination);else{const a=E('a','','Open class resource');a.href=destination;a.target='_blank';a.rel='noopener noreferrer';$('rzC155Resources')?.append(a);}
  }catch(err){try{popup?.close();}catch(_){}setStatus(err.message||'Unable to open resource.',true);}
 }
 function openResources(session){
  const info=sourceInfo();if(!info||session&&id(info.room.session_id)!==id(session))return false;
  bridge()?.navigate('player');mode='classroom';render();markSeen(true);
  try{window.focus();}catch(_){}
  return true;
 }
 function clear(){
  mode='join';lastSignature='';currentUser='';lastRoom='';lastCount=-1;erpPreference=null;erpUser='';statusError='';channel?.close();channel=null;
  $('view-player')?.classList.remove('rz-c155-classroom');$('rzC155Classroom')?.replaceChildren();
 }
 window.RizSimStudentClassroom=Object.freeze({openResources,render,unread:()=>{const i=sourceInfo();return i?unreadCount(i):0;}});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();
