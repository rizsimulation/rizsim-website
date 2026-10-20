/* V15.5: single official RizSim brand, origin-tab return and resource notifications. */
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
   .rz-v155-return-notice{position:fixed;top:65px;right:18px;z-index:9999;max-width:min(370px,calc(100vw - 28px));padding:13px 36px 13px 15px;border:1px solid #b6ddd5;border-radius:13px;background:#f3faf8;color:#145b5d;box-shadow:0 14px 37px #143b482e;font:650 12px/1.5 system-ui,sans-serif}
   .rz-v155-return-notice button{position:absolute;right:9px;top:7px;border:0;background:transparent;color:inherit;font-size:20px;cursor:pointer;padding:0 4px}
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
  let channel=null,returnAcknowledged=false;
  function notice(message){
   document.querySelector('.rz-v155-return-notice')?.remove();
   const panel=document.createElement('div');panel.className='rz-v155-return-notice';panel.setAttribute('role','status');
   panel.textContent=message;
   const close=document.createElement('button');close.type='button';close.setAttribute('aria-label','Dismiss notice');close.textContent='×';close.addEventListener('click',()=>panel.remove());panel.append(close);
   document.body.append(panel);return panel;
  }
  if(session&&typeof BroadcastChannel==='function'){
   try{channel=new BroadcastChannel('rizsim:classroom:'+session);
    channel.onmessage=e=>{
     if(String(e.data?.session)!==session)return;
     if(e.data.kind==='resources-return-ack'){returnAcknowledged=e.data.accepted===true;return;}
     if(e.data.kind!=='resources-count')return;
     const n=Math.max(0,Math.floor(Number(e.data.count)||0));
     count.dataset.visible=String(n>0);count.textContent=n>99?'99+':String(n);count.setAttribute('aria-label',n+' new class resources');
    };
    channel.postMessage({kind:'resources-request'});
    // Presenter resources may be published after the learner enters the simulation.
    // Ask the still-open original Classroom to refresh even when that tab is hidden.
    const requestTimer=window.setInterval(()=>{
     if(!document.hidden)channel?.postMessage({kind:'resources-request'});
    },20000);
    window.addEventListener('pagehide',()=>{clearInterval(requestTimer);channel?.close();},{once:true});
   }catch(_){}
  }
  resources.addEventListener('click',()=>{
   // Chrome may sever window.opener on navigation/security policy. Always
   // prepare the original Classroom over the same-origin session channel.
   // Do not open or replace any tab and do not interrupt this simulation.
   returnAcknowledged=false;
   let direct=false;
   try{
    const original=window.opener;
    if(original&&original!==window&&!original.closed&&original.location.origin===location.origin){
     direct=original.RizSimStudentClassroom?.openResources?.(session)===true;
     // Calling focus synchronously in this CLICK (transient activation)
     // is the best-supported way to select an existing tab.
     original.focus();
    }
   }catch(_){/* Opener is unavailable; use the channel return request. */}
   try{channel?.postMessage({kind:'open-resources',session});}catch(_){}
   if(!direct&&!channel){
    notice('Your RizSim Classroom is already open in its original browser tab. Switch to that tab to view Class Resources; your simulation stays open.');
   }else{
    // Browsers that disallow tab focusing still give an actionable response.
    window.setTimeout(()=>{
     if(!document.hidden && !document.hasFocus())return;
     if(document.visibilityState==='visible'){
      notice(returnAcknowledged||direct?
       'Classroom resources are ready in your original RizSim tab. Select that tab if your browser did not switch automatically; this simulation remains open.':
       'Return to your original RizSim tab to view Class Resources. Your simulation is still open and your answers are preserved.');
     }
    },850);
   }
  });
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
