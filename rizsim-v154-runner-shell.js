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
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
