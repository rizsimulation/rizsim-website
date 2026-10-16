/* RizSim V5 | Unified Live Classroom, presentation only; permissions and session RPCs unchanged */
(function(){
"use strict";
const $=id=>document.getElementById(id);
let mode="",stage="menu",selection="",mounted=false,ready=false;
let pendingCourse="",confirmedCourse="";
const e=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=String(value);return n};
const bridge=()=>window.RizSimFacultyBridge;
const snapshot=()=>{try{return bridge()?.getSnapshot()}catch(_){return null}};

const freshUrl=()=>{try{return new URL(location.href)}catch(_){return null}};
function navigate(nextMode,nextStage,item){
 mode=nextMode||"";stage=nextStage||"menu";selection=item||"";
 const u=freshUrl();
 if(u){if(mode)u.searchParams.set("live",mode+"-"+stage);else u.searchParams.delete("live");
 if(selection)u.searchParams.set("selection",selection);else u.searchParams.delete("selection");
 u.hash="classroom";history.pushState(null,"",u.pathname+u.search+u.hash);}
 draw();
 // User explicitly requested no automatic scroll on selection.

}
function back(){
 if(stage==="running"||stage==="setup")navigate(mode,"list");
 else if(stage==="list")navigate("","menu");
 else navigate("","menu");
}
function button(label,cls,click){const b=e("button",cls,label);b.type="button";b.addEventListener("click",click);return b}
function card(title,description,callback,index,add=false){
 const box=e("article","rz-v5-card"+(add?" rz-v5-card-add":" rz-v5-card-"+(index%4))),top=e("div","rz-v5-card-copy");
 top.append(e("h3",null,title),e("p",null,description));
 const cta=button(add?"+  "+(title.replace(/^Add /,"Add ")):"Select "+(mode==="simulation"?"Simulation":"Course"),"rz-v5-card-action",callback);
 box.append(top,cta);box.tabIndex=0;
 box.addEventListener("keydown",ev=>{if(ev.key==="Enter"){ev.preventDefault();callback()}});
 return box;
}
function options(){
 const grid=$("rzLiveChoices");grid.replaceChildren();
 const s=snapshot(),lead=s?.role==="course_lead";
 const data=[
  ["simulation","Run Simulation","Choose from licensed interactive simulations."],
  ["own","Run My Own Course","Run a course you have built as a Course Lead."],
  ["purchased","Run Purchased Course","Run a complete ready-made RizSim course."]
 ];
 data.forEach(([key,title,subtitle],i)=>{
  const wrap=e("article","rz-v5-choice rz-v5-choice-"+key+(key==="own"&&!lead?" is-locked":""));
  const body=e("div","rz-v5-card-copy");body.append(e("h3",null,title),e("p",null,subtitle));
  wrap.append(body,button(key==="own"&&!lead?"Become a Course Lead":"Explore","rz-v5-card-action",()=>{
    if(key==="own"&&!lead){const el=$("rzLiveHelp");el.hidden=false;el.textContent="Course-building access is available through RizSim Course Lead membership. Contact RizSim to request an upgrade.";return;}
    navigate(key,"list");
  }));
  grid.append(wrap);
 });
}
function collection(){
 const s=snapshot();const grid=$("rzLiveCards");grid.replaceChildren();
 const types={simulation:"Licensed simulations",own:"My created courses",purchased:"Purchased RizSim courses"};
 $("rzLiveCollectionTitle").textContent=types[mode]||"Choose an experience";
 let arr=[];
 if(mode==="simulation")arr=s?.licensed||[];
 if(mode==="own"&&s?.role==="course_lead")arr=(s?.courses||[]).filter(x=>x.active===true);
 // There is currently no licensed, ready-made RizSim course catalogue/RPC.
 // Display an honest empty state rather than treating a Course Lead course as purchased.
 if(mode==="purchased")arr=[];
 arr.forEach((item,i)=>{
  const id=String(mode==="simulation"?item.id:item.course_id);
  grid.append(card(item.title||"Untitled experience",item.short_description||item.description||"Ready to prepare for your learners.",()=>navigate(mode,"setup",id),i));
 });
 const addText=mode==="simulation"?"Add More Simulations":mode==="own"?"Create More Courses":"Add More Courses";
 const destination=mode==="own"?"courses":"home";
 grid.append(card(addText,mode==="own"?"Open your Courses workspace to build another course.":"Browse available RizSim categories on Home.",()=>{
  // Existing validated navigation handler is reused; no separate auth.
  const link=document.querySelector('#mainNav [data-auth-view="'+destination+'"]');
  if(link)link.click();else document.querySelector('[data-auth-view="'+destination+'"]')?.click();
 },arr.length,true));
 if(arr.length===0){
  const warning=e("div","rz-v5-empty",mode==="purchased"?"You have no ready-made RizSim courses licensed to this account yet.":"No eligible experiences have been found for this account.");
  grid.prepend(warning);
 }
}
function mount(){
 if(mounted)return;
 const source=$("rzLegacyPlayerPanels");
 if(!source)return;
 // Move, never clone, existing panels so their event listeners and secure operations remain intact.
 const form=$("classroomCreateForm");
 const createPanel=form?.closest(".portal-panel");
 const accessPanel=$("classroomCreatedResult")?.closest(".portal-panel");
 const roster=$("classroomRosterPanel");
 const rows=$("classroomSessionRows")?.closest(".portal-panel");
 const out=$("rzLiveSetupMount"),run=$("rzLiveRunningMount");
 if(createPanel&&out)out.append(createPanel);
 if(run){[accessPanel,roster,rows].forEach(n=>{if(n)run.append(n)});}
 // Keep global Records/Results views in place: their presenters still own them.
 const results=$("view-classroom")?.querySelector(".rz-player-results");
 if(results&&!$("rzLiveResultsAnchor").contains(results))$("rzLiveResultsAnchor").append(results);
 mounted=true;
}
function setup(){
 mount();
 const s=snapshot();
 if(mode==="simulation"){
  const product=(s?.licensed||[]).find(x=>String(x.id)===selection);
  if(!product){navigate(mode,"list");return}
  $("rzLiveSetupTitle").textContent=product.title||"Create a session";
  const pick=$("classroomSimulationSelect");
  if(pick&&pick.value!==selection&&Array.from(pick.options).some(o=>o.value===selection)){
   pick.value=selection;pick.dispatchEvent(new Event("change",{bubbles:true}));
  }
  const form=$("classroomCreateForm");if(form)form.hidden=false;
  // Existing license check continues to control form availability.
  // Keep original form and privileged session-creation handler unchanged.
 } else {
  const course=(s?.courses||[]).find(x=>String(x.course_id)===selection);
  if(mode!=="own"||!course||s.role!=="course_lead"){navigate(mode,"list");return}
  $("rzLiveSetupTitle").textContent=course.title||"Create a class";
  const target=$("rzLiveSetupMount"), existing=$("courseClassroomPanel");
  if(existing&&target&&!target.contains(existing))target.append(existing);
  if(confirmedCourse!==selection&&pendingCourse!==selection){
   const requested=selection;pendingCourse=requested;
   Promise.resolve(bridge()?.selectCourse(requested)).then(()=>{
    if(pendingCourse===requested){confirmedCourse=requested;pendingCourse="";if(selection===requested&&stage==="setup")draw();}
   }).catch(()=>{if(pendingCourse===requested)pendingCourse="";});
  }
 }
}
function running(){
 mount();
 if(mode==="own"){
  const material=$("courseMaterialsPanel");
  const anchor=$("rzLiveRunningMount");
  if(material&&anchor&&!anchor.contains(material))anchor.append(material);
  if(material)material.hidden=false;
  const drop=$("rzClassroomDropZone");
  if(drop&&anchor&&!anchor.contains(drop))anchor.append(drop);
 }
 $("rzLiveResultsAnchor").hidden=false;
}
function draw(){
 const active=snapshot();if(!active)return;
 if(mode==="own"&&active.role!=="course_lead"){mode="";stage="menu";selection="";}
 if(mode==="purchased"&&(stage==="setup"||stage==="running")){stage="list";selection="";}
 const live=$("view-classroom");if(!live)return;
 const [choice,list,form,run]=["rzLiveChoices","rzLiveCollection","rzLiveSetup","rzLiveRunning"].map($);
 if(!choice||!list||!form||!run)return;
 const crumbs=$("rzLiveBreadcrumb");crumbs.replaceChildren();
 crumbs.append(button("Live Classroom","rz-v5-crumb",()=>navigate("","menu")));
 if(mode)crumbs.append(e("span","rz-v5-slash","/"),button({simulation:"Run Simulation",own:"Run My Own Course",purchased:"Run Purchased Course"}[mode],"rz-v5-crumb",()=>navigate(mode,"list")));
 if(stage==="setup"||stage==="running")crumbs.append(e("span","rz-v5-slash","/"),e("span","rz-v5-crumb-current",stage==="setup"?"Create Session":"Session & Results"));
 choice.hidden=stage!=="menu";list.hidden=stage!=="list";form.hidden=stage!=="setup";run.hidden=stage!=="running";
 $("rzLiveHelp").hidden=true;
 if(stage==="menu")options();
 if(stage==="list")collection();
 if(stage==="setup")setup();
 if(stage==="running")running();
 const jump=$("rzLiveJumpResults");if(jump)jump.hidden=stage!=="running";
}
function init(){
 if(ready||!snapshot()||!$("rzLiveChoices"))return;
 ready=true;window.RizSimLiveClassroom={draw};
 const url=freshUrl(),parts=(url?.searchParams.get("live")||"").split("-");
 if(["simulation","own","purchased"].includes(parts[0])){mode=parts[0];stage=["list","setup","running"].includes(parts[1])?parts[1]:"list";selection=url?.searchParams.get("selection")||"";}
 const help=e("p","rz-v5-help");help.id="rzLiveHelp";help.hidden=true;$("rzLiveChoices").after(help);
 $("rzLiveJumpResults")?.addEventListener("click",()=>$("rzLiveResultsAnchor")?.scrollIntoView({behavior:"smooth",block:"start"}));
 window.addEventListener("popstate",()=>{const u=freshUrl();const parts=(u?.searchParams.get("live")||"").split("-");mode=["simulation","own","purchased"].includes(parts[0])?parts[0]:"";stage=mode&&["list","setup","running"].includes(parts[1])?parts[1]:"menu";selection=u?.searchParams.get("selection")||"";draw();});
 document.querySelector('#mainNav [data-auth-view="classroom"]')?.addEventListener("click",()=>{if(location.hash!=="#classroom")return;setTimeout(draw,320)});
 // Show the access/result stage after the existing handler has produced a session.
 const panel=$("classroomCreatedResult");if(panel){
  const observer=new MutationObserver(()=>{
   if(stage!=="setup"||mode!=="simulation")return;
   if(panel.querySelector(".classroom-created-card,.classroom-code-value,.classroom-code-box"))navigate(mode,"running",selection);
  });observer.observe(panel,{childList:true,subtree:true});
 }
 draw();
}
document.addEventListener("DOMContentLoaded",()=>{let attempts=0;const check=()=>{if(snapshot()&&$("rzLiveChoices"))init();else if(++attempts<100)setTimeout(check,200)};check()});
})();