/* RizSim V15: small, scoped presentation and support actions. */
(()=>{'use strict';
 const supportEmail='rizsimulation@gmail.com';
 function copyText(text){return navigator.clipboard?.writeText(text)||Promise.reject(new Error('Clipboard unavailable'))}
 function makeSupport(){for(const card of document.querySelectorAll('.contact-card')){const h=card.querySelector('h3');if(!h||h.textContent.trim()!=='Platform support'||card.dataset.v15Support)return;card.dataset.v15Support='yes';
  const p=h.nextElementSibling;if(p&&p.tagName==='P')p.remove();const group=document.createElement('div');group.className='rz-v15-support';
  const title=document.createElement('strong');title.textContent='RizSimulation Team';const caption=document.createElement('p');caption.textContent='Questions about simulations, your class or account access? We are happy to help.';
  const link=document.createElement('a');link.href='mailto:'+supportEmail;link.textContent=supportEmail;
  const button=document.createElement('button');button.type='button';button.className='button button-secondary';button.textContent='Copy support email';
  const status=document.createElement('span');status.className='rz-v15-status';status.setAttribute('role','status');
  button.addEventListener('click',async()=>{try{await copyText(supportEmail);status.textContent='Email address copied.'}catch(_){status.textContent='Copy this address: '+supportEmail}});
  group.append(title,caption,link,button,status);card.append(group);
 }}
 function init(){makeSupport();const host=document.getElementById('authenticatedApp');if(host){new MutationObserver(makeSupport).observe(host,{childList:true,subtree:true});}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
