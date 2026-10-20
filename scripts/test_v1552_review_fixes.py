"""V15.5.2 three reported UI regressions, tested with synthetic browser sessions.
Runs on isolated localhost with a stub Supabase client. Does not use any actual
learner accounts, read protected files, or consume TinyFish credits.
"""
import threading,http.server,json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
import test_student_workspace_v8 as base

ROOT=Path(__file__).resolve().parents[1]
checks=[]
def check(label,value):
 assert value,label
 checks.append(label)
 print('PASS '+label,flush=True)

def resource_classroom(browser,url):
 ctx,p,errors=base.open_page(browser,url,'#home')
 try:
  # Screenshot regression: one LIVE session belongs to a Course. Files are
  # published against the Course UUID rather than the Classroom UUID.
  p.evaluate("""async ()=>{
    const f=__studentFixture;
    f.courseAssignments['session-open']='course-42';
    f.materials=[];
    await RizSimStudentBridge.refreshResources();
    await RizSimStudentWorkspace.refresh(true);
  }""")
  base.go_classroom # keep an explicit Find Class click to exercise origin flow
  p.evaluate('RizSimStudentBridge.navigate("player")')
  p.locator('[data-classroom-tab="join"]').click()
  p.locator('#classCodeInput').fill('TEST1234')
  p.locator('#findClassButton').click()
  p.wait_for_selector('#view-player.rz-c155-classroom #rzC155Classroom .rz-c155-start')
  p.wait_for_selector('#rzC155Classroom .rz-c155-empty')
  check('No resources: initial premium empty-state icon and message remain visible',
    p.locator('#rzC155Classroom .rz-c155-empty-icon').count()==1
    and 'No resources shared yet' in p.locator('#rzC155Resources').inner_text())
  check('Legacy below-Classroom resource section is not visible',
    p.locator('#rzStudentPlayerMaterials').evaluate('(n)=>getComputedStyle(n).display==="none"'))

  p.evaluate("""async ()=>{
    const f=__studentFixture;
    f.materials.push(
      {material_id:'course-pdf-1',course_id:'course-42',
       title:'PSX IY',description:'Pedagogy in Action',source_type:'file',
       file_name:'PSX IY.pdf',mime_type:'application/pdf',sort_order:1},
      {material_id:'other-course',course_id:'course-99',
       title:'Unrelated class material',source_type:'file',
       file_name:'other.pdf',mime_type:'application/pdf'}
    );
    await RizSimStudentBridge.refreshResources();
  }""")
  p.wait_for_selector('#rzC155Resources .rz-c155-material')
  check('Presenter Course PDF replaces empty-state in RIGHT panel',
    'PSX IY' in p.locator('#rzC155Resources').inner_text()
    and p.locator('#rzC155Classroom .rz-c155-empty').count()==0)
  check('Correct Course material displays file name, description and Open action',
    'Pedagogy in Action' in p.locator('#rzC155Resources').inner_text()
    and p.locator('#rzC155Resources button').first.inner_text()=='Open')
  check('Unrelated Course resource is not visible in this Classroom',
    'Unrelated class material' not in p.locator('#rzC155Resources').inner_text()
    and p.locator('#rzC155Resources .rz-c155-material').count()==1)
  check('Published Course resource counted as new',
    p.evaluate('RizSimStudentClassroom.unread()')==1)
  check('No duplicated resource strip below the cards after publication',
    not p.locator('#rzStudentPlayerMaterials').is_visible())

  # A published resource can be opened by the same authorized material-view RPC.
  with ctx.expect_page() as result:
   p.locator('#rzC155Resources .rz-c155-material button').first.click()
  material=result.value
  material.wait_for_url('**/course-material-viewer.html?material=course-pdf-1')
  check('Open Course PDF uses authenticated RizSim viewer, not raw file URLs',
    'material=course-pdf-1' in material.url)
  material.close()

  p.evaluate("""async ()=>{
    __studentFixture.materials.push({
      material_id:'course-pdf-2',course_id:'course-42',title:'Presenter slides',
      file_name:'slides.pdf',source_type:'file',mime_type:'application/pdf',sort_order:2});
    await RizSimStudentBridge.refreshResources();
  }""")
  p.wait_for_selector('#rzC155Resources .rz-c155-material:nth-child(2)')
  check('Newly published Course resources update in-place in the compact list',
    'Presenter slides' in p.locator('#rzC155Resources').inner_text()
    and p.locator('#rzC155Resources .rz-c155-material').count()==2)

  # Create actual separate runner tab from the ERP-gated first-party click.
  p.locator('#rzC155Classroom .rz-c155-start').click()
  p.wait_for_selector('.rz-c155-erp[open]')
  p.locator('.rz-c155-erp input[type=text]').fill('ERP-CHECK-1')
  with ctx.expect_page() as child_info:
   p.locator('.rz-c155-erp').get_by_role('button',name='Continue').click()
  child=child_info.value
  child.wait_for_url('**/simulation-test.html?*')
  child.add_script_tag(url=url+'/rizsim-v154-runner-shell.js')
  child.wait_for_selector('button.rz-v155-resource-return')
  check('Runner has an accessible Class Resources button',
    child.get_by_role('button',name='Return to the original RizSim Classroom tab without closing this simulation').count()==1)

  p.evaluate('RizSimStudentBridge.navigate("practice")')
  p.wait_for_selector('#view-practice.active')
  child.get_by_role('button',name='Return to the original RizSim Classroom tab without closing this simulation').click()
  p.wait_for_selector('#view-player.rz-c155-classroom.active')
  check('Class Resources returns to the ORIGINAL Classroom tab',
    p.locator('#view-player.rz-c155-classroom.active').count()==1)
  check('Simulation tab stays open, preserving its URL and progress',
    not child.is_closed() and 'attempt=attempt-0' in child.url and len(ctx.pages)==2)
  check('Returning to Classroom acknowledges previously unread resources',
    p.evaluate('RizSimStudentClassroom.unread()')==0)

  # Browser security may remove opener. The existing Classroom still receives
  # the session-scoped request over BroadcastChannel; no new tab is ever opened.
  child.evaluate('window.opener=null')
  p.evaluate('RizSimStudentBridge.navigate("practice")')
  p.wait_for_selector('#view-practice.active')
  child.get_by_role('button',name='Return to the original RizSim Classroom tab without closing this simulation').click()
  p.wait_for_selector('#view-player.rz-c155-classroom.active')
  check('Null-opener fallback readies same Classroom through session channel',
    p.locator('#view-player.rz-c155-classroom.active').count()==1 and len(ctx.pages)==2)
  check('Fallback keeps simulation open and never creates a third tab',
    not child.is_closed() and len(ctx.pages)==2)
  child.close()
  check('No student browser uncaught exceptions',not errors)
 finally:
  if sys.exc_info()[0]: p.screenshot(path=str(ROOT/'test-results/v1552-classroom.png'),full_page=True)
  ctx.close()

def viewer_bottom(browser,url,path,toolbar_id,container_id):
 ctx=browser.new_context(viewport={'width':1100,'height':760})
 def intercept(route):
  if route.request.url.startswith(url+'/'):route.continue_()
  else:route.abort()
 ctx.route('**/*',intercept)
 page=ctx.new_page()
 try:
  page.goto(url+path,wait_until='domcontentloaded')
  page.locator(toolbar_id).wait_for(state='attached')
  page.evaluate("""({bar,doc})=>{
    document.querySelector(bar).hidden=false;
    const long=document.createElement('div');
    long.style.cssText='height:2500px;width:3px;flex:none;pointer-events:none';
    document.querySelector(doc).append(long);
  }""",{'bar':toolbar_id,'doc':container_id})
  page.evaluate('window.scrollTo(0,0)')
  position=page.locator(toolbar_id).evaluate('(x)=>getComputedStyle(x).position')
  y=page.locator(toolbar_id).bounding_box()['y']
  check(path+': bottom toolbar is not sticky or fixed',position=='static')
  check(path+': bottom toolbar remains below viewport during reading',y>760)
  page.locator(toolbar_id).scroll_into_view_if_needed()
  bbox=page.locator(toolbar_id).bounding_box()
  check(path+': bottom toolbar becomes visible after scrolling to end',
    bbox is not None and bbox['y']<760 and bbox['y']+bbox['height']>0)
 finally:ctx.close()

def run(browser,url):
 resource_classroom(browser,url)
 viewer_bottom(browser,url,'/course-material-viewer.html?material=00000000-0000-4000-8000-000000000000',
              '#bottomToolbar','#pageContainer')
 viewer_bottom(browser,url,'/resource-viewer.html?resource=00000000-0000-4000-8000-000000000000',
              '#viewerToolbarBottom','#documentShell')

if __name__=='__main__':
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),base.Handler)
 threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  with sync_playwright() as pw:
   browser=pw.chromium.launch(headless=True)
   try:run(browser,'http://127.0.0.1:'+str(server.server_port))
   finally:browser.close()
  print('PASS',len(checks),'V15.5.2 reported issues with synthetic Chromium',flush=True)
 finally:server.shutdown()
