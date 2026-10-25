"""Mounted regression for restored Course Lead glow; synthetic Faculty only."""
import http.server, threading
from playwright.sync_api import sync_playwright
import test_live_classroom_v5 as faculty

def main():
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),faculty.Handler)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch()
            for mobile in (False,True):
                ctx,p,errors=faculty.page_for(browser,'http://127.0.0.1:'+str(server.server_port),role='faculty',mobile=mobile,v15=True)
                try:
                    p.locator('#mainNav [data-auth-view=courses]').evaluate('(n)=>n.click()')
                    button=p.locator('#rzCourseLeadUpgradeButton')
                    button.wait_for(state='visible')
                    p.emulate_media(reduced_motion='no-preference')
                    data=button.evaluate("""n=>({
                      animation:getComputedStyle(n).animationName,
                      background:getComputedStyle(n).backgroundImage,
                      shine:getComputedStyle(n.querySelector('.rz-clu-upgrade-shine')).animationName,
                      overflow:document.documentElement.scrollWidth<=innerWidth+2,
                      visible:!!n.getClientRects().length
                    })""")
                    assert data['visible'] and data['overflow'],data
                    assert 'rzCluGlow' in data['animation'] and 'rzCluFlow' in data['animation'],data
                    assert 'gradient' in data['background'] and 'rzCluShine' in data['shine'],data
                    p.emulate_media(reduced_motion='reduce')
                    reduced=button.evaluate("n=>getComputedStyle(n).animationName")
                    assert reduced=='none',reduced
                    assert not errors,errors
                    print('PASS restored glow and reduced motion '+('mobile' if mobile else 'desktop'),flush=True)
                finally: ctx.close()
            browser.close()
    finally:server.shutdown()
if __name__=='__main__':main()
