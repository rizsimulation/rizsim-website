/* Structural gate for Design Code v1. No remote services or data access. */
const fs=require('fs'), cp=require('child_process'),assert=require('assert'),crypto=require('crypto');
const routes=['index.html','simulations.html','about.html','contact.html','access-in.html','access-out.html','course-material-viewer.html','resource-viewer.html','simulation-insight-to-implication.html','simulation-system-1-system-2.html','simulation-hotel-judgment.html'];
const read=p=>fs.readFileSync(p,'utf8');let n=0;const ok=(c,m)=>{assert(c,m);n++;console.log('PASS '+m)};
for(const p of routes){const s=read(p);ok(s.split('href="/rizsim-design-code.css"').length===2,p+' shared style once');ok(s.split('src="/rizsim-design-code.js"').length===2,p+' shared primitives once');ok(/data-rz-design-code="1.0"/.test(s),p+' opts into version 1');ok(!/(?<![\w.])(?:window\.)?(?:alert|confirm|prompt)\s*\(/.test(s),p+' no browser dialog primitives');}
const ui=read('rizsim-design-code.js'),css=read('rizsim-design-code.css');
ok(!/supabase\.|fetch\(|localStorage\.|sessionStorage\./.test(ui),'UI helper has no database/network/persistence side effects');
ok(!/window\.(alert|confirm|prompt)\s*=/.test(ui),'does not monkey-patch browser security UI');
ok(ui.includes('dialogQueue')&&ui.includes('previous.focus')&&ui.includes('inert'),'queued dialogs contain and restore focus');
ok(css.includes('prefers-reduced-motion')&&css.includes(':focus-visible'),'reduced motion and focus tokens');
ok(!/\bzoom\s*:|transform\s*:\s*scale\(/.test(css),'no CSS scaling to claim compactness');
ok(!/overflow(?:-x|-y)?\s*:\s*hidden/.test(css),'no new content-clipping compactness');
ok(!/\.(?:option|answer|choice|stimulus|correct|incorrect)\b/.test(css),'no assessment choice or stimulus restyling');
const faculty=read('access-out.html');ok(!/setTimeout\(\s*resolve,\s*650\s*\)/.test(faculty),'publishing has no artificial pause');ok(!/safePercent/.test(faculty),'publishing has real stage names not invented percentages');
for(const doc of ['RIZSIM_DESIGN_CODE.md','AGENTS.md','docs/design-code-v1-coverage.md'])ok(fs.existsSync(doc),doc+' is persistent');
ok(read('AGENTS.md').includes('RIZSIM_DESIGN_CODE.md'),'future development instructions link Design Code');
// Compare locked files to the exact main branch observed for this implementation.
const baseline=process.env.RIZSIM_DESIGN_BASE||'origin/main';
const locked=['google-g.svg','RizSim finalized logo.png','rizsim-r.png','rizsim-session-continuity.js','rizsim-course-authoring-service.js','rizsim-course-service.js','simulation-assets/insight-to-implication/questions.js','simulation-assets/insight-to-implication/engine.js','simulation-assets/insight-to-implication/participant.js','simulation-assets/insight-to-implication/rizsim-cloud.js','simulation-assets/system-1-system-2/cloud.js','simulation-assets/hotel-judgment/cloud.js'];
for(const p of locked){if(!fs.existsSync(p))continue;const old=cp.execFileSync('git',['show',baseline+':'+p]);ok(old.equals(fs.readFileSync(p)),p+' unchanged');}
const changed=cp.execFileSync('git',['diff','--name-only',baseline],{encoding:'utf8'}).split('\n');ok(!changed.some(x=>/^(migrations|supabase|edge-functions)\//.test(x)),'no backend migration/auth/function changes');
for(const p of ['access-in.html','access-out.html']){const s=read(p),old=cp.execFileSync('git',['show',baseline+':'+p],{encoding:'utf8'});const rpc=x=>[...x.matchAll(/\.rpc\(\s*["']([^"']+)/g)].map(m=>m[1]).sort();ok(JSON.stringify(rpc(s))===JSON.stringify(rpc(old)),p+' same RPC operations');ok((s.match(/src="google-g.svg"/g)||[]).length===(old.match(/src="google-g.svg"/g)||[]).length,p+' Google login asset references unchanged');}
console.log('Design Code v1 structural assertions: '+n);
