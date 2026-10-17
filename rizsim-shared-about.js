/* Shared About content: public about.html is the single content source for all
   authenticated workspaces. Public and portal tabs use the same PDF asset. */
(function(){
 'use strict';
 const mount=document.getElementById('rizsimSharedAbout');
 const legacy=document.getElementById('rizsimLegacyAbout');
 if(!mount||!legacy)return;
 async function load(){
  try{
   const response=await fetch('about.html',{cache:'no-store',credentials:'same-origin'});
   if(!response.ok)throw new Error('Public About unavailable: '+response.status);
   const doc=new DOMParser().parseFromString(await response.text(),'text/html');
   const source=doc.querySelector('main#rizsimBrandAbout.rz-about');
   if(!source||!source.querySelector('#rzAboutTitle')||!source.querySelector('.rz-about-open-pdf'))throw new Error('About source incomplete');
   // Trusted same-origin static source; nothing from user or remote services.
   mount.innerHTML=source.innerHTML;
   mount.classList.add('rz-about');
   mount.setAttribute('aria-label','About RizSim');
   mount.hidden=false;
   legacy.hidden=true;
   legacy.setAttribute('aria-hidden','true');
  }catch(e){
   mount.hidden=true;
   legacy.hidden=false;
   legacy.removeAttribute('aria-hidden');
   console.warn('RizSim shared About fallback:',e?.message||e);
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});
 else load();
})();