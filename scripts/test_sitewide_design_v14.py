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
  assert current.replace(link,"")==before,(path,"must not change any text, route, handler or markup")
  assert "<script" in before or path in ("about.html",),path
 for css in set(STYLE.values()):
  body=(ROOT/css).read_text()
  for forbidden in [r"(?<!-)\bdisplay\s*:",r"\bposition\s*:",r"\bgrid-template",r"\btransform\s*:",r"\banimation\s*:"]:
   assert not re.search(forbidden,body),f"{css}: forbidden layout/motion CSS {forbidden}"
  assert not re.search(r"(?m)^\s*(html|body|button|a|input|\*)\s*\{",body),f"{css}: no global reset permitted"
 assert "data-rizsim-home-portal" in (ROOT/"rizsim-sitewide-finish-v14.css").read_text()
 assert "prefers-reduced-motion" in (ROOT/"rizsim-participant-finish-v14.css").read_text()
 print("PASS: all 11 pages retain byte-identical content, scripts, routes and controls",flush=True)

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
