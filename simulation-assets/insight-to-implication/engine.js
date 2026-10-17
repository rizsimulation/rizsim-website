/* RizSimulation Insight to Implication — shared stage, scoring and analysis utilities */
(function (root, make) {
  'use strict';
  const D = (typeof module !== 'undefined' && module.exports) ? require('./questions.js') : root.InsightData;
  const api = make(D);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.InsightCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function (D) {
  'use strict';
  const IDS=D.review.map(q=>q.id);
  const BY_ID=Object.fromEntries(D.review.map(q=>[q.id,q]));
  const LABEL={CC:'Correct / correct',IC:'Incorrect / correct',CI:'Correct / incorrect',II:'Incorrect / incorrect'};
  const ALLOWED=['A','B','C','D'];
  const asText=(v,max=250)=>String(v||'').trim().slice(0,max);
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const shuffle=(arr)=>{
    const a=[...arr];
    for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
    return a;
  };
  const uid=()=>{
    if(typeof crypto!=='undefined' && crypto.randomUUID)return crypto.randomUUID();
    return 'student-'+Math.random().toString(36).slice(2)+'-'+Date.now().toString(36);
  };
  const now=()=>new Date().toISOString();
  const safeOrder=x=>Array.isArray(x)&&x.length===IDS.length&&new Set(x).size===IDS.length&&x.every(id=>IDS.includes(id));
  function createRecord(name,organization){
    return {kind:'rizsimulation-insight-record',instrumentId:D.id,schemaVersion:1,id:uid(),
      profile:{name:asText(name,120),organization:asText(organization,120)},
      createdAt:now(),updatedAt:now(),revision:0,facultyGroup:'',
      order:{kr:shuffle(IDS),kg:shuffle(IDS)},
      picks:{kr:{},source:null,transfer:null,kg:{}},
      locks:{kr:false,source:false,bridge:false,transfer:false,feedback:false,kg:false},
      lockedAt:{kr:null,source:null,transfer:null,kg:null}
    };
  }
  function validRecord(r){
    if(!r||r.kind!=='rizsimulation-insight-record'||r.instrumentId!==D.id||r.schemaVersion!==1||typeof r.id!=='string'||!r.id||r.id.length>160) return false;
    if(!r.profile||!asText(r.profile.name,120)||!asText(r.profile.organization,120))return false;
    if(!r.order||!safeOrder(r.order.kr)||!safeOrder(r.order.kg))return false;
    if(!r.picks||!r.locks||!r.lockedAt)return false;
    if(typeof r.revision!=='number'||r.revision<0||!Number.isInteger(r.revision))return false;
    if(!['kr','source','bridge','transfer','feedback','kg'].every(k=>typeof r.locks[k]==='boolean'))return false;
    for(const phase of ['kr','kg']){
      if(!r.picks[phase]||typeof r.picks[phase]!=='object'||Array.isArray(r.picks[phase]))return false;
      if(Object.keys(r.picks[phase]).some(id=>!IDS.includes(id)||!ALLOWED.includes(r.picks[phase][id])))return false;
      if(r.locks[phase]&&IDS.some(id=>!ALLOWED.includes(r.picks[phase][id])))return false;
    }
    if(r.picks.source!==null&&!ALLOWED.includes(r.picks.source))return false;
    if(r.picks.transfer!==null&&!ALLOWED.includes(r.picks.transfer))return false;
    let l=r.locks;
    if(l.source&&!l.kr)return false;
    if(l.bridge&&!l.source)return false;
    if(l.transfer&&!l.bridge)return false;
    if(l.feedback&&!l.transfer)return false;
    if(l.kg&&!l.feedback)return false;
    if(l.source&&!ALLOWED.includes(r.picks.source))return false;
    if(l.transfer&&!ALLOWED.includes(r.picks.transfer))return false;
    if(l.kg&&!l.feedback)return false;
    if(r.profile.name.length>120||r.profile.organization.length>120)return false;
    return true;
  }
  function stage(r){if(!r||!r.locks)return 'join';const l=r.locks;
    if(!l.kr)return 'kr';if(!l.source)return 'source';if(!l.bridge)return 'bridge';
    if(!l.transfer)return 'transfer';if(!l.feedback)return 'feedback';if(!l.kg)return 'kg';return 'rga';
  }
  const countAnswered=(r,phase)=>r?IDS.filter(k=>ALLOWED.includes(r.picks[phase]?.[k])).length:0;
  const correct=(pick,item)=>pick===item.key;
  function score(r,phase){if(!r||!r.locks[phase])return null;return IDS.reduce((n,id)=>n+Number(correct(r.picks[phase][id],BY_ID[id])),0)}
  function ltFlags(r){if(!r||!r.locks.transfer)return null;
    const source=correct(r.picks.source,D.source),transfer=correct(r.picks.transfer,D.transfer);
    return {source,transfer,cluster:(source?'C':'I')+(transfer?'C':'I')};
  }
  function transitions(r){if(!r||!r.locks.kr||!r.locks.kg)return null;
    const o={stayedCorrect:0,becameCorrect:0,becameIncorrect:0,stillIncorrect:0};
    for(const id of IDS){let a=correct(r.picks.kr[id],BY_ID[id]),b=correct(r.picks.kg[id],BY_ID[id]);
      if(a&&b)o.stayedCorrect++;else if(!a&&b)o.becameCorrect++;else if(a&&!b)o.becameIncorrect++;else o.stillIncorrect++;
    }return o;
  }
  function rga(r){if(!r||!r.locks.kg)return null;
    const kr=score(r,'kr'),kg=score(r,'kg'),lt=ltFlags(r);
    return {kr,kg,change:kg-kr,changePP:(kg-kr)/6*100,transitions:transitions(r),lt};
  }
  function committed(r){if(!r)return 0;let l=r.locks;return (l.kr?6:0)+(l.source?1:0)+(l.transfer?1:0)+(l.kg?6:0)}
  function analyse(input){
    const records=(input||[]).filter(validRecord);
    const paired=records.filter(r=>r.locks.kg),lt=records.filter(r=>r.locks.transfer);
    const scores=paired.map(r=>rga(r));
    const avg=arr=>arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:null;
    const krAvg=avg(scores.map(x=>x.kr)),kgAvg=avg(scores.map(x=>x.kg));
    const transitionsTotal={stayedCorrect:0,becameCorrect:0,becameIncorrect:0,stillIncorrect:0};
    for(const s of scores)for(const k in transitionsTotal)transitionsTotal[k]+=s.transitions[k];
    const clusters={CC:0,IC:0,CI:0,II:0};
    for(const r of lt){let f=ltFlags(r);clusters[f.cluster]++;}
    const choices={source:{A:0,B:0,C:0,D:0},transfer:{A:0,B:0,C:0,D:0}};
    for(const r of records){if(r.locks.source)choices.source[r.picks.source]++;if(r.locks.transfer)choices.transfer[r.picks.transfer]++;}
    const items=IDS.map(id=>{
      const allKR=records.filter(r=>r.locks.kr),allKG=records.filter(r=>r.locks.kg);
      const pair=records.filter(r=>r.locks.kg);
      const krN=allKR.filter(r=>correct(r.picks.kr[id],BY_ID[id])).length;
      const kgN=allKG.filter(r=>correct(r.picks.kg[id],BY_ID[id])).length;
      const changed=pair.filter(r=>!correct(r.picks.kr[id],BY_ID[id])&&correct(r.picks.kg[id],BY_ID[id])).length;
      const regressed=pair.filter(r=>correct(r.picks.kr[id],BY_ID[id])&&!correct(r.picks.kg[id],BY_ID[id])).length;
      return {id,concept:BY_ID[id].concept,krCorrect:krN,krTotal:allKR.length,kgCorrect:kgN,kgTotal:allKG.length,becameCorrect:changed,becameIncorrect:regressed};
    });
    return {records,joined:records.length,krCompleted:records.filter(r=>r.locks.kr).length,
      sourceCompleted:records.filter(r=>r.locks.source).length,ltCompleted:lt.length,
      kgCompleted:paired.length,pairedN:paired.length,krAvg,kgAvg,
      changePP:krAvg==null?null:(kgAvg-krAvg)/6*100,
      transitions:transitionsTotal,clusters,choices,
      sourceCorrect:lt.filter(r=>ltFlags(r).source).length,
      transferCorrect:lt.filter(r=>ltFlags(r).transfer).length,
      items
    };
  }
  function removePrivate(r){const v=JSON.parse(JSON.stringify(r));delete v.token;return v;}
  function compareLocked(oldRecord,newRecord){
    if(!validRecord(oldRecord)||!validRecord(newRecord))return false;
    if(oldRecord.id!==newRecord.id||JSON.stringify(oldRecord.profile)!==JSON.stringify(newRecord.profile)||JSON.stringify(oldRecord.order)!==JSON.stringify(newRecord.order))return false;
    for(const k of ['kr','source','bridge','transfer','feedback','kg'])if(oldRecord.locks[k]&&!newRecord.locks[k])return false;
    for(const phase of ['kr','kg']){
      if(oldRecord.locks[phase]&&JSON.stringify(oldRecord.picks[phase])!==JSON.stringify(newRecord.picks[phase]))return false;
    }
    for(const phase of ['source','transfer'])if(oldRecord.locks[phase]&&oldRecord.picks[phase]!==newRecord.picks[phase])return false;
    if(newRecord.locks.kg&&!newRecord.locks.feedback)return false;
    return true;
  }
  function clone(r){return JSON.parse(JSON.stringify(r));}
  function pct(a,b,precision=1){return !b?'—':(a/b*100).toFixed(precision)+'%'}
  function num(n,precision=1){return n==null?'—':Number(n).toFixed(precision)}
  return {D,IDS,BY_ID,LABEL,esc,asText,shuffle,uid,now,createRecord,validRecord,stage,countAnswered,correct,score,ltFlags,transitions,rga,committed,analyse,removePrivate,compareLocked,clone,pct,num};
});