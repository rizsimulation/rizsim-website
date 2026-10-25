from pathlib import Path
p=Path('simulation-assets/big-five/styles.css')
p.write_text(p.read_text()+'''
/* Native Big Five title replaces the generic duplicate Presenter headings. */
body[data-rz-surface=portal] #rzLiveV13Workspace .rz-v13-pane:has(.bf-dashboard)>.rz-v13-pane-note{display:none}
body[data-rz-surface=portal] #rzLiveV13Workspace:has(.rz-v13-pane:not([hidden]) .bf-dashboard) .rz-v13-region-heading{display:none}
''')
p=Path('scripts/test_big_five_browser.py');s=p.read_text()
old=" ctx=browser.new_context(viewport={'width':1366,'height':900});ctx.route('**/__bigfive_original_'+which,lambda r:r.fulfill(content_type='text/html',body=html));p=ctx.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))"
new=" # Source previews use a separate headless compositor; mounted acceptance remains headed.\n preview=browser.browser_type.launch(headless=True)\n ctx=preview.new_context(viewport={'width':1366,'height':900});ctx.route('**/__bigfive_original_'+which,lambda r:r.fulfill(content_type='text/html',body=html));p=ctx.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))"
assert s.count(old)==1;s=s.replace(old,new)
old="  p.goto(base+'/__bigfive_original_'+which,wait_until='domcontentloaded');p.wait_for_timeout(150);shot(p,'original-'+which);check('Original '+which+' uploaded source renders',not errors,errors)\n finally:ctx.close()"
new="  p.goto(base+'/__bigfive_original_'+which,wait_until='domcontentloaded');p.locator('.wrap').wait_for();p.evaluate('async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}');shot(p,'original-'+which);check('Original '+which+' uploaded source renders',not errors,errors)\n finally:ctx.close();preview.close()"
assert s.count(old)==1;s=s.replace(old,new);p.write_text(s)
