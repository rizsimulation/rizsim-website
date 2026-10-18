/* New RizSim users see one warm, non-blocking welcome, once, on their first verified profile creation. */
(()=>{'use strict';
 const key='rizsim:v15:welcome';
 function show(userId){
  if(location.pathname.endsWith('/access-in.html')&&!userId)return false;
  let user='';try{user=sessionStorage.getItem(key)||''}catch(_){}
  if(!user||(userId&&user!==String(userId))||document.querySelector('.rz-v15-welcome'))return false;
  try{sessionStorage.removeItem(key)}catch(_){}
  const panel=document.createElement('aside');panel.className='rz-v15-welcome';panel.setAttribute('role','status');
  const kicker=document.createElement('small');kicker.textContent='A WARM WELCOME FROM RIZSIM';
  const title=document.createElement('h2');title.textContent='We are delighted you are here!';
  const copy=document.createElement('p');copy.textContent='Your journey from knowing to doing starts now. Explore, make choices and discover something new — one simulation at a time. Enjoy learning with us!';
  const button=document.createElement('button');button.type='button';button.textContent='Let’s begin';button.addEventListener('click',()=>panel.remove());
  panel.append(kicker,title,copy,button);document.body.append(panel);return true;
 }
 window.RizSimV15Welcome=Object.freeze({show});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show,{once:true});else show();
})();
