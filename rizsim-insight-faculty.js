/* RizSim Simulation 01 — native Faculty Live Classroom analytics.
 * Source: Insight to Implication three-core capture. No sample student data is loaded.
 * All records are obtained from the authenticated, session-scoped Supabase RPC.
 */
(function(root){
  'use strict';
  const D=root.InsightData, C=root.InsightCore;
  if(!D||!C)return;
  const PRODUCT='insight-to-implication-bystander';
  const PATH='/simulation-insight-to-implication.html';
  const ROLES=new Set(['owner','faculty','course_lead','institution']);
  const REFRESH_MS=20000;
  let studentHost=null;
 let host=null, sessionId='', sessionName='', rows=[], error='', loading=false, timer=null;
  let requestId=0, fetchedAt=0, selectedAttempt='', groupField='organization', compareA='', compareB='';
  const $=id=>document.getElementById(id);
  const str=(v,max=160)=>String(v==null?'':v).slice(0,max);
  const node=(tag,cls,txt)=>{
    const e=document.createElement(tag);if(cls)e.className=cls;
    if(txt!==undefined)e.textContent=str(txt,2000);return e;
  };
  const named=(tag,cls,text)=>node(tag,cls,text);
  const date=v=>{if(!v)return '—';const d=new Date(v);return isNaN(d)?'—':d.toLocaleString();};
  const pct=(a,b)=>b?(100*a/b).toFixed(1)+'%':'—';
  const fixed=v=>v==null?'—':Number(v).toFixed(1);
  const box=(parent,cls,...children)=>{const e=node('div',cls);e.append(...children);parent.append(e);return e;};
  const heading=(parent,title,subtitle)=>{
    box(parent,'rz-i01-section-head',named('h3','',title),named('p','',subtitle));
  };
  const button=(label,cb,cls='rz-i01-btn')=>{
    const b=node('button',cls,label);b.type='button';b.addEventListener('click',cb);return b;
  };
  function allowedProduct(s,session){
    if(!session||!session.product_id)return false;
    const sources=[...(s.licensed||[]),...(s.products||[]),...(s.simulations||[])];
    return sources.some(p=>String(p.id||p.product_id)===String(session.product_id)&&
      (p.slug===PRODUCT||p.launch_path===PATH));
  }
  function eligible(s,route){
    if(!s||!ROLES.has(s.role)||!route||route.stage!=='running'||!route.session)return null;
    if(!$('view-classroom')?.classList.contains('active'))return null;
    const session=(s.sessions||[]).find(x=>String(x.session_id)===String(route.session));
    return allowedProduct(s,session)?session:null;
  }
  function mount(){
    const anchor=$('rzLiveResultsAnchor');
    if(!anchor)return null;
    if(!host){host=node('section','rz-i01-root');host.id='rzInsightFacultyAnalytics';
      host.setAttribute('aria-label','Insight to Implication classroom analytics');
      anchor.append(host);
    }else if(host.parentNode!==anchor)anchor.append(host);
   const studentAnchor=$('rzV13SimulationStudentResults');
   if(studentAnchor){if(!studentHost){studentHost=node('section','rz-i01-root');studentHost.id='rzInsightStudentResults';}if(studentHost.parentNode!==studentAnchor)studentAnchor.append(studentHost);}
   else if(studentHost){studentHost.remove();studentHost=null;}
   return host;
  }
  function stop(){if(timer){clearInterval(timer);timer=null;}}
  function hide(){
    sessionId='';requestId++;stop();rows=[];selectedAttempt='';compareA='';compareB='';
    if(host)host.hidden=true;
    if(studentHost){studentHost.replaceChildren();studentHost.hidden=true;}
  }
  function draw(s,route){
    const session=eligible(s,route);
    if(!session){hide();return;}
    if(!mount())return;
    host.hidden=false;if(studentHost)studentHost.hidden=false;
    if(sessionId!==String(session.session_id)){
      sessionId=String(session.session_id);sessionName=str(session.class_name,160);
      rows=[];error='';fetchedAt=0;selectedAttempt='';compareA='';compareB='';
      requestId++;render();refresh(true);
    }
    if(!timer)timer=setInterval(()=>{
      if(!sessionId||!host||host.hidden||!$('view-classroom')?.classList.contains('active'))return;
      if(host.contains(document.activeElement))return;
      refresh(false);
    },REFRESH_MS);
  }
  async function refresh(force){
    if(!sessionId||!root.rizsimSharedAuth||loading)return;
    if(!force&&Date.now()-fetchedAt<REFRESH_MS-900)return;
    const thisSession=sessionId,token=++requestId;loading=true;
    if(force){error='';render();}
    try{
      const client=root.rizsimSharedAuth;
      const auth=await client.auth.getUser();
      if(auth.error||!auth.data?.user)throw Error('Sign in to your Faculty workspace to view classroom responses.');
      const result=await client.rpc('get_my_rizsim_insight_session_records',{p_session_id:thisSession});
      if(result.error)throw Error(result.error.message);
      if(token!==requestId||thisSession!==sessionId)return;
      if(!Array.isArray(result.data))throw Error('The server did not return an authorized classroom record list.');
      rows=result.data.map(r=>{
        const raw=r.response_data?.record;
        const record=C.validRecord(raw)?C.clone(raw):null;
        return {attempt:String(r.attempt_id||''),name:str(r.student_name||'Student',120),
          status:str(r.attempt_status||'in_progress',32),joined:r.joined_at||null,
          updated:r.response_updated_at||null,submitted:r.submitted_at||null,record};
      }).filter(r=>r.attempt);
      fetchedAt=Date.now();error='';
    }catch(e){
      if(token===requestId&&thisSession===sessionId)error=String(e?.message||e);
    }finally{
      loading=false;if(token===requestId&&thisSession===sessionId)render();
    }
  }
  function meter(parent,label,a,b,color='teal'){
    const r=node('div','rz-i01-meter-row');
    const caption=box(r,'rz-i01-meter-label',named('span','',label),named('strong','',b?pct(a,b):'—'));
    const track=node('div','rz-i01-meter-track');
    track.setAttribute('role','meter');track.setAttribute('aria-label',label);
    track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');
    track.setAttribute('aria-valuenow',String(b?Math.round(100*a/b):0));
    const fill=node('span','rz-i01-meter-fill rz-i01-'+color);fill.style.width=(b?Math.min(100,Math.max(0,100*a/b)):0)+'%';track.append(fill);
    r.append(track);parent.append(r);return caption;
  }
  function mini(parent,title,value,foot){
    const c=node('div','rz-i01-stat');c.append(named('span','rz-i01-stat-name',title),
      named('strong','rz-i01-stat-value',value),named('small','',foot||''));parent.append(c);
  }
  function clusterLabel(code){return (C.LABEL||{})[code]||code;}
  function valid(){return rows.map(x=>x.record).filter(C.validRecord);}
  function grouped(records,field){
    const o=new Map();
    for(const r of records){const k=str(field==='facultyGroup'?r.facultyGroup:r.profile?.organization,90).trim();
      if(k){if(!o.has(k))o.set(k,[]);o.get(k).push(r);}}
    return o;
  }

  // Classroom progress means *locked decisions*, not tentative choice clicks:
  // six KR + two source/transfer + six KG = 14 verifiable decisions.
  function studentProgress(row){
    const n=row?.record&&C.validRecord(row.record)?C.committed(row.record):0;
    const committed=Math.max(0,Math.min(14,n));
    const phase=row?.record?C.stage(row.record):'join';
    return {committed,percent:Math.round(committed/14*100),
      label:({join:'Not started',kr:'Knowledge Review',source:'Source decision',
        bridge:'Concept bridge',transfer:'Transfer decision',feedback:'Feedback',
        kg:'Knowledge Gain',rga:'Review complete'})[phase]||'In progress'};
  }
  function personalBar(parent,label,count,max,shade='teal'){
    const row=node('div','rz-i01-personal-bar');
    row.append(named('span','rz-i01-personal-label',label));
    const track=node('div','rz-i01-personal-track');track.setAttribute('role','img');
    track.setAttribute('aria-label',label+': '+count+' of '+max);
    const fill=node('span','rz-i01-personal-fill rz-i01-'+shade);
    fill.style.width=(max?Math.min(100,Math.max(0,100*count/max)):0)+'%';
    track.append(fill);row.append(track,named('strong','',count+' / '+max));parent.append(row);
  }
  // Mirrors the Student RGA content using the SAME saved record + scoring
  // functions; Faculty never opens a Student session or mutates Student data.
  function individualStudentResult(row){
    const rec=row.record, progress=studentProgress(row),rga=C.rga(rec);
    const report=node('section','rz-i01-individual');
    report.id='rizsimInsightIndividualResult';
    report.setAttribute('aria-label','Read-only individual Student results');
    const banner=node('div','rz-i01-individual-banner');
    const titles=node('div');
    titles.append(named('span','rz-i01-eyebrow','INDIVIDUAL STUDENT · FACULTY REVIEW'),
      named('h3','',row.name),
      named('p','',str(rec.profile?.organization||'RizSim classroom',120)+' · '+(row.status==='submitted'?'Submitted':'In progress')));
    const tools=node('div','rz-i01-individual-tools');
    tools.append(named('span','rz-i01-readonly-chip','Read-only'),
      button('Close student result',()=>{selectedAttempt='';render();},'rz-i01-btn rz-i01-secondary'));
    banner.append(titles,tools);report.append(banner);
    const progressPanel=node('div','rz-i01-student-progress');
    progressPanel.append(named('strong','',progress.percent+'% complete'),
      named('span','',progress.committed+' / 14 decisions locked · '+progress.label));
    const track=node('div','rz-i01-progress-track');track.setAttribute('role','progressbar');
    track.setAttribute('aria-label',row.name+' completed decisions');
    track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');
    track.setAttribute('aria-valuenow',String(progress.percent));
    const fill=node('span','rz-i01-progress-fill');fill.style.width=progress.percent+'%';
    track.append(fill);progressPanel.append(track);report.append(progressPanel);
    const steps=node('div','rz-i01-journey');
    for(const [abbr,desc,done] of [
      ['KR','Knowledge Review',rec.locks.kr],
      ['LT','Learning Transfer',rec.locks.transfer],
      ['KG','Knowledge Gain',rec.locks.kg],
      ['RGA','Personal results',!!rga]
    ]){
      const e=node('div','rz-i01-journey-step'+(done?' done':''));
      e.append(named('strong','',abbr),named('small','',desc));steps.append(e);
    }
    report.append(steps);
    const overview=node('div','rz-i01-individual-body');
    const headingBlock=node('div','rz-i01-section-head');
    headingBlock.append(named('h3','',rga?'Your learning in view':'Learning activity in progress'),
      named('p','',rga?'Same review and transfer measures shown in the Student dashboard. This is a within-session snapshot, not durable mastery.':
        'Only locked decisions are shown. Unanswered items are not counted as incorrect.'));
    overview.append(headingBlock);
    const tiles=node('div','rz-i01-student-tiles');
    mini(tiles,'Knowledge Review',rec.locks.kr?C.score(rec,'kr')+' / 6':'—','Initial locked review');
    mini(tiles,'Knowledge Gain',rec.locks.kg?C.score(rec,'kg')+' / 6':'—','Final locked review');
    mini(tiles,'Review change',rga?(rga.change>0?'+':'')+rga.change+' / 6':'—',
      rga?(rga.changePP>0?'+':'')+fixed(rga.changePP)+' percentage points':'Requires paired completed stages');
    const flags=C.ltFlags(rec);
    mini(tiles,'Source → Transfer',flags?(flags.source?'✓':'×')+' → '+(flags.transfer?'✓':'×'):'—',
      flags?clusterLabel(flags.cluster):'Awaiting locked transfer');
    overview.append(tiles);
    if(!rga){
      overview.append(named('p','rz-i01-empty','The completed Student Review Gain Analytics screen is available when Knowledge Gain has been locked. This preview does not infer missing answers.'));
      report.append(overview);return report;
    }
    const grid=node('div','rz-i01-personal-grids');
    const pair=node('div','rz-i01-personal-panel');
    pair.append(named('h4','','KR versus KG'),named('p','','Matched review of the same six concepts'));
    personalBar(pair,'KR',rga.kr,6,'gold');
    personalBar(pair,'KG',rga.kg,6,'teal');
    const transitions=node('div','rz-i01-personal-panel');
    transitions.append(named('h4','','Item-by-item movement'),named('p','','Correctness transitions across six matched questions'));
    for(const [label,key] of [
      ['Stayed correct','stayedCorrect'],['Became correct','becameCorrect'],
      ['Became incorrect','becameIncorrect'],['Still incorrect','stillIncorrect']
    ])personalBar(transitions,label,rga.transitions[key],6,'teal');
    grid.append(pair,transitions);overview.append(grid);
    const pathTitle=node('div','rz-i01-section-head rz-i01-path-title');
    pathTitle.append(named('h3','','Learning-transfer pathway'),
      named('p','','Source judgment → factual knowledge → transfer'));
    overview.append(pathTitle);
    const cards=node('div','rz-i01-path-cards');
    for(const [code,label] of [
      ['CC','Both correct'],['IC','Improved at transfer'],
      ['CI','Transfer needs review'],['II','Review both']
    ]){
      const selected=rga.lt.cluster===code;
      const card=node('div','rz-i01-path-card'+(selected?' selected':''));
      const dots=node('div','rz-i01-path-dots');
      for(const c of code)dots.append(node('span','rz-i01-path-dot '+(c==='C'?'correct':'incorrect')));
      card.append(named('strong','',clusterLabel(code)),dots,named('small','',label));
      if(selected)card.append(named('span','rz-i01-path-badge','This student’s path'));
      cards.append(card);
    }
    overview.append(cards);
    const takeaway=node('div','rz-i01-student-takeaway');
    takeaway.append(
      named('p','','Source: '+D.source.options[rec.picks.source]),
      named('p','','Transfer: '+D.transfer.options[rec.picks.transfer]),
      named('p','','Next action: '+D.feedback[rga.lt.cluster].short)
    );
    overview.append(takeaway);
    const keySection=node('details','rz-i01-answer-guide');
    keySection.append(named('summary','','Faculty answer guide · six matched concepts'));
    keySection.append(named('p','rz-i01-note','Available only within this authorized Faculty review. It does not release the key to Students.'));
    const answerScroll=node('div','rz-i01-table-scroll');
    const answerTable=node('table','rz-i01-table'),thead=node('thead'),head=node('tr');
    ['Concept','KR response','KG response','Correct option'].forEach(x=>head.append(named('th','',x)));
    thead.append(head);answerTable.append(thead);
    const body=node('tbody');
    for(const q of D.review){
      const tr=node('tr');
      [q.id+' · '+q.concept,
        rec.picks.kr[q.id]+' · '+(C.correct(rec.picks.kr[q.id],q)?'Correct':'Incorrect'),
        rec.picks.kg[q.id]+' · '+(C.correct(rec.picks.kg[q.id],q)?'Correct':'Incorrect'),
        q.key].forEach(x=>tr.append(named('td','',x)));
      body.append(tr);
    }
    answerTable.append(body);answerScroll.append(answerTable);keySection.append(answerScroll);
    overview.append(keySection);
    overview.append(named('p','rz-i01-note',row.status==='submitted'?
      'Submission confirmed in the Student attempt. Faculty review cannot edit locked responses.':
      'All decisions are locked, but server submission is still pending. The Student may need to retry confirmation.'));
    report.append(overview);return report;
  }

  function allRecords(parent,records){
    heading(parent,'Participant activity','Joined students and locked stages are reported from this authorized session only.');
    if(!rows.length){parent.append(named('p','rz-i01-empty','No students have joined this session yet.'));return;}
    const scroll=node('div','rz-i01-table-scroll'),table=node('table','rz-i01-table');
    const thead=node('thead'),h=node('tr');
    ['Student','Progress','Stage','KR / 6','Source → transfer','KG / 6','Submission','Result'].forEach(x=>h.append(named('th','',x)));
    thead.append(h);table.append(thead);
    const body=node('tbody');
    for(const row of rows){
      const tr=node('tr');const rec=row.record,flag=rec?C.ltFlags(rec):null;
      let stage=rec?C.stage(rec):'Joined';
      const vals=[row.name,stage,rec?String(C.score(rec,'kr')??'—'):'—',
        flag?flag.cluster:'—',rec?String(C.score(rec,'kg')??'—'):'—',
        row.status==='submitted'?'Submitted':'In progress'];
      tr.append(named('td','',vals[0]));
      const progress=studentProgress(row),progressCell=node('td','rz-i01-progress-cell');
      const progressLabel=node('div','rz-i01-progress-label');
      progressLabel.append(named('strong','',progress.percent+'%'),
        named('small','',progress.committed+' / 14 locked'));
      const progressTrack=node('div','rz-i01-progress-track');
      progressTrack.setAttribute('role','progressbar');
      progressTrack.setAttribute('aria-label',row.name+' completion');
      progressTrack.setAttribute('aria-valuemin','0');
      progressTrack.setAttribute('aria-valuemax','100');
      progressTrack.setAttribute('aria-valuenow',String(progress.percent));
      const bar=node('span','rz-i01-progress-fill');bar.style.width=progress.percent+'%';
      progressTrack.append(bar);progressCell.append(progressLabel,progressTrack);tr.append(progressCell);
      vals.slice(1).forEach(v=>tr.append(named('td','',v)));
      const td=node('td');
      const inspect=button(selectedAttempt===row.attempt?'Close result':'View student result',()=>{
        const opening=selectedAttempt!==row.attempt;
        selectedAttempt=opening?row.attempt:'';
        render();
        if(opening)requestAnimationFrame(()=>{
          const target=document.getElementById('rizsimInsightIndividualResult');
          target?.scrollIntoView({block:'nearest',behavior:root.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
        });
      });
      inspect.disabled=!rec;inspect.setAttribute('aria-expanded',String(selectedAttempt===row.attempt));
      td.append(inspect);tr.append(td);body.append(tr);
    }
    table.append(body);scroll.append(table);parent.append(scroll);
    const target=rows.find(x=>x.attempt===selectedAttempt);
    if(!target?.record)return;
    parent.append(individualStudentResult(target));
  }
  // Premium Sim01 summary uses ONLY the same verified classroom analytics
  // shown below. A paired mean is never calculated from unmatched students.
  function learningShift(parent,a){
    // All displayed means and matched-item transitions come from one C.analyse()
    // of valid, committed, authorized records. Partial answers do not become 0s.
    const feature=node('section','rz-i01-learning-shift');
    feature.setAttribute('aria-label','Verified paired learning shift and transfer overview');
    const head=node('div','rz-v153-shift-heading');
    const caption=node('div');
    caption.append(named('span','rz-i01-eyebrow','ONE ROOM · VERIFIED LEARNING'),
      named('h3','','One room. A visible learning shift.'),
      named('p','','Matched Knowledge Review and Knowledge Gain, plus locked transfer decisions. Descriptive classroom evidence only.'));
    head.append(caption,named('span','rz-v153-shift-sample','PAIRED LEARNERS · '+a.pairedN));
    feature.append(head);
    const kpis=node('div','rz-i01-shift-kpis');
    const gain=a.pairedN?(a.changePP>0?'+':'')+fixed(a.changePP)+' pp':'—';
    for(const [value,label,note] of [
      [a.pairedN?fixed(a.krAvg)+' / 6':'—','Mean KR','Entry · '+a.pairedN+' paired learners'],
      [a.pairedN?fixed(a.kgAvg)+' / 6':'—','Mean KG','Exit · '+a.pairedN+' paired learners'],
      [gain,'Mean change','KG minus KR · percentage points']
    ]){
      const card=node('article','rz-i01-shift-metric');
      card.append(named('span','',label),named('strong','',value),named('small','',note));kpis.append(card);
    }
    feature.append(kpis);
    if(a.pairedN){
      const bars=node('div','rz-v153-shift-bars');
      for(const [name,score,tone] of [['Mean KR',a.krAvg,'kr'],['Mean KG',a.kgAvg,'kg']]){
        const row=node('div','rz-v153-shift-bar-row');
        const label=node('span','',name),value=named('strong','',fixed(score)+' / 6');
        const track=node('div','rz-v153-shift-bar '+tone);track.setAttribute('role','meter');
        track.setAttribute('aria-label',name+' paired score out of 6');
        track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','6');
        track.setAttribute('aria-valuenow',String(score));
        const fill=node('span');fill.style.width=(100*score/6).toFixed(1)+'%';
        track.append(fill);row.append(label,track,value);bars.append(row);
      }
      feature.append(bars);
    }
    const reviews=node('div','rz-v153-review-group');
    const reviewHead=node('div','rz-i01-shift-path-title');
    reviewHead.append(named('h4','','Matched review answers'),
      named('p','','Correctness transitions across the six review items for matched learners.'));
    reviews.append(reviewHead);
    const reviewGrid=node('div','rz-v153-review-tiles');
    for(const [key,label] of [
      ['stayedCorrect','Correct → correct'],['becameCorrect','Incorrect → correct'],
      ['becameIncorrect','Correct → incorrect'],['stillIncorrect','Incorrect → incorrect']
    ]){
      const card=node('div','rz-v153-review-tile');
      card.append(named('strong','',a.pairedN?String(a.transitions[key]):'—'),
        named('span','',label));reviewGrid.append(card);
    }
    reviews.append(reviewGrid);feature.append(reviews);
    const pathTitle=node('div','rz-i01-shift-path-title');
    pathTitle.append(named('h4','','Four paths through Learning Transfer'),
      named('p','','Source decision → transfer decision · only locked pairs (n = '+a.ltCompleted+').'));
    feature.append(pathTitle);
    const paths=node('div','rz-i01-shift-paths');
    for(const code of ['CC','IC','CI','II']){
      const card=node('article','rz-i01-shift-path rz-i01-shift-'+code.toLowerCase());
      card.append(named('span','rz-v153-path-eyebrow',code+' · '+clusterLabel(code)),
        named('strong','',a.ltCompleted?String(a.clusters[code]):'—'),
        named('small','','Locked source-to-transfer path'));
      paths.append(card);
    }
    feature.append(paths,named('p','rz-i01-shift-caveat',
      'Incomplete records do not create scores or paths. Classroom changes are descriptive, not proof of causal or durable learning.'));
    parent.append(feature);
  }
  function render(){
    if(!host||host.hidden||!sessionId)return;
    host.replaceChildren();if(studentHost)studentHost.replaceChildren();
    const header=node('div','rz-i01-head');
    const title=node('div');
    title.append(named('span','rz-i01-eyebrow','SIMULATION 01 · VERIFIED FACULTY ANALYTICS'),
      named('h2','', 'Insight to Implication'),
      named('p','',sessionName+' · The Bystander Effect'));
    const actions=node('div','rz-i01-actions');
    const refreshBtn=button(loading?'Refreshing…':'Refresh results',()=>refresh(true));refreshBtn.disabled=loading;
    const printBtn=button('Print report',()=>root.print(),'rz-i01-btn rz-i01-secondary');
    actions.append(refreshBtn,printBtn);header.append(title,actions);host.append(header);
    if(error){host.append(named('p','rz-i01-error','Analytics unavailable: '+error+' No student data has been inferred.'));return;}
    if(loading&&!fetchedAt){host.append(named('p','rz-i01-empty','Loading authorized student activity…'));return;}
    const records=valid(),a=C.analyse(records),paired=records.filter(r=>r.locks.kg);
    const summary=node('div','rz-i01-stat-grid');
    mini(summary,'Joined',String(rows.length),'Authorized session roster');
    mini(summary,'KR locked',String(a.krCompleted),'Completed first review');
    mini(summary,'Transfer locked',String(a.ltCompleted),'Committed source/transfer');
    mini(summary,'KG locked',String(a.kgCompleted),'Matched completed review');
    host.append(summary);
    learningShift(host,a);
    const wrap=node('div','rz-i01-sections');
    const gains=node('article','rz-i01-card');
    heading(gains,'Knowledge Review → Knowledge Gain','Both means use matched students who locked both stages (n = '+a.pairedN+').');
    const means=node('div','rz-i01-paired');
    meter(means,'Knowledge Review · '+fixed(a.krAvg)+' / 6',a.krAvg??0,6,'gold');
    meter(means,'Knowledge Gain · '+fixed(a.kgAvg)+' / 6',a.kgAvg??0,6,'teal');
    gains.append(means,named('p','rz-i01-note','Mean change: '+(a.pairedN?fixed(a.changePP)+' percentage points':'—')+'. This is a within-session difference, not proof of causal or durable learning.'));
    if(a.pairedN){
      const t=node('div','rz-i01-quartet');
      for(const [k,label] of [['stayedCorrect','Correct → correct'],['becameCorrect','Incorrect → correct'],['becameIncorrect','Correct → incorrect'],['stillIncorrect','Incorrect → incorrect']]){
        mini(t,label,String(a.transitions[k]),'Matched item transitions');
      }gains.append(t);
    }
    wrap.append(gains);
    const transfers=node('article','rz-i01-card');
    heading(transfers,'Learning Transfer pathways','Correctness is recomputed from source and transfer choices; only locked decisions are counted.');
    if(!a.ltCompleted){transfers.append(named('p','rz-i01-empty','No locked source-to-transfer pairs yet.'));}
    else {
      for(const code of ['CC','IC','CI','II'])meter(transfers,code+' · '+clusterLabel(code),a.clusters[code],a.ltCompleted,'violet');
      transfers.append(named('p','rz-i01-note','Source correct: '+pct(a.sourceCorrect,a.ltCompleted)+' · Transfer correct: '+pct(a.transferCorrect,a.ltCompleted)+'.'));
      const chooser=node('div','rz-i01-choice-grid');
      for(const phase of ['source','transfer']){
        const p=node('div');p.append(named('h4','',phase==='source'?'Source judgment':'Transfer decision'));
        const denom=records.filter(r=>r.locks[phase]).length;
        for(const key of ['A','B','C','D'])meter(p,'Option '+key,a.choices[phase][key],denom,'rose');
        chooser.append(p);
      }transfers.append(chooser);
    }
    wrap.append(transfers);
    const items=node('article','rz-i01-card');
    heading(items,'Six-concept item comparison','Knowledge Review and Gain percentages use their own locked-stage denominators; no unanswered item is counted incorrect.');
    if(!a.krCompleted){items.append(named('p','rz-i01-empty','Item comparisons appear after Knowledge Review is locked.'));}
    else{
      for(const itm of a.items){
        const part=node('div','rz-i01-item');part.append(named('strong','',itm.id+' · '+itm.concept));
        meter(part,'KR · '+itm.krCorrect+'/'+itm.krTotal,itm.krCorrect,itm.krTotal,'gold');
        meter(part,'KG · '+itm.kgCorrect+'/'+itm.kgTotal,itm.kgCorrect,itm.kgTotal,'teal');
        items.append(part);
      }
    }
    wrap.append(items);
    const groups=node('article','rz-i01-card');
    heading(groups,'Group comparisons','Exploratory descriptive comparisons only; the source captures permit organisation or Faculty-defined groups.');
    const filter=node('label','rz-i01-filter','Compare by ');
    const field=node('select','rz-i01-select');
    for(const [k,label] of [['organization','Organisation'],['facultyGroup','Faculty group']]){
      const op=node('option','',label);op.value=k;op.selected=groupField===k;field.append(op);
    }
    field.addEventListener('change',()=>{groupField=field.value;compareA='';compareB='';render();});
    filter.append(field);groups.append(filter);
    const pairs=grouped(records,groupField),names=[...pairs.keys()].sort();
    if(names.length<2)groups.append(named('p','rz-i01-empty','At least two named groups with valid records are required. No group labels are inferred.'));
    else{
      const selrow=node('div','rz-i01-select-row');
      function selectGroup(which){
        const select=node('select','rz-i01-select');
        for(const x of names){const op=node('option','',x);op.value=x;op.selected=x===which;select.append(op);}
        return select;
      }
      if(!names.includes(compareA))compareA=names[0];
      if(!names.includes(compareB)||compareB===compareA)compareB=names.find(n=>n!==compareA)||names[0];
      const aa=selectGroup(compareA),bb=selectGroup(compareB);
      aa.addEventListener('change',()=>{compareA=aa.value;if(compareB===compareA)compareB=names.find(n=>n!==compareA)||compareA;render();});
      bb.addEventListener('change',()=>{compareB=bb.value;if(compareA===compareB)compareA=names.find(n=>n!==compareB)||compareB;render();});
      selrow.append(named('span','','Group A'),aa,named('span','','Group B'),bb);groups.append(selrow);
      const table=node('table','rz-i01-table');const tr=node('tr');
      ['Measure',compareA,compareB].forEach(v=>tr.append(named('th','',v)));const thead=node('thead');thead.append(tr);table.append(thead);
      const A=C.analyse(pairs.get(compareA)||[]),B=C.analyse(pairs.get(compareB)||[]);
      for(const [label,val] of [['Participants',[A.joined,B.joined]],['KR locked',[A.krCompleted,B.krCompleted]],['KG locked',[A.kgCompleted,B.kgCompleted]],['Paired KR mean',[fixed(A.krAvg),fixed(B.krAvg)]],['Paired KG mean',[fixed(A.kgAvg),fixed(B.kgAvg)]],['Gain (percentage points)',[fixed(A.changePP),fixed(B.changePP)]]]){
        const line=node('tr');line.append(named('td','',label));val.forEach(v=>line.append(named('td','',v)));table.append(line);
      }groups.append(box(node('div','rz-i01-table-scroll'),'',table)); // moved into the scroll element below
      const last=groups.lastElementChild;if(last?.parentNode===groups&&!last.classList.contains('rz-i01-table-scroll'))last.classList.add('rz-i01-table-scroll');
    }
    wrap.append(groups);
    const activity=node('article','rz-i01-card rz-i01-card-wide');allRecords(activity,records);
    if(studentHost)studentHost.append(named('h2','','Insight to Implication · Live Responses'),activity);
    else wrap.append(activity);
    host.append(wrap,named('p','rz-i01-note','Source: committed responses saved in the current authorized RizSim classroom. No sample records or unpublished cohort statistics are displayed. Last refreshed: '+(fetchedAt?date(fetchedAt):'not yet loaded')+'.'));
  }
  root.RizSimInsightFaculty=Object.freeze({draw,refresh:()=>refresh(true),
    state:()=>({sessionId,joined:rows.length,records:valid().length,error,loading})});
})(window);
