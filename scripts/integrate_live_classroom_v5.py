"""Apply idempotent V5 UI integration. No schema, RLS, auth or privileged handler edits.
The explicit branch-only verification workflow commits these generated UI assets only after tests pass.
"""
from pathlib import Path
import re
import sys
ROOT = Path(__file__).resolve().parents[1]
p = ROOT / 'rizsim-faculty-workspaces.js'
s = p.read_text()
if 'V5 exclusively owns session results' not in s:
 s = s.replace('function mountPlayerResults(){', 'function mountPlayerResults(){\n if($("rzLiveChoices"))return; // V5 exclusively owns session results panel placement.')
 s = s.replace('function player(){', 'function player(){\n if($("rzLiveChoices")){window.RizSimLiveClassroom?.draw();return;}')
 s = s.replace('const files=e.dataTransfer?.files;if(!files?.length)return;', 'const snap=snapshot();const selected=snap?.courses?.find(c=>str(c.course_id)===str(snap.selectedCourseId));\n    if(snap?.role!=="course_lead"||selected?.active!==true)return;\n    const files=e.dataTransfer?.files;if(!files?.length)return;')
 old='document.addEventListener("DOMContentLoaded",()=>{let count=0;function ready(){if(snapshot()){init();render();return;}if(++count<60)setTimeout(ready,220);}ready();});'
 new='''document.addEventListener("DOMContentLoaded",()=>{
 init();
 const observer=new MutationObserver(()=>render());
 for(const id of ["resultRows","classroomSessionRows"]){const n=$(id);if(n)observer.observe(n,{childList:true});}
 const view=$("view-records");if(view)observer.observe(view,{attributes:true,attributeFilter:["class"]});
 render();
});'''
 assert old in s, 'Legacy initialization changed; review before integration'
 s=s.replace(old,new)
 p.write_text(s)
p=ROOT/'access-out.html';s=p.read_text()
# Remove the legacy tab-switch scroll, but retain authorized navigation, swipe and all handlers.
start=s.index('function setViewImmediately(');end=s.index('function navigateInternal(',start)
part=s[start:end]
part=re.sub(r'window\.scrollTo\(\s*0,\s*0\s*\);','// V5: navigation does not force scrolling.',part)
s=s[:start]+part+s[end:]
p.write_text(s)
p=ROOT/'scripts/validate_faculty_workspaces.js';s=p.read_text().replace('"RizSimulation Player","Classroom","Records"','"Live Classroom","Classroom","Records"').replace('["account","simulations","results","resources"]','["account","simulations","results","resources","materials"]');p.write_text(s)
# qrcode-generator 1.4.4 is downloaded by the workflow to /tmp; only the local JS asset is served.
# The MIT licence in qrcode.js is retained. Session links are never sent to a QR service.
qr=ROOT/'rizsim-qr.js'
if not qr.exists():
 source=Path(sys.argv[1]).read_text()
 assert 'qrcode' in source and 'Kazuhiko Arase' in source
 wrapper='''\n(function(){'use strict';
window.RizSimQR=Object.freeze({svg(value,label){
const qr=qrcode(0,'M');qr.addData(String(value),'Byte');qr.make();
const n=qr.getModuleCount(),ns='http://www.w3.org/2000/svg';
const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 '+(n+8)+' '+(n+8));svg.setAttribute('role','img');svg.setAttribute('aria-label',label||'Classroom QR code');svg.setAttribute('shape-rendering','crispEdges');
const bg=document.createElementNS(ns,'rect');bg.setAttribute('width','100%');bg.setAttribute('height','100%');bg.setAttribute('fill','#fff');svg.append(bg);
let d='';for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(qr.isDark(r,c))d+='M'+(c+4)+','+(r+4)+'h1v1h-1z';const path=document.createElementNS(ns,'path');path.setAttribute('d',d);path.setAttribute('fill','#000');svg.append(path);return svg;
}});})();\n'''
 qr.write_text(source+wrapper)
print('V5 integration applied: presentation-only changes and bundled QR.')
