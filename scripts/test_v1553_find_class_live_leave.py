"""V15.5.3 Find a Class: only code entry + joined Live list, with safe exit.
Isolated Chromium, synthetic account; never calls production services or TinyFish.
"""
import threading,http.server,json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
import test_student_workspace_v8 as portal

ROOT=Path(__file__).resolve().parents[1]
checks=[]
def check(message,condition):
 assert condition,message
 checks.append(message)
 print('PASS '+message,flush=True)

def make_live(p):
 p.evaluate("""()=>{
  const f=__studentFixture,s=f.sessions.find(x=>x.session_id==='session-open');
  s.access_mode='live';s.live_open=true;s.practice_open=false;s.access_status='open';
  const a=f.attempts.find(x=>x.id==='attempt-0');
  a.classroom_access_type='live';a.progress_percent=46;
 }""")

def join_code(p):
 portal.nav(p,'player')
 p.locator('#classCodeInput').fill('test1234')
 p.locator('#findClassButton').click()
 p.wait_for_selector('#view-player.rz-c155-classroom #rzC155Classroom .rz-c155-start')
 p.wait_for_function("RizSimStudentBridge.snapshot().joined?.classroom_access_type==='live'")
 p.locator('[data-classroom-tab="join"]').click()
 p.wait_for_selector('#view-player:not(.rz-c155-classroom) #rzC156LiveList .rz-c156-item')

def run(browser,url):
 ctx,p,errors=portal.open_page(browser,url,'#home')
 try:
  make_live(p)
  portal.nav(p,'player')
  p.wait_for_selector('#rzC156LiveList .rz-c156-empty')
  left=p.locator('#view-player .player-layout>.player-entry')
  right=p.locator('#rzC156LiveList')
  code=p.locator('#classCodeInput')
  check('Find a Class maintains the original eight-character code input and Find Class action',
        code.get_attribute('maxlength')=='8'
        and code.get_attribute('placeholder')=='XXXXXXXX'
        and p.locator('#findClassButton').is_visible())
  check('Find a Class contains precisely two displayed panels',
        left.is_visible() and right.is_visible()
        and not p.locator('#resolvedSessionCard').is_visible())
  check('No redundant heading or published materials outside those two cards',
        not p.locator('#view-player>.content-shell>.student-heading').is_visible()
        and not p.locator('#rzStudentPlayerMaterials').is_visible())
  w1=left.bounding_box()['width'];w2=right.bounding_box()['width']
  check('Code box and running Live card occupy equal widths',abs(w1-w2)<3)
  check('No Live join shows an empty-list hint, not a fake active session',
        right.locator('.rz-c156-empty').is_visible()
        and right.locator('.rz-c156-leave').count()==0)
  check('Distinct Find a class and Classroom tabs remain available',
        p.locator('[data-classroom-tab]').count()==2)

  join_code(p)
  check('Joined Live session is a single compact entry under the right card',
        p.locator('#rzC156LiveList .rz-c156-item').count()==1
        and 'Decision Lab' in p.locator('#rzC156LiveList').inner_text())
  check('Running session has animated red Live dot and descriptive status',
        p.locator('#rzC156LiveList .rz-c155-dot').count()==1
        and 'Session Live' in p.locator('#rzC156LiveList').inner_text())
  button=p.locator('#rzC156LiveList .rz-c156-leave')
  check('Red dashed Leave action sits immediately below the title',
        button.is_visible()
        and button.evaluate('(e)=>getComputedStyle(e).borderTopStyle')=='dashed'
        and button.evaluate("(e)=>e.previousElementSibling?.classList.contains('rz-c156-item-top')") is True)
  check('Legacy institution/faculty/class-code detail rows never duplicate inside Find a Class',
        not p.locator('#resolvedSessionCard').is_visible()
        and 'Faculty' not in p.locator('#rzC156LiveList').inner_text())
  check('Switching back and forth does not recreate code entry or class list',
        p.locator('#classCodeInput').count()==1 and p.locator('#rzC156LiveList').count()==1)

  # Validate no live-progress destruction when leaving from Find a Class.
  saved=p.evaluate("""()=>{
   const f=__studentFixture;
   return {id:f.attempts[0].id,progress:f.attempts[0].progress_percent,mode:f.attempts[0].classroom_access_type};
  }""")
  button.click()
  p.wait_for_function("RizSimStudentBridge.snapshot().resolved===null")
  check('Leave Live Classroom returns to Find a Class with blank code',
        p.locator('#view-player:not(.rz-c155-classroom)').is_visible()
        and code.input_value()=='' and p.locator('#rzC156LiveList .rz-c156-empty').is_visible())
  check('Leaving hides access to Classroom subtab until the learner rejoins',
        p.locator('[data-classroom-tab=classroom]').is_disabled())
  check('Leaving never revokes or edits the saved learning attempt',
        p.evaluate('(()=>{const a=__studentFixture.attempts[0];return a.id==="attempt-0"&&a.progress_percent===46&&a.classroom_access_type==="live"})()'))
  check('Leaving does not invoke a destructive Supabase RPC',
        not p.evaluate('__studentFixture.calls.some(c=>/leave|delete|revoke/i.test(c.name||""))'))
  check('No duplicate resource information or join action after exit',
        not p.locator('#resolvedSessionCard').is_visible()
        and p.locator('#findClassButton').count()==1)
  check('Find a Class browser has no JS exceptions',not errors)
 finally:
  if sys.exc_info()[0]:p.screenshot(path=str(ROOT/'test-results/v1553-desktop.png'),full_page=True)
  ctx.close()

 # QR/Link must land on Classroom, with Leave Live Classroom in its heading.
 ctx,p,errors=portal.open_page(browser,url,'?session=share-open#player')
 try:
  # Fixture's session-open is Practice by default; live QR navigation should
  # still display the new Leave action only for a truly LIVE joined attempt.
  check('QR-based joined Practice cannot accidentally leave a Live session',
        p.locator('#rzC155Classroom .rz-c156-leave').count()==0)
  check('Practice classroom retains its simulation Start control',
        p.locator('#rzC155Classroom .rz-c155-start').count()==1)
 finally:ctx.close()

 ctx,p,errors=portal.open_page(browser,url,'#home')
 try:
  make_live(p)
  join_code(p)
  p.locator('[data-classroom-tab=classroom]').click()
  p.wait_for_selector('#view-player.rz-c155-classroom #rzC155Classroom .rz-c156-leave')
  check('Classroom tab has same red dashed Leave Live Classroom button',
        p.locator('#rzC155Classroom .rz-c156-leave-classroom').count()==1
        and p.locator('#rzC155Classroom .rz-c156-leave').evaluate('(e)=>getComputedStyle(e).borderTopStyle')=='dashed')
  check('Classroom retains full simulation and resources panels',
        p.locator('#rzC155Classroom .rz-c155-panel').count()==2)
  # An actual running simulation stays open and no additional tab is opened
  # or replaced when the Student leaves the website's Classroom.
  p.locator('#rzC155Classroom .rz-c155-start').click()
  p.wait_for_selector('.rz-c155-erp[open]')
  p.locator('.rz-c155-erp input[type=text]').fill('ERP-256')
  with ctx.expect_page() as opened:
   p.locator('.rz-c155-erp').get_by_role('button',name='Continue').click()
  child=opened.value
  child.wait_for_url('**/simulation-test.html?*')
  child_url=child.url
  p.locator('#rzC155Classroom .rz-c156-leave').click()
  p.wait_for_function("RizSimStudentBridge.snapshot().resolved===null")
  check('Classroom Leave action returns to two-card Find a Class view',
        p.locator('#view-player:not(.rz-c155-classroom)').is_visible()
        and p.locator('#rzC156LiveList .rz-c156-empty').is_visible())
  check('Leave does not close or navigate the already running simulation tab',
        not child.is_closed() and child.url==child_url and len(ctx.pages)==2)
  check('Leave never submits or deletes the underlying learning attempt',
        p.evaluate('(()=>{const a=__studentFixture.attempts.find(x=>x.id==="attempt-0");return a&&a.progress_percent===46&&a.status==="in_progress"})()'))
  check('Classroom exit reveals original code box, ready to rejoin',
        p.locator('#classCodeInput').is_visible() and p.locator('#classCodeInput').input_value()=='')
  check('No browser errors after leaving with a runner tab still open',not errors)
  child.close()
 finally:
  if sys.exc_info()[0]:p.screenshot(path=str(ROOT/'test-results/v1553-classroom.png'),full_page=True)
  ctx.close()

 # Test invitation URL is removed (and does not silently rejoin on refresh).
 # Production link query is handled by core existing resolution flow; emulate
 # a direct invitation by inserting the query into history after joining.
 ctx,p,errors=portal.open_page(browser,url,'#home')
 try:
  make_live(p);join_code(p)
  p.evaluate("history.replaceState(null,'',location.pathname+'?session=share-open#player')")
  p.locator('#rzC156LiveList .rz-c156-leave').click()
  check('Leave removes original class URL query without removing Player hash',
        p.evaluate('location.search==="" && location.hash==="#player"'))
  p.reload(wait_until='networkidle')
  p.wait_for_selector('#studentApp.show')
  check('Refresh after leaving does not automatically rejoin the old invitation',
        p.evaluate('RizSimStudentBridge.snapshot().resolved===null')
        and not p.locator('#view-player.rz-c155-classroom').count())
 finally:ctx.close()

 # Narrow phone viewport: cards stack and Leave remains usable.
 ctx,p,errors=portal.open_page(browser,url,'#home',True)
 try:
  make_live(p)
  join_code(p)
  check('Mobile Find a Class cards stack in one column',
        p.locator('#rzC156LiveList').bounding_box()['y']>
        p.locator('#view-player .player-layout>.player-entry').bounding_box()['y'])
  check('Mobile view remains within viewport with red Leave action',
        p.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
        and p.locator('#rzC156LiveList .rz-c156-leave').is_visible())
  p.locator('#rzC156LiveList .rz-c156-leave').click()
  p.wait_for_selector('#rzC156LiveList .rz-c156-empty')
  check('Mobile Leave restores Find a Class without errors',not errors)
 finally:ctx.close()

if __name__=='__main__':
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),portal.Handler)
 threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  with sync_playwright() as pw:
   browser=pw.chromium.launch(headless=True)
   try:run(browser,'http://127.0.0.1:'+str(server.server_port))
   finally:browser.close()
  print('PASS',len(checks),'V15.5.3 Find a Class checks, synthetic Chromium only',flush=True)
 finally:server.shutdown()
