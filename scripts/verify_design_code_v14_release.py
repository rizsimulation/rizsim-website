"""Read-only hash verification of all active root runtime assets and simulation assets."""
import concurrent.futures,hashlib,json,os,time,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results/design-code-v14-production';OUT.mkdir(parents=True,exist_ok=True)
files=sorted([p for p in ROOT.iterdir() if p.is_file() and p.suffix in ['.html','.css','.js','.svg','.png']]+[p for p in (ROOT/'simulation-assets').rglob('*') if p.is_file() and p.suffix in ['.js','.css','.png']])
sha=os.environ['RIZSIM_RELEASE_SHA']
def verify(p):
 name=str(p.relative_to(ROOT));expected=hashlib.sha256(p.read_bytes()).hexdigest()
 try:
  from urllib.parse import quote
  req=urllib.request.Request('https://rizsim.com/'+quote(name)+'?rz_release='+sha+'&check='+str(attempt),headers={'User-Agent':'RizSim-ReadOnly-Release-Verification','Cache-Control':'no-cache'})
  with urllib.request.urlopen(req,timeout=25) as r:
   actual=hashlib.sha256(r.read()).hexdigest()
   return {'file':name,'status':r.status,'expected_sha256':expected,'actual_sha256':actual,'matches':r.status==200 and actual==expected}
 except Exception as e:return {'file':name,'expected_sha256':expected,'matches':False,'error':str(e)}
report={'commit':sha,'complete':False}
for attempt in range(1,25):
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:rows=list(pool.map(verify,files))
 report.update(attempt=attempt,files=rows,complete=all(r['matches'] for r in rows))
 (OUT/'report.json').write_text(json.dumps(report,indent=2))
 print(json.dumps({'attempt':attempt,'matches':sum(r['matches'] for r in rows),'total':len(rows)}),flush=True)
 if report['complete']:break
 time.sleep(10)
if not report['complete']:raise SystemExit('Production assets do not match this commit.')
