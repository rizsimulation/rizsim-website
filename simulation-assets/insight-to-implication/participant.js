/* RizSimulation · Participant — standalone Activity 01 */
(function () {
  'use strict';
  const C=window.InsightCore, D=window.InsightData;
  const LOCAL_KEY='RizSimulation_InsightToImplication_Student_v1:'+((new URLSearchParams(location.search)).get('attempt')||'standalone');
  const S={record:null,token:null,live:false,mode:'active',keyReleased:false,offlineKeyReleased:false,
    busy:false,nav:{kr:0,kg:0},error:'',statusText:'',statusTimer:null,cloud:null,submitted:false,cloudGate:!!document.body.dataset.rizsimProductionRunner};
  const $=id=>document.getElementById(id), E=C.esc;
  let confirmCallback=null, pollBusy=false, toastTimer=null;
   let selectionTimer=null,paintTimer=null,queuedChoice=null,choiceSave=Promise.resolve(),choiceSaveError=null;
   async function flushChoices(){
     clearTimeout(selectionTimer);selectionTimer=null;
     if(queuedChoice){
       const draft=queuedChoice;queuedChoice=null;
       choiceSave=choiceSave.catch(()=>{}).then(async()=>{
         if(S.cloud)await S.cloud.saveRecord(draft);
         else if(S.live){const reply=await api('/api/save',{record:draft});S.mode=reply.mode;S.keyReleased=!!reply.keyReleased;}
         choiceSaveError=null;S.error='';
       }).catch(err=>{choiceSaveError=err;S.error='Your selection could not be saved: '+errorText(err);notify(S.error,true);throw err;});
     }
     await choiceSave;
     if(queuedChoice)return flushChoices();
     if(choiceSaveError)throw choiceSaveError;
   }
   function chooseInstant(button,update){
     if(S.busy||S.submitted||!S.record||!permitted())return;
     const phase=button.dataset.phase;if(S.record.locks?.[phase])return;
     const next=C.clone(S.record);update(next);
     next.updatedAt=C.now();next.revision=(Number(S.record.revision)||0)+1;
     S.record=next;keepLocal();
     // Mark the choice synchronously, before any network request or full render.
     button.closest('.choices')?.querySelectorAll('.choice').forEach(b=>{const yes=b===button;b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',String(yes));});
     clearTimeout(paintTimer);paintTimer=setTimeout(()=>{if(!S.busy)render();},95);
     if(S.cloud||S.live){queuedChoice=C.clone(next);clearTimeout(selectionTimer);selectionTimer=setTimeout(()=>{flushChoices().catch(()=>{});},140);}
   }
  function loadLocal(){try{const s=JSON.parse(localStorage.getItem(LOCAL_KEY)||'null');
    if(s&&C.validRecord(s.record)){S.record=s.record;S.token=s.token||null;S.offlineKeyReleased=!!s.offlineKeyReleased;
      S.nav={kr:Math.max(0,Math.min(5,Number(s.nav?.kr)||0)),kg:Math.max(0,Math.min(5,Number(s.nav?.kg)||0))};}
  }catch(err){S.error='Browser storage is unavailable. Use Download backup regularly.'}}
  function keepLocal(){try{localStorage.setItem(LOCAL_KEY,JSON.stringify({record:S.record,token:S.token,offlineKeyReleased:S.offlineKeyReleased,nav:S.nav}));return true}
    catch(err){S.error='Browser storage is full or unavailable. Export a backup file to protect your work.';return false}}
  function notify(message,isError=false){const el=$('toast');if(!el)return;clearTimeout(toastTimer);el.textContent=message;el.className='toast show'+(isError?' error':'');toastTimer=setTimeout(()=>{el.className='toast'},4200)}
  function errorText(err){return err?.message||String(err)}
  async function api(path,body,method='POST'){
    const options={method,headers:{'Accept':'application/json'}};
    if(S.token)options.headers['X-Participant-Token']=S.token;
    if(body!==undefined){options.headers['Content-Type']='application/json';options.body=JSON.stringify(body)}
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);options.signal=controller.signal;
    try{const response=await fetch(path,options);const payload=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(payload.error||'Server could not save this response.');return payload;
    }finally{clearTimeout(timeout)}
  }
  async function boot(){
     if(S.cloudGate){
       try{
         if(!window.RizSimInsightCloud)throw new Error('Authenticated simulation integration is missing.');
         S.cloud=await window.RizSimInsightCloud.init();
         S.record=S.cloud.record;S.submitted=!!S.cloud.submitted;
         // Hosted Google authentication supplies the learner name: no second join form.
         if(!S.record&&!S.submitted){const display=String(S.cloud.displayName||'RizSim Learner').trim().slice(0,120);
           S.record=await S.cloud.saveRecord(C.createRecord(display,'RizSim classroom'));}
         S.mode='active';S.error='';
       }catch(err){
         $('app').innerHTML='<div class="panel panel-pad centered"><div class="section-kicker">RizSim authentication required</div><h2>Classroom access could not be verified</h2><p class="note error">'+E(errorText(err))+'</p><p>Return to your signed-in RizSim Student workspace and launch your authorized session. Nothing was submitted.</p><a class="btn secondary" href="/access-in.html">Return to Student workspace</a></div>';
         return;
       }
     }else loadLocal();
     if(!S.cloudGate&&location.protocol.startsWith('http')){
      try{
        let st=await api('/api/status',undefined,'GET');
        if(st.instrumentId===D.id){S.live=true;S.mode=st.mode;S.keyReleased=!!st.keyReleased;
          if(S.token){try{const me=await api('/api/me',undefined,'GET');if(C.validRecord(me.record)){S.record=me.record;keepLocal()}}
            catch(err){S.record=null;S.token=null;keepLocal();}}
          setInterval(poll,3200);
        }
      }catch(err){/* Ordinary static hosting and local files run independently. */}
    }
    render();
    window.RizSimInsightBridge?.student(()=>S.record);
  }

   async function poll(){if(!S.live||pollBusy)return;pollBusy=true;
    try{const result=await api('/api/status',undefined,'GET');
      const changed=S.mode!==result.mode||S.keyReleased!==!!result.keyReleased;
      S.mode=result.mode;S.keyReleased=!!result.keyReleased;
      if(changed&&!S.busy)render();
    }catch(err){if(!S.busy){S.statusText='Reconnecting…';const t=$('live-connection');if(t)t.textContent='Reconnecting…';}}
    finally{pollBusy=false}
  }
  function permitted(){if(S.busy)return false;if(!S.live)return true;
    if(S.mode!=='active'){notify('Please wait for the facilitator to start or resume the activity.',true);return false}return true;}
  async function saveNext(next){if(!permitted()||S.submitted)return false;S.busy=true;
     const before=S.record?{...S.record.locks}:{};
     clearTimeout(paintTimer);
     try{await flushChoices();}catch(err){S.busy=false;notify('Selections were not confirmed by RizSim. Retry after reconnecting.',true);render();return false;}
    next.updatedAt=C.now();next.revision=S.record?S.record.revision+1:next.revision;
    try{
       if(S.cloud){S.record=await S.cloud.saveRecord(next);}
       else if(S.live){const response=await api('/api/save',{record:next});
         S.record=response.record;S.mode=response.mode;S.keyReleased=!!response.keyReleased;
       } else S.record=next;
       keepLocal();S.error='';
       if(Object.keys(S.record.locks).some(k=>S.record.locks[k]&&!before[k]))
         window.RizSimInsightBridge?.committed(S.record.locks.kg?'completed':('locked-'+C.stage(S.record)));
       if(S.cloud&&S.record.locks.kg&&!S.submitted){
         try{await S.cloud.submit();S.submitted=true;}
         catch(err){S.error='Decisions saved, but RizSim submission has not yet been confirmed: '+errorText(err);notify(S.error,true);}
       }
       return true;
    }catch(err){S.error='Response was not saved: '+errorText(err);notify(S.error,true);return false}
    finally{S.busy=false;render()}
  }
  async function startParticipant(){
    const name=$('participant-name')?.value.trim(),organization=$('participant-org')?.value.trim();
    if(!name||!organization){notify('Enter both your name and organization.',true);return}
    S.busy=true;
    try{
       if(S.cloud){S.record=await S.cloud.saveRecord(C.createRecord(name,organization));}
       else if(S.live){const response=await api('/api/join',{name,organization});S.record=response.record;S.token=response.token;S.mode=response.mode;S.keyReleased=response.keyReleased;}
       else S.record=C.createRecord(name,organization);
      keepLocal();notify('Your learning activity is ready.');
    }catch(err){notify('Could not join: '+errorText(err),true)}
    finally{S.busy=false;render()}
  }
  function confirm(title,body,callback){confirmCallback=callback;$('modal-root').innerHTML=`<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="confirmation-title"><h2 id="confirmation-title">${E(title)}</h2><p>${E(body)}</p><div class="actions"><button type="button" class="btn secondary" data-action="cancel-confirm">Go back</button><button type="button" class="btn primary" data-action="accept-confirm">Confirm &amp; lock</button></div></div></div>`;}
  function dismiss(){confirmCallback=null;$('modal-root').innerHTML=''}
  function releaseAvailable(){return !!S.record?.locks.kg&&(S.live?S.keyReleased:S.offlineKeyReleased)}
  function stepNav(){if(!S.record)return '';
    const stage=C.stage(S.record),index=stage==='kr'?0:['source','bridge','transfer','feedback'].includes(stage)?1:stage==='kg'?2:3;
    return `<div class="hero-art" aria-label="Learning stages">${['KR','LT','KG','RGA'].map((short,i)=>`<div class="journey-step ${i===index?'active':i<index?'done':''}"><strong>${short}</strong><span>${['Review · 6','Transfer · 2','Gain · 6','Personal results'][i]}</span></div>`).join('')}</div>`;
  }
  function header(){const n=S.record?.profile?.name;
    return `<header class="topbar"><div class="brand"><div class="rlogo" aria-label="RizSimulation R logo">R</div><div><div class="brand-name">RizSimulation</div><div class="brand-caption">Learning Transfer Framework · Participant</div></div></div><div class="top-meta"><span class="chip">${E(D.topic)}</span><span class="chip" id="live-connection">${S.cloud?'● Authorized RizSim classroom':S.live?'● Live workshop':'◉ Standalone / offline'}</span></div></header>
    <section class="hero"><div><div class="eyebrow">${E(D.programme)}</div><h1>${E(D.title)}</h1><p>${n?'Learning journey for '+E(n)+' · ':''}KR → LT → KG → RGA · one source–transfer pair</p></div>${stepNav()}</section>`;
  }
  function footer(){return `<footer class="foot"><span>Private formative learning activity · One scenario is not a diagnostic assessment.</span><span>RizSimulation · Insight to Implication · Activity 01</span></footer>`}
  function render(){const root=$('app');const rec=S.record;
    if(!rec){root.innerHTML=header()+`<div class="panel panel-pad centered">${renderJoin()}</div>`+footer();return;}
    const stage=C.stage(rec);
    let content='';
    if(S.live && S.mode==='waiting')content=holding('Waiting for the facilitator','You are registered. Keep this tab open. The activity will open automatically when the facilitator starts the workshop.');
    else if(S.live && S.mode==='paused')content=holding('Workshop temporarily paused','Your locked responses are saved. Continue when the facilitator resumes the workshop.');
    else if(S.live && S.mode==='ended'&&stage!=='rga')content=holding('Workshop has ended','The facilitator has closed response collection. Your completed responses remain recorded.');
    else if(stage==='kr')content=renderReview('kr');
    else if(stage==='source'||stage==='transfer')content=renderCase(stage);
    else if(stage==='bridge')content=renderBridge();
    else if(stage==='feedback')content=renderFeedback();
    else if(stage==='kg')content=renderReview('kg');
    else content=renderRGA();
    root.innerHTML=header()+`<div class="view-layout"><main class="panel panel-pad student-main" id="student-main">${content}</main>${renderRail()}</div>`+footer();
  }
  function renderJoin(){return `<div class="join-cover"><div><div class="section-kicker">WELCOME · PRIVATE LEARNING RECORD</div><h2 style="margin-top:7px;font-size:24px">Notice a need. Own the next step.</h2><p class="form-subtitle">Make six starting judgments; read a factual bridge; apply the insight in a new case; then review your change. There are no confidence ratings.</p>
    <form id="join-form" class="form-vertical"><div class="field"><label for="participant-name">Your name</label><input id="participant-name" maxlength="120" autocomplete="name" required placeholder="Enter your name" value="${E(S.cloud?.displayName||'')}" /></div><div class="field"><label for="participant-org">Organization</label><input id="participant-org" maxlength="120" required placeholder="University, school or organization" /></div><button class="btn primary" type="submit">${S.live?'Join live workshop':'Begin the activity'} →</button></form>
    <p class="small muted mt-12">${S.live?'The facilitator controls when your activity begins.':'Responses are saved in this browser and can be exported as JSON for faculty.'}</p></div>
    <div class="join-art"><strong>From insight<br>to implication.</strong><p>Knowledge Review → Learning Transfer → Knowledge Gain → Review Gain Analytics</p></div></div>`}
  function holding(title,body){return `<div style="padding:65px 13px;text-align:center"><div class="eyebrow">${S.live?'LIVE FACILITATED WORKSHOP':'ACTIVITY STATUS'}</div><h2 style="font-size:24px;margin:12px 0">${E(title)}</h2><p style="max-width:550px;margin:auto;color:var(--muted)">${E(body)}</p><div class="note mt-20">Your name and organization are recorded. Previous completed decisions remain locked.</div></div>`}
  function renderRail(){const r=S.record,stage=C.stage(r),complete=C.committed(r),pending=C.countAnswered(r,stage==='kg'?'kg':'kr');
    let stageTitle={kr:'Knowledge Review',source:'Learning Transfer',bridge:'Factual knowledge',transfer:'Transfer application',feedback:'Learning feedback',kg:'Knowledge Gain',rga:'Review Gain Analytics'}[stage];
    return `<aside class="student-rail"><section class="panel rail-panel"><div class="rail-title"><strong>Your progress</strong><span class="chip">${complete} / 14 locked</span></div><div class="progress-bar" aria-label="${complete} of 14 decisions committed"><span style="width:${complete/14*100}%"></span></div><p class="small muted mt-12">${E(stageTitle)}</p><div class="rail-list"><div><span>Knowledge Review</span><strong>${r.locks.kr?'6 / 6 locked':C.countAnswered(r,'kr')+' / 6 selected'}</strong></div><div><span>Source → Transfer</span><strong>${Number(r.locks.source)+Number(r.locks.transfer)} / 2 locked</strong></div><div><span>Knowledge Gain</span><strong>${r.locks.kg?'6 / 6 locked':C.countAnswered(r,'kg')+' / 6 selected'}</strong></div><div><span>Participant</span><strong class="identity">${E(r.profile.name)}</strong></div><div><span>Organization</span><strong class="identity">${E(r.profile.organization)}</strong></div></div>
    <button type="button" class="btn secondary block mt-20" data-action="export" style="margin-top:15px">Download response backup</button><p class="small muted mt-12">${S.live?'Live decisions synchronize to the workshop; backup is optional.':'Give your final response JSON to faculty for cohort analytics.'}</p></section>
    <section class="panel rail-panel rail-dark"><div class="eyebrow" style="color:#91cfca">Learning principle</div><h3 class="mt-12">Keep judgments independent.</h3><p>Source decisions are locked before factual knowledge. Transfer is a new setting, not an opportunity to change your original answer.</p></section>
    ${S.error?`<div class="note error">${E(S.error)}</div>`:''}
    </aside>`;
  }
  function renderReview(phase){const r=S.record,order=r.order[phase],idx=S.nav[phase],question=C.BY_ID[order[idx]],pick=r.picks[phase][question.id];const count=C.countAnswered(r,phase);
    const isKR=phase==='kr';return `<div class="introline"><div><div class="section-kicker">${isKR?'01 / KNOWLEDGE REVIEW':'03 / KNOWLEDGE GAIN'}</div><h2>${isKR?'Your starting judgments':'Apply what you have learned'}</h2></div><span class="chip">${count} / 6 selected</span></div>
    <p class="small muted">${isKR?'Read each situation. Choose the best-supported response without concept feedback.':'The same six concepts appear in a new order. Your previous answers are not shown.'}</p><div class="divider"></div>
    <div class="introline"><span class="section-kicker">${E(question.concept)}</span><span class="step-counter">Question ${idx+1} of 6</span></div>
    <div class="question-stem">${E(question.stem)}</div>
    <div class="choices">${Object.entries(question.options).map(([letter,text])=>`<button type="button" class="choice ${pick===letter?'selected':''}" data-action="choose-review" data-phase="${phase}" data-id="${question.id}" data-letter="${letter}" aria-pressed="${pick===letter}"><span class="letter">${letter}</span><span class="value">${E(text)}</span></button>`).join('')}</div>
    <div class="divider"></div><div class="introline"><div class="question-tabs">${order.map((id,i)=>`<button type="button" class="number ${idx===i?'on':''} ${r.picks[phase][id]?'answered':''}" data-action="nav" data-phase="${phase}" data-index="${i}" aria-label="Question ${i+1}${r.picks[phase][id]?', answered':''}">${i+1}</button>`).join('')}</div><span class="question-status">You may change selections until stage lock.</span></div>
    <div class="actions end"><div class="actions"><button type="button" class="btn secondary" data-action="prev" data-phase="${phase}" ${idx===0?'disabled':''}>← Previous</button><button type="button" class="btn secondary" data-action="next" data-phase="${phase}" ${idx===5?'disabled':''}>Next →</button></div>
    <button type="button" class="btn primary" data-action="lock-review" data-phase="${phase}" ${count<6?'disabled':''}>Confirm &amp; lock all 6</button></div>
    ${count<6?`<p class="small muted mt-12">Complete ${6-count} more ${6-count===1?'question':'questions'} to unlock stage submission.</p>`:''}`;
  }
  function renderCase(phase){const item=D[phase],r=S.record,selected=r.picks[phase];
    return `<div class="introline"><div><div class="section-kicker">02 / LEARNING TRANSFER · ${phase==='source'?'SOURCE':'NEW APPLICATION'}</div><h2>${E(item.title)}</h2></div><span class="chip">${phase==='source'?'First judgment':'New context'}</span></div>
    <p class="small muted">${phase==='source'?'Make and lock your first judgment before reading the conceptual explanation.':'Use the factual explanation from the source case in this different situation.'}</p>
    <div class="source-story"><span class="eyebrow">${E(item.eyebrow)}</span><p style="margin-top:8px">${E(item.stem)}</p></div>
    <div class="prompt">${E(item.prompt)}</div>
    <div class="choices">${Object.entries(item.options).map(([letter,text])=>`<button type="button" class="choice ${selected===letter?'selected':''}" data-action="choose-case" data-phase="${phase}" data-letter="${letter}" aria-pressed="${selected===letter}"><span class="letter">${letter}</span><span class="value">${E(text)}</span></button>`).join('')}</div>
    <div class="divider"></div><div class="actions right"><button type="button" class="btn primary" data-action="lock-case" data-phase="${phase}" ${!selected?'disabled':''}>Confirm &amp; lock ${phase==='source'?'source':'transfer'} judgment →</button></div>
    <p class="small muted mt-12">Once locked, this decision cannot be revised.</p>`;
  }
  function renderBridge(){return `<div class="introline"><div><div class="section-kicker">02 / FACTUAL KNOWLEDGE BRIDGE</div><h2>${E(D.factualBridge.heading)}</h2></div><span class="chip">Source judgment locked</span></div>
    <p style="font-size:16px;font-weight:690;margin:17px 0 6px">${E(D.factualBridge.lead)}</p><div class="bridge-grid">${D.factualBridge.steps.map((b,i)=>`<div class="mini"><div class="ordinal">0${i+1}</div><h3>${E(b.heading)}</h3><p>${E(b.text)}</p></div>`).join('')}</div>
    <div class="note"><strong>Important case detail:</strong> ${E(D.factualBridge.note)}</div>
    <div class="confirm-box"><input type="checkbox" id="bridge-check" /><label for="bridge-check">I have read the factual explanation and am ready to apply the idea in a new case.</label></div>
    <div class="actions right mt-20"><button type="button" class="btn primary" data-action="bridge-ack" id="bridge-continue" disabled>Continue to transfer case →</button></div>`;
  }
  function renderFeedback(){const r=S.record,flags=C.ltFlags(r),feedback=D.feedback[flags.cluster],mustReview=feedback.review;
    return `<div class="introline"><div><div class="section-kicker">02 / LEARNING FEEDBACK</div><h2>Your source–transfer journey</h2></div><span class="chip">Both decisions locked</span></div>
    <div class="outcome"><div class="outcome-mark">${flags.cluster.split('').map(ch=>ch==='C'?'✓':'×').join('')}</div><div><div class="eyebrow">${E(C.LABEL[flags.cluster])}</div><h3>${E(feedback.title)}</h3><p><strong>${E(feedback.short)}</strong> ${E(feedback.detail)}</p></div></div>
    <div class="mini-charts"><div class="chart-panel"><div class="section-kicker">SOURCE JUDGMENT</div><h3 style="margin-top:8px">${flags.source?'Correct':'Needs review'}</h3><p>Your locked response: ${E(r.picks.source)} · ${E(D.source.options[r.picks.source])}</p></div>
    <div class="chart-panel"><div class="section-kicker">NEW TRANSFER</div><h3 style="margin-top:8px">${flags.transfer?'Correct':'Needs review'}</h3><p>Your locked response: ${E(r.picks.transfer)} · ${E(D.transfer.options[r.picks.transfer])}</p></div></div>
    ${mustReview?`<div class="instruction mt-20"><strong>${E(D.refresher.heading)}</strong><p class="mt-12">${E(D.refresher.body)}</p><p class="mt-12"><b>Library example:</b> ${E(D.refresher.example)}</p></div><div class="confirm-box"><input type="checkbox" id="feedback-check" /><label for="feedback-check">I have reviewed the concept and the additional example.</label></div>`:`<div class="note">You can now complete the final review. Your source and transfer decisions remain permanently locked.</div>`}
    <div class="actions right mt-20"><button type="button" class="btn primary" data-action="feedback-ack" ${mustReview?'disabled id="feedback-continue"':''}>Continue to Knowledge Gain →</button></div>`;
  }
  function bar(label,value,max=6,alt=false){return `<div class="hbar ${alt?'alt':''}"><div class="name">${E(label)}</div><div class="track"><div class="fill" style="width:${max?value/max*100:0}%"></div></div><div class="value">${value} / ${max}</div></div>`}
  function renderRGA(){const r=S.record,a=C.rga(r),f=a.lt;return `<div class="introline"><div><div class="section-kicker">04 / REVIEW GAIN ANALYTICS</div><h2>Your learning in view</h2></div><span class="pill-ok">Completed &amp; saved</span></div>
    <p class="small muted mb-12">These results describe this activity only. Scores can change after feedback and repeated exposure; this is not a measure of permanent mastery.</p>
    <div class="tally-grid"><div class="stat"><div class="k">Knowledge Review</div><div class="v">${a.kr}<small> / 6</small></div><div class="sub">Your initial review</div></div>
      <div class="stat"><div class="k">Knowledge Gain</div><div class="v">${a.kg}<small> / 6</small></div><div class="sub">Your final review</div></div>
      <div class="stat emphasis"><div class="k">Review change</div><div class="v">${a.change>0?'+':''}${a.change}<small> / 6</small></div><div class="sub">${a.changePP>0?'+':''}${a.changePP.toFixed(1)} percentage points</div></div>
      <div class="stat"><div class="k">Source → Transfer</div><div class="v" style="font-size:22px">${f.source?'✓':'×'} <span style="font-size:15px;color:var(--muted)">→</span> ${f.transfer?'✓':'×'}</div><div class="sub">${E(C.LABEL[f.cluster])}</div></div></div>
    <div class="section-head"><h2>Review progress</h2><span class="tiny-label">Correct responses · maximum 6</span></div>
    <div class="mini-charts"><div class="chart-panel"><h3>KR versus KG</h3><p>Matched review of the same six concepts</p>${bar('KR',a.kr,6,true)}${bar('KG',a.kg,6,false)}</div>
      <div class="chart-panel"><h3>Item-by-item movement</h3><p>Correctness transitions across your six matched questions</p>
        ${[['Stayed correct',a.transitions.stayedCorrect],['Became correct',a.transitions.becameCorrect],['Became incorrect',a.transitions.becameIncorrect],['Still incorrect',a.transitions.stillIncorrect]].map(([name,value])=>bar(name,value,6)).join('')}</div></div>
    <div class="section-head"><h2>Your learning-transfer pathway</h2><span class="tiny-label">Source → factual knowledge → transfer</span></div>
    <div class="cluster-grid">${[['CC','Both correct'],['IC','Improved at transfer'],['CI','Transfer needs review'],['II','Review both']].map(([name,label])=>`<div class="cluster ${f.cluster===name?'active':''}"><div class="cluster-name">${E(C.LABEL[name])}</div><div class="visual"><span class="dot ${name[0]==='C'?'yes':'no'}"></span><span class="dot ${name[1]==='C'?'yes':'no'}"></span></div><p>${E(label)}</p>${f.cluster===name?'<span class="pill-ok" style="display:inline-flex;margin-top:7px">Your path</span>':''}</div>`).join('')}</div>
    <div class="note mt-12"><b>Source:</b> ${E(D.source.options[r.picks.source])}<br><b>Transfer:</b> ${E(D.transfer.options[r.picks.transfer])}<br><b>Next action:</b> ${E(D.feedback[f.cluster].short)}</div>
    <div class="section-head"><h2>Personal answer guide</h2><span class="tiny-label">${releaseAvailable()?'Released by faculty':'Held until faculty release'}</span></div>
    ${releaseAvailable()?renderKey():renderKeyPending()}
     ${S.cloud?`<div class="note ${S.submitted?'':'warning'}" role="status"><strong>${S.submitted?'Submission confirmed by RizSim':'Submission not yet confirmed'}</strong><p>${S.submitted?'Your 14 decisions are saved and this attempt is read-only.':'Your saved choices remain intact. Please retry server confirmation before leaving this page.'}</p>${S.submitted?'':'<button type="button" class="btn primary" data-action="retry-submit">Confirm submission</button>'}</div>`:''}
     <div class="actions mt-20"><button type="button" class="btn primary" data-action="export">Download my completed record</button><button type="button" class="btn secondary" data-action="print">Print results</button></div>`;
  }
  function renderKeyPending(){return `<div class="instruction"><strong>Your RGA is already available.</strong><p class="mt-12">Correct options and item explanations are shown only after faculty releases the answer guide. ${S.live?'The page updates automatically once released.':'For standalone use, ask faculty for the key-release JSON file and import it below.'}</p>${S.live?'':`<div class="actions mt-12"><label class="btn secondary" for="release-file">Import faculty release file</label><input class="sr-only" type="file" id="release-file" accept=".json,application/json" /></div>`}</div>`}
  function renderKey(){const r=S.record;return `<div class="key-review">${D.review.map(q=>`<div class="key-entry"><h4>${E(q.id)} · ${E(q.concept)} · ${r.picks.kg[q.id]===q.key?'Correct in KG':'Review this item'}</h4><p>${E(q.stem)}</p><div class="key-answer"><strong>Correct option ${q.key}:</strong> ${E(q.options[q.key])}<br><span>${E(q.explanation)}</span></div><p><b>Your choices:</b> KR ${r.picks.kr[q.id]}, KG ${r.picks.kg[q.id]}</p></div>`).join('')}<div class="key-entry"><h4>Source judgment · Correct option ${D.source.key}</h4><p>${E(D.source.options[D.source.key])}</p><p>${E(D.source.explanation)}</p></div><div class="key-entry"><h4>Transfer decision · Correct option ${D.transfer.key}</h4><p>${E(D.transfer.options[D.transfer.key])}</p><p>${E(D.transfer.explanation)}</p></div></div>`}
  function exportData(){if(!S.record)return;const out={exportedAt:C.now(),activity:D.title,record:C.removePrivate(S.record)};
    const safe=S.record.profile.name.replace(/[^a-z0-9_-]/gi,'_').slice(0,35)||'participant';download('Insight_to_Implication_'+safe+'.json',out);
  }
  function download(name,obj){const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200)}
  async function importRelease(file){if(!file||file.size>20000){notify('Choose a small faculty release JSON file.',true);return}
    try{let obj=JSON.parse(await file.text());if(obj.kind!=='rizsimulation-insight-key-release'||obj.instrumentId!==D.id||typeof obj.released!=='boolean')throw Error('This is not an Insight to Implication release file.');
      S.offlineKeyReleased=obj.released;keepLocal();render();notify(obj.released?'Personal answer guide released.':'The answer guide has been hidden.');
    }catch(err){notify('Cannot import release file: '+errorText(err),true)}
  }
   async function action(ev){const b=ev.target.closest('[data-action]');if(!b)return;ev.preventDefault();const type=b.dataset.action;
     if(type==='retry-submit'&&S.cloud&&S.record?.locks.kg){
       try{S.busy=true;await S.cloud.submit();S.submitted=true;S.error='';notify('RizSim confirmed submission.');}
       catch(err){S.error='Submission was not confirmed: '+errorText(err);notify(S.error,true);}
       finally{S.busy=false;render();}return;
     }
    if(type==='cancel-confirm'){dismiss();return}if(type==='accept-confirm'){const cb=confirmCallback;dismiss();if(cb)await cb();return}
    if(type==='export'){exportData();return}if(type==='print'){window.print();return}
    if(!S.record)return;
    if(type==='nav'){S.nav[b.dataset.phase]=Number(b.dataset.index);keepLocal();render();return}
    if(type==='prev'||type==='next'){const phase=b.dataset.phase;S.nav[phase]=Math.max(0,Math.min(5,S.nav[phase]+(type==='prev'?-1:1)));keepLocal();render();return}
    if(type==='choose-review'){
      const {phase,id,letter}=b.dataset;chooseInstant(b,next=>{next.picks[phase][id]=letter});return;
    }
    if(type==='choose-case'){chooseInstant(b,next=>{next.picks[b.dataset.phase]=b.dataset.letter});return}
    if(type==='lock-review'){
      const phase=b.dataset.phase;if(C.countAnswered(S.record,phase)!==6)return;
      confirm(phase==='kr'?'Lock your Knowledge Review?':'Lock your Knowledge Gain?',
        'All six selected answers will be committed permanently. You will not be able to revise this stage.',async()=>{
          const next=C.clone(S.record);next.locks[phase]=true;next.lockedAt[phase]=C.now();await saveNext(next);
        });return;
    }
    if(type==='lock-case'){
      const phase=b.dataset.phase;if(!S.record.picks[phase])return;
      confirm(phase==='source'?'Lock the source judgment?':'Lock the transfer decision?',
        'Your selected answer will be saved and cannot be changed after you confirm.',async()=>{
          const next=C.clone(S.record);next.locks[phase]=true;next.lockedAt[phase]=C.now();await saveNext(next);
        });return;
    }
    if(type==='bridge-ack'){
      if(!$('bridge-check')?.checked){notify('Acknowledge the concept bridge before continuing.',true);return}
      const next=C.clone(S.record);next.locks.bridge=true;await saveNext(next);return;
    }
    if(type==='feedback-ack'){
      const fl=C.ltFlags(S.record);if(D.feedback[fl.cluster].review&&!$('feedback-check')?.checked){notify('Read and acknowledge the additional concept review.',true);return}
      const next=C.clone(S.record);next.locks.feedback=true;await saveNext(next);return;
    }
  }
  document.addEventListener('click',ev=>{action(ev).catch(err=>notify(errorText(err),true))});
  document.addEventListener('submit',ev=>{if(ev.target?.id==='join-form'){ev.preventDefault();startParticipant()}});
  document.addEventListener('change',ev=>{
    if(ev.target?.id==='release-file'){importRelease(ev.target.files?.[0]);return}
    if(ev.target?.id==='bridge-check'&&$('bridge-continue'))$('bridge-continue').disabled=!ev.target.checked;
    if(ev.target?.id==='feedback-check'&&$('feedback-continue'))$('feedback-continue').disabled=!ev.target.checked;
  });
  boot();
})();