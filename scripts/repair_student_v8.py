"""Guard delayed actions against sign-out; no auth, permission or submission changes."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
p=ROOT/'access-in.html';s=p.read_text()
start=s.index('async function launchJoinedSimulation(){');end=s.index('/* ============================================================\n   NAVIGATION',start)
block=s[start:end]
needle='showLoading();'
assert block.count(needle)==1
block=block.replace(needle,'const launchUser=currentUser?.id;\nconst launchAttempt=joinedAttempt;\nconst launchGeneration=studentResolveGeneration;\nif(!launchUser)return;\nshowLoading();',1)
needle='hideLoading();'
assert block.count(needle)==1
block=block.replace(needle,needle+'\nif(currentUser?.id!==launchUser || joinedAttempt!==launchAttempt || studentResolveGeneration!==launchGeneration)return;',1)
s=s[:start]+block+s[end:];p.write_text(s)
p=ROOT/'rizsim-student-workspace.js';s=p.read_text()
s=s.replace('No activity is invented or marked complete automatically.', 'Review completed sessions or pick up where you left off.')
s=s.replace(" async function openMaterial(id){\n  const tab=", " async function openMaterial(id){\n  const materialUser=bridge()?.snapshot().userId,materialEpoch=epoch;if(!materialUser)return;\n  const tab=",1)
s=s.replace("const m=await bridge().material(id);let url;", "const m=await bridge().material(id);if(materialEpoch!==epoch||materialUser!==bridge()?.snapshot().userId){tab?.close();return;}let url;",1)
s=s.replace("}catch(e){tab?.close();dialog('Resource unavailable',e.message);await bridge().refresh();renderMaterials();}", "}catch(e){tab?.close();if(materialEpoch!==epoch||materialUser!==bridge()?.snapshot().userId)return;dialog('Resource unavailable',e.message);await bridge().refresh();renderMaterials();}",1)
p.write_text(s)
p=ROOT/'scripts/fixtures/student-workspace-backend.js';s=p.read_text()
needle="return ok([{allowed:s.access_status==='open',attempt_status:a.status,submitted_at:a.submitted_at}]);"
assert s.count(needle)==1
s=s.replace(needle,"const result=ok([{allowed:s.access_status==='open',attempt_status:a.status,submitted_at:a.submitted_at}]);if(state.delayAccess)await new Promise(r=>setTimeout(r,state.delayAccess));return result;")
needle="return ok(m?[m]:[]);"
assert s.count(needle)==1
s=s.replace(needle,"const result=ok(m?[m]:[]);if(state.delayMaterial)await new Promise(r=>setTimeout(r,state.delayMaterial));return result;")
p.write_text(s)
p=ROOT/'scripts/test_student_workspace_v8.py';s=p.read_text()
marker="\nif __name__=='__main__':"
assert marker in s
extra='''
 ctx,p,errors=open_page(browser,base,'?session=share-open#player')
 try:
  p.wait_for_selector('[data-join-access=practice]');p.locator('[data-join-access=practice]').click();p.wait_for_selector('[data-launch-attempt]')
  p.evaluate('__studentFixture.delayAccess=400')
  original=p.url;p.locator('[data-launch-attempt]').click();p.evaluate('__studentFixture.signOut()');p.wait_for_timeout(550)
  check('Delayed launch response cannot navigate after sign-out',p.url==original and p.locator('#studentApp.show').count()==0 and not errors)
 finally:ctx.close()
 ctx,p,errors=open_page(browser,base,'?session=share-open#player')
 try:
  p.wait_for_selector('[data-join-access=practice]');p.locator('[data-join-access=practice]').click();p.wait_for_selector('#rzStudentPlayerMaterials .rz-st-resource-card button')
  p.evaluate('__studentFixture.delayMaterial=400')
  with p.expect_popup() as popup:
   p.locator('#rzStudentPlayerMaterials .rz-st-resource-card button').click()
  child=popup.value;p.evaluate('__studentFixture.signOut()');p.wait_for_timeout(550)
  check('Delayed material response closes its blank window after sign-out',child.is_closed() and not errors)
 finally:ctx.close()
'''
s=s.replace(marker,'\n'+extra+marker);p.write_text(s)
print('Added captured-identity guards and two delayed-response regression cases.')
