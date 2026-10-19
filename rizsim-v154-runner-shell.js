/* V15.4: shared participant shell. Does not alter experiment/scoring engines. */
(()=>{'use strict';
 if(document.querySelector('[data-rz-runner-brand]'))return;
 const start=()=>{
  if(document.querySelector('[data-rz-runner-brand]'))return;
  const bar=document.createElement('header');bar.className='rz-v154-runner-brand';bar.dataset.rzRunnerBrand='true';
  const image=document.createElement('img');image.src='/RizSim%20finalized%20logo.png';image.alt='RizSim';image.width=112;image.height=38;image.decoding='async';image.fetchPriority='high';
  const label=document.createElement('span');label.textContent='RizSimulation · Student Experience';
  const home=document.createElement('a');home.href='/access-in.html#player';home.textContent='Class resources & website';home.target='_blank';home.rel='noopener noreferrer';home.setAttribute('aria-label','Return to RizSim website and class resources in another tab');
  bar.append(image,label,home);
  document.body.prepend(bar);
  // Never eagerly decode hidden/off-screen media. Browser manages visibility.
  for(const img of document.querySelectorAll('img:not(.rz-v154-runner-brand img)')){
    if(!img.hasAttribute('loading'))img.loading='lazy';img.decoding='async';
  }
  // Website identity is convenience metadata, not an authorization credential.
  const qp=new URLSearchParams(location.search);
  let handoff=null;
  try{handoff=JSON.parse(sessionStorage.getItem('rizsim:v154:participant')||'null');}catch(_){}
  if(handoff&&handoff.at>Date.now()-600000&&String(handoff.attempt)===qp.get('attempt')&&String(handoff.session)===qp.get('session')){
   const fill=()=>{
    const name=document.querySelector('#participant-name,#pname');
    const org=document.querySelector('#participant-org,#porg');
    if(!name||!org)return false;
    name.value=String(handoff.name||'').slice(0,120);
    org.value=String(handoff.institution||'').slice(0,120);
    return true;
   };
   if(!fill()){
    const observer=new MutationObserver(()=>{if(fill())observer.disconnect();});
    observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),12000);
   }
  }
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
