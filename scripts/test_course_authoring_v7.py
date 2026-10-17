"""V7 real page browser tests with intercepted synthetic backend only. No production writes."""
import http.server,json,os,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
import test_live_classroom_v5 as base

check=base.check

def open_courses(browser,url,role='course_lead',mobile=False):
    ctx,p,errors=base.page_for(browser,url,role,mobile=mobile)
    if role=='course_lead':
        if mobile:p.locator('#mobileMenuButton').click()
        p.locator('#mainNav [data-auth-view=courses]').click()
        p.wait_for_selector('#view-courses.active')
        p.wait_for_selector('#rzCourseAuthoring .rz-author-paths')
    return ctx,p,errors

def create(p):
    p.locator('.rz-author-paths .rz-author-card').first.hover()
    p.get_by_role('button',name='Create new course',exact=True).click()
    p.wait_for_selector('#rzAuthorTitle')

def add_sim(p):
    c=p.locator('.rz-author-add-grid .rz-author-card').nth(1);c.hover();c.get_by_role('button').click()
    p.wait_for_selector('[data-author-dialog=simulations]')

def resource(p):
    c=p.locator('.rz-author-add-grid .rz-author-card').first;c.hover();c.get_by_role('button').click()
    p.wait_for_selector('[data-author-dialog=resource]')

def run(browser,url):
    ctx,p,errors=open_courses(browser,url)
    check('Courses has two compact authoring cards',p.locator('.rz-author-paths .tall').count()==2 and p.locator('.rz-author-paths .tall').first.evaluate('e=>e.getBoundingClientRect().height<=315'))
    check('Both Course Lead entry actions visible without scrolling or hover',p.locator('.rz-author-paths .tall .rz-author-btn').evaluate_all("es=>es.length===2&&es.every(e=>e.getBoundingClientRect().bottom<innerHeight&&getComputedStyle(e).opacity==='1')"))
    check('No session creation, controls or results appear in Courses',p.locator('#view-courses #createCourseClassroomSessionButton').is_hidden() and p.locator('#view-courses #courseResultsPanel').is_hidden())
    check('Courses entry has no visible legacy workspace',p.locator('#rzCourseLegacy').is_hidden())
    p.screenshot(path=str(base.OUT/'v7-courses-home.png'),full_page=True)
    create(p)
    check('New course uses Publish Course label',p.locator('#rzAuthorSave').inner_text()=='PUBLISH COURSE')
    p.evaluate("() => { window.__v11InvalidScrolls=[];const field=document.getElementById('rzAuthorTitle');const original=field.scrollIntoView.bind(field);field.scrollIntoView=function(o){__v11InvalidScrolls.push({id:field.id,block:o?.block});return original(o)}; }")
    p.locator('#rzAuthorSave').click()
    check('Empty Course title receives inline red guidance',p.locator('#rzAuthorTitle[aria-invalid="true"]').count()==1 and p.locator('#rzAuthorTitle + .rz-inline-error').is_visible())
    check('Save automatically scrolls and focuses the exact missing Course title',p.evaluate('document.activeElement?.id==="rzAuthorTitle"&&__v11InvalidScrolls.some(s=>s.id==="rzAuthorTitle"&&s.block==="center")'))
    p.locator('#rzAuthorTitle').fill('Responsible Marketing Studio')
    p.locator('#rzAuthorDescription').fill('A thoughtfully assembled course with simulations and resources.')
    check('Entry navigation has its own URL','courses=create' in p.url)
    check('Two compact add actions and two content columns',p.locator('.rz-author-add-grid .compact').count()==2 and p.locator('.rz-author-columns section').count()==2)
    add_sim(p)
    check('Only actively licensed simulations appear',p.locator('[data-pick-simulation]').count()==2 and p.locator('[data-pick-simulation=sim-revoked]').count()==0)
    check('Simulation picker offers add not run',p.locator('[data-author-dialog=simulations]').get_by_role('button',name='Run Simulation').count()==0)
    card=p.locator('[data-pick-simulation=sim-1]');card.hover();card.get_by_role('button').click()
    check('Added simulation cannot be duplicated',p.locator('[data-pick-simulation=sim-1] button').is_disabled())
    p.locator('[data-author-dialog=simulations] .rz-author-close').click()
    check('Added simulation appears in left list',p.locator('#rzAuthorSimulations [data-simulation-id=sim-1]').count()==1)
    check('Staging a simulation does not create a course or session',p.evaluate('__fixture.authorCourses.length')==3 and p.evaluate('__fixture.sessions.length')==2)
    resource(p)
    check('Resource source picker is nearly screen sized',p.locator('[data-author-dialog=resource]').evaluate('n=>n.offsetWidth')>950)
    p.locator('#rzAuthorLink').fill('javascript:alert(1)');p.locator('#rzAuthorLink').press('Enter')
    check('Invalid link shows inline red guidance',p.locator('#rzAuthorLink[aria-invalid="true"]').count()==1 and p.locator('.rz-inline-error').last.is_visible())
    
    # The invalid link is corrected directly in the same picker, without dismissing an error dialog.
    check('Invalid link cannot enable publish',p.locator('[data-author-link-publish]').is_disabled())
    p.locator('#rzAuthorLink').fill('https://example.org/course-reading');p.locator('[data-author-link-publish]').click()
    check('Link details form does not repeat URL input',p.locator('[data-author-dialog=details] input[inputmode=url]').count()==0 and p.locator('[data-author-dialog=details] select').count()==0)
    p.locator('#rzAuthorResourceTitle').fill('A responsible marketing reading')
    p.locator('#rzAuthorResourcePublish').click()
    check('Draft-resource success is truthful, not class publication','Added to course draft' in p.locator('.rz-author-modal').inner_text())
    p.locator('.rz-author-modal').get_by_role('button',name='Done').click()
    check('Link appears in right content list',p.locator('#rzAuthorResources .rz-author-item').count()==1)
    resource(p)
    p.locator('.rz-author-file-input').set_input_files({'name':'course-handout.pdf','mimeType':'application/pdf','buffer':b'%PDF-1.4\nFixture learning resource'})
    p.wait_for_selector('[data-author-file-publish]:not([disabled])')
    check('Browse selection immediately shows filename and type caption','course-handout.pdf' in p.locator('[data-author-file-caption]').inner_text() and 'PDF' in p.locator('[data-author-file-caption]').inner_text())
    check('File picker enables Review File only after validating the selected PDF',
          p.locator('[data-author-review=picker]').is_enabled())
    p.locator('[data-author-review=picker]').click()
    check('Instructor can inspect local selected PDF before metadata or course publication',
          p.locator('[data-author-dialog=draft-preview] iframe[src^="blob:"]').count()==1)
    p.locator('[data-author-dialog=draft-preview]').get_by_role('button',name='Back to course builder').click()
    check('Returning from picker preview keeps file selection and Publish action',
          p.locator('[data-author-dialog=resource]').is_visible() and
          p.locator('[data-author-file-publish]').is_enabled())
    p.screenshot(path=str(base.OUT/'v7-file-selected.png'),full_page=True)
    p.locator('[data-author-file-publish]').click()
    check('File details omit redundant file input',p.locator('[data-author-dialog=details] input[type=file]').count()==0)
    check('Resource type options are selectable, not dropdown',p.locator('[data-author-dialog=details] input[name="author-resource-type"]').count()==7 and p.locator('[data-author-dialog=details] select').count()==0)
    check('Course file defaults to Secure View',p.locator('[data-author-dialog=details] input[value=secure_view]').is_checked())
    check('Course builder shows two file delivery choices',p.locator('[data-author-dialog=details] .rz-delivery-choices label').count()==2)
    p.locator('[data-author-dialog=details] input[value=downloadable]').check()
    before_preview=p.evaluate('__fixture.calls.filter(c=>c.kind==="storage"||c.name==="save_my_rizsim_course_authoring").length')
    p.locator('[data-author-dialog=details] [data-author-review=details]').click()
    preview=p.locator('[data-author-dialog=draft-preview]')
    check('Course Builder reviews a selected PDF before adding it to the draft',
        preview.is_visible() and preview.locator('iframe.rz-author-preview-frame[src^="blob:"]').count()==1 and
        'not yet saved' in preview.inner_text())
    check('Local PDF preview retains intended student delivery setting',
        preview.get_attribute('data-delivery-mode')=='downloadable' and 'Student access after saving: Downloadable' in preview.inner_text())
    check('Review preview never uploads or saves a file',
        p.evaluate('__fixture.calls.filter(c=>c.kind==="storage"||c.name==="save_my_rizsim_course_authoring").length')==before_preview)
    p.screenshot(path=str(base.OUT/'v7-course-draft-pdf-preview.png'),full_page=True)
    preview.get_by_role('button',name='Back to course builder').click()
    check('Review closes back to metadata without resetting the file choice',
        p.locator('[data-author-dialog=details]').is_visible() and
        p.locator('[data-author-dialog=details] input[value=downloadable]').is_checked())
    p.evaluate("() => { const field=document.getElementById('rzAuthorResourceTitle');const original=field.scrollIntoView.bind(field);field.scrollIntoView=function(o){__v11InvalidScrolls.push({id:field.id,block:o?.block});return original(o)}; }")
    p.locator('#rzAuthorResourceTitle').fill('')
    p.locator('#rzAuthorResourcePublish').click()
    check('Missing file title auto-scrolls and focuses its error',p.evaluate('document.activeElement?.id==="rzAuthorResourceTitle"&&__v11InvalidScrolls.some(s=>s.id==="rzAuthorResourceTitle"&&s.block==="center")') and p.locator('#rzAuthorResourceTitle[aria-invalid="true"] + .rz-inline-error').is_visible())
    p.locator('#rzAuthorResourceTitle').fill('Course handout')
    p.locator('#rzAuthorResourcePublish').click()
    success_review=p.locator('[data-author-review=staged-success]')
    check('Newly added draft file offers an immediate Review File action',success_review.count()==1)
    success_review.click()
    check('Success-dialog Review File opens the local PDF rather than a saved material URL',
        p.locator('[data-author-dialog=draft-preview] iframe[src^="blob:"]').count()==1)
    p.locator('[data-author-dialog=draft-preview]').get_by_role('button',name='Back to course builder').click()
    p.locator('.rz-author-modal').get_by_role('button',name='Done').click()
    draft_review=p.locator('#rzAuthorResources [data-author-review=staged]')
    check('Staged document has a Review File control directly in Course Builder',
        draft_review.count()==1 and p.locator('#rzAuthorResources a.rz-review-file').count()==0)
    draft_review.click()
    check('Staged Course Builder review displays the draft PDF without saving the course',
        p.locator('[data-author-dialog=draft-preview] iframe[src^="blob:"]').count()==1 and
        'Local draft' in p.locator('[data-author-dialog=draft-preview]').inner_text())
    p.locator('[data-author-dialog=draft-preview]').get_by_role('button',name='Back to course builder').click()
    check('No resource uploaded before final course save',p.evaluate('__fixture.calls.filter(x=>x.kind==="storage").length')==0)
    p.screenshot(path=str(base.OUT/'v7-course-editor.png'),full_page=True)
    p.locator('#rzAuthorSave').click();p.wait_for_selector('.rz-author-modal h2:text("Course published")')
    check('Final Publish Course creates exactly one complete course',p.evaluate('__fixture.authorCourses.length')==4)
    check('New library resources are not published to students',p.evaluate('__fixture.materials.every(m=>m.published_to_class===false)'))
    check('New course saved with file and link',p.evaluate('__fixture.materials.length')==2)
    check('Course authoring persisted downloadable setting',p.evaluate('__fixture.materials.find(m=>m.source_type==="file").delivery_mode')=='downloadable')
    check('Saved resource renders mode badge',p.locator('#rzAuthorResources .rz-delivery-chip.is-downloadable').count()==1)
    review=p.locator('#rzAuthorResources a.rz-review-file')
    check('After save, local draft review switches to authorized server viewer',
        p.locator('#rzAuthorResources [data-author-review=staged]').count()==0)
    check('Saved Course Lead file has a reusable authorized Review File link',review.count()==1 and review.get_attribute('target')=='_blank' and 'noopener' in review.get_attribute('rel') and review.get_attribute('href').startswith('/course-material-viewer.html?material='))
    check('Upload uses reserved own-course authoring prefix','/authoring/user-fixture/' in p.evaluate('__fixture.calls.find(x=>x.kind==="storage").path'))
    p.locator('.rz-author-modal').get_by_role('button',name='Done').click()
    check('Saved course opens manage editor with Save Changes',p.locator('#rzAuthorSave').inner_text()=='SAVE CHANGES' and 'courses=edit' in p.url)
    check('Unmodified saved course cannot be resubmitted',p.locator('#rzAuthorSave').is_disabled())
    p.locator('#rzAuthorTitle').fill('Responsible Marketing Revised');p.locator('#rzAuthorSave').click();p.wait_for_selector('.rz-author-modal h2:text("Changes saved")')
    p.locator('.rz-author-modal').get_by_role('button',name='Done').click()
    check('Manage saves title without duplicate course',p.evaluate('__fixture.authorCourses.length')==4 and p.evaluate('__fixture.authorCourses.at(-1).title')=='Responsible Marketing Revised')
    check('Authoring never calls a session-create or class-publication RPC',p.evaluate('__fixture.calls.filter(x=>/^(create_rizsim_.*session|set_rizsim_resource_publication|create_rizsim_runtime_resource)$/.test(x.name||"")).length')==0)
    # A removed item is staged only; cancellation must leave it in the draft.
    item=p.locator('#rzAuthorResources .rz-author-item').first;item.hover();item.get_by_role('button').click()
    p.locator('.rz-author-modal').get_by_role('button',name='Cancel',exact=True).click()
    check('Cancel resource removal preserves the item',p.locator('#rzAuthorResources .rz-author-item').count()==2)
    item.hover();item.get_by_role('button').click();p.locator('.rz-author-modal').get_by_role('button',name='Delete',exact=True).click()
    check('Confirmed resource removal is staged until Save Changes',p.locator('#rzAuthorResources .rz-author-item').count()==1 and p.evaluate('__fixture.materials.filter(m=>m.active).length')==2)
    p.locator('#rzAuthorSave').click();p.wait_for_selector('.rz-author-modal h2:text("Changes saved")');p.locator('.rz-author-modal').get_by_role('button',name='Done').click()
    check('Saved resource removal retains stored record',p.evaluate('__fixture.materials.length')==2 and p.evaluate('__fixture.materials.filter(m=>m.active).length')==1)
    p.locator('.rz-author-crumb').get_by_role('button',name='Manage created courses').click();p.wait_for_selector('.rz-author-course-grid')
    check('Manage lists created courses as cards',p.locator('.rz-author-course-grid [data-course-id]').count()==4)
    p.screenshot(path=str(base.OUT/'v7-manage-courses.png'),full_page=True)
    # Course without session can be deleted; active teaching course cannot.
    card=p.locator('.rz-author-course-grid [data-course-id=course-2]');card.hover();card.get_by_role('button',name='Delete',exact=True).click()
    p.wait_for_selector('.rz-author-modal');p.locator('.rz-author-modal').get_by_role('button',name='Cancel').click()
    check('Cancel course deletion does not write',p.evaluate('__fixture.calls.filter(x=>x.name==="delete_my_rizsim_course_authoring").length')==0)
    card.hover();card.get_by_role('button',name='Delete',exact=True).click();p.wait_for_selector('.rz-author-modal');p.locator('.rz-author-modal').get_by_role('button',name='Delete',exact=True).click()
    p.wait_for_function('document.querySelectorAll(".rz-author-course-grid [data-course-id]").length===3')
    check('Deleted course is removed from the authoring list',p.locator('.rz-author-course-grid [data-course-id=course-2]').count()==0)
    card=p.locator('.rz-author-course-grid [data-course-id=course-1]');card.hover();card.get_by_role('button',name='Delete',exact=True).click();p.wait_for_selector('.rz-author-modal');p.locator('.rz-author-modal').get_by_role('button',name='Delete',exact=True).click()
    p.wait_for_selector('.rz-author-modal .rz-author-error:not([hidden])')
    check('Open-session deletion guard leaves teaching session untouched',p.evaluate('__fixture.sessions.every(s=>s.active)'))
    p.locator('.rz-author-modal .rz-author-close').click()
    card.hover();card.get_by_role('button',name='Manage').click();p.wait_for_selector('#rzAuthorTitle')
    p.locator('#rzAuthorTitle').fill('My unsaved change');p.evaluate('__fixture.authorSaveFail=true');p.locator('#rzAuthorSave').click()
    p.wait_for_selector('#rzAuthorSaveError:not([hidden])')
    check('Failed save retains typed draft and supports retry',p.locator('#rzAuthorTitle').input_value()=='My unsaved change' and p.locator('#rzAuthorSave').is_enabled())
    p.evaluate('__fixture.authorSaveFail=false');p.locator('#rzAuthorSave').click();p.wait_for_selector('.rz-author-modal h2:text("Changes saved")');p.locator('.rz-author-modal').get_by_role('button',name='Done').click()
    check('Retry save does not duplicate a course',p.evaluate('__fixture.authorCourses.length')==4)
    # Return to Live Classroom to check its existing controls are not broken by hidden legacy mount.
    p.locator('#mainNav [data-auth-view=classroom]').click();p.wait_for_selector('#view-classroom.active')
    check('Leaving authoring preserves Live Classroom',p.locator('#rzLiveChoices .rz-v5-card').count()==3)
    check('No uncaught browser errors in authoring flows',not errors)
    base.close(ctx)

    ctx,p,errors=open_courses(browser,url,mobile=True);create(p)
    check('Mobile authoring has no horizontal overflow',p.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    check('Touch add actions stay visible',p.locator('.rz-author-add-grid .reveal').first.evaluate('n=>getComputedStyle(n).opacity')=='1')
    p.screenshot(path=str(base.OUT/'v7-editor-mobile.png'),full_page=True)
    resource(p)
    p.locator('.rz-author-drop').evaluate("el=>{const dt=new DataTransfer();dt.items.add(new File(['%PDF-1.4\\nfixture'],'drop.pdf',{type:'application/pdf'}));el.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:dt}));}")
    p.wait_for_selector('[data-author-file-publish]:not([disabled])')
    check('Drag and drop displays the selected file','drop.pdf' in p.locator('[data-author-file-caption]').inner_text())
    p.locator('[data-author-dialog=resource] .rz-author-close').click()
    check('Closing picker does not add an unconfirmed resource',p.locator('#rzAuthorResources .rz-author-item').count()==0)
    resource(p)
    import struct,zlib
    def chunk(t,payload):
        return struct.pack('>I',len(payload))+t+payload+struct.pack('>I',zlib.crc32(t+payload)&0xffffffff)
    png=(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',1,1,8,6,0,0,0))+
         chunk(b'IDAT',zlib.compress(b'\x00\xff\x00\x00\xff'))+chunk(b'IEND',b''))
    p.locator('.rz-author-file-input').set_input_files({'name':'small-image.png','mimeType':'image/png','buffer':png})
    p.wait_for_selector('[data-author-file-publish]:not([disabled])')
    p.locator('[data-author-file-publish]').click()
    p.locator('[data-author-dialog=details] [data-author-review=details]').tap()
    p.wait_for_function('''() => {
      const image=document.querySelector('[data-author-dialog="draft-preview"] img.rz-author-preview-image');
      return !!image && image.complete && image.naturalWidth===1;
    }''')
    check('Touch-enabled Course Builder reviews local PNG files without uploading',
       p.locator('[data-author-dialog=draft-preview] img[src^="blob:"]').count()==1 and
       p.evaluate('__fixture.calls.filter(x=>x.kind==="storage").length')==0)
    check('Mobile image preview stays within page width',
       p.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    p.locator('[data-author-dialog=draft-preview]').get_by_role('button',name='Back to course builder').tap()
    p.locator('[data-author-dialog=details] .rz-author-close').tap()
    p.locator('[data-author-dialog=resource] .rz-author-close').tap()
    check('Preview and cancellation leave course draft unchanged',p.locator('#rzAuthorResources .rz-author-item').count()==0)
    base.close(ctx)

    ctx,p,errors=open_courses(browser,url,role='faculty')
    check('Ordinary Faculty has no Courses navigation',not p.locator('#mainNav [data-auth-view=courses]').is_visible())
    denied=p.evaluate('async()=>{try{await RizSimFacultyBridge.authoring.list();return false}catch(e){return /Course Lead/.test(e.message)}}')
    check('Authoring adapter denies ordinary Faculty without backend request',denied and p.evaluate('__fixture.calls.filter(x=>x.name==="get_my_rizsim_course_authoring").length')==0)
    base.close(ctx)

if __name__=='__main__':
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),base.Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as tool:
            kwargs={'headless':True}
            if os.environ.get('RIZSIM_CHROMIUM'):kwargs['executable_path']=os.environ['RIZSIM_CHROMIUM']
            browser=tool.chromium.launch(**kwargs)
            try:run(browser,'http://127.0.0.1:'+str(server.server_port))
            except Exception:
                for i,c in enumerate(base.contexts):
                    for j,p in enumerate(c.pages):
                        try:p.screenshot(path=str(base.OUT/f'v7-failure-{i}-{j}.png'),full_page=True);(base.OUT/f'v7-failure-{i}-{j}.html').write_text(p.content())
                        except Exception:pass
                raise
            finally:browser.close()
        (base.OUT/'v7-summary.json').write_text(json.dumps({'status':'passed','checks':base.checks,'count':len(base.checks),'backend':'synthetic only'},indent=2))
    finally:server.shutdown()
