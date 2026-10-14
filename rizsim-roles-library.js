/* Single-session, verified role menu and independent authenticated eBook library.
   No role is granted or modified by this script. */
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
const url="https://rvmumpvtvjvvuyimeybc.supabase.co";
const key="sb_publishable_wufSxfg90bb4R6XarScaJQ_Dl5wlmtf";
const student=!!document.querySelector(".student-content");
const faculty=!!document.querySelector(".auth-page-content");
const portal=student||faculty;
// Existing portals already own a Supabase client. Share that exact instance
// to prevent competing refresh-token operations from multiple GoTrue clients.
async function waitForPortalClient(){
  for(let i=0;i<60;i++){
    if(window.rizsimSharedAuth)return window.rizsimSharedAuth;
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw new Error("The existing authenticated portal session is not ready.");
}
const client=portal ? await waitForPortalClient() :
  createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
window.rizsimSharedAuth=client;
const attr=student?"data-student-view":"data-auth-view";
const go=student?"access-in.html":"access-out.html";
function safeName(x){return typeof x==="string"?x:""}
function identityMenu(menu,user,membership){
  if(!menu)return;
  menu.querySelector(".rz-role-switch")?.remove();
  const area=document.createElement("div");area.className="rz-role-switch";
  const heading=document.createElement("div");heading.className="rz-role-title";heading.textContent="Switch workspace";area.append(heading);
  const role=membership?.role;
  const facultyEligible=["faculty","course_lead","owner"].includes(role);
  const entries=[["Student","access-in.html",true],["Faculty","access-out.html",facultyEligible]];
  if(role==="course_lead") entries.push(["Course Lead","access-out.html#courses",true]);
  if(role==="owner") entries.push(["Owner","access-out.html#administration",true]);
  if(role==="admin") entries.push(["Administration","access-out.html#administration",true]);
  if(role==="institution") entries.push(["Institution","access-out.html#institution",true]);
  let added=0;
  entries.forEach(([label,target,enabled])=>{
    if(!enabled)return;
    const current=(student&&label==="Student")||(faculty&&
      (label==="Faculty"&&role==="faculty"||label==="Course Lead"&&role==="course_lead"||
       label==="Owner"&&role==="owner"||label==="Administration"&&role==="admin"||
       label==="Institution"&&role==="institution"));
    const node=document.createElement(current?"div":"a");
    node.className=current?"rz-role-current":"";
    if(!current)node.href=target;
    node.textContent=label;
    const note=document.createElement("small");note.textContent=current?"Current":"↗";
    node.append(note);area.append(node);added++;
  });
  if(!added)return;
  const signout=menu.querySelector("#portalSignOut,#signOutButton");
  if(signout)signout.before(area);else menu.append(area);
}
async function verifyRoles(){
 const u=window.RizSimSession ? await window.RizSimSession.verifyUser(client) : await client.auth.getUser();const user=u.data?.user;
 if(!user)return;
 // On a fresh visit to rizsim.com, directly restore the last verified
 // dashboard. Explicit ?public=1 is an escape hatch for public browsing.
 if(!portal && document.body.dataset.page==="home"){
   const forcePublic=new URLSearchParams(window.location.search).get("public")==="1";
   if(window.RizSimSession?.autoResume(user,{
      page:"home",
      forcePublic,
      replace:function(path){window.location.replace(path);}
   })) return;
 }
 const membership=await client.from("access_out_members").select("role,active").eq("user_id",user.id).maybeSingle();
 const role=membership.error||!membership.data?.active?null:membership.data;
 if(portal){identityMenu(document.getElementById("accountMenu"),user,role);}
 // A role link changes workspace navigation, not the membership or login.
 if(faculty && role && ["#courses","#administration","#institution"].includes(location.hash)){
   const target=location.hash.slice(1);
   const allowedByRole={
     courses:["owner","course_lead"],
     administration:["owner","admin"],
     institution:["owner","institution"]
   };
   if(allowedByRole[target]?.includes(role.role)){
     let checks=0;
     const navigateWhenReady=function(){
       if(document.querySelector(".authenticated-app.show")){
         const tab=document.querySelector('#mainNav [data-auth-view="'+target+'"]');
         if(tab && tab.style.display!=="none") tab.click();
       }else if(++checks<50){setTimeout(navigateWhenReady,220);}
     };
     navigateWhenReady();
   }
 }
 else{
   const button=document.getElementById("loginButton");
   const menu=document.getElementById("loginMenu");
   if(button){const label=button.querySelector("span");if(label)label.textContent="Account";}
   if(menu){
     // Once signed in, show only verified workspaces, not the public sign-in choices.
     menu.querySelectorAll(".login-role-button").forEach(function(link){link.style.display="none";});
     menu.querySelector(".rz-role-switch")?.remove();
     const wrap=document.createElement("div");wrap.className="rz-role-switch";
     const title=document.createElement("div");title.className="rz-role-title";
     title.textContent="Signed in · "+safeName(user.email).split("@")[0];wrap.append(title);
     const studentLink=document.createElement("a");studentLink.href="access-in.html";studentLink.textContent="Student dashboard";wrap.append(studentLink);
     if(role){const f=document.createElement("a");f.href="access-out.html";f.textContent=(role.role==="course_lead"?"Course Lead":role.role==="owner"?"Owner":role.role==="admin"?"Admin":role.role==="institution"?"Institution":"Faculty")+" dashboard";wrap.append(f);}
     // Show a direct, no-login return to the last *verified* workspace.
     const previous=window.RizSimSession?.resumeTarget(user);
     if(previous){
       const resume=document.createElement("a");
       resume.href=previous;resume.textContent="Continue previous workspace →";
       resume.style.cssText="background:#e5f5f1;border:1px solid #aedbd1;color:#126a73";
       wrap.append(resume);
     }
     menu.prepend(wrap);
   }
 }
}
async function loadLibrary(){
 const grid=document.getElementById("rzLibraryGrid");if(!grid)return;
 const user=(await client.auth.getUser()).data?.user;
 if(!user){grid.textContent="Sign in to view available resources.";return}
 let resources=[];
 if(student){
   const result=await client.rpc("get_my_rizsim_resource_catalogue");
   if(!result.error)resources=result.data||[];
 }else{
   const result=await client.from("products").select("id,title,product_type,short_description,status").eq("status","published").in("product_type",["ebook","resource"]);
   if(!result.error)resources=result.data||[];
 }
 grid.textContent="";
 if(!resources.length){const empty=document.createElement("div");empty.className="rz-catalog-empty";empty.textContent="No available eBooks or resources yet. New publications will appear here.";grid.append(empty);return}
 resources.forEach(function(p,index){
   const id=p.product_id||p.id;if(!id)return;
   const article=document.createElement("article");article.className="rz-book";
   const cover=document.createElement("div");cover.className="rz-book-cover";
   const glyph=document.createElement("span");glyph.textContent=p.product_type==="ebook"?"▤":"✦";cover.append(glyph);
   const tag=document.createElement("small");tag.textContent=p.product_type==="ebook"?"DIGITAL EBOOK":"LEARNING RESOURCE";
   const heading=document.createElement("h2");heading.textContent=p.title||"RizSim Resource";
   const description=document.createElement("p");description.textContent=p.short_description||"Protected RizSim learning material.";
   const link=document.createElement("a");link.textContent="Open resource →";link.href="resource-viewer.html?resource="+encodeURIComponent(id);
   article.append(cover,tag,heading,description,link);grid.append(article);
 });
}
if(portal){
 const main=document.getElementById("studentContent")||document.getElementById("authPageContent");
 const view= document.getElementById("view-home");
 const tablist=document.getElementById("mainNav");
 if(main&&view&&tablist&&!document.getElementById("view-resources")){
    const section=document.createElement("section");
    section.id="view-resources";section.className=student?"student-view":"auth-view";section.dataset.view="resources";
    section.innerHTML='<div class="content-shell"><div class="rz-library-hero"><span class="rz-library-kicker">RIZSIM DIGITAL LIBRARY</span><h1>eBooks <em>&amp;</em> Resources</h1><p>An independent reading environment. Explore published materials without leaving your account.</p></div><div id="rzLibraryGrid" class="rz-library-grid"><div class="rz-catalog-empty">Loading your library…</div></div></div>';
    view.after(section);
    const tab=document.createElement("a");tab.id="rzHiddenLibraryNav";tab.href="#resources";tab.dataset[student?"studentView":"authView"]="resources";
    tab.textContent="Resources";tab.className="rz-internal-hidden-tab";tab.setAttribute("aria-label","Internal library navigation");
    tablist.append(tab);
    const st=document.createElement("style");st.textContent='.rz-internal-hidden-tab{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip-path:inset(50%)!important;pointer-events:none!important;}';
    document.head.append(st);
 }
}
verifyRoles();
loadLibrary();
