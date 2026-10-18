"""V15 synthetic integration: real portal, isolated fixture, no user data or live writes."""
from __future__ import annotations
import http.server, threading
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
MOCK=(ROOT/'scripts/fixtures/live-classroom-backend.js').read_text()
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def log_message(self,*a):pass
def test(browser,base,role='course_lead',mobile=False):
 ctx=browser.new_context(viewport={'width':390 if mobile else 1366,'height':844 if mobile else 900},
  is_mobile=mobile,has_touch=mobile,reduced_motion='reduce')
 ctx.add_init_script('window.__testRole='+repr(role)+';window.__scrollCalls=[];')
 def route(r):
  url=r.request.url
  if url=='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm':
   r.fulfill(content_type='text/javascript',body=MOCK)
  elif url.startswith(base+'/'):r.continue_()
  elif 'fonts.googleapis.com' in url:r.fulfill(content_type='text/css',body='')
  else:r.abort()
 ctx.route('**/*',route)
 p=ctx.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 try:
  p.goto(base+'/access-out.html#classroom',wait_until='networkidle')
  p.wait_for_selector('#authenticatedApp.show')
  p.wait_for_function('window.RizSimFacultyBridge?.getSnapshot()?.sessions?.length===2')
  p.evaluate("""async()=>{
   for(const s of window.__fixture.sessions){s.active=false;s.session_status='closed';}
   await RizSimFacultyBridge.runtime.refresh();
   RizSimLiveClassroom.draw();
   const api=window.rizsimSharedAuth,original=api.rpc.bind(api);
   window.__v15Paused=false;
   api.rpc=(name,args)=>{
     if(name==='get_rizsim_presenter_state')return Promise.resolve({error:null,data:[{session_id:args.p_session_id,presenter_paused:window.__v15Paused,live_open:true}]});
     if(name==='set_rizsim_presenter_paused'){
       window.__v15Paused=!!args.p_paused;
       return Promise.resolve({error:null,data:[{session_id:args.p_session_id,presenter_paused:window.__v15Paused}]});
     }
     return original(name,args);
   };
  }""")
  assert window_assert(p,'window.RizSimV15?.choose'),'V15 chooser missing'
  p.evaluate("RizSimV15.choose({mode:'simulation',selection:'sim-1'})")
  p.wait_for_selector('.rz-v15-choice[open]')
  assert p.locator('.rz-v15-choice-option').count()==2,'Two quick options required'
  p.locator('.rz-v15-choice-option.is-live').click()
  p.wait_for_selector('.rz-v15-manager-pane:visible',timeout=12000)
  assert p.locator('.rz-v15-manager-share .rz-v15-share-text').inner_text().startswith('QA'),'Verified code missing'
  assert p.locator('.rz-v15-manager-share .rz-v15-share-link').inner_text().startswith(base+'/access-in.html?session='),'Verified invitation link missing'
  p.wait_for_selector('.rz-v15-qr svg',timeout=10000)
  assert p.locator('.rz-v15-manager-actions .rz-v15-pause').is_visible(),'Pause control missing'
  p.locator('.rz-v15-pause').click()
  p.wait_for_function('window.__v15Paused===true')
  assert 'Resume' in p.locator('.rz-v15-pause').inner_text(),'Resume control missing'
  p.locator('.rz-v15-pause').click()
  p.wait_for_function('window.__v15Paused===false')
  p.locator('.rz-v15-minimize').click()
  assert p.locator('.rz-v15-pill').is_visible() and 'Manage Live Session' in p.locator('.rz-v15-pill').inner_text()
  p.locator('.rz-v15-pill').click()
  p.wait_for_selector('.rz-v15-manager-pane:visible')
  assert p.locator('.rz-v15-manager').bounding_box()['width']<=370
  assert p.locator('.rz-v15-choice').count()==0,'Modal must close after session creation'
  assert not errors,'Unexpected browser errors: '+str(errors)
  print('PASS V15 '+role+(' mobile' if mobile else ' desktop')+': chooser, verified QR/code/link, pause/resume, minimization, compact width',flush=True)
 finally:ctx.close()
def window_assert(page,expr):return page.evaluate('Boolean('+expr+')')
if __name__=='__main__':
 server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler)
 threading.Thread(target=server.serve_forever,daemon=True).start()
 try:
  with sync_playwright() as p:
   browser=p.chromium.launch(headless=True)
   try:
    base='http://127.0.0.1:'+str(server.server_port)
    test(browser,base,mobile=False)
    test(browser,base,mobile=True)
   finally:browser.close()
 finally:server.shutdown()
