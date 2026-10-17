"""V10 authenticated visual/focus smoke with isolated browser fixtures only."""
import http.server,threading,json
from playwright.sync_api import sync_playwright
import test_live_classroom_v5 as faculty
import test_student_workspace_v8 as student

def run(browser,base):
 ctx,p,errors=faculty.page_for(browser,base,'course_lead')
 try:
  assert p.locator('#view-home.active').count()==0
  css=p.locator('#view-classroom').evaluate('e=>({bg:getComputedStyle(e).backgroundImage,font:getComputedStyle(e).fontFamily,color:getComputedStyle(e).color})')
  faculty.check('Faculty non-Home has subtle textured surface',css['bg'].count('gradient')>=2)
  faculty.check('Faculty uses premium readable font',('Aptos' in css['font'] or 'Segoe UI' in css['font']))
  faculty.check('Faculty non-Home ink is legible',bool(css['color']))
  p.locator('#mainNav [data-auth-view=home]').click();p.wait_for_selector('#view-home.active')
  home=p.locator('#view-home').evaluate('e=>getComputedStyle(e).backgroundImage')
  faculty.check('Faculty shared Home is not painted with V10 texture','31px' not in home)
  p.locator('#mainNav [data-auth-view=classroom]').click();p.wait_for_selector('#view-classroom.active')
  faculty.check('Faculty page has no uncaught errors',not errors)
 finally:faculty.close(ctx)
 ctx,p,errors=student.open_page(browser,base)
 try:
  student.nav(p,'resources')
  css=p.locator('#view-resources').evaluate('e=>({bg:getComputedStyle(e).backgroundImage,font:getComputedStyle(e).fontFamily})')
  faculty.check('Student non-Home has subtle textured surface',css['bg'].count('gradient')>=2)
  faculty.check('Student font is premium and readable',('Aptos' in css['font'] or 'Segoe UI' in css['font']))
  student.nav(p,'home')
  h=p.locator('#view-home').evaluate('e=>getComputedStyle(e).backgroundImage')
  faculty.check('Student shared Home is untouched by new texture','31px' not in h)
  faculty.check('Student shell has no uncaught errors',not errors)
 finally:ctx.close()
 return len(faculty.checks)

if __name__=='__main__':
 srv=http.server.ThreadingHTTPServer(('127.0.0.1',0),faculty.Handler)
 threading.Thread(target=srv.serve_forever,daemon=True).start()
 try:
  with sync_playwright() as p:
   browser=p.chromium.launch(headless=True)
   try:run(browser,'http://127.0.0.1:'+str(srv.server_port))
   finally:browser.close()
  (faculty.OUT/'v10-visual-summary.json').write_text(json.dumps({'checks':faculty.checks,'result':'PASS','backend':'isolated'}))
 finally:srv.shutdown()
