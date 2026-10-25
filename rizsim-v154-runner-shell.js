/* Design Code 1.4: preserve the runner; request the original Classroom tab. */
(()=>{'use strict';
 const start=()=>{
  if(document.querySelector('[data-rz-runner-brand]'))return;
  const qp=new URLSearchParams(location.search),session=qp.get('session')||'',attempt=qp.get('attempt')||'';
  const css=document.createElement('style');css.textContent=`
   /* Retain academic content and classroom status, but remove repeated R badge/text. */
   #app header.topbar>.brand,header.topbar .topbar-inner>.brand,.hero .riz-logo-row{display:none!important}
   #app header.topbar{min-height:0}
   header.topbar .topbar-inner{min-height:50px;align-items:center;justify-content:flex-end}
   .rz-v154-runner-brand .rz-v155-count{display:none;flex:none;min-width:20px;height:20px;border-radius:50px;background:#d52b39;color:white;font-size:10px;font-weight:900;line-height:20px;text-align:center;padding:0 4px;margin-left:5px}
   .rz-v154-runner-brand .rz-v155-resource-return{font-family:inherit;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:4px}
   .rz-v154-runner-brand{flex-wrap:wrap}
   .rz-v14-return-status{flex:1 0 100%;display:flex;align-items:center;justify-content:flex-end;gap:8px;color:#24565a;font:500 12px/1.4 system-ui,sans-serif;overflow-wrap:anywhere}
   .rz-v14-return-status[hidden]{display:none!important}
   .rz-v14-return-status button{font:inherit;border:1px solid #bdd7d1;border-radius:7px;background:#f3faf8;color:#145b5d;padding:5px 9px;cursor:pointer;flex:none}
   .rz-v14-return-status button:focus-visible{outline:3px solid #327b84;outline-offset:2px}
   @media(max-width:540px){.rz-v14-return-status{justify-content:flex-start;flex-wrap:wrap}}
   .rz-v154-runner-brand .rz-v155-count[data-visible=true]{display:inline-block}
   @media(prefers-reduced-motion:reduce){.rz-v155-count{animation:none!important}}
  `;document.head.append(css);
  const bar=document.createElement('header');bar.className='rz-v154-runner-brand';bar.dataset.rzRunnerBrand='true';
  const image=document.createElement('img');image.src='/RizSim%20finalized%20logo.png';image.alt='RizSim';image.width=112;image.height=38;image.decoding='async';image.fetchPriority='high';
  const label=document.createElement('span');label.textContent='RizSimulation · Student Experience';
  const resources=document.createElement('button');resources.type='button';resources.className='rz-v155-resource-return';
  resources.textContent='Class Resources';resources.setAttribute('aria-label','Return to the original RizSim Classroom tab without closing this simulation');
  const count=document.createElement('span');count.className='rz-v155-count';count.dataset.visible='false';count.setAttribute('aria-label','New class resources');
  resources.append(count);bar.append(image,label,resources);document.body.prepend(bar);
  // This hint identifies a browsing context, not an authorization credential.
  const validName=n=>/^rz-classroom-[a-z0-9-]{8,80}$/i.test(n||'');
  let originalName='',original=null,channel=null,request='',ack=false,settleTimer=0;
  try{const h=JSON.parse(sessionStorage.getItem('rizsim:classroom-return')||'null');
   if(h&&String(h.session)===session&&validName(h.name))originalName=h.name;
  }catch(_){}
  const status=document.createElement('div');status.className='rz-v14-return-status';status.hidden=true;
  const message=document.createElement('span');message.setAttribute('role','status');message.setAttribute('aria-live','polite');
  const retry=document.createElement('button');retry.type='button';
  const dismiss=document.createElement('button');dismiss.type='button';dismiss.textContent='Dismiss';
  dismiss.addEventListener('click',()=>{status.hidden=true;});status.append(message,retry,dismiss);bar.append(status);
  function alive(w){try{return !!w&&!w.closed&&w!==window&&w.location.origin===location.origin&&!!w.RizSimStudentClassroom;}catch(_){return false;}}
  function remember(w){
   if(!alive(w))return false;
   const n=w.RizSimStudentClassroom.tabName;
   if(validName(n)){originalName=n;try{sessionStorage.setItem('rizsim:classroom-return',JSON.stringify({name:n,session}));}catch(_){}}
   original=w;return true;
  }
  remember(window.opener);
  function compact(ready){
   message.textContent=ready?'Classroom is ready. Select its browser tab if switching was blocked.':'Select your Classroom tab, or reopen Student Classroom. This simulation stays open.';
   retry.textContent=ready?'Try switching':'Open Classroom';retry.dataset.ready=String(ready);status.hidden=false;
  }
  function namedOriginal(){
   // No URL is supplied: never navigate/reload an existing Classroom.
   // A severed browsing-context group may yield an empty new tab; close ONLY that empty tab.
   if(!validName(originalName))return null;
   let w;try{w=window.open('',originalName);if(alive(w)&&w.RizSimStudentClassroom.tabName===originalName)return w;
    if(w&&w!==window&&!w.closed&&w.location.href==='about:blank')w.close();
   }catch(_){}return null;
  }
  function requestReturn(){
   clearTimeout(settleTimer);request=String(Date.now())+'-'+Math.random().toString(36).slice(2);ack=false;
   let direct=false;
   try{
    if(!alive(original))remember(window.opener);
    // Synchronous focus in the learner's click, before rendering work, preserves activation.
    const w=alive(original)?original:namedOriginal();
    if(w){w.focus();direct=w.RizSimStudentClassroom.openResources(session)===true;remember(w);}
   }catch(_){}
   try{if(originalName)channel?.postMessage({kind:'open-resources',session,target:originalName,request});}catch(_){}
   settleTimer=setTimeout(()=>{
    if(document.hidden||!document.hasFocus()){status.hidden=true;return;}
    compact(direct||ack);
   },350);
  }
  retry.addEventListener('click',()=>{
   if(retry.dataset.ready==='true'){requestReturn();return;}
   // Explicit recovery only; no automatic duplicate Classroom navigation.
   const existing=alive(original)?original:namedOriginal();
   if(existing){original=existing;requestReturn();return;}
   try{const w=window.open('/access-in.html#player',validName(originalName)?originalName:'rz-classroom-'+crypto.randomUUID());
    if(w){original=w;message.textContent='Student Classroom opened. Your simulation and selected answers remain here.';retry.textContent='Try switching';retry.dataset.ready='true';}
    else message.textContent='Your browser blocked opening a tab. Select an existing RizSim tab or allow this site to open one.';
   }catch(_){message.textContent='Select your RizSim Classroom browser tab. Your simulation stays open.';}
  });
  if(session&&typeof BroadcastChannel==='function'){
   try{channel=new BroadcastChannel('rizsim:classroom:'+session);
    channel.onmessage=e=>{
     const m=e.data;if(String(m?.session)!==session)return;
     if(originalName&&m.tabName&&m.tabName!==originalName)return;
     if(m.kind==='resources-return-ack'&&m.request===request){ack=m.accepted===true;return;}
     if(m.kind!=='resources-count')return;
     const n=Math.max(0,Math.floor(Number(m.count)||0));count.dataset.visible=String(n>0);count.textContent=n>99?'99+':String(n);count.setAttribute('aria-label',n+' new class resources');
    };
    const ask=()=>channel?.postMessage({kind:'resources-request',session,target:originalName});ask();
    const requestTimer=setInterval(()=>{if(!document.hidden)ask();},20000);
    window.addEventListener('pagehide',()=>{clearInterval(requestTimer);clearTimeout(settleTimer);channel?.close();},{once:true});
   }catch(_){}
  }
  resources.addEventListener('click',requestReturn);
  // Do not decode large hidden images before they enter the viewport.
  for(const img of document.querySelectorAll('img:not(.rz-v154-runner-brand img)')){
   if(!img.hasAttribute('loading'))img.loading='lazy';img.decoding='async';
  }
  // ERP and authenticated learner name travel only through same-origin sessionStorage,
  // never as URL query params or Cloudflare analytics dimensions.
  let handoff=null;try{handoff=JSON.parse(sessionStorage.getItem('rizsim:v154:participant')||'null');}catch(_){}
  if(handoff&&handoff.at>Date.now()-600000&&String(handoff.attempt)===attempt&&String(handoff.session)===session){
   const fill=()=>{
    const name=document.querySelector('#participant-name,#pname'),org=document.querySelector('#participant-org,#porg');
    if(name)name.value=String(handoff.name||'').slice(0,120);
    if(org)org.value=String(handoff.institution||'RizSim classroom').slice(0,120);
    const hotelCode=document.getElementById('participant');if(hotelCode)hotelCode.value=String(handoff.erp||'').slice(0,40);
    return !!(name&&org)||!!hotelCode;
   };
   if(!fill()){const watcher=new MutationObserver(()=>{if(fill())watcher.disconnect();});
    watcher.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
    setTimeout(()=>watcher.disconnect(),12000);}
  }
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

/* Design Code 1.3: decorate already-released learning feedback, never evaluate answers. */
(()=>{'use strict';
 const paths={'/simulation-insight-to-implication.html':'insight','/simulation-system-1-system-2.html':'systems','/simulation-hotel-judgment.html':'hotel'};
 const kind=paths[location.pathname];if(!kind)return;
 const init=()=>{
  const root=document.getElementById('app')||document.querySelector('main.app');if(!root)return;
  document.body.dataset.rzLearning=kind;
  const practice=new URLSearchParams(location.search).get('access')==='practice';
  const shown=new Set();let queued=false;
  const icon=(outcome)=>{
   const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
   svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');
   svg.setAttribute('stroke-width','1.8');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');
   svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.classList.add('rz-learning-outcome');
   const ring=document.createElementNS(ns,'circle');ring.setAttribute('cx','12');ring.setAttribute('cy','12');ring.setAttribute('r','10');
   const path=document.createElementNS(ns,'path');path.setAttribute('d',outcome==='review'?'m8 8 8 8M16 8l-8 8':outcome==='success'?'m7 12 3 3 7-7':'M8 12h8m-3-3 3 3-3 3');
   svg.append(ring,path);return svg;
  };
  function decorate(){queued=false;
   if(!practice)return; // Live-session answer release and its presentation stay authoritative.
   if(kind==='insight'){
    const mark=root.querySelector('.outcome .outcome-mark');
    if(mark&&!mark.dataset.rzEnhanced){
     // These two characters are rendered ONLY by the existing locked-pair feedback stage.
     // Never read keys, infer correctness from choices, or grade a tentative response.
     const verdicts=Array.from(mark.textContent.trim());
     if(verdicts.length!==2||!verdicts.every(x=>x==='\u2713'||x==='\u00d7'))return;
     const panel=mark.closest('.outcome'),key=panel.textContent;
     if(shown.has(key))panel.classList.add('rz-learning-revisited');shown.add(key);
     mark.dataset.rzEnhanced='true';panel.dataset.rzFeedback=verdicts.includes('\u00d7')?'review':'success';
     const chips=verdicts.map((value,i)=>{const state=value==='\u2713'?'success':'review';
      const chip=document.createElement('span');chip.className='rz-learning-verdict';chip.dataset.outcome=state;
      const label=document.createElement('span');label.textContent=i?'Transfer':'Source';
      chip.setAttribute('role','img');chip.setAttribute('aria-label',label.textContent+(state==='success'?' correct':' needs review'));
      chip.append(icon(state),label);return chip;});mark.replaceChildren(...chips);
    }
   }else if(kind==='systems'){
    const mark=root.querySelector('.panel.feedback .feedback-icon');
    if(mark&&!mark.dataset.rzEnhanced){
     // This simulation releases instructional feedback, not a per-choice verdict.
     // An arrow communicates review without falsely marking an answer wrong/right.
     const panel=mark.closest('.feedback'),key=panel.textContent;
     if(shown.has(key))panel.classList.add('rz-learning-revisited');shown.add(key);
     mark.dataset.rzEnhanced='true';panel.dataset.rzFeedback='instructional';mark.replaceChildren(icon('instructional'));
    }
   }
  }
  const schedule=()=>{if(!queued){queued=true;requestAnimationFrame(decorate);}};
  const observer=new MutationObserver(schedule);observer.observe(root,{childList:true,subtree:true});decorate();
  window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
