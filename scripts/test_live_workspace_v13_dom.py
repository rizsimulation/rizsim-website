"""Self-contained V13 DOM/browser contract without network or production accounts.
Also captures a clearly synthetic workspace layout for visual approval.
"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
HTML='''<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;background:#f4f8f6;margin:0;">
<div id="authenticatedApp" class="show"><section id="view-classroom" class="active"><div class="content-shell">
 <div class="rz-live-shell" style="max-width:1180px;margin:auto;padding:28px 12px">
  <div class="rz-live-heading"><h1>Live Classroom</h1></div><div id="rzLiveBreadcrumb">Live Classroom / Example session</div>
  <div id="rzLiveChoices"></div><div id="rzLiveCollection"></div>
  <div id="rzLiveSetup" hidden><h2>Session setup</h2><div id="rzLiveSetupMount">Existing Faculty controls</div></div>
  <div id="rzLiveRunning"><div class="rz-live-running-title"><h2>Example Class — Session</h2></div>
   <div id="rzLiveRunningMount"><div class="portal-panel" style="padding:18px;border:1px solid #dae7e2;border-radius:14px;background:white">
    <h3>Verified session controls</h3><p>Student class link and QR remain sourced from the existing session card.</p>
    <button type="button" id="sourceCounter">Demo source form — do not publish</button><input id="draftInput" placeholder="Demonstrate preserved input state"/></div></div>
   <div id="rzLiveResultsAnchor"></div></div>
  <div id="rzLiveResume"></div>
 </div></div></section></div></body></html>'''

def layout(page):
 page.set_content(HTML)
 page.add_style_tag(content=(ROOT/'rizsim-live-classroom.css').read_text())
 page.add_style_tag(content=(ROOT/'rizsim-live-workspace.css').read_text())
 # The real V5 module already owns signed-in data, codes and QR. Use a narrow
 # in-memory presentation fixture only for this DOM-level panel test.
 page.evaluate('''() => {
   window.RizSimLiveClassroom={draw(){},verifiedShare(){return null}};
 }''')
 page.add_script_tag(content=(ROOT/'rizsim-live-workspace.js').read_text())
 page.wait_for_function("!!window.RizSimLiveWorkspace")
 page.evaluate('''() => RizSimLiveWorkspace.draw({userId:'qa-owner',role:'faculty'},
   {mode:'simulation',stage:'running',session:'mock-session-1',selection:'mock-sim-1'})''')
 page.wait_for_selector('#rzLiveV13Workspace:not([hidden])')

def desktop(browser):
 page=browser.new_page(viewport={'width':1440,'height':980})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 layout(page)
 assert page.locator('#rzV13Tabstudio[aria-selected="true"]').is_visible()
 assert page.locator('#rzLiveRunningMount').is_visible()
 assert page.locator('#rzLiveRunning').evaluate('n=>!!n.closest("#rzV13StudioOverview")')
 assert page.locator('#rzLiveResultsAnchor').evaluate('n=>!!n.closest("#rzV13Paneinsights")')
 assert page.locator('#rzV13Tabstudents').is_enabled()
 assert page.locator('#rzV13Tabinsights').is_enabled()
 assert page.locator('#rzV13SidePanel').evaluate('(e)=>getComputedStyle(e).position')=='sticky'
 assert not page.locator('#rzLiveResultsAnchor').is_visible()
 page.locator('#draftInput').fill('Do not discard unsaved preparation')
 page.locator('#rzV13Tabstudents').click()
 assert page.locator('#rzV13Panestudents').is_visible()
 assert page.locator('#rzV13Paneinsights').is_hidden()
 page.keyboard.press('ArrowDown')
 assert page.locator('#rzV13Tabinsights[aria-selected=true]').count()==1
 page.locator('#rzV13Tabstudio').click()
 assert page.locator('#draftInput').input_value()=='Do not discard unsaved preparation'
 page.locator('#rzV13SubviewShare').click()
 assert page.locator('#rzV13StudioShare').is_visible()
 assert page.get_by_text('There is no active authorized join link',exact=False).count()==1
 assert page.locator('#rzV13ShareOpen').count()==0
 page.locator('#rzV13SubviewOverview').click()
 page.locator('#rzV13Collapse').click()
 assert page.locator('#rzLiveV13Workspace.rz-v13-collapsed').count()==1
 assert page.locator('#rzV13Collapse[aria-expanded=false]').count()==1
 assert page.locator('#rzV13Tabstudio').get_attribute('aria-label')=='Session Studio'
 page.screenshot(path=str(OUT/'v13-collapsed-desktop-synthetic.png'),full_page=True)
 page.locator('#rzV13Collapse').click()
 assert page.locator('#rzLiveV13Workspace.rz-v13-collapsed').count()==0
 page.screenshot(path=str(OUT/'v13-expanded-desktop-synthetic.png'),full_page=True)
 page.evaluate('''() => RizSimLiveWorkspace.draw({userId:'qa-owner',role:'faculty'},
   {mode:'simulation',stage:'setup',selection:'mock-sim-1'})''')
 assert page.locator('#rzV13Tabstudents').is_disabled()
 assert page.locator('#rzV13Tabinsights').is_disabled()
 assert page.locator('#rzV13SubviewShare').is_disabled()
 assert page.locator('#rzV13Tabstudio[aria-selected=true]').count()==1
 page.evaluate('''() => RizSimLiveWorkspace.draw({userId:'qa-owner',role:'student'},
   {mode:'simulation',stage:'running',selection:'mock-sim-1',session:'mock-session-1'})''')
 assert page.locator('#rzLiveV13Workspace').is_hidden()
 assert not errors,errors
 page.close()

def mobile(browser):
 page=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 layout(page)
 assert page.locator('#rzV13MobileToggle').is_visible()
 assert page.locator('#rzV13SidePanel').is_hidden()
 assert page.locator('#rzV13SidePanel').evaluate('(e)=>e.inert')
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+7'), 'viewport overflow'
 page.locator('#rzV13MobileToggle').click()
 assert page.locator('#rzV13MobileToggle[aria-expanded=true]').count()==1
 page.wait_for_selector('#rzV13Tabstudents:visible')
 assert page.locator('#rzV13Tabstudents').is_visible()
 assert page.locator('#rzV13Scrim').is_visible()
 page.locator('#rzV13Tabstudents').click()
 assert page.locator('#rzV13Panestudents').is_visible()
 page.locator('#rzV13SidePanel').wait_for(state='hidden')
 page.locator('#rzV13MobileToggle').click()
 page.keyboard.press('Escape')
 page.locator('#rzV13SidePanel').wait_for(state='hidden')
 assert page.locator('#rzV13MobileToggle').evaluate('(e)=>document.activeElement===e')
 page.screenshot(path=str(OUT/'v13-mobile-synthetic.png'),full_page=True)
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+7')
 assert not errors,errors
 page.close()

if __name__=='__main__':
 with sync_playwright() as p:
  opts={'headless':True}
  if os.environ.get('RIZSIM_CHROMIUM'):
   opts.update(executable_path=os.environ['RIZSIM_CHROMIUM'],args=['--no-sandbox','--no-proxy-server'])
  browser=p.chromium.launch(**opts)
  try:
   desktop(browser);mobile(browser)
   print('PASS V13 DOM desktop, keyboard, reduced layout, Student/Insights tabs, collapse, mobile drawer, preserved form state and unauthorized concealment')
  finally:browser.close()
