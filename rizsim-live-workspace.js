/* RizSim V13 — Live Classroom's INNER collapsible workspace rail.
   This is a presentation-only move of existing authenticated controls.
   It never performs an RPC, mints a session, changes an account/role, or
   fabricates learner outcomes. The original V5/V6/V12 modules own those. */
(function () {
  'use strict';
  const $=id=>document.getElementById(id);
  const NAMES={studio:'Session Studio',students:'Live Responses',insights:'Presenter Dashboard'};
  const DESCRIPTIONS={studio:'Prepare this session, add approved resources and share access.',
    students:'Session roster, individual progress and authorized Student responses.',
    insights:'Combined course and simulation insights for the selected classroom.'};
  const PATHS={
    studio:'M3 5h18v14H3z M7 9h10 M7 13h6 M7 17h8',
    students:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
    insights:'M4 19V5 M4 19h16 M8 15l4-5 3 2 5-6',
    collapse:'M15 18l-6-6 6-6',
    expand:'M9 18l6-6-6-6',
    menu:'M4 7h16 M4 12h16 M4 17h16',
    share:'M18 8a3 3 0 1 0-2.83-4 M6 13a3 3 0 1 0-2.83-4 M18 23a3 3 0 1 0-2.83-4 M8.8 11.8l6.5-3.6 M8.8 16.2l6.5 3.6'
  };
  const icon=(name)=>{const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width','21');svg.setAttribute('height','21');
    svg.setAttribute('stroke','currentColor');svg.setAttribute('fill','none');svg.setAttribute('stroke-width','1.8');
    svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');
    const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',PATHS[name]);svg.append(p);return svg;};
  const node=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;
    if(txt!==undefined)n.textContent=String(txt);return n;};
  const button=(txt,fn,cls)=>{const b=node('button',cls||'',txt);b.type='button';b.addEventListener('click',fn);return b;};
  const prefKey='rizsim:faculty:live-sidebar:v13:collapsed';
  let ready=false,root=null,rail=null,scrim=null,caption=null,headerTitle=null,headerDescription=null;
  let collapseButton=null,mobileToggle=null,active='studio',subview='overview';
  let context='',mode='',stage='',session='',identity='',collapsed=false,mobileOpen=false;
  let shareKey='',shareQR=null,shareCode=null,shareLink=null,shareStatus=null,shareStrip=null;
  const tabs={},panels={};
  const canResults=()=>stage==='running'&&!!session;
  function storageGet(){try{return localStorage.getItem(prefKey)==='yes'}catch(_){return false}}
  function storageSet(v){try{localStorage.setItem(prefKey,v?'yes':'no')}catch(_){}}
  function compact(value,store=true){
    collapsed=!!value;if(root)root.classList.toggle('rz-v13-collapsed',collapsed);
    if(collapseButton){collapseButton.setAttribute('aria-expanded',String(!collapsed));
      collapseButton.setAttribute('aria-label',collapsed?'Expand Live Classroom panel':'Collapse Live Classroom panel');
      collapseButton.title=collapsed?'Expand Live Classroom panel':'Collapse Live Classroom panel';
      collapseButton.replaceChildren(icon(collapsed?'expand':'collapse'),node('span','rz-v13-rail-label',collapsed?'Expand panel':'Collapse panel'));}
    if(store)storageSet(collapsed);
  }
  function drawer(open,focusTrigger=false){
    mobileOpen=!!open;if(!root)return;
    root.classList.toggle('rz-v13-drawer-open',mobileOpen);
    if(scrim)scrim.hidden=!mobileOpen;
    if(mobileToggle)mobileToggle.setAttribute('aria-expanded',String(mobileOpen));
    if(rail){if(matchMedia('(max-width: 760px)').matches)rail.inert=!mobileOpen;else rail.inert=false;}
    if(mobileOpen)tabs[active]?.focus({preventScroll:true});
    if(focusTrigger)mobileToggle?.focus({preventScroll:true});
  }
  function changeTab(next,focus=false){
    if(!ready||!Object.hasOwn(NAMES,next)||(!canResults()&&next!=='studio'))return false;
    active=next;
    for(const [name,pane] of Object.entries(panels)){
      const on=name===next;pane.hidden=!on;pane.inert=!on;
      tabs[name].setAttribute('aria-selected',String(on));tabs[name].tabIndex=on?0:-1;
      tabs[name].classList.toggle('is-active',on);
    }
    headerTitle.textContent=NAMES[next];headerDescription.textContent=DESCRIPTIONS[next];
    if(focus)tabs[next].focus({preventScroll:true});
    if(mobileOpen)drawer(false,false);
    if(next==='studio')renderShare();
    return true;
  }
  function studentScreenState(){
    const available=canResults();
    for(const name of ['students','insights']){
      tabs[name].disabled=!available;
      tabs[name].setAttribute('aria-disabled',String(!available));
      tabs[name].title=available?NAMES[name]:'Select an authorized classroom session first';
    }
    if(!available&&active!=='studio')changeTab('studio');
  }
  function studioSubview(next){
    if(next==='share'&&!canResults())return false;
    subview=next;
    const overview=$('rzV13StudioOverview'),share=$('rzV13StudioShare');
    overview.hidden=next!=='overview';overview.inert=next!=='overview';
    share.hidden=next!=='share';share.inert=next!=='share';
    for(const key of ['overview','share']){
      const t=$('rzV13Subview'+key[0].toUpperCase()+key.slice(1));
      t.setAttribute('aria-pressed',String(key===next));
      t.classList.toggle('is-active',key===next);
    }
    if(next==='share')renderShare();
    return true;
  }
  function safeSessionLink(value){
    try{const u=new URL(value,location.href);return u.origin===location.origin&&
      u.pathname==='/access-in.html'&&!!u.searchParams.get('session');}catch(_){return false;}
  }
  function syncShareData(){
    const v=window.RizSimLiveClassroom?.verifiedShare?.();
    if(!v||v.sessionId!==session||!v.code||!safeSessionLink(v.link))return null;
    return v;
  }
  function renderShare(){
    if(!ready||!canResults())return;
    const v=syncShareData();
    const isAvailable=!!v;
    const msg=$('rzV13ShareEmpty');if(msg)msg.hidden=isAvailable;
    const details=$('rzV13ShareDetails');if(details)details.hidden=!isAvailable;
    if(!isAvailable){shareKey='';shareCode.textContent='';shareLink.textContent='';shareQR.replaceChildren();
      if(shareStrip)shareStrip.hidden=true;
      return;}
    if(shareStrip){shareStrip.hidden=!(mode==='simulation'&&stage==='running');
      const code=$('rzV13StudioCode');if(code)code.textContent=v.code;}
    const k=v.sessionId+'\u001f'+v.code+'\u001f'+v.link;
    if(shareKey!==k){shareKey=k;shareCode.textContent=v.code;shareLink.textContent=v.link;
      const a=$('rzV13StudentJoin');a.href=v.link;}
    if(v.qr){shareQR.replaceChildren(v.qr);shareStatus.hidden=true;}
    else{shareQR.replaceChildren();shareStatus.hidden=false;shareStatus.textContent='Preparing the QR code from this authorized classroom session…';}
  }
  function copyValue(value,label){
    if(!value)return;
    if(navigator.clipboard?.writeText){navigator.clipboard.writeText(value)
      .then(()=>{shareStatus.hidden=false;shareStatus.textContent=label+' copied.';})
      .catch(()=>{shareStatus.hidden=false;shareStatus.textContent='Copy unavailable. Select the value above.';});
    }else{shareStatus.hidden=false;shareStatus.textContent='Select and copy the '+label.toLowerCase()+' above.';}
  }
  function insertCourseContents(){
    const target=$('rzV13StudioOverview');if(!target)return;
    const course=$('rzCourseEnvironment'),extra=$('rzStandaloneResources');
    if(course&&course.parentNode!==target)target.insertBefore(course,target.firstChild);
    if(extra&&extra.parentNode!==target)target.append(extra);
    if(course&&['own','purchased'].includes(mode)&&course.parentNode===target&&course!==target.firstChild)
      target.insertBefore(course,target.firstChild);
  }
  function mountContent(){
    const studio=$('rzV13StudioOverview'),student=$('rzLiveStudentRosterMount'),insights=$('rzV13InsightsContent');
    if(!studio||!student||!insights)return;
    for(const key of ['rzLiveSetup','rzLiveRunning']){
      const n=$(key);if(n&&n.parentNode!==studio)studio.append(n);
    }
    const heading=document.querySelector('.rz-v5-results-heading');
    if(heading&&heading.parentNode!==insights)insights.append(heading);
    const anchor=$('rzLiveResultsAnchor');
    if(anchor&&anchor.parentNode!==insights)insights.append(anchor);
    insertCourseContents();
  }
  function specializedSession(s,r){
    if(r?.mode!=='simulation'||r?.stage!=='running'||!r.session)return false;
    const session=(s.sessions||[]).find(x=>String(x.session_id)===String(r.session));
    if(!session?.product_id)return false;
    const modules={'insight-to-implication-bystander':'RizSimInsightFaculty',
      'system-1-system-2-thinking':'RizSimSystemFaculty',
      'hotel-judgment-lab':'RizSimHotelFaculty','seven-sins-greenwashing':'RizSimGreenwashingFaculty'};
    return [...(s.licensed||[]),...(s.products||[]),...(s.simulations||[])].some(p=>
      String(p.id||p.product_id)===String(session.product_id)&&
      Boolean(modules[p.slug]&&window[modules[p.slug]]));
  }
  function draw(s,r){
    if(!ready)return;
    const visible=!!s&&['faculty','course_lead','owner'].includes(s.role)&&
      $('view-classroom')?.classList.contains('active')&&$('authenticatedApp')?.classList.contains('show')&&
      ['environment','setup','running'].includes(r?.stage)&&['simulation','own','purchased'].includes(r?.mode);
    if(!visible){root.hidden=true;root.inert=true;drawer(false);context='';identity='';shareKey='';return;}
    const newIdentity=String(s.userId||'')+':'+s.role;
    if(identity!==newIdentity){identity=newIdentity;context='';compact(storageGet(),false);}
    const key=newIdentity+'|'+r.mode+'|'+r.selection+'|'+r.session+'|'+r.stage;
    mode=r.mode;stage=r.stage;session=String(r.session||'');
    if(key!==context){context=key;subview='overview';active='studio';shareKey='';
      // Opening a different session starts at Session Studio, never a stale report.
      for(const el of [shareCode,shareLink])el.textContent='';
    }
    mountContent();
    root.classList.toggle('rz-v13-sim-specialized-roster',specializedSession(s,r));
    root.hidden=false;root.inert=false;
    caption.textContent=stage==='environment'?'Course environment':stage==='setup'?'Session preparation':
      mode==='simulation'?'Licensed simulation':mode==='purchased'?'Purchased course':'Course Lead · own course';
    studentScreenState();changeTab(active);
    studioSubview(subview);
    $('rzV13SubviewShare').disabled=!canResults();
    $('rzV13SubviewShare').title=canResults()?'View your verified classroom QR, code and student link':'Create or select a classroom session to share it';
    const strip=$('rzV13StudioShareStrip');strip.hidden=!(mode==='simulation'&&stage==='running');
    renderShare();
    if(matchMedia('(max-width: 760px)').matches)rail.inert=!mobileOpen;
  }
  function init(){
    if(ready||!$('rzLiveChoices')||!$('rzLiveRunning')||!$('rzLiveSetup')||!$('rzLiveResultsAnchor'))return;
    const shell=$('rzLiveChoices').parentElement;
    root=node('div','rz-v13-workspace');root.id='rzLiveV13Workspace';root.hidden=true;
    const navTitle=node('h2','rz-v13-aside-title','Live Workspace');navTitle.id='rzV13NavTitle';
    rail=node('aside','rz-v13-rail');rail.id='rzV13SidePanel';rail.setAttribute('aria-labelledby',navTitle.id);
    const brand=node('div','rz-v13-rail-brand');
    const mark=node('img','rz-v13-mark'),titles=node('div','rz-v13-brand-copy');
    mark.src='/rizsim-r.png';mark.alt='';mark.width=42;mark.height=42;
    titles.append(node('strong','','RizSimulation'),node('small','','CLASSROOM CONTROL'));
    brand.append(mark,titles);rail.append(brand,navTitle);
    const tablist=node('div','rz-v13-tablist');tablist.setAttribute('role','tablist');
    tablist.setAttribute('aria-label','Live Classroom workspace');tablist.setAttribute('aria-orientation','vertical');
    for(const name of Object.keys(NAMES)){
      const tab=button('',()=>changeTab(name),'rz-v13-tab');tab.id='rzV13Tab'+name;
      tab.setAttribute('role','tab');tab.setAttribute('aria-controls','rzV13Pane'+name);
      tab.setAttribute('aria-label',NAMES[name]);tab.setAttribute('aria-selected','false');tab.title=NAMES[name];
      tab.append(icon(name),node('span','rz-v13-tab-label',NAMES[name]));
      tabs[name]=tab;tablist.append(tab);
    }
    tablist.addEventListener('keydown',e=>{
      if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;
      e.preventDefault();const options=Object.keys(NAMES).filter(x=>!tabs[x].disabled);
      if(!options.length)return;
      let i=options.indexOf(active);i=e.key==='Home'?0:e.key==='End'?options.length-1:
        (i+(e.key==='ArrowDown'?1:-1)+options.length)%options.length;
      changeTab(options[i],true);
    });
    rail.append(tablist);
    collapseButton=button('',()=>compact(!collapsed),'rz-v13-collapse');collapseButton.id='rzV13Collapse';rail.append(collapseButton);
    const mobileLabel=node('span','rz-v13-mobile-label','Live Workspace');
    mobileToggle=button('',()=>drawer(!mobileOpen),'rz-v13-mobile-toggle');mobileToggle.id='rzV13MobileToggle';
    mobileToggle.setAttribute('aria-controls',rail.id);mobileToggle.setAttribute('aria-expanded','false');
    mobileToggle.append(icon('menu'),mobileLabel);
    scrim=button('',()=>drawer(false,true),'rz-v13-scrim');
    scrim.id='rzV13Scrim';scrim.hidden=true;scrim.setAttribute('aria-label','Close Live Workspace menu');
    const region=node('div','rz-v13-region');
    const heading=node('header','rz-v13-region-heading');caption=node('span','rz-v13-kicker','LIVE CLASSROOM');
    headerTitle=node('h2','',NAMES.studio);headerDescription=node('p','',DESCRIPTIONS.studio);
    heading.append(caption,headerTitle,headerDescription);region.append(heading);
    for(const name of Object.keys(NAMES)){
      const pane=node('section','rz-v13-pane');pane.id='rzV13Pane'+name;
      pane.setAttribute('role','tabpanel');pane.setAttribute('aria-labelledby',tabs[name].id);
      if(name!=='studio'){pane.hidden=true;pane.inert=true;}
      panels[name]=pane;region.append(pane);
    }
    const studio=panels.studio;
    const subnav=node('div','rz-v13-subnav');subnav.setAttribute('aria-label','Session Studio sections');
    const overviewBtn=button('Course Controls',()=>{studioSubview('overview');overviewBtn.dataset.rzVisited='true';},'rz-v13-subtab');
    overviewBtn.id='rzV13SubviewOverview';overviewBtn.setAttribute('aria-pressed','true');
    const shareBtn=button('Share Access',()=>studioSubview('share'),'rz-v13-subtab');
    shareBtn.id='rzV13SubviewShare';shareBtn.disabled=true;shareBtn.setAttribute('aria-pressed','false');
    subnav.append(overviewBtn,shareBtn);studio.append(subnav);
    const overview=node('div','rz-v13-studio-overview');overview.id='rzV13StudioOverview';
    shareStrip=node('div','rz-v13-studio-share-strip');shareStrip.id='rzV13StudioShareStrip';shareStrip.hidden=true;
    const shareStripText=node('div');shareStripText.append(node('strong','','Session entry is ready'),node('p','','Class code: '));
    const stripCode=node('strong','rz-v13-strip-code','');stripCode.id='rzV13StudioCode';
    shareStripText.querySelector('p').append(stripCode);
    shareStrip.append(shareStripText,button('QR / code / link',()=>studioSubview('share'),'rz-v13-share-action'));
    overview.append(shareStrip);studio.append(overview);
    const share=node('section','rz-v13-share-view');share.id='rzV13StudioShare';share.hidden=true;share.inert=true;
    const shareHead=node('div','rz-v13-share-head');shareHead.append(node('h3','','Share classroom access'),
      node('p','','Original authorized session code and join link. No additional link or session is created.'));
    share.append(shareHead);
    const noAccess=node('p','rz-v13-share-empty','There is no active authorized join link for this session. Existing progress remains accessible under Live Responses.');
    noAccess.id='rzV13ShareEmpty';share.append(noAccess);
    const details=node('div','rz-v13-share-card');details.id='rzV13ShareDetails';details.hidden=true;
    shareQR=node('div','rz-v13-share-qr');shareQR.id='rzV13ShareQR';shareQR.setAttribute('aria-label','Same verified session QR code');
    const fields=node('div','rz-v13-share-fields');
    const codeLabel=node('label','rz-v13-share-field-label','CLASS CODE');
    shareCode=node('strong','rz-v13-share-code','');shareCode.id='rzV13ShareCode';
    const copyCode=button('Copy code',()=>copyValue(shareCode.textContent,'Class code'),'rz-v13-copy');
    const codeLine=node('div','rz-v13-copy-line');codeLine.append(shareCode,copyCode);
    const linkLabel=node('label','rz-v13-share-field-label','STUDENT JOIN LINK');
    shareLink=node('span','rz-v13-share-link','');shareLink.id='rzV13ShareLink';
    const copyLink=button('Copy link',()=>copyValue(shareLink.textContent,'Student link'),'rz-v13-copy');
    const linkLine=node('div','rz-v13-copy-line rz-v13-copy-link');linkLine.append(shareLink,copyLink);
    const actions=node('div','rz-v13-share-actions');
    const join=node('a','rz-v13-join-link','Open Student link');join.id='rzV13StudentJoin';join.target='_blank';join.rel='noopener noreferrer';
    actions.append(join);
    fields.append(codeLabel,codeLine,linkLabel,linkLine,actions);
    details.append(shareQR,fields);share.append(details);
    shareStatus=node('p','rz-v13-share-status');shareStatus.id='rzV13ShareStatus';shareStatus.hidden=true;
    shareStatus.setAttribute('role','status');share.append(shareStatus);studio.append(share);
    const students=panels.students;
    const top=node('div','rz-v13-pane-note');
    top.append(node('h3','','Student activity'),node('p','','Joined learners, progress and authorized individual responses at a glance.'));
    students.append(top);
    const rosterMount=node('div','rz-v13-record-slot');rosterMount.id='rzLiveStudentRosterMount';
    const tableMount=node('div','rz-v13-record-slot');tableMount.id='rzLiveStudentRecordsMount';
    const simStudents=node('div','rz-v13-simulation-students');simStudents.id='rzV13SimulationStudentResults';students.append(rosterMount,tableMount,simStudents);
    const insights=panels.insights;
    const intro=node('div','rz-v13-pane-note');intro.append(node('h3','','Learning overview'),
      node('p','','Verified class participation and simulation-specific insight, with private student responses protected.'));
    insights.append(intro);
    const inside=node('div','rz-v13-insights-content');inside.id='rzV13InsightsContent';insights.append(inside);
    root.append(mobileToggle,scrim,rail,region);
    $('rzLiveCollection').after(root);
    ready=true;mountContent();compact(storageGet(),false);changeTab('studio');
    drawer(false);
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&mobileOpen){e.preventDefault();drawer(false,true);}
    });
    window.addEventListener('resize',()=>{
      if(!matchMedia('(max-width: 760px)').matches&&mobileOpen)drawer(false);
      if(rail)rail.inert=matchMedia('(max-width: 760px)').matches&&!mobileOpen;
    });
    const originalSessionCards=$('classroomCreatedResult');if(originalSessionCards){
      // Observe the original card's asynchronous QR generation; no new credentials.
      const update=new MutationObserver(()=>{if(!root.hidden&&active==='studio'&&subview==='share')renderShare();});
      update.observe(originalSessionCards,{childList:true,subtree:true});
    }
    window.RizSimLiveWorkspace=Object.freeze({draw,select:changeTab,
      collapse:compact,selectStudio:studioSubview,
      state:()=>({active,subview,collapsed,mobileOpen,mode,stage,session,visible:!root.hidden})});
    window.RizSimLiveClassroom?.draw?.();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
