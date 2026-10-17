"""Additional release checks: explicit confirmation, cancellation, and original RPC preservation."""
import http.server,json,threading
from playwright.sync_api import sync_playwright
import test_live_classroom_v5 as base


def calls(page):
    return page.evaluate('__fixture.calls.filter(c=>c.name==="close_rizsim_classroom_session").length')


def run(browser,url):
    ctx,page,errors=base.page_for(browser,url,'faculty','?live=simulation-running&selection=sim-1&live_session=existing-1#classroom')
    count=calls(page)
    trigger=page.locator('.classroom-created-card:visible [data-close-classroom-session]')
    trigger.click()
    page.wait_for_selector('#rzEndSessionDialog[open]')
    base.check('End Session opens an explicit on-page confirmation')
    base.check('Confirmation identifies the exact selected session','Existing Seminar' in page.locator('#rzEndSessionDialog').inner_text())
    base.check('Safe action has initial keyboard focus',page.evaluate('document.activeElement.id')=='rzEndSessionCancel')
    base.check('No closure request before explicit confirmation',calls(page)==count)
    page.locator('#rzEndSessionCancel').click()
    base.check('Cancel preserves the session',calls(page)==count and page.evaluate('__fixture.sessions.find(s=>s.session_id==="existing-1").active'))
    trigger.click();page.wait_for_selector('#rzEndSessionDialog[open]');page.keyboard.press('Escape')
    base.check('Escape cancels without server writes',calls(page)==count and page.locator('#rzEndSessionDialog').count()==0)
    base.check('Unknown session cannot open a confirmation',page.evaluate('RizSimSessionConfirmation.ask("not-authorized")') is False)
    trigger.click();page.wait_for_selector('#rzEndSessionDialog[open]')
    base.check('Duplicate confirmation requests are rejected',page.evaluate('RizSimSessionConfirmation.ask("existing-1")') is False and page.locator('#rzEndSessionDialog').count()==1)
    page.screenshot(path=str(base.OUT/'explicit-session-confirmation.png'),full_page=True)
    page.locator('#rzEndSessionConfirm').click()
    page.wait_for_function('__fixture.sessions.find(s=>s.session_id==="existing-1").active===false')
    page.wait_for_selector('#rzLiveSessionNotice:not([hidden])')
    base.check('Confirmation invokes original closure RPC exactly once',calls(page)==count+1)
    base.check('Original server operation targets only selected session',page.evaluate('__fixture.calls.filter(c=>c.name==="close_rizsim_classroom_session").at(-1).args.p_session_id')=='existing-1')
    base.check('Other sessions and submissions remain',page.evaluate('__fixture.sessions.find(s=>s.session_id==="existing-course").active') and page.evaluate('RizSimFacultyBridge.getSnapshot().submissions.length')==2)
    base.check('Confirmation flow has no browser errors',not errors)
    base.close(ctx)
    ctx,page,errors=base.page_for(browser,url,'faculty')
    base.check('Faculty cannot use Course Lead confirmation path',page.evaluate('RizSimSessionConfirmation.ask("existing-course",true)') is False)
    base.close(ctx)
    ctx,page,errors=base.page_for(browser,url,'course_lead','?live=own-running&selection=course-1&live_session=existing-course#classroom')
    # V13 deliberately opens Studio first; authorized aggregate results live in the Insights tab.
    page.wait_for_selector('#rzLiveV13Workspace:not([hidden])')
    page.locator('#rzV13Tabinsights').click()
    page.wait_for_selector('#courseResultRows:visible')
    base.check('Existing Course Lead results only appear in their authorized Class Insights section',
               page.locator('#courseResultRows').evaluate('n=>!!n.closest("#rzV13Paneinsights")'))
    page.locator('.classroom-created-card:visible [data-close-classroom-session]').click()
    page.wait_for_selector('#rzEndSessionDialog[open]')
    page.locator('#rzEndSessionConfirm').click()
    page.wait_for_function('__fixture.sessions.find(s=>s.session_id==="existing-course").active===false')
    base.check('Course session closes through original authorized handler')
    base.check('Course results stay visible after closure',page.locator('#courseResultRows').is_visible())
    base.check('Course closure has no browser errors',not errors)
    base.close(ctx)

if __name__=='__main__':
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),base.Handler)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True)
            try: run(browser,'http://127.0.0.1:'+str(server.server_port))
            finally: browser.close()
        (base.OUT/'confirmation-summary.json').write_text(json.dumps({'status':'passed','checks':base.checks,'backend':'synthetic only'},indent=2))
        print('PASS',len(base.checks),'explicit confirmation checks')
    finally: server.shutdown()
