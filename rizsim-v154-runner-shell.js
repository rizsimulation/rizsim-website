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
   .rz-v154-runner-brand .rz-v155-count{display:none;min-width:20px;height:20px;border-radius:50px;background:#d52b39;color:white;font-size:10px;font-weight:900;line-height:20px;text-align:center;padding:0 4px;margin-left:5px}
   .rz-v154-runner-brand .rz-v155-count[data-visible=true]{display:inline-block}
   @media(prefers-reduced-motion:reduce){.rz-v155-count{animation:none!important}}
  `;document.head.append(css);
  const bar=document.createElement('header');bar.className='rz-v154-runner-brand';bar.dataset.rzRunnerBrand='true';
  const image=document.createElement('img');image.src='/RizSim%20finalized%20logo.png';image.alt='RizSim';image.width=112;image.height=38;image.decoding='async';image.fetchPriority='high';
  const label=document.createElement('span');label.textContent='RizSimulation · Student Experience';
  const resources=document.createElement('a');resources.href='#';resources.textContent='Class Resources';resources.setAttribute('aria-label','Switch to your original RizSim Classroom tab to view class resources');
  const count=document.createElement('span');count.className='rz-v155-count';count.dataset.visible='false';count.setAttribute('aria-label','New class resources');
  resources.append(count);bar.append(image,label,resources);document.body.prepend(bar);
  let channel=null;
  if(session&&typeof BroadcastChannel==='function'){
   try{channel=new BroadcastChannel('rizsim:classroom:'+session);
    channel.onmessage=e=>{if(e.data?.kind!=='resources-count'||String(e.data?.session)!==session)return;
     const n=Math.max(0,Math.floor(Number(e.data.count)||0));count.dataset.visible=String(n>0);count.textContent=n>99?'99+':String(n);count.setAttribute('aria-label',n+' new class resources');};
    channel.postMessage({kind:'resources-request'});
    window.addEventListener('pagehide',()=>channel?.close(),{once:true});
   }catch(_){}
  }
  resources.addEventListener('click',event=>{
   event.preventDefault();let succeeded=false;
   try{if(window.opener&&window.opener!==window&&window.opener.location.origin===location.origin){
     succeeded=window.opener.RizSimStudentClassroom?.openResources?.(session)===true;
     if(succeeded)window.opener.focus();
   }}catch(_){}
   try{channel?.postMessage({kind:'open-resources'});}catch(_){}
   if(!succeeded){resources.title='Switch to the original RizSim Classroom browser tab. This button never creates another tab.';}
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
