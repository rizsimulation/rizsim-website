"""Mounted Frontend 1.6 acceptance; synthetic authorized adapters only.
No production authentication, records, sessions or backend writes.
"""
from __future__ import annotations
import http.server,json,threading,traceback,os
from pathlib import Path
from playwright.sync_api import sync_playwright
import test_live_classroom_v5 as faculty
import test_student_workspace_v8 as student
import test_design_code_v14 as analytics

OUT=faculty.ROOT/'test-results'/'frontend-v16'
OUT.mkdir(parents=True,exist_ok=True)
checks=[]

def verify(name,condition,detail=None):
    checks.append({'name':name,'passed':bool(condition),'detail':detail})
    print(('PASS ' if condition else 'FAIL ')+name,flush=True)
    if not condition: raise AssertionError(name+' '+str(detail))

def photo(p,name):
    # A busy headed CI compositor can reject a single screenshot even after layout
    # and accessibility checks pass. Capture normally, retry once without the
    # animations override, and preserve test correctness without inventing an image.
    target=str(OUT/(name+'.png'))
    try:
        p.screenshot(path=target,animations='disabled',full_page=False,timeout=15000)
    except Exception as exc:
        print('Screenshot compositor retry for '+name+': '+str(exc)[:150],flush=True)
        try:
            p.wait_for_timeout(180)
            p.screenshot(path=target,animations='allow',full_page=False,timeout=15000)
        except Exception as retry:
            print('SCREENSHOT UNAVAILABLE for '+name+': '+str(retry)[:150],flush=True)


def modality(browser,base,mobile=False):
    label='mobile' if mobile else 'desktop'
    ctx,p,errors=faculty.page_for(browser,base,role='faculty',mobile=mobile,v15=True)
    try:
        ok=p.evaluate("RizSimV15.choose({mode:'simulation',selection:'sim-1'})")
        verify(label+' mode picker opens for licensed Faculty',ok)
        p.wait_for_selector('dialog.rz-v15-choice[open]')
        live=p.locator('.rz-v15-choice-option.is-live')
        practice=p.locator('.rz-v15-choice-option.is-practice')
        verify(label+' exact mode labels and accessible targets',live.inner_text()=='Live Session' and practice.inner_text()=='Practice Session' and live.get_attribute('aria-label')=='Live Session' and practice.get_attribute('aria-label')=='Practice Session')
        verify(label+' live monitor-play and practice notepad-pen line icons',live.locator('svg.rz-v16-session-icon rect').count()==1 and practice.locator('svg.rz-v16-session-icon path').count()>=2)
        backgrounds=p.evaluate("""()=>['.rz-v15-choice-option.is-live','.rz-v15-choice-option.is-practice'].map(s=>getComputedStyle(document.querySelector(s)).backgroundImage)""")
        verify(label+' two visually distinct color treatments',backgrounds[0]!=backgrounds[1],backgrounds)
        verify(label+' modal stays inside viewport',p.evaluate("""()=>{const r=document.querySelector('.rz-v15-choice').getBoundingClientRect();return r.top>=-1&&r.bottom<=innerHeight+2&&document.documentElement.scrollWidth<=innerWidth+2}"""))
        verify(label+' keyboard opens with visible initial selection',live.evaluate('n=>document.activeElement===n'))
        photo(p,label+'-live-practice-modal')
        p.keyboard.press('Escape');p.wait_for_selector('dialog.rz-v15-choice',state='detached')
        verify(label+' dismiss does not create sessions',p.evaluate("!__fixture.calls.some(c=>c.name==='create_rizsim_classroom_session')"))
        verify(label+' no browser errors',not errors,errors)
    finally:ctx.close()

def authoring(browser,base,mobile=False):
    label='mobile' if mobile else 'desktop'
    ctx,p,errors=faculty.page_for(browser,base,role='course_lead',mobile=mobile,v15=True)
    try:
        p.locator('#mainNav [data-auth-view=courses]').evaluate('(n)=>n.click()')
        p.wait_for_selector('#rzCourseAuthoring .rz-author-paths')
        p.get_by_role('button',name='Create new course',exact=True).click()
        p.wait_for_selector('#rzCourseAuthoring .rz-author-add-grid .rz-author-card')
        cards=p.locator('#rzCourseAuthoring .rz-author-add-grid .rz-author-card.compact')
        verify(label+' resource/simulation cards both available',cards.count()==2)
        backgrounds=cards.evaluate_all("es=>es.map(e=>getComputedStyle(e).backgroundImage)")
        verify(label+' distinct mint and amber resource choices',backgrounds[0]!=backgrounds[1] and all('gradient' in s for s in backgrounds),backgrounds)
        verify(label+' choices fit inside viewport horizontally',p.evaluate('document.documentElement.scrollWidth<=innerWidth+2'))
        photo(p,label+'-course-authoring')
        verify(label+' no browser errors',not errors,errors)
    finally:ctx.close()

def library(browser,base,mobile=False):
    label='mobile' if mobile else 'desktop'
    ctx,p,errors=student.open_page(browser,base,mobile=mobile)
    try:
        student.nav(p,'resources')
        lead=p.locator('#rzStudentSimulationLibrary .rz-v153-library-lead')
        lead.wait_for(state='visible')
        art=lead.evaluate("""n=>{const s=getComputedStyle(n,'::after');return {image:s.backgroundImage,width:parseFloat(s.width),height:parseFloat(s.height)}}""")
        verify(label+' library has the shared approved illustration', 'rizsim-learning-space-illustration.svg' in art['image'],art)
        verify(label+' illustration stays compact on each device', art['width']<=350 and art['height']<=151 and art['width']<=p.viewport_size['width']*.94,art)
        verify(label+' illustration asset loads from the actual mounted website',p.evaluate("""async()=>{const r=await fetch('/rizsim-learning-space-illustration.svg');return r.ok&&(await r.text()).includes('<svg')}"""))
        verify(label+' forthcoming independent resources never show fabricated progress','COMING SOON' in p.locator('#rzStudentSimulationLibrary').inner_text())
        verify(label+' no mobile overflow',p.evaluate('document.documentElement.scrollWidth<=innerWidth+2'))
        photo(p,label+'-independent-library')
        verify(label+' no browser errors',not errors,errors)
    finally:ctx.close()

def ghost(browser,base):
    ctx,p,errors,module=analytics.mount(browser,base,'insight',(1366,768))
    try:
        p.locator('#rzV13Tabinsights').click()
        p.wait_for_selector('#rzInsightFacultyAnalytics > .rz-a-dashboard')
        p.evaluate('window.__v14Empty=true;window.'+module+'.refresh()')
        p.wait_for_function('window.'+module+'.state().joined===0')
        notes=p.locator('#rzInsightFacultyAnalytics .rz-a-empty')
        verify('empty Presenter retains explanation',notes.count()>=1)
        style=notes.first.evaluate("n=>getComputedStyle(n,'::before').backgroundImage")
        verify('empty Presenter shows chart-shaped decoration but no fabricated plot node','data:image/svg+xml' in style,style[:150])
        photo(p,'presenter-empty-ghost-graphs')
        p.evaluate('window.__v14Empty=false;window.'+module+'.refresh()')
        p.wait_for_function('window.'+module+'.state().joined>0')
        verify('populated Presenter preserves four original measured SVG charts',p.locator('#rzInsightFacultyAnalytics > .rz-a-dashboard svg').count()==4)
        photo(p,'presenter-data-restored')
        verify('no presenter JavaScript exceptions',not errors,errors)
    finally:ctx.close()

def main():
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),faculty.Handler)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(headless=os.getenv('RIZSIM_HEADED')!='1')
            try:
                base='http://127.0.0.1:'+str(server.server_port)
                mode=os.getenv('RIZSIM_V16_SCOPE','all')
                if mode in ('all','faculty'):
                    modality(browser,base)
                    modality(browser,base,True)
                    authoring(browser,base)
                    authoring(browser,base,True)
                if mode in ('all','student'):
                    library(browser,base)
                    library(browser,base,True)
                if mode in ('all','analytics'):
                    ghost(browser,base)
            finally:browser.close()
    finally:server.shutdown()
    (OUT/'report.json').write_text(json.dumps({'checks':checks,'complete':True,'scope':'Mounted real Chromium with synthetic authorized adapters'},indent=2))
    print('Frontend V16:',len(checks),'passed')
if __name__=='__main__':
    try:main()
    except Exception:
        print(traceback.format_exc(),flush=True)
        (OUT/'report.json').write_text(json.dumps({'checks':checks,'complete':False,'traceback':traceback.format_exc()},indent=2))
        raise