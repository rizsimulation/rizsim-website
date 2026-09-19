/* ============================================================
   RIZSIM GLOBAL WEBSITE JAVASCRIPT
============================================================ */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    initialiseActiveNavigation();

    initialiseFooterYear();

    initialiseSplash();

    initialiseMobileNavigation();

    initialiseLoginMenu();

    initialiseSidebar();

    initialisePageTransitions();

    initialiseSafeSwipe();

    initialisePageEntryAnimation();

  }
);



/* ============================================================
   PAGE ORDER
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

        if (
          link.dataset.page ===
          currentPage
        ) {

          link.classList.add(
            "is-active"
          );

          link.setAttribute(
            "aria-current",
            "page"
          );

        } else {

          link.classList.remove(
            "is-active"
          );

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

          if (splash.parentNode) {

            splash.parentNode.removeChild(
              splash
            );

          }

        },
        950
      );

    },
    delay
  );

}



/* ============================================================
   MOBILE NAVIGATION
============================================================ */

function initialiseMobileNavigation() {

  const button =
    document.getElementById(
      "mobileMenuButton"
    );


  const nav =
    document.getElementById(
      "mainNav"
    );


  if (
    !button ||
    !nav
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
        nav.classList.toggle(
          "is-open"
        );


      button.setAttribute(
        "aria-expanded",
        String(open)
      );

    }
  );


  nav
    .querySelectorAll("a")
    .forEach(
      link => {

        link.addEventListener(
          "click",
          () => {

            nav.classList.remove(
              "is-open"
            );

            button.setAttribute(
              "aria-expanded",
              "false"
            );

          }
        );

      }
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


  button.setAttribute(
    "aria-expanded",
    "true"
  );


  menu.setAttribute(
    "aria-hidden",
    "false"
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


  button.setAttribute(
    "aria-expanded",
    "false"
  );


  menu.setAttribute(
    "aria-hidden",
    "true"
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


  const collapse =
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


  if (collapse) {

    collapse.addEventListener(
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

  const toggle =
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
    !toggle ||
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


  toggle.setAttribute(
    "aria-expanded",
    "true"
  );


  toggle.setAttribute(
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

  const toggle =
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
    !toggle ||
    !sidebar ||
    !overlay
  ) {

    return;

  }


  document.body.classList.remove(
    "sidebar-open"
  );


  toggle.setAttribute(
    "aria-expanded",
    "false"
  );


  toggle.setAttribute(
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

  const toggle =
    document.getElementById(
      "sidebarToggle"
    );


  const overlay =
    document.getElementById(
      "sidebarOverlay"
    );


  if (!toggle) {
    return;
  }


  toggle.addEventListener(
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
   CLOSE MOBILE NAV
============================================================ */

function closeMobileNavigation() {

  const nav =
    document.getElementById(
      "mainNav"
    );


  const button =
    document.getElementById(
      "mobileMenuButton"
    );


  if (nav) {

    nav.classList.remove(
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
      event.key !== "Escape"
    ) {

      return;

    }


    closeLoginMenu();

    closeSidebar();

    closeMobileNavigation();

  }
);



/* ============================================================
   PAGE DIRECTION
============================================================ */

function getCurrentPageIndex() {

  const currentPage =
    document.body.dataset.page;


  return RIZSIM_PAGES.findIndex(
    page =>
      page.key === currentPage
  );

}


function getPageIndexFromUrl(url) {

  const cleanUrl =
    url
      .split("?")[0]
      .split("#")[0]
      .split("/")
      .pop() ||
    "index.html";


  return RIZSIM_PAGES.findIndex(
    page =>
      page.url === cleanUrl
  );

}



/* ============================================================
   PAGE TRANSITION
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


  const body =
    document.body;


  if (
    direction === "prev"
  ) {

    body.classList.add(
      "page-exit-prev"
    );

  } else {

    body.classList.add(
      "page-exit-next"
    );

  }


  try {

    sessionStorage.setItem(
      "rizsimNavigationDirection",
      direction
    );

  } catch (error) {

    /* Ignore storage restrictions */

  }


  window.setTimeout(
    () => {

      window.location.href =
        url;

    },
    285
  );

}



/* ============================================================
   CLICK NAVIGATION TRANSITIONS
============================================================ */

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
              currentIndex === -1
            ) {

              return;

            }


            if (
              destinationIndex ===
              currentIndex
            ) {

              return;

            }


            event.preventDefault();


            const direction =
              destinationIndex >
              currentIndex
                ? "next"
                : "prev";


            navigateWithTransition(
              href,
              direction
            );

          }
        );

      }
    );

}



/* ============================================================
   PAGE ENTRY ANIMATION
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


  if (
    direction === "prev"
  ) {

    document.body.classList.add(
      "page-enter-prev"
    );

  } else {

    document.body.classList.add(
      "page-enter-next"
    );

  }


  window.setTimeout(
    () => {

      document.body.classList.remove(
        "page-enter-next",
        "page-enter-prev"
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


      const target =
        event.target;


      if (
        target.closest(
          blockedSelector
        )
      ) {

        resetSwipe();

        return;

      }


      startTarget =
        target;


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


      /*
        Deliberately conservative thresholds
        to prevent accidental page switching.
      */

      const validDistance =
        absX >= 115;


      const horizontalDominance =
        absX >
        absY * 1.6;


      const limitedVerticalMotion =
        absY <= 80;


      const validDuration =
        duration <= 900;


      if (
        validDistance &&
        horizontalDominance &&
        limitedVerticalMotion &&
        validDuration
      ) {

        if (
          deltaX < 0
        ) {

          navigateAdjacentPage(
            "next"
          );

        } else {

          navigateAdjacentPage(
            "prev"
          );

        }

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
   ADJACENT PAGE SWIPE
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


  let destinationIndex;


  if (
    direction === "next"
  ) {

    destinationIndex =
      currentIndex + 1;

  } else {

    destinationIndex =
      currentIndex - 1;

  }


  if (
    destinationIndex < 0 ||
    destinationIndex >=
      RIZSIM_PAGES.length
  ) {

    return;

  }


  const destination =
    RIZSIM_PAGES[
      destinationIndex
    ];


  showSwipeIndicator(
    direction
  );


  window.setTimeout(
    () => {

      navigateWithTransition(
        destination.url,
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
