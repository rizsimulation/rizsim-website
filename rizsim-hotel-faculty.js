/* RizSim Simulation 03: Hotel Judgment Lab Faculty classroom module.
 * The original experimental distinctions and two-group dot/median plot are
 * preserved. Private experiment data is unavailable until collection closes.
 * Student response data come exclusively from the authorized server RPC.
 * No grades, answer keys, invented learning gain or preview participants.
 */
(function(root){'use strict';
 const SLUG='hotel-judgment-lab',PATH='/simulation-hotel-judgment.html';
 const MODULE='RizHotelJudgment.v1',SCHEMA='hotel-judgment-v1';
 const ROLES=new Set(['owner','faculty','course_lead','institution']);
 const $=id=>document.getElementById(id);
 const str=(x,n=300)=>String(x??'').slice(0,n);
 const dom=(tag,cls='',text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=str(text,1500);return n;};
 const put=(parent,...children)=>{parent.append(...children);return parent;};
 const box=(parent,cls,...children)=>put(parent,put(dom('div',cls),...children));
 const button=(label,fn,cls='rz-h03-btn')=>{const n=dom('button',cls,label);n.type='button';n.addEventListener('click',fn);return n;};
 const number=n=>Number.isFinite(n)?n.toLocaleString('en-PK',{maximumFractionDigits:2}):'—';
 const money=n=>Number.isFinite(n)?'PKR '+number(n):'—';
 const median=x=>{if(!x.length)return null;const sorted=x.slice().sort((a,b)=>a-b);return sorted.length%2?sorted[(sorted.length-1)/2]:(sorted[sorted.length/2-1]+sorted[sorted.length/2])/2;};
 const mean=x=>x.length?x.reduce((a,b)=>a+b,0)/x.length:null;
 const canonical=r=>r&&r.version===SCHEMA&&['A','B'].includes(r.group)&&
   ['Yes','No'].includes(r.binary_response)&&
   Number.isSafeInteger(Number(r.willing_to_pay_pkr))&&
   Number(r.willing_to_pay_pkr)>=0&&Number(r.willing_to_pay_pkr)<=1000000000000&&
   r.demo_only===false&&typeof r.response_id==='string'?
   {...r,willing_to_pay_pkr:Number(r.willing_to_pay_pkr)}:null;
 let studentHost=null;
 let panel=null,rows=[],sessionId='',sessionTitle='',revealed=false;
 let waiting=false,refreshAt=0,error='',selectedAttempt='',interval=null,requestId=0;
 const groupRows=g=>rows.filter(x=>x.record?.group===g&&x.status==='submitted');
 const completed=()=>rows.filter(x=>x.record&&x.status==='submitted');
 function licensed(s,sess){
   if(!sess?.product_id)return false;
   return [...(s.licensed||[]),...(s.products||[]),...(s.simulations||[])].some(p=>
     String(p.id||p.product_id)===String(sess.product_id)&&
       (p.slug===SLUG||p.launch_path===PATH));
 }
 function eligible(s,r){
   if(!s||!ROLES.has(s.role)||r?.stage!=='running'||!r?.session||
      !$('view-classroom')?.classList.contains('active'))return null;
   const target=(s.sessions||[]).find(x=>String(x.session_id)===String(r.session));
   return licensed(s,target)?target:null;
 }
 function mount(){
   const anchor=$('rzLiveResultsAnchor');if(!anchor)return false;
   if(!panel){panel=dom('section','rz-h03-root');panel.id='rizsimHotelFacultyResults';
     panel.setAttribute('aria-label','Hotel Judgment Lab authorized classroom results');}
   if(panel.parentNode!==anchor)anchor.append(panel);
   const studentAnchor=$('rzV13SimulationStudentResults');
   if(studentAnchor){if(!studentHost){studentHost=dom('section','rz-h03-root');studentHost.id='rizsimHotelStudentResults';}if(studentHost.parentNode!==studentAnchor)studentAnchor.append(studentHost);}
   else if(studentHost){studentHost.remove();studentHost=null;}
   return true;
 }
 function clear(){
   requestId++;if(interval){clearInterval(interval);interval=null;}
   sessionId='';sessionTitle='';rows=[];revealed=false;waiting=false;
   selectedAttempt='';error='';refreshAt=0;if(panel)panel.hidden=true;
   if(studentHost){studentHost.replaceChildren();studentHost.hidden=true;}
 }
 function draw(s,r){
   const sess=eligible(s,r);if(!sess){clear();return;}
   if(!mount())return;panel.hidden=false;if(studentHost)studentHost.hidden=false;
   if(sessionId!==String(sess.session_id)){
     requestId++;sessionId=String(sess.session_id);
     sessionTitle=str(sess.class_name||'RizSim Classroom',130);
     rows=[];revealed=false;waiting=false;error='';selectedAttempt='';refreshAt=0;
     render();refresh(true);
   }
   if(!interval)interval=setInterval(()=>{
     if(!sessionId||panel.hidden||!$('view-classroom')?.classList.contains('active'))return;
     if(panel.contains(document.activeElement))return;
     refresh(false);
   },17000);
 }
 async function refresh(force=false){
   if(!sessionId||waiting||!root.rizsimSharedAuth)return;
   if(!force&&Date.now()-refreshAt<15500)return;
   const id=++requestId,session=sessionId;waiting=true;if(force){error='';render();}
   try{
     const auth=await root.rizsimSharedAuth.auth.getUser();
     if(auth.error||!auth.data?.user)throw Error('Sign in as the authorized classroom Faculty.');
     const result=await root.rizsimSharedAuth.rpc('get_my_rizsim_hotel_session_records',{p_session_id:session});
     if(result.error)throw Error(result.error.message);
     if(!Array.isArray(result.data))throw Error('No authorized classroom roster was returned.');
     if(id!==requestId||session!==sessionId)return;
     const feed=result.data.filter(x=>x.attempt_id);
     const canReveal=feed.length>0&&feed.every(x=>x.collection_revealed===true);
     rows=feed.map(x=>{
       const r=canReveal?canonical(x.record):null;
       return {attempt:str(x.attempt_id,64),name:str(x.student_name||'RizSim Student',100),
         joined:x.joined_at||null,submitted:x.submitted_at||null,
         status:str(x.attempt_status||'in_progress',30),
         stage:str(x.assignment_stage||'Joined',35),
         progress:Math.max(0,Math.min(100,Number(x.progress_percent)||0)),
         record:r};
     });
     revealed=canReveal;refreshAt=Date.now();error='';
   }catch(e){if(id===requestId&&session===sessionId)error=str(e?.message||e);}
   finally{if(id===requestId&&session===sessionId){waiting=false;render();}}
 }
 function metric(parent,label,value,caption='',tone=''){
   const n=dom('div','rz-h03-metric '+tone);
   n.append(dom('small','',label),dom('strong','',value),dom('span','',caption));
   parent.append(n);
 }
 function labelBlock(parent,title,desc){
   box(parent,'rz-h03-title',dom('h3','',title),dom('p','',desc));
 }
 function progress(parent,row){
   const track=dom('div','rz-h03-progress');
   track.setAttribute('role','progressbar');track.setAttribute('aria-label',row.name+' committed progress');
   track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');
   track.setAttribute('aria-valuenow',String(row.progress));
   const fill=dom('span','rz-h03-progress-fill');fill.style.width=row.progress+'%';track.append(fill);
   const c=dom('div','rz-h03-progress-wrap');
   box(c,'rz-h03-progress-line',dom('strong','',row.progress+'%'),dom('small','',row.stage));
   c.append(track);parent.append(c);
 }
 function roster(parent){
   const card=dom('article','rz-h03-card rz-h03-wide');
   labelBlock(card,'Live Responses','Per-student progress and locked response status; individual details unlock only after collection closes.');
   if(!rows.length){card.append(dom('p','rz-h03-empty','No students have joined this classroom yet.'));parent.append(card);return;}
   const table=dom('table','rz-h03-table'),th=dom('tr');
   ['Student','Progress','Submission','Group','Individual result'].forEach(x=>th.append(dom('th','',x)));
   table.append(put(dom('thead'),th));
   const body=dom('tbody');
   for(const r of rows){
     const tr=dom('tr');tr.append(dom('td','rz-h03-name',r.name));
     const pt=dom('td','rz-h03-progress-cell');progress(pt,r);tr.append(pt);
     tr.append(dom('td','',r.status==='submitted'?'Submitted':'In progress'));
     tr.append(dom('td','',revealed&&r.record?'Group '+r.record.group:'Sealed'));
     const td=dom('td');
     const inspect=button(selectedAttempt===r.attempt?'Close report':'View student result',
       ()=>{selectedAttempt=selectedAttempt===r.attempt?'':r.attempt;render();
         if(selectedAttempt)requestAnimationFrame(()=>$('rizsimHotelIndividual')?.scrollIntoView({block:'nearest',behavior:root.matchMedia?.('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'}));
       });
     inspect.disabled=!revealed||!r.record||r.status!=='submitted';
     inspect.setAttribute('aria-expanded',String(selectedAttempt===r.attempt));
     if(!revealed)inspect.title='Results unlock when the classroom collection closes';
     td.append(inspect);tr.append(td);body.append(tr);
   }
   table.append(body);box(card,'rz-h03-table-scroll',table);parent.append(card);
   if(selectedAttempt)individual(parent);
 }
 function individual(parent){
   const row=rows.find(x=>x.attempt===selectedAttempt);
   if(!revealed||!row?.record)return;
   const r=row.record;
   const n=dom('section','rz-h03-individual');n.id='rizsimHotelIndividual';
   const header=dom('div','rz-h03-individual-head');
   const title=dom('div');
   title.append(dom('small','', 'READ-ONLY STUDENT RESULT · HOTEL JUDGMENT LAB'),
     dom('h3','',row.name),dom('p','','Submitted '+(row.submitted?new Date(row.submitted).toLocaleString():'—')));
   header.append(title,button('Close results',()=>{selectedAttempt='';render();},'rz-h03-btn rz-h03-secondary'));
   n.append(header);
   const cards=dom('div','rz-h03-metrics');
   metric(cards,'Assigned group','Group '+r.group,'Server-assigned condition','group-'+r.group.toLowerCase());
   metric(cards,'Hotel comparison',r.binary_response,'Independent Yes / No judgment');
   metric(cards,'Willingness to pay',money(r.willing_to_pay_pkr),'Single PKR judgment');
   metric(cards,'Participant code',r.participant_code||'—','Submitted timestamp is server-owned');
   n.append(cards);
   const detail=dom('div','rz-h03-personal-details');
   labelBlock(detail,'Original price-comparison condition','Only the question assigned to this student.');
   detail.append(dom('p','rz-h03-condition',r.condition_question));
   detail.append(dom('p','rz-h03-note','This is an individual price judgment. There is no correct/incorrect score, KR/KG learning gain or diagnostic classification.'));
   n.append(detail);parent.append(n);
 }
 const svgNS='http://www.w3.org/2000/svg';
 function chart(parent,a,b){
   const holder=dom('div','rz-h03-chart');
   const svg=document.createElementNS(svgNS,'svg');svg.setAttribute('viewBox','0 0 900 305');
   svg.setAttribute('role','img');svg.setAttribute('aria-label','Group A and B PKR willingness-to-pay dot distribution with median markers');
   function el(tag,attrs={},label){const e=document.createElementNS(svgNS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));
     if(label!==undefined)e.textContent=String(label);svg.append(e);return e;}
   const valueList=[...a,...b].map(x=>x.record.willing_to_pay_pkr);
   const max=valueList.length?Math.max(1,...valueList):1;
   const left=75,right=830,xpos=x=>left+(right-left)*x/max;
   el('line',{x1:left,y1:250,x2:right,y2:250,stroke:'#bbc8bf','stroke-width':2});
   for(let i=0;i<=4;i++){
     const x=left+(right-left)*i/4;
     el('line',{x1:x,y1:246,x2:x,y2:254,stroke:'#93a49b'});
     el('text',{x,y:278,'text-anchor':'middle',fill:'#5e7771','font-size':13},number(max*i/4));
   }
   el('text',{x:13,y:87,fill:'#846700','font-size':18,'font-weight':800},'Group A');
   el('text',{x:13,y:187,fill:'#176b67','font-size':18,'font-weight':800},'Group B');
   if(!valueList.length){
     el('text',{x:450,y:147,'text-anchor':'middle',fill:'#68807c','font-size':16},'No valid locked responses');
   }else{
     const dots=(participants,y,color)=>{
       const buckets=new Map();
       participants.slice().sort((x,y)=>x.record.willing_to_pay_pkr-y.record.willing_to_pay_pkr)
       .forEach(v=>{
         const x=xpos(v.record.willing_to_pay_pkr),key=Math.round(x/15),index=buckets.get(key)||0;
         buckets.set(key,index+1);
         el('circle',{cx:x,cy:y-(index%5)*12-(Math.floor(index/5)%3)*2,r:5.8,fill:color,opacity:.86});
       });
     };
     dots(a,109,'#daa91d');dots(b,209,'#168078');
     for(const [participants,y1,y2,color,label] of [
       [a,51,119,'#9a7200','Median A'],[b,152,219,'#116b63','Median B']]){
       const m=median(participants.map(x=>x.record.willing_to_pay_pkr));
       if(m!=null){
         const x=xpos(m);
         el('line',{x1:x,y1,x2:x,y2,stroke:color,'stroke-width':3,'stroke-dasharray':'6 5'});
         el('text',{x,y:y1-12,'text-anchor':'middle',fill:color,'font-size':13,'font-weight':800},label);
       }
     }
   }
   holder.append(svg);
   holder.append(dom('p','rz-h03-note','Each dot is one submitted PKR judgment. Dashed vertical markers show group medians; positions use a common linear axis.'));
   parent.append(holder);
 }
 function summary(parent){
   const a=groupRows('A'),b=groupRows('B'),aW=a.map(x=>x.record.willing_to_pay_pkr),bW=b.map(x=>x.record.willing_to_pay_pkr);
   const overview=dom('article','rz-h03-card rz-h03-wide');
   labelBlock(overview,'A/B price judgment · Presenter Dashboard','Actual responses from this closed classroom only. Conditions were assigned once by RizSim.');
   const metrics=dom('div','rz-h03-metrics');
   metric(metrics,'Group A',String(a.length),'Valid submitted responses','group-a');
   metric(metrics,'Group B',String(b.length),'Valid submitted responses','group-b');
   metric(metrics,'Median · Group A',money(median(aW)),'Willingness to pay');
   metric(metrics,'Median · Group B',money(median(bW)),'Willingness to pay');
   overview.append(metrics);
   labelBlock(overview,'Two-group willingness-to-pay distribution','Original dot-plot design with median markers.');
   chart(overview,a,b);
   if(a.length&&b.length){
     const delta=median(bW)-median(aW);
     const card=dom('div','rz-h03-contrast');
     card.append(dom('strong','',delta>0?'Group B has the higher sample median.':
         delta<0?'Group A has the higher sample median.':'Both groups have the same sample median.'),
       dom('p','','Median A: '+money(median(aW))+' · Median B: '+money(median(bW))+
         ' · Difference (B − A): '+(delta>0?'+':'')+money(delta)+
         ' · Mean A: '+money(mean(aW))+' · Mean B: '+money(mean(bW))+'.'));
     overview.append(card);
   }else overview.append(dom('p','rz-h03-empty','Both groups need at least one valid submitted response before their median contrast can be interpreted.'));
   const content=dom('div','rz-h03-teaching');
   labelBlock(content,'Faculty debrief · Notice → Locate → Infer',
     'This instructional interpretation is visible only after the experimental collection has closed.');
   for(const [h,b] of [
     ['Notice','Which group’s willingness-to-pay distribution is higher? How do the medians and means differ?'],
     ['Locate','Both groups saw the identical four hotel photographs. Group A was asked if the price was under PKR 1,000; Group B whether it was over PKR 80,000. What changed?'],
     ['Infer','The comparison number is a possible anchor. Discuss anchoring as an interpretation, not proof from one classroom alone.'],
     ['Challenge','Differences might also reflect group composition, prior travel experience, outliers or sampling error. Consider the small number of responses before drawing conclusions.']
   ]){const entry=dom('div','rz-h03-teaching-step');
      entry.append(dom('h4','',h),dom('p','',b));content.append(entry);}
   overview.append(content);
   const t=dom('article','rz-h03-records');
   labelBlock(t,'Combined response activity','Group, Yes/No, PKR amount, participant code and server-recorded time.');
   const table=dom('table','rz-h03-table'),head=dom('tr');
   ['Group','Comparison','Willingness to pay','Participant code','Recorded'].forEach(x=>head.append(dom('th','',x)));
   table.append(put(dom('thead'),head));
   const body=dom('tbody');
   for(const row of completed()){
     const r=row.record,tr=dom('tr');
     [r.group,r.binary_response,money(r.willing_to_pay_pkr),
       r.participant_code||'—',
       row.submitted?new Date(row.submitted).toLocaleString():'—'].forEach(x=>tr.append(dom('td','',x)));
     body.append(tr);
   }if(!body.children.length){const tr=dom('tr'),td=dom('td','', 'No valid submitted responses.');
     td.colSpan=5;tr.append(td);body.append(tr);}
   table.append(body);box(t,'rz-h03-table-scroll',table);
   overview.append(t,dom('p','rz-h03-footer','Descriptive class demonstration: neither Yes/No nor willingness-to-pay is correct or incorrect. No learning-gain or causal effect claim.'));
   parent.append(overview);
 }
 function exportJSON(){
   if(!revealed) return;
   const data={schema:'RizHotelJudgment.ClassResults.v1',
     simulation_id:MODULE,session_id:sessionId,exported_at:new Date().toISOString(),
     records:completed().map(row=>({student_name:row.name,attempt_id:row.attempt,
       submitted_at:row.submitted,record:row.record}))};
   const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
   const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;
   a.download='rizsim-hotel-class-results-'+sessionId+'.json';a.click();
   setTimeout(()=>URL.revokeObjectURL(url),700);
 }
 function render(){
   if(!panel||panel.hidden||!sessionId)return;
   panel.replaceChildren();if(studentHost)studentHost.replaceChildren();
   const header=dom('header','rz-h03-head'),meta=dom('div');
   meta.append(dom('small','rz-h03-kicker','SIMULATION 03 · AUTHORIZED LIVE CLASSROOM'),
     dom('h2','','Hotel Judgment Lab'),
     dom('p','',sessionTitle+' · My Hotel Choice'));
   const actions=dom('div','rz-h03-actions');
   const reload=button(waiting?'Refreshing…':'Refresh class',()=>refresh(true));reload.disabled=waiting;
   actions.append(reload,button('Print results',()=>root.print(),'rz-h03-btn rz-h03-secondary'));
   if(revealed)actions.append(button('Download class JSON',exportJSON,'rz-h03-btn rz-h03-secondary'));
   header.append(meta,actions);panel.append(header);
   if(error){panel.append(dom('p','rz-h03-error','Class data unavailable: '+error+'. No demo records were substituted.'));return;}
   if(waiting&&!refreshAt){panel.append(dom('p','rz-h03-empty','Loading authorized classroom progress…'));return;}
   const content=dom('div','rz-h03-content');
   const info=dom('div','rz-h03-collection-status '+(revealed?'complete':'sealed'));
   info.append(dom('strong','',revealed?'Collection closed · Class Insights available':'Collection in progress · Responses sealed'),
     dom('p','',revealed?'The submitted groups and their PKR comparisons are now available for debrief.':
       'Student progress is visible. Group allocation, individual prices and combined A/B patterns remain server-sealed until every collection window closes.'));
   content.append(info);
   const high=dom('div','rz-h03-metrics');
   metric(high,'Students joined',String(rows.length),'Current authorized classroom');
   metric(high,'Submissions',String(rows.filter(x=>x.status==='submitted').length),'Submitted, sealed decisions');
   metric(high,'Completion rate',rows.length?(rows.filter(x=>x.status==='submitted').length/rows.length*100).toFixed(1)+'%':'—','Based on submitted attempts');
   content.append(high);
   if(studentHost){studentHost.append(dom('h2','','Hotel Judgment Lab · Live Responses'));roster(studentHost);}
   else roster(content);
   if(revealed)summary(content);
   else content.append(dom('p','rz-h03-sealed-note','The original hotel-judgment experiment reveals group medians, distributions and explanations after collection closes—not while students are still making independent price judgments.'));
   panel.append(content);
 }
 root.RizSimHotelFaculty=Object.freeze({
   draw,refresh:()=>refresh(true),
   state:()=>({sessionId,joined:rows.length,
     submitted:rows.filter(x=>x.status==='submitted').length,
     revealed,error,selectedAttempt})
 });
})(window);
