"""Exact additive Big Five presentation hooks; not a generic source allowlist."""
NEW_ASSETS=frozenset('simulation-assets/big-five/'+name for name in
 ['questions.js','engine.js','views.js','styles.css','cloud.js','student.js','teaching.js'])
def normalize_hook(src,path):
 if path=='access-out.html':
  src=src.replace('<link rel="stylesheet" href="/simulation-assets/big-five/styles.css">\n','')
  for name in ['questions','engine','views','teaching']:
   src=src.replace('<script src="simulation-assets/big-five/'+name+'.js" defer></script>\n','')
  src=src.replace('<script src="rizsim-big-five-faculty.js" defer></script>\n','')
 elif path=='rizsim-live-classroom.js':
  src=src.replace(' window.RizSimBigFiveFaculty?.draw(null,null);','')
  src=src.replace(",'RizSimBigFiveFaculty']",']')
  src=src.replace('      window.RizSimBigFiveFaculty?.draw(s,route);\n','')
 elif path=='rizsim-live-workspace.js':
  src=src.replace(",'big-five-personality':'RizSimBigFiveFaculty'",'')
 return src
