"""Precise additive integration, source fidelity and security-boundary gate."""
import os,json,re,hashlib,subprocess
from pathlib import Path
from frontend_v14_scope import presentation_equivalent
from greenwashing_scope import forbidden_change
from big_five_scope import NEW_ASSETS,normalize_hook
ROOT=Path(__file__).resolve().parents[1]
base=os.environ.get('BF_BASE','bd161b3be6543afc337c2a7a44402f33c5e35518')
checks=[]
for name in ['access-out.html','rizsim-live-classroom.js','rizsim-live-workspace.js']:
 old=subprocess.check_output(['git','show',base+':'+name],cwd=ROOT)
 new=(ROOT/name).read_bytes()
 assert presentation_equivalent(old,new,name),name
 assert not presentation_equivalent(old,new+b'\n// unexpected adjacent change',name),name
 checks.append({'path':name,'only_explicit_big_five_hooks':True})
changed=subprocess.check_output(['git','diff','--name-only',base,'HEAD'],cwd=ROOT,text=True).splitlines()
assert not any(forbidden_change(n,base,ROOT) for n in changed),'Existing academic source or backend changed'
assert not list((ROOT/'scripts').glob('.bf-*')),'Temporary transport files must not ship'
assert not (ROOT/'.github/workflows/big-five-stage.yml').exists(),'Temporary write-enabled workflow must not ship'
manifest=json.loads((ROOT/'docs/big-five-source-manifest.json').read_text())
src=(ROOT/'simulation-assets/big-five/questions.js').read_text()
for name,expected in manifest['constants'].items():
 constant=re.search(r'^const '+name+r'=.*;$',src,re.M).group(0)
 assert hashlib.sha256(constant.encode()).hexdigest()==expected,name
faculty=(ROOT/'simulation-assets/big-five/teaching.js').read_text()
assert hashlib.sha256(re.search(r'^const KEY=.*;$',faculty,re.M).group(0).encode()).hexdigest()==manifest['faculty_key_sha256']
page=(ROOT/'simulation-big-five.html').read_text()
for asset in ['rizsim-design-code.css','rizsim-design-code.js','rizsim-v154-runner-shell.js','rizsim-v15-runner-state.js']:
 assert page.count(asset)==1,asset
assert 'teaching.js' not in page and 'rizsim-big-five-faculty.js' not in page
js=(ROOT/'rizsim-big-five-faculty.js').read_text()
assert "filter(x=>x.status==='submitted').map" in js and ".in('attempt_id',ids)" in js
assert "get_my_classroom_session_students" in js
for name in NEW_ASSETS|{'rizsim-big-five-faculty.js'}:
 text=(ROOT/name).read_text()
 assert not any(x in text for x in ['service_role','__bfInit','__bfRows','__testRole']),name
 assert 'tinyfish' not in text.lower(),name
out=ROOT/'test-results/big-five-source';out.mkdir(parents=True,exist_ok=True)
(out/'contracts.json').write_text(json.dumps({'base':base,'checks':checks,'source_manifest_verified':True,'existing_academic_and_backend_unchanged':True,'submitted_only_analysis':True,'key_control':'source-compatible per-attempt files; no new backend release service'},indent=2))
print('PASS exact Big Five hooks, academic fidelity, submitted-only scope and protected contracts')
