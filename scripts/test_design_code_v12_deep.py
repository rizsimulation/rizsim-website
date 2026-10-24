"""Deeper visual states using intercepted synthetic services, never production data.
PDF rasterizer is a deterministic fixture: this tests original viewer controls,
not pdf.js fidelity or production authorization. The original viewer JS runs unchanged.
"""
import http.server,threading,json,re,traceback,io
from pathlib import Path
from PIL import Image,ImageDraw
from playwright.sync_api import sync_playwright
import test_design_code_v1 as base
from test_design_code_v12 import CAPTURE,FAMILIES
OUT=base.ROOT/'test-results'/'design-code-v12-deep';OUT.mkdir(parents=True,exist_ok=True)
CHECKS=[];STATES=[]
def check(name,value=True,detail=None):
 CHECKS.append({'name':name,'passed':bool(value),'detail':detail});print(('PASS ' if value else 'FAIL ')+name,flush=True)
def shot(p,name):
 p.wait_for_timeout(100)
 row=p.evaluate(CAPTURE,FAMILIES+',.rz-wa-button,.rz-support-send');row['state']=name;STATES.append(row)
 check(name+' shared refinement active',row['ready']=='1')
 bad=[x for x in row['buttons'] if x['family'] and x['label'] and not x['disabled'] and x['opacity']>.99 and (x['font']<13.9 or (not x['gradient'] and x['contrast']<4.49))]
 check(name+' readable task actions',not bad,bad)
 p.screenshot(path=str(OUT/(name+'.png')),full_page=False,animations='disabled')
PDF="""export const GlobalWorkerOptions={};export function getDocument(){return {promise:Promise.resolve({numPages:3,async getPage(n){return {getViewport({scale}){return {width:600*scale,height:780*scale}},render({canvasContext:c,viewport:v}){c.fillStyle='#ffffff';c.fillRect(0,0,v.width,v.height);c.fillStyle='#193b4a';c.font='20px sans-serif';c.fillText('Synthetic resource preview - page '+n,24,48);c.font='14px sans-serif';c.fillText('UI test fixture. No learner content.',24,80);c.strokeStyle='#cbdeda';for(let i=0;i<12;i++){c.beginPath();c.moveTo(24,120+i*32);c.lineTo(v.width-24,120+i*32);c.stroke()}return {promise:Promise.resolve(),cancel(){}}}}}})}};"""
MOCK="""const user={id:'qa-visual-user',email:'qa@example.test',user_metadata:{full_name:'Synthetic QA'}};const ok=data=>({data,error:null});const context={title:'Synthetic design review handout',course_title:'QA Course',source_type:'file',mime_type:window.__mime||'application/pdf',product_type:'learning_material',file_name:'qa-handout.pdf'};function value(name){if(window.__denied)return ok(null);if(name==='get_rizsim_material_delivery_mode')return ok(window.__mode||'secure_view');return ok(name==='get_rizsim_resource_view_context'?[context]:context)}export function createClient(){return {auth:{async getUser(){return ok({user})},async getSession(){return ok({session:{user,access_token:'synthetic-test-token'}})}},rpc(name){const v=value(name);return {then(a,b){return Promise.resolve(v).then(a,b)},async maybeSingle(){return v}}},from(){return {select(){return this},eq(){return this},async maybeSingle(){return ok({display_name:'Synthetic QA'})}}}}}"""

def viewers(browser,url,size):
 for kind,mode in [('course','secure_view'),('resource','secure_view'),('course','downloadable')]:
  ctx=browser.new_context(viewport={'width':size[0],'height':size[1]},reduced_motion='reduce',has_touch=size[0]<600,is_mobile=size[0]<600)
  ctx.add_init_script("window.__mode="+json.dumps(mode)+";window.__mime="+json.dumps('image/png' if mode=='downloadable' else 'application/pdf'))
  im=Image.new('RGB',(600,500),'white');ImageDraw.Draw(im).text((30,30),'Synthetic downloadable resource - no learner content',fill='#193b4a');b=io.BytesIO();im.save(b,format='PNG')
  def intercept(r):
   u=r.request.url
   if 'supabase-js' in u:r.fulfill(content_type='text/javascript',body=MOCK)
   elif 'pdf.min.mjs' in u:r.fulfill(content_type='text/javascript',body=PDF)
   elif '/functions/v1/rizsim-' in u:r.fulfill(content_type='image/png' if mode=='downloadable' else 'application/pdf',body=b.getvalue() if mode=='downloadable' else b'%PDF-1.4 synthetic rasterizer fixture')
   elif u.startswith(url+'/'):r.continue_()
   elif 'fonts.googleapis.com' in u:r.fulfill(content_type='text/css',body='')
   else:r.abort()
  ctx.route('**/*',intercept);p=ctx.new_page();p.set_default_timeout(8000);errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  name=kind+'-'+mode+'-'+str(size[0]);route='course-material-viewer.html?material=00000000-0000-4000-8000-000000000001' if kind=='course' else 'resource-viewer.html?resource=00000000-0000-4000-8000-000000000001'
  try:
   p.goto(url+'/'+route,wait_until='domcontentloaded')
   if mode=='downloadable':
    p.wait_for_selector('#downloadableImage:visible');check(name+' downloadable controls retained',p.locator('#downloadButton').is_visible() and p.locator('#pageControls').is_hidden())
    shot(p,name)
   else:
    canvas='#pdfCanvas' if kind=='course' else '#pageCanvas';p.wait_for_selector(canvas+':visible')
    nextid='#nextPage';counter='#pageCounter' if kind=='course' else '#pageIndicator';zlabel='#zoomLabel' if kind=='course' else '#zoomIndicator'
    p.locator(nextid).click();p.wait_for_function('(s)=>document.querySelector(s).textContent.includes("2")',arg=counter)
    check(name+' original page navigation works','2' in p.locator(counter).inner_text())
    before=p.locator(zlabel).inner_text();p.locator('#zoomIn').click();p.wait_for_timeout(250);check(name+' original zoom works',p.locator(zlabel).inner_text()!=before)
    p.locator('#zoomOut').click();p.wait_for_timeout(250);p.evaluate('scrollTo(0,0)');shot(p,name)
    bottom='#bottomToolbar' if kind=='course' else '#viewerToolbarBottom'
    check(name+' bottom controls retain natural flow',p.locator(bottom).evaluate('(n)=>getComputedStyle(n).position')=='static')
    p.locator(bottom).scroll_into_view_if_needed();shot(p,name+'-bottom')
   check(name+' no page errors',not errors,errors)
  except Exception:check(name+' workflow',False,traceback.format_exc());shot(p,name+'-failure')
  finally:ctx.close()
 # Explicit denied state; no attempt to weaken the existing app's access checks.
 ctx=browser.new_context(viewport={'width':size[0],'height':size[1]},reduced_motion='reduce');ctx.add_init_script('window.__denied=true')
 def deny(r):
  u=r.request.url
  if 'supabase-js' in u:r.fulfill(content_type='text/javascript',body=MOCK)
  elif 'pdf.min.mjs' in u:r.fulfill(content_type='text/javascript',body=PDF)
  elif u.startswith(url+'/'):r.continue_()
  else:r.abort()
 ctx.route('**/*',deny);p=ctx.new_page()
 try:
  p.goto(url+'/course-material-viewer.html?material=00000000-0000-4000-8000-000000000001',wait_until='domcontentloaded');p.get_by_text('Access unavailable',exact=True).wait_for();check('denied '+str(size)+' has no document',not p.locator('#pdfCanvas').is_visible());shot(p,'course-denied-'+str(size[0]))
 finally:ctx.close()

def extra_tabs(browser,url,role,size):
 ctx,p,errors=base.open_page(browser,url,'access-in.html' if role=='student' else 'access-out.html',role,size)
 label=role+'-'+str(size[0])
 try:
  if role=='student':
   base.nav(p,role,'learning')
   for name in ['All','In progress','Submitted']:
    p.locator('.rz-st-filters').get_by_role('button',name=name,exact=True).click();shot(p,label+'-learning-'+name.replace(' ','-'))
   base.nav(p,role,'practice');shot(p,label+'-practice')
  elif role=='owner':
   base.nav(p,role,'administration');p.locator('#rzOwnerReportsTab').click();p.wait_for_timeout(200);shot(p,label+'-support-reports')
   base.nav(p,role,'account');p.locator('#rzOwnerWebAnalytics').wait_for(state='visible');p.locator('#rzOwnerWebAnalytics').scroll_into_view_if_needed();shot(p,label+'-web-analytics')
  else:
   base.nav(p,role,'courses');p.get_by_role('button',name='Create new course',exact=True).click();p.wait_for_selector('#rzAuthorTitle');shot(p,label+'-create-course')
   p.locator('#rzAuthorSave').click();check(label+' invalid course title stays focused',p.evaluate("document.activeElement.id==='rzAuthorTitle'"));shot(p,label+'-course-invalid')
   p.locator('#rzAuthorTitle').fill('Synthetic visual review')
   for i,kind in [(0,'resource'),(1,'simulations')]:
    p.locator('.rz-author-add-grid .rz-author-card').nth(i).get_by_role('button').click();p.wait_for_selector('[data-author-dialog='+kind+']');shot(p,label+'-picker-'+kind);p.locator('[data-author-dialog='+kind+'] .rz-author-close').click()
  check(label+' no script errors',not errors,errors)
 except Exception:check(label+' extra tabs',False,traceback.format_exc())
 finally:ctx.close()

def main():
 srv=http.server.ThreadingHTTPServer(('127.0.0.1',0),base.Handler);threading.Thread(target=srv.serve_forever,daemon=True).start();url='http://127.0.0.1:'+str(srv.server_port)
 try:
  with sync_playwright()as pw:
   browser=pw.chromium.launch(headless=True)
   for size in [(1366,768),(390,844)]:
    for role in ['student','owner','course_lead']:extra_tabs(browser,url,role,size)
    try:viewers(browser,url,size)
    except Exception:check('viewer group '+str(size),False,traceback.format_exc())
   browser.close()
 finally:
  srv.shutdown();(OUT/'report.json').write_text(json.dumps({'checks':CHECKS,'states':STATES,'scope':'Actual app UI with synthetic RPC/PDF-renderer fixtures; not production auth or PDF rendering certification'},indent=2))
 failed=[x for x in CHECKS if not x['passed']];print(json.dumps({'passed':len(CHECKS)-len(failed),'failed':len(failed),'states':len(STATES)}))
 if failed:raise SystemExit(1)
if __name__=='__main__':main()
