/* ============================================================
   RIZSIM GLOBAL WEBSITE JAVASCRIPT
   PUBLIC WEBSITE OPERATING MODEL
============================================================ */


/* ============================================================
   PUBLIC PAGE ORDER

   IMPORTANT:
   This order also controls left/right swipe navigation.

   New public structure:
   Home → Simulations → About → Contact
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
    key: "about",
    url: "about.html"
  },

  {
    key: "contact",
    url: "contact.html"
  }

];



/* ============================================================
   INITIALISE WEBSITE
============================================================ */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    initialiseActiveNavigation();

    initialiseFooterYear();

    initialiseSplash();

    initialiseLoginMenu();

    initialiseSidebar();

    initialiseMobileNavigation();

    initialiseFacultyAccessInvitation();

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


  if (!year) {

    return;

  }


  year.textContent =
    new Date().getFullYear();

}



/* ============================================================
   SPLASH SCREEN

   IMPORTANT:
   The RizSim splash should appear only once during the
   current browser session.

   Moving between public pages should NOT replay the splash.
============================================================ */

function initialiseSplash() {

  const splash =
    document.getElementById(
      "rizsimSplash"
    );


  if (!splash) {

    return;

  }


  let splashAlreadySeen =
    false;


  try {

    splashAlreadySeen =
      sessionStorage.getItem(
        "rizsimSplashSeen"
      ) === "true";

  } catch (error) {

    splashAlreadySeen =
      false;

  }


  /* ----------------------------------------------------------
     IF SPLASH HAS ALREADY BEEN SEEN
  ---------------------------------------------------------- */

  if (splashAlreadySeen) {

    splash.classList.add(
      "is-hidden"
    );


    splash.setAttribute(
      "aria-hidden",
      "true"
    );


    window.setTimeout(
      () => {

        splash.remove();

      },
      20
    );


    return;

  }


  /* ----------------------------------------------------------
     FIRST VIEW OF THIS BROWSER SESSION
  ---------------------------------------------------------- */

  document.body.classList.add(
    "splash-locked"
  );


  const reducedMotion =
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;


  const delay =
    reducedMotion
      ? 650
      : 4200;


  try {

    sessionStorage.setItem(
      "rizsimSplashSeen",
      "true"
    );

  } catch (error) {

    /* Continue even if sessionStorage is unavailable */

  }


  window.setTimeout(
    () => {

      splash.classList.add(
        "is-hidden"
      );


      splash.setAttribute(
        "aria-hidden",
        "true"
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
   PREMIUM LOGIN MENU
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

  closeFacultyAccessInvitation();


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


      const currentlyOpen =
        menu.classList.contains(
          "is-open"
        );


      if (currentlyOpen) {

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
   LEFT SIDEBAR
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

  closeFacultyAccessInvitation();


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


      const sidebarOpen =
        document.body.classList.contains(
          "sidebar-open"
        );


      if (sidebarOpen) {

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
   MOBILE NAVIGATION
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

      closeFacultyAccessInvitation();


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
   FACULTY ACCESS INVITATION

   This supports the new permanent RizSim purchasing rule.

   Public users do not directly enter the student purchasing
   route.

   When simulations.html is updated, its Buy Access buttons
   will use:

   data-faculty-invite

   The friendly invitation modal will use:

   #facultyAccessInvite
   #facultyAccessInviteClose
   #facultyAccessInviteDismiss

   The Sign Up button itself will remain a normal link.
============================================================ */

function initialiseFacultyAccessInvitation() {

  const modal =
    document.getElementById(
      "facultyAccessInvite"
    );


  if (!modal) {

    return;

  }


  const inviteButtons =
    document.querySelectorAll(
      "[data-faculty-invite]"
    );


  const closeButton =
    document.getElementById(
      "facultyAccessInviteClose"
    );


  const dismissButton =
    document.getElementById(
      "facultyAccessInviteDismiss"
    );


  inviteButtons.forEach(
    button => {

      button.addEventListener(
        "click",
        event => {

          event.preventDefault();


          openFacultyAccessInvitation();

        }
      );

    }
  );


  if (closeButton) {

    closeButton.addEventListener(
      "click",
      () => {

        closeFacultyAccessInvitation();

      }
    );

  }


  if (dismissButton) {

    dismissButton.addEventListener(
      "click",
      () => {

        closeFacultyAccessInvitation();

      }
    );

  }


  modal.addEventListener(
    "click",
    event => {

      if (
        event.target === modal
      ) {

        closeFacultyAccessInvitation();

      }

    }
  );

}



function openFacultyAccessInvitation() {

  const modal =
    document.getElementById(
      "facultyAccessInvite"
    );


  if (!modal) {

    return;

  }


  closeLoginMenu();

  closeSidebar();

  closeMobileNavigation();


  modal.classList.add(
    "is-open"
  );


  modal.setAttribute(
    "aria-hidden",
    "false"
  );


  document.body.classList.add(
    "faculty-invite-open"
  );


  const firstInteractiveElement =
    modal.querySelector(
      "a, button"
    );


  if (firstInteractiveElement) {

    window.setTimeout(
      () => {

        firstInteractiveElement.focus();

      },
      180
    );

  }

}



function closeFacultyAccessInvitation() {

  const modal =
    document.getElementById(
      "facultyAccessInvite"
    );


  if (!modal) {

    return;

  }


  modal.classList.remove(
    "is-open"
  );


  modal.setAttribute(
    "aria-hidden",
    "true"
  );


  document.body.classList.remove(
    "faculty-invite-open"
  );

}



/* ============================================================
   ESCAPE KEY

   Escape closes whichever temporary interface is open.
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


    closeFacultyAccessInvitation();

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

  if (!url) {

    return -1;

  }


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
   PREMIUM PAGE TRANSITIONS
============================================================ */

function navigateWithTransition(
  url,
  direction
) {

  if (!url) {

    return;

  }


  closeFacultyAccessInvitation();

  closeLoginMenu();

  closeSidebar();

  closeMobileNavigation();


  document.body.classList.remove(
    "page-exit-next",
    "page-exit-prev"
  );


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

    /* Continue normally */

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
   LINK-BASED PAGE TRANSITIONS
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


            /*
             * Links which are not part of the four-page
             * public swipe sequence continue normally.
             *
             * Examples:
             * Student Portal
             * Faculty Portal
             * Policy pages
             */

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

    direction =
      null;

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

   IMPORTANT:
   RizSim swipe navigation is intentionally conservative.

   Approved thresholds:

   Minimum horizontal movement: 120px
   Maximum vertical drift:      70px
   Horizontal/vertical ratio:   1.65
   Maximum gesture duration:    750ms
   Browser edge guard:          34px

   Swipe LEFT  → next public page
   Swipe RIGHT → previous public page

============================================================ */

function initialiseSafeSwipe() {

  let startX =
    null;


  let startY =
    null;


  let startTime =
    null;


  let startTarget =
    null;


  let swipeCancelled =
    false;


  const minimumHorizontalTravel =
    120;


  const maximumVerticalDrift =
    70;


  const horizontalDominanceRatio =
    1.65;


  const maximumDuration =
    750;


  const browserEdgeGuard =
    34;



  /* ----------------------------------------------------------
     ELEMENTS WHERE SWIPE MUST NEVER TRIGGER
  ---------------------------------------------------------- */

  const blockedSelector = [

    "[data-swipe-block]",

    "button",

    "a",

    "input",

    "textarea",

    "select",

    "label",

    "form",

    "[contenteditable='true']",

    ".login-menu",

    ".site-sidebar",

    ".product-modal",

    ".faculty-access-invite",

    ".simulation-card",

    ".home-card",

    ".experience-panel"

  ].join(",");



  /* ----------------------------------------------------------
     TOUCH START
  ---------------------------------------------------------- */

  document.addEventListener(
    "touchstart",
    event => {

      resetSwipe();


      if (
        event.touches.length !== 1
      ) {

        return;

      }


      if (
        event.target.closest(
          blockedSelector
        )
      ) {

        return;

      }


      const touch =
        event.touches[0];


      const viewportWidth =
        window.innerWidth;


      /*
       * Avoid interfering with browser-level edge gestures.
       */

      if (
        touch.clientX <=
        browserEdgeGuard ||
        touch.clientX >=
        viewportWidth -
        browserEdgeGuard
      ) {

        return;

      }


      startTarget =
        event.target;


      startX =
        touch.clientX;


      startY =
        touch.clientY;


      startTime =
        Date.now();


      swipeCancelled =
        false;

    },
    {
      passive: true
    }
  );



  /* ----------------------------------------------------------
     TOUCH MOVE

     Cancel the gesture if it becomes predominantly vertical.
  ---------------------------------------------------------- */

  document.addEventListener(
    "touchmove",
    event => {

      if (
        startX === null ||
        startY === null ||
        swipeCancelled ||
        event.touches.length !== 1
      ) {

        return;

      }


      const touch =
        event.touches[0];


      const deltaX =
        touch.clientX -
        startX;


      const deltaY =
        touch.clientY -
        startY;


      const absX =
        Math.abs(
          deltaX
        );


      const absY =
        Math.abs(
          deltaY
        );


      /*
       * A clear vertical movement cancels the swipe completely.
       */

      if (
        absY >
        maximumVerticalDrift
      ) {

        swipeCancelled =
          true;


        return;

      }


      /*
       * If vertical movement becomes dominant early,
       * cancel the navigation gesture.
       */

      if (
        absY > 24 &&
        absY > absX
      ) {

        swipeCancelled =
          true;

      }

    },
    {
      passive: true
    }
  );



  /* ----------------------------------------------------------
     TOUCH END
  ---------------------------------------------------------- */

  document.addEventListener(
    "touchend",
    event => {

      if (
        startX === null ||
        startY === null ||
        !startTarget ||
        swipeCancelled
      ) {

        resetSwipe();


        return;

      }


      /*
       * Swipe navigation is disabled while temporary
       * interface elements are open.
       */

      if (
        document.body.classList.contains(
          "sidebar-open"
        )
      ) {

        resetSwipe();


        return;

      }


      if (
        document.body.classList.contains(
          "faculty-invite-open"
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
        loginMenu &&
        loginMenu.classList.contains(
          "is-open"
        )
      ) {

        resetSwipe();


        return;

      }


      if (
        !event.changedTouches ||
        !event.changedTouches.length
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


      const horizontalEnough =
        absX >=
        minimumHorizontalTravel;


      const verticalControlled =
        absY <=
        maximumVerticalDrift;


      const horizontallyDominant =
        absX >
        absY *
        horizontalDominanceRatio;


      const fastEnough =
        duration <=
        maximumDuration;


      const validSwipe =
        horizontalEnough &&
        verticalControlled &&
        horizontallyDominant &&
        fastEnough;


      if (validSwipe) {

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



  /* ----------------------------------------------------------
     TOUCH CANCEL
  ---------------------------------------------------------- */

  document.addEventListener(
    "touchcancel",
    () => {

      resetSwipe();

    },
    {
      passive: true
    }
  );



  /* ----------------------------------------------------------
     RESET
  ---------------------------------------------------------- */

  function resetSwipe() {

    startX =
      null;


    startY =
      null;


    startTime =
      null;


    startTarget =
      null;


    swipeCancelled =
      false;

  }

}



/* ============================================================
   ADJACENT PUBLIC PAGE NAVIGATION
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


  /*
   * At either end of the public page sequence,
   * do nothing.
   */

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
