/* RizSim Support + Owner Reports, V11. Separate from public navigation and existing roles. */
(function(){
'use strict';
const EMAIL='rizsimulation@gmail.com';
const $=(s,root=document)=>root.querySelector(s);
const el=(tag,cls,txt)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=txt;return x};
const client=()=>window.rizsimSharedAuth;
const contactSelect=['#view-contact.student-view','#view-contact.auth-view'];
let submitting=false,loading=false;
function component(){
 const wrap=el('section','rz-support-panel rz-v153-support-panel');
 wrap.setAttribute('aria-label','RizSim Platform Support');
 const grid=el('div','rz-v153-support-grid');
 const team=el('article','rz-v153-support-team');
 const kicker=el('span','rz-support-kicker','DIRECT PLATFORM SUPPORT');
 const identity=el('div','rz-v153-support-identity');
 const avatar=el('span','rz-v153-support-avatar','R');avatar.setAttribute('aria-hidden','true');
 const who=el('div');
 who.append(el('h2','','RizSimulation Team'),el('p','','Your direct point of contact for RizSim.'));
 identity.append(avatar,who);
 const welcome=el('p','rz-v153-support-welcome',
  'Have a question about a class, an account, licensing or learning on RizSim? We are here to help.');
 const emailDisplay=el('strong','rz-v153-support-address',EMAIL);
 const actions=el('div','rz-v153-support-actions');
 const email=el('a','rz-support-email-action','Compose in Gmail');
 email.href='https://mail.google.com/mail/?view=cm&fs=1&to=rizsimulation%40gmail.com';
 email.target='_blank';email.rel='noopener noreferrer';
 email.setAttribute('aria-label','Open a new Gmail message to RizSimulation Team');
 const copy=el('button','rz-v153-support-copy','Copy Email');copy.type='button';
 const copyStatus=el('p','rz-support-status rz-v153-copy-status','');copyStatus.setAttribute('role','status');
 copyStatus.setAttribute('aria-live','polite');
 copy.addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(EMAIL);copyStatus.textContent='Email address copied.';}
  catch(_){copyStatus.textContent='Copy this email address: '+EMAIL;}
 });
 actions.append(email,copy);
 team.append(kicker,identity,welcome,emailDisplay,actions,copyStatus);
 const report=el('article','rz-v153-support-report');
 report.append(el('span','rz-support-kicker','SEND A PLATFORM REPORT'),
  el('h2','','Report an issue or send feedback'),
  el('p','rz-v153-support-report-note',
  'Your report goes directly to the RizSim Owner. You can submit a technical issue, an access question or feedback securely.'));
 const form=el('form','rz-support-form');form.noValidate=true;
 const categoryLabel=el('label','','What is your enquiry about?');
 const select=el('select','rz-support-category');select.required=true;
 select.setAttribute('aria-label','Report category');
 for(const [v,t] of [['general','General enquiry'],['technical','Technical problem'],['account','Account or access'],['content','Simulation or learning content'],['other','Other']]){
  const option=el('option','',t);option.value=v;select.append(option);
 }
 categoryLabel.append(select);
 const messageLabel=el('label','','Describe your issue or feedback');
 const textarea=el('textarea','rz-support-message');textarea.rows=4;textarea.maxLength=3000;
 textarea.minLength=10;textarea.required=true;textarea.setAttribute('aria-label','Describe your problem or complaint');
 textarea.placeholder='What happened, where did it happen, and how can we help?';
 messageLabel.append(textarea);
 const foot=el('div','rz-support-foot');
 const count=el('small','','0 / 3000 characters');
 const button=el('button','rz-support-send','Send Report');button.type='submit';
 foot.append(count,button);
 const status=el('p','rz-support-status','');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const safety=el('small','rz-v153-support-privacy','Please do not include passwords or sensitive account details.');
 form.append(categoryLabel,messageLabel,foot,safety,status);
 textarea.addEventListener('input',()=>{count.textContent=textarea.value.length+' / 3000 characters';});
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(submitting)return;
  const message=textarea.value.trim();
  if(message.length<10){status.textContent='Please describe the issue in at least 10 characters.';textarea.focus();return;}
  if(message.length>3000){status.textContent='Please shorten your report to 3,000 characters.';return;}
  if(!client()){status.textContent='Please wait for your RizSim account to finish loading.';return;}
  submitting=true;button.disabled=true;button.textContent='Sending…';status.textContent='';
  try{
   const {data:{user},error:identityError}=await client().auth.getUser();
   if(identityError||!user)throw Error('Please sign in to your RizSim workspace before reporting.');
   const {error}=await client().from('rizsim_support_reports').insert({category:select.value,message});
   if(error)throw Error(error.code==='42P01'?'Reporting is being prepared. Please email support for now.':error.message);
   textarea.value='';count.textContent='0 / 3000 characters';
   status.textContent='Report received. It is now available to the platform Owner.';
  }catch(err){status.textContent='Report not sent: '+(err?.message||'Please try again. You can also email support.');}
  finally{submitting=false;button.disabled=false;button.textContent='Send Report';}
 });
 report.append(form);grid.append(team,report);wrap.append(grid);return wrap;
}
function mountContact(){
 for(const sel of contactSelect){const view=$(sel);if(!view||$('.rz-support-panel',view))continue;
 const layout=$('.contact-layout',view);
 if(layout)layout.insertAdjacentElement('afterend',component());else view.querySelector('.content-shell')?.append(component());
 }
}
async function fetchOwnerReports(){
 const body=$('#rzOwnerReportsBody');const message=$('#rzOwnerReportsStatus');
 if(!body||!message||loading)return;loading=true;message.textContent='Loading reports…';
 try{
  if(!client())throw Error('Sign in is still loading.');
  const {data:{user},error:authError}=await client().auth.getUser();
  if(authError||!user)throw Error('Please sign in.');
  const {data:yes,error:ownerErr}=await client().rpc('is_rizsim_owner');
  if(ownerErr||yes!==true)throw Error('Owner authorization is required.');
  const [{data:reports,error},{data:profiles,error:peopleErr}]=await Promise.all([
   client().from('rizsim_support_reports').select('id,reporter_id,category,message,status,created_at').order('created_at',{ascending:false}).limit(300),
   client().from('profiles').select('id,display_name,email').limit(5000)
  ]);
  if(error)throw Error(error.message);
  if(peopleErr)throw Error('Unable to resolve reporting accounts.');
  const roster=new Map((profiles||[]).map(p=>[p.id,p]));
  body.replaceChildren();
  for(const r of reports||[]){
   const p=roster.get(r.reporter_id)||{};
   const row=el('tr');
   const date=el('td','',new Date(r.created_at).toLocaleString());
   const who=el('td');who.append(el('strong','',p.display_name||'RizSim account'));who.append(el('small','',p.email||r.reporter_id));
   const category=el('td','',r.category);
   const detail=el('td','rz-owner-report-message',r.message);
   const action=el('td'),select=el('select');
   for(const [v,l] of [['new','New'],['reviewing','Reviewing'],['resolved','Resolved']]){const opt=el('option','',l);opt.value=v;select.append(opt)}
   select.value=r.status;
   select.setAttribute('aria-label','Update report status for '+(p.display_name||'reporter'));
   select.addEventListener('change',async()=>{const next=select.value;select.disabled=true;message.textContent='Updating report status…';try{
    const {error:saveErr}=await client().from('rizsim_support_reports').update({status:next}).eq('id',r.id);
    if(saveErr)throw Error(saveErr.message);
    message.textContent='Report status saved.';
   }catch(err){select.value=r.status;message.textContent='Update failed: '+err.message;}finally{select.disabled=false;}});
   action.append(select);row.append(date,who,category,detail,action);body.append(row);
  }
  if(!reports?.length){const row=el('tr'),cell=el('td','','No support reports have been submitted yet.');cell.colSpan=5;row.append(cell);body.append(row);}
  message.textContent=(reports||[]).length+' report(s) shown (latest 300).';
 }catch(err){message.textContent='Reports unavailable: '+(err?.message||'Unable to load.');}
 finally{loading=false;}
}
function mountOwner(){
 const nav=$('#adminTabNav'),panel=$('[data-admin-panel="publishing"]');
 if(!nav||!panel||$('#rzOwnerReportsTab'))return;
 const btn=el('button','admin-tab-button','Reports');btn.type='button';btn.dataset.adminTab='reports';btn.id='rzOwnerReportsTab';btn.setAttribute('aria-selected','false');btn.hidden=true;
 nav.append(btn);
 const p=el('section','admin-tab-panel rz-owner-reports');p.dataset.adminPanel='reports';p.id='rzOwnerReportsPanel';
 p.append(el('h3','', 'Support Reports'),el('p','', 'Reports submitted by signed-in RizSim users. This queue is visible to the Owner only.'));
 const controls=el('div','rz-owner-reports-tools');const refresh=el('button','rz-support-send','Refresh reports');refresh.type='button';refresh.addEventListener('click',fetchOwnerReports);controls.append(refresh);
 const status=el('p','rz-support-status','Open Reports to load submissions.');status.id='rzOwnerReportsStatus';status.setAttribute('role','status');
 const tableWrap=el('div','rz-owner-reports-scroll');const table=el('table','rz-owner-reports-table');const thead=el('thead'),tr=el('tr');
 for(const h of ['Received','Reporter','Category','Message','Status'])tr.append(el('th','',h));
 thead.append(tr);const tbody=el('tbody');tbody.id='rzOwnerReportsBody';table.append(thead,tbody);tableWrap.append(table);
 p.append(controls,status,tableWrap);panel.insertAdjacentElement('afterend',p);
 btn.addEventListener('click',()=>{if(!btn.hidden)void fetchOwnerReports();});
 // The existing authenticated module sets the current portal role and invokes
 // configureRoleNavigation; only owner can access Reports and the database enforces it.
}
function init(){mountContact();mountOwner();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
window.RizSimSupport={mount:init,loadReports:fetchOwnerReports,showOwnerOnly(role){
 const btn=$('#rzOwnerReportsTab');const panel=$('#rzOwnerReportsPanel');
 if(btn)btn.hidden=role!=='owner';
 if(role!=='owner'&&panel){panel.classList.remove('active');}
}};
})();