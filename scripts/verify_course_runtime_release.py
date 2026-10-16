"""Public read-only checks; no user credentials, live data writes or paid browser."""
import json
from urllib.error import HTTPError
from urllib.request import Request,urlopen
import verify_live_classroom_release as base
base.ASSETS=base.ASSETS+('rizsim-course-service.js','rizsim-course-environment.js','rizsim-course-environment.css')
if __name__=='__main__':
 result=base.main()
 request=Request('https://rvmumpvtvjvvuyimeybc.supabase.co/functions/v1/rizsim-course-material-stream',data=b'{}',headers={'Content-Type':'application/json','Origin':'https://rizsim.com'},method='POST')
 try:
  with urlopen(request,timeout=20) as response: status=response.status
 except HTTPError as error: status=error.code
 except (OSError,TimeoutError): status=0
 protected=status==401
 (base.ROOT/'test-results'/'stream-anonymous-verification.json').write_text(json.dumps({'unauthenticated_http_status':status,'passed':protected,'scope':'Unauthenticated denial only; not a signed-in file rehearsal'},indent=2))
 print(('PASS' if protected else 'FAIL'),'Unauthenticated protected stream denied:',status)
 raise SystemExit(0 if result==0 and protected else 1)
