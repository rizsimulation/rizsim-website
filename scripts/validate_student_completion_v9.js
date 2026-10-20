/* V9: static implementation and security-boundary checks; no Supabase calls. */
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const student=fs.readFileSync('rizsim-student-workspace.js','utf8'),
  css=fs.readFileSync('rizsim-student-workspace.css','utf8'),
  access=fs.readFileSync('access-in.html','utf8'),
  runner=fs.readFileSync('simulation-test.html','utf8');
// V15.5: Practice cards must return to the authenticated website Classroom.
 // The Classroom Start button exclusively owns the ERP consent + new-tab gesture.
const classroom=fs.readFileSync('rizsim-student-classroom-v155.js','utf8'),
 classroomCss=fs.readFileSync('rizsim-student-classroom-v155.css','utf8');
assert(student.includes('await bridge().openAttempt(a)'),'Practice cards enter the authorized Classroom, not a runner directly');
assert(student.includes('joinPracticeCode(practiceCode)')&&student.includes('rz-v15-practice-join'),'Practice class-code entry persists without extra identity inputs');
assert(!student.includes('identityInstitution'),'No repeated Practice organization entry');
assert(classroom.includes('Do not ask again'),'ERP consent is available on Classroom Start');
assert(classroom.includes("window.open('about:blank','_blank')"),'Only Classroom Start reserves the runner tab');
assert(classroom.includes('bridge().startClassroom()'),'Classroom completes server authorization before navigation');
assert(access.includes('check_my_rizsim_classroom_attempt_access'),'Existing server-side attempt authorization preserved');
assert(access.includes("destination.searchParams.set('access','practice')"),'Practice runner access mode is still explicit');
assert(classroomCss.includes('.rz-c155-erp'),'ERP confirmation has an accessible floating dialog');
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
console.log('PASS V9/V15.5 static: Classroom ERP consent, user-initiated separate-tab launch, authenticated submissions and sharing');
