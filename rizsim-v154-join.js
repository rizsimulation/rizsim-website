/* RizSim V15.4: minimal floating participant identity confirmation on the
   authenticated STUDENT website. No authorization or attempt mutation here:
   those remain in the existing session RPCs and checked launch handler. */
(()=>{'use strict';
 const elem=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=String(value);return n;};
 let active=null;
 function reserve(){
   const popup=window.open('about:blank','_blank');
   if(!popup)return null;
   try{
     popup.opener=null;popup.document.title='Opening RizSim…';
     popup.document.body.textContent='Your RizSim classroom access is being verified. Keep the original tab open for class resources.';
   }catch(_){}
   return popup;
 }
 function show({room,mode,name='',onJoin}={}){
   if(!room||!['live','practice'].includes(mode)||typeof onJoin!=='function')return false;
   if(active?.open)active.close();
   const modal=elem('dialog','rz-v154-join-dialog');
   const header=elem('div','rz-v154-join-header');
   const logo=elem('img','rz-v154-join-logo');logo.src='/RizSim%20finalized%20logo.png';logo.alt='RizSim official logo';logo.width=118;
   const eyebrow=elem('span','rz-v154-join-eyebrow','RIZSIM · VERIFIED CLASSROOM');
   const title=elem('h2','',mode==='practice'?'Join Practice':'Join Live Class');
   const sub=elem('p','', 'Confirm your details in RizSim. Your simulation opens in a new tab so you can return here for the resources your Faculty shares.');
   header.append(logo,eyebrow,title,sub);modal.append(header);
   const context=elem('div','rz-v154-join-session');
   context.append(elem('span','',room.simulation_title||'Simulation'),elem('strong','',room.class_name||'Faculty class'));
   modal.append(context);
   const form=elem('form','rz-v154-join-form');
   function field(labelText,value,maxLength,autocomplete){
     const label=elem('label','',labelText),input=elem('input');
     input.type='text';input.required=true;input.maxLength=maxLength;input.autocomplete=autocomplete;
     input.value=String(value||'').slice(0,maxLength);input.placeholder=labelText;
     label.append(input);form.append(label);return input;
   }
   const fullName=field('Your name',name,120,'name');
   const suggested=room.institution_name==='Independent Faculty'?'':(room.institution_name||'');
   const institution=field('Institution / organization',suggested,180,'organization');
   const feedback=elem('p','rz-v154-join-feedback');feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
   const actions=elem('div','rz-v154-join-actions');
   const dismiss=elem('button','rz-v154-join-cancel','Not now');dismiss.type='button';
   const join=elem('button','rz-v154-join-submit','Join & open simulation ↗');join.type='submit';
   actions.append(dismiss,join);form.append(feedback,actions);modal.append(form);
   document.body.append(modal);active=modal;
   dismiss.addEventListener('click',()=>modal.close());
   modal.addEventListener('close',()=>{modal.remove();if(active===modal)active=null;},{once:true});
   form.addEventListener('submit',async event=>{
     event.preventDefault();if(join.disabled)return;
     const studentName=fullName.value.trim(),organization=institution.value.trim();
     if(!studentName||!organization){feedback.textContent='Please enter your name and institution.';return;}
     // A new tab must be reserved synchronously, before awaiting the RPC.
     const tab=reserve();
     if(!tab){feedback.textContent='Allow pop-ups for rizsim.com and press Join again.';return;}
     join.disabled=true;dismiss.disabled=true;feedback.textContent='Checking your authorized class…';
     try{
       await onJoin({name:studentName,institution:organization,tab,session:room.session_id,mode});
       modal.close();
     }catch(e){
       try{tab.close()}catch(_){}
       feedback.textContent=e?.message||'Unable to open your class. Please retry.';
     }finally{join.disabled=false;dismiss.disabled=false;}
   });
   modal.showModal();
   if(fullName.value.trim())institution.focus();else fullName.focus();
   return true;
 }
 window.RizSimV154Join=Object.freeze({show,reserve});
})();