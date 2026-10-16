/* Static gates complement the real-browser suite; they do not prove live backend acceptance. */
const fs=require('node:fs'),assert=require('node:assert/strict'),cp=require('node:child_process');
const read=p=>fs.readFileSync(p,'utf8');
const html=read('access-out.html'),js=read('rizsim-live-classroom.js'),css=read('rizsim-live-classroom.css'),legacy=read('rizsim-faculty-workspaces.js');
for(const p of ['rizsim-live-classroom.js','rizsim-faculty-workspaces.js','rizsim-qr.js'])cp.execFileSync(process.execPath,['--check',p]);
for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){
 if(/\bsrc\s*=/.test(m[1])||!m[2].trim())continue;
 cp.execFileSync(process.execPath,['--check','--input-type='+(/type="module"/.test(m[1])?'module':'commonjs')],{input:m[2]});
}
for(const id of ['rzLiveChoices','rzLiveCollection','rzLiveSetup','rzLiveRunning','rzLiveResultsAnchor','classroomCreateForm','courseClassroomPanel','courseMaterialsPanel','responseModal'])assert(html.includes('id="'+id+'"'),id+' missing');
for(const mode of ['Run Simulation','Run My Own Course','Run Purchased Course'])assert(js.includes(mode),mode+' missing');
assert(!/window\.scrollTo\s*\(/.test(js),'Stage navigation must not scroll');
assert.equal((js.match(/scrollIntoView\(/g)||[]).length,1,'Only View Results may scroll');
const nav=html.slice(html.indexOf('function setViewImmediately('),html.indexOf('function navigateInternal('));
assert(!nav.includes('window.scrollTo'),'Legacy tab navigation must not scroll');
assert(js.includes('pushState')&&js.includes('popstate'),'History missing');
assert(!/supabase\.(rpc|from)|user_metadata|service_role/.test(js),'Presentation must not replace authorization');
assert(legacy.includes('if($("rzLiveChoices"))return'),'Legacy result mover must yield to V5');
assert(js.includes('courseRequest = requested')&&js.includes('courseRequest = null'),'Async course gate missing');
for(const token of ['.rz-library-hero','.rz-workspace-hero','.auth-section-heading','(hover:none)','(pointer:coarse)','prefers-reduced-motion',':focus-visible'])assert(css.includes(token),token+' missing');
for(const id of ['create_rizsim_classroom_session','create_rizsim_course_classroom_session','get_my_simulation_license_catalogue','get_visible_simulation_submissions','course-materials','RizSimFacultyBridge','RizSimSession.verifyUser'])assert(html.includes(id),'Lost original handler '+id);
assert(!html.includes('scripts/fixtures/'),'Test backend must never load in production');
assert(fs.existsSync('rizsim-qr.js'),'Local QR asset missing');
console.log('PASS V5 syntax, stage navigation, original integration points, security boundaries and accessibility structure');
