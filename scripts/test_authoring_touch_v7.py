"""Touch actions remain discoverable without a simulated mouse hover."""
import http.server,json,threading
from playwright.sync_api import sync_playwright
import test_live_classroom_v5 as base
import test_course_authoring_v7 as author

def all_revealed(p,selector,count):
    return p.locator(selector).count()==count and p.locator(selector).evaluate_all("es=>es.every(e=>getComputedStyle(e).opacity==='1'&&getComputedStyle(e).pointerEvents!=='none')")

def run(browser,url):
    ctx,p,errors=author.open_courses(browser,url,mobile=True)
    base.check('Both touch entry actions visible without hover',all_revealed(p,'.rz-author-paths .reveal',2))
    p.get_by_role('button',name='Create new course',exact=True).tap()
    p.wait_for_selector('#rzAuthorEditor')
    base.check('Both touch add actions visible without hover',all_revealed(p,'.rz-author-add-grid .reveal',2))
    p.locator('.rz-author-add-grid .rz-author-card').nth(1).get_by_role('button').tap()
    p.wait_for_selector('[data-author-dialog=simulations]')
    base.check('Touch licensed picker actions all visible without hover',all_revealed(p,'[data-author-dialog=simulations] .reveal',2) and not errors)
    p.locator('[data-author-dialog=simulations] .rz-author-close').tap()
    p.screenshot(path=str(base.OUT/'v7-touch-editor.png'),full_page=True)
    base.close(ctx)

if __name__=='__main__':
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),base.Handler)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True)
            try:run(browser,'http://127.0.0.1:'+str(server.server_port))
            finally:browser.close()
        (base.OUT/'v7-touch-summary.json').write_text(json.dumps({'status':'passed','checks':base.checks,'count':len(base.checks)}))
    finally:server.shutdown()
