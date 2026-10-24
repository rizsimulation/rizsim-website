"""Read-only public asset verification. No login, secrets, or production writes."""
import hashlib
import json
import os
import time
import urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results'/'design-code-v11-production'
OUT.mkdir(parents=True,exist_ok=True)
FILES=['rizsim-visual-refinement-v11.css','rizsim-sitewide-finish-v14.css','rizsim-shared-home.js','google-g.svg']
sha=os.environ.get('RIZSIM_RELEASE_SHA','unknown')
report={'commit':sha,'files':[],'complete':False}
for attempt in range(1,31):
    rows=[]
    for name in FILES:
        expected=hashlib.sha256((ROOT/name).read_bytes()).hexdigest()
        try:
            req=urllib.request.Request('https://rizsim.com/'+name+'?rz_release='+sha+'&check='+str(attempt),headers={'User-Agent':'RizSim-ReadOnly-Release-Verification','Cache-Control':'no-cache'})
            with urllib.request.urlopen(req,timeout=20) as response:
                actual=hashlib.sha256(response.read()).hexdigest()
                rows.append({'file':name,'status':response.status,'expected_sha256':expected,'actual_sha256':actual,'matches':response.status==200 and actual==expected})
        except Exception as exc:
            rows.append({'file':name,'expected_sha256':expected,'matches':False,'error':str(exc)})
    report.update(attempt=attempt,files=rows,complete=all(x['matches'] for x in rows))
    (OUT/'report.json').write_text(json.dumps(report,indent=2))
    print(json.dumps({'attempt':attempt,'passed':sum(x['matches'] for x in rows),'total':len(rows)}),flush=True)
    if report['complete']:break
    time.sleep(10)
if not report['complete']:raise SystemExit('Live assets do not yet match this release')
