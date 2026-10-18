/* V15 no-credit static quality gate. Node.js only; no real accounts or browser credits. */
import fs from 'node:fs';
import vm from 'node:vm';
const js=[
 'rizsim-v15-live-control.js','rizsim-v15-runner-state.js','rizsim-v15-welcome.js',
 'rizsim-v15-portal.js','rizsim-v15-launch-countdowns.js','rizsim-v15-dashboards.js',
 'rizsim-live-classroom.js','rizsim-live-workspace.js','rizsim-student-workspace.js',
 'rizsim-course-environment.js'
];
let checks=0;
for(const path of js){
 const code=fs.readFileSync(path,'utf8');
 try{new vm.Script(code,{filename:path});checks++;}
 catch(e){console.error('Invalid JS:',path,e.message);process.exitCode=1;}
}
const pages=['access-in.html','access-out.html','contact.html',
 'simulation-insight-to-implication.html','simulation-system-1-system-2.html',
 'simulation-hotel-judgment.html'];
for(const path of pages){
 const html=fs.readFileSync(path,'utf8');
 for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  const attrs=match[1],body=match[2];
  if(/\bsrc\s*=/i.test(attrs)||/\btype\s*=\s*['"](?:module|application\/ld\+json|application\/json)/i.test(attrs)||!body.trim())continue;
  try{new vm.Script(body,{filename:path+'#inline'});checks++;}
  catch(e){console.error('Invalid inline JS:',path,e.message);process.exitCode=1;}
 }
}
const required={
 'access-in.html':['rizsim-v15-portal.js','rizsim-v15-welcome.js','rizsim-v15-launch-countdowns.js'],
 'access-out.html':['rizsim-v15-live-control.js','rizsim-v15-dashboards.js','rizsim-v15-launch-countdowns.js'],
 'simulation-insight-to-implication.html':['rizsim-v15-runner-state.js','rizsim-v15-welcome.js'],
 'simulation-system-1-system-2.html':['rizsim-v15-runner-state.js','rizsim-v15-welcome.js'],
 'simulation-hotel-judgment.html':['rizsim-v15-runner-state.js','rizsim-v15-welcome.js']
};
for(const [path,refs] of Object.entries(required)){
 const html=fs.readFileSync(path,'utf8');
 for(const ref of refs){if(!html.includes(ref)||!fs.existsSync(ref)){console.error('Missing local page asset',path,ref);process.exitCode=1;}else checks++;}
}
const clock=fs.readFileSync('rizsim-v15-launch-countdowns.js','utf8');
for(const date of ['2026-10-19T06:00:00+05:00','2026-10-23T06:00:00+05:00','2026-10-25T06:00:00+05:00']){
 if(!clock.includes(date)){console.error('Launch deadline missing',date);process.exitCode=1;}else checks++;
}
const sql=fs.readFileSync('migrations/20261018_rizsim_v15_presenter_control.sql','utf8');
for(const key of ['rizsim_v15_one_live_session','set_rizsim_presenter_paused','get_rizsim_presenter_state','rizsim_v15_pause_responses']){
 if(!sql.includes(key)){console.error('Essential backend requirement missing',key);process.exitCode=1;}else checks++;
}
const v151=fs.readFileSync('migrations/20261018_rizsim_v15_1_course_lead_session_guard.sql','utf8');
for(const key of ["s.access_mode in ('live','practice','both')","before insert or update of","pg_advisory_xact_lock"]){
 if(!v151.includes(key)){console.error('V15.1 concurrent-session safeguard absent:',key);process.exitCode=1;}else checks++;
}
const controller=fs.readFileSync('rizsim-v15-live-control.js','utf8');
for(const key of ['activeRoom:managedRoom','rz-v151-legacy-access-source']){
 if(!controller.includes(key)){console.error('Missing V15.1 classroom correction:',key);process.exitCode=1;}else checks++;
}
const clockFix=fs.readFileSync('rizsim-v15-launch-countdowns.js','utf8');
if(!clockFix.includes('new MutationObserver')||!clockFix.includes('rizsim-v15-launch-countdowns')){
 // The observer is mandatory; retain the fixed PKT launch dates separately.
 if(!clockFix.includes('new MutationObserver')){console.error('Delayed Library mounting not protected');process.exitCode=1;}
}
checks++;
const dashboard=fs.readFileSync('rizsim-v15-dashboards.js','utf8');
if(!dashboard.includes('presenterProgress')||!dashboard.includes('data')||!dashboard.includes('rz-v15-compact-table')){
 console.error('Verified responsive dashboard layer missing');process.exitCode=1;
}else checks++;
console.log('V15 static checks:',checks,process.exitCode?'FAILED':'PASSED');
if(process.exitCode)process.exit(1);
