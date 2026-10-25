/* Local accessible SVG/HTML charts; exact values remain in keyboard-openable tables. */
(function(root){'use strict';
const D=root.GreenwashingData,C=root.GreenwashingCore;
const colors=['#217e78','#7b66a6','#b27b22','#477ca2','#9a637b'];
const E=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;};
const pct=x=>x==null?'\u2014':(100*x).toFixed(1)+'%';
const num=x=>x==null?'\u2014':Number(x).toFixed(1);
function panel(title,sub){const n=E('section','rz-a-panel gw-panel');n.append(E('h3','',title));if(sub)n.append(E('p','rz-a-note',sub));return n;}
function stat(parent,label,value,foot){const n=E('div','rz-a-metric');n.append(E('span','rz-a-label',label),E('strong','',value),E('small','',foot));parent.append(n);}
function table(parent,head,rows,label='View exact chart data'){
 const d=E('details','rz-a-data');d.append(E('summary','',label));const wrap=E('div','rz-a-table-wrap');wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label',label);
 const t=E('table'),th=E('thead'),tr=E('tr');head.forEach(h=>{const n=E('th','',h);n.scope='col';tr.append(n);});th.append(tr);t.append(th);const body=E('tbody');rows.forEach(row=>{const tr=E('tr');row.forEach(v=>tr.append(E('td','',v)));body.append(tr);});t.append(body);wrap.append(t);d.append(wrap);parent.append(d);return d;
}
function empty(parent,text){parent.append(E('p','rz-a-empty',text));}
function svg(title,w,h){const ns='http://www.w3.org/2000/svg',s=document.createElementNS(ns,'svg');s.setAttribute('viewBox',`0 0 ${w} ${h}`);s.classList.add('rz-a-chart');s.setAttribute('role','img');s.setAttribute('aria-label',title);return s;}
function mark(s,type,attrs,text){const n=document.createElementNS('http://www.w3.org/2000/svg',type);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=text;s.append(n);return n;}
function grouped(parent,rows){
 if(!rows.some(r=>r.firstN)){empty(parent,'No completed responses are available for this analysis yet.');return;}
 const s=svg('First checked and final accuracy by lab stage. Percent scale from 0 to 100.',460,180),start=132,width=280;
 for(const tick of [0,25,50,75,100]){const x=start+width*tick/100;mark(s,'line',{x1:x,y1:12,x2:x,y2:137,stroke:'#dce5e7'});mark(s,'text',{x,y:154,'text-anchor':'middle','font-size':11,fill:'#50666f'},tick+'%');}
 rows.forEach((r,i)=>{const y=30+i*63;mark(s,'text',{x:0,y:y+13,'font-size':13,fill:'#263e48'},r.mode==='diagnosis'?'Diagnosis':'Transfer');mark(s,'text',{x:0,y:y+29,'font-size':11,fill:'#50666f'},'n = '+r.n+' item responses');
  if(r.initial!=null)mark(s,'rect',{x:start,y,width:width*r.initial,height:13,fill:colors[1],rx:2});
  if(r.final!=null)mark(s,'rect',{x:start,y:y+18,width:width*r.final,height:13,fill:colors[0],rx:2});
 });
 parent.append(s);const legend=E('div','gw-legend');[['First checked',colors[1]],['Final after feedback',colors[0]]].forEach(([label,color])=>{const span=E('span'),sw=E('i');sw.style.background=color;span.append(sw,document.createTextNode(label));legend.append(span);});parent.append(legend);
 table(parent,['Stage','Paired item responses','First checked','Final','Change (pp)'],rows.map(r=>[r.mode,r.n,pct(r.initial),pct(r.final),num(r.changePP)]));
}
function bars(parent,rows,label){
 if(!rows.some(r=>r.n)){empty(parent,'No recorded observations for this view.');return;}
 const list=E('div','rz-a-bars');rows.forEach((r,i)=>{const line=E('div'),caption=E('div','rz-a-bar-caption');caption.append(E('span','',r.label),E('strong','',pct(r.value)+' ('+r.correct+'/'+r.n+')'));line.append(caption);const track=E('div','rz-a-track');track.setAttribute('role','img');track.setAttribute('aria-label',r.label+': '+pct(r.value)+', '+r.correct+' of '+r.n);const fill=E('span');fill.style.width=(r.value==null?0:Math.max(0,Math.min(100,100*r.value)))+'%';fill.style.background=colors[i%3];track.append(fill);line.append(track);list.append(line);});const scale=E('div','rz-a-scale');scale.append(E('span','','0%'),E('span','','100%'));parent.append(list,scale);
 table(parent,[label||'Category','Correct','Observed','Accuracy'],rows.map(r=>[r.label,r.correct,r.n,pct(r.value)]));
}
function histogram(parent,values){
 if(!values.length){empty(parent,'Baseline scores appear after submitted records are available.');return;}
 const bins=Array(11).fill(0);values.forEach(v=>bins[v]++);const max=Math.max(1,...bins),s=svg('Baseline audit distribution. Horizontal axis 0 to 10 correct; vertical axis learner count.',470,214),x=40,w=390,y=165,h=140;
 for(let t=0;t<=4;t++){const val=Math.ceil(max*t/4);if(t&&val===Math.ceil(max*(t-1)/4))continue;const yy=y-h*val/max;mark(s,'line',{x1:x,y1:yy,x2:x+w,y2:yy,stroke:'#dce5e7'});mark(s,'text',{x:x-7,y:yy+4,'text-anchor':'end','font-size':11,fill:'#50666f'},val);}
 bins.forEach((n,i)=>{const xx=x+i*w/11;mark(s,'rect',{x:xx+1,y:y-h*n/max,width:w/11-2,height:h*n/max,fill:colors[2]});mark(s,'text',{x:xx+w/22,y:y+17,'text-anchor':'middle','font-size':11,fill:'#50666f'},i);if(n)mark(s,'text',{x:xx+w/22,y:y-h*n/max-4,'text-anchor':'middle','font-size':11,fill:'#263e48'},n);});
 mark(s,'text',{x:235,y:206,'text-anchor':'middle','font-size':12,fill:'#50666f'},'Audit correct answers / 10');parent.append(s);table(parent,['Correct / 10','Learners'],bins.map((n,i)=>[i,n]));
}
function scatter(parent,rows){
 if(!rows.length){empty(parent,'No matched first-attempt diagnosis and transfer scores yet.');return;}
 const s=svg('First-attempt diagnosis versus transfer. Both axes show 0 to 7 correct answers. Numbers identify overlapping learners.',470,240),x=50,y=195,w=350,h=165;
 for(let t=0;t<=7;t++){const xx=x+w*t/7,yy=y-h*t/7;mark(s,'line',{x1:xx,y1:y-h,x2:xx,y2:y,stroke:'#e3e9eb'});mark(s,'line',{x1:x,y1:yy,x2:x+w,y2:yy,stroke:'#e3e9eb'});mark(s,'text',{x:xx,y:y+17,'text-anchor':'middle','font-size':11,fill:'#50666f'},t);mark(s,'text',{x:x-9,y:yy+4,'text-anchor':'end','font-size':11,fill:'#50666f'},t);}
 const counts=new Map();rows.forEach(r=>{const k=r[0]+','+r[1];counts.set(k,(counts.get(k)||0)+1);});
 for(const [key,n]of counts){const [a,b]=key.split(',').map(Number),xx=x+w*a/7,yy=y-h*b/7;mark(s,'circle',{cx:xx,cy:yy,r:Math.min(17,5+Math.sqrt(n)*2.5),fill:colors[1],opacity:.8});if(n>1)mark(s,'text',{x:xx,y:yy+4,'text-anchor':'middle','font-size':11,fill:'#fff'},n);}
 mark(s,'text',{x:230,y:235,'text-anchor':'middle','font-size':12,fill:'#50666f'},'Diagnosis first correct / 7');mark(s,'text',{x:5,y:13,'font-size':12,fill:'#50666f'},'Transfer first correct / 7');parent.append(s);table(parent,['Diagnosis / 7','Transfer / 7','Learners'],[...counts].map(([k,n])=>[...k.split(','),n]));
}
function mastery(parent,observations,mode){
 const items=mode==='audit'?D.audit:D.lab,head=E('div','gw-mastery');
 items.forEach(i=>{const rows=observations.filter(r=>r.itemId===i.id),n=rows.length,correct=rows.filter(r=>mode==='audit'?r.correct:r.initialCorrect).length;const box=E('div','gw-mastery-item');box.append(E('strong','',i.id),E('span','',n?pct(correct/n):'\u2014'),E('small','',correct+'/'+n+' observed'));head.append(box);});parent.append(head);
 table(parent,['Item','Scenario','Correct first','Observed','Accuracy'],items.map(i=>{const rs=observations.filter(r=>r.itemId===i.id),a=rs.filter(r=>mode==='audit'?r.correct:r.initialCorrect).length;return [i.id,i.title,a,rs.length,pct(rs.length?a/rs.length:null)];}),'View scenario-level evidence');
}
function report(records,rosterCount=records.length){
 const root=E('div','rz-a-dashboard gw-dashboard');root.dataset.simulation='greenwashing';
 const allAudit=records.flatMap(r=>r.observations.audit),allLab=records.flatMap(r=>r.observations.lab),s=C.summarize({audit:allAudit,lab:allLab});
 const top=panel('Response overview');const stats=E('div','rz-a-stats');stat(stats,'Joined',rosterCount,'Current authorized session');stat(stats,'Analyzed',records.length,'Validated submitted responses');stat(stats,'Audit baseline',pct(s.auditAccuracy),s.auditCorrect+'/'+s.auditN+' item responses');stat(stats,'Corrections',s.initialErrors?pct(s.correctionRate):'\u2014',s.correctedErrors+'/'+s.initialErrors+' initial errors');top.append(stats);root.append(top);
 const priority=E('div','rz-a-grid gw-priority');const learning=panel('First attempt and revision','Diagnosis and transfer remain separate; final accuracy requires successful revision.');grouped(learning,s.modes);learning.append(E('p','rz-a-caution','Final lab accuracy reaches 100% by design. It is not an independent post-test or proof of lasting learning.'));
 const sins=panel('Baseline by Seven Sin','Accuracy before corrective feedback; denominators differ by category.');const categories=[...new Set(D.audit.map(i=>i.sin))];bars(sins,categories.map(label=>{const a=allAudit.filter(r=>r.sin===label),correct=a.filter(r=>r.correct).length;return {label,n:a.length,correct,value:a.length?correct/a.length:null};}),'Seven Sin');priority.append(learning,sins);root.append(priority);
 if(records.length>0&&records.length<5)root.append(E('p','rz-a-caution','Small sample: '+records.length+' submitted learner'+(records.length===1?'':'s')+'. Describe these responses; do not generalize or infer a causal effect.'));
 const deeper=E('div','rz-a-grid');const hist=panel('Baseline score distribution','Learners, not item responses. Same 10-question instrument.');histogram(hist,records.map(r=>r.observations.audit.filter(x=>x.correct).length));
 const sc=panel('Diagnosis and transfer, first attempts','Different tasks, not repeated pre/post items. Coincident learners are counted at the same coordinate.');scatter(sc,records.map(r=>['diagnosis','transfer'].map(m=>r.observations.lab.filter(x=>x.mode===m&&x.initialCorrect).length)));deeper.append(hist,sc);root.append(deeper);
 const detail=E('div','rz-a-grid'),audit=panel('Audit item accuracy','Each tile uses observed submitted responses only.'),lab=panel('Lab first-attempt accuracy','Use initial errors to choose debrief priorities. Final mastery is required for completion.');mastery(audit,allAudit,'audit');mastery(lab,allLab,'lab');detail.append(audit,lab);root.append(detail);
 const groups=panel('Class / section comparison','Recorded labels only, within this authorized session. No inferred organization or cross-session query.');
 const groupedRows=new Map();records.forEach(r=>{const label=r.student?.classSection?.trim()||'Class / section not recorded';if(!groupedRows.has(label))groupedRows.set(label,[]);groupedRows.get(label).push(r);});
 if(groupedRows.size<2)empty(groups,'At least two recorded class/section groups are needed for comparison.');else{
 const t=table(groups,['Class / section','Learners','Audit mean','Diagnosis first','Transfer first','Corrections','Caution'],[...groupedRows].map(([label,rr])=>{const z=C.summarize({audit:rr.flatMap(x=>x.observations.audit),lab:rr.flatMap(x=>x.observations.lab)});return [label,rr.length,pct(z.auditAccuracy),pct(z.modes[0].first),pct(z.modes[1].first),z.initialErrors?z.correctedErrors+'/'+z.initialErrors:'No initial errors',rr.length<5?'Small sample':'Descriptive only'];}),'Compare recorded groups');t.open=true;
 }root.append(groups);
 const values=records.map(r=>{const a=C.summarize(r.observations);return 100*(a.finalAccuracy-a.initialAccuracy);}).filter(Number.isFinite);
 const descriptive=panel('Within-session correction summary','Paired on the same lab items. No significance test: forced final mastery makes a causal learning claim inappropriate.');
 if(values.length){const sorted=values.slice().sort((a,b)=>a-b),n=values.length,mean=C.mean(values),median=n%2?sorted[(n-1)/2]:(sorted[n/2-1]+sorted[n/2])/2,sd=n>1?Math.sqrt(values.reduce((sum,v)=>sum+(v-mean)**2,0)/(n-1)):null;table(descriptive,['Matched learners','Mean change (pp)','Median change (pp)','Sample SD (pp)','Improved','Unchanged','Worsened'],[[n,num(mean),num(median),num(sd),values.filter(v=>v>0).length,values.filter(v=>v===0).length,values.filter(v=>v<0).length]]);}else empty(descriptive,'No matched submitted learner observations.');root.append(descriptive);
 return root;
}
function personal(record){const o=C.observations(record),s=C.summarize(o),root=E('div','rz-a-dashboard gw-personal');const top=panel('Your learning profile','The audit is your no-feedback baseline. The lab measures first attempts and revision within this session.');const k=E('div','rz-a-stats');stat(k,'Audit baseline',pct(s.auditAccuracy),s.auditCorrect+'/10 correct');stat(k,'Initial errors',s.initialErrors,'Across 14 lab challenges');stat(k,'Corrected',s.correctedErrors,'From first checked to final');stat(k,'Correction rate',s.initialErrors?pct(s.correctionRate):'Not needed',s.initialErrors?s.correctedErrors+'/'+s.initialErrors+' initial errors':'No initial errors');top.append(k);root.append(top);const grid=E('div','rz-a-grid'),a=panel('Diagnosis and transfer','First checked versus finalized response, on the same items.');grouped(a,s.modes);const b=panel('Audit by Seven Sin');bars(b,[...new Set(D.audit.map(i=>i.sin))].map(label=>{const rows=o.audit.filter(r=>r.sin===label),correct=rows.filter(r=>r.correct).length;return {label,correct,n:rows.length,value:correct/rows.length};}));grid.append(a,b);root.append(grid,E('p','rz-a-caution','Reaching the correct final answer is required to finish. These corrections do not establish durable learning.'));return root;}
root.GreenwashingViews=Object.freeze({E,panel,stat,table,empty,report,personal,pct,num});
})(window);
