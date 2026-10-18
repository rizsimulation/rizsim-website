"""Real portal browser regression tests with isolated synthetic backend fixtures.
No live Supabase authentication, writes, identities, licences or submissions are used.
Run: python scripts/test_live_classroom_v5.py
"""
import http.server
import json
import os
from pathlib import Path
import threading
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results'
OUT.mkdir(exist_ok=True)
MOCK = (ROOT / 'scripts/fixtures/live-classroom-backend.js').read_text()
checks = []
contexts = []
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs): super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, *args): pass

def check(name, value=True):
    assert value, name
    checks.append(name)
    print('PASS ' + name, flush=True)

def page_for(browser, base, role='faculty', path='', mobile=False, delay=0):
    context = browser.new_context(viewport={'width':390 if mobile else 1366,'height':844 if mobile else 900}, has_touch=mobile, is_mobile=mobile, device_scale_factor=1, reduced_motion='reduce')
    contexts.append(context)
    context.tracing.start(screenshots=True, snapshots=True)
    context.add_init_script('window.__testRole=' + json.dumps(role) + ';window.__authDelay=' + str(delay) + ';window.__scrollCalls=[];const oldScroll=window.scrollTo;window.scrollTo=function(...args){window.__scrollCalls.push(args);return oldScroll.apply(this,args)};')
    def intercept(route):
        url = route.request.url
        if url == 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm':
            route.fulfill(status=200, content_type='text/javascript', body=MOCK)
        elif url == base + '/rizsim-v15-live-control.js':
            # This suite verifies the unchanged V5 secure form/QR and historical
            # Back/Forward behavior. The new V15 one-click flow is tested
            # independently by scripts/test_v15_classroom.py.
            route.fulfill(status=200, content_type='text/javascript', body='/* V5 compatibility regression */')
        elif url.startswith(base + '/'):
            route.continue_()
        elif 'fonts.googleapis.com' in url:
            route.fulfill(status=200, content_type='text/css', body='')
        else:
            route.abort()
    context.route('**/*', intercept)
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda error:(errors.append(str(error)),print('BROWSER ERROR '+str(error),flush=True)))
    page.on('dialog',lambda dialog:dialog.accept())
    page.goto(base + '/access-out.html' + path, wait_until='networkidle')
    page.wait_for_selector('#authenticatedApp.show')
    page.wait_for_function('window.RizSimFacultyBridge?.getSnapshot().sessions.length===2')
    if '#classroom' not in path:
        page.locator('#mainNav [data-auth-view=classroom]').evaluate('(n)=>n.click()')
    page.wait_for_selector('#view-classroom.active')
    page.wait_for_timeout(650)
    return context,page,errors

def close(context):
    context.tracing.stop()
    context.close()
    contexts.remove(context)

def choose(page, name):
    card=page.locator('#rzLiveCards .rz-v5-card').filter(has_text=name)
    card.hover()
    card.get_by_role('link').click()

def mode(page, index):
    page.locator('#rzLiveChoices .rz-v5-card').nth(index).hover()
    page.locator('#rzLiveChoices .rz-v5-card-action').nth(index).click()

def run(browser,base):
    ctx,page,errors=page_for(browser,base)
    check('Three compact mode cards',page.locator('#rzLiveChoices .rz-v5-card').count()==3)
    check('Only one visible classroom tab',page.locator('#mainNav [data-auth-view=materials]').is_hidden())
    check('Faculty sees Course Lead promotion',page.get_by_role('button',name='Become a Course Lead').count()==1)
    mode(page,1)
    page.wait_for_selector('#view-courses.active')
    check('Promotion does not elevate role',page.evaluate('RizSimFacultyBridge.getSnapshot().role')=='faculty')
    check('Run My Own Course redirects Faculty to Courses advertisement',page.locator('#rzCourseLeadUpgrade').is_visible())
    check('Real Course Lead authoring remains hidden for Faculty',page.locator('#rzCourseAuthoring').is_hidden())
    page.screenshot(path=str(OUT/'faculty-course-lead-promotion.png'),full_page=True)
    page.locator('#mainNav [data-auth-view=classroom]').evaluate('(n)=>n.click()')
    page.wait_for_selector('#view-classroom.active')
    page.wait_for_selector('#rzLiveChoices:not([hidden])')
    mode(page,0)
    page.wait_for_selector('#rzLiveCards .rz-v5-card')
    check('Unlicensed product excluded','Unlicensed Lab' not in page.locator('#rzLiveCards').inner_text())
    check('Add More Simulations card exists',page.locator('#rzLiveCards .rz-v5-card-add').count()==1)
    before=page.evaluate('__scrollCalls.length')
    choose(page,'Decision Lab')
    page.wait_for_selector('#rzLiveSetup:not([hidden])')
    check('Simulation preselected without redundant choice',page.locator('#classroomSimulationSelect').input_value()=='sim-1' and page.locator('#classroomSimulationSelect').is_hidden())
    check('Selection does not force scrolling',page.evaluate('__scrollCalls.length')==before)
    check('Stable setup hyperlink','live=simulation-setup&selection=sim-1' in page.url)
    page.go_back();page.wait_for_selector('#rzLiveCollection:not([hidden])')
    page.go_forward();page.wait_for_selector('#rzLiveSetup:not([hidden])')
    check('Browser Back and Forward restore stages')
    page.reload(wait_until='networkidle');page.wait_for_selector('#rzLiveSetup:not([hidden])')
    check('Deep-link refresh restores simulation',page.locator('#classroomSimulationSelect').input_value()=='sim-1')
    page.evaluate('__fixture.failCreate=true')
    page.locator('#classroomSessionName').fill('Denied QA Seminar')
    page.locator('#createClassroomSessionButton').click()
    page.wait_for_function('document.getElementById("classroomCreateMessage").textContent.includes("denied")')
    check('Failed creation stays on setup',page.locator('#rzLiveSetup').is_visible())
    page.evaluate('__fixture.failCreate=false')
    page.locator('#classroomSessionName').fill('New QA Seminar')
    page.locator('#createClassroomSessionButton').click()
    page.wait_for_selector('#rzV13StudioShare:not([hidden])',timeout=15000)
    page.wait_for_selector('#rzV13StudioShare:not([hidden]) #rzV13ShareQR svg:visible',timeout=18000)
    check('New session automatically opens authenticated Studio Share Access',
          page.locator('#rzV13SubviewShare[aria-pressed=true]').count()==1)
    check('Only one selected original session card is retained',
          page.locator('.classroom-created-card:not(.rz-v5-hidden)').count()==1)
    check('Studio share uses original authenticated class code',
          page.locator('#rzV13ShareCode').inner_text().strip()==
          page.locator('.classroom-created-card:not(.rz-v5-hidden) .classroom-code-value').text_content().strip())
    check('New session hides unrelated submissions',page.locator('#resultRows').is_hidden())
    check('Existing session preserved',page.evaluate('__fixture.sessions.some(s=>s.session_id==="existing-1")'))
    check('Direct URL identifies exact session','live_session=' in page.url)
    check('Original token-backed credentials are private to Studio Share',
          page.locator('.classroom-created-card:not(.rz-v5-hidden) .classroom-code-box').is_hidden())
    check('No floating QR dialog or pinned button created',
          page.locator('#rzLiveAccessLayer,#rzLiveAccessFab,#rzV13ShareOpen').count()==0)
    page.screenshot(path=str(OUT/'simulation-session.png'),full_page=True)
    page.locator('#rzV13ShareQR svg').screenshot(path=str(OUT/'session-qr.png'))
    link=page.locator('#rzV13ShareLink').inner_text().strip()
    from PIL import Image
    import zxingcpp
    decoded=zxingcpp.read_barcode(Image.open(OUT/'session-qr.png'))
    check('QR still decodes to the exact authorized join link',decoded is not None and decoded.text==link)
    check('Original protected token matches the authorized fixture',page.evaluate("""() => {
      const v=RizSimLiveClassroom.verifiedShare();
      return v?.link===document.getElementById('rzV13ShareLink').textContent &&
        new URL(v.link).searchParams.get('session')==='qa-token-new-2';
    }"""))
    page.locator('#rzV13Tabstudents').click()
    check('Student Results tab works without an overlapping share launcher',
          page.locator('#rzV13Tabstudents[aria-selected=true]').count()==1)
    page.locator('#rzV13Tabstudio').click()
    page.locator('#rzV13SubviewOverview').click()
    page.locator('#rzLiveJumpResults').click();page.wait_for_selector('#rzV13Panestudents:not([hidden])')
    check('Results shortcut opens the separate Student Results workspace without scrolling',page.locator('#rzV13Tabstudents[aria-selected=true]').count()==1 and page.locator('#classroomRosterPanel').is_visible())
    check('Simulation flow has no uncaught browser errors',not errors)
    close(ctx)

    ctx,page,errors=page_for(browser,base,'course_lead')
    mode(page,1)
    page.wait_for_selector('#rzLiveCollection:not([hidden])')
    check('Owned courses exclude inactive entries','Ended Course' not in page.locator('#rzLiveCards').inner_text())
    choose(page,'My Marketing Course')
    page.wait_for_selector('#rzCourseEnvironment [data-rz-run-product=sim-2]')
    page.locator('[data-rz-run-product=sim-2]').locator('..').hover();page.locator('[data-rz-run-product=sim-2]').click()
    page.wait_for_function('document.getElementById("courseClassroomSimulationSelect").options.length>1')
    page.wait_for_timeout(600)
    check('Course selection does not recurse',page.evaluate('__fixture.calls.filter(c=>c.name==="get_my_rizsim_course_simulations").length')==1)
    check('Simulation form hidden in course setup',page.locator('#classroomCreateForm').is_hidden())
    assert page.locator('#courseClassroomSimulationSelect').input_value()=='sim-2'
    page.locator('#courseClassroomSessionName').fill('New Course Seminar')
    page.locator('#createCourseClassroomSessionButton').click()
    page.wait_for_selector('#rzV13StudioShare:not([hidden])',timeout=15000)
    page.wait_for_selector('#rzV13StudioShare:not([hidden]) #rzV13ShareQR svg:visible')
    check('Original course resources remain mounted behind Studio Share',
          page.locator('#rzCourseEnvironment [data-rz-add-resource]').count()>=1)
    check('Course creation opens verified QR/code/link inside Studio Share Access')
    check('No floating QR button exists for Course Lead',
          page.locator('#rzLiveAccessFab,#rzLiveAccessLayer').count()==0)
    page.locator('#rzV13SubviewOverview').click()
    page.wait_for_selector('#rzCourseEnvironment [data-rz-add-resource]:visible')
    page.locator('[data-rz-add-resource]').click()
    page.locator('#rzRuntimeDialog .rz-file-zone').evaluate("el=>{const dt=new DataTransfer();dt.items.add(new File(['%PDF-1.4\\nfixture'],'class-notes.pdf',{type:'application/pdf'}));el.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:dt}));}")
    page.wait_for_selector('[data-rz-file-publish]:not([disabled])')
    check('Drop stages file in shared composer','class-notes.pdf' in page.locator('[data-rz-file-caption]').inner_text())
    page.locator('[data-rz-file-publish]').click()
    page.locator('#rzResourceFinalPublish').click()
    page.wait_for_function('__fixture.materials.length===1')
    check('Publication targets selected course',page.evaluate('__fixture.materials[0].course_id')=='course-1')
    check('Upload uses existing protected storage bucket',page.evaluate('__fixture.calls.some(c=>c.kind==="storage"&&c.bucket==="course-materials"&&c.path.startsWith("course-1/"))'))
    page.locator('.rz-dialog-close').click()
    page.screenshot(path=str(OUT/'course-session.png'),full_page=True)
    page.locator('#mainNav [data-auth-view=courses]').click();page.wait_for_selector('#view-courses.active')
    page.wait_for_timeout(100)
    check('Course session panel restored when leaving Live Classroom',page.locator('#courseClassroomPanel').evaluate('n=>!!n.closest("#view-courses")'))
    check('Materials return to original Courses workspace',page.locator('#courseMaterialsPanel').evaluate('n=>!!n.closest("#view-courses")'))
    check('Course flow has no uncaught browser errors',not errors)
    close(ctx)

    ctx,page,errors=page_for(browser,base,'faculty','?live=own-setup&selection=course-1#classroom',delay=250)
    check('Unauthorized own-course deep link returns to menu',page.locator('#rzLiveChoices').is_visible())
    check('Faculty cannot query Course Lead session setup',page.evaluate('__fixture.calls.filter(c=>c.name==="get_my_rizsim_course_simulations").length')==0)
    mode(page,2)
    check('Purchased course catalogue remains separate and honest','No complete ready-made' in page.locator('#rzLiveCards').inner_text())
    page.locator('#rzLiveCards .rz-v5-card-add').hover();page.locator('#rzLiveCards .rz-v5-card-add button').click()
    page.wait_for_selector('#view-home.active')
    check('Add More Courses opens Home')
    check('Permission routing has no uncaught browser errors',not errors)
    close(ctx)

    ctx,page,errors=page_for(browser,base,'owner')
    page.locator('#rzLiveResume summary').click()
    page.locator('.rz-v5-resume-row').filter(has_text='Existing Seminar').get_by_role('button').click()
    page.wait_for_selector('#rzLiveRunning:not([hidden])')
    check('Owner supervision does not expose creation form',page.locator('#classroomCreateForm').is_hidden())
    page.locator('#rzV13Tabstudents').click()
    page.wait_for_selector('#resultRows:visible')
    check('Results controls moved once, not cloned',page.locator('#resultRows').count()==1)
    page.locator('#resultRows [data-attempt-id]').first.click();page.wait_for_selector('#responseModal.show')
    check('Original response viewer remains functional','QA Student' in page.locator('#responseModalTitle').inner_text())
    page.locator('#responseModalClose').click()
    check('Owner flow has no uncaught browser errors',not errors)
    close(ctx)

    ctx,page,errors=page_for(browser,base,'faculty',mobile=True)
    check('Touch buttons are visible without hover',float(page.locator('#rzLiveChoices .rz-v5-card-action').first.evaluate('n=>getComputedStyle(n).opacity'))==1)
    check('Mobile menu has no horizontal overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    page.screenshot(path=str(OUT/'mobile-menu.png'),full_page=True)
    page.locator('#mainNav [data-auth-view=records]').evaluate('(n)=>n.click()')
    page.wait_for_selector('#view-records.active')
    check('Records has no blue title block',page.locator('#view-records .rz-workspace-hero').evaluate('n=>getComputedStyle(n).backgroundImage')=='none')
    check('Records title remains compact',page.locator('#view-records h1').evaluate('n=>parseFloat(getComputedStyle(n).fontSize)')<=32)
    page.screenshot(path=str(OUT/'mobile-records.png'),full_page=True)
    check('Mobile flow has no uncaught browser errors',not errors)
    close(ctx)

    ctx,page,errors=page_for(browser,base,'faculty','?live=simulation-running&selection=sim-1&live_session=existing-1#classroom',mobile=True)
    page.wait_for_selector('#rzLiveV13Workspace:not([hidden])')
    check('Mobile creates no pinned QR button or modal layer',
          page.locator('#rzLiveAccessFab,#rzLiveAccessLayer').count()==0)
    page.locator('#rzV13SubviewShare').click()
    page.wait_for_selector('#rzV13ShareQR svg:visible',timeout=18000)
    check('Mobile Studio QR shares the original authorized class code/link',
          page.locator('#rzV13ShareCode').is_visible() and
          page.locator('#rzV13ShareLink').is_visible() and
          page.locator('#rzV13ShareQR svg').is_visible())
    bounds=page.locator('#rzV13ShareDetails').evaluate("""n=>{
      const r=n.getBoundingClientRect();return {left:r.left,right:r.right,width:innerWidth};
    }""")
    check('Mobile Share Access has no horizontal overflow',
          bounds['left']>=-1 and bounds['right']<=bounds['width']+1 and
          page.evaluate('document.documentElement.scrollWidth<=innerWidth+7'))
    page.screenshot(path=str(OUT/'mobile-session-access.png'),full_page=True)
    check('Mobile session access causes no browser errors',not errors)
    close(ctx)

if __name__=='__main__':
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler)
    base='http://127.0.0.1:'+str(server.server_port)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(headless=True)
            try:
                run(browser,base)
            except Exception:
                for i,context in enumerate(contexts):
                    try:
                        for j,page in enumerate(context.pages):
                            page.screenshot(path=str(OUT/('failure-%d-%d.png'%(i,j))),full_page=True)
                            (OUT/('failure-%d-%d.html'%(i,j))).write_text(page.content())
                        context.tracing.stop(path=str(OUT/('failure-%d-trace.zip'%i)))
                    except Exception: pass
                (OUT/'summary.json').write_text(json.dumps({'status':'failed','passed_checks':checks,'test_type':'real portal handlers, synthetic backend'},indent=2))
                raise
            finally:
                browser.close()
        (OUT/'summary.json').write_text(json.dumps({'status':'passed','checks':checks,'test_type':'real browser, real portal handlers, synthetic backend; not authenticated production acceptance'},indent=2))
        print('PASS: '+str(len(checks))+' browser checks. Synthetic backend only.',flush=True)
    finally:
        server.shutdown()
