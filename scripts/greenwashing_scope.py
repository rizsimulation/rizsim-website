"""The authorized new simulation is additive; legacy assessments and backend stay locked."""
import subprocess
from pathlib import Path
from big_five_scope import NEW_ASSETS as BIG_FIVE_ASSETS, normalize_hook as normalize_big_five
NEW_ASSETS = frozenset('simulation-assets/greenwashing/' + name for name in
    ['questions.js','engine.js','views.js','styles.css','cloud.js','student.js','teaching.js'])

def forbidden_change(path, base, root):
    if path.startswith(('sql/','supabase/','migrations/','edge-functions/')):
        return True
    if not path.startswith('simulation-assets/'):
        return False
    # Only these newly introduced assets may be added. Any change to an assessment
    # that already exists at the base remains forbidden by the old design gates.
    exists = subprocess.run(['git','cat-file','-e',base+':'+path],cwd=root,
                            stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode == 0
    return path not in (NEW_ASSETS | BIG_FIVE_ASSETS) or exists

def normalize_hook(src, path):
    src=normalize_big_five(src,path)
    if path == 'access-out.html':
        src=src.replace('<link rel="stylesheet" href="/simulation-assets/greenwashing/styles.css">\n','')
        for name in ['questions','engine','views','teaching']:
            src=src.replace('<script src="simulation-assets/greenwashing/'+name+'.js" defer></script>\n','')
        src=src.replace('<script src="rizsim-greenwashing-faculty.js" defer></script>\n','')
    elif path == 'rizsim-live-classroom.js':
        src=src.replace(' window.RizSimGreenwashingFaculty?.draw(null,null);','')
        src=src.replace(",'RizSimGreenwashingFaculty']",']')
        src=src.replace('      window.RizSimGreenwashingFaculty?.draw(s,route);\n','')
    elif path == 'rizsim-live-workspace.js':
        src=src.replace(",'seven-sins-greenwashing':'RizSimGreenwashingFaculty'",'')
    return src
