/* RizSim V15.1: compact Live Responses and Presenter Dashboard.
   All summaries use the existing authenticated, session-scoped classroom roster.
   This layer does not infer grades, reveal protected content or change responses. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;};
 let activeSession='',lastFetch=0,inFlight=false,cached=null,observed=null;
 const state=()=>window.RizSimLiveWorkspace?.state?.()||null;
 const authorized=()=>{
   const s=window.RizSimFacultyBridge?.getSnapshot?.();
   return s&&['faculty','course_lead','owner'].includes(s.role)&&$('authenticatedApp')?.classList.contains('show');
 };
 function counts(rows){
   const total=rows.length;
   const submitted=rows.filter(r=>r.attempt_status==='submitted'||r.submitted_at).length;
   return {total,submitted,working:total-submitted};
 }
 function presenterProgress(pane,rows){
   const {total,submitted,working}=counts(rows);
   let section=$('rzV151PresenterProgress');
   if(!section){
     section=node('section','rz-v151-progress');section.id='rzV151PresenterProgress';
     section.setAttribute('aria-label','Verified classroom submission progress');
     const kpis=$('rzV15insightsMetrics');
     if(kpis)kpis.after(section);else pane.prepend(section);
   }
   section.hidden=false;
   const signature=total+'|'+submitted;
   if(section.dataset.signature===signature)return;
   section.dataset.signature=signature;
   const heading=node('div','rz-v151-progress-head'),labels=node('div');
   labels.append(node('strong','','Session participation'),
     node('span','','Submission status from the authorized class roster'));
   heading.append(labels,node('strong','rz-v151-progress-rate',
     total?Math.round(submitted*100/total)+'% submitted':'Awaiting students'));
   const track=node('div','rz-v151-progress-track');
   track.setAttribute('role','img');
   track.setAttribute('aria-label',submitted+' submitted and '+working+' in progress out of '+total+' joined students');
   const completed=node('span','rz-v151-track-complete'),pending=node('span','rz-v151-track-working');
   completed.style.width=(total?submitted*100/total:0)+'%';
   pending.style.width=(total?working*100/total:0)+'%';
   track.append(completed,pending);
   const legend=node('div','rz-v151-progress-legend');
   legend.append(node('span','rz-v151-legend-submitted','● '+submitted+' submitted'),
     node('span','rz-v151-legend-working','● '+working+' in progress'));
   section.replaceChildren(heading,track,legend);
 }
 function mountCounts(name,rows){
   const pane=$('rzV13Pane'+name);if(!pane)return;
   const id='rzV15'+name+'Metrics';
   let parent=$(id);
   if(!parent){parent=node('div','rz-v15-kpis');parent.id=id;pane.insertBefore(parent,pane.firstChild);}
   const {total,submitted,working}=counts(rows);
   const values=name==='students'?
     [[total,'Students joined'],[working,'In progress'],[submitted,'Submitted responses']]:
     [[submitted,'Completed activities'],[total,'Class participants'],[working,'Awaiting completion']];
   parent.hidden=false;
   if(name==='insights')presenterProgress(pane,rows);
   const signature=JSON.stringify(values);
   if(parent.dataset.signature===signature)return;
   parent.dataset.signature=signature;
   parent.replaceChildren();
   values.forEach(([value,label])=>{
     const card=node('div','rz-v15-kpi');
     card.append(node('strong','',value),node('span','',label));
     parent.append(card);
   });
 }
 function compactTables(){
   const pane=$('rzV13Panestudents');if(!pane||pane.hidden)return;
   for(const table of pane.querySelectorAll('table')){
     const headings=[...table.querySelectorAll('thead th')].map(t=>t.textContent.trim());
     if(headings.length<3)continue;
     table.classList.add('rz-v15-compact-table');
     table.parentElement?.classList.add('rz-v15-responsive-container');
     for(const row of table.querySelectorAll('tbody tr')){
       row.querySelectorAll('td').forEach((cell,index)=>{
         const heading=headings[index]||'Details';
         cell.dataset.rzLabel=heading;
         if(/submission|status|stage/i.test(heading)){
           const val=cell.textContent.trim().toLowerCase();
           const tone=/submitted|completed|finished/.test(val)?'complete':
             /in progress|working|started|active/.test(val)?'working':
             /not started|waiting|pending/.test(val)?'waiting':'';
           if(tone)cell.dataset.rzTone=tone;else delete cell.dataset.rzTone;
         }
       });
     }
   }
 }
 function clearForSession(){
   for(const name of ['students','insights']){
     const box=$('rzV15'+name+'Metrics');
     if(box){box.replaceChildren();box.dataset.signature='';box.hidden=true;}
   }
   const progress=$('rzV151PresenterProgress');
   if(progress){progress.replaceChildren();progress.dataset.signature='';progress.hidden=true;}
 }
 async function refresh(){
   const view=state();
   if(!authorized()||!view?.visible||view.stage!=='running'||!view.session)return;
   if(view.session!==activeSession){
     activeSession=view.session;lastFetch=0;cached=null;clearForSession();
   }
   if(cached){
     mountCounts('students',cached);
     mountCounts('insights',cached);
   }
   compactTables();
   if(inFlight||Date.now()-lastFetch<12000)return;
   const client=window.rizsimSharedAuth;
   if(!client)return;
   lastFetch=Date.now();inFlight=true;
   const asked=activeSession;
   try{
     const res=await client.rpc('get_my_classroom_session_students',{p_session_id:asked});
     if(res.error)throw Error(res.error.message);
     if(asked!==activeSession)return;
     cached=Array.isArray(res.data)?res.data:[];
     mountCounts('students',cached);
     mountCounts('insights',cached);
   }catch(_){/* Keep verified previous data; never display made-up metrics. */}
   finally{inFlight=false;}
 }
 function attach(){
   const pane=$('rzV13Panestudents');
   if(pane&&pane!==observed){
     observed=pane;
     new MutationObserver(()=>requestAnimationFrame(compactTables))
       .observe(pane,{childList:true,subtree:true});
   }
   compactTables();
 }
 function init(){
   attach();
   window.setInterval(()=>{attach();refresh();},1800);
   window.addEventListener('focus',()=>{attach();refresh();});
   document.addEventListener('visibilitychange',()=>{if(!document.hidden){attach();refresh();}});
   refresh();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
