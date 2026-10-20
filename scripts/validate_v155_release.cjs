/* V15.5: deterministic no-credits release gate for all five changes. */
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm'),{spawnSync}=require('node:child_process');
const read=p=>fs.readFileSync(p,'utf8');let checks=0;
function ok(message,condition){assert.ok(condition,message);checks++;console.log('PASS '+message)}
const page=read('access-in.html'),cls=read('rizsim-student-classroom-v155.js'),
      css=read('rizsim-student-classroom-v155.css'),student=read('rizsim-student-workspace.js'),
      runner=read('rizsim-v154-runner-shell.js'),insight=read('simulation-assets/insight-to-implication/participant.js'),
      sim02=read('simulation-assets/system-1-system-2/cloud.js'),sim03=read('simulation-hotel-judgment.html'),
      viewer=read('course-material-viewer.html'),protectedViewer=read('resource-viewer.html'),
      live=read('rizsim-live-classroom.js'),course=read('rizsim-course-environment.js'),
      migration=read('migrations/20261020_rizsim_student_erp_preferences.sql');
for(const [path,src] of [
 ['rizsim-student-classroom-v155.js',cls],['rizsim-student-workspace.js',student],
 ['rizsim-v154-runner-shell.js',runner],['simulation-assets/insight-to-implication/participant.js',insight],
 ['simulation-assets/system-1-system-2/cloud.js',sim02],['rizsim-live-classroom.js',live],
 ['rizsim-course-environment.js',course]]){
 new vm.Script(src,{filename:path});ok('JavaScript parses '+path,true);
}
for(const path of ['access-in.html','course-material-viewer.html','resource-viewer.html']){
 const html=read(path);
 for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  const attrs=m[1]||'',body=m[2]||'';if(!body.trim()||/\bsrc\s*=/i.test(attrs)||/\btype\s*=\s*['"](?:application\/json|application\/ld\+json)['"]/i.test(attrs))continue;
  const check=spawnSync(process.execPath,['--check','--input-type='+(/\btype\s*=\s*['"]module['"]/i.test(attrs)?'module':'commonjs')],{input:body,encoding:'utf8'});
  if(check.status!==0)throw Error('Inline script syntax '+path+' '+check.stderr.slice(0,1500));
  ok('Inline browser script parses '+path,true);
 }
}
ok('Single official RizSim runner logo',runner.includes('RizSim%20finalized%20logo.png')&&runner.includes('header.topbar>.brand')&&runner.includes('.hero .riz-logo-row'));
ok('No runner-created RizSim tab on resource click',runner.includes('original.RizSimStudentClassroom?.openResources')&&runner.includes('original.focus()')&&!runner.includes("window.open('','_blank')"));
ok('Class Resources unseen red count',runner.includes('rz-v155-count')&&runner.includes("resources-count")&&runner.includes("Class Resources"));
ok('Option selected before async fetch',insight.indexOf("b.classList.toggle('selected'")<insight.indexOf("queuedChoice=C.clone(next)"));
ok('Insight serializes persistence',insight.includes('choiceSave=choiceSave.catch(()=>{}).then(')&&insight.includes('await flushChoices()'));
ok('Hosted Insight Google profile auto-created',insight.includes("S.cloud.saveRecord(C.createRecord(display,'RizSim classroom'))"));
ok('Hosted Sim02 Google profile auto-created',sim02.includes("record=newRecord({name,organization:'RizSim classroom'"));
ok('Hosted hotel ERP duplicate hidden',sim03.includes('label[for="participant"]')&&sim03.includes('display:none!important'));
ok('QR & class code converge on a Classroom',page.includes('rizsim:classroom-resolved')&&page.includes("if(preferred && session.access_status==='open')await joinSession(preferred,false)"));
ok('Classroom card layout and accessible status',cls.includes('rz-c155-grid')&&cls.includes("statusText(room)")&&css.includes('grid-template-columns:repeat(2,minmax(0,1fr))'));
ok('No redundant Student Name and Institution join inputs',!page.includes('id="rzV154JoinName"')&&!student.includes('identityInstitution')&&!student.includes('identityName'));
ok('ERP is checked exclusively on launch',cls.includes('onStart')&&cls.includes('Do not ask again')&&page.includes('Confirm your ERP number in Classroom'));
ok('ERP only stored with remember consent',cls.includes('if(!stored && remember)await bridge().saveERP(erp,true)'));
ok('Private ERP via user-owned RLS and no URL',migration.includes('row level security')&&migration.includes('auth.uid()')&&!page.includes('destination.searchParams.set("erp"'));
ok('Origin tab stays connected',runner.includes('original.focus()')&&runner.includes("kind:'open-resources'")&&!page.includes('popup.opener=null'));
ok('Class materials scoped by session/course',cls.includes('window.RizSimStudentWorkspace?.classroomResources')&&student.includes('joined?.course_id')&&cls.includes("localStorage.setItem(seenStorage(info)"));
ok('Private resources fetch through existing bridge',cls.includes('bridge().material(m.material_id)')&&page.includes("get_rizsim_course_material_view_context"));
ok('Secure PDF touchpad pinch + natural wheel',viewer.includes("event.ctrlKey||event.metaKey")&&viewer.includes("passive:false")&&viewer.includes("pinchStart=distance(event.touches)"));
ok('Secure PDF top/bottom synced',viewer.includes('bottomZoomIn')&&viewer.includes('bottomPrevPage')&&viewer.includes('syncControls()'));
ok('Downloadable PDF preview enlarged',viewer.includes('height:calc(100dvh - 140px)')&&viewer.includes('min-height:700px'));
ok('Protected resource viewer bottom toolbar',protectedViewer.includes('bottomResourcePrevious')&&protectedViewer.includes('syncBottomResourceToolbar'));
ok('Faculty and Course Lead course selections show real status',live.includes('sessionStatus(s,route.mode,id)')&&course.includes('roomStatus=window.RizSimLiveClassroom?.sessionStatus'));
ok('Status derives from active server-confirmed sessions',live.includes('room.active===true')&&live.includes("access_mode")&&live.includes("lastCards")&&read('rizsim-live-classroom.css').includes('rz-session-state-dot'));
ok('Bottom toolbars stay below document until scroll end',viewer.includes('.bottom-toolbar{margin-top:-1px;border-radius:0 0 14px 14px;position:static')&&protectedViewer.includes('#viewerToolbarBottom{position:static'));
ok('No duplicated resource strip inside Classroom',css.includes('#view-player.rz-c155-classroom #rzStudentPlayerMaterials'));
ok('All five features avoid TinyFish and analytics identifiers',!cls.includes('tinyfish')&&!runner.includes('cloudflareinsights')&&!migration.includes('service_role'));
console.log('PASS: '+checks+' V15.5 syntax and release invariants.');
