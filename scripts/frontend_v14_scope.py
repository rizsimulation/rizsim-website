"""Narrow Design Code 1.4 exceptions to historic byte-for-byte visual gates.
No backend/RPC/scoring exception. Each unchanged prefix/suffix is compared exactly.
"""
import re
from greenwashing_scope import normalize_hook

def presentation_equivalent(old, new, path):
 if old == new:
  return True
 old=old.decode() if isinstance(old,bytes) else old
 new=new.decode() if isinstance(new,bytes) else new
 old=normalize_hook(old,path);new=normalize_hook(new,path)
 if old==new:return True
 if path=='access-in.html':
  new=new.replace(' window.RizSimStudentClassroom?.prepareRunner?.(tab,sessionId);\n','')
 elif path=='access-out.html':
  new=new.replace('<link rel="stylesheet" href="/rizsim-analytics-v1.css">\n','').replace('<script src="rizsim-analytics-v1.js" defer></script>\n','')
 elif path in ['rizsim-insight-faculty.js','rizsim-system-faculty.js','rizsim-hotel-faculty.js']:
  allowed={
   'rizsim-insight-faculty.js':"    root.RizSimAnalytics?.upgrade('insight',host,studentHost,{sessionId,rows,core:C});\n",
   'rizsim-system-faculty.js':"   root.RizSimAnalytics?.upgrade('systems',host,studentHost,{sessionId,rows});\n",
   'rizsim-hotel-faculty.js':"   root.RizSimAnalytics?.upgrade('hotel',panel,studentHost,{sessionId,rows,revealed});\n"}
  new=new.replace(allowed[path],'')
 elif path=='rizsim-student-workspace.js':
  new=new.replace(' let practiceInvalid=false,practiceErrorAt=0;\n','').replace("practiceMessage='';practiceInvalid=false;practiceErrorAt=0;", "practiceMessage='';")
  new=new.replace("  const target=$('rzStudentPractice');if(!target)return;\n  const focused=$('rzPracticeCode'),selection=focused===document.activeElement?[focused.selectionStart,focused.selectionEnd]:null;target.replaceChildren();","  const target=$('rzStudentPractice');if(!target)return;target.replaceChildren();").replace("  target.append(joinForm);if(selection){input.focus({preventScroll:true});input.setSelectionRange(...selection);}","  target.append(joinForm);")
  start="  const joinForm=el('form','rz-v15-practice-join')"
  end='  target.append(joinForm);'
  a,b=new.index(start),new.index(end)
  form=new[a:b]
  # The approved form still delegates one join to the existing secure bridge.
  if form.count('bridge().joinPracticeCode(practiceCode)')!=1 or re.search(r'\.rpc\(|\bfetch\(|localStorage|sessionStorage|supabase',form):return False
  aa,bb=old.index(start),old.index(end)
  new=new[:a]+old[aa:bb]+new[b:]
 return old==new

def runner_suffix_equivalent(old,new):
 marker='  // Do not decode large hidden images'
 # Academic feedback decorators and the authenticated participant handoff are locked.
 return marker in old and marker in new and old[old.index(marker):]==new[new.index(marker):] and not re.search(r'\bfetch\(|\.rpc\(|localStorage|supabase',new[:new.index(marker)])
