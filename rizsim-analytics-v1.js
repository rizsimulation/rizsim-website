/* RizSim Analytics Dashboard Code 1.0. Presentation-only adapters.
 * Inputs are the existing Faculty modules' authorized, validated session rows.
 * No fetching, persistence, role changes, answer keys, or cross-session queries.
 */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.RizSimAnalytics=api;})(typeof window==='undefined'?null:window,function(root){
 'use strict';
 const PATHS=['CC','IC','CI','II'],LABELS=['Correct / correct','Incorrect / correct','Correct / incorrect','Incorrect / incorrect'];
 const COLORS=['#217c78','#7a6bac','#bd8c42','#567fba'];
 const finite=n=>typeof n==='number'&&Number.isFinite(n),avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
 const fmt=n=>finite(n)?n.toLocaleString('en',{maximumFractionDigits:1}):'\u2014';
 const sign=n=>finite(n)?(n>0?'+':'')+fmt(n):'\u2014';
 const pct=(n,d)=>d?fmt(n/d*100)+'%':'\u2014';
 const quantile=(xs,p)=>{if(!xs.length)return null;const a=xs.slice().sort((x,y)=>x-y),i=(a.length-1)*p,k=Math.floor(i);return a[k]+(a[Math.ceil(i)]-a[k])*(i-k);};
 function model(kind,opts){
  const rows=opts.rows||[],C=opts.core;
  const m={kind,joined:rows.length,started:0,krLocked:0,reviewed:0,kgLocked:0,submitted:rows.filter(x=>x.status==='submitted').length,people:[],pairs:[],choices:[],transitions:[0,0,0,0],pathways:[0,0,0,0],revealed:opts.revealed===true};
  if(kind==='hotel'){
   m.started=rows.filter(x=>x.progress>0).length;
   // Defense in depth: ignore even supplied private records until the native module releases them.
   m.people=m.revealed?rows.filter(x=>x.status==='submitted'&&x.record).map(x=>({id:x.attempt,group:x.record.group,value:x.record.willing_to_pay_pkr,binary:x.record.binary_response})):[];
   return m;
  }
  const usable=rows.filter(x=>kind==='insight'?C.validRecord(x.record):x.record&&x.metrics);
  for(const x of usable){
   const r=x.record,v=x.metrics,rg=kind==='insight'?C.rga(r):null;
   const kr=kind==='insight'?C.score(r,'kr'):v.kr,kg=kind==='insight'?C.score(r,'kg'):v.kg;
   const paired=finite(kr)&&finite(kg);
   const p={id:x.attempt,organization:String(r.profile?.organization||'').trim(),group:String(kind==='insight'?r.facultyGroup||'':r.profile?.group||'').trim(),kr:paired?kr:null,kg:paired?kg:null,paths:[]};
   m.started++;m.krLocked+=Number(kind==='insight'?r.locks.kr:v.kr_locked===true);m.kgLocked+=Number(kind==='insight'?r.locks.kg:v.kg_locked===true);
   m.reviewed+=Number(kind==='insight'?r.locks.feedback:r.lt.every(t=>!!t.source?.seen&&!!t.transfer?.seen));
   if(paired){m.pairs.push(p);const tt=kind==='insight'?Object.values(rg.transitions):[0,0,0,0];
    if(kind==='systems')for(let i=0;i<6;i++){const a=v.item_kr[i],b=v.item_kg[i];if(typeof a==='boolean'&&typeof b==='boolean')tt[a?(b?0:2):(b?1:3)]++;}
    tt.forEach((n,i)=>m.transitions[i]+=n);
   }
   const cases=kind==='insight'?['Bystander Effect']:['Bystander Effect','Confirmation Bias'];
   cases.forEach((name,i)=>{
    const flags=kind==='insight'?C.ltFlags(r):null;
    const a=kind==='insight'?flags?.source:v.lt_source[i],b=kind==='insight'?flags?.transfer:v.lt_transfer[i];
    if(typeof a==='boolean'&&typeof b==='boolean'){const path=(a?'C':'I')+(b?'C':'I');m.pathways[PATHS.indexOf(path)]++;p.paths.push(path);}
    for(const stage of ['source','transfer']){
     const locked=kind==='insight'?r.locks[stage]:!!r.lt[i][stage]?.at;
     const option=kind==='insight'?r.picks[stage]:['A','B','C','D'][r.lt[i][stage]?.a];
     if(locked&&['A','B','C','D'].includes(option))m.choices.push({case:name,stage,option});
    }
   });m.people.push(p);
  }
  m.krMean=avg(m.pairs.map(p=>p.kr));m.kgMean=avg(m.pairs.map(p=>p.kg));m.changePP=m.pairs.length?(m.kgMean-m.krMean)/6*100:null;
  return m;
 }
 function groupStats(m,key){
  const buckets=new Map();for(const p of m.people){const label=p[key]||null;if(!buckets.has(label))buckets.set(label,[]);buckets.get(label).push(p);}
  return [...buckets].sort((a,b)=>String(a[0]??'').localeCompare(String(b[0]??''))).map(([label,people])=>{
   const pair=people.filter(p=>finite(p.kr)&&finite(p.kg)),paths=people.flatMap(p=>p.paths);
   return {label:label===null?'Not provided (missing label)':label,missing:label===null,n:people.length,paired:pair.length,kr:avg(pair.map(p=>p.kr)),kg:avg(pair.map(p=>p.kg)),change:avg(pair.map(p=>(p.kg-p.kr)/6*100)),paths:PATHS.map(k=>paths.filter(x=>x===k).length),pathN:paths.length};
  });
 }
 if(!root)return Object.freeze({model,groupStats,quantile});
 const E=(tag,cls='',text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;};
 const S=(tag,attrs={},text)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=text;return n;};
 let serial=0;const state=new WeakMap();
 function panel(parent,title,sub){const n=E('section','rz-a-panel'),h=E('h3','',title);n.append(h);if(sub)n.append(E('p','rz-a-note',sub));parent.append(n);return n;}
 function empty(p,text='No completed observations yet.'){p.append(E('p','rz-a-empty',text));}
 function caution(p,n,unit='matched learners'){if(n>0&&n<5)p.append(E('p','rz-a-caution','Small sample: n = '+n+' '+unit+'. Describe these responses; do not generalize.'));}
 function table(p,headers,rows,caption='Chart data'){
  const details=E('details','rz-a-data');details.append(E('summary','',caption));const wrap=E('div','rz-a-table-wrap'),t=E('table'),head=E('thead'),tr=E('tr');headers.forEach(h=>{const th=E('th','',h);th.scope='col';tr.append(th);});head.append(tr);t.append(head);const body=E('tbody');rows.forEach(row=>{const tr=E('tr');row.forEach(v=>tr.append(E('td','',v)));body.append(tr);});t.append(body);wrap.append(t);details.append(wrap);p.append(details);return details;
 }
 function svg(p,label,w=440,h=210){const n=S('svg',{viewBox:`0 0 ${w} ${h}`,role:'img','aria-labelledby':'rz-chart-'+(++serial),class:'rz-a-chart'});n.append(S('title',{id:'rz-chart-'+serial},label));p.append(n);return n;}
 function line(g,x1,y1,x2,y2,attrs={}){g.append(S('line',{x1,y1,x2,y2,stroke:'#dce5e7','stroke-width':1,...attrs}));}
 function text(g,x,y,t,attrs={}){g.append(S('text',{x,y,fill:'#425661','font-size':12,...attrs},String(t)));}
 function stats(parent,items,cls=''){
  const grid=E('div','rz-a-stats '+cls);for(const [label,value,desc]of items){const card=E('div','rz-a-metric');card.dataset.metric=label;card.append(E('span','rz-a-label',label),E('strong','',value),E('small','',desc));grid.append(card);}parent.append(grid);return grid;
 }
 function participation(parent,m,legacy=false){
  const common='of '+m.joined+' joined';
  const items=m.kind==='hotel'?[['Joined',m.joined,'Authorized session roster'],['Started',m.started,'Committed progress above 0%'],['Submitted',m.submitted,common],['Collection',m.revealed?'Closed':'Sealed','Existing server release state']]:[['Started',m.started,'Valid saved records; '+common],['KR locked',m.krLocked,common],['LT reviewed',m.reviewed,m.kind==='insight'?'Feedback acknowledged':'All 4 feedback acknowledgements'],['KG completed',m.kgLocked,common]];
  const p=panel(parent,'Live participation','Current authorized classroom; counts describe recorded checkpoints, not inferred activity.');
  stats(p,items,legacy?{insight:'rz-i01-stat-grid',systems:'rz-s02-metrics',hotel:'rz-h03-metrics'}[m.kind]:'');return p;
 }
 function pairedMeans(p,m){
  stats(p,[['Mean KR',fmt(m.krMean===null?null:m.krMean/6*100)+'%','n = '+m.pairs.length+' paired'],['Mean KG',fmt(m.kgMean===null?null:m.kgMean/6*100)+'%','Same learners'],['Change',sign(m.changePP)+' pp','KG minus KR (pp)']]);
  if(!m.pairs.length){empty(p,'Paired scores appear after both reviews are locked. Missing scores are not zero.');return;}
  const g=svg(p,'Paired mean review scores on a fixed 0 to 100 percent scale',440,112),left=80,width=320;
  [0,25,50,75,100].forEach(v=>{const x=left+v/100*width;line(g,x,16,x,78);text(g,x,100,v+'%',{'text-anchor':'middle'});});
  [['KR',m.krMean,COLORS[2]],['KG',m.kgMean,COLORS[0]]].forEach(([label,n,c],i)=>{const y=23+i*29;text(g,12,y+13,label,{'font-weight':650});g.append(S('rect',{x:left,y,width:n/6*width,height:18,rx:3,fill:c}));text(g,435,y+13,fmt(n/6*100)+'%',{'text-anchor':'end'});});
  caution(p,m.pairs.length);
 }
 function transitions(parent,m){
  const p=panel(parent,'Matched-review answer transitions','Same review items before and after; denominator = '+m.transitions.reduce((a,b)=>a+b,0)+' matched item answers, not learners.');
  const names=['Correct to correct','Incorrect to correct','Correct to incorrect','Incorrect to incorrect'];bars(p,names.map((label,i)=>({label,value:m.transitions[i]})),m.transitions.reduce((a,b)=>a+b,0),'item answers');
 }
 function bars(p,rows,denom,unit='responses'){
  if(!denom){empty(p,'No locked '+unit+' available.');return;}
  const list=E('div','rz-a-bars');for(const [i,r] of rows.entries()){
   const row=E('div','rz-a-bar-row'),cap=E('div','rz-a-bar-caption');cap.append(E('span','',r.label),E('strong','',r.value+' / '+denom+' ('+pct(r.value,denom)+')'));
   const track=E('div','rz-a-track'),fill=E('span');fill.style.width=(r.value/denom*100)+'%';fill.style.background=COLORS[i%4];track.append(fill);row.append(cap,track);list.append(row);
  }p.append(list,E('p','rz-a-scale','0% to 100% of '+denom+' '+unit));
 }
 function pathways(p,m){
  const total=m.pathways.reduce((a,b)=>a+b,0),unit=m.kind==='systems'?'locked case pairs (up to 2 per learner)':'learners with a locked source-transfer pair';
  p.append(E('p','rz-a-note','n = '+total+' '+unit+'. First letter: source; second: transfer. C = correct, I = incorrect.'));
  if(!total){empty(p,'Learning Transfer pathways appear once both decisions are locked.');return;}
  const wrap=E('div','rz-a-donut-layout'),g=svg(wrap,'Learning Transfer response composition, '+total+' '+unit,180,180);const radius=61,circumference=2*Math.PI*radius;let offset=0;
  m.pathways.forEach((n,i)=>{if(n){g.append(S('circle',{cx:90,cy:90,r:radius,fill:'none',stroke:COLORS[i],'stroke-width':21,'stroke-dasharray':`${n/total*circumference} ${circumference}`,'stroke-dashoffset':-offset,transform:'rotate(-90 90 90)'}));offset+=n/total*circumference;}});
  text(g,90,88,total,{'text-anchor':'middle','font-size':26,'font-weight':700});text(g,90,108,'locked pairs',{'text-anchor':'middle','font-size':12});
  const legend=E('div','rz-a-legend');PATHS.forEach((code,i)=>{const row=E('div'),sw=E('span','rz-a-swatch');sw.style.background=COLORS[i];row.append(sw,E('strong','',code),E('span','',LABELS[i]),E('b','',m.pathways[i]+' ('+pct(m.pathways[i],total)+')'));legend.append(row);});wrap.append(legend);p.append(wrap);
  caution(p,new Set(m.people.filter(x=>x.paths.length).map(x=>x.id)).size,'learners with locked pairs');
 }
 function scatter(parent,m){
  const p=panel(parent,'Participant score distribution','One coordinate per matched score pair. Circle area shows the number of learners at that coordinate; the dashed line marks no change.');
  if(!m.pairs.length){empty(p);return;}
  const counts=new Map();m.pairs.forEach(x=>{const k=x.kr+','+x.kg;counts.set(k,(counts.get(k)||0)+1);});
  const g=svg(p,'Paired KR versus KG scores, both axes from 0 to 6, n = '+m.pairs.length,440,260),x=v=>58+v/6*320,y=v=>205-v/6*180;
  for(let i=0;i<=6;i++){line(g,x(i),25,x(i),205);line(g,58,y(i),378,y(i));text(g,x(i),223,i,{'text-anchor':'middle'});text(g,45,y(i)+4,i,{'text-anchor':'end'});}
  line(g,x(0),y(0),x(6),y(6),{stroke:'#657b85','stroke-dasharray':'5 4'});
  const largest=Math.max(...counts.values());
  for(const [key,n]of counts){const [a,b]=key.split(',').map(Number),r=18*Math.sqrt(n/largest);const point=S('circle',{cx:x(a),cy:y(b),r,fill:COLORS[1],'fill-opacity':.65,stroke:COLORS[1]});point.append(S('title',{},`KR ${a}/6; KG ${b}/6; ${n} learners`));g.append(point);if(n>1)text(g,x(a),y(b)+4,n,{'text-anchor':'middle',fill:'#fff','font-size':11});}
  text(g,218,249,'Knowledge Review (correct / 6)',{'text-anchor':'middle'});text(g,5,15,'KG (correct / 6)');
  p.append(E('p','rz-a-note','n = '+m.pairs.length+'. Bubble area is proportional to count, scaled to the largest coordinate count; exact counts appear on repeated points and below.'));
  table(p,['KR / 6','KG / 6','Learners'],[...counts].map(([k,n])=>[...k.split(','),n]));
 }
 function histogram(parent,m){
  const p=panel(parent,'Distribution of review change','KG minus KR, in correct answers out of 6. All 13 possible integer changes are shown.');
  if(!m.pairs.length){empty(p);return;}
  const bins=Array.from({length:13},(_,i)=>({label:i-6,value:m.pairs.filter(p=>p.kg-p.kr===i-6).length})),max=Math.max(1,...bins.map(b=>b.value));
  const g=svg(p,'Count of matched learners by change in correct answers, n = '+m.pairs.length,440,235),left=42,base=187,w=28;
  [0,Math.ceil(max/2),max].filter((x,i,a)=>a.indexOf(x)===i).forEach(v=>{const y=base-v/max*150;line(g,left,y,409,y);text(g,34,y+4,v,{'text-anchor':'end'});});
  bins.forEach((b,i)=>{const x=left+i*w,h=b.value/max*150;g.append(S('rect',{x:x+1,y:base-h,width:w-2,height:h,fill:b.label<0?COLORS[2]:b.label===0?COLORS[3]:COLORS[1]}));text(g,x+w/2,206,b.label,{'text-anchor':'middle'});if(b.value)text(g,x+w/2,base-h-5,b.value,{'text-anchor':'middle'});});text(g,42,20,'Learners');text(g,223,230,'Change in correct answers (KG - KR)',{'text-anchor':'middle'});
  table(p,['Change / 6','Learners'],bins.map(b=>[sign(b.label),b.value]));
 }
 function choices(parent,m){
  const p=panel(parent,'Source and transfer choices','Locked choices only. Each stage has its own response denominator; an unanswered choice is not an incorrect choice.');
  const cases=m.kind==='systems'?['Bystander Effect','Confirmation Bias']:['Bystander Effect'];
  for(const name of cases){p.append(E('h4','',name));const grid=E('div','rz-a-grid');for(const stage of ['source','transfer']){const block=E('div'),rr=m.choices.filter(x=>x.case===name&&x.stage===stage);block.append(E('h4','',stage==='source'?'Source choices':'Transfer choices'));bars(block,['A','B','C','D'].map(label=>({label:'Option '+label,value:rr.filter(x=>x.option===label).length})),rr.length,'locked choices');grid.append(block);}p.append(grid);}
 }
 function groups(parent,m,view){
  const p=panel(parent,'Group comparison','Within this authorized classroom only. Organization and class/group labels are recorded participant attributes, not verified institutional assignments.');
  const label=E('label','rz-a-control','Compare by '),select=E('select');select.setAttribute('aria-label','Group comparison dimension');
  [['organization','Organization'],['group','Class / faculty group']].forEach(([v,t])=>{const o=E('option','',t);o.value=v;select.append(o);});select.value=view.dimension||'organization';label.append(select);p.append(label);const body=E('div');p.append(body);
  function draw(){view.dimension=select.value;body.replaceChildren();const gs=groupStats(m,select.value),named=gs.filter(x=>!x.missing);
   if(named.length<2)empty(body,'Two named groups are needed for a comparison. Missing labels are shown separately, not inferred.');
   if(!gs.length)return;
   const grid=E('div','rz-a-group-list');gs.forEach(g=>{const row=E('article','rz-a-group-row');row.append(E('h4','',g.label),E('p','rz-a-note',`Recorded n = ${g.n}; paired n = ${g.paired}; transfer pairs = ${g.pathN}`));
    const delta=E('div','rz-a-delta');delta.append(E('strong','',sign(g.change)+' pp'),E('span','',`KR ${fmt(g.kr===null?null:g.kr/6*100)}% to KG ${fmt(g.kg===null?null:g.kg/6*100)}%`));row.append(delta);
    const track=E('div','rz-a-diverge');track.setAttribute('role','img');track.setAttribute('aria-label',`Paired change ${sign(g.change)} percentage points; common scale minus 100 to plus 100`);if(finite(g.change)){const mark=E('span');mark.style.left=(50+g.change/2)+'%';track.append(mark);}const scale=E('p','rz-a-scale');['-100 pp','0','+100 pp'].forEach(v=>scale.append(E('span','',v)));row.append(track,scale);
    const mix=E('div','rz-a-stack');if(g.pathN)g.paths.forEach((n,i)=>{const seg=E('span');seg.style.width=n/g.pathN*100+'%';seg.style.background=COLORS[i];seg.title=PATHS[i]+': '+n+' / '+g.pathN;mix.append(seg);});row.append(mix,E('p','rz-a-note',PATHS.map((k,i)=>k+' '+g.paths[i]+'/'+g.pathN).join(' | ')));caution(row,g.paired);if(!g.paired)row.append(E('p','rz-a-note','Paired learning change not yet available.'));grid.append(row);
   });body.append(grid,E('p','rz-a-note','Observed within-session differences only; small-sample warning threshold: fewer than 5 matched learners. Separate classroom sessions cannot be compared with this session-scoped feed.'));
   table(body,['Group','Recorded n','Paired n','Mean KR / 6','Mean KG / 6','Change pp','CC','IC','CI','II','Transfer pairs'],gs.map(g=>[g.label,g.n,g.paired,fmt(g.kr),fmt(g.kg),sign(g.change),...g.paths,g.pathN]));
  }select.addEventListener('change',draw);draw();
 }
 function hotel(parent,m){
  const p=panel(parent,'Price judgments',m.revealed?'Released submitted responses; willingness to pay is not a grade.':'Collection in progress. Group allocations and price judgments remain sealed.');
  if(!m.revealed){empty(p,'Continue collecting independent judgments. Results appear only after the existing server release condition is met.');return;}
  if(!m.people.length){empty(p,'No valid submitted price judgments were released.');return;}
  const groups=['A','B'].map(label=>({label,people:m.people.filter(p=>p.group===label)}));
  stats(p,groups.map(g=>['Group '+g.label+' median','PKR '+fmt(quantile(g.people.map(p=>p.value),.5)),'n = '+g.people.length]));
  const g=svg(p,'Group A and B willingness-to-pay distributions on a common PKR scale',440,220),max=Math.max(1,...m.people.map(p=>p.value)),x=v=>60+v/max*330;
  [0,.25,.5,.75,1].forEach(v=>{line(g,x(v*max),35,x(v*max),158);text(g,x(v*max),180,fmt(v*max),{'text-anchor':'middle','font-size':11});});
  groups.forEach((group,i)=>{const y=62+i*67,values=group.people.map(p=>p.value).sort((a,b)=>a-b),color=COLORS[i];text(g,5,y+4,group.label+' n='+values.length);
   if(values.length>=5){const q1=quantile(values,.25),q3=quantile(values,.75),mid=quantile(values,.5);line(g,x(values[0]),y,x(values.at(-1)),y,{stroke:color,'stroke-width':2});g.append(S('rect',{x:x(q1),y:y-14,width:Math.max(1,x(q3)-x(q1)),height:28,fill:color,'fill-opacity':.18,stroke:color}));line(g,x(mid),y-14,x(mid),y+14,{stroke:color,'stroke-width':3});}
   const counts=new Map();values.forEach(v=>counts.set(v,(counts.get(v)||0)+1));for(const [v,n]of counts){const c=S('circle',{cx:x(v),cy:y,r:4+Math.min(4,n-1),fill:color});c.append(S('title',{},`Group ${group.label}; PKR ${fmt(v)}; ${n} responses`));g.append(c);}caution(p,values.length,'submitted judgments in Group '+group.label);
  });text(g,225,207,'Willingness to pay (PKR; shared linear scale)',{'text-anchor':'middle'});
  p.append(E('p','rz-a-note','Dots are observed prices (coincident responses share a dot). For n >= 5, boxes show interpolated 25th/75th percentiles, a median line and min-max whiskers. These show spread, not confidence intervals.'));
  const rows=groups.map(g=>{const values=g.people.map(p=>p.value);return ['Group '+g.label,values.length,fmt(avg(values)),fmt(quantile(values,.5)),g.people.filter(p=>p.binary==='Yes').length,g.people.filter(p=>p.binary==='No').length];});
  table(p,['Condition','Submitted n','Mean PKR','Median PKR','Yes','No'],rows,'Group values and comparison decisions');
  p.append(E('p','rz-a-note','A: price less than PKR 1,000? B: price more than PKR 80,000? Yes/No responses refer to different questions. No causal effect or personal trait is inferred.'));
 }
 function live(host,m,view){
  if(!host)return;
  const top=E('div','rz-a-dashboard rz-a-live');participation(top,m);const controls=E('div','rz-a-live-controls');
  const label=E('label','rz-a-control','Find participant '),search=E('input');search.type='search';search.placeholder='Search this classroom';search.value=view.search||'';label.append(search);
  const filterLabel=E('label','rz-a-control','Show '),filter=E('select');[['all','All participants'],['submitted','Submitted'],['working','Not yet submitted']].forEach(([v,t])=>{const o=E('option','',t);o.value=v;filter.append(o);});filter.value=view.filter||'all';filterLabel.append(filter);const result=E('span','rz-a-note');result.setAttribute('role','status');controls.append(label,filterLabel,result);top.append(controls);host.prepend(top);
  function apply(){view.search=search.value;view.filter=filter.value;const trs=[...host.querySelectorAll('table tbody tr')].filter(tr=>tr.querySelector('button'));
   let visible=0;for(const [i,tr]of trs.entries()){const submitted=m.statuses[i]==='submitted';const show=tr.textContent.toLowerCase().includes(search.value.trim().toLowerCase())&&(filter.value==='all'||(filter.value==='submitted'?submitted:!submitted));tr.hidden=!show;tr.classList.toggle('rz-a-filtered',!show);if(show)visible++;}result.textContent=visible+' of '+trs.length+' participant rows';
  }
  for(const [key,node]of [['search',search],['filter',filter]]){
   node.addEventListener('focus',()=>{view.liveFocus=key;});
   node.addEventListener('blur',()=>{if(node.isConnected&&view.liveFocus===key)view.liveFocus=null;});
  }
  search.addEventListener('input',()=>{view.selection=[search.selectionStart,search.selectionEnd];apply();});
  for(const event of ['select','keyup','mouseup'])search.addEventListener(event,()=>{view.selection=[search.selectionStart,search.selectionEnd];});
  filter.addEventListener('change',apply);apply();
  // Native refresh rebuilds this subtree. Restore only a removed active control,
  // never steal focus from another control or a different workspace.
  if(view.liveFocus&&document.activeElement===document.body&&host.getClientRects().length){
   const node=view.liveFocus==='search'?search:filter;node.focus({preventScroll:true});
   if(node===search&&view.selection)search.setSelectionRange(...view.selection);
  }
 }
 function upgrade(kind,host,studentHost,opts){
  if(!host||host.hidden)return;
  const m=model(kind,opts);m.statuses=(opts.rows||[]).map(r=>r.status);
  let view=state.get(host);if(!view||view.session!==opts.sessionId){view={session:opts.sessionId,dimension:'organization',search:'',filter:'all',details:false};state.set(host,view);}
  const original=[...host.children],header=original.shift(),support=E('details','rz-a-support');support.open=view.details;support.append(E('summary','','Detailed item analysis, original controls and teaching notes'));original.forEach(n=>support.append(n));support.addEventListener('toggle',()=>{view.details=support.open;});
  const dash=E('div','rz-a-dashboard');dash.dataset.analyticsVersion='1.0';dash.dataset.simulation=kind;
  participation(dash,m,true);
  if(kind==='hotel')hotel(dash,m);
  else{
   const priority=E('div','rz-a-grid rz-a-priority');const shift=panel(priority,'Learning shift','Paired learners only; descriptive, not causal.');pairedMeans(shift,m);
   pathways(panel(priority,'Learning Transfer','Four source-to-transfer response pathways.'),m);dash.append(priority);
   const deeper=E('div','rz-a-grid');transitions(deeper,m);histogram(deeper,m);dash.append(deeper);
   const distributions=E('div','rz-a-grid');scatter(distributions,m);choices(distributions,m);dash.append(distributions);groups(dash,m,view);
  }
  dash.append(E('p','rz-a-provenance','Source: current authorized session results. Refreshed by the existing Faculty controls and live synchronization; incomplete or unavailable records are not replaced with sample values.'));
  host.replaceChildren(header,dash,support);live(studentHost,m,view);
 }
 // Expand only our supporting sections during native printing, then restore.
 let printState=[];root.addEventListener('beforeprint',()=>{printState=[...document.querySelectorAll('.rz-a-support,.rz-a-data')].map(n=>[n,n.open]);for(const [n]of printState)n.open=true;});root.addEventListener('afterprint',()=>{for(const [n,open]of printState)n.open=open;printState=[];});
 return Object.freeze({version:'1.0',model,groupStats,quantile,upgrade});
});
