/* RizSim Owner Analytics: presentation only; Cloudflare access is server-authorized. */
(()=>{'use strict';
const ROOT='rzOwnerWebAnalytics',TZ='Asia/Karachi';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let epoch=0,busy=false,lastFetch=0,loaded=false,currentRole=null,requestUser=null;
const number=v=>typeof v==='number'&&Number.isFinite(v)?new Intl.NumberFormat('en-PK').format(Math.max(0,Math.round(v))):'—';
function mount(){
 const view=$('view-account');
 if(!view||$(ROOT))return;
 const node=document.createElement('section');node.id=ROOT;node.hidden=true;node.setAttribute('aria-label','Owner website analytics');
 node.innerHTML='<div class="rz-wa-head"><div><span class="rz-wa-kicker">RIZSIM OWNER · WEB ANALYTICS</span><h2>Website Analytics</h2><p class="rz-wa-intro">Understand how your public website is being discovered, without collecting classroom or student activity.</p></div><div class="rz-wa-actions"><label class="sr-only" for="rzWaRange">Reporting period</label><select id="rzWaRange" aria-label="Reporting period"><option value="today">Today (PKT)</option><option value="7d">Last 7 days</option><option value="30d" selected>Last 30 days</option></select><button class="rz-wa-button" type="button" id="rzWaRefresh">Refresh</button></div></div><p class="rz-wa-status" id="rzWaStatus" role="status">Loading website analytics…</p><div id="rzWaResults" hidden><div class="rz-wa-grid"><div class="rz-wa-metric"><small>Today · visits</small><strong id="rzWaTodayVisits">—</strong></div><div class="rz-wa-metric"><small>Today · page views</small><strong id="rzWaTodayViews">—</strong></div><div class="rz-wa-metric"><small>Last 7 days · visits</small><strong id="rzWaWeekVisits">—</strong></div><div class="rz-wa-metric"><small>Last 30 days · visits</small><strong id="rzWaMonthVisits">—</strong></div></div><div class="rz-wa-details"><div class="rz-wa-card"><h3 id="rzWaTrendTitle">Public-site traffic</h3><svg id="rzWaTrend" viewBox="0 0 600 152" preserveAspectRatio="none" role="img" aria-label="Site page-view trend"></svg><div class="rz-wa-labels"><span id="rzWaFirst">—</span><span id="rzWaLast">—</span></div></div><div class="rz-wa-card"><h3>Most visited public pages</h3><ol class="rz-wa-pages" id="rzWaPages"></ol></div></div><p class="rz-wa-foot" id="rzWaFoot">Cloudflare browser-beacon analytics; counts can be sampled or delayed. Timezone: Pakistan (UTC+5). No authenticated Student/Faculty, material viewer or simulation-runner traffic.</p></div>';
 view.querySelector('.content-shell')?.appendChild(node);
 $('rzWaRange').addEventListener('change',()=>renderWindow());
 $('rzWaRefresh').addEventListener('click',()=>refresh(true));
}
let snapshot=null;
function status(message,state='loading'){const n=$('rzWaStatus');if(!n)return;n.textContent=message;n.dataset.state=state}
function setMetric(id,v){const n=$(id);if(n)n.textContent=number(v)}
function renderWindow(){
 if(!snapshot)return;
 const period=$('rzWaRange')?.value||'30d';
 const rows=Array.isArray(snapshot.daily)?snapshot.daily:[];
 const list=period==='today'?rows.slice(-1):period==='7d'?rows.slice(-7):rows;
 const vals=list.map(x=>Math.max(0,Number(x.pageViews)||0));
 const svg=$('rzWaTrend');svg.replaceChildren();
 const ns='http://www.w3.org/2000/svg';
 const add=(tag,attrs)=>{const el=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,String(v)));svg.appendChild(el)};
 for(const y of [25,76,127])add('line',{x1:5,y1:y,x2:595,y2:y,class:'rz-wa-gridline'});
 if(vals.length){const max=Math.max(1,...vals),points=vals.map((v,i)=>[vals.length===1?300:8+i*584/(vals.length-1),139-v/max*122]);add('polyline',{points:points.map(p=>p.join(',')).join(' '),class:'rz-wa-trendline'});}
 $('rzWaTrendTitle').textContent='Public-site page views · '+(period==='today'?'Today':period==='7d'?'last 7 days':'last 30 days');
 $('rzWaFirst').textContent=list[0]?.date||'—';$('rzWaLast').textContent=list[list.length-1]?.date||'—';
 const pageList=$('rzWaPages');pageList.replaceChildren();
 if(period==='today'){$('rzWaFoot').textContent='Top pages use the available 30-day reporting window. Today and the trend use Pakistan time (UTC+5). No private classroom pages are tracked.';}
 else $('rzWaFoot').textContent='Top pages use the available 30-day reporting window. Cloudflare browser-beacon analytics can be sampled or delayed. Pakistan time (UTC+5); public website only.';
 const pages=(snapshot.pages||[]).slice(0,6);
 if(!pages.length){const li=document.createElement('li');li.textContent='No tracked public pages yet.';pageList.append(li)}
 for(const p of pages){const li=document.createElement('li'),a=document.createElement('span'),b=document.createElement('strong');a.textContent=p.path;b.textContent=number(p.pageViews);li.append(a,b);pageList.append(li)}
}
function show(data){
 if(!data||data.configured!==true){$('rzWaResults').hidden=true;status('Connection not configured. Add a read-only Cloudflare Analytics API token to the Supabase Edge Function secrets; website visitor tracking continues independently.','error');return;}
 snapshot=data;
 setMetric('rzWaTodayVisits',data.totals?.today?.visits);
 setMetric('rzWaTodayViews',data.totals?.today?.pageViews);
 setMetric('rzWaWeekVisits',data.totals?.week?.visits);
 setMetric('rzWaMonthVisits',data.totals?.month?.visits);
 $('rzWaResults').hidden=false;renderWindow();
 status('Cloudflare data received · '+new Date(data.generatedAt||Date.now()).toLocaleString('en-PK',{timeZone:TZ})+' PKT','ready');
}
async function refresh(force=false){
 if(busy||!loaded||currentRole!=='owner'||!requestUser)return;
 if(!force && Date.now()-lastFetch<120000)return;
 const n=$('rzWaRefresh');busy=true;n.disabled=true;status('Checking securely with Cloudflare…');
 const request=++epoch,user=requestUser,client=window.rizsimSharedAuth;
 try{
  if(!client)throw Error('RizSim authentication is unavailable.');
  const auth=await client.auth.getUser();if(!auth.data?.user||auth.data.user.id!==user)throw Error('Your Owner session changed. Sign in again.');
  const token=(await client.auth.getSession()).data?.session?.access_token;
  if(!token)throw Error('Owner session expired. Sign in again.');
  const resp=await fetch('https://rvmumpvtvjvvuyimeybc.supabase.co/functions/v1/rizsim-owner-web-analytics',{method:'POST',headers:{Authorization:'Bearer '+token,apikey:'sb_publishable_wufSxfg90bb4R6XarScaJQ_Dl5wlmtf','Content-Type':'application/json'},body:'{}',cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});
  const data=await resp.json().catch(()=>({}));
  if(epoch!==request||!loaded||requestUser!==user||currentRole!=='owner')return;
  if(!resp.ok)throw Error(resp.status===403?'Owner access is required.':data.error||'Website analytics unavailable.');
  show(data);lastFetch=Date.now();
 }catch(e){if(epoch===request&&currentRole==='owner'){$('rzWaResults').hidden=true;status(e?.message||'Unable to retrieve website analytics.','error');}}
 finally{busy=false;if(n)n.disabled=false}
}
function setOwner(owner,user){
 mount();const node=$(ROOT);if(!node)return;
 const active=owner===true&&typeof user==='string'&&user.length>0;
 const changed=!active||requestUser!==user;
 loaded=active;currentRole=active?'owner':null;requestUser=active?user:null;node.hidden=!active;
 if(changed){epoch++;snapshot=null;lastFetch=0;$('rzWaResults').hidden=true;status(active?'Loading website analytics…':'Owner access required.');}
 if(active)refresh();
}
window.RizSimOwnerWebAnalytics=Object.freeze({setOwner,refresh});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
