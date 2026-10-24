/* RizSim Design Code 1.0 - shared, dependency-free UI primitives.
 * Presentation only: no Supabase client, auth checks, network calls or storage.
 * Do not use operational outcomes for assessment answers. See RIZSIM_DESIGN_CODE.md.
 */
(function () {
 'use strict';
 if (window.RizSimUI) return;
 const NS='http://www.w3.org/2000/svg';
 const paths={
  success:'M7 12l3 3 7-7',error:'M8 8l8 8M16 8l-8 8',
  denied:'M8 15q4-4 8 0M8.5 8.5h.01M15.5 8.5h.01',
  info:'M12 11v5M12 7h.01',warning:'M12 8v5M12 16h.01',
  loading:'M21 12a9 9 0 1 1-9-9',
  close:'M6 6l12 12M18 6 6 18',arrow:'M5 12h14M13 6l6 6-6 6',
  book:'M3 4h6q3 0 3 3v14q0-3-3-3H3zM21 4h-6q-3 0-3 3M21 4v14h-6q-3 0-3 3',
  classroom:'M3 3h18v13H3zM8 21l4-5 4 5M7 7h10M7 11h6',
  skills:'M12 3l2.4 5.4L20 11l-5.6 2.6L12 19l-2.4-5.4L4 11l5.6-2.6zM20 3v4M18 5h4',
  children:'M9 11h.01M15 11h.01M8 15q4 4 8 0M12 3q4-2 4 2M4 9a9 9 0 1 0 16 0',
  file:'M14 2H5v20h14V7zM14 2v6h5M8 12h8M8 16h6',
  pdf:'M14 2H5v20h14V7zM14 2v6h5M8 17q4-5 4-8-3 5 4 8M8 17q3-2 8 0',
  slides:'M3 3h18v13H3zM12 16v5M8 21h8M7 7h4v5H7zM14 7h3M14 11h3',
  document:'M14 2H5v20h14V7zM14 2v6h5M8 11h8M8 14h8M8 17h5',
  sheet:'M14 2H5v20h14V7zM14 2v6h5M8 11h8v7H8zM12 11v7M8 14.5h8',
  video:'M8 5v14l11-7z',link:'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2',
  lock:'M6 10h12v11H6zM8 10V7a4 4 0 0 1 8 0v3M12 14v3',
  users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-4',
  clock:'M12 7v5l4 2',institution:'M3 9l9-6 9 6M4 10h16M6 10v8M12 10v8M18 10v8M3 21h18',
  download:'M12 3v12M7 10l5 5 5-5M4 16v5h16v-5'
 };
 let serial=0, dialogQueue=Promise.resolve(), busy=new Map(), pendingIntents=new WeakSet();
 function node(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;}
 function icon(name,extra='') {
  const s=document.createElementNS(NS,'svg');s.setAttribute('viewBox','0 0 24 24');s.setAttribute('class','rz-dc-icon '+extra);
  s.setAttribute('aria-hidden','true');s.setAttribute('focusable','false');
  if(['success','error','denied','info','warning','clock'].includes(name)){const c=document.createElementNS(NS,'circle');c.setAttribute('cx','12');c.setAttribute('cy','12');c.setAttribute('r','9');s.append(c);}
  const p=document.createElementNS(NS,'path');p.setAttribute('d',paths[name]||paths.file);s.append(p);return s;
 }
 function fileIcon(file={}) {
  const type=String(file.mime_type||file.type||'').toLowerCase(),name=String(file.file_name||file.name||file.title||'').toLowerCase();
  const kind=file.source_type==='link'?'link':/pdf/.test(type)||/\.pdf$/.test(name)?'pdf':/presentation|powerpoint/.test(type)||/\.pptx?$/.test(name)?'slides':/word|opendocument.text/.test(type)||/\.docx?$/.test(name)?'document':/spreadsheet|excel/.test(type)||/\.(xlsx?|csv)$/.test(name)?'sheet':/video/.test(type)||/\.(mp4|webm|mov)$/.test(name)?'video':'file';
  return icon(kind,'rz-dc-file-'+kind);
 }
 function reduced(){return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;}
 function fieldError(input,message){
  if(!input?.isConnected)return false;
  let help=input.nextElementSibling;
  if(!help?.classList.contains('rz-inline-error')){help=node('span','rz-inline-error');help.id='rzDcField'+(++serial);input.after(help);}
  const text=String(message||'').trim();help.textContent=text;help.hidden=!text;input.classList.toggle('rz-field-invalid',!!text);
  const ids=(input.getAttribute('aria-describedby')||'').split(/\s+/).filter(x=>x&&x!==help.id);
  if(text){input.setAttribute('aria-invalid','true');ids.push(help.id);}else input.removeAttribute('aria-invalid');
  if(ids.length)input.setAttribute('aria-describedby',ids.join(' '));else input.removeAttribute('aria-describedby');
  return !text;
 }
 function reveal(input){
  if(!input?.isConnected)return false;
  for(let parent=input.parentElement;parent;parent=parent.parentElement){if(parent.tagName==='DETAILS')parent.open=true;}
  input.focus({preventScroll:true});
  const headers=[...document.querySelectorAll('header,.site-header,.auth-header,.student-header')].filter(n=>['fixed','sticky'].includes(getComputedStyle(n).position));
  const top=Math.max(0,...headers.map(n=>n.getBoundingClientRect().bottom));
  const r=input.getBoundingClientRect();
  let clipped=r.top<top+12||r.bottom>innerHeight-16||r.left<0||r.right>innerWidth;
  // A field can be inside the viewport yet clipped by a scrollable dialog/panel.
  for(let parent=input.parentElement;parent;parent=parent.parentElement){
   const style=getComputedStyle(parent),box=parent.getBoundingClientRect();
   const left=box.left+parent.clientLeft,upper=box.top+parent.clientTop;
   if(/auto|scroll|hidden|clip/.test(style.overflowY)&&(r.top<upper||r.bottom>upper+parent.clientHeight))clipped=true;
   if(/auto|scroll|hidden|clip/.test(style.overflowX)&&(r.left<left||r.right>left+parent.clientWidth))clipped=true;
  }
  if(clipped)input.scrollIntoView({block:'center',inline:'nearest',behavior:reduced()?'auto':'smooth'});
  return true;
 }
 function invalid(input,message){fieldError(input,message);reveal(input);return false;}
 function required(input,label){if(!input)return false;if(!String(input.value||'').trim())return invalid(input,'Enter '+(label||'a value')+' before continuing.');if(input.validity&&!input.validity.valid)return invalid(input,input.validationMessage||'Check this value.');return fieldError(input,'');}
 function toneFor(message,error=false){
  const s=String(message||'');
  if(error)return /\bdenied\b|not authori[sz]ed|permission denied|not permitted|access is required|access unavailable/i.test(s)?'denied':'error';
  if(/^(loading|checking|joining|saving|publishing|uploading|connecting|verifying|signing)\b/i.test(s.trim()))return 'loading';
  if(/\b(?:successfully|request submitted|saved successfully)\b/i.test(s))return 'success';
  if(/^(saved|created|updated|published|unpublished|submitted|removed|revoked|copied|sent|success|your .{0,35} (?:has been|was) (?:saved|created|updated|submitted))\b/i.test(s.trim()))return 'success';
  return 'info';
 }
 function decorateFeedback(target,tone){
  if(!target)return;const text=target.textContent.trim();
  target.classList.toggle('rz-dc-feedback',!!text);target.dataset.rzTone=tone;
  if(!text){target.querySelector(':scope > .rz-dc-outcome')?.remove();return;}
  let mark=target.querySelector(':scope > .rz-dc-outcome');
  if(mark?.dataset.kind!==tone){mark?.remove();mark=icon(tone,'rz-dc-outcome');mark.dataset.kind=tone;target.prepend(mark);}
  if(!target.hasAttribute('role'))target.setAttribute('role',tone==='error'?'alert':'status');
  target.setAttribute('aria-live',tone==='error'?'assertive':'polite');target.setAttribute('aria-atomic','true');
 }
 function feedback(target,message,tone='info'){
  if(typeof target==='string')target=document.getElementById(target);if(!target)return;
  target.textContent=message||'';decorateFeedback(target,tone);
 }
 function notify(message,tone='info'){
  if(!document.body)return;
  let region=document.getElementById('rzDcToasts');if(!region){region=node('div','rz-dc-toast-region');region.id='rzDcToasts';region.setAttribute('aria-label','Notifications');document.body.append(region);}
  const item=node('div');feedback(item,message,tone);
  const close=node('button','rz-dc-toast-close');close.type='button';close.setAttribute('aria-label','Dismiss notification');close.append(icon('close'));close.onclick=()=>item.remove();item.append(close);region.append(item);
  /* No disappearing error messages or fake progress. User dismisses each result. */
  return item;
 }
 function dialog(message,options={}){
  const previous=document.activeElement;
  // An asynchronous modal must not turn a double click into two server actions.
  if(previous && pendingIntents.has(previous))return Promise.resolve(options.input?null:false);
  if(previous)pendingIntents.add(previous);
  const task=()=>new Promise(resolve=>{
   const id='rzDcDialog'+(++serial),d=node('dialog','rz-dc-dialog');d.id=id;d.setAttribute('aria-labelledby',id+'Title');d.setAttribute('aria-describedby',id+'Message');
   const title=node('h2','',options.title||'Confirm action');title.id=id+'Title';
   const copy=node('p','',message);copy.id=id+'Message';d.append(title,copy);
   let input=null;
   if(options.input){const label=node('label','',options.inputLabel||'Optional note');input=node('input');input.type='text';input.value=String(options.value||'');input.maxLength=options.maxLength||2000;label.append(input);d.append(label);}
   const actions=node('div','rz-dc-dialog-actions'),cancel=node('button','',options.cancel||'Cancel'),accept=node('button',options.danger?'rz-dc-danger':'rz-dc-primary',options.action||'Continue');cancel.type=accept.type='button';actions.append(cancel,accept);d.append(actions);
   let settled=false,scrim=null,inert=[];
   const finish=value=>{if(settled)return;settled=true;if(d.open&&typeof d.close==='function')d.close();d.remove();scrim?.remove();inert.forEach(([n,v])=>n.inert=v);if(previous?.isConnected)previous.focus({preventScroll:true});resolve(value);};
   cancel.onclick=()=>finish(options.input?null:false);accept.onclick=()=>finish(options.input?input.value:true);
   d.addEventListener('cancel',e=>{e.preventDefault();finish(options.input?null:false);});
   d.addEventListener('close',()=>finish(options.input?null:false));
   d.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();finish(options.input?null:false);}
    if(e.key==='Tab'){
     const controls=[...d.querySelectorAll('input,button')].filter(n=>!n.disabled),first=controls[0],last=controls.at(-1);
     if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
   });
   document.body.append(d);
   try{if(typeof d.showModal==='function')d.showModal();else throw new Error('Native dialog unavailable');}
   catch(_){
    /* Website-native fallback with an inert background; never browser confirm. */
    d.remove();inert=[...document.body.children].map(n=>[n,n.inert]);inert.forEach(([n])=>n.inert=true);
    scrim=node('div','rz-dc-fallback-scrim');scrim.append(d);d.setAttribute('open','');d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');document.body.append(scrim);
   }
   (input||cancel).focus({preventScroll:true});
  });
  const result=dialogQueue.then(task,task).finally(()=>{if(previous)pendingIntents.delete(previous);});dialogQueue=result.catch(()=>false);return result;
 }
 function confirmAction(message,options={}){return dialog(message,options);}
 function promptNote(message,value='',options={}){return dialog(message,{title:'Add a note',action:'Continue',...options,input:true,value});}
 function busyStart(key,label='Updating your workspace'){
  if(busy.has(key))return;
  const focused=document.activeElement,button=focused?.closest?.('button');
  const entry={button:null,mark:null};
  if(button&&!button.disabled&&!button.matches('[data-auth-view],[data-student-view],[role=tab]')){
   entry.button=button;entry.mark=icon('loading','rz-dc-busy-mark');entry.oldAria=button.getAttribute('aria-busy');button.prepend(entry.mark);button.disabled=true;button.setAttribute('aria-busy','true');
  }
  busy.set(key,entry);
  const loader=document.getElementById(key);if(loader){let text=loader.querySelector('.rz-dc-loading-label');if(!text){text=node('span','rz-dc-loading-label');loader.append(text);}text.textContent=label;loader.setAttribute('role','status');loader.setAttribute('aria-live','polite');}
 }
 function busyEnd(key){const b=busy.get(key);if(!b)return;b.mark?.remove();if(b.button?.isConnected){b.button.disabled=false;if(b.oldAria===null)b.button.removeAttribute('aria-busy');else b.button.setAttribute('aria-busy',b.oldAria);}busy.delete(key);}
 function supportText(p,label){
  if(!p||p.closest('details')||p.querySelector('button,input,select,textarea,a'))return;
  const d=node('details','rz-dc-support'),s=node('summary','',label);d.append(s);p.before(d);d.append(p);d.dataset.rzPriority='2';
 }
 function ownerLinks(){
  const host=document.querySelector('#view-administration>.content-shell'),panel=document.getElementById('ownerLicensePanel');
  if(!host||!panel||panel.classList.contains('hidden')||host.querySelector('.rz-dc-section-links'))return;
  const nav=node('nav','rz-dc-section-links');nav.setAttribute('aria-label','Owner tools in Administration');nav.dataset.rzPriority='1';
  [['ownerLicensePanel','Licences','lock'],['ownerInstitutionPanel','Institutions','institution'],['ownerFacultyRequestPanel','Faculty requests','users'],['ownerMembershipPanel','Memberships','users']].forEach(([id,label,glyph])=>{
   const target=document.getElementById(id);if(!target||target.classList.contains('hidden'))return;
   const a=node('a','',label);a.href='#'+id;a.prepend(icon(glyph));a.onclick=e=>{e.preventDefault();target.setAttribute('tabindex','-1');target.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:reduced()?'auto':'smooth'});};nav.append(a);
  });host.querySelector('.auth-section-heading')?.after(nav);
 }
 const statusSelectors='#playerMessage,.management-message,#rzLiveHelp,.rz-st-practice-feedback,#gateStatus';
 function scan(){
  const body=document.body;if(!body)return;
  const ready=!!document.querySelector('#authenticatedApp.show,#studentApp.show');if(body.dataset.rzAppReady!==String(ready))body.dataset.rzAppReady=String(ready);
  /* Only operational statuses; no runner response/feedback containers. */
  if(body.dataset.rzSurface!=='runner')document.querySelectorAll(statusSelectors).forEach(el=>{
   const text=el.textContent.trim(),error=el.classList.contains('error')||el.classList.contains('is-error')||el.dataset.error==='true';
   const signature=text+'|'+error;if(el.__rzDcSignature===signature)return;el.__rzDcSignature=signature;decorateFeedback(el,toneFor(text,error));
  });
  const replacements=[['.bp-category-icon','skills'],['.bp-category-arrow','arrow'],['.rizsim-announcement-spark','skills'],['.bp-visual-caption>span[aria-hidden=true]','skills'],['.rz-c155-empty-icon','book'],['.rz-c156-empty-icon','classroom'],['.empty-state-icon','classroom']];
  replacements.forEach(([selector,name])=>document.querySelectorAll(selector).forEach(el=>{
   if(el.querySelector('svg,img')||!el.textContent.trim())return;
   const kind=selector==='.bp-category-icon'&&el.closest('a')?.href.includes('children')?'children':name;el.replaceChildren(icon(kind));el.setAttribute('aria-hidden','true');
  }));
  document.querySelectorAll('[data-rz-icon]').forEach(el=>{if(!el.querySelector('svg'))el.append(icon(el.dataset.rzIcon));});
  document.querySelectorAll('#portalLoading,#loading').forEach(el=>{if(el.classList.contains('show'))busyStart(el.id,ready?'Updating your workspace':'Loading your workspace');else busyEnd(el.id);});
  document.querySelectorAll('.auth-section-heading,.student-heading,.rz-author-heading,.rz-live-heading,.rz-c155-heading,.institution-tab-nav,.admin-tab-nav').forEach(n=>{if(!n.dataset.rzPriority)n.dataset.rzPriority='1';});
  ownerLinks();
 }
 function supportGroup(elements,label){
  const items=elements.filter(Boolean);if(!items.length||items[0].closest('.rz-dc-context'))return;
  const d=node('details','rz-dc-context'),summary=node('summary','',label);d.append(summary);items[0].before(d);items.forEach(x=>d.append(x));return d;
 }
 function organizeWorkspaceContext(){
  // Context is secondary to the selected task. Keep every original node and listener.
  const admin=document.getElementById('view-administration'),institution=document.getElementById('view-institution');
  const adminContext=supportGroup([document.getElementById('administrationMetrics'),admin?.querySelector('.admin-command')],'Workspace overview and access boundaries');
  if(adminContext){admin?.querySelector('.admin-hub')?.after(adminContext);const copy=admin?.querySelector('.auth-section-heading>p');if(copy)adminContext.append(copy);}
  const institutionContext=supportGroup([institution?.querySelector('.institution-command'),institution?.querySelector('.institution-overview-grid')],'Institution summary and activity totals');
  if(institutionContext)institution?.querySelector('.institution-hub')?.after(institutionContext);
  // Slugs are auto-generated; descriptions are optional. Required fields stay open.
  for(const prefix of ['adminCategory','adminSimulation','adminResource']){
   const ids=['Slug','Description','ShortDescription','FullDescription'].map(suffix=>prefix+suffix);
   const fields=ids.map(id=>document.getElementById(id)?.closest('.management-field')).filter(Boolean);
   const form=fields[0]?.closest('.admin-category-form');if(!form||form.querySelector('.rz-dc-optional-fields'))continue;
   const details=node('details','rz-dc-optional-fields');details.append(node('summary','','Optional details and guidance'));
   const content=node('div','rz-dc-optional-grid');fields.forEach(x=>content.append(x));details.append(content);
   const actions=form.querySelector('.admin-form-actions');if(actions)actions.after(details);else form.append(details);
   const guidance=form.querySelector('.admin-boundary');
   const fileField=form.querySelector('#adminResourceFile')?.closest('.management-field');
   if(guidance&&fileField)fileField.append(guidance);else if(guidance)details.append(guidance);
   const card=form.closest('.admin-operation-card'),copy=card?.querySelector(':scope>p');if(copy)details.append(copy);
   const section=card?.closest('.admin-tab-panel')?.querySelector('.admin-section-heading>div');
   if(section)for(const copy of section.querySelectorAll(':scope>p,:scope>span'))details.append(copy);
   const heading=card?.querySelector(':scope>h4'),list=document.getElementById(prefix+'List');
   if(heading&&list){
    const bar=node('div','rz-dc-form-heading'),link=node('a','','Browse existing records');link.href='#'+list.id;
    link.onclick=e=>{e.preventDefault();list.setAttribute('tabindex','-1');list.focus({preventScroll:true});list.scrollIntoView({block:'start',behavior:reduced()?'auto':'smooth'});};
    heading.before(bar);bar.append(heading,link);
   }
  }
 }
 function organizeRequestContext(){
  const note=document.getElementById('institutionFacultyNote')?.closest('.management-field');
  const submit=document.getElementById('submitInstitutionFacultyRequest');
  if(!note||!submit||note.closest('details'))return;
  const d=node('details','rz-dc-optional-fields');d.append(node('summary','','Optional request context'));d.append(note);
  const copy=submit.closest('.management-card')?.querySelector(':scope>p');if(copy)d.append(copy);
  submit.after(d);
 }
 function init(){
  organizeWorkspaceContext();
  organizeRequestContext();
  /* Supplemental prose only; all task controls remain in their original panels. */
  document.querySelectorAll('.admin-command p').forEach(p=>supportText(p,'About content operations'));
  document.querySelectorAll('.institution-command p').forEach(p=>supportText(p,'About this institution workspace'));
  const publish=document.getElementById('rizsimPublishOverlay'),message=document.getElementById('adminPublishingMessage');
  if(publish&&message){message.before(publish);publish.classList.add('rz-dc-local-progress');}
  scan();let queued=false;
  const observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;scan();});});
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-error']});
  document.addEventListener('invalid',e=>{
   const input=e.target;if(document.body.dataset.rzSurface==='runner'||!input?.willValidate)return;
   e.preventDefault();fieldError(input,input.validity.valueMissing?'This field is required.':input.validationMessage||'Check this value.');
   const first=[...(input.form?.elements||[])].find(f=>f.willValidate&&!f.validity.valid);if(!first||first===input)reveal(input);
  },true);
  ['input','change'].forEach(type=>document.addEventListener(type,e=>{const input=e.target;if(input?.classList.contains('rz-field-invalid')&&input.validity?.valid&&String(input.value||'').trim())fieldError(input,'');},true));
 }
 window.RizSimUI=Object.freeze({version:'1.0',icon,fileIcon,feedback,notify,confirm:confirmAction,prompt:promptNote,fieldError,invalid,required,reveal,toneFor,busyStart,busyEnd});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
