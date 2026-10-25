/* RizSim V15: secure session selection and floating live management.
   All authorizations and writes are enforced by existing RPCs and V15 migration. */
(()=>{'use strict';
 const $=id=>document.getElementById(id), bridge=()=>window.RizSimFacultyBridge;
 const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;};
 const action=(label,fn,cls)=>{const n=node('button',cls||'rz-v15-button',label);n.type='button';n.addEventListener('click',fn);return n;};
 const contact=()=>window.rizsimSharedAuth;
 let modal=null,manager=null,pill=null,body=null,status=null,codeNode=null,linkNode=null,qrNode=null,pauseButton=null;
 let lastIdentity='',current='',paused=false,expanded=false,changing=false,openedFor='',lastRefresh=0,qrFor='',qrTask=null,dragged=false;
 const isLive=s=>s?.active===true&&['live','both'].includes(s.access_mode)&&(!s.live_ends_at||Date.parse(s.live_ends_at)>Date.now())&&s.session_status!=='closed'&&s.session_status!=='ended';
 const liveRoom=s=>(s?.sessions||[]).filter(isLive).sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')))[0]||null;
 const practiceRoom=s=>(s?.sessions||[]).filter(x=>x.active===true&&
   (x.access_mode==='practice'||(x.access_mode==='both'&&!isLive(x)))&&
   (!x.practice_ends_at||Date.parse(x.practice_ends_at)>Date.now()))
  .sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')))[0]||null;
 const managedRoom=s=>{
   const live=liveRoom(s);if(live)return live;
   const available=(s?.sessions||[]).find(x=>String(x.session_id)===String(openedFor)&&x.active===true&&
     x.access_mode==='practice'&&(!x.practice_ends_at||Date.parse(x.practice_ends_at)>Date.now()));
   return available||practiceRoom(s);
 };
 function tell(text){if(status)status.textContent=text||'';}
 async function copy(value,label){try{if(!value)throw Error('Not yet available');await navigator.clipboard.writeText(value);tell(label+' copied.')}catch(_){tell('Copy manually: '+value)}}
 function invitation(room){return new URL('/access-in.html?session='+encodeURIComponent(room.share_token),location.origin).href;}
 function closeModal(){if(modal){const old=modal;modal=null;old.close();old.remove();}}
 function choose(args){
  const s=bridge()?.getSnapshot();if(!s||!['faculty','course_lead'].includes(s.role))return false;
  const blocked=s.role==='course_lead'?managedRoom(s):null;if(blocked){open();return true;}
  if(modal)closeModal();
  const mode=args.mode,productId=mode==='simulation'?args.selection:args.simulation;
  const licensed=(s.licensed||[]).find(x=>String(x.id)===String(productId)) || (mode==='purchased' ? window.RizSimCourseEnvironment?.runtime?.('purchased',args.selection)?.simulations?.find(x=>String(x.product_id)===String(productId)) : null);
  if(!licensed)return false;
  if(mode==='own' && (s.role!=='course_lead'||!(s.courses||[]).some(c=>String(c.course_id)===String(args.selection)&&c.active)))return false;
  if(!['simulation','own','purchased'].includes(mode))return false;
  modal=node('dialog','rz-v15-choice');const head=node('div','rz-v15-choice-head');
  head.append(node('span','rz-v15-kicker','RIZSIM · CLASSROOM'),action('×',closeModal,'rz-v15-close'));
  const title=node('h2','', 'Run '+String(licensed.title||'simulation'));const p=node('p','', 'Choose how learners will participate. Your class link and code will be ready instantly.');
  const options=node('div','rz-v15-choices');const feedback=node('p','rz-v15-inline-status');feedback.setAttribute('role','status');
  async function start(access){
   if(changing)return;changing=true;options.querySelectorAll('button').forEach(b=>b.disabled=true);feedback.textContent='Preparing your verified session…';
   const owner=bridge()?.getSnapshot()?.userId;
   try{
    const currentScope=bridge()?.getSnapshot();
    const active=currentScope?.role==='course_lead'?managedRoom(currentScope):null;
    if(active)throw Error('End your existing Live Class or Practice assignment before starting another.');
    const begin=new Date();
    const license=(bridge()?.getSnapshot()?.licences||[]).find(l=>String(l.product_id)===String(productId));
    const expiry=Date.parse(license?.expires_at||'');
    let endMs=begin.getTime()+(access==='live'?3:7*24)*3600000;
    if(Number.isFinite(expiry))endMs=Math.min(endMs,expiry-30000);
    if(endMs-begin.getTime()<60000)throw Error('The simulation licence expires too soon to start this session. Renew the licence first.');
    const finish=new Date(endMs);
    const label=[licensed.title||'RizSim simulation',access==='live'?'Live Class':'Practice',begin.toLocaleDateString('en-GB',{timeZone:'Asia/Karachi',day:'2-digit',month:'short'})].join(' · ').slice(0,150);
    const fields={p_product_id:productId,p_class_name:label,p_access_mode:access,
      p_live_starts_at:access==='live'?begin.toISOString():null,p_live_ends_at:access==='live'?finish.toISOString():null,
      p_practice_starts_at:access==='practice'?begin.toISOString():null,p_practice_ends_at:access==='practice'?finish.toISOString():null};
    let result;
    if(mode==='purchased'){const {p_product_id:_unused,...dates}=fields;result=await bridge().runtime.createPurchased(args.selection,productId,dates);}
    else{const request=mode==='own'?{p_course_id:args.selection,...fields}:fields;
      const reply=await contact().rpc(mode==='own'?'create_rizsim_course_classroom_session':'create_rizsim_classroom_session',request);
      if(reply.error)throw Error(reply.error.message);result=Array.isArray(reply.data)?reply.data[0]:reply.data;}
    if(bridge()?.getSnapshot()?.userId!==owner)throw Error('Your account changed. Reopen the course.');
    if(!result?.session_id)throw Error('The server did not confirm the new session.');
    await bridge().runtime.refresh();
    await bridge().selectSession?.(result.session_id);
    if(mode!=='simulation')window.RizSimCourseEnvironment?.invalidate(mode,args.selection);
    closeModal();openedFor=String(result.session_id);expanded=true;
    window.RizSimLiveClassroom?.navigate?.(mode,'running',args.selection,result.session_id,false,mode==='own'?productId:'');
    if(access==='practice'){window.RizSimLiveWorkspace?.select?.('studio');window.RizSimLiveWorkspace?.selectStudio?.('share');}
    draw(true);
   }catch(e){feedback.textContent=e?.message||'This session could not be created. Please retry.';options.querySelectorAll('button').forEach(b=>b.disabled=false);}
   finally{changing=false;}
  }
  // Real, consistent line icons replace the temporary Unicode symbols.
  function sessionIcon(kind){
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
   svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.8');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');svg.classList.add('rz-v16-session-icon');
   const shapes=kind==='live'?
    ['<rect x="3" y="5" width="18" height="13" rx="3"/>','<path d="M8 21h8M12 18v3M9.5 9l5 3-5 3z"/>']:
    ['<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>','<path d="M14 3v6h6M8 13h4M8 17h4M15 16l3-3 2 2-3 3-2 1z"/>'];
   svg.innerHTML=shapes.join('');return svg;
  }
  for(const [kind,label] of [['live','Live Session'],['practice','Practice Session']]){
   const choice=action('',()=>start(kind),'rz-v15-choice-option is-'+kind);
   choice.append(sessionIcon(kind),node('span','rz-v16-session-label',label));
   choice.setAttribute('aria-label',label);options.append(choice);
  }
  modal.append(head,title,p,options,feedback);document.body.append(modal);
  const thisModal=modal;modal.addEventListener('close',()=>{thisModal.remove();if(modal===thisModal)modal=null;},{once:true});
  modal.showModal();modal.querySelector('.is-live')?.focus({preventScroll:true});
  return true;
 }
 function qr(room){if(!qrNode)return;const link=invitation(room);if(qrFor===link)return;qrFor=link;qrNode.replaceChildren(node('span','','Loading QR…'));
  const paint=()=>{if(!qrNode||qrFor!==link||!qrNode.isConnected)return;try{qrNode.replaceChildren(window.RizSimQR.svg(link,'Scan to join this RizSim class'));}catch(_){qrNode.textContent='Use the link or code to join.'}};
  if(window.RizSimQR){paint();return;}
  if(!qrTask){qrTask=new Promise((res,rej)=>{let script=document.createElement('script');script.src='/rizsim-qr.js';script.onload=res;script.onerror=rej;document.head.append(script);});}
  qrTask.then(paint).catch(()=>{if(qrNode&&qrFor===link)qrNode.textContent='QR is unavailable. Use the link.'});
 }
 function initManager(){
   if(manager)return;
   manager=node('section','rz-v15-manager');manager.hidden=true;manager.setAttribute('aria-label','Live Class controls');
   pill=action('',()=>{if(dragged){dragged=false;return;}expanded=true;draw(true)},'rz-v15-pill');pill.setAttribute('aria-label','Manage live session');
   const dot=node('span','rz-v15-live-dot');dot.setAttribute('aria-hidden','true');pill.append(dot,node('span','', 'Manage Live Session'));
   const pane=node('section','rz-v15-manager-pane'),header=node('header','rz-v15-manager-head');
   const heading=node('div');heading.append(node('span','rz-v15-kicker','LIVE CLASSROOM'),node('strong','', 'Manage Live Session'));
   header.append(heading,action('−',()=>{expanded=false;draw(true)},'rz-v15-minimize'));pane.append(header);
   const title=node('p','rz-v15-session-label');title.id='rzV15SessionLabel';pane.append(title);
   const inner=node('div','rz-v15-manager-body');const qrBox=node('div','rz-v15-manager-qr');
   qrNode=node('div','rz-v15-qr');qrBox.append(qrNode,node('small','','Scan to join'));
   const share=node('div','rz-v15-manager-share');
   const c=node('div','rz-v15-share-line');c.append(node('span','','Class code'));codeNode=node('strong','rz-v15-share-text');
   c.append(codeNode,action('Copy',()=>copy(codeNode.textContent,'Class code'),'rz-v15-copy'));const l=node('div','rz-v15-share-line');l.append(node('span','','Join link'));linkNode=node('span','rz-v15-share-link','');
   l.append(linkNode,action('Copy',()=>copy(linkNode.dataset.url||'','Join link'),'rz-v15-copy'));
   share.append(c,l);inner.append(qrBox,share);pane.append(inner);
   const controls=node('div','rz-v15-manager-actions');
   pauseButton=action('Pause Session',togglePause,'rz-v15-button rz-v15-pause');
   const end=action('End Session',async()=>{
    if(changing||!current)return;
    const id=current;changing=true;end.disabled=true;
    try{await bridge()?.runtime?.close(id);await bridge()?.runtime?.refresh();draw(true);}
    catch(e){tell(e?.message||'Unable to end session.');}
    finally{changing=false;end.disabled=false;}
   },'rz-v15-button rz-v15-end');controls.append(pauseButton,end);pane.append(controls);
   status=node('p','rz-v15-manager-status');status.setAttribute('role','status');pane.append(status);
   manager.append(pill,pane);document.body.append(manager);
   // V15.4: neither Live nor Practice management is draggable.
   // The compact Practice access button sits in its own stationary row
   // beneath the classroom session panel, without a floating overlay.
 }
 async function togglePause(){
   if(changing||!current)return;
   const id=current;changing=true;pauseButton.disabled=true;tell('Syncing classroom…');
   try{const result=await contact().rpc('set_rizsim_presenter_paused',{p_session_id:id,p_paused:!paused});
      if(result.error)throw Error(result.error.message);
      if(current===id){paused=!paused;setPausedUI();tell(paused?'Presenter paused this class. All Student progress is preserved.':'Class resumed. Students may continue.');}}
   catch(e){tell(e?.message||'Could not change the session state.');}
   finally{changing=false;pauseButton.disabled=false;}
 }
 function setPausedUI(){if(!manager)return;manager.classList.toggle('is-paused',paused);pauseButton.textContent=paused?'Resume Session':'Pause Session';pill.setAttribute('aria-label',paused?'Manage paused session':'Manage live session');pill.querySelector('.rz-v15-live-dot')?.setAttribute('title',paused?'Paused':'Live');}
 async function readState(roomId){
  if(!contact()||Date.now()-lastRefresh<4000)return;lastRefresh=Date.now();
  try{const r=await contact().rpc('get_rizsim_presenter_state',{p_session_id:roomId});
    if(r.error||current!==roomId)return;const row=Array.isArray(r.data)?r.data[0]:r.data;
    if(row){paused=!!row.presenter_paused;setPausedUI();}}
  catch(_){/* Keep the last confirmed state and retry. */}
 }
 function open(){initManager();expanded=true;draw(true);}
 function draw(force=false){
  const s=bridge()?.getSnapshot(),visible=s&&['faculty','course_lead'].includes(s.role)&&$('authenticatedApp')?.classList.contains('show');
  if(!visible){if(manager)manager.hidden=true;current='';lastIdentity='';return;}
  const identity=String(s.userId),room=managedRoom(s);initManager();
  if(identity!==lastIdentity){current='';lastIdentity=identity;paused=false;if(openedFor!==String(room?.session_id||'')){openedFor='';expanded=false;}}
  if(!room){manager.hidden=true;current='';return;}
  const id=String(room.session_id),isNew=id!==current;
  if(isNew){current=id;paused=false;lastRefresh=0;expanded=openedFor===id;qrFor='';tell('');}
  manager.hidden=false;
  const practice=room.access_mode==='practice'||(room.access_mode==='both'&&!isLive(room));
  manager.classList.toggle('is-practice',practice);
  // Practice controls are in document flow, immediately after the existing
  // classroom session panel. Live controls retain their established location.
  const section=$('view-classroom');
  const anchor=section?.querySelector('.rz-live-shell')||section?.querySelector('.content-shell');
  if(practice&&anchor&&manager.parentElement!==anchor)anchor.append(manager);
  else if(!practice&&manager.parentElement!==document.body)document.body.append(manager);
  manager.setAttribute('aria-label',practice?'Practice assignment controls':'Live Class controls');
  manager.querySelector('.rz-v15-manager-head .rz-v15-kicker').textContent=practice?'PRACTICE ASSIGNMENT':'LIVE CLASSROOM';
  manager.querySelector('.rz-v15-manager-head strong').textContent=practice?'Manage Practice':'Manage Live Session';
  pill.querySelector('span:last-child').textContent=practice?'Manage Practice':'Manage Live Session';
  pauseButton.hidden=practice;
  if(practice)paused=false;
  manager.classList.toggle('is-minimized',!expanded);
  pill.hidden=expanded;manager.querySelector('.rz-v15-manager-pane').hidden=!expanded;
  manager.querySelector('#rzV15SessionLabel').textContent=room.class_name||room.simulation_title||'Live Class';
  if(room.share_token){codeNode.textContent=room.class_code||'—';linkNode.textContent=invitation(room);linkNode.dataset.url=invitation(room);if(expanded)qr(room);}
  else{codeNode.textContent='Loading…';linkNode.dataset.url='';qrNode?.replaceChildren();}
  setPausedUI();if(!practice)readState(id);
 }
 function hideLegacyAccess(){
   // The authenticated source remains mounted for QR provenance, history and
   // protected results. Only the superseded visual card is removed.
   const panel=$('classroomCreatedResult')?.closest('.portal-panel');
   if(panel){panel.classList.add('rz-v151-legacy-access-source');panel.setAttribute('aria-hidden','true');}
  }
  function init(){initManager();hideLegacyAccess();window.setInterval(()=>{hideLegacyAccess();draw(false);},2200);draw(true);}
 window.RizSimV15=Object.freeze({choose,open,draw,liveRoom,activeRoom:managedRoom});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
