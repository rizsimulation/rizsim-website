"""V15.3 browser acceptance: independent Student Library + clean Contact.
All sign-ins and report insertions are synthetic and intercepted locally.
"""
import http.server
import threading
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright

import test_v15_classroom as v15
import test_v15_1_polish as v151
import test_student_workspace_v8 as student_v8


def verify_contact(page,selector):
    panel=page.locator(selector+' .rz-v153-support-panel')
    panel.wait_for(state='visible',timeout=12000)
    assert panel.count()==1,'Contact support component duplicated'
    assert panel.locator('.rz-v153-support-team').count()==1
    assert panel.locator('.rz-v153-support-report').count()==1
    assert 'RizSimulation Team' in panel.inner_text()
    assert 'rizsimulation@gmail.com' in panel.inner_text()
    assert panel.locator('a.rz-support-email-action').count()==1
    href=panel.locator('a.rz-support-email-action').get_attribute('href')
    assert 'mail.google.com/mail/?view=cm' in href and 'to=rizsimulation%40gmail.com' in href
    assert panel.get_by_role('button',name='Copy Email').count()==1
    assert panel.get_by_role('button',name='Send Report').count()==1
    assert panel.locator('select.rz-support-category').count()==1
    assert panel.locator('textarea.rz-support-message').count()==1
    assert not panel.locator('.contact-card').count()
    assert not page.locator(selector+' .contact-layout').count(), 'Old help cards still visible'
    assert not page.locator(selector).get_by_text('Additional contact channels').count()
    # Fake the transport only. Authorization and the actual owner report form
    # remain covered by the V11 security checks. No database touched.
    page.evaluate("""()=>{
      window.__v153ReportWrites=[];
      const original=window.rizsimSharedAuth.from.bind(window.rizsimSharedAuth);
      window.rizsimSharedAuth.from=(table)=>table==='rizsim_support_reports'?
        {insert:async payload=>{window.__v153ReportWrites.push(payload);return {error:null}}}:original(table);
    }""")
    panel.locator('select.rz-support-category').select_option('technical')
    panel.locator('textarea.rz-support-message').fill('QA verification: the classroom code did not load.')
    panel.get_by_role('button',name='Send Report').click()
    page.wait_for_function("window.__v153ReportWrites.length===1",timeout=9000)
    assert panel.get_by_text('Report received.',exact=False).count()==1
    assert page.evaluate("window.__v153ReportWrites[0].category")=='technical'
    assert page.evaluate("window.__v153ReportWrites[0].message.startsWith('QA verification')")


def student_library(browser,base):
    ctx,page,errors=student_v8.open_page(browser,base,'#resources',True)
    student_v8.nav(page,'resources')
    try:
        page.wait_for_selector('#rzStudentSimulationLibrary .rz-v153-library-category',timeout=16000)
        assert page.locator('#rzStudentSimulationLibrary .rz-v153-library-category').count()==4
        text=page.locator('#rzStudentSimulationLibrary').inner_text()
        for item in ['Independent Simulations','eBooks','Learning Resources','Self-Paced Courses','COMING SOON','RizSimulation Player']:
            assert item in text,item
        assert not page.locator('#rzStudentSimulationLibrary .rz-st-library-card').count()
        assert 'Practice seminar' not in text and 'Decision Lab' not in text
        assert page.locator('#rzLibraryGrid').count()==1 and page.locator('#rzLibraryGrid').is_hidden()
        assert not page.locator('#rzStudentLibraryMaterials').count()
        page.wait_for_selector('#rzV15LibraryLaunch')
        assert page.locator('#rzV15LibraryTime').inner_text().strip()
        page.clock.set_fixed_time(datetime(2026,10,24,0,0,tzinfo=timezone.utc))
        page.wait_for_function("document.querySelector('#rzV15LibraryLaunch').textContent.includes('Sunday 25 October 2026')")
        assert 'Sunday 25 October 2026' in page.locator('#rzV15LibraryLaunch').inner_text()
        page.clock.set_fixed_time(datetime(2026,10,26,0,0,tzinfo=timezone.utc))
        page.wait_for_function("document.querySelector('#rzV15LibraryTime').textContent==='Launch date reached'")
        assert 'Publication Update' in page.locator('#rzV15LibraryLaunch').inner_text()
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+3'),'Mobile Student Library has horizontal overflow'
        page.locator('#rzStudentSimulationLibrary').get_by_role('button',name='Open RizSimulation Player').click()
        page.wait_for_selector('#view-player.active')
        assert page.locator('#classCodeInput').is_visible(), 'QR/code pathway no longer accessible'
        assert not errors,errors
        print('PASS V15.3: mobile Student Library is launch-only; classroom QR/code access and hidden legacy data preserved.')
        student_v8.nav(page,'contact')
        verify_contact(page,'#view-contact.student-view')
        print('PASS V15.3: Student Contact shows clean Gmail/Copy + Owner report form, fake submit only.')
    finally:ctx.close()


def faculty_contact(browser,base):
    ctx,page=v151.page_for(browser,base,'course_lead',mobile=True)
    try:
        page.goto(base+'/access-out.html#contact',wait_until='networkidle')
        page.wait_for_selector('#authenticatedApp.show')
        page.evaluate("""()=>document.querySelector('#mainNav [data-auth-view="contact"]').click()""")
        page.wait_for_selector('#view-contact.auth-view.active',timeout=13000)
        verify_contact(page,'#view-contact.auth-view')
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+4'),'Mobile Faculty Contact overflows horizontally'
        print('PASS V15.3: Course Lead Contact unified, no placeholder, report form works in isolated fixture.')
    finally:ctx.close()


def public_contact(browser,base):
    for width in [390,1366]:
        ctx=browser.new_context(viewport={'width':width,'height':845},reduced_motion='reduce',is_mobile=(width==390),has_touch=(width==390))
        def route(r):
            if r.request.url.startswith(base+'/'):r.continue_()
            else:r.abort()
        ctx.route('**/*',route)
        page=ctx.new_page()
        try:
            page.goto(base+'/contact.html',wait_until='domcontentloaded')
            assert page.locator('.rz-v153-public-card').count()==1
            assert page.get_by_text('RizSimulation Team',exact=True).count()>=1
            assert page.locator('#copyEmailButton').is_visible()
            assert 'mail.google.com/mail/' in page.locator('.rz-v153-gmail-button').get_attribute('href')
            assert page.locator('.contact-options-section,.contact-path-section,.contact-cta').count()==0
            assert page.locator('header.site-header').count()==1 or page.locator('.site-navbar').count()>=1
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+5'),'Public Contact overflows at '+str(width)
        finally:ctx.close()
    print('PASS V15.3: focused public Gmail + Copy Contact with locked navigation, desktop/mobile no overflow.')


if __name__=='__main__':
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),v15.Handler)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(headless=True)
            try:
                base='http://127.0.0.1:'+str(server.server_port)
                student_library(browser,base)
                faculty_contact(browser,base)
                public_contact(browser,base)
            finally:browser.close()
    finally:server.shutdown()
