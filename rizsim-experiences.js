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
  const sideLinks = Object.entries(categories).map(function(item) {
    const label = item[1],slug=item[0],ico=slug==="learning"?"◈":slug==="skills"?"✦":"✿";
    const descr=slug==="learning"?"Concepts & understanding":slug==="skills"?"Decisions & applied skills":"Younger learners";
    return '<a href="'+catHref(slug)+'" class="rz-side-link" data-category="'+slug+'"><span class="rz-side-icon">'+ico+'</span><span><strong>'+label+'</strong><small>'+descr+'</small></span></a>';
  }).join("");
  sidebar.innerHTML='<div class="rz-side"><div class="rz-side-top"><span class="rz-side-mark">R</span><span><strong>Explore RizSim</strong><small>From Knowing to Doing</small></span></div>'+
    '<div><span class="rz-side-label">Simulation environments</span><div class="rz-side-nav">'+sideLinks+
    '<a href="'+(portal?base+"#simulations":"simulations.html")+'" class="rz-side-link" data-category="all"><span class="rz-side-icon">▦</span><span><strong>All simulations</strong><small>The complete catalogue</small></span></a></div></div>'+
    '<div class="rz-side-resources"><span class="rz-side-label">Digital reading</span><a class="rz-side-link" data-rz-library href="'+(portal?"#resources":"access-in.html?library=1")+'"><span class="rz-side-icon">▤</span><span><strong>eBooks &amp; Resources</strong><small>Dedicated library environment</small></span></a></div>'+
    '<div class="rz-side-foot">'+(portal?
       '<button class="rz-side-link" type="button" data-rz-account><span class="rz-side-icon">◉</span>Account</button><button class="rz-side-link" type="button" data-rz-settings><span class="rz-side-icon">⚙</span>Settings</button>':
       '<a class="rz-side-link" href="access-in.html"><span class="rz-side-icon">◉</span>Account / Sign in</a>')+
    '<small class="rz-side-caption">Changing your environment never changes your account privileges.</small></div></div>';

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
    grid.querySelector(".rz-catalog-empty")?.remove();
    if(selected&&!shown) {
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
  }

  const grid=document.getElementById(faculty?"portalSimulationGrid":"simulationGrid");
  if(grid){
    let queued=false;
    new MutationObserver(function(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;filterCards();});}).observe(grid,{childList:true});
    filterCards();
  }
  if(!portal&&selected)document.querySelectorAll(".catalogue-filter").forEach(function(el){el.style.display="none";});
  if(portal&&selected){
    let tries=0;const tick=function(){if(document.querySelector(".student-app.show,.authenticated-app.show"))goto("simulations");else if(++tries<40)setTimeout(tick,250);};tick();
  }
  sidebar.addEventListener("click",function(event){
    const target=event.target.closest("a,button");if(!target)return;
    if(target.hasAttribute("data-rz-account")||target.hasAttribute("data-rz-settings")){
      event.preventDefault();closeDrawer();goto("account");return;
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
  if(portal){
    const header=document.querySelector(".nav-logo-link");
    if(header&&!document.getElementById("rzBrandHome")){
      const link=document.createElement("a");link.id="rzBrandHome";link.textContent="RizSim";
      link.href="#home";link.className="rz-brand-home";
      link.style.cssText="color:#126771;font-weight:850;font-size:.77rem;white-space:nowrap;margin-left:5px";
      header.after(link);link.addEventListener("click",function(event){event.preventDefault();selected="";goto("home");});
    }
  }
})();