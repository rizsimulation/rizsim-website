"""One-time transport of locally reviewed UTF-8 source. Hash-checked, no code evaluation."""
from pathlib import Path
import base64,hashlib,json,lzma
ROOT=Path(__file__).resolve().parents[1]
encoded=''.join((ROOT/'.v6-bootstrap'/f'{i}.b64').read_text() for i in range(1,5))
raw=lzma.decompress(base64.b64decode(encoded,validate=True))
assert hashlib.sha256(raw).hexdigest()=='3e91fe95c989fef0d461949abd9a2b5c80af5633e64c0e096e183a50a4c86437','Source transport integrity failed'
allowed={'rizsim-course-service.js','rizsim-course-environment.js','rizsim-course-environment.css','rizsim-live-classroom.js','scripts/fixtures/live-classroom-backend.js','scripts/test_course_environment_v6.py','scripts/test_live_classroom_v5.py','scripts/test_live_classroom_v5_extended.py','scripts/sql/runtime_test_schema.sql','scripts/sql/runtime_assertions.sql','scripts/integrate_course_v6.py','sql/course_runtime_v6.sql','edge-functions/rizsim-course-material-stream/index.ts'}
files=json.loads(raw)
assert set(files)==allowed
for name,content in files.items():
 path=ROOT/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_text(content)
print('Verified and unpacked',len(files),'source files')
