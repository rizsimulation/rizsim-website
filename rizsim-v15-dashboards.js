/* RizSim V15: compact, responsive Live Responses and Presenter Dashboard.
   Counts come solely from the existing authorized classroom-roster RPC. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;};
 let activeSession='',lastFetch=0,inFlight=false,lastKey='',cached=null;
 function state(){return window.RizSimLiveWorkspace?.state?.()||null;}
 function authorized(){const s=window.RizSimFacultyBridge?.getSnapshot?.();return s&&['faculty','course_lead','owner'].includes(s.role)&&$('authenticatedApp')?.classList.contains('show');}
 function mountCounts(name,rows){
  const pane=$('rzV13Pane'+name);if(!pane)return;
  const id='rzV15'+name+'Metrics';let parent=$(id);
  if(!parent){parent=node('div','rz-v15-kpis');parent.id=id;pane.insertBefore(parent,pane.firstChild);}
  const total=rows.length,completed=rows.filter(x=>x.attempt_status==='submitted'||x.submitted_at).length,inProgress=total-completed;
  const variants=name==='students'?[[total,'Students joined'],[inProgress,'In progress'],[completed,'Submitted responses']]:
    [[completed,'Completed activities'],[total,'Class participants'],[inProgress,'Awaiting completion']];
  const signature=JSON.stringify(variants);if(parent.dataset.signature===signature)return;parent.dataset.signature=signature;parent.replaceChildren();
  variants.forEach(([value,label])=>{const card=node('div','rz-v15-kpi');card.append(node('strong','',value),node('span','',label));parent.append(card);});
 }
 function compactTables(){
  const host=$('rzV13Panestudents');if(!host||host.hidden)return;
  for(const table of host.querySelectorAll('table')){
    if(table.classList.contains('rz-v15-compact-table'))continue;
    const headers=[...table.querySelectorAll('thead th')].map(t=>t.textContent.trim());
    if(headers.length<3)continue;
    table.classList.add('rz-v15-compact-table');
    for(const row of table.querySelectorAll('tbody tr')){
      row.querySelectorAll('td').forEach((td,i)=>{td.dataset.rzLabel=headers[i]||'Details';});
    }
    // Old wrappers reserve a horizontal scrollbar for the legacy wide table.
    const wrapper=table.parentElement;if(wrapper)wrapper.classList.add('rz-v15-responsive-container');
  }
  // New records can be inserted into an existing table by the live-data renderer.
  for(const table of host.querySelectorAll('table.rz-v15-compact-table')){
    const headers=[...table.querySelectorAll('thead th')].map(t=>t.textContent.trim());
    for(const row of table.querySelectorAll('tbody tr'))row.querySelectorAll('td').forEach((td,i)=>{
      const label=headers[i]||'Details';if(td.dataset.rzLabel!==label)td.dataset.rzLabel=label;
    });
  }
 }
 async function refresh(){
  const st=state(),view=authorized();if(!view||!st?.visible||st.stage!=='running'||!st.session)return;
  if(st.session!==activeSession){activeSession=st.session;lastFetch=0;cached=null;lastKey='';}
  if(cached){mountCounts('students',cached);mountCounts('insights',cached);}
  compactTables();
  if(inFlight||Date.now()-lastFetch<12000)return;
  const client=window.rizsimSharedAuth;if(!client)return;
  lastFetch=Date.now();inFlight=true;const asked=activeSession;
  try{const res=await client.rpc('get_my_classroom_session_students',{p_session_id:asked});
    if(res.error)throw Error(res.error.message);
    if(asked!==activeSession)return;
    const rows=Array.isArray(res.data)?res.data:[];
    cached=rows;mountCounts('students',rows);mountCounts('insights',rows);
  }catch(_){/* Existing reporting RPCs remain authoritative; do not guess data. */}
  finally{inFlight=false;}
 }
 function init(){
  const pane=$('rzV13PaneStudents');if(!pane)return;
  new MutationObserver(()=>requestAnimationFrame(compactTables)).observe(pane,{childList:true,subtree:true});
  window.setInterval(refresh,3500);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});refresh();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
