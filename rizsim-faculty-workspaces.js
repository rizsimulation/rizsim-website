/* RizSim Faculty/Course Lead V4 presentation layer.
   Reuses authenticated data and handlers from the existing access-out portal.
   This file contains no direct backend writes. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
let recordSearch="";
let cleared=false;
let currentStudent=null;
let lastFocus=null;
let materialMounted=false;
let initialized=false;
let resultsMounted=false;
const str=v=>String(v??"");
const date=v=>v?new Date(v).toLocaleString(undefined,{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):"Date not available";
function node(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=str(text);return el;}
function bridge(){return window.RizSimFacultyBridge;}
function snapshot(){try{return bridge()?.getSnapshot()||null;}catch(e){return null;}}
function empty(el,message){el.replaceChildren(node("div","rz-workspace-empty",message));}
function selectedAllowed(){return $("view-records")?.classList.contains("active");}
function gotoClassroom(){document.querySelector('#mainNav [data-auth-view="classroom"]')?.click();}
function mountPlayerResults(){
 const snap=snapshot();if(!snap||!["faculty","course_lead","owner"].includes(snap.role)||resultsMounted)return;
 const from=$("view-results")?.querySelector(".content-shell");
 const player=$("rzLiveResultsAnchor")||$("view-classroom")?.querySelector(".content-shell");
 if(!from||!player)return;
 const wrap=node("section","rz-player-results");
 wrap.append(node("div","rz-workspace-kicker","RESULTS & PARTICIPANT PROGRESS"));
 // Moving the existing result controls preserves the original listeners, RPC
 // permission checks, and authenticated response viewer.
 wrap.append(from);
 player.append(wrap);
 resultsMounted=true;
}
function player(){
 const snap=snapshot();if(!snap)return;
 mountPlayerResults();
 const grid=$("rzLicensedSimGrid"),count=$("rzLicensedCount");
 if(!grid||!count)return;
 grid.replaceChildren();count.textContent=snap.licensed.length+" licensed";
 if(!snap.licensed.length){empty(grid,"No active licensed simulations. Your existing licence checks remain in effect.");return;}
 snap.licensed.forEach((p,i)=>{
   const card=node("article","rz-licensed-card"),top=node("div","rz-licensed-card-art"),
     mark=node("span","rz-licensed-number",String(i+1).padStart(2,"0"));
   top.append(mark);
   const tag=node("span","rz-licensed-label","LICENSED EXPERIENCE");
   const title=node("h3",null,p.title||"Simulation");
   const description=node("p",null,p.short_description||"An active RizSimulation experience.");
   const action=node("button","rz-run-button","Run Simulation");
   action.type="button";
   const licence=snap.licences.find(l=>str(l.product_id)===str(p.id));
   action.addEventListener("click",()=>{
      if(!snapshot()?.licensed.some(x=>str(x.id)===str(p.id)))return;
      const select=$("classroomSimulationSelect");
      if(!select)return;
      const options=Array.from(select.options).find(x=>x.value===str(p.id));
      if(!options){player();return;}
      select.value=str(p.id);
      select.dispatchEvent(new Event("change",{bubbles:true}));
      const info=$("rzPlayerSelectedLabel");
      info.hidden=false;info.textContent="Selected: "+p.title+" · Configure your session below";
      $("classroomCreateForm")?.scrollIntoView({behavior:"smooth",block:"start"});
   });
   const footer=node("div","rz-licensed-footer");
   footer.append(node("small",null,licence?.license_term||"Active"),action);
   card.append(top,tag,title,description,footer);grid.append(card);
 });
}
function material(){
 const snap=snapshot();if(!snap)return;
 const select=$("rzClassroomCourseSelect"),mount=$("rzClassroomMaterialMount"),zone=$("rzClassroomDropZone"),copy=$("rzClassroomPermission");
 if(!select||!mount||!zone)return;
 const allowed=snap.role==="course_lead";
 const selectedValue=str(snap.selectedCourseId||select.value||"");
 select.replaceChildren();
 const placeholder=node("option",null,"Select a Course");placeholder.value="";select.append(placeholder);
 snap.courses.forEach(course=>{
  const opt=node("option",null,course.title||"Course");opt.value=str(course.course_id);select.append(opt);
 });
 select.value=snap.courses.some(x=>str(x.course_id)===selectedValue)?selectedValue:"";
 if(!materialMounted){
   const existing=$("courseMaterialsPanel");
   if(existing){mount.append(existing);materialMounted=true;existing.style.margin="0"; }
 }
 const chosen=snap.courses.find(x=>str(x.course_id)===select.value);
 const canUpload=allowed&&chosen?.active===true;
 zone.hidden=!canUpload;
 copy.textContent=canUpload?"Upload, publish and revoke materials for this active Course. Existing permissions apply.":
 chosen?"Read-only course content. Uploads require an active Course Lead workspace.":"Choose an active Course to manage materials.";
 $("rzClassroomMaterialEmpty").hidden=!!chosen;
 if(materialMounted)$("courseMaterialsPanel").hidden=!chosen;
}
function renderRecords(){
 const snap=snapshot();if(!snap)return;
 const grid=$("rzStudentGrid"),metrics=$("rzRecordMetrics"),timeline=$("rzActivityTimeline");
 if(!grid||!metrics)return;
 const rows=snap.submissions||[];
 const groups=new Map();
 for(const item of rows){
  const id=str(item.student_user_id||item.student_name||"unknown");
  if(!groups.has(id))groups.set(id,{id,name:item.student_name||"Student",items:[]});
  groups.get(id).items.push(item);
 }
 const all=Array.from(groups.values()).sort((a,b)=>a.name.localeCompare(b.name));
 const students=cleared?[]:all.filter(x=>x.name.toLowerCase().includes(recordSearch.toLowerCase()));
 metrics.textContent=rows.length+" submissions · "+all.length+" students";
 grid.replaceChildren();
 if(!students.length)empty(grid,cleared?"List cleared from this view. Refresh Records to see it again.":"No students match your search or authorized submissions.");
 students.forEach(st=>{
  const card=node("button","rz-student-card");card.type="button";
  const avatar=node("span","rz-student-avatar",st.name.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase());
  const info=node("span","rz-student-info"),name=node("strong",null,st.name);
  const count=node("small",null,st.items.length+" submission"+(st.items.length===1?"":"s"));
  info.append(name,count);
  card.append(avatar,info,node("span","rz-student-card-arrow","→"));
  card.addEventListener("click",()=>openStudent(st));
  grid.append(card);
 });
 if(timeline){
  timeline.replaceChildren();
  const events=rows.map(x=>({kind:"submission",at:x.submitted_at||x.created_at,
    title:(x.student_name||"Student")+" submitted "+(x.simulation_title||"a simulation"),
    description:x.class_name||"Simulation activity"}))
  .concat((snap.sessions||[]).map(x=>({kind:"session",at:x.created_at||x.live_starts_at,
    title:x.class_name||"Classroom session",description:"Classroom session created"})));
  events.sort((a,b)=>new Date(b.at||0)-new Date(a.at||0));
  if(!events.length)empty(timeline,"No visible activity has been recorded yet.");
  events.slice(0,120).forEach(ev=>{
    const row=node("article","rz-activity-event"),dot=node("span","rz-activity-dot"),
    body=node("div"),title=node("strong",null,ev.title),detail=node("p",null,ev.description),when=node("time",null,date(ev.at));
    body.append(title,detail);row.append(dot,body,when);timeline.append(row);
  });
 }
}
function openStudent(student){
 currentStudent=student;lastFocus=document.activeElement;
 const modal=$("rzStudentModal");if(!modal)return;
 $("rzStudentModalHeading").textContent=student.name;
 const sorted=[...student.items].sort((a,b)=>new Date(b.submitted_at||0)-new Date(a.submitted_at||0));
 $("rzStudentModalCaption").textContent=sorted.length+" visible submissions, newest first";
 const body=$("rzStudentModalBody");body.replaceChildren();
 sorted.forEach(item=>{
  const article=node("article","rz-student-submission"),detail=node("div"),
    title=node("strong",null,item.simulation_title||"Simulation"),
    meta=node("span",null,[item.class_name||"Classroom",date(item.submitted_at)].join(" · "));
  detail.append(title,meta);
  const button=node("button","rz-action-secondary","View submission");
  button.type="button";
  button.addEventListener("click",()=>{closeModal();bridge()?.viewResponses(item.attempt_id);});
  article.append(detail,button);body.append(article);
 });
 modal.hidden=false;document.body.classList.add("rz-record-modal-open");
 modal.querySelector(".rz-modal-card")?.focus();
}
function closeModal(){
 $("rzStudentModal").hidden=true;document.body.classList.remove("rz-record-modal-open");
 if(lastFocus?.isConnected)lastFocus.focus();
}
function showTab(which){
 const a=which==="activity";
 $("rzSubmissionsPanel").hidden=a;$("rzActivityPanel").hidden=!a;
 $("rzSubmissionsTab").classList.toggle("is-active",!a);
 $("rzActivityTab").classList.toggle("is-active",a);
 $("rzSubmissionsTab").setAttribute("aria-selected",String(!a));
 $("rzActivityTab").setAttribute("aria-selected",String(a));
}
function init(){
 if(initialized)return;initialized=true;
 $("rzSearchStudents")?.addEventListener("input",e=>{recordSearch=e.target.value;cleared=false;renderRecords();});
 $("rzClearRecords")?.addEventListener("click",()=>{
   cleared=true;recordSearch="";$("rzSearchStudents").value="";renderRecords();
 });
 document.querySelectorAll("[data-rz-subtab]").forEach(button=>button.addEventListener("click",()=>showTab(button.dataset.rzSubtab)));
 $("rzStudentModal")?.addEventListener("click",e=>{if(e.target.closest("[data-rz-close]"))closeModal();});
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("rzStudentModal")?.hidden)closeModal();});
 $("rzClassroomCourseSelect")?.addEventListener("change",async e=>{
   if(!e.target.value)return;
   if(!bridge()?.selectCourse)return;
   await bridge().selectCourse(e.target.value);
   material();
 });
 const zone=$("rzClassroomDropZone"),file=$("courseMaterialFile");
 $("rzChooseMaterialFile")?.addEventListener("click",()=>file?.click());
 if(zone&&file){
   for(const type of ["dragenter","dragover"]){zone.addEventListener(type,e=>{e.preventDefault();zone.classList.add("is-over");});}
   zone.addEventListener("dragleave",()=>zone.classList.remove("is-over"));
   zone.addEventListener("drop",e=>{
    e.preventDefault();zone.classList.remove("is-over");
    const files=e.dataTransfer?.files;if(!files?.length)return;
    try{const transfer=new DataTransfer();transfer.items.add(files[0]);file.files=transfer.files;
      const title=$("courseMaterialFileTitle");
      if(title&&!title.value.trim())title.value=files[0].name.replace(/\.[^.]+$/,"");
      $("courseMaterialFileMessage").textContent="File selected. Review the details and press Upload Material.";
    }catch(_){$("courseMaterialFileMessage").textContent="Choose the file using Browse files instead.";}
   });
 }
 document.querySelectorAll('#mainNav [data-auth-view="classroom"],#mainNav [data-auth-view="materials"],#mainNav [data-auth-view="records"]').forEach(link=>link.addEventListener("click",()=>{
  window.setTimeout(()=>{if(link.dataset.authView==="classroom")player();else if(link.dataset.authView==="materials")material();else{cleared=false;renderRecords();}},380);
 }));
}
function render(){const snap=snapshot();if(!snap)return;init();if($("view-classroom")?.classList.contains("active"))player();if($("view-materials")?.classList.contains("active"))material();if(selectedAllowed())renderRecords();}
window.RizSimFacultyWorkspace={render};
document.addEventListener("DOMContentLoaded",()=>{let count=0;function ready(){if(snapshot()){init();render();return;}if(++count<60)setTimeout(ready,220);}ready();});
})();
