/* RizSim V15: live pause/resume is synchronized with server session state.
   Read-only polling; existing protected simulation engines retain all choices. */
(()=>{'use strict';
 const qp=new URLSearchParams(location.search),session=qp.get('session'),access=qp.get('access');
 if(access!=='live'||!/^[a-f0-9-]{36}$/i.test(session||''))return;
 const url='https://rvmumpvtvjvvuyimeybc.supabase.co',key='sb_publishable_wufSxfg90bb4R6XarScaJQ_Dl5wlmtf';
 let client=null,busy=false,overlay=null,last='',timer=null;
 function panel(){
   if(overlay)return overlay;
   overlay=document.createElement('aside');overlay.className='rz-v15-student-paused';overlay.hidden=true;
   overlay.setAttribute('role','status');overlay.setAttribute('aria-live','polite');
   const card=document.createElement('div');card.className='rz-v15-student-paused-card';
   const logo=document.createElement('img');logo.src='/rizsim-r.png';logo.alt='RizSim';logo.width=46;logo.height=46;
   const chip=document.createElement('span');chip.className='rz-v15-pause-chip';chip.textContent='PRESENTER CONTROL';
   const title=document.createElement('h2');title.textContent='Your presenter has paused the simulation.';
   const copy=document.createElement('p');copy.textContent="Your progress is safely saved. Please wait — you\'ll continue right where you left off.";
   const note=document.createElement('small');note.textContent='Keep this page open. Nothing needs to be restarted.';
   card.append(logo,chip,title,copy,note);overlay.append(card);document.body.append(overlay);return overlay;
 }
 async function check(){
   if(!client||busy||document.hidden)return;busy=true;
   try{const res=await client.rpc('get_rizsim_presenter_state',{p_session_id:session});
    if(res.error)return;
    const data=Array.isArray(res.data)?res.data[0]:res.data;
    if(!data)return;
    const next=!data.live_open?'ended':data.presenter_paused?'paused':'active';
    if(next!==last){last=next;const n=panel();n.hidden=next!=='paused';document.body.classList.toggle('rz-v15-session-paused',next==='paused');
      window.dispatchEvent(new CustomEvent('rizsim:presenter-state',{detail:{paused:next==='paused',live:next==='active'}}));}
   }catch(_){/* Retry quietly; server write restrictions remain authoritative. */}
   finally{busy=false;}
 }
 async function boot(){
   try{const lib=await import('https://esm.sh/@supabase/supabase-js@2.49.8');
     client=lib.createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
     const auth=await client.auth.getUser();if(!auth.data?.user)return;
     await check();timer=window.setInterval(check,3500);
     document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
     window.addEventListener('pageshow',check);
   }catch(_){/* Existing cloud adapter independently verifies access. */}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
