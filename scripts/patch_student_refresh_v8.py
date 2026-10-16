"""Refresh joined-class changes immediately, including a queued in-flight response."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'rizsim-student-workspace.js';s=p.read_text()
def replace(old,new):
 global s
 assert s.count(old)==1,old
 s=s.replace(old,new,1)
replace("let ready=false, identity='', epoch=0, inFlight=null, data=null", "let refreshQueued=false;\n let ready=false, identity='', epoch=0, inFlight=null, data=null")
replace(" async function refresh(force=false){", " function attemptRevision(rows){return (rows||[]).map(a=>[a.id,a.status,progress(a.progress_percent),a.classroom_access_type||'',time(a.last_activity_at)||0,time(a.submitted_at)||0].join('|')).sort().join(';');}\n async function refresh(force=false){")
replace('if(inFlight)return inFlight;', 'if(inFlight){if(force)refreshQueued=true;return inFlight;}')
replace('finally{if(myEpoch===epoch){inFlight=null;render();}}', 'finally{if(myEpoch===epoch){inFlight=null;render();if(refreshQueued){refreshQueued=false;queueMicrotask(()=>refresh(true));}}}')
replace("function clear(){epoch++;identity='';", "function clear(){epoch++;refreshQueued=false;identity='';")
replace("window.addEventListener('rizsim:student-data',()=>{refresh();renderMaterials();});", "window.addEventListener('rizsim:student-data',()=>{const snap=bridge()?.snapshot();refresh(!data||attemptRevision(snap?.attempts)!==attemptRevision(data.attempts));renderMaterials();});")
p.write_text(s)
p=ROOT/'scripts/fixtures/student-workspace-backend.js';s=p.read_text()
old="const a=attempts.find(a=>a.classroom_session_id===s.session_id&&a.user_id===state.user?.id);if(!a)return err('Fixture join requires existing attempt');"
new="let a=attempts.find(a=>a.classroom_session_id===s.session_id&&a.user_id===state.user?.id);if(!a&&state.allowNewJoin&&state.user){a={id:'attempt-new',user_id:state.user.id,product_id:s.product_id,classroom_session_id:s.session_id,classroom_access_type:args.p_requested_access_type,status:'in_progress',progress_percent:0,started_at:stamp(0),last_activity_at:stamp(0),created_at:stamp(0),joined_at:stamp(0),submitted_at:null};attempts.push(a);}if(!a)return err('Fixture join requires existing attempt');"
assert s.count(old)==1;s=s.replace(old,new,1);p.write_text(s)
p=ROOT/'scripts/test_student_workspace_v8.py';s=p.read_text();marker="\nif __name__=='__main__':";assert s.count(marker)==1
extra='''
 ctx,p,errors=open_page(browser,base)
 try:
  p.evaluate("__studentFixture.allowNewJoin=true;__studentFixture.sessions.push({...__studentFixture.sessions[0],session_id:'session-new',class_code:'NEWP1234',class_name:'Freshly joined class'});__studentFixture.materials.push({...__studentFixture.materials[0],material_id:'material-new',course_id:'session-new',title:'New class handout'})")
  nav(p,'player');p.locator('#classCodeInput').fill('NEWP1234');p.locator('#findClassButton').click();p.wait_for_selector('[data-join-access=practice]')
  p.locator('[data-join-access=practice]').click();p.wait_for_selector('[data-launch-attempt]')
  p.locator('#rzStudentPlayerMaterials .rz-st-resource-card').filter(has_text='New class handout').wait_for(timeout=5000)
  check('First-time join immediately reveals its authorized class resources')
  nav(p,'practice');p.wait_for_selector('[data-practice-attempt="attempt-new"]',timeout=5000)
  check('First-time join immediately appears in Practice without manual refresh',not errors)
 finally:ctx.close()
'''
s=s.replace(marker,'\n'+extra+marker);p.write_text(s)
print('Immediate and queued refresh with first-time join regression checks applied.')
