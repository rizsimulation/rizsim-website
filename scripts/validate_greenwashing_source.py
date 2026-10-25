"""Additive frontend scope; the previous three academic engines remain unchanged."""
import json,os,subprocess,sys
from pathlib import Path
from frontend_v14_scope import presentation_equivalent
from greenwashing_scope import forbidden_change,NEW_ASSETS
ROOT=Path(__file__).resolve().parents[1]
base=os.environ.get('GW_BASE','4d1ccafe4e672971b7284786e2265f5ceb771435')
checks=[]
for path in ['access-out.html','rizsim-live-classroom.js','rizsim-live-workspace.js']:
 old=subprocess.check_output(['git','show',base+':'+path],cwd=ROOT)
 new=(ROOT/path).read_bytes()
 assert presentation_equivalent(old,new,path),path
 assert not presentation_equivalent(old,new+b'\n// unapproved mutation',path),path
 checks.append({'path':path,'only_approved_integration_hooks':True})
changed=subprocess.check_output(['git','diff','--name-only',base,'HEAD'],cwd=ROOT,text=True).splitlines()
assert not any(forbidden_change(p,base,ROOT) for p in changed),'Existing academic/backend source changed'
assert not list((ROOT/'scripts').glob('.gw-*')),'Temporary transfer files must be absent'
assert not (ROOT/'.github/workflows/greenwashing-stage.yml').exists(),'Temporary write-enabled workflow must not ship'
page=(ROOT/'simulation-greenwashing.html').read_text()
for asset in ['rizsim-design-code.css','rizsim-design-code.js','rizsim-v154-runner-shell.js','rizsim-v15-runner-state.js']:
 assert page.count(asset)==1,asset
js=(ROOT/'rizsim-greenwashing-faculty.js').read_text()
assert "filter(x=>x.status==='submitted').map" in js
assert "get_my_classroom_session_students" in js
assert ".in('attempt_id',ids)" in js
for path in NEW_ASSETS|{'rizsim-greenwashing-faculty.js'}:
 src=(ROOT/path).read_text()
 assert 'service_role' not in src and '__gwInit' not in src and 'tinyfish' not in src.lower(),path
out=ROOT/'test-results/greenwashing-source';out.mkdir(parents=True,exist_ok=True)
(out/'contracts.json').write_text(json.dumps({'base':base,'checks':checks,'existing_backend_and_academic_unchanged':True,'new_source_assets':sorted(NEW_ASSETS)},indent=2))
print('PASS additive source scope, roles, submitted-only analysis and retained UI contracts')
