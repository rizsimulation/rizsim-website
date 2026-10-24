"""Actual HTML with existing synthetic fixtures; never signs into production."""
import http.server
import json
import re
import subprocess
import threading
import traceback
from playwright.sync_api import sync_playwright
from test_design_code_v1 import ROOT, Handler, open_page, nav

OUT = ROOT / 'test-results' / 'design-code-v11'
OUT.mkdir(parents=True, exist_ok=True)
CHECKS = []
BASE = 'f054e9f6dc85b9280fed01549e57840345c06d54'

def check(name, passed, detail=None):
    CHECKS.append({'name': name, 'passed': bool(passed), 'detail': detail})
    print(('PASS ' if passed else 'FAIL ') + name, flush=True)
    (OUT / 'report.json').write_text(json.dumps(CHECKS, indent=2))

def css(locator, key):
    return locator.evaluate('(n,k)=>getComputedStyle(n)[k]', key)

def contrast(fg, bg):
    def lum(s):
        rgb = [float(x)/255 for x in re.findall(r'[\d.]+', s)[:3]]
        vals = [x/12.92 if x <= .04045 else ((x+.055)/1.055)**2.4 for x in rgb]
        return sum(a*b for a,b in zip(vals,[.2126,.7152,.0722]))
    a,b=sorted([lum(fg),lum(bg)])
    return (b+.05)/(a+.05)

def static_checks():
    for name in ['index.html','simulations.html','about.html','contact.html','access-in.html','access-out.html']:
        check(name+' uses sitewide refinement entry', 'rizsim-sitewide-finish-v14.css' in (ROOT/name).read_text())
    for name in ['google-g.svg','RizSim finalized logo.png','rizsim-r.png','site.css','rizsim-live-classroom.js','rizsim-student-workspace.js','rizsim-course-service.js','rizsim-course-authoring-service.js']:
        old=subprocess.check_output(['git','show',BASE+':'+name],cwd=ROOT)
        check(name+' preserved byte-for-byte', old == (ROOT/name).read_bytes())
    changed=subprocess.check_output(['git','diff','--name-only',BASE],cwd=ROOT,text=True).splitlines()
    check('No backend or assessment changes',not any(x.startswith(('supabase/','migrations/','edge-functions/','simulation-assets/')) for x in changed))
    styles=(ROOT/'rizsim-visual-refinement-v11.css').read_text()
    check('No scale or clipping to manufacture compactness',not re.search(r'\bzoom\s*:|scale\(|overflow[^:]*:\s*hidden',styles))
    check('Hover has keyboard and touch equivalents',':focus-within' in styles and '(hover:none),(pointer:coarse)' in styles)


def role_test(browser, base, role, size):
    ctx,p,errors=open_page(browser,base,'access-out.html',role,size)
    label=f'{role}-{size[0]}x{size[1]}'
    try:
        p.emulate_media(reduced_motion='no-preference')
        nav(p,role,'classroom')
        p.wait_for_selector('#rzLiveChoices .rz-v5-card')
        p.mouse.move(4,4)
        p.wait_for_timeout(300)
        check(label+' refinement loaded',p.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--rz-v11-amber').trim()==='#79501b'"))
        card=p.locator('#rzLiveChoices .rz-v5-card:not(.is-locked)').first
        action=card.locator('.rz-v5-card-action')
        check(label+' existing Explore action',action.inner_text().strip()=='Explore')
        check(label+' graphical card cue',card.locator('h3').evaluate("n=>getComputedStyle(n,'::before').maskImage.includes('data:image/svg+xml')"))
        h=card.evaluate('(n)=>n.offsetHeight')
        fg,bg=css(action,'color'),css(action,'backgroundColor')
        check(label+' amber button color',fg=='rgb(121, 80, 27)' and bg=='rgb(255, 245, 223)',{'foreground':fg,'background':bg})
        check(label+' Explore contrast at least 4.5',contrast(fg,bg)>=4.5,contrast(fg,bg))
        check(label+' readable button text',float(css(action,'fontSize').replace('px',''))>=14)
        if size[0]>=1000:
            check(label+' desktop Explore initially concealed',float(css(action,'opacity'))<.05)
            p.screenshot(path=str(OUT/(label+'-rest.png')),full_page=False)
            card.hover();p.wait_for_timeout(300)
            check(label+' card hover reveals Explore',float(css(action,'opacity'))>.99 and css(action,'pointerEvents')=='auto')
            p.screenshot(path=str(OUT/(label+'-hover.png')),full_page=False)
            check(label+' reveal preserves card height',card.evaluate('(n)=>n.offsetHeight')==h)
            p.mouse.move(4,4);p.wait_for_timeout(300)
            # Enter keyboard modality through actual Tab navigation. Programmatic
            # focus immediately after mouse input need not match :focus-visible.
            action.focus()
            p.keyboard.press('Shift+Tab')
            p.keyboard.press('Tab')
            p.wait_for_timeout(300)
            check(label+' keyboard focus reveals Explore',float(css(action,'opacity'))>.99 and action.evaluate('(n)=>n===document.activeElement'))
            check(label+' visible keyboard outline',css(action,'outlineStyle')!='none')
            p.screenshot(path=str(OUT/(label+'-keyboard.png')),full_page=False)
        else:
            check(label+' touch Explore visible',float(css(action,'opacity'))>.99 and css(action,'pointerEvents')=='auto')
            p.screenshot(path=str(OUT/(label+'-touch.png')),full_page=False)
        locked=p.locator('#rzLiveChoices .rz-v5-card.is-locked .rz-v5-card-action')
        check(label+' premium gate retained',locked.count()==(0 if role=='course_lead' else 1))
        if locked.count():
            check(label+' locked-tier guidance visible',float(css(locked,'opacity'))>.99)
        check(label+' no horizontal overflow',p.evaluate('document.documentElement.scrollWidth<=innerWidth+2'))
        p.emulate_media(reduced_motion='reduce')
        card.hover();p.wait_for_timeout(50)
        check(label+' reduced motion removes movement',css(card,'transform')=='none')
        if size[0]>=1000:
            p.add_style_tag(content='html{font-size:200%!important}')
            check(label+' enlarged text reflows',p.evaluate('document.documentElement.scrollWidth<=innerWidth+2'))
            p.add_style_tag(content='html{font-size:100%!important}')
        href=action.get_attribute('href')
        action.click()
        p.wait_for_function("new URLSearchParams(location.search).get('live')==='simulation-list'")
        check(label+' Explore retains navigation',bool(href and 'simulation-list' in href))
        nav(p,role,'home')
        p.wait_for_function("document.getElementById('rizsimSharedHome')?.shadowRoot?.querySelector('link[href=\"rizsim-visual-refinement-v11.css\"]')")
        check(label+' refinement reaches shared Home',p.locator('#rizsimSharedHome .bp-category-tile').count()==3)
        p.emulate_media(reduced_motion='no-preference')
        p.evaluate("RizSimUI.notify('Synthetic permission feedback only.','denied')")
        denied=p.locator('#rzDcToasts [data-rz-tone=denied] .rz-dc-outcome').last
        check(label+' denied feedback nod',css(denied,'animationName')=='rzV11Nod')
        p.emulate_media(reduced_motion='reduce')
        check(label+' feedback respects reduced motion',css(denied,'animationName')=='none')
        check(label+' no uncaught page errors',not errors,errors)
    finally:
        ctx.close()

def main():
    static_checks()
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    base='http://127.0.0.1:'+str(server.server_port)
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(headless=True,args=['--disable-dev-shm-usage'])
            for role in ['faculty','course_lead','owner']:
                for size in [(1366,768),(1440,900),(390,844)]:
                    try:role_test(browser,base,role,size)
                    except Exception:check(role+' '+str(size)+' flow',False,traceback.format_exc())
            browser.close()
    finally:
        server.shutdown()
    failed=[x for x in CHECKS if not x['passed']]
    (OUT/'report.json').write_text(json.dumps({'checks':CHECKS,'base':BASE,'scope':'Synthetic actual-HTML checks, not signed-in production acceptance'},indent=2))
    print(json.dumps({'passed':len(CHECKS)-len(failed),'failed':len(failed)}))
    if failed:raise SystemExit(1)
if __name__=='__main__':main()
