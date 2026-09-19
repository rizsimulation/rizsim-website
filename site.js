/* ============================================================
   RIZSIM GLOBAL WEBSITE JAVASCRIPT
============================================================ */

const RIZSIM_PAGES = [
  {
    key: "home",
    url: "index.html"
  },
  {
    key: "simulations",
    url: "simulations.html"
  },
  {
    key: "learning",
    url: "learning.html"
  },
  {
    key: "research",
    url: "research.html"
  },
  {
    key: "about",
    url: "about.html"
  },
  {
    key: "contact",
    url: "contact.html"
  }
];


document.addEventListener(
  "DOMContentLoaded",
  () => {

    initialiseActiveNavigation();
    initialiseFooterYear();
    initialiseSplash();
    initialiseLoginMenu();
    initialiseSidebar();
    initialiseMobileNavigation();
    initialisePageTransitions();
    initialisePageEntryAnimation();
    initialiseSafeSwipe();

  }
);


/* ============================================================
   ACTIVE NAVIGATION
============================================================ */

function initialiseActiveNavigation() {

  const currentPage =
    document.body.dataset.page;


  if (!currentPage) {
    return;
  }


  document
    .querySelectorAll(
      ".main-nav [data-page]"
    )
    .forEach(
      link => {

        const active =
          link.dataset.page ===
          currentPage;


        link.classList.toggle(
          "is-active",
          active
        );


        if (active) {

          link.setAttribute(
            "aria-current",
            "page"
          );

        } else {

          link.removeAttribute(
            "aria-current"
          );

        }

      }
    );

}


/* ============================================================
   FOOTER YEAR
============================================================ */

function initialiseFooterYear() {

  const year =
    document.getElementById(
      "footerYear"
    );


  if (year) {

    year.textContent =
      new Date().getFullYear();

  }

}


/* ============================================================
   SPLASH SCREEN
============================================================ */

function initialiseSplash() {

  const splash =
    document.getElementById(
      "rizsimSplash"
    );


  if (!splash) {
    return;
  }


  document.body.classList.add(
    "splash-locked"
  );


  const reducedMotion =
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;


  const delay =
    reducedMotion
      ? 500
      : 4200;


  window.setTimeout(
    () => {

      splash.classList.add(
        "is-hidden"
      );


      document.body.classList.remove(
        "splash-locked"
      );


      window.setTimeout(
        () => {

          splash.remove();

        },
        950
      );

    },
    delay
  );

}


/* ============================================================
   LOGIN MENU
============================================================ */

function openLoginMenu() {

  const button =
    document.getElementById(
      "loginButton"
    );


  const menu =
    document.getElementById(
      "loginMenu"
    );


  if (
    !button ||
    !menu
  ) {
    return;
  }


  closeSidebar();
  closeMobileNavigation();


  menu.classList.add(
    "is-open"
  );


  menu.setAttribute(
    "aria-hidden",
    "false"
  );


  button.setAttribute(
    "aria-expanded",
    "true"
  );

}


function closeLoginMenu() {

  const button =
    document.getElementById(
      "loginButton"
    );


  const menu =
    document.getElementById(
      "loginMenu"
    );


  if (
    !button ||
    !menu
  ) {
    return;
  }


  menu.classList.remove(
    "is-open"
  );


  menu.setAttribute(
    "aria-hidden",
    "true"
  );


  button.setAttribute(
    "aria-expanded",
    "false"
  );

}


function initialiseLoginMenu() {

  const button =
    document.getElementById(
      "loginButton"
    );


  const menu =
    document.getElementById(
      "loginMenu"
    );


  const collapseButton =
    document.getElementById(
      "loginCollapseButton"
    );


  if (
    !button ||
    !menu
  ) {
    return;
  }


  button.addEventListener(
    "click",
    event => {

      event.stopPropagation();


      if (
        menu.classList.contains(
          "is-open"
        )
      ) {

        closeLoginMenu();

      } else {

        openLoginMenu();

      }

    }
  );


  menu.addEventListener(
    "click",
    event => {

      event.stopPropagation();

    }
  );


  if (collapseButton) {

    collapseButton.addEventListener(
      "click",
      event => {

        event.stopPropagation();

        closeLoginMenu();

        button.focus();

      }
    );

  }


  document.addEventListener(
    "click",
    event => {

      if (
        !menu.contains(
          event.target
        ) &&
        !button.contains(
          event.target
        )
      ) {

        closeLoginMenu();

      }

    }
  );

}


/* ============================================================
   SIDEBAR
============================================================ */

function openSidebar() {

  const button =
    document.getElementById(
      "sidebarToggle"
    );


  const sidebar =
    document.getElementById(
      "siteSidebar"
    );


  const overlay =
    document.getElementById(
      "sidebarOverlay"
    );


  if (
    !button ||
    !sidebar ||
    !overlay
  ) {
    return;
  }


  closeLoginMenu();
  closeMobileNavigation();


  document.body.classList.add(
    "sidebar-open"
  );


  button.setAttribute(
    "aria-expanded",
    "true"
  );


  button.setAttribute(
    "aria-label",
    "Collapse sidebar"
  );


  sidebar.setAttribute(
    "aria-hidden",
    "false"
  );


  overlay.setAttribute(
    "aria-hidden",
    "false"
  );

}


function closeSidebar() {

  const button =
    document.getElementById(
      "sidebarToggle"
    );


  const sidebar =
    document.getElementById(
      "siteSidebar"
    );


  const overlay =
    document.getElementById(
      "sidebarOverlay"
    );


  if (
    !button ||
    !sidebar ||
    !overlay
  ) {
    return;
  }


  document.body.classList.remove(
    "sidebar-open"
  );


  button.setAttribute(
    "aria-expanded",
    "false"
  );


  button.setAttribute(
    "aria-label",
    "Open sidebar"
  );


  sidebar.setAttribute(
    "aria-hidden",
    "true"
  );


  overlay.setAttribute(
    "aria-hidden",
    "true"
  );

}


function initialiseSidebar() {

  const button =
    document.getElementById(
      "sidebarToggle"
    );


  const overlay =
    document.getElementById(
      "sidebarOverlay"
    );


  if (!button) {
    return;
  }


  button.addEventListener(
    "click",
    event => {

      event.stopPropagation();


      if (
        document.body.classList.contains(
          "sidebar-open"
        )
      ) {

        closeSidebar();

      } else {

        openSidebar();

      }

    }
  );


  if (overlay) {

    overlay.addEventListener(
      "click",
      closeSidebar
    );

  }

}


/* ============================================================
   MOBILE NAV
============================================================ */

function initialiseMobileNavigation() {

  const button =
    document.getElementById(
      "mobileMenuButton"
    );


  const navigation =
    document.getElementById(
      "mainNav"
    );


  if (
    !button ||
    !navigation
  ) {
    return;
  }


  button.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      closeLoginMenu();
      closeSidebar();


      const open =
        navigation.classList.toggle(
          "is-open"
        );


      button.setAttribute(
        "aria-expanded",
        String(open)
      );

    }
  );


  navigation
    .querySelectorAll("a")
    .forEach(
      link => {

        link.addEventListener(
          "click",
          closeMobileNavigation
        );

      }
    );

}


function closeMobileNavigation() {

  const navigation =
    document.getElementById(
      "mainNav"
    );


  const button =
    document.getElementById(
      "mobileMenuButton"
    );


  if (navigation) {

    navigation.classList.remove(
      "is-open"
    );

  }


  if (button) {

    button.setAttribute(
      "aria-expanded",
      "false"
    );

  }

}


/* ============================================================
   ESCAPE KEY
============================================================ */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key !==
      "Escape"
    ) {
      return;
    }


    closeLoginMenu();
    closeSidebar();
    closeMobileNavigation();

  }
);


/* ============================================================
   PAGE NAVIGATION HELPERS
============================================================ */

function getCurrentPageIndex() {

  const current =
    document.body.dataset.page;


  return RIZSIM_PAGES.findIndex(
    page =>
      page.key === current
  );

}


function getPageIndexFromUrl(
  url
) {

  const clean =
    url
      .split("?")[0]
      .split("#")[0]
      .split("/")
      .pop() ||
    "index.html";


  return RIZSIM_PAGES.findIndex(
    page =>
      page.url === clean
  );

}


/* ============================================================
   PAGE TRANSITIONS
============================================================ */

function navigateWithTransition(
  url,
  direction
) {

  if (!url) {
    return;
  }


  closeLoginMenu();
  closeSidebar();
  closeMobileNavigation();


  document.body.classList.add(
    direction === "prev"
      ? "page-exit-prev"
      : "page-exit-next"
  );


  try {

    sessionStorage.setItem(
      "rizsimNavigationDirection",
      direction
    );

  } catch (error) {

    /* Ignore */

  }


  window.setTimeout(
    () => {

      window.location.href =
        url;

    },
    285
  );

}


function initialisePageTransitions() {

  document
    .querySelectorAll(
      "[data-page-link]"
    )
    .forEach(
      link => {

        link.addEventListener(
          "click",
          event => {

            if (
              event.defaultPrevented ||
              event.button !== 0 ||
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey ||
              link.target === "_blank"
            ) {
              return;
            }


            const href =
              link.getAttribute(
                "href"
              );


            if (
              !href ||
              href.startsWith("#")
            ) {
              return;
            }


            const destinationIndex =
              getPageIndexFromUrl(
                href
              );


            const currentIndex =
              getCurrentPageIndex();


            if (
              destinationIndex === -1 ||
              currentIndex === -1 ||
              destinationIndex === currentIndex
            ) {
              return;
            }


            event.preventDefault();


            navigateWithTransition(
              href,
              destinationIndex >
              currentIndex
                ? "next"
                : "prev"
            );

          }
        );

      }
    );

}


/* ============================================================
   PAGE ENTRY
============================================================ */

function initialisePageEntryAnimation() {

  let direction =
    null;


  try {

    direction =
      sessionStorage.getItem(
        "rizsimNavigationDirection"
      );


    sessionStorage.removeItem(
      "rizsimNavigationDirection"
    );

  } catch (error) {

    direction = null;

  }


  if (!direction) {
    return;
  }


  document.body.classList.add(
    direction === "prev"
      ? "page-enter-prev"
      : "page-enter-next"
  );


  window.setTimeout(
    () => {

      document.body.classList.remove(
        "page-enter-prev",
        "page-enter-next"
      );

    },
    500
  );

}


/* ============================================================
   SAFE SWIPE NAVIGATION
============================================================ */

function initialiseSafeSwipe() {

  let startX = null;
  let startY = null;
  let startTime = null;
  let startTarget = null;


  const blockedSelector = [
    "[data-swipe-block]",
    "button",
    "a",
    "input",
    "textarea",
    "select",
    "[contenteditable='true']",
    ".login-menu",
    ".site-sidebar"
  ].join(",");


  document.addEventListener(
    "touchstart",
    event => {

      if (
        event.touches.length !== 1
      ) {

        resetSwipe();
        return;

      }


      if (
        event.target.closest(
          blockedSelector
        )
      ) {

        resetSwipe();
        return;

      }


      startTarget =
        event.target;


      startX =
        event.touches[0].clientX;


      startY =
        event.touches[0].clientY;


      startTime =
        Date.now();

    },
    {
      passive: true
    }
  );


  document.addEventListener(
    "touchend",
    event => {

      if (
        startX === null ||
        startY === null ||
        !startTarget
      ) {

        resetSwipe();
        return;

      }


      if (
        document.body.classList.contains(
          "sidebar-open"
        )
      ) {

        resetSwipe();
        return;

      }


      const loginMenu =
        document.getElementById(
          "loginMenu"
        );


      if (
        loginMenu?.classList.contains(
          "is-open"
        )
      ) {

        resetSwipe();
        return;

      }


      const touch =
        event.changedTouches[0];


      const deltaX =
        touch.clientX -
        startX;


      const deltaY =
        touch.clientY -
        startY;


      const duration =
        Date.now() -
        startTime;


      const absX =
        Math.abs(
          deltaX
        );


      const absY =
        Math.abs(
          deltaY
        );


      const valid =
        absX >= 115 &&
        absX > absY * 1.6 &&
        absY <= 80 &&
        duration <= 900;


      if (valid) {

        navigateAdjacentPage(
          deltaX < 0
            ? "next"
            : "prev"
        );

      }


      resetSwipe();

    },
    {
      passive: true
    }
  );


  function resetSwipe() {

    startX = null;
    startY = null;
    startTime = null;
    startTarget = null;

  }

}


/* ============================================================
   ADJACENT PAGE
============================================================ */

function navigateAdjacentPage(
  direction
) {

  const currentIndex =
    getCurrentPageIndex();


  if (
    currentIndex === -1
  ) {
    return;
  }


  const destinationIndex =
    direction === "next"
      ? currentIndex + 1
      : currentIndex - 1;


  if (
    destinationIndex < 0 ||
    destinationIndex >=
    RIZSIM_PAGES.length
  ) {
    return;
  }


  showSwipeIndicator(
    direction
  );


  window.setTimeout(
    () => {

      navigateWithTransition(
        RIZSIM_PAGES[
          destinationIndex
        ].url,
        direction
      );

    },
    135
  );

}


/* ============================================================
   SWIPE INDICATOR
============================================================ */

function showSwipeIndicator(
  direction
) {

  const indicator =
    document.getElementById(
      "swipeIndicator"
    );


  const icon =
    document.getElementById(
      "swipeIndicatorIcon"
    );


  if (
    !indicator ||
    !icon
  ) {
    return;
  }


  indicator.classList.remove(
    "next",
    "prev",
    "show"
  );


  indicator.classList.add(
    direction
  );


  icon.textContent =
    direction === "next"
      ? "→"
      : "←";


  requestAnimationFrame(
    () => {

      indicator.classList.add(
        "show"
      );

    }
  );


  window.setTimeout(
    () => {

      indicator.classList.remove(
        "show"
      );

    },
    320
  );

}
