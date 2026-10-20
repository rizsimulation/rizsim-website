"""Practice-code regression: authenticated synthetic Student and server-permitted mode transition.
No actual learner data, no production calls, and no TinyFish credits.
"""
import json,threading,sys,os,http.server
from pathlib import Path
from playwright.sync_api import sync_playwright
import test_student_workspace_v8 as student
ROOT=Path(__file__).resolve().parents[1]
checks=[]
def check(name,boolean):
 assert boolean,name
 checks.append(name)
 print('PASS '+name,flush=True)
def code_form(page,code):
 page.locator('.rz-v15-practice-join input').fill(code)
 page.locator('.rz-v15-practice-join button[type="submit"]').click()

def run(browser,base):
 # An authenticated student ALREADY has a Live attempt. Reusing the faculty
 # code for an open Practice window must retain the original attempt ID.
 ctx,p,errors=student.open_page(browser,base,'#practice')
 try:
  p.evaluate("""()=>{
   const f=__studentFixture;
   f.attempts.find(a=>a.id==='attempt-0').classroom_access_type='live';
  }""")
  check('Practice-code input is visible after Google authentication',
        p.locator('.rz-v15-practice-join input[aria-label="Faculty Practice class code"]').is_visible())
  code_form(p,'test1234')
  p.wait_for_selector('#view-player.rz-c155-classroom #rzC155Classroom .rz-c155-start',timeout=12000)
  s=p.evaluate("""()=>({
   attempts:__studentFixture.attempts.filter(a=>a.classroom_session_id==='session-open'),
   calls:__studentFixture.calls,
   joined:RizSimStudentBridge.snapshot().joined,
   resolved:RizSimStudentBridge.snapshot().resolved
  })""")
  check('Existing Live attempt transitions to Practice on server',s['attempts'][0]['classroom_access_type']=='practice' and s['joined']['classroom_access_type']=='practice')
  check('Same attempt retained: no duplicate student attempt',len(s['attempts'])==1 and s['joined']['attempt_id']=='attempt-0')
  check('Practice code triggers specific server-side resume verification',any(c.get('name')=='resume_my_rizsim_student_practice' and c.get('args',{}).get('p_attempt_id')=='attempt-0' for c in s['calls']))
  check('Validated Practice navigates to existing Classroom',s['resolved']['class_code']=='TEST1234' and p.locator('#view-player.rz-c155-classroom').is_visible())
  check('Learner identity is not requested a second time',p.locator('#rzV154JoinName,#rzV154JoinInstitution').count()==0)
  check('No unhandled browser exceptions during restored Practice',not errors)
 finally:ctx.close()

 # A closed Practice session is a valid code but must not join, navigate,
 # create an attempt or hide the reason from the learner.
 ctx,p,errors=student.open_page(browser,base,'#practice')
 try:
  p.evaluate("""()=>{
   const s=__studentFixture.sessions.find(x=>x.session_id==='session-open');
   s.active=false;s.access_status='closed';s.practice_open=false;
  }""")
  code_form(p,'TEST1234')
  p.wait_for_function("""()=>document.querySelector('.rz-v15-practice-message')?.textContent.includes('closed this classroom')""",timeout=7000)
  check('Closed Faculty Practice provides actionable explanation',p.locator('.rz-v15-practice-message').is_visible())
  check('Failed Practice stays in Practice tab with the typed code',p.locator('#view-practice.active').count()==1 and p.locator('.rz-v15-practice-join input').input_value()=='TEST1234')
  check('Closed code never calls join RPC',p.evaluate('!__studentFixture.calls.some(c=>c.name==="join_rizsim_classroom_session")'))
  check('No browser errors for closed Practice',not errors)
 finally:ctx.close()

 # The currently active Live-only class cannot be silently called Practice.
 ctx,p,errors=student.open_page(browser,base,'#practice')
 try:
  p.evaluate("""()=>{
   const s=__studentFixture.sessions.find(x=>x.session_id==='session-open');
   s.access_mode='live';s.practice_open=false;s.live_open=true;s.access_status='open';
  }""")
  code_form(p,'TEST1234')
  p.wait_for_function("""()=>document.querySelector('.rz-v15-practice-message')?.textContent.includes('Live-only')""",timeout=7000)
  check('Live-only code explains Faculty must enable Practice',p.locator('#view-practice.active').count()==1 and p.locator('.rz-v15-practice-message').is_visible())
  check('Live-only code not enrolled as Practice',p.evaluate('!__studentFixture.calls.some(c=>c.name==="join_rizsim_classroom_session")'))
 finally:ctx.close()

 # A revoked Practice window between resolution and resume cannot bypass the
 # established backend check or cause an undesired navigation.
 ctx,p,errors=student.open_page(browser,base,'#practice')
 try:
  p.evaluate("""()=>{
   const f=__studentFixture;
   f.attempts.find(a=>a.id==='attempt-0').classroom_access_type='live';
   f.failPractice=true;
  }""")
  code_form(p,'TEST1234')
  p.wait_for_function("""()=>document.querySelector('.rz-v15-practice-message')?.textContent.includes('revoked by Faculty')""",timeout=7000)
  check('Revoked Practice retains the learner on Practice with server error',p.locator('#view-practice.active').count()==1)
  check('Revoked attempt remains Live with its original ID',p.evaluate('(()=>{const a=__studentFixture.attempts.find(x=>x.id==="attempt-0");return a.classroom_access_type==="live"&&a.id==="attempt-0"})()'))
  check('Revoked Practice does not open a simulation or ERP panel',p.locator('.rz-c155-erp[open]').count()==0)
 finally:ctx.close()

 # Invalid/short codes must keep the field and never call a remote join.
 ctx,p,errors=student.open_page(browser,base,'#practice',mobile=True)
 try:
  code_form(p,'BAD')
  p.wait_for_function("""()=>document.querySelector('.rz-v15-practice-message')?.textContent.includes('8-character')""",timeout=7000)
  check('Incomplete code explained without losing the user input',p.locator('#view-practice.active').count()==1 and p.locator('.rz-v15-practice-join input').input_value()=='BAD')
  check('Incomplete code avoids unnecessary remote lookups',p.evaluate('!__studentFixture.calls.some(c=>c.name==="resolve_rizsim_classroom_access")'))
  check('Mobile Practice code area fits the screen',p.evaluate('document.documentElement.scrollWidth<=innerWidth+2'))
 finally:ctx.close()

 # The universal Class Code field must also recognize an existing Live attempt
 # when the server says only Practice is currently open.
 ctx,p,errors=student.open_page(browser,base,'#player')
 try:
  p.evaluate("""()=>{
   const f=__studentFixture;
   f.attempts.find(a=>a.id==='attempt-0').classroom_access_type='live';
   const s=f.sessions.find(x=>x.session_id==='session-open');
   s.live_open=false;s.practice_open=true;s.access_mode='practice';
  }""")
  p.locator('#classCodeInput').fill('TEST1234')
  p.locator('#findClassButton').click()
  p.wait_for_selector('#view-player.rz-c155-classroom #rzC155Classroom .rz-c155-start',timeout=12000)
  p.wait_for_function('RizSimStudentBridge.snapshot().joined?.classroom_access_type==="practice"')
  check('Player Class Code also supports existing Live-to-Practice continuation',p.evaluate('RizSimStudentBridge.snapshot().joined.attempt_id==="attempt-0"'))
  check('Player does not create duplicate attempts',p.evaluate('__studentFixture.attempts.filter(a=>a.classroom_session_id==="session-open").length===1'))
 finally:ctx.close()

if __name__=='__main__':
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),student.Handler)
 threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  with sync_playwright() as pw:
   b=pw.chromium.launch(headless=True)
   try:run(b,'http://127.0.0.1:'+str(server.server_port))
   finally:b.close()
  print('PASS',len(checks),'focused Practice-code checks, all synthetic',flush=True)
 finally:server.shutdown()
