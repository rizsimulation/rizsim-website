/*
 * RizSim unified authenticated Home.
 * The public index.html is the single source of truth for the Home content,
 * optional announcements and scoped styles. Original dashboard widgets stay
 * mounted for existing render functions and are hidden only after success.
 */
(function () {
  "use strict";

  const mount = document.getElementById("rizsimSharedHome");
  const legacy = document.getElementById("rizsimLegacyHome");
  if (!mount || !legacy) return;

  const mode = document.body.dataset.rizsimHomePortal;
  if (mode !== "student" && mode !== "faculty") return;

  function activatePortalView(view) {
    const attr = mode === "student" ? "data-student-view" : "data-auth-view";
    const tab = document.querySelector('#mainNav [' + attr + '="' + view + '"]');
    if (!tab || tab.style.display === "none") return false;
    tab.click();
    return true;
  }

  function bindPortalNavigation(shadow) {
    shadow.addEventListener("click", function (event) {
      const origin = event.target;
      if (!origin || typeof origin.closest !== "function") return;
      const link = origin.closest("a[href]");
      if (!link) return;

      const relative = link.getAttribute("href");
      if (!relative || relative.startsWith("#")) return;

      let url;
      try {
        url = new URL(relative, window.location.href);
      } catch (_) { return; }
      if (url.origin !== window.location.origin) return;

      const page = url.pathname.split("/").pop();
      if(mode === "student" && page === "simulations.html"){
        event.preventDefault();activatePortalView("resources");return;
      }
      // Category selection belongs to the environment, never to the account.
      // A same-origin portal reload retains the Supabase session while allowing
      // its native category filter to pick up the selected category from URL.
      if (page === "simulations.html" && url.searchParams.has("category")) {
        const selectedCategory = url.searchParams.get("category");
        if (["learning", "skills", "children"].includes(selectedCategory)) {
          event.preventDefault();
          window.location.assign(
            (mode === "student" ? "access-in.html" : "access-out.html") +
            "?category=" + encodeURIComponent(selectedCategory) +
            "#simulations"
          );
          return;
        }
      }
      const common = {
        "simulations.html": "simulations",
        "about.html": "about",
        "contact.html": "contact"
      };
      let destination = common[page] || null;
      if (mode === "student" && page === "access-in.html") destination = "player";
      if (mode === "faculty" && page === "access-out.html") destination = "simulations";
      if (destination) {
        const attr = mode === "student" ? "data-student-view" : "data-auth-view";
        const tab = document.querySelector('#mainNav [' + attr + '="' + destination + '"]');
        if (tab && tab.style.display !== "none") {
          event.preventDefault();
          activatePortalView(destination);
        }
      }
    });
  }

  function addStyle(text) {
    const element = document.createElement("style");
    element.textContent = text;
    return element;
  }

  async function loadSharedHome() {
    try {
      const response = await fetch("index.html", {
        cache: "no-store",
        credentials: "same-origin"
      });
      if (!response.ok) throw new Error("Home source unavailable: " + response.status);

      const doc = new DOMParser().parseFromString(await response.text(), "text/html");
      const homepage = doc.querySelector("main#pageContent.bp-home");
      const homeStyles = [
        "rizsim-brand-promise-home",
        "rizsim-home-v2-premium",
        "rizsim-home-announcement-style",
        "rizsim-promo-v3"
      ].map(function (id) { return doc.getElementById(id); });

      if (!homepage || homeStyles.some(function (style) { return !style; })) {
        throw new Error("The approved Home layout/styles could not be found.");
      }

      const shadow = mount.attachShadow({ mode: "open" });
      const fundamentals = addStyle([
        ":host {",
        "display: block; width: 100%;",
        "--navy: #061827; --navy-deep: #03101b; --navy-medium: #082f42;",
        "--teal: #18b8b0; --teal-dark: #087f86; --teal-light: #59ded6;",
        "--gold: #efc15b; --sea-dark: #9fc9c6; --sea-mid: #b5d4d1;",
        "--sea-light: #c5dcd9; --white: #fff; --ink: #081d2d;",
        "--muted: #687d8a; --line: #dce7eb; --surface: #f7fafb;",
        "--max-width: 1220px; --rizsim-texture: none;",
        "--rizsim-texture-size: 100% 100%;",
        "font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;",
        "line-height: 1.55; color: var(--ink);",
        "}",
        ":host *, :host *::before, :host *::after { box-sizing: border-box; }",
        ":host .page-content { min-height: 0; }",
        ":host [hidden] { display: none !important; }"
      ].join("\n"));
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = "site.css";
      const experienceStylesheet = document.createElement("link");
      experienceStylesheet.rel = "stylesheet";
      experienceStylesheet.href = "rizsim-experiences.css";

      const page = document.createElement("div");
      page.className = "page-content bp-home";
      page.setAttribute("aria-label", "RizSim Home");
      page.innerHTML = homepage.innerHTML;

      shadow.appendChild(fundamentals);
      shadow.appendChild(stylesheet);
      shadow.appendChild(experienceStylesheet);
      homeStyles.forEach(function (style) {
        shadow.appendChild(addStyle(style.textContent));
      });
      shadow.appendChild(page);
      bindPortalNavigation(shadow);
      // Match the official Home icons inside the dashboard Shadow DOM.
      window.RizSimExperience?.decorateHome(shadow);
      if(mode === "student") window.RizSimStudentWorkspace?.decorateHome(shadow);

      // If styles do not load, retain the original working dashboard Home.
      function awaitStylesheet(sheet) {
        return new Promise(function (resolve) {
          sheet.addEventListener("load", function () { resolve(true); }, { once: true });
          sheet.addEventListener("error", function () { resolve(false); }, { once: true });
        });
      }
      const loaded = await Promise.race([
        Promise.all([awaitStylesheet(stylesheet), awaitStylesheet(experienceStylesheet)])
          .then(function (results) { return results.every(Boolean); }),
        new Promise(function (resolve) { window.setTimeout(function () { resolve(false); }, 3500); })
      ]);
      if (!loaded) throw new Error("Home stylesheet could not be confirmed.");

      legacy.hidden = true;
      legacy.setAttribute("aria-hidden", "true");
      document.getElementById("view-home").classList.add("rizsim-unified-home");
      mount.classList.add("is-ready");
    } catch (error) {
      mount.classList.remove("is-ready");
      console.warn("RizSim shared Home fallback:", error?.message || error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadSharedHome, { once: true });
  } else {
    loadSharedHome();
  }
})();
