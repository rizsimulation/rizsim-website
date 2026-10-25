"""Mounted Student Library banner-retirement regression; synthetic backend only."""
import http.server
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright
import test_live_classroom_v5 as faculty
import test_student_workspace_v8 as student

def main():
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),faculty.Handler)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch()
            for mobile in [False,True]:
                ctx,page,errors=student.open_page(browser,'http://127.0.0.1:'+str(server.server_port),mobile=mobile)
                try:
                    student.nav(page,'resources')
                    page.locator('#rzStudentSimulationLibrary .rz-v153-library-lead').wait_for(state='visible')
                    page.wait_for_timeout(250)
                    assert page.locator('#rzV15LibraryLaunch').count()==0,'Expired Library launch banner should not exist'
                    assert page.locator('#rzV15LibraryTime').count()==0,'Expired countdown text should not exist'
                    assert page.get_by_text('Learn independently. Discover what comes next.').is_visible()
                    assert page.locator('#rzStudentSimulationLibrary .rz-v153-library-category').count()==4
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
                    page.evaluate("document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('focus'))")
                    page.wait_for_timeout(150)
                    assert page.locator('#rzV15LibraryLaunch').count()==0,'Banner reappeared after focus'
                    assert not errors,errors
                    print('PASS retired Library banner and preserved catalog at '+('mobile' if mobile else 'desktop'),flush=True)
                finally:
                    ctx.close()
            browser.close()
    finally:
        server.shutdown()

if __name__=='__main__': main()
