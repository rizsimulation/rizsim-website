/* V9: static implementation and security-boundary checks; no Supabase calls. */
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const student=fs.readFileSync('rizsim-student-workspace.js','utf8'),
  css=fs.readFileSync('rizsim-student-workspace.css','utf8'),
  access=fs.readFileSync('access-in.html','utf8'),
  runner=fs.readFileSync('simulation-test.html','utf8');
assert(student.includes('showPracticeLaunchDialog(a)'),'V15.4 confirms identity on RizSim website before opening Practice in a new tab');
assert(student.includes('RizSimV154Join?.reserve'),'Practice must reserve tab during the Student gesture');
assert(student.includes('joinPracticeCode(practiceCode)')&&student.includes('rz-v15-practice-join'),'The Practice class code field persists');
assert(student.includes('await bridge().launchPractice(id,runnerTab)'),'Launch must target the reserved Practice tab');
assert(!student.includes('await bridge().openAttempt(fresh)'));
assert(student.includes('if(!current||phase(current)!==\'open\')'));
assert(student.includes('await bridge().practice(id)'));
assert(student.includes('const feedback=el(\'p\',\'rz-st-launch-feedback\')'));
assert(access.includes('async launchPractice(attemptId,reservedTab)'),'Server-verified Practice launch requires pre-reserved tab');
assert(access.includes('reservedTab.location.replace(destination.href)'),'Website must remain available while Practice runs');
assert(access.includes('check_my_rizsim_classroom_attempt_access'));
assert(access.includes("destination.searchParams.set('access','practice')"));
assert(css.includes('.rz-st-launch-dialog'));
assert(runner.includes('id="resultsPanel"'));
assert(runner.includes('id="submissionConfirmDialog"'));
assert(runner.includes("status:'submitted'"));
assert(runner.includes("async function submitSimulation()"));
assert(runner.includes("if(!submitted||submitted.status!=='submitted')"));
assert(runner.includes('renderSubmittedResults()'));
assert(runner.includes('reviewedResponses()'));
assert(runner.includes('shareableSummary()'));
assert(!runner.includes('window.confirm('));
assert(!runner.includes('service_role'));
assert(!student.includes('localStorage'));
for(const asset of [student,css])assert(!asset.includes('service_role'));
new vm.Script(student);
for(const [path,html] of [['access-in.html',access],['simulation-test.html',runner]]){
 const match=html.match(/<script type="module">([\s\S]*?)<\/script>/);
 assert(match,path+' has a module script');
 const source=match[1].replace(/import\s*\{[\s\S]*?\}\s*from\s*"https:[^;]+;/,'');
 new vm.Script(source,{filename:path});
}
console.log('PASS V9/V15 static: persistent Practice codes, direct server-checked launch, submission switch and sharing');
