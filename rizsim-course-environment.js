/* V6 faculty course environment and shared, two-step resource composer.
   Authorization and publication truth always come from the bounded server adapter. */
(function () {
 'use strict';
 const $=id=>document.getElementById(id), str=v=>String(v??'');
 const cache=new Map();
 let accountKey=null,generation=0;
 function syncIdentity(){
  const s=snapshot(),next=str(s?.userId)+':'+str(s?.role);
  if(accountKey!==next){accountKey=next;generation++;cache.clear();catalogue=[];catalogueState='idle';current=null;
   if(dialog){dialogCancel=null;busy=false;closeDialog();}
   for(const id of ['rzCourseEnvironment','rzStandaloneResources','rzPurchasedSetup']){const n=$(id);if(n){n.replaceChildren();delete n.dataset.signature;delete n.dataset.product;}}
  }
  return generation;
 }
 let current=null, nav=null, catalogue=[], catalogueState='idle', dialog=null, previousFocus=null, dialogCancel=null, busy=false;
 const service=()=>window.RizSimFacultyBridge?.runtime;
 const snapshot=()=>window.RizSimFacultyBridge?.getSnapshot();
 const types=[['student_handout','Handout'],['reading','Reading'],['slides','Slides'],['worksheet','Worksheet'],['external_link','Web resource'],['other','Other']];
 const paths={file:'M6 2h10l6 6v20H6z M16 2v7h6 M10 15h8 M10 19h8 M10 23h5',link:'M11 18l8-8 M9 14l-3 3a5 5 0 007 7l4-4 M15 10l3-3a5 5 0 017 7l-3 3',plus:'M16 5v22 M5 16h22',check:'M6 16l7 7L27 8',cross:'M8 8l16 16 M24 8L8 24',image:'M4 4h24v24H4z M5 24l8-10 6 7 4-4 5 7 M23 9h.01'};
 function node(tag,cls,value){const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=str(value);return n;}
 function icon(kind){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 32 32');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.8');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',paths[kind]||paths.file);svg.append(p);return svg;}
 function btn(label,action,variant=''){const n=node('button','rz-runtime-btn '+variant,label);n.type='button';n.addEventListener('click',action);return n;}
 // The private viewer and protected file endpoint enforce current permissions.
 // Do not expose private storage URLs or access tokens in preview links.
 function reviewFile(item){
  const link=node('a','rz-runtime-btn rz-review-file','Review File');
  link.href='/course-material-viewer.html?material='+encodeURIComponent(str(item.id));
  link.target='_blank';link.rel='noopener noreferrer';
  link.setAttribute('aria-label','Review '+str(item.title||item.file_name||'file')+' in RizSim');
  link.title='Open the saved file in your authorized RizSim viewer';
  return link;
 }
 function active(){return $('view-classroom')?.classList.contains('active')&&$('authenticatedApp')?.classList.contains('show');}
 function redraw(){window.RizSimLiveClassroom?.draw();}
 function key(kind,id){return kind+':'+id;}
 function scopeTitle(scope){return scope.title||'this class';}
 function closeDialog(){if(busy)return;if(dialog){dialog.close();dialog.remove();dialog=null;}const fn=dialogCancel;dialogCancel=null;const focus=previousFocus;previousFocus=null;focus?.isConnected&&focus.focus({preventScroll:true});if(fn)fn();}
 function frame(title,description,onCancel){
  if(!dialog){
   previousFocus=document.activeElement;dialog=node('dialog','rz-runtime-dialog');dialog.id='rzRuntimeDialog';
   dialog.addEventListener('cancel',e=>{e.preventDefault();closeDialog();});document.body.append(dialog);dialog.showModal();
  }
  dialogCancel=onCancel||null;dialog.replaceChildren();
  const x=btn('',closeDialog);x.className='rz-dialog-close';x.setAttribute('aria-label','Close dialog');x.append(icon('cross'));x.disabled=busy;
  const h=node('h2','',title);h.id='rzRuntimeDialogTitle';const p=node('p','rz-dialog-description',description);p.id='rzRuntimeDialogDescription';
  dialog.setAttribute('aria-labelledby',h.id);dialog.setAttribute('aria-describedby',p.id);dialog.append(x,h,p);
  return dialog;
 }
 function alertBox(title,description,returnTo){busy=false;const d=frame(title,description,returnTo);const action=btn('Close',closeDialog);d.append(action);action.focus({preventScroll:true});}
 function success(title,description,reviewItem=null){
  busy=false;const d=frame(title,description),mark=node('div','rz-success-icon');mark.append(icon('check'));d.querySelector('h2').before(mark);
  const actions=node('div','rz-dialog-actions');
  if(reviewItem?.source_type==='file'&&reviewItem.id)actions.append(reviewFile(reviewItem));
  const done=btn('Done',closeDialog,'primary');actions.append(done);d.append(actions);done.focus({preventScroll:true});
 }
 function confirmPublication(scope,item){
  const started=syncIdentity();
  const published=!item.published_to_class;
  const d=frame(published?'Publish to class?':'Revoke from class?',item.title+' — '+(published
   ? 'Make this saved resource available to the eligible students of '+scopeTitle(scope)+'. No upload or form is needed.'
   : 'Hide this resource from students of '+scopeTitle(scope)+'. It remains saved in the resource library. Previously viewed content cannot be recalled.'));
  const error=node('div','rz-runtime-error');error.hidden=true;error.setAttribute('role','alert');d.append(error);
  const actions=node('div','rz-dialog-actions'),cancel=btn('Cancel',closeDialog),accept=btn(published?'Publish to Class':'Revoke',async()=>{
   if(busy)return;busy=true;accept.disabled=true;cancel.disabled=true;d.querySelector('.rz-dialog-close').disabled=true;accept.textContent=published?'Publishing...':'Revoking...';
   try{
    await service().publish(scope.kind,scope.id,item.id,published);
    if(started!==syncIdentity())return;
    invalidate(scope);success(published?'Published to class':'Revoked from class',item.title+(published?' is now published to '+scopeTitle(scope)+'.':' is no longer offered to students. The saved resource has not been deleted.'),item);
   }catch(e){if(started!==syncIdentity())return;busy=false;error.hidden=false;error.textContent=e.message;accept.disabled=false;cancel.disabled=false;d.querySelector('.rz-dialog-close').disabled=false;accept.textContent=published?'Publish to Class':'Revoke';}
  },published?'primary':'danger');actions.append(cancel,accept);d.append(actions);cancel.focus({preventScroll:true});
 }
 function invalidate(scope){cache.delete(key(scope.kind,scope.id));redraw();}
 function fileCaption(file,type){
  const box=node('div','rz-file-caption'),mark=node('span','rz-resource-icon');mark.append(icon(type?.startsWith('image/')?'image':'file'));
  const detail=node('div');detail.append(node('strong','',file.name),node('small','',(type||file.name.split('.').pop().toUpperCase())+' · '+(file.size/1024).toFixed(1)+' KB'));box.append(mark,detail);return box;
 }
 function composer(scope,initial={}){
  const box=node('div','rz-resource-composer'),draft=initial;
  const linkRow=node('div','rz-link-row'),field=node('div','rz-link-field'),label=node('label','','Paste a web link'),input=node('input','rz-composer-link');
  input.type='text';input.inputMode='url';input.autocomplete='url';input.placeholder='https://example.com/resource';input.value=draft.url||'';input.id='rzLink-'+crypto.randomUUID();label.htmlFor=input.id;
  const publishLink=btn('Publish',()=>{draft.file=null;draft.url=service().validURL(input.value);details(scope,draft);},'primary');publishLink.disabled=!service()?.validURL(input.value);
  field.append(label,input);linkRow.append(field,publishLink);
  let lastInvalid='',seq=0;
  input.addEventListener('input',()=>{draft.url=input.value;publishLink.disabled=!service().validURL(input.value);input.setAttribute('aria-invalid',str(!!input.value&&!service().validURL(input.value)));});
  const validateLink=()=>{
   const v=input.value.trim(),valid=!!service().validURL(v);
   window.RizSimFieldFeedback?.show(input,v&&!valid?'Enter a complete http:// or https:// link without spaces or embedded credentials.':'');
   return valid;
  };
  input.addEventListener('blur',validateLink);
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(!publishLink.disabled)publishLink.click();else validateLink();}});
  const zone=node('div','rz-file-zone');zone.tabIndex=0;zone.setAttribute('aria-label','Drop one PDF or image, or browse files');
  const fileInput=node('input','rz-file-input');fileInput.type='file';fileInput.accept='.pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg';fileInput.tabIndex=-1;
  const browse=btn('Browse files',()=>fileInput.click());browse.dataset.rzBrowse='true';
  zone.append(node('strong','','Or drag and drop a file'),browse,node('p','','PDF, PNG or JPEG · up to 25 MB'),fileInput);
  const caption=node('div');caption.dataset.rzFileCaption='true';caption.hidden=true;
  const note=node('p','rz-composer-note','Choose a link or file first. The next panel asks only for its title, type and description.');
  async function selected(files){
   if(!files?.length)return;
   if(files.length!==1){alertBox('Choose one file','Publish one file at a time so its title and resource type remain clear.',dialogSourceReturn(scope,draft));return;}
   const token=++seq;draft.file=files[0];draft.url='';draft.delivery_mode='secure_view';input.value='';publishLink.disabled=true;
   delete draft.id;delete draft.path;draft.uploaded=false;draft.saved=false;
   caption.hidden=false;caption.replaceChildren(fileCaption(draft.file));
   const publish=btn('Publish',()=>details(scope,draft),'primary');publish.disabled=true;publish.dataset.rzFilePublish='true';caption.firstChild.append(publish);
   try{const checked=await service().inspectFile(draft.file);if(token!==seq)return;draft.mime=checked.mime;caption.querySelector('.rz-resource-icon').replaceChildren(icon(checked.mime.startsWith('image/')?'image':'file'));caption.querySelector('small').textContent=draft.file.name.split('.').pop().toUpperCase()+' · '+(draft.file.size/1024).toFixed(1)+' KB';publish.disabled=false;}
   catch(e){if(token!==seq)return;caption.append(node('p','rz-runtime-error',e.message));}
  }
  fileInput.addEventListener('change',()=>selected(fileInput.files));
  zone.addEventListener('keydown',e=>{if(e.target===zone&&['Enter',' '].includes(e.key)){e.preventDefault();fileInput.click();}});
  for(const type of ['dragenter','dragover'])zone.addEventListener(type,e=>{e.preventDefault();zone.classList.add('is-over');});
  zone.addEventListener('dragleave',e=>{if(!zone.contains(e.relatedTarget))zone.classList.remove('is-over');});
  zone.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();zone.classList.remove('is-over');selected(e.dataTransfer?.files);});
  box.append(linkRow,zone,caption,note);
  if(draft.file){caption.hidden=false;caption.append(fileCaption(draft.file,draft.mime));const p=btn('Publish',()=>details(scope,draft),'primary');p.dataset.rzFilePublish='true';caption.firstChild.append(p);}
  return box;
 }
 function dialogSourceReturn(scope,draft){return dialog&&dialog.dataset.source==='true'?()=>sourceDialog(scope,draft):null;}
 function sourceDialog(scope,draft={}){
  const d=frame('Add a new resource','Add a file or link to '+scopeTitle(scope)+'. Its metadata will be collected in the next panel.',()=>{void service().discard(scope.kind,scope.id,draft);});
  d.dataset.source='true';d.append(composer(scope,draft));d.querySelector('.rz-composer-link').focus({preventScroll:true});
 }
 function details(scope,draft){
  const started=syncIdentity();
  if(!draft.file&&!draft.url)return;
  draft.type ||= draft.file?'reading':'external_link';draft.title ||= draft.file?draft.file.name.replace(/\.[^.]+$/,''):'';
  const d=frame('Publish resource','Add the details for '+scopeTitle(scope)+'. The chosen '+(draft.file?'file':'link')+' is already attached.',()=>{void service().discard(scope.kind,scope.id,draft);});
  d.dataset.source='false';
  const form=node('form');form.noValidate=true;
  const source=draft.file?fileCaption(draft.file,draft.mime):node('p','rz-composer-note',draft.url);form.append(source);
  const delivery=draft.file?window.RizSimFileDelivery?.picker(draft.delivery_mode||'secure_view'):null;
  if(delivery)form.append(delivery.element);
  const titleLabel=node('label','','Resource title'),title=node('input');title.type='text';title.id='rzResourceTitle';titleLabel.htmlFor=title.id;title.maxLength=200;title.required=true;title.value=draft.title;
  const fieldset=node('fieldset'),legend=node('legend','','Resource type'),choices=node('div','rz-selectable-options');
  fieldset.append(legend,choices);types.forEach(([value,name])=>{const label=node('label'),radio=node('input');radio.type='radio';radio.name='resource-type';radio.value=value;radio.checked=draft.type===value;radio.addEventListener('change',()=>{draft.type=value;});label.append(radio,document.createTextNode(name));choices.append(label);});
  const descLabel=node('label','','Description (optional)'),desc=node('textarea');desc.id='rzResourceDescription';descLabel.htmlFor=desc.id;desc.maxLength=2000;desc.value=draft.description||'';
  const error=node('div','rz-runtime-error');error.hidden=true;error.setAttribute('role','alert');
  const actions=node('div','rz-dialog-actions'),cancel=btn('Cancel',closeDialog),submit=node('button','rz-runtime-btn primary','Publish to Class');submit.type='submit';submit.id='rzResourceFinalPublish';
  actions.append(cancel,submit);form.append(titleLabel,title,fieldset,descLabel,desc,error,actions);d.append(form);
  form.addEventListener('submit',async e=>{
   e.preventDefault();if(busy)return;draft.title=title.value.trim();draft.description=desc.value.trim();draft.delivery_mode=delivery?.value()||'secure_view';
   if(!window.RizSimFieldFeedback?.required(title,'a resource title')){title.focus({preventScroll:true});return;}
   busy=true;submit.disabled=true;cancel.disabled=true;d.querySelector('.rz-dialog-close').disabled=true;submit.textContent=draft.file?'Uploading and publishing...':'Publishing...';
   try{await service().save(scope.kind,scope.id,draft);if(started!==syncIdentity())return;invalidate(scope);success('Published to class',draft.title+' is now published to '+scopeTitle(scope)+'.',draft.file?{id:draft.id,title:draft.title,source_type:'file'}:null);}
   catch(e){if(started!==syncIdentity())return;busy=false;error.hidden=false;error.textContent=e.message;submit.disabled=false;cancel.disabled=false;d.querySelector('.rz-dialog-close').disabled=false;submit.textContent='Retry publication';}
  });
  title.focus({preventScroll:true});
 }
 function resourceList(scope,items,canAdd){
  const list=node('div','rz-resource-list');
  if(!items.length)list.append(node('p','rz-panel-caption','No resources have been added yet.'));
  items.forEach(item=>{
   const card=node('article','rz-resource-card'+(item.published_to_class?' is-published':''));card.dataset.resourceId=str(item.id);
   const mark=node('span','rz-resource-icon');mark.append(icon(item.source_type==='link'?'link':str(item.mime_type).startsWith('image/')?'image':'file'));
   const detail=node('div');detail.append(node('h4','',item.title),node('p','',item.description||item.file_name||'Web resource'));
   if(item.source_type==='file')detail.append(node('span','rz-delivery-chip'+(item.delivery_mode==='downloadable'?' is-downloadable':''),item.delivery_mode==='downloadable'?'Downloadable':'Secure View'));
   const actions=node('div','rz-resource-actions'),status=node('span','rz-resource-status',item.published_to_class?'Published to class':'Saved · not published');
   const studentType=types.some(([t])=>t===item.material_type);
   const publish=btn(item.published_to_class?'Revoke':'Publish to Class',()=>confirmPublication(scope,item),item.published_to_class?'danger':'primary');
   publish.disabled=!studentType||scope.writable===false;
   if(!studentType){status.textContent='Instructor-only material';publish.title='Instructor-only materials are not published to students.';}
   actions.append(status);
   if(item.source_type==='file'&&item.id)actions.append(reviewFile(item));
   actions.append(publish);card.append(mark,detail,actions);list.append(card);
  });
  if(canAdd&&scope.kind==='own'&&snapshot()?.role==='course_lead'){
   const add=node('button','rz-resource-card rz-resource-add');add.type='button';add.dataset.rzAddResource='true';const mark=node('span','rz-resource-icon');mark.append(icon('plus'));const copy=node('span');copy.append(node('strong','','Add a new resource'),node('small','','Upload a file or paste a link'));add.append(mark,copy);add.addEventListener('click',()=>sourceDialog(scope));list.append(add);
  }
  return list;
 }
 function load(kind,id){
  const started=syncIdentity();
  const k=key(kind,id);if(cache.has(k))return cache.get(k);
  const entry={state:'loading',data:null,error:''};cache.set(k,entry);
  const request=()=>kind==='simulation'?service().resources(id):service().course(kind,id);
  Promise.resolve().then(request).then(data=>{
   if(started!==syncIdentity()||cache.get(k)!==entry)return;
   if(!data||!Array.isArray(data.resources)||(kind!=='simulation'&&(str(data.course_id)!==str(id)||data.kind!==kind||!Array.isArray(data.simulations))))throw new Error('The server returned an incomplete course environment.');
   entry.data=data;entry.state='ready';
  }).catch(e=>{if(started!==syncIdentity()||cache.get(k)!==entry)return;entry.state='error';entry.error=e.message;}).finally(redraw);
  return entry;
 }
 function purchaseList(){
  const started=syncIdentity();
  if(!['faculty','course_lead'].includes(snapshot()?.role))return;
  if(!service()||catalogueState!=='idle')return;
  catalogueState='loading';service().purchased().then(data=>{if(started!==syncIdentity())return;if(!Array.isArray(data))throw new Error('Purchased-course access could not be verified.');catalogue=data;catalogueState='ready';}).catch(()=>{if(started!==syncIdentity())return;catalogue=[];catalogueState='error';}).finally(redraw);
 }
 function loading(parent,entry,scope){
  const p=node('div',entry.state==='error'?'rz-runtime-error':'rz-runtime-loading',entry.state==='error'?entry.error:'Loading your verified course content...');parent.append(p);
  if(entry.state==='error')parent.append(btn('Retry',()=>{cache.delete(key(scope.kind,scope.id));redraw();}));
 }
 function renderEnvironment(route,s){
  const root=$('rzCourseEnvironment'),scope={kind:route.mode,id:route.selection};
  const entry=load(scope.kind,scope.id);const signature=JSON.stringify([route.mode,route.selection,route.session,entry.state,entry.data,entry.error,s.licensed?.map(x=>x.id),s.sessions?.map(x=>[x.session_id,x.active])]);
  if(root.dataset.signature===signature)return;root.dataset.signature=signature;root.replaceChildren();
  if(entry.state!=='ready'){loading(root,entry,scope);return;}
  const data=entry.data;scope.title=data.title;
  const top=node('div','rz-course-top'),head=node('div');head.append(node('h2','',data.title),node('p','',route.mode==='purchased'?'Publisher-prepared course · run its simulations and control classroom resource visibility.':'Choose a simulation to run. Publish or revoke saved resources without uploading them again.'));
  top.append(head,btn('Refresh course',()=>invalidate(scope)));root.append(top);
  const columns=node('div','rz-course-columns'),left=node('section','rz-course-panel'),right=node('section','rz-course-panel resources');
  left.append(node('h3','','Launch a Simulation'),node('p','rz-panel-caption','Run one live simulation at a time. Ending a session preserves its results.'));
  const sims=node('div','rz-course-sims');
  if(!data.simulations.length)sims.append(node('p','rz-panel-caption','No simulations are included yet.'));
  data.simulations.forEach((sim,index)=>{
   const card=node('article','rz-v5-card rz-v5-card-'+index%4),copy=node('div','rz-v5-card-copy');copy.append(node('h3','',sim.title),node('p','',sim.description||'Included in this course.'));
   const hasLicence=(s.licensed||[]).some(x=>str(x.id)===str(sim.product_id));
   const run=btn(hasLicence?'Run Simulation':'Active simulation licence required',()=>nav(route.mode,'setup',route.selection,'',false,sim.product_id));run.className='rz-v5-card-action';run.disabled=!hasLicence;run.dataset.rzRunProduct=str(sim.product_id);card.append(copy,run);sims.append(card);
  });left.append(sims);
  const sessions=node('div','rz-course-sessions');
  data.sessions.forEach(original=>{
   const item={...original,active:(s.sessions||[]).find(x=>str(x.session_id)===str(original.session_id))?.active??original.active};
   const row=node('div','rz-runtime-session'),info=node('div'),actions=node('div');info.append(node('strong','',item.class_name),node('small','',item.active?'Session active':'Session ended'));
   actions.append(btn(item.active?'Session & Results':'View Results',()=>nav(route.mode,'running',route.selection,item.session_id)));
   if(item.active)actions.append(btn('End',async()=>{await service().close(item.session_id);invalidate(scope);},'danger'));
   row.append(info,actions);sessions.append(row);
  });left.append(sessions);
  right.append(node('h3','','Share Class Resources'),node('p','rz-panel-caption',route.mode==='purchased'?'Publisher content is read-only. Publishing and revoking affects your classes only.':'Your saved library. Publish to this course\'s eligible classes, or revoke without deleting the resource.'));
  right.append(resourceList(scope,data.resources,data.can_add===true));columns.append(left,right);root.append(columns);
 }
 function renderStandalone(route,s){
  const root=$('rzStandaloneResources'),session=(s.sessions||[]).find(x=>str(x.session_id)===route.session);
  if(!session)return;
  const scope={kind:'simulation',id:route.session,title:session.class_name},entry=load(scope.kind,scope.id);
  const sig=JSON.stringify([scope.id,entry.state,entry.data,entry.error,session.active]);if(root.dataset.signature===sig)return;root.dataset.signature=sig;root.replaceChildren();
  root.append(node('h3','','Class resources'),node('p','rz-panel-caption','Files and links published here belong only to this simulation session.'));
  if(entry.state!=='ready'){loading(root,entry,scope);return;}
  scope.writable=entry.data.can_add===true&&session.active===true;
  if(scope.writable)root.append(composer(scope));else root.append(node('p','rz-panel-caption','This session is closed or no longer licensed. Existing resource records are retained.'));
  root.append(resourceList(scope,entry.data.resources,false));
 }
 function setupPurchased(route,s){
  const entry=load('purchased',route.selection),mount=$('rzLiveSetupMount');let panel=$('rzPurchasedSetup');
  if(!panel){panel=node('div','rz-purchased-setup');panel.id='rzPurchasedSetup';mount.append(panel);}panel.hidden=false;
  if(entry.state!=='ready'){panel.replaceChildren();loading(panel,entry,{kind:'purchased',id:route.selection});return;}
  const product=entry.data.simulations.find(x=>str(x.product_id)===route.simulation);
  if(!product){nav('purchased','environment',route.selection,'',true);return;}
  if(panel.dataset.product===route.selection+':'+product.product_id)return;panel.dataset.product=route.selection+':'+product.product_id;panel.replaceChildren();
  $('rzLiveSetupTitle').textContent=product.title;
  // This form intentionally shares the course/session RPC model, not the course authoring form.
  const form=node('form'),nameLabel=node('label','','Class / session name'),name=node('input','management-input');name.id='rzPurchasedSessionName';name.required=true;name.maxLength=200;nameLabel.htmlFor=name.id;form.append(nameLabel,name);
  const modes=node('fieldset'),legend=node('legend','','Session access'),options=node('div','rz-selectable-options');modes.append(legend,options);
  for(const [value,label] of [['live','Live Class'],['practice','Practice'],['both','Live + Practice']]){const wrap=node('label'),radio=node('input');radio.type='radio';radio.name='access-mode';radio.value=value;radio.checked=value==='practice';wrap.append(radio,document.createTextNode(label));options.append(wrap);}
  form.append(modes);const inputs={};const local=date=>new Date(date-date.getTimezoneOffset()*60000).toISOString().slice(0,16);
  for(const [id,label] of [['live_starts_at','Live starts'],['live_ends_at','Live ends'],['practice_starts_at','Practice starts'],['practice_ends_at','Practice ends']]){
   const wrap=node('div'),l=node('label','',label),input=node('input','management-input');input.type='datetime-local';input.value=local(new Date(Date.now()+(id.endsWith('ends_at')?3600000:0)));l.append(input);wrap.append(l);form.append(wrap);inputs[id]={wrap,input};
  }
  function modeChange(){const mode=form.querySelector('input[name="access-mode"]:checked').value;Object.entries(inputs).forEach(([id,{wrap}])=>wrap.hidden=mode!=='both'&&!id.startsWith(mode));}
  options.addEventListener('change',modeChange);modeChange();
  const error=node('p','rz-runtime-error');error.hidden=true;const submit=node('button','rz-runtime-btn primary','Create Session');submit.type='submit';form.append(error,submit);panel.append(form);
  form.addEventListener('submit',async e=>{
   e.preventDefault();if(submit.disabled)return;
    if(!window.RizSimFieldFeedback?.required(name,'a class / session name')){name.focus({preventScroll:true});return;}
    const mode=form.querySelector('input[name="access-mode"]:checked').value,fields={p_class_name:name.value.trim(),p_access_mode:mode};
   const validWindow=(kind,label)=>{
    const start=inputs[kind+'_starts_at'].input,end=inputs[kind+'_ends_at'].input;
    const startTime=new Date(start.value).getTime(),endTime=new Date(end.value).getTime();
    if(!start.value||!end.value||!Number.isFinite(startTime)||!Number.isFinite(endTime)||endTime<=startTime){
     const message=!start.value||!end.value?label+' requires a start and end time.':!Number.isFinite(startTime)||!Number.isFinite(endTime)?label+' contains an invalid date or time.':label+' end must be later than its start.';
     window.RizSimFieldFeedback?.invalidWindow(start,end,message);
     return false;
    }
    window.RizSimFieldFeedback?.show(start,'');window.RizSimFieldFeedback?.show(end,'');
    return true;
   };
   if((mode==='live'||mode==='both')&&!validWindow('live','Live Class'))return;
   if((mode==='practice'||mode==='both')&&!validWindow('practice','Practice'))return;
   for(const [id,{input}] of Object.entries(inputs)){const included=mode==='both'||id.startsWith(mode);fields['p_'+id]=included?new Date(input.value).toISOString():null;}
   submit.disabled=true;error.hidden=true;
   try{const result=await service().createPurchased(route.selection,product.product_id,fields);cache.delete(key('purchased',route.selection));nav('purchased','running',route.selection,result.session_id);}
   catch(e){error.textContent=e.message;error.hidden=false;}
   finally{submit.disabled=false;}
  });
 }
 function render(route,s,navigate){
  syncIdentity();if(!service())return;nav=navigate;purchaseList();
  const prior=current;current={...route};
  if(prior&&(prior.mode!==route.mode||prior.selection!==route.selection||prior.session!==route.session)&&dialog&&!busy)closeDialog();
  let environment=$('rzCourseEnvironment');if(!environment){environment=node('section','rz-course-environment');environment.id='rzCourseEnvironment';$('rzLiveSetup').before(environment);}
  let standalone=$('rzStandaloneResources');if(!standalone){standalone=node('section','rz-resource-area');standalone.id='rzStandaloneResources';$('rzLiveRunningMount').after(standalone);}
  const course=active()&&['own','purchased'].includes(route.mode)&&['environment','running'].includes(route.stage);
  environment.hidden=!course;standalone.hidden=!(active()&&route.mode==='simulation'&&route.stage==='running'&&['faculty','course_lead'].includes(s.role));
  if(course)renderEnvironment(route,s);
  if(!standalone.hidden)renderStandalone(route,s);
  const purchased=$('rzPurchasedSetup');if(purchased)purchased.hidden=!(route.mode==='purchased'&&route.stage==='setup');
 }
 window.RizSimCourseEnvironment=Object.freeze({render,setupPurchased,catalogue:()=>{syncIdentity();return catalogue;},catalogueState:()=>{syncIdentity();return catalogueState;},
  runtime:(kind,id)=>{syncIdentity();return cache.get(key(kind,id))?.data||null;},
  invalidate:(kind,id)=>{cache.delete(key(kind,id));redraw();},
  leave:()=>{syncIdentity();if($('rzCourseEnvironment'))$('rzCourseEnvironment').hidden=true;if($('rzStandaloneResources'))$('rzStandaloneResources').hidden=true;if(!busy)closeDialog();},
  // Source composer is also available in the legacy Classroom material view, without altering course authoring.
  composer,sourceDialog});
})();
