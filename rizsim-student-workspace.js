/* RizSim V8: student presentation only. Original client, joins, launch and submissions remain authoritative. */
(function(){
 'use strict';
 if(document.body.dataset.rizsimHomePortal!=='student')return;
 const $=id=>document.getElementById(id), bridge=()=>window.RizSimStudentBridge;
 const paths={
  join:'<rect x="3" y="3" width="18" height="14" rx="2"/><path d="M8 21h8M12 17v4m-2-13 5 3-5 3V8Z"/>',
  library:'<path d="M4 20V5a2 2 0 0 1 2-2h14v17H6a2 2 0 0 1 0-4h14M9 7h6M9 11h6"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  history:'<path d="M3 11a9 9 0 1 1 2.5 7M3 4v7h7M12 7v5l3 2"/>',
  check:'<path d="m6 12 4 4 8-9"/><circle cx="12" cy="12" r="10"/>',
  spark:'<path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3Z"/>',
  file:'<path d="M14 2H5v20h14V7l-5-5ZM14 2v6h5M8 12h8M8 16h8"/>',
  link:'<path d="m10 13 4-4M9 16l-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0M15 8l2-2a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0"/>',
  arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
  refresh:'<path d="M20 7a9 9 0 0 0-15-2L2 8m0-6v6h6M4 17a9 9 0 0 0 15 2l3-3m0 6v-6h-6"/>',
  lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
  warning:'<path d="m12 3 10 18H2L12 3ZM12 9v5M12 17h.01"/>',
  x:'<path d="m6 6 12 12M6 18 18 6"/>'
 };
 function icon(name){const n=document.createElement('span');n.className='rz-st-icon';n.setAttribute('aria-hidden','true');n.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(paths[name]||paths.library)+'</svg>';return n;}
 function el(tag,cls,copy){const n=document.createElement(tag);if(cls)n.className=cls;if(copy!==undefined)n.textContent=String(copy??'');return n;}
 function btn(copy,fn,cls='rz-st-button',glyph){const n=el('button',cls);n.type='button';if(glyph)n.append(icon(glyph));n.append(el('span','',copy));if(typeof fn==='function')n.addEventListener('click',fn);return n;}
 function go(view){bridge()?.navigate(view);}
 function closeDrawer(){document.body.classList.remove('sidebar-open');$('siteSidebar')?.setAttribute('aria-hidden','true');$('sidebarOverlay')?.setAttribute('aria-hidden','true');$('sidebarToggle')?.setAttribute('aria-expanded','false');}
 function time(v){const n=Date.parse(v);return Number.isFinite(n)?n:null;}
 function date(v){const n=time(v);return n===null?'Not recorded':new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(n);}
 function progress(v){return Math.max(0,Math.min(100,Number(v)||0));}
 const complete=a=>a.status==='submitted'||!!a.submitted_at;
 let refreshQueued=false;
 let ready=false, identity='', epoch=0, inFlight=null, data=null, error='', lastFetched=0, baseServer=0, baseMonotonic=0;
 let historyFilter='all', historySearch='', lastPhase='', actionBusy=false, dialogSerial=0, practiceCode='', practiceJoinBusy=false, practiceMessage='';
  let practiceJoinIdentity={name:'',institution:''};
 const now=()=>baseServer ? baseServer+(performance.now()-baseMonotonic):Date.now();
 function heading(target,kicker,title,copy,glyph){const h=el('header','rz-st-heading');const text=el('div');text.append(el('span','rz-st-eyebrow',kicker),el('h1','',title),el('p','',copy));h.append(icon(glyph),text);target.append(h);return h;}
 function empty(target,title,copy,glyph='spark',tone='calm',action){const n=el('div','rz-st-empty '+tone);n.append(icon(glyph),el('h2','',title),el('p','',copy));if(action)n.append(btn(action[0],action[1],'rz-st-button secondary'));target.append(n);return n;}
 function statusBadge(copy,tone){return el('span','rz-st-badge '+(tone||''),copy);}
 function meter(value){const m=el('div','rz-st-meter');m.setAttribute('role','progressbar');m.setAttribute('aria-label','Saved progress');m.setAttribute('aria-valuemin','0');m.setAttribute('aria-valuemax','100');m.setAttribute('aria-valuenow',String(progress(value)));const fill=el('span');fill.style.width=progress(value)+'%';m.append(fill);return m;}
 function dialog(title,copy,glyph='warning'){
  const n=el('dialog','rz-st-dialog');const id='rzStudentDialogTitle'+(++dialogSerial);n.setAttribute('aria-labelledby',id);
  const prev=document.activeElement, close=btn('','', 'rz-st-close');close.setAttribute('aria-label','Close dialog');close.replaceChildren(icon('x'));close.onclick=()=>n.close();
  const h=el('h2','',title);h.id=id;n.append(close,icon(glyph),h,el('p','',copy));document.body.append(n);
  n.addEventListener('close',()=>{n.remove();if(prev?.isConnected)prev.focus({preventScroll:true});},{once:true});n.showModal();close.focus({preventScroll:true});return n;
 }
 function openAccount(){
  closeDrawer();const existing=$('rzStudentAccountDialog');if(existing){existing.showModal();return;}
  const n=el('dialog','rz-st-dialog rz-st-account');n.id='rzStudentAccountDialog';n.setAttribute('aria-label','Your account details');
  const source=$('view-account')?.querySelector('.content-shell');if(!source)return;
  const prev=document.activeElement,close=btn('',()=>n.close(),'rz-st-close','x');close.setAttribute('aria-label','Close account details');n.append(close,source);document.body.append(n);
  n.addEventListener('close',()=>{if(prev?.isConnected)prev.focus({preventScroll:true});});n.showModal();close.focus({preventScroll:true});
 }
 function decorateHome(root){
  const grid=root?.querySelector('.bp-category-grid');if(!grid||grid.dataset.studentV8)return;grid.dataset.studentV8='true';grid.replaceChildren();
  [['Join a class','Enter your Faculty class code or continue a shared invitation.','player','join'],['Simulation Library','Your simulations and available learning resources, together.','resources','library']].forEach(([title,copy,view,glyph],i)=>{
   const a=el('a','bp-category-tile rz-st-home-tile tone-'+i);a.href='access-in.html#'+view;a.dataset.studentHomeView=view;
   const ic=icon(glyph);ic.classList.add('bp-category-icon');const t=el('span');t.append(el('strong','',title),el('small','',copy));const arrow=icon('arrow');arrow.classList.add('bp-category-arrow');a.append(ic,t,arrow);
   a.addEventListener('click',event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();event.stopImmediatePropagation();go(view);});grid.append(a);
  });
  const style=el('style');style.textContent='.bp-home .bp-category-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.rz-st-home-tile .bp-category-icon svg{width:24px;height:24px}.rz-st-home-tile.tone-0{background:#e9f4ee}.rz-st-home-tile.tone-1{background:#f0edf9}.rz-st-home-tile .bp-category-arrow svg{width:22px;height:22px}@media(max-width:680px){.bp-home .bp-category-grid{grid-template-columns:1fr}}';root.append(style);
 }
 function setupSidebar(){
  const side=$('siteSidebar')?.querySelector('.rz-side-main');if(!side)return;
  const library=side.querySelector('[data-rz-library]');if(library){library.querySelector('strong').textContent='Simulation Library';library.querySelector('small').textContent='Simulations and learning resources';}
  if(!side.querySelector('[data-rz-student-history]')){
   const a=el('a','rz-library-entry rz-st-history-entry');a.href='#learning';a.dataset.rzStudentHistory='';const t=el('span','rz-library-entry-text');t.append(el('strong','','My Learning'),el('small','','Your interaction history and progress'));a.append(icon('history'),t,icon('arrow'));a.addEventListener('click',e=>{e.preventDefault();go('learning');});side.append(a);
  }
 }
 function phase(a){
  if(complete(a))return 'submitted';
  if(!['open','scheduled'].includes(a.practice_state))return a.practice_state||'unavailable';
  const start=time(a.practice_starts_at),end=time(a.practice_access_ends_at);
  if(start===null||end===null||end<=now())return 'expired';
  if(start>now())return 'scheduled';
  return a.can_practice || a.practice_state==='scheduled' ? 'open':'unavailable';
 }
 function remaining(ms){const s=Math.max(0,Math.floor(ms/1000)),d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60);return (d?d+'d ':'')+String(h).padStart(2,'0')+'h '+String(m).padStart(2,'0')+'m '+String(s%60).padStart(2,'0')+'s';}
 function tick(){
  if(!data||document.hidden)return;
  document.querySelectorAll('[data-practice-countdown]').forEach(n=>{const at=time(n.dataset.practiceCountdown);n.textContent=at===null?'Time unavailable':remaining(at-now());});
  const next=(data.attempts||[]).map(a=>a.id+':'+phase(a)).join('|');
  if(next!==lastPhase){lastPhase=next;renderPractice();}
 }
 function stateGate(target){
  if(error){empty(target,'Your learning could not be refreshed','Nothing has been marked complete. Check your connection and try again.','warning','warning',['Try again',()=>refresh(true)]);return true;}
  if(!data){empty(target,'Loading your learning','Checking your account and classroom access.','clock');return true;}
  return false;
 }
 function toolbarRefresh(){const b=btn('Refresh',()=>refresh(true),'rz-st-button quiet','refresh');b.disabled=!!inFlight;return b;}
 function renderPractice(){
  const target=$('rzStudentPractice');if(!target)return;target.replaceChildren();
  const h=heading(target,'PRACTICE','A little practice. A lasting difference.','Practice from classes you have joined. Availability is checked again before you continue.','clock');h.append(toolbarRefresh());
  // Persistent entry form: adding one class never removes the ability to add another.
  const joinForm=el('form','rz-v15-practice-join'),label=el('label','','ADD A PRACTICE CLASS'),input=el('input');
  const snapProfile=bridge()?.snapshot()?.profile||{};
  const identityName=el('input'),identityInstitution=el('input');
  identityName.type='text';identityName.maxLength=120;identityName.required=true;identityName.autocomplete='name';identityName.placeholder='Your name';identityName.setAttribute('aria-label','Your name');
  identityInstitution.type='text';identityInstitution.maxLength=180;identityInstitution.required=true;identityInstitution.autocomplete='organization';identityInstitution.placeholder='Your institution';identityInstitution.setAttribute('aria-label','Your institution');
  identityName.value=practiceJoinIdentity.name||snapProfile.display_name||'';identityInstitution.value=practiceJoinIdentity.institution||'';
  identityName.addEventListener('input',()=>{practiceJoinIdentity.name=identityName.value;});
  identityInstitution.addEventListener('input',()=>{practiceJoinIdentity.institution=identityInstitution.value;});
  input.type='text';input.maxLength=8;input.autocomplete='off';input.placeholder='Enter Faculty code';input.setAttribute('aria-label','Faculty Practice class code');input.value=practiceCode;
  input.addEventListener('input',()=>{practiceCode=input.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);input.value=practiceCode;});
  const join=btn(practiceJoinBusy?'Joining…':'Add Practice',null,'rz-st-button secondary','join');join.type='submit';join.disabled=practiceJoinBusy;
  const note=el('p','rz-v15-practice-message',practiceMessage);note.setAttribute('role','status');
  joinForm.append(label,input,identityName,identityInstitution,join,note);
  joinForm.addEventListener('submit',async e=>{
    e.preventDefault();if(practiceJoinBusy)return;practiceJoinBusy=true;practiceMessage='Verifying your class…';renderPractice();
    try{const result=await bridge().joinPracticeCode(practiceCode,{name:identityName.value.trim(),institution:identityInstitution.value.trim()});
      if(!result?.attempt_id)throw Error('This Practice assignment was not verified.');
      practiceCode='';practiceMessage='Practice added. Enter another code whenever you like.';await refresh(true);
    }catch(err){practiceMessage=err?.message||'This code could not be joined. Please retry.';}
    finally{practiceJoinBusy=false;renderPractice();}
  });
  target.append(joinForm);
  if(stateGate(target))return;
  const all=(data.attempts||[]).filter(a=>a.has_practice), active=all.filter(a=>['open','scheduled'].includes(phase(a))).sort((a,b)=>(time(a.practice_access_ends_at)||0)-(time(b.practice_access_ends_at)||0));
  const done=all.filter(complete), unavailable=all.filter(a=>!complete(a)&&!['open','scheduled'].includes(phase(a)));
  if(!active.length){
   if(!all.length)empty(target,"You're all caught up for now",'No practice sessions are available yet. Join a class using your Faculty code; practice shared with that class will appear here.','spark','calm',['Join a class',()=>go('player')]);
   else if(done.length===all.length)empty(target,'Practice complete. Well done.','All your listed practice work has been submitted. Your saved interaction history is available in My Learning.','check','success',['View My Learning',()=>go('learning')]);
   else empty(target,'No open practice right now','Some practice windows have ended or access is unavailable. Unsubmitted work has not been marked complete.','clock','calm',['View My Learning',()=>go('learning')]);
  }else{
   const list=el('div','rz-st-practice-list');target.append(list);
   active.forEach(a=>{
    const scheduled=phase(a)==='scheduled',card=el('article','rz-st-practice-card');card.dataset.practiceAttempt=a.id;
    const left=el('div','rz-st-practice-copy');left.append(statusBadge(scheduled?'Opens soon':'Ready to practice',scheduled?'scheduled':'open'),el('h2','',a.title||'RizSim Simulation'),el('p','',a.class_name||'Faculty classroom'));
    if(a.course_title)left.append(el('span','rz-st-meta',a.course_title));left.append(meter(a.progress_percent));
    const timing=el('div','rz-st-timing');timing.append(el('span','rz-st-eyebrow',scheduled?'OPENS IN':'TIME REMAINING'));
    const clock=el('strong','rz-st-countdown');clock.dataset.practiceCountdown=scheduled?a.practice_starts_at:a.practice_access_ends_at;clock.textContent=remaining((time(clock.dataset.practiceCountdown)||now())-now());timing.append(clock,el('span','rz-st-meta','Ends '+date(a.practice_access_ends_at)));
    const run=btn(scheduled?'Not open yet':(progress(a.progress_percent)>0?'Continue practice':'Open practice'),()=>openPractice(a.id),'rz-st-button','arrow');run.disabled=scheduled||!!error||actionBusy;
    card.append(left,timing,run);list.append(card);
   });
  }
  // Faculty resources are scoped to each joined Practice assignment.
  // They remain reachable beside that Practice card, never in the independent Library.
  const snap=bridge()?.snapshot();
  if(snap?.materials?.length){
    for(const attempt of all){
      const card=target.querySelector('[data-practice-attempt="'+attempt.id+'"]');
      if(!card)continue;
      const resources=snap.materials.filter(m=>m.course_id===attempt.course_id||m.course_id===attempt.classroom_session_id);
      if(!resources.length)continue;
      const block=el('details','rz-v154-practice-resources');
      const summary=el('summary','','Shared class resources ('+resources.length+')');
      block.append(summary);
      const grid=el('div','rz-st-resource-grid');
      resources.forEach(m=>grid.append(materialCard(m)));
      block.append(grid);card.after(block);
    }
  }
  if(done.length&&active.length)target.append(el('p','rz-st-support',done.length+' submitted practice '+(done.length===1?'session':'sessions')+' saved in My Learning.'));
  if(unavailable.length){const details=el('details','rz-st-archive');details.append(el('summary','',unavailable.length+' unavailable or ended practice '+(unavailable.length===1?'session':'sessions')));unavailable.forEach(a=>{const row=el('div','rz-st-archive-row');row.append(el('span','',a.title+' · '+(a.class_name||'Class')),statusBadge(phase(a)==='expired'?'Window ended':'Access unavailable','closed'));details.append(row);});target.append(details);}
 }
 function showPracticeLaunchDialog(attempt){
  const id=attempt.id, owner=identity,previousFocus=document.activeElement;
  const n=el('dialog','rz-st-dialog rz-st-launch-dialog');
  const titleId='rzStudentPracticeLaunch'+(++dialogSerial);
  n.setAttribute('aria-labelledby',titleId);
  const close=btn('',()=>n.close(),'rz-st-close','x');
  close.setAttribute('aria-label','Close launch confirmation');
  const header=el('div','rz-st-launch-header');
  const marker=icon('join');marker.classList.add('rz-st-launch-mark');
  const copy=el('div');copy.append(statusBadge('PRACTICE READY','open'));
  const title=el('h2','', 'Ready to launch your simulation?');title.id=titleId;
  copy.append(title,el('p','', 'Your saved work stays with you. You can continue where you left off.'));
  header.append(marker,copy);
  const details=el('div','rz-st-launch-details');
  const addDetail=(caption,value)=>{const cell=el('div');cell.append(el('span','',caption),el('strong','',value));details.append(cell);};
  addDetail('SIMULATION',attempt.title||'RizSim Simulation');
  addDetail('CLASS',attempt.class_name||'Your Faculty classroom');
  addDetail('SAVED PROGRESS',progress(attempt.progress_percent)+'%');
  addDetail('PRACTICE CLOSES',date(attempt.practice_access_ends_at));
  const timing=el('p','rz-st-launch-countdown');
  timing.append(icon('clock'),el('span','', 'Time remaining: '));
  const countdown=el('strong');countdown.dataset.practiceCountdown=attempt.practice_access_ends_at;
  countdown.textContent=remaining((time(attempt.practice_access_ends_at)||now())-now());timing.append(countdown);
  const note=el('p','rz-st-launch-note','Your Faculty controls the practice deadline. Launching does not reset answers or create another attempt.');
  const feedback=el('p','rz-st-launch-feedback');
  feedback.setAttribute('role','alert');feedback.hidden=true;
  const actions=el('div','rz-st-launch-actions');
  const cancel=btn('Not now',()=>n.close(),'rz-st-button quiet');
  const launch=btn('Launch simulation',null,'rz-st-button','arrow');
  actions.append(cancel,launch);
  n.append(close,header,details,timing,note,feedback,actions);
  document.body.append(n);
  n.addEventListener('cancel',e=>{if(actionBusy)e.preventDefault();});
  n.addEventListener('close',()=>{n.remove();if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});},{once:true});
  n.showModal();launch.focus({preventScroll:true});
  launch.addEventListener('click',async()=>{
   if(actionBusy||!n.open)return;
   // Open synchronously on the learner's click to avoid browser popup blockers.
   try{const tab=window.open('about:blank','_blank');
    if(tab){tab.document.title='Opening RizSim Practice…';tab.document.body.textContent='Verifying your Practice access…';window.__rzV154RunnerTab=tab;}
   }catch(_){}
   actionBusy=true;launch.disabled=true;cancel.disabled=true;close.disabled=true;renderPractice();
   feedback.hidden=true;
   launch.querySelector('span:last-child').textContent='Verifying access…';
   try{
    await refresh(true);
    if(identity!==owner||!n.open)throw new Error('Your account changed. Open Practice again.');
    if(error)throw new Error('Practice access could not be checked. Please retry.');
    const current=data?.attempts.find(x=>x.id===id);
    if(!current||phase(current)!=='open')throw new Error('This practice session is no longer available for launch.');
    const result=await bridge().practice(id);
    if(String(result?.attempt_id)!==String(id))throw new Error('The server did not confirm this saved attempt.');
    await refresh(true);
    if(identity!==owner||!n.open||error)throw new Error('Practice could not be verified after resuming.');
    const fresh=data?.attempts.find(x=>x.id===id);
    if(!fresh||phase(fresh)!=='open'||complete(fresh))throw new Error('This practice session is no longer open.');
    await bridge().launchPractice(id);
   }catch(e){
    // No orphaned "Verifying Practice" browser tab after a failed access
    // check. Successful launches clear this handle inside the bridge.
    const pending=window.__rzV154RunnerTab;
    window.__rzV154RunnerTab=null;
    try{if(pending&&!pending.closed)pending.close();}catch(_){}
    if(n.open){feedback.textContent=e?.message||'Unable to launch practice. Please retry.';feedback.hidden=false;}
   }finally{
    actionBusy=false;launch.disabled=false;cancel.disabled=false;close.disabled=false;
    if(n.open)launch.querySelector('span:last-child').textContent='Launch simulation';
    renderPractice();
   }
  });
 }
 async function openPractice(id){
  if(actionBusy)return;actionBusy=true;renderPractice();
  try{
   await refresh(true);if(error)throw new Error('Practice could not be verified. Please retry.');
   const a=data?.attempts.find(x=>x.id===id);
   if(!a||phase(a)!=='open'||complete(a))throw new Error('This Practice is no longer available.');
   // The Practice card must first open its existing on-website confirmation.
   // Only a real click on "Launch simulation" may synchronously reserve the
   // new browser tab; otherwise async RPC checks trigger popup blocking and
   // remove the Student from the website/resources view.
   showPracticeLaunchDialog(a);
  }catch(e){dialog('Practice is not available',e.message);}
  finally{actionBusy=false;renderPractice();}
 }
 async function openRecord(id){
  if(actionBusy)return;actionBusy=true;
  try{await refresh(true);if(error)throw new Error('Your saved session could not be verified.');const a=data?.attempts.find(x=>x.id===id);if(!a)throw new Error('This session is not in your learning record.');if(!a.class_code){go('learning');return;}await bridge().openAttempt(a);}
  catch(e){dialog('Unable to open class',e.message);}finally{actionBusy=false;}
 }
 function renderHistory(){
  const target=$('rzStudentHistory');if(!target)return;const focused=document.activeElement?.id==='rzHistorySearch',cursor=focused?document.activeElement.selectionStart:0;target.replaceChildren();
  const h=heading(target,'MY LEARNING','Every interaction, a step forward.','Your saved class interactions, progress and submissions. Review completed sessions or pick up where you left off.','history');h.append(toolbarRefresh());
  if(stateGate(target))return;
  const arr=data.attempts||[],done=arr.filter(complete).length;
  const stats=el('div','rz-st-summary');[[arr.length,'Class interactions'],[arr.length-done,'In progress'],[done,'Submitted']].forEach(([v,label])=>{const n=el('div');n.append(el('strong','',v),el('span','',label));stats.append(n);});target.append(stats);
  const bar=el('div','rz-st-history-tools');const search=el('input');search.type='search';search.id='rzHistorySearch';search.placeholder='Find a simulation, class or course';search.setAttribute('aria-label','Search your learning history');search.value=historySearch;search.addEventListener('input',()=>{historySearch=search.value;renderHistory();});bar.append(search);
  const filters=el('div','rz-st-filters');filters.setAttribute('aria-label','Filter learning history');[['all','All'],['active','In progress'],['submitted','Submitted']].forEach(([value,copy])=>{const b=btn(copy,()=>{historyFilter=value;renderHistory();},'rz-st-filter');b.setAttribute('aria-pressed',String(historyFilter===value));filters.append(b);});bar.append(filters);target.append(bar);
  const needle=historySearch.trim().toLowerCase();const selected=arr.filter(a=>(historyFilter==='all'||(historyFilter==='submitted'?complete(a):!complete(a)))&&[a.title,a.class_name,a.course_title].join(' ').toLowerCase().includes(needle));
  if(!selected.length){empty(target,arr.length?'No matching interactions':'Your learning story starts here',arr.length?'Try a different search or filter.':'Join a Faculty class to begin. Your progress and submitted work will be kept here.','history','calm',arr.length?undefined:['Join a class',()=>go('player')]);}
  const list=el('div','rz-st-timeline');target.append(list);
  selected.forEach(a=>{
   const card=el('article','rz-st-history-card');card.dataset.historyAttempt=a.id;card.append(icon(complete(a)?'check':'history'));const main=el('div','rz-st-history-main');
   const top=el('div','rz-st-history-top');top.append(el('h2','',a.title||'RizSim Simulation'),statusBadge(complete(a)?'Submitted':'In progress',complete(a)?'submitted':'open'));main.append(top,el('p','',a.class_name||'Independent learning'));
   if(a.course_title)main.append(el('span','rz-st-meta',a.course_title));main.append(meter(a.progress_percent));
   const bottom=el('div','rz-st-history-bottom');bottom.append(el('span','rz-st-meta',progress(a.progress_percent)+'% saved · '+(a.classroom_access_type==='practice'?'Practice':'Classroom')+' · '+date(a.last_activity_at||a.started_at)));
   const detail=el('details','rz-st-event-detail');detail.append(el('summary','','Interaction details'));[['Joined',a.joined_at],['Started',a.started_at],['Last activity',a.last_activity_at],['Submitted',a.submitted_at]].forEach(([label,value])=>{if(value){const r=el('div');r.append(el('strong','',label),el('time','',date(value)));detail.append(r);}});main.append(bottom,detail);
   if(!complete(a)&&a.class_code)main.append(btn('Open class',()=>openRecord(a.id),'rz-st-button secondary','arrow'));card.append(main);list.append(card);
  });
  if(focused){search.focus({preventScroll:true});try{search.setSelectionRange(cursor,cursor);}catch(_){}}
 }
 async function openMaterial(id){
  const materialUser=bridge()?.snapshot().userId,materialEpoch=epoch;if(!materialUser)return;
  const tab=window.open('about:blank','_blank');if(tab)tab.opener=null;
  try{
   const m=await bridge().material(id);if(materialEpoch!==epoch||materialUser!==bridge()?.snapshot().userId){tab?.close();return;}let url;
   if(m.source_type==='file')url=new URL('/course-material-viewer.html?material='+encodeURIComponent(id),location.origin);
   else{url=new URL(m.external_url);if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw new Error('This resource has an invalid web address.');}
   if(tab)tab.location.replace(url.href);else{const n=dialog('Your resource is ready','Your browser blocked the new window. Use the link below.','link'),a=el('a','rz-st-button','Open resource');a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';n.append(a);}
  }catch(e){tab?.close();if(materialEpoch!==epoch||materialUser!==bridge()?.snapshot().userId)return;dialog('Resource unavailable',e.message);await bridge().refresh();renderMaterials();}
 }
 function materialCard(m){const n=el('article','rz-st-resource-card');n.append(icon(m.source_type==='file'?'file':'link'));const text=el('div');text.append(el('h3','',m.title||'Learning resource'),el('p','',m.description||m.file_name||'Published by your Faculty'),el('span','rz-st-meta',m.course_title||'Class resource'));n.append(text,btn(m.source_type==='file'?'Open in RizSim':'Open link',()=>openMaterial(m.material_id),'rz-st-button secondary'));return n;}
 function renderMaterials(){
  const snap=bridge()?.snapshot();if(!snap?.userId)return;
  for(const id of ['rzStudentLibraryMaterials','rzStudentPlayerMaterials','rzV154SessionResourceList']){
   const target=$(id);if(!target)continue;target.replaceChildren();
   const selected=id.includes('Player')||id==='rzV154SessionResourceList',a=data?.attempts.find(x=>x.classroom_session_id===snap.resolved?.session_id);
   if(selected&&!a){target.hidden=true;continue;}target.hidden=false;
   const title=el('div','rz-st-section-title');title.append(icon('file'),el('h2','','Class resources'));target.append(title);
   if(snap.errors.materials){empty(target,'Resources could not be refreshed','Your access has not changed. Refresh to try again.','warning','warning',['Refresh resources',()=>bridge().refresh().then(renderMaterials)]);continue;}
   const materials=selected?snap.materials.filter(m=>m.course_id===a.course_id||m.course_id===a.classroom_session_id):snap.materials;
   if(!materials.length){target.append(el('p','rz-st-support','No published class resources are available in your current access window.'));continue;}
   const grid=el('div','rz-st-resource-grid');materials.forEach(m=>grid.append(materialCard(m)));target.append(grid);
  }
 }
 function renderLibrary(){
  // V15.3: this is a forthcoming *independent* learning collection.
  // Joined classroom simulations belong to Player / Practice / My Learning;
  // no authenticated attempt, class resource or licensed item is promoted here.
  const target=$('rzStudentSimulationLibrary');if(!target)return;
  if(target.dataset.rzV153Advert==='ready'&&target.querySelector('.rz-v153-library-category'))return;
  target.dataset.rzV153Advert='ready';
  target.replaceChildren();target.className='rz-v153-library-advert';
  const lead=el('div','rz-v153-library-lead');
  lead.append(el('span','rz-v153-library-badge','A NEW WORLD OF INDEPENDENT LEARNING'),
    el('h2','','Learn independently. Discover what comes next.'),
    el('p','','Explore a new collection designed for learners who want to discover, practice and apply ideas at their own pace — no Faculty classroom invitation required.'));
  target.append(lead);
  const categories=el('div','rz-v153-library-categories');
  for(const [glyph,label,title,description] of [
    ['spark','01 · LEARN BY DOING','Independent Simulations','Play, choose and reflect in self-paced simulations created for individual learners.'],
    ['book','02 · READ AND EXPLORE','eBooks','Read thoughtfully curated digital titles whenever you want to deepen your understanding.'],
    ['file','03 · PRACTICE AND APPLY','Learning Resources','Discover guides, activities and practical materials for your own learning journey.'],
    ['library','04 · LEARN YOUR WAY','Self-Paced Courses','Follow structured learning experiences independently, at a rhythm that works for you.']
  ]){
    const card=el('article','rz-v153-library-category');
    card.append(icon(glyph),el('span','rz-v153-library-label',label),
      el('h3','',title),el('p','',description),el('span','rz-v153-library-soon','COMING SOON'));
    categories.append(card);
  }
  target.append(categories);
  const info=el('aside','rz-v153-library-classroom');
  const text=el('div');text.append(el('strong','','Joining a Faculty class?'),
    el('p','','Classroom simulations remain available through your Faculty QR invitation or class code in RizSimulation Player. Practice assignments remain in Practice; saved results remain in My Learning.'));
  info.append(icon('join'),text,btn('Open RizSimulation Player',()=>go('player'),'rz-st-button secondary','join'));
  target.append(info);
 }
 function decoratePlayer(){
  const target=$('view-player');if(!target||target.dataset.studentV8)return;target.dataset.studentV8='true';
  const h=target.querySelector('.student-heading');h.classList.add('rz-st-heading');h.prepend(icon('join'));
  const entry=target.querySelector('.player-entry');entry.prepend(icon('join'));
  const help=el('div','rz-st-player-hint');help.append(icon('lock'),el('p','','Your class code is checked securely. Your progress stays with your account.'));entry.append(help);
  const materials=el('section','rz-st-materials');materials.id='rzStudentPlayerMaterials';materials.hidden=true;target.querySelector('.content-shell').append(materials);
 }
 function render(){if(!ready)return;renderPractice();renderHistory();renderLibrary();renderMaterials();}
 function attemptRevision(rows){return (rows||[]).map(a=>[a.id,a.status,progress(a.progress_percent),a.classroom_access_type||'',time(a.last_activity_at)||0,time(a.submitted_at)||0].join('|')).sort().join(';');}
 async function refresh(force=false){
  const snap=bridge()?.snapshot();if(!snap?.userId||snap.profile?.account_status!=='active')return;
  if(identity!==snap.userId){clear();identity=snap.userId;}
  if(inFlight){if(force)refreshQueued=true;return inFlight;}if(!force&&Date.now()-lastFetched<15000)return;
  const myEpoch=epoch,who=identity;error='';
  inFlight=(async()=>{try{
   const result=await bridge().workspace();
   if(myEpoch!==epoch||who!==bridge()?.snapshot().userId)return;
   if(!result||!Array.isArray(result.attempts)||time(result.server_time)===null)throw new Error('The learning response could not be verified.');
   data=result;baseServer=time(result.server_time);baseMonotonic=performance.now();lastFetched=Date.now();
  }catch(e){if(myEpoch===epoch)error=e.message||'Unable to load learning';}
  finally{if(myEpoch===epoch){inFlight=null;render();if(refreshQueued){refreshQueued=false;queueMicrotask(()=>refresh(true));}}}})();
  render();return inFlight;
 }
 function clear(){epoch++;refreshQueued=false;identity='';data=null;inFlight=null;error='';lastFetched=0;baseServer=0;baseMonotonic=0;historySearch='';historyFilter='all';lastPhase='';actionBusy=false;practiceCode='';practiceMessage='';practiceJoinBusy=false;practiceJoinIdentity={name:'',institution:''};
  document.querySelectorAll('.rz-st-dialog[open]').forEach(n=>n.close());
  for(const id of ['rzStudentPractice','rzStudentHistory','rzStudentSimulationLibrary','rzStudentLibraryMaterials','rzStudentPlayerMaterials'])$(id)?.replaceChildren();
 }
 function init(){
  if(ready)return;ready=true;setupSidebar();decoratePlayer();
  const learning=$('view-learning').querySelector('.content-shell'),legacy=el('div');legacy.id='rzStudentLegacyLearning';legacy.hidden=true;legacy.inert=true;while(learning.firstChild)legacy.append(learning.firstChild);learning.append(legacy);const history=el('div');history.id='rzStudentHistory';learning.append(history);
  const lib=$('view-resources').querySelector('.content-shell');
  // Preserve the legacy Library data target for existing authenticated modules
  // without showing classroom attempts, class materials, or the old eBook list
  // inside the independent-publication advertisement.
  const librarySource=el('div','rz-v153-library-data-source');
  librarySource.hidden=true;librarySource.inert=true;librarySource.setAttribute('aria-hidden','true');
  const legacyLibraryGrid=$('rzLibraryGrid');
  if(legacyLibraryGrid)librarySource.append(legacyLibraryGrid);
  const title=el('div','rz-v153-library-header');
  heading(title,'RIZSIM INDEPENDENT LIBRARY','Something new is on its way.',
    'Independent simulations, eBooks, learning resources and self-paced courses — designed to explore beyond the classroom.','library');
  const simulations=el('div');simulations.id='rzStudentSimulationLibrary';
  lib.replaceChildren(title,simulations,librarySource);
  // Keep original mounted data targets for legacy renderers, never as public tabs.
  $('view-simulations').setAttribute('inert','');$('view-account').setAttribute('inert','');
  document.addEventListener('click',e=>{if(e.target.closest?.('#siteSidebar [data-rz-account]')){e.preventDefault();e.stopImmediatePropagation();openAccount();}},true);
  window.addEventListener('rizsim:student-ready',()=>refresh(true));
  window.addEventListener('rizsim:student-data',()=>{const snap=bridge()?.snapshot();refresh(!data||attemptRevision(snap?.attempts)!==attemptRevision(data.attempts));renderMaterials();});
  window.addEventListener('rizsim:student-view',()=>{refresh();render();});
  window.addEventListener('rizsim:student-cleared',clear);
  window.addEventListener('pageshow',e=>{if(e.persisted){refresh(true);bridge()?.refresh();}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){refresh(true);bridge()?.refresh();}});
  window.setInterval(tick,1000);
  window.setInterval(()=>{if(!document.hidden&&bridge()?.snapshot().userId){refresh(true);bridge().refresh().catch(()=>{});}},60000);
  // Avoid losing invitation state when Home is loaded after the dashboard.
  if($('rizsimSharedHome')?.shadowRoot)decorateHome($('rizsimSharedHome').shadowRoot);
  render();refresh(true);
 }
 window.RizSimStudentWorkspace=Object.freeze({openAccount,closeDrawer,decorateHome,refresh});
 if(document.readyState==='complete')init();else document.addEventListener('DOMContentLoaded',init,{once:true});
})();
