'use strict';
/* Combined V13/Sim01/Sim02/Sim03 source contract; no production credentials. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('access-out.html'),v5=read('rizsim-live-classroom.js');
const workspace=read('rizsim-live-workspace.js'),css=read('rizsim-live-workspace.css');
const modules=[
 ['rizsim-insight-faculty.js','RizSimInsightFaculty','rzInsightStudentResults','rzInsightFacultyAnalytics','get_my_rizsim_insight_session_records'],
 ['rizsim-system-faculty.js','RizSimSystemFaculty','rizsimSystemStudentResults','rizsimSystemFacultyResults','get_my_rizsim_s1s2_session_records'],
 ['rizsim-hotel-faculty.js','RizSimHotelFaculty','rizsimHotelStudentResults','rizsimHotelFacultyResults','get_my_rizsim_hotel_session_records']
];
assert(html.includes('id="view-classroom"'));
assert(workspace.includes("students.append(rosterMount,tableMount,simStudents)"));
assert(workspace.includes("simStudents.id='rzV13SimulationStudentResults'"));
assert(workspace.includes("const anchor=$('rzLiveResultsAnchor')"));
assert(workspace.includes('rzV13InsightsContent'));
assert(v5.includes("window.RizSimLiveWorkspace?.draw(s,route)"));
assert(v5.includes("window.RizSimInsightFaculty?.draw(s,route)"));
assert(v5.includes("window.RizSimSystemFaculty?.draw(s,route)"));
assert(v5.includes("window.RizSimHotelFaculty?.draw(s,route)"));
assert(v5.includes("window.RizSimInsightFaculty?.draw(null,null)"));
assert(v5.includes("window.RizSimSystemFaculty?.draw(null,null)"));
assert(v5.includes("window.RizSimHotelFaculty?.draw(null,null)"));
assert(workspace.includes('specializedSession(s,r)'));
assert(css.includes('rz-v13-sim-specialized-roster'));
assert(html.includes('rizsim-live-workspace.js')&&html.includes('rizsim-live-workspace.css'));
assert(html.includes('rizsim-support.js')&&html.includes('rizsim-shared-about.js'));
assert(html.includes('rizsim-course-lead-upgrade.css'));
assert(v5.includes('function verifiedShare()'));
assert(workspace.includes('window.RizSimLiveClassroom?.verifiedShare?.()'));
assert(!/\.rpc\s*\(|\.from\s*\(|fetch\s*\(/.test(workspace),'V13 must not bypass authorization');
for(const [filename,api,student,insights,rpc] of modules){
 const js=read(filename);new vm.Script(js,{filename});
 assert(html.includes(filename),'Missing integrated module '+filename);
 assert(js.includes(api+'=Object.freeze'),'Module export '+api);
 assert(js.includes(student),'Student Results mount '+student);
 assert(js.includes(insights),'Class Insights mount '+insights);
 assert(js.includes('rzV13SimulationStudentResults'),'V13 individual results routing '+filename);
 assert(js.includes('rzLiveResultsAnchor'),'V13 class insights routing '+filename);
 assert(js.includes(rpc),'Verified session RPC '+filename);
 assert(js.includes('requestId++')||js.includes('requestToken++'),'Race isolation '+filename);
 assert(js.includes('studentHost.replaceChildren()'),'Clear former learner view on session change '+filename);
}
const sources=['simulation-insight-to-implication.html','simulation-system-1-system-2.html','simulation-hotel-judgment.html'];
for(const f of sources)assert(fs.existsSync(path.join(root,f)),'Missing Student runner '+f);
for(const f of ['sql/insight_faculty_session_v1.sql','sql/sim01_response_policy_hardening_v1.sql','sql/sim02_secure_results_v1.sql','sql/sim03_secure_hotel_experiment_v1.sql'])assert(fs.existsSync(path.join(root,f)),'Missing REVIEW-ONLY SQL '+f);
const hotel=read('simulation-assets/hotel-judgment/ORIGINAL_HOTEL_PHOTO_MANIFEST.json');
for(let i=1;i<=4;i++)assert(hotel.includes('hotel_view_'+i+'.png'),'Original source photo manifest absent '+i);
assert(!html.includes('LOCAL_SCORE_KEY'),'Private Sim02 scoring key must not be bundled into portal');
console.log('PASS combined V13 mounts, secure session RPC modules, academic asset presence, role/session cleanup and legacy core preservation');
