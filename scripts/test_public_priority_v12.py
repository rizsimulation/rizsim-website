"""Public Priority 1 and shared About: real HTML, isolated existing fixtures."""
import http.server,json,threading,traceback
from playwright.sync_api import sync_playwright
import test_design_code_v1 as base
OUT=base.ROOT/'test-results'/'design-code-v12-priority';OUT.mkdir(parents=True,exist_ok=True)
CHECKS=[]
def check(name,passed,detail=None):
 CHECKS.append({'name':name,'passed':bool(passed),'detail':detail})
 print(('PASS ' if passed else 'FAIL ')+name,flush=True)
def fits(p,n):
 b=n.bounding_box();return bool(b and b['y']>=0 and b['y']+b['height']<=p.viewport_size['height']-2)
def shot(p,name):p.screenshot(path=str(OUT/(name+'.png')),full_page=False,animations='disabled')
def run(browser,url):
 for size in [(1366,768),(1440,900),(390,844)]:
  label=str(size[0])+'x'+str(size[1])
  for role in [None,'student','faculty','course_lead','institution','admin','owner']:
   ctx=None
   try:
    path='about.html' if role is None else 'access-in.html' if role=='student' else 'access-out.html'
    ctx,p,errors=base.open_page(browser,url,path,role,size)
    if role:base.nav(p,role,'about')
    p.wait_for_selector('.rz-about-open-pdf');p.evaluate('scrollTo(0,0)')
    name=(role or 'public')+'-about-'+label
    for selector in ['.rz-about-open-pdf','.rz-about-download-pdf']:
     n=p.locator(selector).first
     check(name+' visible '+selector,n.is_visible())
     if size[0]>=1000:check(name+' no-scroll '+selector,fits(p,n),n.bounding_box())
     check(name+' original PDF destination '+selector,'RizSim_Brand_Promise.pdf' in (n.get_attribute('href') or ''))
    check(name+' drawn PDF icon',p.locator('.rz-about-pdf-icon').first.evaluate('(n)=>getComputedStyle(n).backgroundImage.includes("svg")'))
    check(name+' no overflow',p.evaluate('document.documentElement.scrollWidth<=innerWidth+2'))
    check(name+' no script errors',not errors,errors)
    shot(p,name)
   except Exception:check((role or 'public')+' About '+label,False,traceback.format_exc())
   finally:
    if ctx:ctx.close()
  ctx=None
  try:
   ctx,p,errors=base.open_page(browser,url,'simulations.html',size=size)
   p.wait_for_selector('.simulation-card');p.evaluate('scrollTo(0,0)')
   name='catalogue-'+label
   check(name+' supplementary introduction follows task',p.locator('.sim-hero').bounding_box()['y']>=p.locator('.catalogue-section').bounding_box()['y']+p.locator('.catalogue-section').bounding_box()['height']-2)
   if size[0]>=1000:
    for selector in ['.catalogue-filters','.simulation-card:nth-child(1) .simulation-actions','.simulation-card:nth-child(2) .simulation-actions','.simulation-card:nth-child(3) .simulation-actions']:
     n=p.locator(selector).first;check(name+' no-scroll '+selector,fits(p,n),n.bounding_box())
   check(name+' catalogue content retained',p.locator('.simulation-card').count()>=3)
   p.locator('.catalogue-filter[data-filter=skills]').click()
   check(name+' original filter works',p.locator('.catalogue-filter[data-filter=skills]').get_attribute('class').find('is-active')>=0)
   p.locator('.catalogue-filter[data-filter=all]').click();p.evaluate('scrollTo(0,0)');shot(p,name)
   p.locator('.product-details').first.click();p.wait_for_selector('#productModal.is-open')
   check(name+' details still opens',p.locator('#modalTitle').inner_text().strip()!='')
   shot(p,name+'-details');p.keyboard.press('Escape');p.wait_for_selector('#productModal',state='hidden')
   check(name+' details closes',not p.locator('#productModal').is_visible())
   p.add_style_tag(content='html{font-size:200%!important;}');p.wait_for_timeout(100)
   check(name+' 200-percent text reflows',p.evaluate('document.documentElement.scrollWidth<=innerWidth+2'))
   check(name+' no script errors',not errors,errors)
  except Exception:check('Catalogue '+label,False,traceback.format_exc())
  finally:
   if ctx:ctx.close()
def main():
 srv=http.server.ThreadingHTTPServer(('127.0.0.1',0),base.Handler)
 threading.Thread(target=srv.serve_forever,daemon=True).start()
 try:
  with sync_playwright() as pw:
   browser=pw.chromium.launch(headless=True);run(browser,'http://127.0.0.1:'+str(srv.server_port));browser.close()
 finally:
  srv.shutdown();(OUT/'report.json').write_text(json.dumps({'checks':CHECKS,'scope':'Synthetic actual-HTML fixtures, not real-account production acceptance'},indent=2))
 failed=sum(not c['passed'] for c in CHECKS);print(json.dumps({'passed':len(CHECKS)-failed,'failed':failed}))
 if failed:raise SystemExit(1)
if __name__=='__main__':main()
