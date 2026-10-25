/* RizSim Simulation 02 — native Faculty class analytics.
 * Source fidelity: original System 1 / System 2 capture and private source scoring.
 * All academic scores MUST come from authorized server-side scoring RPCs.
 * Never bundle the protected question key, the private Faculty HTML, or demo learners.
 */
(function(root){
 'use strict';
 const MODULE='riz-ai-pedagogy-2026-s1s2-v1';
 const SLUG='system-1-system-2-thinking',PATH='/simulation-system-1-system-2.html';
 const AUTH_ROLES=new Set(['owner','faculty','course_lead','institution']);
 const CASES=['Bystander Effect','Confirmation Bias'];
 const IDS=['K1','K2','K3','K4','K5','K6'];
 const SELECTOR='rzLiveResultsAnchor';
 const PERIOD=20000;
 const $=id=>document.getElementById(id);
 const text=(v,n=500)=>String(v??'').slice(0,n);
 const elem=(tag,cls='',value)=>{const e=document.createElement(tag);if(cls)e.className=cls;
   if(value!==undefined)e.textContent=text(value,2400);return e;};
 const append=(parent,...children)=>{parent.append(...children);return parent};
 const box=(parent,cls,...children)=>append(parent,append(elem('div',cls),...children));
 const btn=(label,onClick,cls='rz-s02-btn')=>{const b=elem('button',cls,label);b.type='button';b.addEventListener('click',onClick);return b;};
 const num=(v,d=1)=>Number.isFinite(v)?Number(v).toFixed(d):'—';
 const percent=(a,b)=>b?(a/b*100).toFixed(1)+'%':'—';
 const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
 const SD=a=>a.length>=2?Math.sqrt(a.reduce((x,y)=>x+(y-avg(a))**2,0)/(a.length-1)):null;
 const limit=(n,min,max)=>Math.min(max,Math.max(min,n));
 const headline=(p,h,sub)=>box(p,'rz-s02-section-title',elem('h3','',h),elem('p','',sub));
 let studentHost=null;
 let host=null,sessionId='',sessionName='',rows=[],error='',pending=false,loadedAt=0;
 let selected='',groupMode='group',groupA='',groupB='',timer=null,requestToken=0;
 function licensed(s,x){
   if(!x?.product_id)return false;
   return [...(s.licensed||[]),...(s.products||[]),...(s.simulations||[])].some(p=>
     String(p.id||p.product_id)===String(x.product_id)&&(p.slug===SLUG||p.launch_path===PATH));
 }
 function eligible(s,route){
   if(!s||!AUTH_ROLES.has(s.role)||route?.stage!=='running'||!route.session
     ||!$('view-classroom')?.classList.contains('active'))return null;
   const x=(s.sessions||[]).find(v=>String(v.session_id)===String(route.session));
   return licensed(s,x)?x:null;
 }
 function mount(){
   const anchor=$(SELECTOR);if(!anchor)return false;
   if(!host){host=elem('section','rz-s02-root');host.id='rizsimSystemFacultyResults';
     host.setAttribute('aria-label','System 1 and System 2 classroom results');}
   if(host.parentNode!==anchor)anchor.append(host);
   const studentAnchor=$('rzV13SimulationStudentResults');
   if(studentAnchor){if(!studentHost){studentHost=elem('section','rz-s02-root');studentHost.id='rizsimSystemStudentResults';}if(studentHost.parentNode!==studentAnchor)studentAnchor.append(studentHost);}
   else if(studentHost){studentHost.remove();studentHost=null;}
   return true;
 }
 function reset(){
   requestToken++;if(timer){clearInterval(timer);timer=null;}
   sessionId='';sessionName='';rows=[];selected='';loadedAt=0;error='';pending=false;
   groupA='';groupB='';if(host)host.hidden=true;
   if(studentHost){studentHost.replaceChildren();studentHost.hidden=true;}
 }
 function draw(s,route){
   const x=eligible(s,route);if(!x){reset();return;}
   if(!mount())return;host.hidden=false;if(studentHost)studentHost.hidden=false;
   if(sessionId!==String(x.session_id)){
     sessionId=String(x.session_id);sessionName=text(x.class_name||'RizSim Classroom',180);
     rows=[];error='';loadedAt=0;selected='';groupA='';groupB='';
     requestToken++;render();refresh(true);
   }
   if(!timer)timer=setInterval(()=>{
     if(!sessionId||host.hidden||!$('view-classroom')?.classList.contains('active'))return;
     if(host.contains(document.activeElement))return;
     refresh(false);
   },PERIOD);
 }
 function verifiedRecord(r){
   return r&&typeof r==='object'&&r.schema==='RizSimulation.Participant.v1'&&
     r.assessment===MODULE&&Array.isArray(r?.kr?.a)&&r.kr.a.length===6&&
     Array.isArray(r?.kg?.a)&&r.kg.a.length===6&&Array.isArray(r.lt)&&r.lt.length===2?r:null;
 }
 function verifiedMetric(m){
   return m&&typeof m==='object'&&Number.isInteger(m.committed)&&
     m.committed>=0&&m.committed<=16&&Array.isArray(m.item_kr)&&m.item_kr.length===6&&
     Array.isArray(m.item_kg)&&m.item_kg.length===6&&
     Array.isArray(m.lt_source)&&m.lt_source.length===2&&
     Array.isArray(m.lt_transfer)&&m.lt_transfer.length===2?m:null;
 }
 async function refresh(force=false){
   if(!sessionId||pending||!root.rizsimSharedAuth)return;
   if(!force&&Date.now()-loadedAt<PERIOD-1100)return;
   const session=sessionId,token=++requestToken;pending=true;
   if(force){error='';render();}
   try{
     const auth=await root.rizsimSharedAuth.auth.getUser();
     if(auth.error||!auth.data?.user)throw Error('Sign in to an authorized Faculty workspace.');
     const v=await root.rizsimSharedAuth.rpc('get_my_rizsim_s1s2_session_records',{p_session_id:session});
     if(v.error)throw Error(v.error.message);
     if(!Array.isArray(v.data))throw Error('Authorized classroom records were not returned.');
     if(token!==requestToken||session!==sessionId)return;
     rows=v.data.filter(x=>x.attempt_id).map(x=>{
       const record=verifiedRecord(x.response_data?.record);
       const metrics=record?verifiedMetric(x.metrics):null;
       return {attempt:text(x.attempt_id,64),name:text(x.student_name||'RizSim Student',130),
         status:text(x.attempt_status||'in_progress',28),joined:x.joined_at||null,
         submitted:x.submitted_at||null,record,metrics};
     });
     loadedAt=Date.now();error='';
   }catch(e){if(token===requestToken&&session===sessionId)error=text(e?.message||e);}
   finally{pending=false;if(token===requestToken&&session===sessionId)render();}
 }
 function bar(parent,label,value,total,color='teal'){
   const r=elem('div','rz-s02-meter');
   const head=box(r,'rz-s02-meter-label',elem('span','',label),
     elem('strong','',value==null||!total?'—':percent(value,total)));
   const track=elem('div','rz-s02-track');track.setAttribute('role','meter');
   track.setAttribute('aria-label',label);track.setAttribute('aria-valuemin','0');
   track.setAttribute('aria-valuemax','100');
   track.setAttribute('aria-valuenow',String(total&&value!=null?Math.round(value/total*100):0));
   const f=elem('span','rz-s02-fill rz-s02-'+color);
   f.style.width=total&&value!=null?limit(value/total*100,0,100)+'%':'0%';
   track.append(f);r.append(track);parent.append(r);return head;
 }
 function metric(parent,label,value,sub){
   const card=elem('div','rz-s02-metric');
   card.append(elem('span','rz-s02-metric-label',label),
     elem('strong','rz-s02-metric-value',value),elem('small','',sub||''));
   parent.append(card);return card;
 }
 function pbar(parent,row){
   const m=row.metrics,count=m?.committed??0,total=16;
   const c=elem('div','rz-s02-progress');
   box(c,'rz-s02-progress-label',elem('strong','',Math.round(count/total*100)+'%'),
     elem('small','',count+' / 16 locked'));
   const t=elem('div','rz-s02-progress-track');t.setAttribute('role','progressbar');
   t.setAttribute('aria-label',row.name+' completed decisions');
   t.setAttribute('aria-valuemin','0');t.setAttribute('aria-valuemax','100');
   t.setAttribute('aria-valuenow',String(Math.round(count/total*100)));
   const fill=elem('span','rz-s02-progress-fill');fill.style.width=(count/total*100)+'%';
   t.append(fill);c.append(t);parent.append(c);
 }
 function fullRows(){return rows.filter(x=>x.record&&x.metrics);}
 function paired(){return fullRows().filter(x=>Number.isInteger(x.metrics.kr)&&Number.isInteger(x.metrics.kg));}
 function signTest(a){
   const plus=a.filter(x=>x>0).length,minus=a.filter(x=>x<0).length;
   const n=plus+minus;if(!n)return null;
   const k=Math.min(plus,minus);let term=Math.pow(.5,n),sum=term;
   for(let i=1;i<=k;i++){term*=((n-i+1)/i);sum+=term;}
   return Math.min(1,2*sum);
 }
 function overview(parent){
   const records=fullRows(),complete=paired(),scorePairs=complete.map(x=>x.metrics);
   const kr=scorePairs.map(x=>x.kr),kg=scorePairs.map(x=>x.kg);
   const delta=scorePairs.map(x=>x.gain),meanGain=avg(delta);
   const cards=elem('div','rz-s02-metrics');
   metric(cards,'Students joined',String(rows.length),'Current authorized classroom');
   metric(cards,'KR locked',String(records.filter(x=>x.metrics.kr_locked).length),'Committed starting judgments');
   metric(cards,'LT completed',String(records.filter(x=>x.metrics.source_locked===2&&x.metrics.transfer_locked===2).length),'Both source/transfer pairs');
   metric(cards,'KG locked',String(records.filter(x=>x.metrics.kg_locked).length),'Committed final review');
   parent.append(cards);
   const wrap=elem('div','rz-s02-layout');
   const gains=elem('article','rz-s02-panel');
   headline(gains,'Knowledge Review → Knowledge Gain','Matched completed students only (n = '+complete.length+').');
   const half=elem('div','rz-s02-two-metrics');
   metric(half,'Mean KR',kr.length?num(avg(kr))+' / 6':'—','Starting review');
   metric(half,'Mean KG',kg.length?num(avg(kg))+' / 6':'—','Final review');
   gains.append(half);
   if(complete.length){
     bar(gains,'Mean KR',avg(kr),6,'gold');bar(gains,'Mean KG',avg(kg),6,'teal');
     box(gains,'rz-s02-insight',elem('strong','',num(meanGain)+' points average change'),
       elem('p','','That equals '+num(meanGain/6*100)+' percentage points; repeated-item differences alone do not prove durable learning.'));
   }else gains.append(elem('p','rz-s02-empty','No completed KR/KG pairs yet. Partial answers are not scored as zero.'));
   wrap.append(gains);
   const concepts=elem('article','rz-s02-panel');
   headline(concepts,'Two concepts · comparative profile','Each concept contains three matched review items.');
   for(let i=0;i<2;i++){
     const scoped=scorePairs.filter(x=>Number.isInteger(x.concepts?.[i]?.kr)&&Number.isInteger(x.concepts?.[i]?.kg));
     const block=elem('div','rz-s02-concept');
     block.append(elem('h4','',CASES[i]));
     if(scoped.length){
       bar(block,'Knowledge Review',avg(scoped.map(x=>x.concepts[i].kr)),3,'gold');
       bar(block,'Knowledge Gain',avg(scoped.map(x=>x.concepts[i].kg)),3,'teal');
     }else block.append(elem('p','rz-s02-empty','No paired results for this concept.'));
     concepts.append(block);
   }
   wrap.append(concepts);
   const distribution=elem('article','rz-s02-panel');
   headline(distribution,'Review change distribution','KG − KR points range from −6 to +6, using paired records only.');
   if(!delta.length)distribution.append(elem('p','rz-s02-empty','Waiting for completed Student reviews.'));
   else{
     const hist=elem('div','rz-s02-histogram');
     const max=Math.max(1,...Array.from({length:13},(_,i)=>delta.filter(x=>x===i-6).length));
     for(let n=-6;n<=6;n++){
       const amount=delta.filter(x=>x===n).length;
       const col=elem('div','rz-s02-hist-col'),track=elem('div','rz-s02-hist-track');
       const fill=elem('span','rz-s02-hist-bar'+(n>0?' positive':n===0?' neutral':''));
       fill.style.height=(amount?Math.max(5,amount/max*100):0)+'%';
       track.append(fill);col.append(elem('strong','',amount?String(amount):''),track,elem('small','',n>0?'+'+n:String(n)));hist.append(col);
     }distribution.append(hist);
   }
   wrap.append(distribution);
   const inference=elem('article','rz-s02-panel');
   headline(inference,'Paired-data interpretation','Descriptive evidence first; optional exact sign test is exploratory.');
   const stat=elem('div','rz-s02-two-metrics');
   metric(stat,'Mean change',meanGain==null?'—':(meanGain>0?'+':'')+num(meanGain)+' / 6','n = '+delta.length);
   metric(stat,'Change SD',num(SD(delta)),'Sample standard deviation');
   inference.append(stat);
   const improved=delta.filter(x=>x>0).length,same=delta.filter(x=>x===0).length,worsened=delta.filter(x=>x<0).length;
   inference.append(elem('p','rz-s02-note',
     'Improved: '+improved+' · Unchanged: '+same+' · Decreased: '+worsened+'. '+
     (delta.length>=5&&improved+worsened>=5?'Exact two-sided sign p = '+num(signTest(delta),4)+'.':
       'Inference is not estimated for this small set of paired changes.')+
     ' Educators in the same organization may not represent independent observations.'));
   wrap.append(inference);
   parent.append(wrap);
 }
 function detail(parent){
   const target=rows.find(x=>x.attempt===selected);
   if(!target?.metrics||!target.record)return;
   const m=target.metrics,record=target.record,completed=m.completed===true&&target.status==='submitted';
   const report=elem('section','rz-s02-individual');report.id='rizsimSystemIndividualResult';
   const banner=elem('div','rz-s02-person-banner');
   const title=elem('div');
   title.append(elem('span','rz-s02-eyebrow','INDIVIDUAL STUDENT · READ-ONLY FACULTY REPORT'),
     elem('h3','',target.name),elem('p','',record.profile?.organization||'RizSim classroom'));
   banner.append(title,btn('Close results',()=>{selected='';render();},'rz-s02-btn rz-s02-secondary'));
   report.append(banner);
   const progress=elem('div','rz-s02-indiv-progress');progress.append(elem('strong','',m.percent+'% complete'),
     elem('span','',m.committed+' / 16 committed · '+(completed?'Submitted':'In progress')));
   pbar(progress,target);report.append(progress);
   headline(report,completed?'Your learning review':'Learning activity in progress',
     completed?'The same verified aggregate result categories as the Student dashboard.':'Only locked stages are reported. Unanswered and uncommitted decisions remain missing.');
   const cards=elem('div','rz-s02-metrics');
   metric(cards,'Knowledge Review',m.kr==null?'—':m.kr+' / 6','Starting review');
   metric(cards,'Knowledge Gain',m.kg==null?'—':m.kg+' / 6','Final review');
   metric(cards,'Review change',m.gain==null?'—':(m.gain>0?'+':'')+m.gain+' / 6',
     m.gain==null?'Awaiting paired stages':num(m.gain/6*100)+' percentage points');
   metric(cards,'Learning Transfer',m.transfer==null?'—':m.transfer+' / 2',
     m.source==null?'Source pending':'Source '+m.source+' / 2');
   report.append(cards);
   if(completed){
     const concepts=elem('div','rz-s02-two-metrics');
     for(let i=0;i<2;i++){
       const card=elem('section','rz-s02-panel');
       card.append(elem('h4','',CASES[i]));
       bar(card,'KR',m.concepts[i].kr,3,'gold');
       bar(card,'KG',m.concepts[i].kg,3,'teal');
       concepts.append(card);
     }report.append(concepts);
     report.append(elem('p','rz-s02-note','These are immediate repeated-item outcomes. Source and transfer decisions are separate and are not evidence of a stable cognitive-system trait.'));
   }else report.append(elem('p','rz-s02-empty',
       'The Student personal Review Gain Analytics appears after secure submission. Existing committed decisions remain visible.'));
   const choices=elem('details','rz-s02-detail-choices');
   choices.append(elem('summary','','Locked response detail (Faculty only)'));
   const table=elem('table','rz-s02-table'),th=elem('tr');
   ['Item','KR choice','KG choice','KR correct?','KG correct?'].forEach(x=>th.append(elem('th','',x)));
   table.append(append(elem('thead'),th));
   const body=elem('tbody');
   for(let i=0;i<6;i++){
     const row=elem('tr');const values=[IDS[i],
       m.kr_locked?String.fromCharCode(65+record.kr.a[i]):'—',
       m.kg_locked?String.fromCharCode(65+record.kg.a[i]):'—',
       m.item_kr[i]===null?'—':m.item_kr[i]?'Yes':'No',
       m.item_kg[i]===null?'—':m.item_kg[i]?'Yes':'No'];
     values.forEach(x=>row.append(elem('td','',x)));body.append(row);
   }
   table.append(body);box(choices,'rz-s02-table-scroller',table);
   choices.append(elem('p','rz-s02-note','Questions K1–K3: Bystander Effect · K4–K6: Confirmation Bias.'));
   report.append(choices);parent.append(report);
 }
 function roster(parent){
   const card=elem('article','rz-s02-panel rz-s02-wide');
   headline(card,'Live responses & progress','Inspect any verified Student in this authorized classroom; personal reports are read-only.');
   if(!rows.length){card.append(elem('p','rz-s02-empty','No Students have joined this session yet.'));parent.append(card);return;}
   const tab=elem('table','rz-s02-table'),head=elem('tr');
   ['Student','Progress','Stage','KR / 6','LT source / 2','LT transfer / 2','KG / 6','Status','Student result'].forEach(x=>head.append(elem('th','',x)));
   tab.append(append(elem('thead'),head));
   const body=elem('tbody');
   for(const r of rows){
     const tr=elem('tr'),m=r.metrics||null;
     tr.append(elem('td','rz-s02-name',r.name));
     const td=elem('td','rz-s02-progress-cell');pbar(td,r);tr.append(td);
     const stage=m?.kg_locked?'RGA':m?.source_locked===2&&m?.transfer_locked===2?'KG':m?.kr_locked?'LT':'KR';
     [m?stage:'Joined',m?.kr??'—',m?.source??'—',m?.transfer??'—',m?.kg??'—',
       r.status==='submitted'?'Submitted':'In progress'].forEach(x=>tr.append(elem('td','',x)));
     const inspect=elem('td');
     const b=btn(selected===r.attempt?'Close':'View student result',()=>{
       selected=selected===r.attempt?'':r.attempt;render();
       if(selected)setTimeout(()=>$('rizsimSystemIndividualResult')?.scrollIntoView({block:'nearest',behavior:root.matchMedia?.('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'}),0);
     });b.disabled=!m||!r.record;b.setAttribute('aria-expanded',String(selected===r.attempt));
     inspect.append(b);tr.append(inspect);body.append(tr);
   }
   tab.append(body);
   const hint=elem('p','rz-s02-scroll-hint','Scroll horizontally to view all Student results and report actions ↔');
   hint.id='rzS02RosterScrollHint';card.append(hint);
   box(card,'rz-s02-table-scroller',tab);
   // box() returns its parent. The focusable/scrollable element is its child.
   const scroll=card.querySelector('.rz-s02-table-scroller');
   scroll.tabIndex=0;scroll.setAttribute('role','region');
   scroll.setAttribute('aria-label','Student progress and results table');
   scroll.setAttribute('aria-describedby','rzS02RosterScrollHint');
   parent.append(card);
   detail(parent);
 }
 function grouped(rows){
   const map=new Map();
   for(const r of rows){const p=r.record?.profile;
     const name=text((groupMode==='organization'?p?.organization:p?.group)||'',95).trim();
     if(name){if(!map.has(name))map.set(name,[]);map.get(name).push(r);}
   }
   return map;
 }
 function groups(parent){
   const card=elem('article','rz-s02-panel rz-s02-wide');
   headline(card,'Compare educator groups','Descriptive comparisons use students who completed both KR and KG; empty groups are not scored.');
   const control=elem('label','rz-s02-select-label','Group by');
   const select=elem('select','rz-s02-select');
   for(const [key,label] of [['group','Educator group'],['organization','Organization']]){
     const opt=elem('option','',label);opt.value=key;opt.selected=groupMode===key;select.append(opt);
   }
   select.addEventListener('change',()=>{groupMode=select.value;groupA='';groupB='';render();});
   control.append(select);card.append(control);
   const map=grouped(paired()),labels=[...map.keys()].sort();
   if(labels.length<2){card.append(elem('p','rz-s02-empty','At least two named groups with completed paired responses are required.'));parent.append(card);return;}
   if(!labels.includes(groupA))groupA=labels[0];if(!labels.includes(groupB)||groupA===groupB)groupB=labels.find(x=>x!==groupA);
   const pick=(current,change)=>{
     const sel=elem('select','rz-s02-select');
     for(const label of labels){const opt=elem('option','',label);opt.value=label;opt.selected=label===current;sel.append(opt);}
     sel.addEventListener('change',e=>{change(e.target.value);render();});return sel;
   };
   const controls=elem('div','rz-s02-group-selects');
   controls.append(elem('span','','Group A'),pick(groupA,x=>{groupA=x;if(groupB===x)groupB=labels.find(v=>v!==x);}));
   controls.append(elem('span','','Group B'),pick(groupB,x=>{groupB=x;if(groupA===x)groupA=labels.find(v=>v!==x);}));
   card.append(controls);
   const a=map.get(groupA)||[],b=map.get(groupB)||[];
   const table=elem('table','rz-s02-table'),thead=elem('tr');
   ['Outcome',groupA+' (n='+a.length+')',groupB+' (n='+b.length+')'].forEach(x=>thead.append(elem('th','',x)));
   table.append(append(elem('thead'),thead));const body=elem('tbody');
   for(const [lab,key] of [['Mean Knowledge Review','kr'],['Mean Knowledge Gain','kg'],
     ['Mean review change','gain'],['Mean transfer','transfer']]){
     const tr=elem('tr');tr.append(elem('td','',lab));
     [a,b].forEach(g=>tr.append(elem('td','',num(avg(g.map(v=>v.metrics[key]).filter(Number.isFinite))))));
     body.append(tr);
   }table.append(body);box(card,'rz-s02-table-scroller',table);
   card.append(elem('p','rz-s02-note','Comparisons are descriptive. Group membership is self-reported and students may share an institution. No causal or between-group significance claim is made.'));
   parent.append(card);
 }
 function items(parent){
   const card=elem('article','rz-s02-panel rz-s02-wide');
   headline(card,'Item and transfer outcome analysis','Locked-only denominator for each stage; one row per original question/case decision.');
   const rr=fullRows();
   const tab=elem('table','rz-s02-table'),th=elem('tr');
   ['Item','KR correct','KR n','KG correct','KG n','Change (pp)'].forEach(x=>th.append(elem('th','',x)));
   tab.append(append(elem('thead'),th));const body=elem('tbody');
   for(let i=0;i<6;i++){
     const a=rr.map(x=>x.metrics.item_kr[i]).filter(x=>typeof x==='boolean');
     const b=rr.map(x=>x.metrics.item_kg[i]).filter(x=>typeof x==='boolean');
     const ac=a.filter(Boolean).length,bc=b.filter(Boolean).length;
     const tr=elem('tr');[IDS[i],ac,a.length,bc,b.length,
       a.length&&b.length?num(bc/b.length*100-ac/a.length*100)+' pp':'—'].forEach(x=>tr.append(elem('td','',x)));body.append(tr);
   }tab.append(body);box(card,'rz-s02-table-scroller',tab);
   const lt=elem('div','rz-s02-two-metrics');
   for(let j=0;j<2;j++){
     const p=elem('section','rz-s02-subpanel');
     p.append(elem('h4','',CASES[j]+' · source/transfer'));
     for(const [field,title] of [['lt_source','Source decision'],['lt_transfer','Transfer decision']]){
       const valid=rr.map(x=>x.metrics[field][j]).filter(x=>typeof x==='boolean');
       bar(p,title,valid.filter(Boolean).length,valid.length,'violet');
     }lt.append(p);
   }card.append(lt);
   parent.append(card);
 }
 function render(){
   if(!host||host.hidden||!sessionId)return;
   host.replaceChildren();if(studentHost)studentHost.replaceChildren();
   const header=elem('div','rz-s02-header'),titles=elem('div');
   titles.append(elem('span','rz-s02-eyebrow','SIMULATION 02 · AUTHORIZED CLASSROOM ANALYTICS'),
     elem('h2','','System 1 & System 2 Thinking'),
     elem('p','',sessionName+' · Bystander Effect & Confirmation Bias'));
   const actions=elem('div','rz-s02-actions');
   const refreshButton=btn(pending?'Refreshing…':'Refresh class',()=>refresh(true));
   refreshButton.disabled=pending;
   actions.append(refreshButton,btn('Print report',()=>root.print(),'rz-s02-btn rz-s02-secondary'));
   header.append(titles,actions);host.append(header);
   if(error){host.append(elem('p','rz-s02-error','Class results unavailable: '+error+' No demo responses have been used.'));return;}
   if(pending&&!loadedAt){host.append(elem('p','rz-s02-empty','Loading signed-in class records…'));return;}
   const main=elem('div','rz-s02-content');
   overview(main);
   const recordSection=elem('div','rz-s02-result-section');roster(recordSection);
   if(studentHost)studentHost.append(elem('h2','','System 1 & System 2 · Live Responses'),recordSection);
   else main.append(recordSection);
   items(main);groups(main);
   host.append(main,elem('p','rz-s02-footer','All scores computed by restricted RizSim server functions from actual locked Student choices. No public answer keys or sample class records. Last updated: '+(loadedAt?new Date(loadedAt).toLocaleString():'waiting')));
   root.RizSimAnalytics?.upgrade('systems',host,studentHost,{sessionId,rows});
 }
 root.RizSimSystemFaculty=Object.freeze({draw,refresh:()=>refresh(true),
   state:()=>({sessionId,students:rows.length,graded:fullRows().length,
     error,pending,selected})});
})(window);
