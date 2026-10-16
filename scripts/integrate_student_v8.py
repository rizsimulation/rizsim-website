"""Verified transport for this bounded student-workspace change only."""
from pathlib import Path
import gzip,hashlib,json,subprocess
ROOT=Path(__file__).resolve().parents[1]
raw=b''.join((ROOT/'.v8-bootstrap'/('source.%d.bin'%i)).read_bytes() for i in range(4))
assert hashlib.sha256(raw).hexdigest()=='a1c7569792a1658ab4766f645a2ad31d37b2d5d16e69e8bd760ed79f1d9eb073','Source integrity mismatch'
bundle=json.loads(gzip.decompress(raw))
allowed={'rizsim-student-workspace.js','rizsim-student-workspace.css','scripts/fixtures/student-workspace-backend.js','scripts/test_student_workspace_v8.py','scripts/validate_student_workspace_v8.js','scripts/sql/student_test_schema.sql','scripts/sql/student_assertions.sql','sql/student_workspace_v8.sql','docs/STUDENT_WORKSPACE_V8.md','.github/workflows/student-workspace-v8.yml','.github/workflows/student-workspace-v8-production.yml','scripts/verify_student_workspace_release.py'}
assert set(bundle)=={'files','patch'} and set(bundle['files'])==allowed
paths={line.split(' b/',1)[1] for line in bundle['patch'].splitlines() if line.startswith('diff --git ')}
assert paths=={'access-in.html','rizsim-shared-home.js'},paths
subprocess.run(['git','apply','--check'],input=bundle['patch'],text=True,cwd=ROOT,check=True)
for name,content in bundle['files'].items():
 p=ROOT/name
 assert not p.exists(),name+' unexpectedly exists'
 p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content)
subprocess.run(['git','apply'],input=bundle['patch'],text=True,cwd=ROOT,check=True)
print('Verified 12 new source files and the two bounded existing-page changes.')
