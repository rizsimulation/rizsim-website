"""Read-only V10 public delivery verification, no credentials or live account mutation."""
import json
from urllib.error import HTTPError,URLError
from urllib.request import Request,urlopen
import verify_student_completion_v9_release as v9
base=v9.base.base
base.ASSETS=base.ASSETS+('course-material-viewer.html','rizsim-refinements-v10.css','rizsim-refinements-v10.js')
def main():
 public=base.main()
 req=Request('https://rvmumpvtvjvvuyimeybc.supabase.co/functions/v1/rizsim-course-material-stream',
  data=b'{"purpose":"download","material_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}',
  headers={'Content-Type':'application/json','Origin':'https://rizsim.com'},method='POST')
 try:
  with urlopen(req,timeout=20) as response:status=response.status
 except HTTPError as err:status=err.code
 except (OSError,URLError,TimeoutError):status=0
 denied=status==401
 out=base.ROOT/'test-results'/'v10-stream-anonymous.json'
 out.write_text(json.dumps({'unauthenticated_http_status':status,'denied':denied,'scope':'Unauthenticated denial only; cannot replace real-account testing'},indent=2))
 print(('PASS' if denied else 'FAIL'),'Unauthenticated download request blocked by protected stream:',status)
 return 0 if public==0 and denied else 1
if __name__=='__main__':raise SystemExit(main())
