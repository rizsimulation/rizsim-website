"""V15.1 no-credit browser regression: active Practice, legacy panel, delayed
Library mounting and responsive verified dashboard summaries. Synthetic only.
"""
import http.server
import threading
from playwright.sync_api import sync_playwright
import test_v15_classroom as base_v15


def page_for(browser, base_url, role='course_lead', mobile=False):
    ctx = browser.new_context(viewport={'width':390 if mobile else 1366, 'height':844 if mobile else 900},
                              is_mobile=mobile, has_touch=mobile, reduced_motion='reduce')
    ctx.add_init_script('window.__testRole='+repr(role)+';')
    def handle(route):
        url=route.request.url
        if url=='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm':
            route.fulfill(content_type='text/javascript',body=base_v15.MOCK)
        elif url.startswith(base_url+'/'):
            route.continue_()
        else:
            route.abort()
    ctx.route('**/*',handle)
    page=ctx.new_page()
    return ctx,page


def test_course_lead(browser, base_url):
    ctx,p=page_for(browser,base_url)
    try:
        p.goto(base_url+'/access-out.html#classroom',wait_until='networkidle')
        p.wait_for_selector('#authenticatedApp.show')
        p.wait_for_function("window.RizSimV15?.activeRoom&&window.__fixture?.sessions?.length>0")
        p.evaluate("""async () => {
            const sessions=window.__fixture.sessions;
            for (const s of sessions){s.active=false;s.session_status='closed';}
            const practice=sessions[0];
            practice.active=true;practice.session_status='open';
            practice.access_mode='practice';
            practice.practice_starts_at='2020-01-01T00:00:00Z';
            practice.practice_ends_at='2099-01-01T00:00:00Z';
            practice.live_ends_at=null;
            await RizSimFacultyBridge.runtime.refresh();
        }""")
        p.wait_for_function("!!RizSimV15.activeRoom(RizSimFacultyBridge.getSnapshot())")
        assert not p.evaluate('Boolean(RizSimV15.liveRoom(RizSimFacultyBridge.getSnapshot()))'), 'Practice-only must not masquerade as Live Class'
        p.evaluate("RizSimV15.choose({mode:'simulation',selection:'sim-1'})")
        assert p.locator('.rz-v15-choice[open]').count()==0,'Course Lead cannot launch another simulation while Practice is active'
        assert p.locator('.rz-v15-manager:not([hidden])').count()==1,'Blocked launch should reveal original verified assignment manager'
        original=p.locator('#classroomCreatedResult')
        assert original.count()==1,'Original secure QR source must be preserved'
        assert original.is_hidden(),'Obsolete full-width Schedule/Licence/Created card must not be visible'
        assert p.locator('.rz-v151-legacy-access-source').count()==1,'Old panel is hidden structurally and exclusively'
        p.evaluate("""async()=>{
           window.__fixture.sessions[0].active=false;
           window.__fixture.sessions[0].session_status='closed';
           await RizSimFacultyBridge.runtime.refresh();
        }""")
        p.wait_for_function('!RizSimV15.activeRoom(RizSimFacultyBridge.getSnapshot())')
        p.evaluate("RizSimV15.choose({mode:'simulation',selection:'sim-1'})")
        p.wait_for_selector('.rz-v15-choice[open]')
        assert p.locator('.rz-v15-choice-option').count()==2,'End restores Live Class and Practice choices'
        print('PASS V15.1: Practice blocks concurrent Course Lead launches; End restores choices; original access card stays hidden.')
    finally:
        ctx.close()


def test_faculty_independence(browser,base_url):
    ctx,p=page_for(browser,base_url,'faculty')
    try:
        p.goto(base_url+'/access-out.html#classroom',wait_until='networkidle')
        p.wait_for_selector('#authenticatedApp.show')
        p.evaluate("""async()=>{
            const s=window.__fixture.sessions[0];
            s.active=true;s.session_status='open';s.access_mode='practice';
            s.practice_ends_at='2099-01-01T00:00:00Z';s.live_ends_at=null;
            await RizSimFacultyBridge.runtime.refresh();
        }""")
        p.wait_for_function('!!RizSimV15.activeRoom(RizSimFacultyBridge.getSnapshot())')
        p.evaluate("RizSimV15.choose({mode:'simulation',selection:'sim-1'})")
        p.wait_for_selector('.rz-v15-choice[open]')
        print('PASS V15.1: Standard Faculty concurrent-session rights are unchanged.')
    finally:
        ctx.close()


def test_delayed_library(browser,base_url):
    ctx=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
    p=ctx.new_page()
    try:
        p.goto(base_url+'/index.html',wait_until='domcontentloaded')
        p.set_content('<!doctype html><html><body><main id="studentApp"></main></body></html>')
        p.add_script_tag(url=base_url+'/rizsim-v15-launch-countdowns.js')
        assert p.locator('#rzV15LibraryLaunch').count()==0,'Countdown must not be mounted without the Library'
        p.evaluate("""()=>{
          const library=document.createElement('div');
          library.id='rzStudentSimulationLibrary';
          document.getElementById('studentApp').append(library);
        }""")
        p.wait_for_selector('#rzV15LibraryLaunch')
        assert p.locator('#rzV15LibraryLaunch').count()==1,'Exactly one clock should mount after the Library'
        assert p.locator('#rzV15LibraryTime').inner_text().strip(),'The publication countdown must be populated'
        p.evaluate("""()=>{
          document.getElementById('studentApp').replaceChildren();
          const library=document.createElement('div');library.id='rzStudentSimulationLibrary';
          document.getElementById('studentApp').append(library);
          window.dispatchEvent(new Event('focus'));
        }""")
        p.wait_for_selector('#rzV15LibraryLaunch')
        assert p.locator('#rzV15LibraryLaunch').count()==1,'Clock must recover after dashboard reconstruction without duplicating'
        print('PASS V15.1: Six-day Library clock mounts after delayed Student dashboard and after reconstruction.')
    finally:
        ctx.close()


def test_dashboard(browser,base_url):
    ctx=browser.new_context(viewport={'width':390,'height':844},reduced_motion='reduce')
    p=ctx.new_page()
    try:
        p.goto(base_url+'/index.html',wait_until='domcontentloaded')
        p.set_content("""<!doctype html><html><body>
        <div id="authenticatedApp" class="show">
          <section id="rzV13Panestudents">
            <table><thead><tr><th>Student</th><th>Submission</th><th>Progress</th></tr></thead>
            <tbody><tr><td>QA Learner 1</td><td>Submitted</td><td>100%</td></tr>
            <tr><td>QA Learner 2</td><td>In progress</td><td>60%</td></tr></tbody></table>
          </section>
          <section id="rzV13Paneinsights"></section>
        </div></body></html>""")
        p.add_style_tag(url=base_url+'/rizsim-v15-premium.css')
        p.evaluate("""()=>{
           window.RizSimFacultyBridge={getSnapshot:()=>({role:'course_lead'})};
           window.RizSimLiveWorkspace={state:()=>({visible:true,stage:'running',session:'session-qa'})};
           window.rizsimSharedAuth={rpc:async()=>({error:null,data:[
             {attempt_status:'submitted',submitted_at:'2026-10-18T00:00:00Z'},
             {attempt_status:'in_progress',submitted_at:null}
           ]})};
        }""")
        p.add_script_tag(url=base_url+'/rizsim-v15-dashboards.js')
        p.wait_for_selector('#rzV151PresenterProgress')
        p.wait_for_selector('.rz-v15-compact-table td[data-rz-label]')
        assert p.locator('.rz-v151-progress-rate').inner_text()=='50% submitted'
        assert p.locator('td[data-rz-tone="complete"]').count()==1
        assert p.locator('td[data-rz-tone="working"]').count()==1
        assert p.locator('#rzV15studentsMetrics .rz-v15-kpi').count()==3
        assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'Responsive roster must not cause horizontal overflow'
        print('PASS V15.1: compact colour-coded Student records and accurate Presenter participation, mobile no overflow.')
    finally:
        ctx.close()


if __name__=='__main__':
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),base_v15.Handler)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(headless=True)
            try:
                url='http://127.0.0.1:'+str(server.server_port)
                test_course_lead(browser,url)
                test_faculty_independence(browser,url)
                test_delayed_library(browser,url)
                test_dashboard(browser,url)
            finally:browser.close()
    finally:server.shutdown()
