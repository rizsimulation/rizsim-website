/* RizSim V5. Presentation only: existing verified bridge, forms and RPC handlers own access.
   One router and one owner for moved panels. No authentication, licence or database writes. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const MODES = { simulation: 'Run Simulation', own: 'Run My Own Course', purchased: 'Run Purchased Course' };
  const ROLES = ['faculty', 'course_lead', 'owner'];
  const homes = new Map(), courseOwners = new Map();
  let route = readRoute(), ready = false, scheduled = false, drawing = false;
  let courseRequest = null, loadedCourse = '', courseError = '', submitting = null;
  let lastView = '', lastCards = '', lastScope = '', qrPromise = null;
  let createPanel, accessPanel, sessionsPanel, resultsPanel;
  let accessLayer, accessDialog, accessFab, accessQr, accessName, accessCode, accessLink, accessOpenLink;
  let accessKey = '', accessAutoOpen = '', accessExpanded = false;
  const text = v => String(v ?? '');
  const bridge = () => window.RizSimFacultyBridge;
  function snapshot() { try { return bridge()?.getSnapshot() || null; } catch (_) { return null; } }
  function el(tag, cls, value) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (value !== undefined) n.textContent = text(value);
    return n;
  }
  function button(label, cls, action) {
    const n = el('button', cls, label); n.type = 'button'; n.addEventListener('click', action); return n;
  }
  function readRoute() {
    const u = new URL(location.href), [mode, stage] = (u.searchParams.get('live') || '').split('-');
    return { mode: MODES[mode] ? mode : '', stage: MODES[mode] && ['list','environment','setup','running'].includes(stage) ? stage : 'menu',
      selection: u.searchParams.get('selection') || '', session: u.searchParams.get('live_session') || '', simulation:u.searchParams.get('simulation') || '' };
  }
  function urlFor(r) {
    const u = new URL(location.href);
    for (const key of ['live','selection','live_session','simulation']) u.searchParams.delete(key);
    if (r.mode) u.searchParams.set('live', r.mode + '-' + r.stage);
    if (r.selection) u.searchParams.set('selection', r.selection);
    if (r.session) u.searchParams.set('live_session', r.session);
    if (r.simulation) u.searchParams.set('simulation',r.simulation);
    u.hash = 'classroom'; return u.pathname + u.search + u.hash;
  }
  function navigate(mode = '', stage = 'menu', selection = '', session = '', replace = false, simulation = '') {
    // All creation flows (including purchased courses) transition setup -> running.
    // Open the access panel once for that fresh session, not on history/resume.
    if(stage==='running' && route.stage==='setup' && route.mode===mode &&
        route.selection===text(selection) && session) accessAutoOpen=text(session);
    route = {mode, stage, selection: text(selection), session: text(session), simulation:text(simulation)};
    const url = urlFor(route);
    if (location.pathname + location.search + location.hash !== url) history[replace ? 'replaceState' : 'pushState'](null, '', url);
    lastCards = ''; lastScope = ''; if (drawing) scheduleDraw(); else draw();
    // Focus announces a new screen without moving the viewport. Never scroll on selection.
    const heading = $(stage === 'list' ? 'rzLiveCollectionTitle' : stage === 'setup' ? 'rzLiveSetupTitle' : 'rzLiveBreadcrumb');
    if (heading) { heading.tabIndex = -1; heading.focus({preventScroll: true}); }
  }
  function message(value, error = false) {
    const n = $('rzLiveHelp'); n.hidden = !value; n.textContent = value || ''; n.classList.toggle('is-error', error);
  }
  function remember(n) {
    if (!n || homes.has(n)) return;
    const marker = document.createComment('RizSim V5 panel home'); n.before(marker); homes.set(n, marker);
  }
  function move(n, target) { if (n && target && n.parentNode !== target) { remember(n); target.append(n); } }
  function restore(n) {
    const marker = homes.get(n);
    if (marker?.parentNode && n.parentNode !== marker.parentNode) marker.after(n);
    if (n) { n.classList.remove('rz-v5-hidden'); n.removeAttribute('inert'); }
  }
  function restoreCourse() {
    ['courseClassroomPanel','courseMaterialsPanel','courseResultsPanel','rzClassroomDropZone'].forEach(id => restore($(id)));
    $('courseClassroomPanel')?.classList.remove('rz-v5-course-setup');
    $('courseClassroomCreateArea')?.removeAttribute('inert');
    const zone = $('rzClassroomDropZone'); if (zone) zone.hidden = true;
  }
  function restoreAll() { for (const n of homes.keys()) restore(n); restoreCourse(); }
  function active() { return $('view-classroom')?.classList.contains('active') && $('authenticatedApp')?.classList.contains('show'); }
  function dataReady() { return $('classroomSessionCount')?.textContent.trim() !== '\u2014'; }
  function licensed(s) { return s.licensed || []; } // Already filtered by the verified licence catalogue.
  function ownCourses(s) { return s.role === 'course_lead' ? (s.courses || []).filter(c => c.active === true) : []; }
  function currentCourse(s) { return (route.mode==='purchased'?(window.RizSimCourseEnvironment?.catalogue()||[]):ownCourses(s)).find(c => text(c.course_id) === route.selection); }
  function courseSessionIds(s) {
    if (text(s.selectedCourseId) !== route.selection || loadedCourse !== route.selection) return new Set();
    return new Set(Array.from($('courseClassroomRows')?.querySelectorAll('[data-course-session-progress]') || []).map(n => n.dataset.courseSessionProgress));
  }
  function eligibleSession(s, item) {
    if (!item) return false;
    if (route.mode === 'purchased') return !!window.RizSimCourseEnvironment?.runtime('purchased',route.selection)?.sessions.some(x=>text(x.session_id)===text(item.session_id));
    if (route.mode === 'own') return text(item.course_id) === route.selection || courseSessionIds(s).has(text(item.session_id));
    return route.mode === 'simulation' && text(item.product_id) === route.selection;
  }
  function card(title, subtitle, actionLabel, action, tone, locked = false, href = '') {
    const n = el('article', 'rz-v5-card rz-v5-card-' + tone + (locked ? ' is-locked' : ''));
    const copy = el('div', 'rz-v5-card-copy'); copy.append(el('h3', '', title), el('p', '', subtitle));
    const a = href ? el('a', 'rz-v5-card-action', actionLabel) : button(actionLabel, 'rz-v5-card-action', action);
    if (href) {
      a.href = href;
      a.addEventListener('click', ev => {
        if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey || ev.button) return;
        ev.preventDefault(); action();
      });
    }
    n.append(copy, a); return n;
  }
  function openWorkspace(view) {
    restoreCourse();
    const link = document.querySelector('#mainNav [data-auth-view="' + view + '"]');
    if (!link || link.style.display === 'none') { message('This workspace is not available for your verified role.', true); return; }
    const u = new URL(location.href);
    for (const k of ['live','selection','live_session','simulation']) u.searchParams.delete(k);
    history.replaceState(null, '', u.pathname + u.search + u.hash);
    link.click();
  }
  function choices(s) {
    const key = 'menu:' + s.role; if (lastCards === key) return; lastCards = key;
    const grid = $('rzLiveChoices'); grid.replaceChildren();
    const descriptions = {simulation:'Choose an actively licensed interactive simulation.', own:'Run a course you have created as a Course Lead.', purchased:'Run a complete, ready-made course purchased from RizSim.'};
    Object.keys(MODES).forEach((mode, i) => {
      const locked = mode === 'own' && s.role !== 'course_lead';
      const r = {mode, stage:'list'};
      grid.append(card(MODES[mode], descriptions[mode], locked ? 'Become a Course Lead' : 'Explore', () => {
        if (locked) {
          // Ordinary Faculty: show the approved Course Lead advertisement in Courses.
          // This is navigation only; authoring and server permissions remain restricted.
          if (s.role === 'faculty') { openWorkspace('courses'); return; }
          message('Course Lead is the premium Faculty tier. Contact RizSim to request an authorized upgrade. This action does not change your access.');
          return;
        }
        navigate(mode, 'list');
      }, i, locked, locked ? '' : urlFor(r)));
    });
  }
  function collection(s) {
    const items = route.mode === 'simulation' ? licensed(s) : route.mode === 'own' ? ownCourses(s) : (window.RizSimCourseEnvironment?.catalogue()||[]);
    const key = route.mode + ':' + s.role + ':' + window.RizSimCourseEnvironment?.catalogueState() + ':' + JSON.stringify(items);
    $('rzLiveCollectionTitle').textContent = {simulation:'Choose a simulation', own:'Choose your course', purchased:'Purchased RizSim courses'}[route.mode];
    if (lastCards === key) return; lastCards = key;
    const grid = $('rzLiveCards'); grid.replaceChildren();
    if (!items.length) grid.append(el('p','rz-v5-empty',route.mode === 'purchased'
      ? (window.RizSimCourseEnvironment?.catalogueState()==='error'?'Purchased-course access could not be verified. Refresh to retry.':'No complete ready-made RizSim courses are currently licensed to this account. Your own courses are kept separate.')
      : 'No active ' + (route.mode === 'own' ? 'courses' : 'licensed simulations') + ' are available for this account.'));
    [...items].sort((a,b) => text(a.title).localeCompare(text(b.title))).forEach((item, i) => {
      const id = text(route.mode === 'simulation' ? item.id : item.course_id), r = {mode:route.mode, stage:route.mode==='simulation'?'setup':'environment', selection:id};
      grid.append(card(item.title || 'Untitled experience', item.short_description || item.description || 'Prepare a session for your learners.',
        'Select ' + (route.mode === 'simulation' ? 'Simulation' : 'Course'), () => navigate(route.mode,route.mode==='simulation'?'setup':'environment',id), i % 4, false, urlFor(r)));
    });
    const own = route.mode === 'own', title = own ? 'Create More Courses' : route.mode === 'simulation' ? 'Add More Simulations' : 'Add More Courses';
    grid.append(card(title, own ? 'Build another course in your Courses workspace.' : 'Explore the Learning, Skills and Children categories on Home.',
      '+ ' + title, () => openWorkspace(own ? 'courses' : 'home'), 'add'));
  }
  function ensureCourse(s) {
    if (loadedCourse === route.selection && text(s.selectedCourseId) === route.selection) return true;
    if (courseRequest || courseError) return false;
    const requested = route.selection;
    if (!bridge()?.selectCourse) return false;
    courseRequest = requested;
    // Serialize requests: an older, slower request must not overwrite a later course selection.
    Promise.resolve().then(() => bridge().selectCourse(requested)).then(value => {
      if (value && text(value.course_id) === requested) { loadedCourse = requested;
        for (const n of $('courseClassroomRows').querySelectorAll('[data-course-session-progress]')) courseOwners.set(n.dataset.courseSessionProgress,requested);
      }
      else courseError = 'The selected course could not be loaded. Return to your courses and try again.';
    }).catch(() => { courseError = 'Course loading failed. Return to your courses and try again.'; })
      .finally(() => { courseRequest = null; scheduleDraw(); });
    return false;
  }
  function setSelect(id, value) {
    const n = $(id); if (!n || !Array.from(n.options).some(o => o.value === value)) return false;
    if (n.value !== value) { n.value = value; n.dispatchEvent(new Event('change',{bubbles:true})); }
    return true;
  }
  function mountCommon() {
    move(createPanel, $('rzLiveSetupMount'));
    move(accessPanel, $('rzLiveRunningMount'));
    move($('classroomRosterPanel'), $('rzLiveResultsAnchor'));
    move(sessionsPanel, $('rzLiveSessionHistory'));
  }
  function setup(s) {
    mountCommon();
    createPanel.classList.toggle('rz-v5-hidden', route.mode !== 'simulation');
    if (route.mode === 'simulation') {
      restoreCourse();
      const product = licensed(s).find(p => text(p.id) === route.selection);
      if (!product || !['faculty','course_lead'].includes(s.role)) { navigate('simulation','list','','',true); message('Session creation requires an active Faculty or Course Lead licence.',true); return; }
      $('rzLiveSetupTitle').textContent = product.title;
      setSelect('classroomSimulationSelect', route.selection);
      // Hide only the redundant picker, never override the secure form's hidden/disabled state.
      $('classroomSimulationSelect')?.closest('.management-field')?.classList.add('rz-v5-fixed-selection');
      return;
    }
    if(route.mode==='purchased'){restoreCourse();window.RizSimCourseEnvironment.setupPurchased(route,s);return;}
    const course = currentCourse(s);
    if (!course) { navigate('own','list','','',true); message('This course is not active or not available to your account.',true); return; }
    $('rzLiveSetupTitle').textContent = course.title;
    const panel = $('courseClassroomPanel'); move(panel,$('rzLiveSetupMount')); panel.classList.add('rz-v5-course-setup');
    const loaded = ensureCourse(s); $('courseClassroomCreateArea').inert = !loaded;
    const picker=$('courseClassroomSimulationSelect');
    if(loaded&&route.simulation){if(!setSelect('courseClassroomSimulationSelect',route.simulation)){navigate('own','environment',route.selection,'',true);return;}picker.closest('.management-field')?.classList.add('rz-v5-fixed-selection');}
    else picker?.closest('.management-field')?.classList.remove('rz-v5-fixed-selection');
    if (!loaded) message(courseError || 'Loading your course and its authorized session controls...',!!courseError);
  }
  function qrLibrary() {
    if (window.RizSimQR) return Promise.resolve(window.RizSimQR);
    if (!qrPromise) qrPromise = new Promise((resolve,reject) => {
      const script = document.createElement('script'); script.src = 'rizsim-qr.js';
      script.onload = () => window.RizSimQR ? resolve(window.RizSimQR) : reject(new Error('QR unavailable'));
      script.onerror = () => reject(new Error('QR unavailable')); document.head.append(script);
    });
    return qrPromise;
  }
  function addQR(cardNode) {
    if (cardNode.querySelector('.rz-v5-qr')) return;
    const raw = cardNode.querySelector('.classroom-link-box')?.textContent.trim();
    let u; try { u = new URL(raw); } catch (_) { return; }
    if (u.origin !== location.origin || u.pathname !== '/access-in.html' || !u.searchParams.get('session')) return;
    const box = el('figure','rz-v5-qr'), caption = el('figcaption','','Scan to join this session');
    box.append(caption); cardNode.querySelector('.classroom-code-box')?.after(box);
    qrLibrary().then(qr => { if (box.isConnected) box.prepend(qr.svg(u.href, 'QR code for this classroom session')); })
      .catch(() => { caption.textContent = 'QR unavailable. Use the class code or student link above.'; });
  }
  // V12: the existing authorized session card is the only source for credentials.
  // This creates a floating presentation, never a second session or join URL.
  function initialiseFloatingAccess() {
    if (accessLayer) return;
    accessLayer = el('div','rz-v5-access-layer');
    accessLayer.id = 'rzLiveAccessLayer'; accessLayer.hidden = true;
    accessDialog = el('section','rz-v5-access-dialog');
    accessDialog.setAttribute('role','dialog');
    accessDialog.setAttribute('aria-modal','true');
    accessDialog.setAttribute('aria-labelledby','rzLiveAccessTitle');
    accessDialog.setAttribute('aria-describedby','rzLiveAccessDescription');
    const head = el('header','rz-v5-access-head');
    const heading = el('div','');
    heading.append(el('span','rz-v5-access-kicker','LIVE CLASSROOM · JOIN DETAILS'));
    const title = el('h2','', 'Your session is ready'); title.id='rzLiveAccessTitle';
    const description = el('p','', 'Share the QR code, class code, or student link to invite participants.');
    description.id='rzLiveAccessDescription';
    heading.append(title,description);
    const minimize = button('Minimize  −','rz-v5-access-minimize',() => minimizeAccess(true));
    minimize.id='rzLiveAccessMinimize';
    head.append(heading,minimize);
    accessName=el('h3','rz-v5-access-name',''); 
    const layout=el('div','rz-v5-access-grid');
    accessQr=el('div','rz-v5-access-qr');
    accessQr.id='rzLiveAccessQR';accessQr.setAttribute('aria-label','Session QR code');
    const details=el('div','rz-v5-access-details');
    const codeLabel=el('span','rz-v5-access-detail-label','CLASS CODE');
    const codeRow=el('div','rz-v5-access-detail-row');
    accessCode=el('strong','rz-v5-access-code');accessCode.id='rzLiveAccessCode';
    const copyCode=el('button','rz-v5-access-copy','Copy code');copyCode.type='button';
    copyCode.id='rzLiveAccessCopyCode';copyCode.setAttribute('aria-label','Copy class code');
    codeRow.append(accessCode,copyCode);
    const linkLabel=el('span','rz-v5-access-detail-label','STUDENT LINK');
    const linkRow=el('div','rz-v5-access-link-row');
    accessLink=el('span','rz-v5-access-link');accessLink.id='rzLiveAccessLink';
    linkRow.append(accessLink);
    const linkActions=el('div','rz-v5-access-link-actions');
    const copyLink=el('button','rz-v5-access-copy','Copy link');copyLink.type='button';copyLink.id='rzLiveAccessCopyLink';
    accessOpenLink=el('a','rz-v5-access-open-link','Open link ↗');
    accessOpenLink.target='_blank';accessOpenLink.rel='noopener noreferrer';
    linkActions.append(copyLink,accessOpenLink);
    details.append(codeLabel,codeRow,linkLabel,linkRow,linkActions);
    layout.append(accessQr,details);
    accessDialog.append(head,accessName,layout);
    accessLayer.append(accessDialog);
    accessFab=button('▦  Session QR & code','rz-v5-access-fab',openAccess);
    accessFab.id='rzLiveAccessFab';accessFab.hidden=true;
    accessFab.setAttribute('aria-label','Open session QR code, class code and student link');
    accessFab.setAttribute('aria-controls','rzLiveAccessLayer');
    document.body.append(accessLayer,accessFab);
    // Existing delegated [data-copy-value] handling provides browser clipboard
    // fallback and copy feedback; buttons are filled only from authorized cards.
    accessLayer.addEventListener('click',event=>{if(event.target===accessLayer)minimizeAccess(true);});
    document.addEventListener('keydown',event=>{
      if(!accessExpanded)return;
      if(event.key==='Escape'){event.preventDefault();minimizeAccess(true);return;}
      if(event.key!=='Tab')return;
      const controls=Array.from(accessDialog.querySelectorAll('button:not(:disabled),a[href]')).filter(n=>n.getClientRects().length>0);
      if(!controls.length)return;
      const first=controls[0],last=controls[controls.length-1];
      if(event.shiftKey && (document.activeElement===first || !accessDialog.contains(document.activeElement))){event.preventDefault();last.focus();}
      else if(!event.shiftKey && (document.activeElement===last || !accessDialog.contains(document.activeElement))){event.preventDefault();first.focus();}
    });
  }
  function minimizeAccess(focusFab=false) {
    if(!accessLayer)return;
    accessExpanded=false;accessLayer.hidden=true;
    accessFab.hidden=!accessKey;
    if(focusFab && !accessFab.hidden) accessFab.focus({preventScroll:true});
  }
  function openAccess() {
    if(!accessKey || !active())return;
    accessExpanded=true;accessLayer.hidden=false;accessFab.hidden=true;
    $('rzLiveAccessMinimize')?.focus({preventScroll:true});
  }
  function clearAccess(clearPending=true) {
    if(accessLayer){
      accessExpanded=false;accessLayer.hidden=true;accessFab.hidden=true;
      if(accessKey){accessQr.replaceChildren();accessName.textContent='';accessCode.textContent='';accessLink.textContent='';}
    }
    accessKey='';
    if(clearPending)accessAutoOpen='';
  }
  function syncFloatingAccess(session) {
    initialiseFloatingAccess();
    const id=text(session.session_id);
    const card=Array.from($('classroomCreatedResult').querySelectorAll('.classroom-created-card')).find(n=>
      !n.classList.contains('rz-v5-hidden') && n.querySelector('[data-roster-session]')?.dataset.rosterSession===id);
    if(!card){clearAccess(false);return;}
    const code=card.querySelector('.classroom-code-value')?.textContent.trim()||'';
    const link=card.querySelector('.classroom-link-box')?.textContent.trim()||'';
    let parsed;try{parsed=new URL(link)}catch(_){clearAccess(false);return;}
    // The join URL uses a protected share token, not the internal session ID.
    const token=parsed.searchParams.get('session');
    if(!code||!token||parsed.origin!==location.origin||parsed.pathname!=='/access-in.html'||(session.share_token&&token!==text(session.share_token))){
      clearAccess(false);return;
    }
    card.classList.add('rz-v5-access-source');
    const key=id+'\u001f'+code+'\u001f'+link;
    if(accessKey!==key){
      if(accessExpanded)minimizeAccess(false);
      accessKey=key;
      accessName.textContent=card.querySelector('h3')?.textContent.trim()||session.class_name||'Session';
      accessCode.textContent=code;
      accessLink.textContent=link;
      accessOpenLink.href=link;
      $('rzLiveAccessCopyCode').dataset.copyValue=code;
      $('rzLiveAccessCopyLink').dataset.copyValue=link;
      accessQr.replaceChildren(el('span','rz-v5-access-loading','Preparing QR code…'));
      // Identical QR generator and exact authenticated join link as the original card.
      qrLibrary().then(qr=>{
        if(accessKey!==key)return;
        accessQr.replaceChildren(qr.svg(link,'QR code for this classroom session'));
      }).catch(()=>{
        if(accessKey===key)accessQr.replaceChildren(el('span','rz-v5-access-loading','QR unavailable. Use the class code or link.'));
      });
    }
    accessFab.hidden=accessExpanded;
    if(accessAutoOpen===id){accessAutoOpen='';openAccess();}
  }
  function showAccess(s, session) {
    let found = false;
    for (const n of $('classroomCreatedResult').querySelectorAll('.classroom-created-card')) {
      const id = n.querySelector('[data-roster-session]')?.dataset.rosterSession;
      const show = id === text(session.session_id); n.classList.toggle('rz-v5-hidden',!show);
      if (show) { found = true; addQR(n); }
    }
    $('rzLiveSessionNotice').hidden = found;
    if (!found) $('rzLiveSessionNotice').textContent = 'This session is closed, ended, or no longer open for entry. Existing student progress and submissions are preserved below.';
    accessPanel.classList.toggle('rz-v5-hidden',!found);
    if(found)syncFloatingAccess(session);else clearAccess(false);
    setSelect('classroomRosterSessionSelect',text(session.session_id));
  }
  function scopeResults(s, session) {
    const own = route.mode === 'own', panel = own ? $('courseResultsPanel') : resultsPanel;
    restore(own ? resultsPanel : $('courseResultsPanel')); move(panel,$('rzLiveResultsAnchor'));
    const prefix = own ? 'courseResult' : 'result';
    const hasResults = (s.submissions || []).some(x => text(x.classroom_session_id) === text(session.session_id));
    const filter = $(prefix + 'SessionFilter'), available = Array.from(filter?.options || []).some(o => o.value === text(session.session_id));
    panel.classList.toggle('rz-v5-hidden',!available);
    const empty = $('rzLiveNoResults'); if (empty.parentNode.lastElementChild !== empty) empty.parentNode.append(empty);
    $('rzLiveNoResults').hidden = available;
    $('rzLiveNoResults').textContent = hasResults && !available ? 'Results for this session are not loaded yet. Refresh the page to retrieve the latest authorized submissions.' : 'No submitted responses are available for this session yet. Student progress is shown above.';
    const key = route.mode + ':' + session.session_id;
    if (available && lastScope !== key) { setSelect(prefix + 'SessionFilter',text(session.session_id)); lastScope = key; }
  }
  function running(s) {
    mountCommon();
    if (route.mode === 'own') {
      if (!currentCourse(s)) { navigate('own','list','','',true); return; }
      if (!ensureCourse(s)) { message(courseError || 'Loading course session details...',!!courseError); $('rzLiveRunningMount').classList.add('rz-v5-hidden'); return; }
      restore($('courseClassroomPanel')); $('courseClassroomPanel').classList.remove('rz-v5-course-setup');
    } else restoreCourse();
    if(route.mode==='purchased'&&!window.RizSimCourseEnvironment?.runtime('purchased',route.selection)){message('Loading licensed course...');return;}
    $('rzLiveRunningMount').classList.remove('rz-v5-hidden');
    const sessions = (s.sessions || []).filter(x => eligibleSession(s,x));
    const session = route.session ? sessions.find(x => text(x.session_id) === route.session) : sessions[0];
    if (!session) { navigate(route.mode,'list','','',true); message('That session is not available in your verified account.',true); return; }
    if (!route.session) { route.session = text(session.session_id); history.replaceState(null,'',urlFor(route)); }
    $('rzLiveSessionTitle').textContent = session.class_name || 'Session access & results';
    showAccess(s,session);
    // V6: saved resources live in the course environment, not duplicate upload forms.
    restore($('courseMaterialsPanel')); $('rzClassroomDropZone').hidden=true;
    scopeResults(s,session);
  }
  function resume(s) {
    const holder = $('rzLiveResume'), entries = s.sessions || [];
    holder.hidden = !['menu','list'].includes(route.stage) || !entries.length;
    const key = JSON.stringify(entries.map(x => [x.session_id,x.class_name,x.product_id,x.course_id,x.active]));
    if (holder.dataset.key === key) return; holder.dataset.key = key;
    const list = holder.querySelector('.rz-v5-resume-list'); list.replaceChildren();
    [...entries].sort((a,b) => text(b.created_at).localeCompare(text(a.created_at))).forEach(item => {
      const row = el('div','rz-v5-resume-row');
      row.append(el('span','',item.class_name || 'Classroom session'),button('Open session','rz-action-secondary',() => {
        const owner = item.course_id || courseOwners.get(text(item.session_id));
        const own = s.role === 'course_lead' && ownCourses(s).some(c => text(c.course_id) === text(owner));
        const fallback = () => navigate(own ? 'own' : 'simulation','running',own ? owner : item.product_id,item.session_id);
        const service = bridge()?.runtime;
        if (!service?.sessionScope) { fallback(); return; }
        service.sessionScope(item.session_id).then(context => {
          navigate(context.mode,'running',context.selection,item.session_id);
        }).catch(error => message(error.message || 'Session access could not be verified.',true));
      })); list.append(row);
    });
  }
  function checkCreated(s) {
    if (!submitting) return;
    const own = submitting.mode === 'own', msg = $(own ? 'courseClassroomCreateMessage' : 'classroomCreateMessage');
    const create = $(own ? 'createCourseClassroomSessionButton' : 'createClassroomSessionButton');
    if (msg?.classList.contains('error') && !create?.disabled) { submitting = null; return; }
    if (!/created successfully/i.test(msg?.textContent || '')) return;
    const item = (s.sessions || []).find(x => !submitting.ids.has(text(x.session_id)) && text(x.product_id) === submitting.product && text(x.class_name) === submitting.name);
    if (!item) return;
    const pending = submitting; submitting = null;
    if(pending.mode!=='simulation')window.RizSimCourseEnvironment?.invalidate(pending.mode,pending.selection);
    if (route.stage === 'setup' && route.mode === pending.mode && route.selection === pending.selection) {
      accessAutoOpen=text(item.session_id);
      navigate(pending.mode,'running',pending.selection,item.session_id);
    }
  }
  function draw() {
    if (!ready || drawing) return; drawing = true;
    try {
      const s = snapshot();
      if (!s || !ROLES.includes(s.role) || !active()) { clearAccess(); if (lastView === 'classroom') restoreAll(); window.RizSimCourseEnvironment?.leave(); lastView = ''; return; }
      lastView = 'classroom';
      if(route.stage !== 'running')clearAccess();
      if (!dataReady()) { message('Loading your verified classroom access...'); return; }
      if (route.mode === 'own' && s.role !== 'course_lead') { route = {mode:'',stage:'menu',selection:'',session:''}; history.replaceState(null,'',urlFor(route)); }
      window.RizSimCourseEnvironment?.render(route,s,navigate);
      if (route.mode === 'purchased' && !['menu','list'].includes(route.stage) && window.RizSimCourseEnvironment?.catalogueState()==='ready' && !currentCourse(s)) { route.stage = 'list'; route.selection = ''; route.session = ''; history.replaceState(null,'',urlFor(route)); }
      if(route.mode==='own'&&route.stage==='environment'&&!currentCourse(s)){route.stage='list';route.selection='';history.replaceState(null,'',urlFor(route));}

      for (const [id,stage] of [['rzLiveChoices','menu'],['rzLiveCollection','list'],['rzLiveSetup','setup'],['rzLiveRunning','running']]) $(id).hidden = route.stage !== stage;
      message('');
      const crumbKey = route.mode + ':' + route.stage+':'+route.selection;
      const crumb = $('rzLiveBreadcrumb');
      if (crumb.dataset.key !== crumbKey) {
        crumb.dataset.key = crumbKey; crumb.replaceChildren(button('Live Classroom','rz-v5-crumb',() => navigate()));
        if (route.mode) crumb.append(el('span','rz-v5-slash','/'),button(MODES[route.mode],'rz-v5-crumb',() => { courseError = ''; navigate(route.mode,'list'); }));
        if (['own','purchased'].includes(route.mode)&&['environment','setup','running'].includes(route.stage)) crumb.append(el('span','rz-v5-slash','/'),button('Course environment','rz-v5-crumb',()=>navigate(route.mode,'environment',route.selection)));
        if (['setup','running'].includes(route.stage)) crumb.append(el('span','rz-v5-slash','/'),el('span','rz-v5-crumb-current',route.stage === 'setup' ? 'Create Session' : 'Session & Results'));
      }
      if (['menu','list'].includes(route.stage)) restoreCourse();
      if (route.stage === 'menu') choices(s);
      if (route.stage === 'list') collection(s);
      if (route.stage === 'setup') setup(s);
      if (route.stage === 'running') running(s);
      if (s.role === 'course_lead' && (s.courses || []).some(c => text(c.course_id) === text(s.selectedCourseId))) {
        for (const n of $('courseClassroomRows').querySelectorAll('[data-course-session-progress]')) courseOwners.set(n.dataset.courseSessionProgress,text(s.selectedCourseId));
      }
      window.RizSimCourseEnvironment?.render(route,s,navigate);
      resume(s); checkCreated(s);
    } finally { drawing = false; }
  }
  function scheduleDraw() {
    if (scheduled) return; scheduled = true;
    requestAnimationFrame(() => { scheduled = false; draw(); });
  }
  function init() {
    if (ready || !$('rzLiveChoices')) return;
    ready = true;
    createPanel = $('classroomCreateForm')?.closest('.portal-panel');
    accessPanel = $('classroomCreatedResult')?.closest('.portal-panel');
    sessionsPanel = $('classroomSessionRows')?.closest('.portal-panel');
    resultsPanel = $('resultRows')?.closest('.portal-panel');
    initialiseFloatingAccess();
    const help = el('p','rz-v5-help'); help.id = 'rzLiveHelp'; help.hidden = true; help.setAttribute('role','status');
    $('rzLiveBreadcrumb').after(help);
    $('rzLiveBreadcrumb').setAttribute('aria-label','Live Classroom steps');
    const resumeBox = el('details','rz-v5-resume'); resumeBox.id = 'rzLiveResume'; resumeBox.hidden = true;
    resumeBox.append(el('summary','','Resume an existing session'),el('div','rz-v5-resume-list')); $('rzLiveCollection').after(resumeBox);
    const historyBox = el('details','rz-v5-session-history'); historyBox.id = 'rzLiveSessionHistory'; historyBox.append(el('summary','','All classroom sessions and controls')); $('rzLiveRunning').append(historyBox);
    const title = $('rzLiveRunning').querySelector('h2'); title.id = 'rzLiveSessionTitle';
    const notice = el('p','rz-v5-empty'); notice.id = 'rzLiveSessionNotice'; notice.hidden = true; $('rzLiveRunningMount').before(notice);
    const noResults = el('p','rz-v5-empty'); noResults.id = 'rzLiveNoResults'; noResults.hidden = true; $('rzLiveResultsAnchor').append(noResults);
    const resultsHeading = el('div','rz-v5-results-heading');
    const refresh = button('Refresh results','rz-action-secondary',() => location.reload());
    refresh.id = 'rzLiveRefreshResults';
    refresh.title = 'Reload this session to retrieve the latest authorized submissions';
    resultsHeading.append(el('h3','','Session results'),refresh);
    $('rzLiveResultsAnchor').before(resultsHeading);

    $('rzLiveJumpResults').addEventListener('click',() => $('rzLiveResultsAnchor').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',block:'start'}));
    for (const [id,mode] of [['createClassroomSessionButton','simulation'],['createCourseClassroomSessionButton','own']]) {
      $(id)?.addEventListener('click',() => {
        const s = snapshot(); if (!s || !active() || route.stage !== 'setup' || route.mode !== mode || $(id).disabled) return;
        const prefix = mode === 'own' ? 'courseClassroom' : 'classroom';
        submitting = {mode,selection:route.selection,ids:new Set((s.sessions || []).map(x => text(x.session_id))),product:$(prefix + 'SimulationSelect').value,name:$(prefix + 'SessionName').value.trim()};
      },true);
    }
    // Observe only legacy data outputs. V5 never writes these nodes, preventing observer loops.
    const observer = new MutationObserver(scheduleDraw);
    for (const id of ['classroomCreatedResult','classroomSessionRows','courseRows','courseClassroomRows','courseMaterialRows','resultRows','courseResultRows','classroomCreateMessage','courseClassroomCreateMessage']) {
      const n = $(id); if (n) observer.observe(n,{childList:true});
    }
    const views = new MutationObserver(scheduleDraw);
    for (const id of ['view-classroom','view-courses','authenticatedApp']) if ($(id)) views.observe($(id),{attributes:true,attributeFilter:['class']});
    window.addEventListener('popstate',() => {
      route = readRoute(); lastCards = ''; lastScope = ''; courseError = '';
      const view = location.hash.slice(1), link = Array.from(document.querySelectorAll('#mainNav [data-auth-view]')).find(n => n.dataset.authView === view);
      if (link && link.style.display !== 'none' && !$('view-' + view)?.classList.contains('active')) link.click();
      scheduleDraw();
    });
    window.addEventListener('hashchange',() => { route = readRoute(); scheduleDraw(); });
    document.addEventListener('click',ev => {
      const n = ev.target.closest('[data-course-session-progress],[data-roster-session]');
      if (!n || !active() || route.stage !== 'running') return;
      const id = n.dataset.courseSessionProgress || n.dataset.rosterSession;
      const s = snapshot(), item = s?.sessions.find(x => text(x.session_id) === id);
      if(item&&id!==route.session){const kind=route.mode==='own'||route.mode==='purchased'?route.mode:'simulation';navigate(kind,'running',kind==='simulation'?item.product_id:route.selection,id);}
    });
    window.RizSimLiveClassroom = Object.freeze({draw:scheduleDraw,navigate});
    scheduleDraw();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
