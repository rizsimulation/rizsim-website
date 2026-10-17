"""Real RizSim Live Classroom V13 integration in Chromium, using V5/V6 synthetic
backend only. Never creates real users, sessions, licences, or SQL records.
"""
import http.server
import threading
from playwright.sync_api import sync_playwright
import test_live_classroom_v5 as v5


def verify(condition, reason):
    assert condition, reason
    print('PASS V13 portal: ' + reason, flush=True)


def wait_ui(page, selector):
    page.wait_for_selector(selector, timeout=18000)


def run(browser, base):
    # Licensed ordinary Faculty, existing real-shaped session: exactly the V12
    # session credentials, original roster and submitted response rows.
    ctx, page, errors = v5.page_for(
        browser, base, 'faculty',
        '?live=simulation-running&selection=sim-1&live_session=existing-1#classroom')
    wait_ui(page, '#rzLiveV13Workspace:not([hidden])')
    verify(page.locator('#rzV13Tabstudio[aria-selected=true]').count() == 1,
           'Session Studio opens by default')
    try:
        page.locator('#rzLiveRunning:visible').wait_for(timeout=6500)
    except Exception:
        print('V13 SESSION DEBUG', page.evaluate('''() => ({
          url:location.href,workspace:RizSimLiveWorkspace?.state(),
          runHidden:document.getElementById('rzLiveRunning')?.hidden,
          runParent:document.getElementById('rzLiveRunning')?.parentElement?.id,
          studioHidden:document.getElementById('rzV13PaneStudio')?.hidden,
          route:window.RizSimLiveClassroom?.navigate?'V5 initialized':'V5 unavailable',
          pageText:document.getElementById('rzLiveRunning')?.innerText?.slice(0,500),
          app:document.getElementById('authenticatedApp')?.className,
          panelRect:document.getElementById('rzLiveRunning')?.getBoundingClientRect().toJSON()
        })'''), flush=True)
        raise
    print('V13 POSITION',page.evaluate('''() => ({
      state:RizSimLiveWorkspace?.state(),
      runParent:document.getElementById('rzLiveRunning')?.parentElement?.id,
      runClosest:!!document.getElementById('rzLiveRunning')?.closest('#rzV13StudioOverview'),
      studio:!!document.getElementById('rzV13StudioOverview'),
      setupParent:document.getElementById('rzLiveSetup')?.parentElement?.id,
      paneParent:document.getElementById('rzV13PaneStudio')?.parentElement?.className,
      choicesParent:document.getElementById('rzLiveChoices')?.parentElement?.className,
      runCount:document.querySelectorAll('#rzLiveRunning').length,
      workspaceCount:document.querySelectorAll('#rzLiveV13Workspace').length
    })'''), flush=True)
    verify(page.locator('#rzLiveRunning').evaluate('n=>!!n.closest("#rzV13StudioOverview")'),
           'original authenticated session runs inside Studio, not copied')
    verify(page.locator('#rzLiveAccessFab').is_visible(),
           'original V12 minimized/reopen QR access remains accessible')
    wait_ui(page, '#rzLiveAccessQR svg')
    page.locator('#rzV13SubviewShare').click()
    wait_ui(page, '#rzV13ShareDetails:not([hidden])')
    creds = page.evaluate('''() => ({
       verified:RizSimLiveClassroom.verifiedShare(),
       studioCode:document.getElementById('rzV13ShareCode').textContent,
       studioLink:document.getElementById('rzV13ShareLink').textContent,
       studioQr:!!document.querySelector('#rzV13ShareQR svg'),
       count:document.querySelectorAll('#rzLiveAccessLayer').length
    })''')
    verify(bool(creds['verified']) and creds['studioCode'] == creds['verified']['code']
           and creds['studioLink'] == creds['verified']['link']
           and creds['studioQr'] and creds['count'] == 1,
           'Share Access uses exactly one existing verified QR, code, link')
    verify(creds['studioLink'].startswith(base + '/access-in.html?'),
           'Student join link is same-origin and points only to Student workspace')
    page.locator('#rzV13SubviewOverview').click()
    page.locator('#rzV13Tabstudents').click()
    wait_ui(page, '#resultRows:visible')
    verify(page.locator('#classroomRosterPanel').is_visible() and
           page.locator('#resultRows').evaluate('n=>!!n.closest("#rzV13Panestudents")'),
           'Student Results houses existing roster and session-scoped records')
    page.locator('#resultRows [data-attempt-id]').first.click()
    wait_ui(page, '#responseModal.show')
    verify('QA Student' in page.locator('#responseModalTitle').inner_text(),
           'original individual response modal still opens')
    page.locator('#responseModalClose').click()
    page.locator('#rzV13Tabinsights').click()
    verify(page.locator('#rzV13Paneinsights').is_visible() and
           page.locator('#rzLiveResultsAnchor').evaluate('n=>!!n.closest("#rzV13Paneinsights")'),
           'Class Insights provides correctly scoped anchor for Step 2 simulation modules')
    verify(page.locator('#rzV13Tabstudio').get_attribute('aria-selected') == 'false',
           'switching sections hides previous controls without destroying them')
    verify(not errors, 'no JavaScript errors for ordinary Faculty flow')
    v5.close(ctx)

    # Course Lead owns this original course: editor and resource workspace stays
    # in Studio; combined course class analytics remain in Insights.
    ctx, page, errors = v5.page_for(
        browser, base, 'course_lead',
        '?live=own-running&selection=course-1&live_session=existing-course#classroom')
    wait_ui(page, '#rzLiveV13Workspace:not([hidden])')
    wait_ui(page, '#rzCourseEnvironment [data-rz-add-resource]')
    verify(page.locator('#rzCourseEnvironment').evaluate('n=>!!n.closest("#rzV13StudioOverview")'),
           'Course Lead course environment and authorized resource actions stay in Studio')
    page.locator('#rzV13Tabinsights').click()
    wait_ui(page, '#courseResultRows:visible')
    verify(page.locator('#courseResultRows').evaluate('n=>!!n.closest("#rzV13Paneinsights")'),
           'owned course combined class results live in Class Insights')
    page.locator('#rzV13Tabstudents').click()
    verify(page.locator('#classroomRosterPanel').is_visible(),
           'Course Lead participant roster lives in Student Results')
    page.locator('#rzV13Tabstudio').click()
    page.locator('#rzV13SubviewShare').click()
    wait_ui(page, '#rzV13ShareDetails:not([hidden])')
    verify(page.locator('#rzV13ShareCode').inner_text().strip() ==
           page.locator('#rzLiveAccessCode').inner_text().strip(),
           'owned course uses existing V12 code with dedicated Share Access view')
    verify(not errors, 'no JS errors for Course Lead course flow')
    v5.close(ctx)

    # Purchased course never grants editing. This calls the existing V6 fixture
    # setup, not a fabricated local copy of a licensed course.
    import test_course_environment_v6 as v6
    ctx, page, errors = v6.page(browser, base, 'faculty', purchased=True)
    v5.mode(page, 2)
    wait_ui(page, '#rzLiveCards .rz-v5-card')
    v5.choose(page, 'Publisher Strategy Course')
    wait_ui(page, '#rzLiveV13Workspace:not([hidden])')
    wait_ui(page, '#rzCourseEnvironment')
    verify(page.locator('#rzCourseEnvironment').evaluate('n=>!!n.closest("#rzV13StudioOverview")'),
           'purchased-course environment stays in Studio')
    verify(page.locator('[data-rz-add-resource]').count() == 0,
           'purchased course cannot gain Course Lead edit/upload action')
    verify(page.locator('#rzV13SubviewShare').is_disabled() and
           page.locator('#rzV13Tabstudents').is_disabled(),
           'purchased-course sharing and Student Results remain unavailable before authorized session')
    verify(not errors, 'no JS errors for purchased course access')
    v5.close(ctx)

    # Forged role / deeplink remains refused by original V5 authority.
    ctx, page, errors = v5.page_for(
        browser, base, 'faculty',
        '?live=own-running&selection=course-1&live_session=existing-course#classroom')
    verify(page.locator('#rzLiveV13Workspace').is_hidden(),
           'ordinary Faculty cannot enter unowned Course Lead workspace')
    verify(not errors, 'no JS errors for unauthorized Course Lead link')
    v5.close(ctx)


if __name__ == '__main__':
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), v5.Handler)
    base = 'http://127.0.0.1:' + str(server.server_port)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            try:
                run(browser, base)
            finally:
                browser.close()
        print('PASS V13 full portal: Faculty, Course Lead, purchased course and unauthorized access', flush=True)
    finally:
        server.shutdown()
        server.server_close()
