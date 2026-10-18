/* RizSim V15.4: a lightweight, always-visible official brand bar for all
   three participant runners and one-time authenticated identity handoff.
   The original academic engines, scoring and server submission remain intact. */
(()=>{'use strict';
 const qp=new URLSearchParams(location.search);
 const attempt=qp.get('attempt'),session=qp.get('session'),mode=qp.get('access');
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const hosted=uuid.test(attempt||'')&&uuid.test(session||'')&&['live','practice'].includes(mode);
 const el=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
 function start(){
   if(document.querySelector('.rz-v154-runner-bar'))return;
   document.body.classList.add('rz-v154-runner');
   const band=el('div','rz-v154-runner-bar');
   band.setAttribute('role','banner');
   const mark=el('div','rz-v154-runner-brand');
   const logo=el('img');logo.src='/RizSim%20finalized%20logo.png';logo.alt='Official RizSim logo';
   logo.width=106;logo.height=44;logo.decoding='async';
   const title=el('span','rz-v154-runner-brand-text','RizSim · From Knowing to Doing');
   mark.append(logo,title);band.append(mark);
   if(hosted){
     const hint=el('span','rz-v154-runner-hint','Your Faculty resources remain in the original RizSim website tab.');
     const home=el('a','rz-v154-runner-return','Student workspace ↗');
     home.href='/access-in.html#player';home.target='_blank';home.rel='noopener noreferrer';
     band.append(hint,home);
   }
   document.body.prepend(band);
   if(hosted)handoff();
 }
 function handoff(){
   let entry=null;
   try{
     entry=JSON.parse(localStorage.getItem('rizsim:v154:participant:'+attempt)||'null');
     if(!entry||entry.session!==session||
       !entry.name||!entry.institution||
       !Number.isFinite(entry.at)||Date.now()-entry.at>30*86400000)return;
   }catch(_){return;}
   // This data is a display preference only. The simulator separately verifies
   // Student identity, account ownership, classroom access and all server writes.
   const root=document.getElementById('app')||document.body;
   let finished=false,observer=null;
   const apply=()=>{
     if(finished)return;
     const form=document.getElementById('join-form')||document.getElementById('joinForm');
     if(!form||!form.isConnected)return;
     const person=document.getElementById('participant-name')||document.getElementById('pname');
     const org=document.getElementById('participant-org')||document.getElementById('porg');
     if(!person||!org)return;
     finished=true;observer?.disconnect();
     person.value=String(entry.name).slice(0,120);
     org.value=String(entry.institution).slice(0,180);
     // One submit, after the hosted runner has loaded its own verified adapter.
     if(typeof form.requestSubmit==='function')form.requestSubmit();
   };
   observer=new MutationObserver(apply);
   observer.observe(root,{childList:true,subtree:true});
   apply();
   // An unrecognized or completed runner never retains an observer.
   setTimeout(()=>observer?.disconnect(),25000);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();