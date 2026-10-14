/* RizSim category navigation. Selecting a category never changes authorization. */
(function() {
  "use strict";
  const student = !!document.querySelector(".student-content");
  const faculty = !!document.querySelector(".auth-page-content");
  const portal = student || faculty;
  const attr = student ? "data-student-view" : "data-auth-view";
  const base = student ? "access-in.html" : faculty ? "access-out.html" : "simulations.html";
  const categories = {learning:"Learning",skills:"Skills",children:"Children"};
  const params = new URLSearchParams(location.search);
  let selected = Object.prototype.hasOwnProperty.call(categories,params.get("category")) ? params.get("category") : "";
  // Consistent, purpose-specific line icons (Lucide-style SVG paths), never emoji glyphs.
  const iconPaths = {
    library: '<path d="M4 19.5V5.4A2.4 2.4 0 0 1 6.4 3H20v16H6.4a2.4 2.4 0 0 0 0 4H20"/><path d="M4 19.5A2.4 2.4 0 0 1 6.4 17H20"/>',
    settings: '<path d="M3 7h10M17 7h4M3 17h4M11 17h10"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    user: '<circle cx="12" cy="8" r="3.3"/><path d="M5.2 20a6.8 6.8 0 0 1 13.6 0"/><circle cx="12" cy="12" r="10"/>',
    arrow: '<path d="M7 17 17 7M7 7h10v10"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
    learning: '<path d="M12 18V5.2M12 7.5a4.7 4.7 0 1 0-7.2 4 4.2 4.2 0 0 0 .4 6.6A4.2 4.2 0 0 0 9.4 21c1.4 0 2.6-.7 2.6-2.3M12 7.5a4.7 4.7 0 1 1 7.2 4 4.2 4.2 0 0 1-.4 6.6 4.2 4.2 0 0 1-4.2 2.9c-1.4 0-2.6-.7-2.6-2.3"/><path d="M6 10.5c1.6 0 2.8.7 3.5 2M18 10.5c-1.6 0-2.8.7-3.5 2"/>',
    skills: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/><path d="m16 8 5-5"/>',
    children: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><path d="M17 13v8M13 17h8"/>',
    graduation: '<path d="m2 10 10-5 10 5-10 5-10-5Z"/><path d="M6 12.5V17c3.6 2.5 8.4 2.5 12 0v-4.5M22 10v6"/>',
    faculty: '<rect x="4" y="3" width="16" height="13" rx="2"/><path d="M8 21h8M12 16v5M8 8h8M8 12h5"/>',
    shield: '<path d="m12 22 1.7-.7C19.3 19 21 15.7 21 11V5l-9-3-9 3v6c0 4.7 1.7 8 7.3 10.3L12 22Z"/><path d="m9 12 2 2 4-4"/>',
    sparkles: '<path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2ZM19 17l.7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7L19 17Z"/>',
    check: '<path d="m5 12 4 4L19 6"/>'
  };
  function svg(name) {
    const path=iconPaths[name]||iconPaths.user;
    return '<svg class="rz-v3-svg" viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+path+'</svg>';
  }
  function decorateHome(root) {
    if(!root || !root.querySelectorAll)return;
    const categoryIcons=["learning","skills","children"];
    root.querySelectorAll(".bp-category-tile .bp-category-icon").forEach(function(node,index){
      if(node.dataset.rzV3Icon)return;
      node.innerHTML=svg(categoryIcons[index]||"learning");
      node.dataset.rzV3Icon="true";
    });
    root.querySelectorAll(".rizsim-announcement-spark").forEach(function(node){
      if(node.dataset.rzV3Icon)return;
      node.innerHTML=svg("sparkles");
      node.dataset.rzV3Icon="true";
    });
  }
  function decorateMenu() {
    document.querySelectorAll("#accountMenu .account-menu-icon").forEach(function(el){
      if(el.dataset.rzV3Icon)return;
      const node=el.closest(".account-menu-button");
      const kind=node?.classList.contains("danger")?"logout":node?.id==="ownerPublicSiteButton"?"arrow":"user";
      el.innerHTML=svg(kind);el.dataset.rzV3Icon="true";
    });
    document.querySelectorAll("#loginMenu .login-role-icon").forEach(function(el,i){
      if(el.dataset.rzV3Icon)return;
      el.innerHTML=svg(i===0?"graduation":"faculty");
      el.dataset.rzV3Icon="true";
    });
    document.querySelectorAll(".rz-role-switch > a,.rz-role-switch > .rz-role-current").forEach(function(el){
      if(el.dataset.rzV3Icon)return;
      let text=el.textContent.toLowerCase();
      const kind=text.includes("student")?"graduation":text.includes("faculty")?"faculty":text.includes("owner")||text.includes("lead")||text.includes("admin")?"shield":"user";
      const initial=document.createElement("span");
      initial.className="rz-role-icon";initial.innerHTML=svg(kind);
      el.prepend(initial);el.dataset.rzV3Icon="true";
    });
  }
  function updateProfile(user, membership) {
    window.RizSimExperience.verifiedIdentity={user,membership};
    const card=sidebar.querySelector(".rz-profile-button");
    if(!card || !user)return;
    const name=sidebar.querySelector("[data-rz-profile-name]");
    const role=sidebar.querySelector("[data-rz-profile-role]");
    const email=sidebar.querySelector("[data-rz-profile-email]");
    const avatar=sidebar.querySelector("[data-rz-profile-avatar]");
    const menuName=document.getElementById("accountMenuName")?.textContent?.trim();
    const validName=menuName && !/^RizSim (User|Learner)$/i.test(menuName) ? menuName : "";
    const display=validName||user.user_metadata?.full_name||user.user_metadata?.name||user.email?.split("@")[0]||"RizSim Member";
    const verifiedRole=membership?.active?membership.role:null;
    const roles={faculty:"Faculty",course_lead:"Course Lead",owner:"Owner",admin:"Administration",institution:"Institution"};
    name.textContent=display;
    role.textContent=student?"Student workspace":faculty?(roles[verifiedRole]||"Faculty workspace"):"Signed-in account";
    email.textContent=user.email||"";
    card.title="Open account • "+display;
    if(avatar){
      let source=document.querySelector("#accountMenuAvatar img")?.getAttribute("src")||user.user_metadata?.avatar_url||user.user_metadata?.picture||"";
      try {
        const url=new URL(source,location.href);
        if(url.protocol!=="https:")source="";
      }catch(_){source="";}
      if(source){
        const img=document.createElement("img");img.src=source;img.alt="";
        img.referrerPolicy="no-referrer";avatar.replaceChildren(img);
      } else {
        avatar.textContent=display.split(/\s+/).slice(0,2).map(w=>w[0]).join("").toUpperCase();
      }
    }
  }
  window.RizSimExperience=Object.freeze({svg,decorateHome,decorateMenu,updateProfile});
  const sidebar = document.querySelector("#siteSidebar .sidebar-inner");
  if(!sidebar)return;
  const drawerToggle=document.getElementById("sidebarToggle");
  const drawerOverlay=document.getElementById("sidebarOverlay");
  if(student&&drawerToggle) {
    drawerToggle.addEventListener("click",function(event){
      event.stopPropagation();
      const open=!document.body.classList.contains("sidebar-open");
      document.body.classList.toggle("sidebar-open",open);
      drawerToggle.setAttribute("aria-expanded",String(open));
      drawerToggle.setAttribute("aria-label",open?"Collapse sidebar":"Open sidebar");
      document.getElementById("siteSidebar")?.setAttribute("aria-hidden",String(!open));
      drawerOverlay?.setAttribute("aria-hidden",String(!open));
    });
    drawerOverlay?.addEventListener("click",closeDrawer);
    document.addEventListener("keydown",function(event){if(event.key==="Escape")closeDrawer();});
  }

  function goto(view) {
    const link = document.querySelector("#mainNav ["+attr+"=\""+view+"\"]");
    if(link && link.style.display!=="none") { link.click(); return true; }
    return false;
  }
  function closeDrawer() {
    if(typeof window.closeSidebar==="function"){window.closeSidebar();return;}
    document.body.classList.remove("sidebar-open");
    document.getElementById("siteSidebar")?.setAttribute("aria-hidden","true");
    document.getElementById("sidebarOverlay")?.setAttribute("aria-hidden","true");
    document.getElementById("sidebarToggle")?.setAttribute("aria-expanded","false");
  }
  function catHref(slug) {
    return (portal?base:"simulations.html")+"?category="+encodeURIComponent(slug)+(portal?"#simulations":"");
  }
  // Categories remain selectable exclusively on the shared Home page.
  // Sidebar is deliberately compact: digital library, Settings, verified Account.
  sidebar.innerHTML='<div class="rz-side rz-side-v3">'+
    '<div class="rz-side-main"><span class="rz-side-label">YOUR LIBRARY</span>'+
    '<a class="rz-library-entry" data-rz-library href="'+(portal?'#resources':'access-in.html?library=1')+'">'+
      '<span class="rz-library-entry-icon">'+svg("library")+'</span>'+
      '<span class="rz-library-entry-text"><strong>eBooks &amp; Resources</strong><small>Explore your digital collection</small></span>'+
      '<span class="rz-library-entry-arrow">'+svg("arrow")+'</span></a></div>'+
    '<div class="rz-side-bottom">'+
      '<button class="rz-settings-link" data-rz-settings type="button" aria-expanded="false" aria-controls="rzSettingsPanel">'+
        '<span class="rz-settings-link-icon">'+svg("settings")+'</span><span>Settings</span><span class="rz-settings-chevron">'+svg("chevron")+'</span></button>'+
      '<div id="rzSettingsPanel" class="rz-settings-panel" hidden>'+
        '<label class="rz-settings-toggle"><span>Reduce motion<small>Minimise interface transitions</small></span><input type="checkbox" data-rz-reduce-motion></label>'+
        '<button type="button" class="rz-settings-manage" data-rz-account>Manage profile &amp; access '+svg("arrow")+'</button></div>'+
      '<button class="rz-profile-button" type="button" data-rz-account aria-label="Open your account">'+
        '<span class="rz-profile-avatar" data-rz-profile-avatar>'+svg("user")+'</span>'+
        '<span class="rz-profile-copy"><strong data-rz-profile-name>'+(portal?'My account':'Guest visitor')+'</strong>'+
          '<small data-rz-profile-role>'+(student?'Student workspace':faculty?'Faculty workspace':'Sign in to RizSim')+'</small>'+
          '<span class="rz-profile-email" data-rz-profile-email></span></span>'+
        '<span class="rz-profile-chevron">'+svg("chevron")+'</span></button></div></div>';
  try{
    const stored=localStorage.getItem("rizsim-ui-reduced-motion")==="true";
    document.documentElement.classList.toggle("rz-reduced-motion",stored);
    const box=sidebar.querySelector("[data-rz-reduce-motion]");if(box)box.checked=stored;
  }catch(_){}
  sidebar.addEventListener("change",function(event){
    if(!event.target.matches("[data-rz-reduce-motion]"))return;
    const checked=!!event.target.checked;
    document.documentElement.classList.toggle("rz-reduced-motion",checked);
    try{localStorage.setItem("rizsim-ui-reduced-motion",String(checked));}catch(_){}
  });
  const nameElement=document.getElementById("accountMenuName");
  if(nameElement) {
    const watch=new MutationObserver(function(){
      const profile=window.RizSimExperience?.verifiedIdentity;
      if(profile) updateProfile(profile.user,profile.membership);
    });
    watch.observe(nameElement,{childList:true,characterData:true,subtree:true});
  }

  function filterCards() {
    const grid=document.getElementById(faculty?"portalSimulationGrid":"simulationGrid");
    if(!grid)return;
    const cards=grid.querySelectorAll(".simulation-card,.portal-simulation-card");
    let shown=0;
    cards.forEach(function(card) {
      const tag=card.dataset.category||card.querySelector(".simulation-category,.card-category,.portal-simulation-category")?.textContent||"";
      const match=!selected||tag.trim().toLowerCase()===selected;
      card.style.display=match?"":"none";
      if(match)shown++;
    });
    const existingEmpty=grid.querySelector(".rz-catalog-empty");
    if((!selected||shown)&&existingEmpty)existingEmpty.remove();
    if(selected&&!shown&&!existingEmpty) {
      const empty=document.createElement("div");empty.className="rz-catalog-empty";
      const strong=document.createElement("strong");strong.textContent="No published "+categories[selected]+" simulations yet";
      const note=document.createElement("p");note.textContent="This category will show its experiences when they are published.";
      empty.append(strong,note);grid.append(empty);
    }
    const area=portal?document.getElementById("view-simulations"):document.querySelector(".catalogue-section");
    if(area) {
      let bar=area.querySelector("[data-rz-catalog-scope]");
      if(!bar) {
        bar=document.createElement("div");bar.className="rz-catalog-scope";bar.dataset.rzCatalogScope="";
        area.querySelector(".content-shell")?.prepend(bar);
      }
      if(bar) {
        bar.textContent="";
        const copy=document.createElement("div"),strong=document.createElement("strong"),small=document.createElement("small"),all=document.createElement("a");
        strong.textContent=selected?categories[selected]+" Simulations":"All simulations";
        small.textContent=selected?"Only this category is visible. Your login remains unchanged.":"Browse published simulation experiences.";
        all.textContent="View all";all.href=portal?base+"#simulations":"simulations.html";all.dataset.rzAll="";
        copy.append(strong,small);bar.append(copy,all);
      }
    }
    sidebar.querySelectorAll("[data-category]").forEach(function(el){el.classList.toggle("is-current",el.dataset.category===(selected||"all"));});
    if(window.RizSimEnvironment)window.RizSimEnvironment.updateEnvironment();
  }

  const grid=document.getElementById(faculty?"portalSimulationGrid":"simulationGrid");
  if(grid){
    let queued=false;
    new MutationObserver(function(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;filterCards();});}).observe(grid,{childList:true});
    filterCards();
  }
  if(!portal&&selected)document.querySelectorAll(".catalogue-filter").forEach(function(el){el.style.display="none";});
  if(portal&&(selected||(student&&params.get("library")==="1"))){
    let tries=0;
    const tick=function(){
      if(document.querySelector(".student-app.show,.authenticated-app.show")){
        if(selected)goto("simulations");
        else document.getElementById("rzHiddenLibraryNav")?.click();
      }else if(++tries<50)setTimeout(tick,250);
    };
    tick();
  }
  sidebar.addEventListener("click",function(event){
    const target=event.target.closest("a,button");if(!target)return;
    if(target.hasAttribute("data-rz-settings")){
      event.preventDefault();
      const panel=sidebar.querySelector("#rzSettingsPanel");
      const expanded=panel?.hidden===true;
      if(panel)panel.hidden=!expanded;
      target.setAttribute("aria-expanded",String(expanded));
      return;
    }
    if(target.hasAttribute("data-rz-account")){
      event.preventDefault();closeDrawer();
      if(portal)goto("account");else location.assign("access-in.html");
      return;
    }
    if(!portal)return;
    if(target.hasAttribute("data-rz-library")) {
      event.preventDefault();closeDrawer();
      const link=document.getElementById("rzHiddenLibraryNav");link?.click();return;
    }
    if(target.dataset.category) {
      event.preventDefault();selected=categories[target.dataset.category]?target.dataset.category:"";
      history.replaceState(null,"",base+(selected?"?category="+selected:"")+"#simulations");
      filterCards();closeDrawer();goto("simulations");
    }
  });
  document.addEventListener("click",function(event){
    const link=event.target.closest?.("[data-rz-all]");if(!link||!portal)return;
    event.preventDefault();selected="";history.replaceState(null,"",base+"#simulations");filterCards();goto("simulations");
  });
  const brand=document.querySelector(".nav-logo-link");
  if(brand){
    // Remove the old duplicate RizSim text link; keep the official logo.
    document.getElementById("rzBrandHome")?.remove();
    let title=document.getElementById("rzCurrentEnvironment");
    if(!title){
      title=document.createElement("span");
      title.id="rzCurrentEnvironment";title.className="rz-v3-environment";
      title.setAttribute("aria-label","Selected environment");
      brand.insertAdjacentElement("afterend",title);
    }
    function updateEnvironment(){
      title.replaceChildren();
      title.hidden=!selected;
      if(!selected)return;
      const slash=document.createElement("span");slash.className="rz-v3-environment-separator";
      slash.textContent="/";slash.setAttribute("aria-hidden","true");
      const name=document.createElement("span");name.className="rz-v3-environment-name";
      name.textContent=categories[selected];
      title.append(slash,name);
    }
    updateEnvironment();
    window.RizSimEnvironment=Object.freeze({updateEnvironment});
    if(portal){
      brand.href="#home";
      brand.setAttribute("aria-label","RizSim general Home");
      brand.addEventListener("click",function(event){
        event.preventDefault();
        event.stopImmediatePropagation();
        selected="";
        history.replaceState(null,"",base+"#home");
        filterCards();
        updateEnvironment();
        closeDrawer();
        goto("home");
      },true);
    }
  }
  decorateHome(document);
  decorateMenu();

})();