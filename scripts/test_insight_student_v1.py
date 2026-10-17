"""SIM01 full Student journey through the *hosted* runner, mocked session backend.
All identities and responses exist only in this isolated test browser."""
import asyncio, json, threading
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]
MOCK_CLOUD=r"""
(function(){
  const C=window.InsightCore,KEY='sim01-ci-fake-authorized-attempt';
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){return null}};
  const persist=state=>localStorage.setItem(KEY,JSON.stringify(state));
  window.__sim01SaveCount=0;
  window.RizSimInsightCloud=Object.freeze({init:async()=>({
    record:read()?.record||null,submitted:!!read()?.submitted,displayName:'RizSim Test Learner',
    async saveRecord(next){
      const prev=read()?.record;
      if(!C.validRecord(next))throw Error('Invalid record');
      if(prev&&!C.compareLocked(prev,next))throw Error('Locked stage altered');
      persist({record:C.clone(next),submitted:false});
      window.__sim01SaveCount++;
      return C.clone(next);
    },
    async submit(){
      const state=read();
      if(!state?.record?.locks.kg||C.committed(state.record)!==14)
        throw Error('Backend rejected incomplete attempt');
      persist({...state,submitted:true});
      window.__sim01SubmissionCount=(window.__sim01SubmissionCount||0)+1;
      return true;
    }
  })});
})();
"""

class QuietHandler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
    def log_message(self,format,*args):pass

async def main():
    server=ThreadingHTTPServer(('127.0.0.1',0),QuietHandler)
    worker=threading.Thread(target=server.serve_forever,daemon=True)
    worker.start()
    port=server.server_address[1]
    try:
      async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True)
        context=await browser.new_context(accept_downloads=True,viewport={"width":1260,"height":860})
        page=await context.new_page()
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        async def stub(route):
          await route.fulfill(status=200,content_type='application/javascript',body=MOCK_CLOUD)
        await page.route('**/simulation-assets/insight-to-implication/rizsim-cloud.js',stub)
        await page.goto(f'http://127.0.0.1:{port}/simulation-insight-to-implication.html?attempt=12345678-1234-4234-8234-123456789abc&session=23456789-1234-4234-8234-123456789abc&access=practice')
        await page.locator('#participant-name').fill('RizSim Test Learner')
        await page.locator('#participant-org').fill('Test Cohort')
        await page.get_by_role('button',name='Begin the activity').click()
        await page.wait_for_selector('button[data-action="choose-review"]')
        for i in range(6):
          await page.locator('button[data-action="choose-review"]').first.click()
          await page.wait_for_function("window.__sim01SaveCount>0")
          if i<5:
            await page.locator('button[data-action="next"]').click()
        await page.locator('button[data-action="lock-review"]').click()
        await page.locator('button[data-action="accept-confirm"]').click()
        await page.wait_for_selector('button[data-action="choose-case"][data-phase="source"]')
        key=await page.evaluate("window.InsightData.source.key")
        await page.locator('button[data-action="choose-case"][data-phase="source"][data-letter="'+key+'"]').click()
        await page.locator('button[data-action="lock-case"]').click()
        await page.locator('button[data-action="accept-confirm"]').click()
        await page.wait_for_selector('#bridge-check')
        await page.locator('#bridge-check').check()
        await page.locator('button[data-action="bridge-ack"]').click()
        await page.wait_for_selector('button[data-action="choose-case"][data-phase="transfer"]')
        key=await page.evaluate("window.InsightData.transfer.key")
        await page.locator('button[data-action="choose-case"][data-phase="transfer"][data-letter="'+key+'"]').click()
        await page.locator('button[data-action="lock-case"]').click()
        await page.locator('button[data-action="accept-confirm"]').click()
        await page.wait_for_selector('button[data-action="feedback-ack"]')
        if await page.locator('#feedback-check').count():
          await page.locator('#feedback-check').check()
        await page.locator('button[data-action="feedback-ack"]').click()
        await page.wait_for_selector('button[data-action="choose-review"][data-phase="kg"]')
        for i in range(6):
          key=await page.evaluate("""() => {
            const b=document.querySelector('button[data-action="choose-review"][data-phase="kg"]');
            return window.InsightCore.BY_ID[b.dataset.id].key;
          }""")
          await page.locator('button[data-action="choose-review"][data-phase="kg"][data-letter="'+key+'"]').click()
          if i<5:
            await page.locator('button[data-action="next"][data-phase="kg"]').click()
        await page.locator('button[data-action="lock-review"][data-phase="kg"]').click()
        await page.locator('button[data-action="accept-confirm"]').click()
        await page.get_by_text('Your learning in view').wait_for()
        await page.get_by_text('Submission confirmed by RizSim').wait_for()
        assert await page.evaluate("window.__sim01SubmissionCount") == 1
        assert await page.get_by_text('Review change').count()>=1
        async with page.expect_download() as result:
          await page.get_by_role('button',name='Download my completed record').click()
        download=await result.value
        exported=json.loads(Path(await download.path()).read_text())
        assert exported['record']['locks']['kg'] is True
        assert exported['record']['schemaVersion']==1
        assert len(exported['record']['picks']['kr'])==6
        assert len(exported['record']['picks']['kg'])==6
        await page.reload()
        await page.get_by_text('Your learning in view').wait_for()
        await page.get_by_text('Submission confirmed by RizSim').wait_for()
        assert await page.locator('button[data-action="choose-review"]').count()==0
        await page.set_viewport_size({'width':390,'height':844})
        (ROOT/'test-results').mkdir(exist_ok=True)
        await page.screenshot(path=str(ROOT/'test-results'/'sim01-student-results-mobile.png'),full_page=True)
        assert not errors,errors
        await browser.close()
        print('SIM01 Student Chromium: PASS — KR→LT→KG→RGA, 14 saves, server confirmation, export and read-only resume.')
    finally:
      server.shutdown()
      server.server_close()

if __name__=='__main__':
    asyncio.run(main())
