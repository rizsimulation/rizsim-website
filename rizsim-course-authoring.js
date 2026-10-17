/* V7 authoring-only Courses workspace. No session execution or results controls. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id), text = v => String(v ?? '');
  const service = () => window.RizSimFacultyBridge?.authoring;
  const validation = () => window.RizSimFacultyBridge?.runtime;
  const snapshot = () => window.RizSimFacultyBridge?.getSnapshot();
  const drafts = new Map(), modals = [];
  let identity = '', generation = 0, routeKey = '', busy = false, scheduled = false, list = null;
  let current = null, loading = false, ready = false;
  const types = [['reading','Reading'],['student_handout','Handout'],['slides','Slides'],['worksheet','Worksheet'],['external_link','Web resource'],['teaching_material','Instructor notes'],['other','Other']];
  const paths = {
    book:'M5 5h9c2 0 3 2 3 3v19c0-3-2-4-5-4H5z M17 8c0-1 1-3 3-3h7v18h-6c-2 0-4 2-4 4 M9 10h4 M9 14h4',
    edit:'M6 23l1-6L22 2l6 6-15 15-7 1z M18 6l6 6 M6 29h22',
    grid:'M4 4h10v10H4z M19 4h10v10H19z M4 19h10v10H4z M19 19h10v10H19z',
    file:'M6 2h12l8 8v20H6z M18 2v9h8 M11 17h10 M11 22h8',
    link:'M12 19l8-8 M10 14l-4 4a6 6 0 008 8l4-4 M14 10l4-4a6 6 0 018 8l-4 4',
    plus:'M16 5v22 M5 16h22', cross:'M8 8l16 16 M24 8L8 24',
    check:'M5 17l7 7L28 7', trash:'M5 8h22 M11 8V4h10v4 M8 8l1 21h14l1-21 M13 13v10 M19 13v10',
    image:'M4 4h24v24H4z M5 25l8-10 6 6 4-4 5 8 M23 9h.01', arrow:'M5 16h21 M20 10l6 6-6 6'
  };
  function node(tag, cls, value) { const n = document.createElement(tag); if (cls) n.className=cls; if(value!==undefined)n.textContent=text(value); return n; }
  function icon(kind) {
    const s=document.createElementNS('http://www.w3.org/2000/svg','svg');
    for(const [k,v] of Object.entries({viewBox:'0 0 32 32',fill:'none',stroke:'currentColor','stroke-width':'1.65','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))s.setAttribute(k,v);
    const p=document.createElementNS(s.namespaceURI,'path');p.setAttribute('d',paths[kind]||paths.file);s.append(p);return s;
  }
  function button(label, action, kind='') { const b=node('button','rz-author-btn '+kind,label);b.type='button';b.addEventListener('click',action);return b; }
  function isActive(){return $('authenticatedApp')?.classList.contains('show')&&$('view-courses')?.classList.contains('active');}
  function allowed(){return snapshot()?.role==='course_lead'&&!!snapshot()?.userId;}
  function account(){return text(snapshot()?.userId)+':'+text(snapshot()?.role);}
  function closeModal(d, force=false) {
    if(busy&&!force)return;
    const index=modals.findIndex(m=>m.dialog===d);if(index<0)return;
    const entries=modals.splice(index);
    for(const entry of entries.reverse()){entry.dialog.close();entry.dialog.remove();}
    const focus=entries.at(-1)?.focus;if(focus?.isConnected)focus.focus({preventScroll:true});
  }
  function closeAll(force=false){if(modals[0])closeModal(modals[0].dialog,force);}
  function modal(title, caption, wide=false) {
    const d=node('dialog','rz-author-modal'+(wide?' is-wide':''));
    const h=node('h2','',title);h.id='rzAuthorDialogTitle-'+crypto.randomUUID();
    const desc=node('p','rz-author-modal-caption',caption);desc.id=h.id+'-description';
    d.setAttribute('aria-labelledby',h.id);d.setAttribute('aria-describedby',desc.id);
    const x=button('',()=>closeModal(d),'icon');x.className='rz-author-close';x.setAttribute('aria-label','Close window');x.append(icon('cross'));
    const head=node('header','rz-author-modal-head');head.append(h,desc,x);
    const content=node('div','rz-author-modal-body');d.append(head,content);
    d.addEventListener('cancel',e=>{e.preventDefault();closeModal(d);});
    modals.push({dialog:d,focus:document.activeElement});document.body.append(d);d.showModal();
    x.focus({preventScroll:true});return {d,content};
  }
  function notice(title, message, success=false) {
    const {d,content}=modal(title,message);const mark=node('span','rz-author-notice-icon'+(success?' success':''));mark.append(icon(success?'check':'file'));content.append(mark);
    const b=button(success?'Done':'Close',()=>closeModal(d),'primary');content.append(b);b.focus({preventScroll:true});return d;
  }
  function confirm(title, message, action, label='Delete') {
    const {d,content}=modal(title,message),error=node('p','rz-author-error');error.hidden=true;error.setAttribute('role','alert');
    const actions=node('div','rz-author-actions');const cancel=button('Cancel',()=>closeModal(d));
    const accept=button(label,async()=>{
      if(busy)return;const started=generation;accept.disabled=true;cancel.disabled=true;d.querySelector('.rz-author-close').disabled=true;error.hidden=true;
      try{await action();if(started!==generation)return;closeModal(d);}
      catch(e){if(started!==generation)return;error.textContent=e.message;error.hidden=false;}
      finally{if(started===generation){accept.disabled=false;cancel.disabled=false;d.querySelector('.rz-author-close')?.removeAttribute('disabled');}}
    },'danger');actions.append(cancel,accept);content.append(error,actions);cancel.focus({preventScroll:true});return d;
  }
  function readRoute(){const u=new URL(location.href),stage=u.searchParams.get('courses');return {stage:['create','manage','edit'].includes(stage)?stage:'menu',id:u.searchParams.get('course')||''};}
  function go(stage='menu',id='',replace=false){
    if(busy)return;closeAll();const u=new URL(location.href);
    for(const k of ['live','selection','live_session','simulation','courses','course'])u.searchParams.delete(k);
    if(stage!=='menu')u.searchParams.set('courses',stage);if(id)u.searchParams.set('course',id);u.hash='courses';
    history[replace?'replaceState':'pushState'](null,'',u.pathname+u.search+u.hash);routeKey='';draw();
    $('rzAuthorHeading')?.focus({preventScroll:true});
  }
  function navigate(stage,id=''){
    if(current?.dirty&&(stage==='menu'||stage==='manage'||(stage==='create'&&!current.isNew))){
      confirm('Leave this draft?','Your unsaved changes will be discarded. Nothing has been published to students.',()=>{drafts.delete(current.key);current=null;go(stage,id);},'Discard draft');
    }else go(stage,id);
  }
  function dirty(draft){draft.dirty=true;const status=$('rzAuthorSaveStatus');if(status)status.textContent='Unsaved changes';saveEnabled();}
  function fromServer(data){return {...data,id:data.course_id,key:'edit:'+data.course_id,isNew:false,dirty:false,simulations:data.simulations||[],resources:(data.resources||[]).map(r=>({...r,isNew:false})),description:data.description||''};}
  function fresh(){const id=crypto.randomUUID();return {key:'create',id,isNew:true,can_edit:true,active:true,title:'',description:'',simulations:[],resources:[],dirty:false};}
  function errorPanel(parent,message,retry){const p=node('div','rz-author-error',message);p.setAttribute('role','alert');parent.append(p);if(retry)parent.append(button('Retry',retry));}
  function heading(stage){
    const root=$('rzCourseAuthoring');root.replaceChildren();
    const h=node('h1','',stage==='create'?'Create a new course':stage==='edit'?'Manage your course':stage==='manage'?'Manage created courses':'Courses');h.id='rzAuthorHeading';h.tabIndex=-1;
    const top=node('header','rz-author-heading');top.append(node('span','rz-author-eyebrow','COURSE LEAD STUDIO'),h,node('p','','Build and organise your courses here. Run sessions and view results in Live Classroom.'));root.append(top);
    const crumb=node('nav','rz-author-crumb');crumb.setAttribute('aria-label','Course authoring steps');crumb.append(button('Courses',()=>navigate('menu'),'text'));
    if(stage!=='menu')crumb.append(node('span','','/'),button(stage==='manage'?'Manage created courses':stage==='create'?'Create new course':'Manage created courses',()=>navigate(stage==='edit'?'manage':stage),'text'));
    if(stage==='edit')crumb.append(node('span','','/'),node('span','','Edit course'));root.append(crumb);return root;
  }
  function card(title,desc,kind,action,label,tone='mint',cls=''){
    const c=node('article','rz-author-card '+tone+' '+cls),mark=node('span','rz-author-card-icon');mark.append(icon(kind));
    const copy=node('div','rz-author-card-copy');copy.append(node('h2','',title),node('p','',desc));
    const b=button(label,action,'primary reveal');b.append(icon('arrow'));c.append(mark,copy,b);return c;
  }
  function menu(root){const grid=node('div','rz-author-paths');grid.append(
    card('Create new course','Shape a new learning experience with your licensed simulations, files and web resources.','book',()=>navigate('create'),'Create new course','mint','tall'),
    card('Manage created courses','Revisit your saved courses. Refine their details, add content or remove what you no longer need.','edit',()=>navigate('manage'),'Manage courses','lavender','tall'));
    root.append(grid);
  }
  async function manage(root){
    if(list===null){root.append(node('p','rz-author-loading','Loading your created courses...'));if(loading)return;loading=true;const gen=generation;
      try{const data=await service().list();if(gen!==generation)return;if(!Array.isArray(data))throw new Error('Your courses could not be loaded.');list=data;}
      catch(e){if(gen!==generation)return;list={error:e.message};}finally{if(gen===generation){loading=false;routeKey='';schedule();}}return;
    }
    if(list.error){errorPanel(root,list.error,()=>{list=null;routeKey='';schedule();});return;}
    const toolbar=node('div','rz-author-library-tools');toolbar.append(button('Create new course',()=>navigate('create'),'primary'),button('Refresh courses',()=>{list=null;routeKey='';schedule();}));root.append(toolbar);
    const grid=node('div','rz-author-course-grid');
    if(!list.length)grid.append(node('p','rz-author-empty','No courses have been created yet. Start with Create new course.'));
    list.forEach((item,i)=>{
      const c=card(item.title,item.description||'Your saved simulations and learning resources.','book',()=>navigate('edit',item.course_id),'Manage',i%2?'sand':'mint');c.dataset.courseId=item.course_id;
      if(!item.active)c.querySelector('.rz-author-card-copy').append(node('small','rz-author-status','Ended course \u00b7 read-only'));
      const actions=node('div','rz-author-course-actions');actions.append(c.querySelector('.rz-author-btn'),button('Delete',()=>deleteCourse(item),'danger reveal'));c.append(actions);grid.append(c);
    });root.append(grid);
  }
  async function deleteCourse(item){
    if(busy)return;const gen=generation;
    try{
      const data=await service().load(item.course_id);if(gen!==generation)return;
      confirm('Delete "'+item.title+'"?','This removes the course from your authoring library and available courses. Existing session history, student submissions and stored files are retained. Courses with open sessions or publisher licences cannot be deleted here.',async()=>{
        busy=true;try{await service().remove(item.course_id,data.revision);if(gen!==generation)return;list=null;drafts.delete('edit:'+item.course_id);routeKey='';}
        finally{if(gen===generation)busy=false;}
        schedule();
      });
    }catch(e){if(gen===generation)notice('Unable to delete course',e.message);}
  }
  function saveEnabled(){const b=$('rzAuthorSave');if(b&&current)b.disabled=busy||!current.can_edit||(!current.isNew&&!current.dirty);}
  function listItems(draft){
    const sims=$('rzAuthorSimulations'),resources=$('rzAuthorResources');if(!sims||!resources)return;sims.replaceChildren();resources.replaceChildren();
    function row(item,isSim){
      const n=node('article','rz-author-item '+(isSim?'mint':'sand'));n.dataset[isSim?'simulationId':'resourceId']=isSim?item.product_id:item.id;
      const mark=node('span','rz-author-item-icon');mark.append(icon(isSim?'grid':item.source_type==='link'||item.external_url?'link':item.mime_type?.startsWith('image/')?'image':'file'));
      const body=node('div','rz-author-item-copy');body.append(node('h3','',item.title),node('p','',isSim?(item.description||'Included simulation.'):(item.file?.name||item.file_name||item.external_url||item.description||'Learning resource')));
      if(!isSim)body.append(node('small','rz-author-status',item.isNew?'Staged \u00b7 saved with the course':item.published_to_class?'Published to class \u00b7 managed in Live Classroom':'Saved resource \u00b7 not published to class'));
       if(!isSim&&item.source_type==='file')body.append(node('span','rz-delivery-chip'+(item.delivery_mode==='downloadable'?' is-downloadable':''),item.delivery_mode==='downloadable'?'Downloadable':'Secure View'));
      n.append(mark,body);
      const actions=node('div','rz-author-item-actions');
      // A draft file is staged privately and has no readable saved object yet.
      // Persisted files open only through the existing permission-checked viewer.
      if(!isSim&&item.source_type==='file'&&!item.isNew&&item.id){
        const review=node('a','rz-author-btn rz-review-file','Review File');
        review.href='/course-material-viewer.html?material='+encodeURIComponent(text(item.id));
        review.target='_blank';review.rel='noopener noreferrer';
        review.setAttribute('aria-label','Review '+text(item.title||item.file_name||'file')+' in RizSim');
        actions.append(review);
      }
      if(draft.can_edit){
        const del=button('Delete',()=>confirm('Remove "'+item.title+'"?','The item will be removed from this draft. The removal takes effect only when you '+(draft.isNew?'publish the course.':'save changes. Existing files and student submissions are retained.'),()=>{
          if(isSim)draft.simulations=draft.simulations.filter(s=>s.product_id!==item.product_id);else draft.resources=draft.resources.filter(r=>r.id!==item.id);dirty(draft);listItems(draft);
        }),'danger reveal');
        del.setAttribute('aria-label','Delete '+item.title);del.prepend(icon('trash'));actions.append(del);
      }
      if(actions.childElementCount)n.append(actions);
      return n;
    }
    if(!draft.simulations.length)sims.append(node('p','rz-author-empty','Your selected simulations will appear here.'));
    else draft.simulations.forEach(s=>sims.append(row(s,true)));
    if(!draft.resources.length)resources.append(node('p','rz-author-empty','Your added files and web links will appear here.'));
    else draft.resources.forEach(r=>resources.append(row(r,false)));
  }
  function editor(root,draft){
    current=draft;const readOnly=!draft.can_edit;
    const form=node('form','rz-author-editor');form.noValidate=true;form.id='rzAuthorEditor';
    const fields=node('fieldset','rz-author-editable');fields.disabled=readOnly;
    const bar=node('div','rz-author-details');
    const titleLabel=node('label','','Course title'),title=node('input');title.id='rzAuthorTitle';title.type='text';title.maxLength=160;title.required=true;title.placeholder='e.g. Psychology for Business';title.value=draft.title;titleLabel.htmlFor=title.id;titleLabel.append(title);
    const descLabel=node('label','','Course description'),desc=node('textarea');desc.id='rzAuthorDescription';desc.maxLength=1200;desc.rows=2;desc.placeholder='What will learners explore in this course?';desc.value=draft.description;descLabel.htmlFor=desc.id;descLabel.append(desc);bar.append(titleLabel,descLabel);fields.append(bar);
    title.addEventListener('input',()=>{draft.title=title.value;dirty(draft);});desc.addEventListener('input',()=>{draft.description=desc.value;dirty(draft);});
    const add=node('div','rz-author-add-grid');add.append(
      card('Add learning resource','Choose a file or a valid web link. Enter its details once.','file',()=>sourcePicker(draft),'Add learning resource','sand','compact'),
      card('Add simulation','Choose from simulations actively licensed to your account.','grid',()=>simulationPicker(draft),'Add simulation','mint','compact'));
    fields.append(add);form.append(fields);
    const cols=node('div','rz-author-columns');for(const [id,h,caption] of [['rzAuthorSimulations','Simulations','Your course activities, ready to run later in Live Classroom.'],['rzAuthorResources','Learning resources','Files and web links saved in this course library.']]){
      const section=node('section','rz-author-list-panel');section.append(node('h2','',h),node('p','rz-author-caption',caption));const l=node('div','rz-author-item-list');l.id=id;section.append(l);cols.append(section);
    }form.append(cols);
    const error=node('p','rz-author-error');error.id='rzAuthorSaveError';error.hidden=true;error.setAttribute('role','alert');form.append(error);
    const footer=node('div','rz-author-savebar'),copy=node('div');const status=node('strong','',draft.dirty?'Unsaved changes':draft.isNew?'New course draft':'All changes saved');status.id='rzAuthorSaveStatus';
    copy.append(status,node('p','','Saving a course does not start a session or publish resources to students.'));
    const b=node('button','rz-author-btn primary',draft.isNew?'PUBLISH COURSE':'SAVE CHANGES');b.id='rzAuthorSave';b.type='submit';footer.append(copy,b);form.append(footer);root.append(form);
    if(readOnly){fields.before(node('p','rz-author-readonly','This ended or publisher-listed course is read-only here. Session execution and results remain in Live Classroom.'));}
    form.addEventListener('submit',async e=>{e.preventDefault();if(busy||readOnly)return;
      if(!window.RizSimFieldFeedback?.required(title,'a course title')){title.focus({preventScroll:true});return;}
      const gen=generation;busy=true;fields.disabled=true;b.disabled=true;error.hidden=true;
      const wasNew=draft.isNew;try{
        const data=await service().save(draft,validation(),message=>{if(gen===generation)status.textContent=message;});
        if(gen!==generation)return;const saved=fromServer(data);drafts.delete(draft.key);drafts.set(saved.key,saved);current=saved;list=null;
        window.RizSimCourseEnvironment?.invalidate('own',saved.id);busy=false;go('edit',saved.id,true);
        notice(wasNew?'Course published':'Changes saved','Your course is saved. New learning resources remain private until you publish them to students from Live Classroom.',true);
      }catch(e){if(gen!==generation)return;error.textContent=e.message;error.hidden=false;status.textContent='Draft kept \u00b7 changes not confirmed';}
      finally{if(gen===generation){busy=false;fields.disabled=readOnly;saveEnabled();}}
    });listItems(draft);saveEnabled();
  }
  function simulationPicker(draft){
    if(busy||!draft.can_edit)return;const {d,content}=modal('Choose from your licensed simulations','Add the simulations you want to include. This window only builds the course; it cannot run a session.',true);d.dataset.authorDialog='simulations';
    const search=node('input','rz-author-search');search.type='search';search.placeholder='Find a licensed simulation';search.setAttribute('aria-label','Find a licensed simulation');
    const grid=node('div','rz-author-picker-grid');content.append(search,grid);
    function render(){
      grid.replaceChildren();const items=(snapshot()?.licensed||[]).filter(s=>text(s.title).toLowerCase().includes(search.value.toLowerCase())).sort((a,b)=>text(a.title).localeCompare(text(b.title)));
      if(!items.length)grid.append(node('p','rz-author-empty','No actively licensed simulations match this search.'));
      items.forEach((sim,i)=>{const added=draft.simulations.some(s=>s.product_id===text(sim.id));
        const c=card(sim.title,sim.short_description||'A licensed RizSim learning activity.','grid',()=>{
          if(!allowed()||draft.simulations.some(s=>s.product_id===text(sim.id)))return;
          if(draft.simulations.length>=100){notice('Course limit','Use up to 100 simulations in one course.');return;}
          draft.simulations.push({product_id:text(sim.id),title:sim.title,description:sim.short_description||''});dirty(draft);listItems(draft);render();
        },added?'Added to course':'+ Add to course',['mint','sand','lavender'][i%3],'picker');c.dataset.pickSimulation=text(sim.id);
        c.querySelector('button').disabled=added;if(added)c.classList.add('is-added');grid.append(c);
      });
    }search.addEventListener('input',render);render();search.focus({preventScroll:true});
  }
  function fileCaption(file,mime){
    const caption=node('div','rz-author-file-caption'),mark=node('span','rz-author-item-icon');mark.append(icon(mime?.startsWith('image/')?'image':'file'));
    const copy=node('div');copy.append(node('strong','',file.name),node('small','',file.name.split('.').pop().toUpperCase()+' \u00b7 '+(file.size/1024).toFixed(1)+' KB'));caption.append(mark,copy);return caption;
  }
  function sourcePicker(draft){
    if(busy||!draft.can_edit)return;if(draft.resources.length>=100){notice('Course limit','Use up to 100 learning resources in one course.');return;}
    const gen=generation,{d,content}=modal('Add a learning resource','Choose a file or a valid web link. Resources are staged in this draft and saved when you publish the course or save changes.',true);d.dataset.authorDialog='resource';
    const zone=node('div','rz-author-drop');zone.tabIndex=0;zone.setAttribute('aria-label','Drop a learning resource or browse files');
    const mark=node('span','rz-author-upload-icon');mark.append(icon('file'));const input=node('input','rz-author-file-input');input.type='file';input.accept='.pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg';input.tabIndex=-1;
    const browse=button('Browse files',()=>input.click(),'primary');zone.append(mark,node('h3','','Drop your file here'),node('p','','PDF, PNG or JPEG \u00b7 up to 25 MB'),browse,input);
    const caption=node('div');caption.dataset.authorFileCaption='true';caption.hidden=true;let serial=0,selected=null;
    async function choose(files){
      if(!files?.length)return;if(files.length!==1){notice('Choose one file','Choose one file at a time so each resource has its own title.');return;}
      const seq=++serial;selected=files[0];caption.hidden=false;caption.replaceChildren(fileCaption(selected,selected.type));
      const publish=button('Publish',()=>resourceDetails(draft,{file:selected,mime_type:selected.type,source_type:'file'},d),'primary');publish.dataset.authorFilePublish='true';publish.disabled=true;caption.firstChild.append(publish);
      try{const value=await validation().inspectFile(selected);if(seq!==serial||gen!==generation||!d.isConnected)return;
        caption.querySelector('.rz-author-item-icon').replaceChildren(icon(value.mime.startsWith('image/')?'image':'file'));publish.disabled=false;
      }catch(e){if(seq===serial&&gen===generation&&d.isConnected)caption.append(node('p','rz-author-error',e.message));}
    }
    input.addEventListener('change',()=>choose(input.files));zone.addEventListener('keydown',e=>{if(e.target===zone&&[' ','Enter'].includes(e.key)){e.preventDefault();input.click();}});
    for(const name of ['dragenter','dragover'])zone.addEventListener(name,e=>{e.preventDefault();e.stopPropagation();zone.classList.add('is-over');});
    zone.addEventListener('dragleave',()=>zone.classList.remove('is-over'));zone.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();zone.classList.remove('is-over');choose(e.dataTransfer?.files);});
    const divider=node('div','rz-author-divider','or add a web link');const linkRow=node('div','rz-author-linkrow'),label=node('label','','Paste a valid web link'),link=node('input');link.type='text';link.inputMode='url';link.placeholder='https://example.com/learning-resource';link.autocomplete='off';link.id='rzAuthorLink';label.htmlFor=link.id;label.append(link);
    const publish=button('Publish',()=>{const url=validation().validURL(link.value);if(url)resourceDetails(draft,{external_url:url,source_type:'link'},d);},'primary');publish.dataset.authorLinkPublish='true';publish.disabled=true;let lastInvalid='';
    const validate=()=>{const value=link.value.trim();const valid=validation().validURL(value);publish.disabled=!valid;link.setAttribute('aria-invalid',text(!!value&&!valid));return valid;};
    const explain=()=>{
       const v=link.value.trim(),valid=validate();
       window.RizSimFieldFeedback?.show(link,v&&!valid?'Enter a valid http:// or https:// link without spaces or embedded credentials.':'');
       return valid;
     };
    link.addEventListener('input',()=>{lastInvalid='';validate();if(validation().validURL(link.value))window.RizSimFieldFeedback?.show(link,'');});link.addEventListener('blur',e=>{if(!e.relatedTarget?.closest('.rz-author-close'))explain();});
    link.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(validate())publish.click();else explain();}});linkRow.append(label,publish);content.append(zone,caption,divider,linkRow);browse.focus({preventScroll:true});
  }
  function resourceDetails(draft,resource,parent){
    if(busy)return;const {d,content}=modal('Learning resource details','The chosen source is already attached. Publish adds it to this course draft, not to a live class.');d.dataset.authorDialog='details';
    const form=node('form');form.noValidate=true;
    if(resource.file)form.append(fileCaption(resource.file,resource.mime_type));else form.append(node('p','rz-author-source-caption',resource.external_url));
    const label=node('label','','Resource title'),title=node('input');title.type='text';title.maxLength=200;title.id='rzAuthorResourceTitle';title.required=true;title.value=resource.file?resource.file.name.replace(/\.[^.]+$/,''):'';label.htmlFor=title.id;label.append(title);
     const delivery=resource.file?window.RizSimFileDelivery?.picker('secure_view'):null;
    const group=node('fieldset','rz-author-types'),legend=node('legend','','Resource type'),choices=node('div');group.append(legend,choices);
    types.forEach(([value,name])=>{const wrap=node('label'),radio=node('input');radio.type='radio';radio.name='author-resource-type';radio.value=value;radio.checked=value===(resource.file?'reading':'external_link');wrap.append(radio,document.createTextNode(name));choices.append(wrap);});
    const dl=node('label','','Description (optional)'),desc=node('textarea');desc.maxLength=2000;desc.rows=3;desc.id='rzAuthorResourceDescription';dl.htmlFor=desc.id;dl.append(desc);
    const error=node('p','rz-author-error');error.hidden=true;error.setAttribute('role','alert');const actions=node('div','rz-author-actions'),submit=node('button','rz-author-btn primary','Publish');submit.type='submit';submit.id='rzAuthorResourcePublish';actions.append(button('Back',()=>closeModal(d)),submit);form.append(label);if(delivery)form.append(delivery.element);form.append(group,dl,error,actions);content.append(form);
    form.addEventListener('submit',e=>{e.preventDefault();if(!window.RizSimFieldFeedback?.required(title,'a resource title')){title.focus({preventScroll:true});return;}
      if(!allowed()||current!==draft)return;
      const r={...resource,id:crypto.randomUUID(),title:title.value.trim(),description:desc.value.trim(),material_type:form.querySelector('input[name="author-resource-type"]:checked').value,delivery_mode:delivery?.value()||'secure_view',isNew:true,published_to_class:false};
      draft.resources.push(r);dirty(draft);listItems(draft);closeModal(parent);
      notice('Added to course draft','The resource is ready. '+(draft.isNew?'PUBLISH COURSE':'SAVE CHANGES')+' will save it to your course library. Student publication is controlled in Live Classroom.',true);
    });title.focus({preventScroll:true});
  }
  function draw(){
    if(!ready)return;const root=$('rzCourseAuthoring');if(!root)return;
    const next=account();if(identity!==next){identity=next;generation++;busy=false;loading=false;list=null;current=null;drafts.clear();routeKey='';closeAll(true);root.replaceChildren();}
    if(!isActive()){closeAll();return;}
    if(!allowed()){if(routeKey!=='denied'){root.replaceChildren(node('p','rz-author-error','Course creation and management require active Course Lead access.'));routeKey='denied';}return;}
    if(!service()||!validation())return;const r=readRoute(),key=r.stage+':'+r.id;
    if(routeKey===key)return;routeKey=key;const parent=heading(r.stage);
    if(r.stage==='menu'){current=null;menu(parent);return;}
    if(r.stage==='manage'){current=null;void manage(parent);return;}
    const draftKey=r.stage==='create'?'create':'edit:'+r.id;
    if(r.stage==='create'&&!drafts.has(draftKey))drafts.set(draftKey,fresh());
    if(drafts.has(draftKey)){editor(parent,drafts.get(draftKey));return;}
    if(!r.id){go('manage','',true);return;}
    const gen=generation;parent.append(node('p','rz-author-loading','Loading your course for editing...'));
    service().load(r.id).then(data=>{if(gen!==generation||readRoute().id!==r.id)return;if(data.course_id!==r.id||!Array.isArray(data.resources)||!Array.isArray(data.simulations))throw new Error('Incomplete course details were returned.');drafts.set(draftKey,fromServer(data));routeKey='';schedule();})
      .catch(e=>{if(gen!==generation||readRoute().id!==r.id)return;parent.querySelector('.rz-author-loading')?.remove();errorPanel(parent,e.message,()=>{routeKey='';schedule();});});
  }
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;draw();});}
  function init(){
    if(ready||!$('view-courses'))return;ready=true;
    const observer=new MutationObserver(schedule);
    for(const id of ['authenticatedApp','view-courses'])observer.observe($(id),{attributes:true,attributeFilter:['class']});
    if($('courseRows'))observer.observe($('courseRows'),{childList:true});
    window.addEventListener('hashchange',()=>{routeKey='';schedule();});window.addEventListener('popstate',()=>{routeKey='';schedule();});
    window.addEventListener('beforeunload',e=>{if([...drafts.values()].some(d=>d.dirty)||busy){e.preventDefault();e.returnValue='';}});
    window.RizSimCourseAuthoring=Object.freeze({refresh:()=>{if(!current?.dirty){list=null;routeKey='';schedule();}}});schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
