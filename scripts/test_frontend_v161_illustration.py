"""RizSim Frontend 1.6.1 — real mounted integrated-art regression.
Synthetic portal adapters only. Never uses production learner data or writes.
"""
from __future__ import annotations

import http.server
import json
import os
from pathlib import Path
import threading
import traceback
import xml.etree.ElementTree as ET
from playwright.sync_api import sync_playwright
import test_live_classroom_v5 as faculty
import test_student_workspace_v8 as student

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results' / 'frontend-v161'
OUT.mkdir(parents=True, exist_ok=True)
checks = []
scenes = []

def assert_check(label, ok, detail=None):
    checks.append({'name': label, 'passed': bool(ok), 'detail': detail})
    print(('PASS ' if ok else 'FAIL ') + label, flush=True)
    if not ok:
        raise AssertionError(label + ': ' + str(detail))

def image(p, name):
    try:
        p.screenshot(path=str(OUT / (name + '.png')), animations='disabled', timeout=15000)
    except Exception as exc:
        print('Screenshot retry '+name+': '+str(exc)[:150],flush=True)
        p.screenshot(path=str(OUT / (name + '.png')), animations='allow', timeout=15000)

def snapshot(p, element):
    return element.evaluate("""e=>{
      const parent=e.getBoundingClientRect(),art=getComputedStyle(e,'::after');
      return {height:parent.height,width:parent.width,artPosition:art.position,
        artOpacity:parseFloat(art.opacity),artWidth:parseFloat(art.width),
        artHeight:parseFloat(art.height),artBackground:art.backgroundImage,
        scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,
        color:getComputedStyle(e).backgroundImage,text:e.innerText.slice(0,120)}
    }""")

def transparent_art(p):
    alpha=p.evaluate("""async()=>{
      const image=new Image();
      image.src='/rizsim-learning-space-illustration.svg';
      await image.decode();
      const c=document.createElement('canvas');c.width=1440;c.height=650;
      const ctx=c.getContext('2d');ctx.clearRect(0,0,1440,650);
      ctx.drawImage(image,0,0,1440,650);
      const a=(x,y)=>ctx.getImageData(x,y,1,1).data[3];
      return {left:a(40,200),right:a(1390,380),center:a(720,330)};
    }""")
    assert_check('transparent shared artwork has no white rectangular backing',
                 alpha['left']==0 and alpha['right']==0 and alpha['center']>0,alpha)

def student_library(browser,base,mobile):
    label='student-' + ('mobile' if mobile else 'desktop')
    ctx,p,errors=student.open_page(browser,base,mobile=mobile)
    try:
        student.nav(p,'resources')
        lead=p.locator('#rzStudentSimulationLibrary .rz-v153-library-lead')
        lead.wait_for(state='visible')
        state=snapshot(p,lead)
        assert_check(label+' artwork remains an actual site asset','rizsim-learning-space-illustration.svg' in state['artBackground'],state)
        assert_check(label+' artwork is integrated/absolutely positioned, not a stacked image',
                     state['artPosition']=='absolute' and 0 < state['artOpacity'] < .9 and state['artWidth']<=350 and state['artHeight']<=151,state)
        assert_check(label+' has uninterrupted page surface behind illustration',
                     'gradient' in state['color'] and state['height']<230,state)
        assert_check(label+' content remains visible and readable',
                     'Learn independently.' in state['text'] and lead.locator('p').is_visible(),state['text'])
        assert_check(label+' no extra horizontal scroll',state['scrollWidth']<=state['viewport']+2,state)
        assert_check(label+' no invented published products',
                     'COMING SOON' in p.locator('#rzStudentSimulationLibrary').inner_text())
        if mobile:
            assert_check(label+' artwork becomes a faint watermark',state['artOpacity']<=.15,state)
        else:
            transparent_art(p)
        image(p,label+'-integrated-library')
        assert_check(label+' no JavaScript errors',not errors,errors)
        scenes.append(label)
    finally:
        ctx.close()

def student_learning(browser,base,mobile):
    label='learning-' + ('mobile' if mobile else 'desktop')
    ctx,p,errors=student.open_page(browser,base,mobile=mobile)
    try:
        student.nav(p,'learning')
        p.wait_for_timeout(400)
        # Exercise the exact existing calm-empty component against the mounted production cascade,
        # even when this synthetic learner has history entries in the fixture.
        p.evaluate("""()=>{
          const root=document.querySelector('#view-learning .content-shell');
          const empty=document.createElement('div');empty.className='rz-st-empty calm';empty.id='v161TestEmpty';
          const heading=document.createElement('h2');heading.textContent='No saved learning activity';
          const note=document.createElement('p');note.textContent='Your activity will appear here.';
          empty.append(heading,note);root.prepend(empty);
        }""")
        block=p.locator('#v161TestEmpty')
        style=block.evaluate("""e=>{let s=getComputedStyle(e,'::before');return {
          position:s.position,opacity:parseFloat(s.opacity),height:e.getBoundingClientRect().height,
          childTop:e.querySelector('h2').getBoundingClientRect().top,
          boxTop:e.getBoundingClientRect().top,overflow:document.documentElement.scrollWidth<=innerWidth+2
        }}""")
        assert_check(label+' illustration sits inside empty state, not in a separate block',
                     style['position']=='absolute' and style['height']<=360 and style['childTop']>=style['boxTop'],style)
        assert_check(label+' watermark restrained and no overflow',style['opacity']<.3 and style['overflow'],style)
        image(p,label+'-integrated-empty')
        assert_check(label+' no JavaScript errors',not errors,errors)
        scenes.append(label)
    finally:
        ctx.close()

def faculty_empty(browser,base,mobile):
    label='course-lead-' + ('mobile' if mobile else 'desktop')
    ctx,p,errors=faculty.page_for(browser,base,role='course_lead',mobile=mobile,v15=True)
    try:
        p.locator('#mainNav [data-auth-view=courses]').evaluate('(n)=>n.click()')
        p.wait_for_selector('#rzCourseAuthoring .rz-author-paths')
        p.get_by_role('button',name='Create new course',exact=True).click()
        p.wait_for_selector('#rzCourseAuthoring .rz-author-add-grid')
        # Keep native authoring controls; synthetic empty component only checks the reused CSS state.
        p.evaluate("""()=>{
          const root=document.querySelector('#rzCourseAuthoring');
          let grid=root.querySelector('.rz-author-course-grid');
          if(!grid){grid=document.createElement('div');grid.className='rz-author-course-grid';root.append(grid)}
          const empty=document.createElement('div');empty.className='rz-author-empty';empty.id='v161AuthorEmpty';
          empty.textContent='No resources have been added yet';grid.append(empty);
        }""")
        empty=p.locator('#v161AuthorEmpty')
        s=empty.evaluate("""e=>{const a=getComputedStyle(e,'::before');return {
          art:a.backgroundImage,position:a.position,opacity:parseFloat(a.opacity),
          height:e.getBoundingClientRect().height,overflow:document.documentElement.scrollWidth<=innerWidth+2}}""")
        assert_check(label+' artwork is an in-surface watermark rather than a new row',
                     s['position']=='absolute' and s['height']<=200 and 'illustration.svg' in s['art'],s)
        assert_check(label+' course actions preserved',
                     p.locator('#rzCourseAuthoring .rz-author-add-grid .rz-author-card.compact').count()==2)
        assert_check(label+' no horizontal overflow or overpowering artwork',
                     s['overflow'] and s['opacity']<=.25,s)
        image(p,label+'-integrated-authoring')
        assert_check(label+' no JavaScript errors',not errors,errors)
        scenes.append(label)
    finally:
        ctx.close()

def catalogue(browser,base,mobile):
    label='catalogue-' + ('mobile' if mobile else 'desktop')
    ctx=browser.new_context(viewport={'width':390 if mobile else 1366,'height':844 if mobile else 768})
    p=ctx.new_page()
    try:
        p.goto(base+'/simulations.html',wait_until='domcontentloaded')
        p.wait_for_selector('body')
        baseline=p.evaluate("({scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth})")
        p.evaluate("""()=>{
          const anchor=document.querySelector('main')||document.querySelector('.catalogue-section')||document.body;
          const box=document.createElement('div');box.className='rz-catalog-empty';box.id='v161CatalogEmpty';
          box.innerHTML='<strong>No published simulations yet</strong><p>This category will show experiences when published.</p>';
          anchor.prepend(box);
          const loading=document.createElement('div');loading.className='rz-catalog-empty';loading.id='v161Loading';
          loading.textContent='Loading your library…';anchor.prepend(loading);
        }""")
        p.wait_for_function("""()=>getComputedStyle(document.querySelector('#v161CatalogEmpty'),'::before').backgroundImage.includes('illustration.svg')""")
        s=p.locator('#v161CatalogEmpty').evaluate("""e=>{let a=getComputedStyle(e,'::before');return {
          position:a.position,opacity:parseFloat(a.opacity),height:e.getBoundingClientRect().height,
          scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth}}""")
        loading=p.locator('#v161Loading').evaluate("e=>getComputedStyle(e,'::before').content")
        assert_check(label+' empty artwork integrated as decoration',
                     s['position']=='absolute' and s['height']<250 and s['opacity']<.35,s)
        assert_check(label+' loading state never pretends to be a published illustration',
                     loading=='none',loading)
        assert_check(label+' illustration introduces no horizontal overflow',s['scrollWidth']<=max(baseline['scrollWidth'],baseline['viewport'])+2,{'before':baseline,'after':s})
        p.locator('#v161Loading').evaluate('n=>n.remove()')
        p.locator('#v161CatalogEmpty').scroll_into_view_if_needed()
        image(p,label+'-integrated-category-empty')
        scenes.append(label)
    finally:
        ctx.close()

def main():
    tree=ET.parse(ROOT/'rizsim-learning-space-illustration.svg')
    rects=tree.findall('.//{http://www.w3.org/2000/svg}rect')
    assert_check('SVG has no full-artboard opaque rectangle',
                 not any(r.attrib.get('width')=='1440' and r.attrib.get('fill')=='#FFFFFF' for r in rects))
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),faculty.Handler)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(headless=os.getenv('RIZSIM_HEADED')!='1')
            try:
                base='http://127.0.0.1:'+str(server.server_port)
                group=os.environ.get('RIZSIM_V161_SCOPE','all')
                if group in ('all','student'):
                    student_library(browser,base,False)
                    student_library(browser,base,True)
                    student_learning(browser,base,False)
                    student_learning(browser,base,True)
                if group in ('all','faculty'):
                    faculty_empty(browser,base,False)
                    faculty_empty(browser,base,True)
                if group in ('all','catalogue'):
                    catalogue(browser,base,False)
                    catalogue(browser,base,True)
            finally:
                browser.close()
    finally:
        server.shutdown()
    (OUT/'report.json').write_text(json.dumps({'checks':checks,'scenes':scenes,'complete':True},indent=2))
    print('Integrated artwork:',len(checks),'passed across',len(scenes),'scenes',flush=True)

if __name__=='__main__':
    try:
        main()
    except Exception:
        (OUT/'report.json').write_text(json.dumps({'checks':checks,'scenes':scenes,
                           'complete':False,'traceback':traceback.format_exc()},indent=2))
        traceback.print_exc()
        raise
