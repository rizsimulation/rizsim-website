"""V15.2 isolated launch-readiness QA. No production login, writes or TinyFish credits."""
from __future__ import annotations
import http.server
import threading
from playwright.sync_api import sync_playwright

import test_v15_1_polish as v151
import test_v15_classroom as v15
import test_student_workspace_v8 as student_v8


def role_opt_in(browser, base):
    ctx,page=v151.page_for(browser,base,'faculty')
    ctx.add_init_script('window.__testNoMembership=true')
    try:
        page.goto(base+'/access-out.html',wait_until='networkidle')
        page.wait_for_selector('#rzV152FacultyOptIn:visible')
        assert not page.locator('#googleLogin').is_visible(), 'Already-authenticated Student needs explicit registration, not another login prompt'
        assert '/access-out.html?intent=signup' in page.locator('#rzV152FacultyOptIn').get_attribute('href')
        assert 'has not changed your Student account' in page.locator('#gateStatus').inner_text()
        assert not page.evaluate('Boolean(window.__fixture.roleCreated)'), 'Passive Faculty URL visit must NOT create a staff role'
        assert not page.evaluate("""__fixture.calls.some(c=>c.name==='ensure_standard_faculty_access')"""), 'Passive Faculty visit called role-creation RPC'
        # Explicit sign-up (not passive page view) preserves intended free Faculty account creation.
        page.locator('#rzV152FacultyOptIn').click()
        page.wait_for_selector('#authenticatedApp.show',timeout=18000)
        assert page.evaluate('Boolean(window.__fixture.roleCreated)'), 'Explicit Faculty activation did not call authorized registration RPC'
        print('PASS V15.2: Student-only account stays Student on Faculty visit, explicit opt-in creates Faculty in fixture.')
    finally: ctx.close()


def faculty_paid_countdown(browser,base):
    ctx,page=v151.page_for(browser,base,'faculty')
    try:
        page.goto(base+'/access-out.html#courses',wait_until='networkidle')
        page.wait_for_selector('#authenticatedApp.show')
        page.evaluate("""()=>document.querySelector('#mainNav [data-auth-view="courses"]').click()""")
        page.wait_for_selector('#rzCourseLeadUpgradeButton:visible',timeout=12000)
        page.locator('#rzCourseLeadUpgradeButton').click()
        page.wait_for_selector('.rz-v15-launch-dialog[open]')
        modal=page.locator('.rz-v15-launch-dialog')
        assert 'Friday, 23 October 2026' in modal.inner_text()
        assert 'Monday, 19 October' in modal.inner_text() or 'Public launch target:' in modal.inner_text()
        assert 'not an automatic upgrade' in modal.inner_text()
        assert modal.locator('[data-rz-count]').count()==4
        assert not modal.locator('form[action*=checkout]').count()
        modal.get_by_role('button',name='Close').click()
        print('PASS V15.2: ordinary Faculty sees Course Lead paid-release countdown; no checkout or silent upgrade.')
    finally: ctx.close()


def first_login_only(browser,base):
    ctx=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
    page=ctx.new_page()
    try:
        page.goto(base+'/index.html',wait_until='domcontentloaded')
        page.set_content('<!doctype html><html><body></body></html>')
        page.evaluate("""()=>{sessionStorage.setItem('rizsim:v15:welcome','new-learner');sessionStorage.setItem('rizsim:v15:welcome-name','Sara Example');}""")
        page.add_script_tag(url=base+'/rizsim-v15-welcome.js')
        page.wait_for_selector('.rz-v15-welcome')
        assert 'Welcome to RizSim, Sara!' in page.locator('.rz-v15-welcome h2').inner_text()
        page.get_by_role('button',name='Let’s begin').click()
        assert page.evaluate("""!RizSimV15Welcome.show('new-learner','Sara Example')"""), 'First-login greeting appeared a second time'
        assert page.locator('.rz-v15-welcome').count()==0
        print('PASS V15.2: personalized warm first-ever welcome is dismissed and cannot repeat.')
    finally:ctx.close()


def multiple_practice_classes(browser,base):
    ctx,page,errors=student_v8.open_page(browser,base,'#practice')
    try:
        page.evaluate("""()=>{
            const f=window.__studentFixture;f.allowNewJoin=true;
            f.sessions.push(
              {...f.sessions[0],session_id:'practice-a',class_code:'PRAC0001',class_name:'First added QA Practice'},
              {...f.sessions[0],session_id:'practice-b',class_code:'PRAC0002',class_name:'Second added QA Practice'}
            );
        }""")
        for code,attempt in [('PRAC0001','attempt-practice-a'),('PRAC0002','attempt-practice-b')]:
            page.locator('.rz-v15-practice-join input').fill(code)
            page.locator('.rz-v15-practice-join button[type="submit"]').click()
            page.wait_for_selector('#view-player.rz-c155-classroom #rzC155Classroom .rz-c155-start',timeout=11000)
            assert page.evaluate('window.__studentFixture.attempts.some(a=>a.id==="'+attempt+'")'),'Practice class not created after first-party Classroom join'
            student_v8.nav(page,'practice')
            page.wait_for_selector('[data-practice-attempt="'+attempt+'"]:visible',timeout=11000)
            assert page.locator('.rz-v15-practice-join input').is_visible(), 'Returning to Practice must retain the add-another-code field'
            assert page.locator('.rz-v15-practice-join input').input_value()=='', 'Successful Practice join should clear only used code'
        assert page.locator('[data-practice-attempt="attempt-practice-a"]').count()==1
        assert page.locator('[data-practice-attempt="attempt-practice-b"]').count()==1
        assert not errors,'Student browser errors: '+repr(errors)
        print('PASS V15.2: two independent Practice classes joined; both cards retained; entry persists.')
    finally:ctx.close()


def public_mobile_no_scroll(browser,base):
    ctx=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce')
    page=ctx.new_page()
    try:
        page.goto(base+'/index.html',wait_until='domcontentloaded')
        assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+2"), 'Public homepage horizontal overflow on mobile'
        page.goto(base+'/contact.html',wait_until='domcontentloaded')
        assert page.locator('a[href*="mail.google.com"]').count()>=1
        print('PASS V15.2: public mobile homepage has no horizontal scroll; Contact Gmail link preserved.')
    finally:ctx.close()


if __name__=='__main__':
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),v15.Handler)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(headless=True)
            try:
                base='http://127.0.0.1:'+str(server.server_port)
                role_opt_in(browser,base)
                faculty_paid_countdown(browser,base)
                first_login_only(browser,base)
                multiple_practice_classes(browser,base)
                public_mobile_no_scroll(browser,base)
            finally: browser.close()
    finally:server.shutdown()
