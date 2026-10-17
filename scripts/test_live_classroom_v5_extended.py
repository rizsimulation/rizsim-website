"""Additional V5 regression gates, using only the isolated synthetic backend."""
import http.server
import json
import threading
from playwright.sync_api import sync_playwright
import test_live_classroom_v5 as base
OUT=base.OUT

def contrast(page, selector):
    return page.locator(selector).evaluate_all('''nodes=>nodes.filter(n=>n.getBoundingClientRect().height>0).map(n=>{
      const parse=s=>(s.match(/[0-9.]+/g)||[]).map(Number);
      const luminance=rgb=>rgb.slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4}).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);
      const fg=parse(getComputedStyle(n).color);let p=n,bg=[255,255,255,1];
      while(p){const candidate=parse(getComputedStyle(p).backgroundColor);if(candidate.length===3||candidate[3]>0.99){bg=candidate;break}p=p.parentElement}
      const a=luminance(fg),b=luminance(bg);return {text:n.textContent.trim().slice(0,45),ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
    })''')

def shot(page,name):
    # Test-only screenshot positioning is not a product navigation behavior.
    page.evaluate('window.scrollTo(0,0)')
    page.screenshot(path=str(OUT/name),full_page=True)

def run(browser,url):
    ctx,page,errors=base.page_for(browser,url)
    page.mouse.move(1,1)
    action=page.locator('#rzLiveChoices .rz-v5-card-action').first
    base.check('Desktop card CTA hidden until hover or focus',float(action.evaluate('n=>getComputedStyle(n).opacity'))==0)
    action.focus()
    base.check('Keyboard focus reveals card CTA',float(action.evaluate('n=>getComputedStyle(n).opacity'))==1)
    page.keyboard.press('Enter')
    page.wait_for_selector('#rzLiveCollection:not([hidden])')
    base.check('Keyboard Enter opens one fresh collection screen','live=simulation-list' in page.url)
    shot(page,'licensed-grid.png')
    base.choose(page,'Decision Lab');page.wait_for_selector('#rzLiveSetup:not([hidden])')
    shot(page,'simulation-setup.png')
    base.check('Existing session does not auto-advance a new setup',page.locator('#rzLiveSetup').is_visible())
    base.close(ctx)

    ctx,page,errors=base.page_for(browser,url,'faculty','?live=simulation-running&selection=sim-1&live_session=existing-1#classroom')
    page.wait_for_selector('#rzLiveAccessFab:visible')
    page.locator('#rzLiveAccessFab').click()
    page.wait_for_selector('#rzLiveAccessQR svg:visible')
    base.check('Existing session can reopen authorized QR without auto-obscuring results')
    page.locator('#rzLiveAccessMinimize').click()
    values=contrast(page,'.classroom-created-card:not(.rz-v5-hidden) .classroom-session-meta span,.classroom-created-card:not(.rz-v5-hidden) .classroom-session-meta strong,.classroom-created-card:not(.rz-v5-hidden) .classroom-created-actions .small-action')
    (OUT/'contrast-results.json').write_text(json.dumps(values,indent=2))
    base.check('Visible session metadata and controls meet 4.5:1 contrast',len(values)>=8 and all(v['ratio']>=4.5 for v in values))
    shot(page,'session-access-contrast.png')
    page.locator('.classroom-created-card:visible [data-close-classroom-session]').click()
    page.locator('#rzEndSessionConfirm').click()
    page.wait_for_function('__fixture.sessions.find(s=>s.session_id==="existing-1").active===false')
    page.wait_for_selector('#rzLiveSessionNotice:not([hidden])')
    page.locator('#rzV13Tabstudents').click()
    base.check('Ending a session preserves its results in Student Results',page.locator('#resultRows').is_visible())
    base.check('Closing session does not remove submissions',page.evaluate('RizSimFacultyBridge.getSnapshot().submissions.length')==2)
    base.check('Closed session explains access status','closed' in page.locator('#rzLiveSessionNotice').inner_text())
    base.check('Session closure has no uncaught browser errors',not errors)
    base.close(ctx)

    ctx,page,errors=base.page_for(browser,url,'course_lead','?live=own-running&selection=course-1&live_session=existing-course#classroom')
    page.locator('#rzV13Tabinsights').click()
    page.wait_for_selector('#courseResultRows:visible')
    base.check('Own-course deep link restores authorized course results',page.locator('#courseResultSessionFilter').input_value()=='existing-course')
    page.locator('#rzV13Tabstudio').click()
    page.wait_for_selector('[data-rz-add-resource]')
    base.check('Own-course restored session keeps resource library and add action',page.locator('[data-rz-add-resource]').is_visible())
    values=contrast(page,'[data-rz-add-resource] strong,[data-rz-add-resource] small')
    base.check('Material action text meets 4.5:1 contrast',len(values)==2 and all(v['ratio']>=4.5 for v in values))
    page.locator('#rzV13Tabinsights').click()
    page.locator('#courseResultRows [data-attempt-id]').first.click();page.wait_for_selector('#responseModal.show')
    base.check('Own-course result opens original response modal','Course Student' in page.locator('#responseModalTitle').inner_text())
    page.locator('#responseModalClose').click()
    before=page.url
    page.locator('#rzLiveRefreshResults').click()
    page.wait_for_selector('#rzLiveV13Workspace:not([hidden])')
    base.check('Page refresh resets inner sidebar to default Session Studio',
               page.locator('#rzV13Tabstudio').get_attribute('aria-selected')=='true')
    page.locator('#rzV13Tabinsights').click()
    page.wait_for_selector('#courseResultRows:visible')
    base.check('Explicit results refresh preserves exact session hyperlink',page.url==before)
    shot(page,'course-results.png')
    base.check('Course results have no uncaught browser errors',not errors)
    base.close(ctx)

    ctx,page,errors=base.page_for(browser,url,'faculty','?live=purchased-setup&selection=course-1#classroom')
    base.check('Forged purchased setup cannot run an owned course',page.locator('#rzLiveCollection').is_visible() and 'purchased-list' in page.url)
    shot(page,'purchased-empty-state.png')
    base.close(ctx)
    ctx,page,errors=base.page_for(browser,url,'faculty','?live=simulation-setup&selection=sim-revoked#classroom')
    page.wait_for_selector('#rzLiveCollection:not([hidden])')
    base.check('Unlicensed simulation deep link cannot start session',page.locator('#classroomCreateForm').is_hidden())
    base.close(ctx)
    ctx,page,errors=base.page_for(browser,url,'faculty','?live=simulation-running&selection=sim-1&live_session=not-owned#classroom')
    page.wait_for_selector('#rzLiveCollection:not([hidden])')
    base.check('Unowned session URL does not expose a running screen',page.locator('#rzLiveRunning').is_hidden())
    base.close(ctx)

if __name__=='__main__':
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),base.Handler)
    url='http://127.0.0.1:'+str(server.server_port)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True)
            try: run(browser,url)
            except Exception:
                for i,ctx in enumerate(base.contexts):
                    try:
                        for j,page in enumerate(ctx.pages):
                            page.screenshot(path=str(OUT/('extended-failure-%d-%d.png'%(i,j))),full_page=True)
                        ctx.tracing.stop(path=str(OUT/('extended-failure-%d.zip'%i)))
                    except Exception: pass
                raise
            finally: browser.close()
        (OUT/'extended-summary.json').write_text(json.dumps({'status':'passed','checks':base.checks,'test_type':'synthetic backend, real browser'},indent=2))
        print('PASS '+str(len(base.checks))+' extended browser gates',flush=True)
    finally: server.shutdown()
