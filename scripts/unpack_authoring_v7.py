from pathlib import Path
import base64,gzip,hashlib,json
s=''.join((Path('.v7-bootstrap')/('source-'+str(i)+'.b64')).read_text() for i in range(4))
s=s.replace('hsoh3xGmKv','hsoh3xmtKv')
raw=base64.b64decode(s,validate=True)
assert hashlib.sha256(raw).hexdigest()=='b52380ce0e613805748ab927610f05fd3c714c730ccb74f1958a0d5675a69fdd','Source hash mismatch'
files=json.loads(gzip.decompress(raw))
expected={'rizsim-course-authoring.js','rizsim-course-authoring.css','rizsim-course-authoring-service.js','sql/course_authoring_v7.sql','scripts/test_course_authoring_v7.py','scripts/sql/authoring_test_schema.sql','scripts/sql/authoring_assertions.sql','scripts/fixtures/live-classroom-backend.js','scripts/integrate_course_authoring_v7.py'}
assert set(files)==expected
for name,content in files.items():
 p=Path(name);p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content)
print('Verified and unpacked',len(files),'bounded source files')
