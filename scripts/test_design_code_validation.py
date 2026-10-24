"""Offline component tests of real Design Code assets; no routes, accounts or backend."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results/design-code-validation'
OUT.mkdir(parents=True, exist_ok=True)
CHECKS = []

def check(name, value=True):
    assert value, name
    CHECKS.append(name)
    print('PASS ' + name, flush=True)

def visible(page, selector):
    return page.locator(selector).evaluate('''e => {
      const r=e.getBoundingClientRect();
      return r.top>=0 && r.bottom<=innerHeight && r.left>=0 && r.right<=innerWidth &&
        document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===e;
    }''')

def run(browser):
    context=browser.new_context(viewport={'width':1366,'height':768}, reduced_motion='reduce')
    context.route('**/*', lambda route: route.abort())
    page=context.new_page()
    errors=[]
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.set_content('''<!doctype html><html><body data-rz-design-code="1.0">
      <main style="padding:24px"><form id="form">
      <label>Required title<input id="title" required></label>
      <label>Other detail<input id="other" required></label>
      <button id="save" type="submit">Save resource</button>
      </form><div id="slot"></div><button id="elsewhere">Other task</button></main>
      </body></html>''')
    page.add_style_tag(path=str(ROOT/'rizsim-design-code.css'))
    page.add_script_tag(path=str(ROOT/'rizsim-design-code.js'))
    page.evaluate('''() => {
      window.scrollCalls=[]; const original=Element.prototype.scrollIntoView;
      Element.prototype.scrollIntoView=function(o){scrollCalls.push({id:this.id,block:o?.block});return original.call(this,o)};
      document.getElementById('form').addEventListener('submit',e=>e.preventDefault());
    }''')
    page.locator('#save').click()
    check('Submit focuses the first invalid field, not the last',page.evaluate('document.activeElement.id')=='title')
    check('Missing field has full-field invalid state and adjacent explanation',page.locator('#title.rz-field-invalid[aria-invalid=true] + .rz-inline-error').is_visible())
    check('Already-visible invalid field does not force a scroll',page.evaluate('scrollCalls.length')==0)
    check('Invalid field remains unobscured',visible(page,'#title'))
    page.locator('#title').fill('Preserved title')
    check('Correcting the field clears its error',page.locator('#title').get_attribute('aria-invalid') is None)
    page.locator('#other').fill('Supporting detail')
    check('Typing does not move focus away',page.evaluate('document.activeElement.id')=='other')
    check('Other input is preserved',page.locator('#title').input_value()=='Preserved title')
    page.evaluate('''() => {const slot=document.getElementById('slot');slot.innerHTML='<div style="height:1100px"></div><input id="offscreen" aria-label="Offscreen title"><div style="height:800px"></div>';RizSimUI.invalid(document.getElementById('offscreen'),'Enter the offscreen title.')}''')
    check('Offscreen invalid field is scrolled into view and focused',visible(page,'#offscreen') and page.evaluate('document.activeElement.id')=='offscreen')
    check('Offscreen reveal uses an intentional centered scroll',page.evaluate('scrollCalls.some(x=>x.id==="offscreen" && x.block==="center")'))
    page.evaluate('''() => {document.getElementById('slot').innerHTML='<div id="scroller" style="height:90px;overflow:auto;border:1px solid"><div style="height:160px"></div><input id="nested" aria-label="Nested title"><div style="height:160px"></div></div>';window.scrollTo(0,0);RizSimUI.invalid(document.getElementById('nested'),'Enter the nested title.')}''')
    check('Field clipped by a scrollable panel is revealed, not merely focused',visible(page,'#nested') and page.evaluate('document.getElementById("scroller").scrollTop>0'))
    page.evaluate('''() => {document.getElementById('slot').innerHTML='<details id="details"><summary>Optional details</summary><input id="optional" aria-label="Optional title"></details>';RizSimUI.invalid(document.getElementById('optional'),'Check this optional value.')}''')
    check('An invalid field inside details is expanded and revealed',page.locator('#details').get_attribute('open') is not None and visible(page,'#optional'))
    page.locator('#save').focus()
    page.evaluate("window.answer = null; RizSimUI.confirm('Remove the selected item?', {action:'Remove item',danger:true}).then(value=>window.answer=value);void 0")
    page.wait_for_selector('dialog[open]')
    check('Consequential confirmation initially focuses Cancel',page.evaluate('document.activeElement.textContent')=='Cancel')
    page.keyboard.press('Escape')
    page.wait_for_function('window.answer===false')
    check('Cancellation restores focus without approving the action',page.evaluate('document.activeElement.id')=='save')
    page.locator('#save').focus()
    page.evaluate("RizSimUI.busyStart('unit-loading','Saving resource')")
    check('Busy state disables only the initiating operation',page.locator('#save').is_disabled() and page.locator('#elsewhere').is_enabled())
    page.evaluate("RizSimUI.busyEnd('unit-loading')")
    check('Completing the operation restores the control',page.locator('#save').is_enabled() and page.locator('#save').get_attribute('aria-busy') is None)
    check('Component checks caused no uncaught browser errors',not errors)
    page.screenshot(path=str(OUT/'validation.png'),full_page=True,animations='disabled')
    context.close()

if __name__=='__main__':
    with sync_playwright() as pw:
        kwargs={'headless':True}
        if os.environ.get('RIZSIM_CHROMIUM'):kwargs['executable_path']=os.environ['RIZSIM_CHROMIUM']
        browser=pw.chromium.launch(**kwargs)
        try: run(browser)
        finally: browser.close()
    (OUT/'summary.json').write_text(json.dumps({'status':'passed','count':len(CHECKS),'checks':CHECKS,'backend':'none'},indent=2))
