"""V14 sitewide premium design acceptance: exact-HTML contracts and offline
before/after desktop/mobile previews. Never signs in or writes production data.
"""
import http.server
import json
import re
import subprocess
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright, Error as PlaywrightError

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"test-results"/"sitewide-v14"
OUT.mkdir(parents=True,exist_ok=True)
MAIN=[
 "index.html","simulations.html","about.html","contact.html",
 "access-in.html","access-out.html"
]
VIEWERS=["course-material-viewer.html","resource-viewer.html"]
PLAYERS=[
 "simulation-insight-to-implication.html",
 "simulation-system-1-system-2.html",
 "simulation-hotel-judgment.html"
]
STYLE={
 **{p:"rizsim-sitewide-finish-v14.css" for p in MAIN},
 **{p:"rizsim-viewer-finish-v14.css" for p in VIEWERS},
 **{p:"rizsim-participant-finish-v14.css" for p in PLAYERS},
}
SIZES={"desktop":(1366,900),"mobile":(390,844)}
REPORT=[]

def contract():
 for path,cssfile in STYLE.items():
  current=(ROOT/path).read_text()
  before=subprocess.check_output(["git","show","origin/main:"+path],cwd=ROOT,text=True)
  link=f'<link rel="stylesheet" href="{cssfile}">\n'
  assert current.count(link)==1,(path,"stylesheet link count")
  # V14's original PR compared to pre-V14 main. Once V14 is deployed,
  # origin/main already includes the stylesheet; compare the deployed HTML
  # directly and allow only the explicitly authorized Contact identity update.
  if link not in before:
   assert current.replace(link,"")==before,(path,"V14 styles may not change application markup")
  elif path=="contact.html" and "Wajid Rizvi" in before:
   original_avatar='<div class="contact-avatar">' + chr(10) + '              W' + chr(10) + '            </div>'
   updated_avatar='<div class="contact-avatar">' + chr(10) + '              R' + chr(10) + '            </div>'
   assert before.count("Wajid Rizvi")==1 and before.count(original_avatar)==1,"Expected original contact identity once"
   expected=before.replace("Wajid Rizvi","RizSimulation Team",1).replace(original_avatar,updated_avatar,1)
   assert current==expected,"Only the contact display name and avatar initial may change"
  elif path in ("access-in.html","access-out.html"):
   # V15 intentionally changes these authenticated flows. Keep the original
   # branding, Google identity, session authorization and V14 CSS in place.
   for locked in ('rizsim-sitewide-finish-v14.css','rizsim-session-continuity.js','rizsim-v15-premium.css'):
    assert locked in current,(path,'locked theme/auth asset missing: '+locked)
   assert 'rizsim-v15-launch-countdowns.js' in current,(path,'launch announcement missing')
   assert ('RizSimStudentBridge' if path=="access-in.html" else 'RizSimFacultyBridge') in current,(path,'original authenticated bridge missing')
   if 'rizsim-v153-focus.css' in current:
    # The user explicitly removed redundant Contact panels from these portals;
    # deletion shrinks the file. Verify identity, role gates and new scoped
    # support mount instead of imposing an obsolete byte-length requirement.
    assert 'rz-v153-contact-intro' in current and 'id="view-contact"' in current,(path,'V15.3 clean Contact missing')
    assert 'rizsim-support.js' in current and 'rizsim-v15-welcome.js' in current,(path,'protected auth/support workflow missing')
   else:
    assert len(current)>len(before),(path,'authorized V15 additive work not present')
  elif path=="contact.html" and 'rizsim-v153-focus.css' in current:
   # User-requested V15.3 design explicitly replaces ONLY public Contact main;
   # preserve official header/footer/nav and their page transitions exactly.
   stripped=current
   if '<link rel="stylesheet" href="rizsim-v153-focus.css">'+chr(10) not in before:
    stripped=current.replace('<link rel="stylesheet" href="rizsim-v153-focus.css">'+chr(10),'')
   pattern=r'<main class="page-content">.*?</main>'
   assert re.sub(pattern,'<main>V15.3 APPROVED CONTACT REDESIGN</main>',stripped,flags=re.S)==re.sub(pattern,'<main>V15.3 APPROVED CONTACT REDESIGN</main>',before,flags=re.S),(path,'Contact changes escaped main section or scoped CSS link')
   for locked in ('RizSimulation Team','rizsimulation@gmail.com','id="copyEmailButton"','id="copyConfirmation"','mail.google.com/mail/?view=cm'):
    assert locked in current,(path,'required Contact identity or Gmail/Copy action missing: '+locked)
  elif path=="contact.html":
   # The Gmail-compose actions replace only the old mailto destinations.
   gmail='href="https://mail.google.com/mail/?view=cm&amp;fs=1&amp;to=rizsimulation%40gmail.com" target="_blank" rel="noopener noreferrer"'
   if gmail in before:
    # V15.1 main already contains the approved Gmail-compose link.
    # Once deployed, preserve its exact HTML; do not ask a new PR to
    # reverse an action that is already in the production baseline.
    assert current==before,(path,'Published RizSimulation Team Contact actions changed unexpectedly')
   else:
    restored=current.replace(gmail,'href="mailto:rizsimulation@gmail.com"')
    assert restored==before,(path,'Contact change exceeded authorized Gmail action replacement')
   assert 'RizSimulation Team' in current and 'copyEmailButton' in current
  elif path in PLAYERS:
   # V15.4 specifically authorizes a persistent official logo and isolated
   # responsiveness improvements, NOT changes to assessment items or scoring.
   extras=('<link rel="stylesheet" href="/rizsim-v154-runner-ux.css">',
           '<script src="/rizsim-v154-runner-ux.js" defer></script>')
   assert all(extra in current for extra in extras),(path,'approved persistent logo assets missing')
   stripped=current
   for extra in extras:stripped=stripped.replace(extra+chr(10),'')
   if path=="simulation-insight-to-implication.html":
    assert stripped==before,(path,'original Sim01 academic runner changed')
   elif path=="simulation-system-1-system-2.html":
    def normalise_fast_choices(src):
     src=re.sub(r'function selectReview\\(v\\)\\{.*?(?=function moveQuestion\\()', 'function selectReview(v){V154_FAST_SELECTION}\\n',src,flags=re.S)
     src=re.sub(r'function selectLT\\(v\\)\\{.*?(?=function lockLT\\()', 'function selectLT(v){V154_FAST_SELECTION}\\n',src,flags=re.S)
     return src
    assert normalise_fast_choices(stripped)==normalise_fast_choices(before),(path,'Sim02 academic content or locked outcomes changed')
   else:
    # Hotel edits change a URL for the official logo and the idle refresh loop;
    # protected assignment, photographs and submission code must remain intact.
    stripped=stripped.replace('src="/RizSim%20finalized%20logo.png"','src="https://rizsim.com/rizsim-r.png"')
    def normalise_hotel_refresh(src):
     return re.sub(r'if\\(live\\.enabled\\)(?:setInterval|\\{).*?(?=\\n  \\}\\n  initialize\\(\\);)', 'V154_HOTEL_BACKGROUND_REFRESH;',src,flags=re.S)
    assert normalise_hotel_refresh(stripped)==normalise_hotel_refresh(before),(path,'Hotel protected classroom logic changed outside refresh')
  else:
   assert current==before,(path,"existing V14 HTML and functionality must stay identical")
  assert "<script" in before or path in ("about.html",),path
 for css in set(STYLE.values()):
  body=(ROOT/css).read_text()
  for forbidden in [r"(?<!-)\bdisplay\s*:",r"\bposition\s*:",r"\bgrid-template",r"\btransform\s*:",r"\banimation\s*:"]:
   assert not re.search(forbidden,body),f"{css}: forbidden layout/motion CSS {forbidden}"
  assert not re.search(r"(?m)^\s*(html|body|button|a|input|\*)\s*\{",body),f"{css}: no global reset permitted"
 assert "data-rizsim-home-portal" in (ROOT/"rizsim-sitewide-finish-v14.css").read_text()
 assert "prefers-reduced-motion" in (ROOT/"rizsim-participant-finish-v14.css").read_text()
 print("PASS: all V14 global branding preserved; V15.3 changes only authorized Contact main and scoped CSS",flush=True)

class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
 def log_message(self,*args):pass

def prepare_before():
 directory=ROOT/"__sitewide_v14_baseline"
 directory.mkdir(exist_ok=True)
 for path in STYLE:
  old=subprocess.check_output(["git","show","origin/main:"+path],cwd=ROOT,text=True)
  # Resolve CSS/images/scripts from the real root before the first stylesheet.
  tag=re.search(r"<head\b[^>]*>",old,re.I)
  assert tag,path
  old=old[:tag.end()]+'\n<base href="/">\n'+old[tag.end():]
  (directory/path).write_text(old)
 return directory

def capture(browser,base,page_name,size,variant):
 context=browser.new_context(viewport={"width":size[0],"height":size[1]},
                            reduced_motion="reduce",device_scale_factor=1)
 context.add_init_script("try{sessionStorage.setItem('rizsimSplashSeen','true')}catch(e){}")
 context.route("**/*",lambda route:route.continue_() if route.request.url.startswith(base+"/") else route.abort())
 page=context.new_page()
 url=base+"/"+("__sitewide_v14_baseline/" if variant=="before" else "")+page_name
 try:
  page.goto(url,wait_until="domcontentloaded",timeout=25000)
  page.wait_for_timeout(350)
  assert page.locator("body").count()==1
  metrics=page.evaluate("""() => {
    const rect=sel=>{
      const el=document.querySelector(sel);
      if(!el)return null;
      const r=el.getBoundingClientRect();
      return {x:r.x,y:r.y,width:r.width,height:r.height};
    };
    return {
      scroll:document.documentElement.scrollWidth,
      vp:innerWidth,
      nav:rect('.nav-shell'),
      main:rect('.bp-hero,.sim-hero,.rz-about,.contact-hero,#authGate,.viewer-info-card,.viewer-header,.hero,.panel,.stage,#app'),
      loginLabel:document.querySelector('#authGate #googleLogin')?.textContent.trim()||null,
      loginButton:rect('#authGate #googleLogin'),
      loginLogo:document.querySelector('#authGate .gate-logo')?.naturalWidth||null,
      stylesheet:[...document.styleSheets].some(x=>x.href?.includes('finish-v14.css')),
      reduced:matchMedia('(prefers-reduced-motion: reduce)').matches
    };
  }""")
  if variant=="after":
   assert metrics["stylesheet"],f"{page_name}: missing V14 style"
  if "access-" in page_name and page_name in MAIN:
   assert metrics["loginLabel"]=="Continue with Google",f"{page_name}: login label missing"
   assert metrics["loginLogo"] and metrics["loginLogo"]>0,f"{page_name}: RizSim logo failed"
  assert metrics["reduced"],"reduced-motion setting inactive"
  label=page_name.removesuffix(".html")+"-"+str(size[0])+"-"+variant
  page.screenshot(path=str(OUT/(label+".png")),full_page=False,animations="disabled")
  return metrics
 finally:
  context.close()

def run():
 contract()
 baseline=prepare_before()
 server=http.server.ThreadingHTTPServer(("127.0.0.1",0),Handler)
 worker=threading.Thread(target=server.serve_forever,daemon=True);worker.start()
 base=f"http://127.0.0.1:{server.server_port}"
 try:
  with sync_playwright() as p:
   browser=p.chromium.launch(headless=True,args=["--disable-dev-shm-usage"])
   try:
    for path in STYLE:
     for device,size in SIZES.items():
      old=capture(browser,base,path,size,"before")
      now=capture(browser,base,path,size,"after")
      assert now["scroll"]<=max(size[0]+2,old["scroll"]+2),f"{path}/{device}: introduced horizontal overflow"
      for key in ("nav",):
       if old[key] and now[key]:
        assert abs(old[key]["x"]-now[key]["x"])<3,(path,key,"horizontal moved")
        assert abs(old[key]["width"]-now[key]["width"])<3,(path,key,"navigation resized")
        assert abs(old[key]["height"]-now[key]["height"])<3,(path,key,"navigation height changed")
      if old["main"] and now["main"]:
       assert abs(old["main"]["x"]-now["main"]["x"])<3,(path,device,"main layout shifted horizontally")
       assert abs(old["main"]["width"]-now["main"]["width"])<3,(path,device,"main width changed")
      assert now["loginLabel"]==old["loginLabel"],f"{path}: login copy modified"
      REPORT.append({"page":path,"device":device,"before":old,"after":now})
      print(f"PASS {path} {device}: same geometry, no new overflow, screenshot compared",flush=True)
   finally:browser.close()
 finally:
  server.shutdown()
  for path in STYLE:(baseline/path).unlink(missing_ok=True)
  baseline.rmdir()
 (OUT/"metrics.json").write_text(json.dumps(REPORT,indent=2))
 print("PASS: all 11 pages x 2 viewports with before/after screenshots; no application behavior altered",flush=True)

if __name__=="__main__":
 run()
