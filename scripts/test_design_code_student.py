"""Actual Student Classroom presentation with intercepted synthetic data only."""
import http.server
import json
import os
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright
import test_design_code_v1 as base

OUT=Path(__file__).resolve().parents[1]/'test-results/design-code-student'
OUT.mkdir(parents=True,exist_ok=True)
checks=[]
def check(name,value):
    assert value,name
    checks.append(name)
    print('PASS '+name,flush=True)

def run(browser,url,size,code,label):
    ctx,p,errors=base.open_page(browser,url,'access-in.html','student',size)
    try:
        base.nav(p,'student','player')
        p.locator('#classCodeInput').fill(code)
        p.locator('#findClassButton').click()
        p.wait_for_selector('.rz-c155-start')
        prefix=f'{size[0]} {label}: '
        check(prefix+'status reflects the resolved session',p.locator('.rz-c155-state').inner_text()==label)
        check(prefix+'neutral heading never fabricates a Live state',p.locator('.rz-c155-top .rz-c155-eyebrow').first.inner_text()=='CURRENT SIMULATION')
        check(prefix+'launch action uses a graphical icon',p.locator('.rz-c155-start svg').count()==1)
        p.locator('.rz-c155-start').click()
        dialog=p.locator('.rz-c155-erp[open]')
        dialog.wait_for()
        field=dialog.locator('input[type=text]')
        before=p.evaluate('JSON.stringify(__studentFixture.attempts)')
        dialog.get_by_role('button',name='Continue',exact=True).click()
        check(prefix+'empty ERP has full-field error and inline explanation',field.get_attribute('aria-invalid')=='true' and dialog.locator('.rz-inline-error').is_visible())
        check(prefix+'first invalid field keeps focus',field.evaluate('e=>e===document.activeElement'))
        field.fill('@')
        check(prefix+'still-invalid ERP does not prematurely clear the error',field.get_attribute('aria-invalid')=='true')
        field.fill('ERP-2026')
        check(prefix+'correction clears the error without moving focus',field.get_attribute('aria-invalid') is None and field.evaluate('e=>e===document.activeElement'))
        check(prefix+'invalid submission changes no attempts or saved ERP',p.evaluate('JSON.stringify(__studentFixture.attempts)')==before and p.evaluate('__studentFixture.erp') is None and len(ctx.pages)==1)
        dialog.get_by_role('button',name='Cancel',exact=True).click()
        dialog.wait_for(state='detached')
        check(prefix+'cancel leaves the classroom and launch action available',not dialog.count() and p.locator('.rz-c155-start').is_enabled())
        check(prefix+'no uncaught script errors',not errors)
        p.screenshot(path=str(OUT/f'{size[0]}-{code}.png'),animations='disabled')
    finally:
        ctx.close()

if __name__=='__main__':
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),base.Handler)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as pw:
            kwargs={'headless':True}
            if os.environ.get('RIZSIM_CHROMIUM'):kwargs['executable_path']=os.environ['RIZSIM_CHROMIUM']
            browser=pw.chromium.launch(**kwargs)
            try:
                for size in [(1366,768),(390,844)]:
                    for code,label in [('TEST1234','Practice active'),('BOTH1234','Session Live')]:
                        run(browser,f'http://127.0.0.1:{server.server_port}',size,code,label)
            finally:
                browser.close()
    finally:
        server.shutdown()
    (OUT/'report.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'scope':'synthetic Student UI only'},indent=2))
