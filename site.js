/* ============================================================
   RIZSIM GLOBAL WEBSITE JAVASCRIPT
============================================================ */


/* ============================================================
   PUBLIC PAGE ORDER

   This determines:
   - directional click transitions
   - swipe left / right navigation
============================================================ */

const RIZSIM_PUBLIC_PAGES = [

  {
    key: "home",
    file: "index.html"
  },

  {
    key: "simulations",
    file: "simulations.html"
  },

  {
    key: "learning",
    file: "learning.html"
  },

  {
    key: "research",
    file: "research.html"
  },

  {
    key: "about",
    file: "about.html"
  },

  {
    key: "contact",
    file: "contact.html"
  }

];



/* ============================================================
   HELPERS
============================================================ */

function getCurrentFile() {

  const parts =
    window.location.pathname.split("/");


  const file =
    parts[parts.length - 1];


  return file || "index.html";

}


function getPageIndex(file) {

  return RIZSIM_PUBLIC_PAGES.findIndex(

    page =>
      page.file === file

  );

}


function getPublicPageFromHref(href) {

  try {

    const url =
      new URL(
        href,
        window.location.href
      );


    if (
      url.origin !==
      window.location.origin
    ) {

      return null;

    }


    const pieces =
      url.pathname.split("/");


    const file =
      pieces[pieces.length - 1] ||
      "index.html";


    const page =
      RIZSIM_PUBLIC_PAGES.find(

        item =>
          item.file === file

      );


    return page || null;

  } catch (error) {

    return null;

  }

}



/* ============================================================
   ACTIVE NAV TAB
============================================================ */

function setActiveNavigation() {

  const bodyPage =
    document.body.dataset.page;


  document
    .querySelectorAll(
      ".main-nav a[data-page]"
    )
    .forEach(

      link => {


        const isActive =
          link.dataset.page ===
          bodyPage;


        link.classList.toggle(
          "is-active",
          isActive
        );


        if (isActive) {

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
   PAGE ENTER TRANSITION
============================================================ */

function applyEnterTransition() {

  let direction =
    null;


  try {

    direction =
      sessionStorage.getItem(
        "rizsimTransitionDirection"
      );


    sessionStorage.removeItem(
      "rizsimTransitionDirection"
    );

  } catch (error) {

    direction =
      null;

  }


  if (
    direction === "next"
  ) {

    document.body.classList.add(
      "page-enter-next"
    );

  }


  if (
    direction === "prev"
  ) {

    document.body.classList.add(
      "page-enter-prev"
    );

  }


  window.setTimeout(
    () => {

      document.body.classList.remove(
        "page-enter-next",
        "page-enter-prev"
      );

    },
    520
  );

}



/* ============================================================
   CONTROLLED PAGE NAVIGATION
============================================================ */

let pageIsTransitioning =
  false;


function navigateToPublicPage(
  targetFile,
  direction
) {

  if (
    pageIsTransitioning
  ) {

    return;

  }


  const currentFile =
    getCurrentFile();


  if (
    targetFile === currentFile
  ) {

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

    return;

  }


  pageIsTransitioning =
    true;


  try {

    sessionStorage.setItem(
      "rizsimTransitionDirection",
      direction
    );

  } catch (error) {

    /* Continue normally */

  }


  if (
    direction === "prev"
  ) {

    document.body.classList.add(
      "page-exit-prev"
    );

  } else {

    document.body.classList.add(
      "page-exit-next"
    );

  }


  window.setTimeout(
    () => {

      window.location.href =
        targetFile;

    },
    280
  );

}



/* ============================================================
   INTERCEPT PUBLIC PAGE LINKS

   Internal public tabs use transition animation.

   Login / Access IN / Access OUT / policies remain normal links.
============================================================ */

function initialisePageLinks() {

  document
    .querySelectorAll(
      "a[data-page-link]"
    )
    .forEach(

      link => {


        link.addEventListener(
          "click",
          event => {


            const page =
              getPublicPageFromHref(
                link.getAttribute(
                  "href"
                )
              );


            if (!page) {

              return;

            }


            event.preventDefault();


            const currentIndex =
              getPageIndex(
                getCurrentFile()
              );


            const targetIndex =
              getPageIndex(
                page.file
              );


            const direction =
              targetIndex <
              currentIndex
                ? "prev"
                : "next";


            navigateToPublicPage(
              page.file,
              direction
            );


          }

        );


      }

    );

}



/* ============================================================
   SAFE / DELIBERATE SWIPE NAVIGATION

   Designed to reduce accidental swipes.

   Requirements:
   - touch device
   - starts away from browser screen edges
   - no buttons / links / forms / cards
   - at least 120px horizontal travel
   - horizontal movement significantly greater than vertical
   - vertical drift limited
   - gesture must complete within 750ms
============================================================ */

const SWIPE_MIN_DISTANCE =
  120;


const SWIPE_MAX_VERTICAL =
  70;


const SWIPE_DIRECTION_RATIO =
  1.65;


const SWIPE_MAX_DURATION =
  750;


const SWIPE_EDGE_GUARD =
  34;


let swipeStartX =
  null;


let swipeStartY =
  null;


let swipeStartTime =
  null;


let swipeTarget =
  null;


let swipeCancelled =
  false;


let horizontalIntent =
  false;



function isSwipeBlockedElement(target) {

  if (!target) {

    return true;

  }


  return Boolean(

    target.closest(

      [
        "a",
        "button",
        "input",
        "textarea",
        "select",
        "label",
        "[role='button']",
        "[contenteditable='true']",
        "[data-swipe-block]",
        ".login-menu",
        ".modal",
        ".product-card",
        ".home-card",
        ".experience-panel"
      ].join(",")

    )

  );

}



function resetSwipe() {

  swipeStartX =
    null;

  swipeStartY =
    null;

  swipeStartTime =
    null;

  swipeTarget =
    null;

  swipeCancelled =
    false;

  horizontalIntent =
    false;

  hideSwipeIndicator();

}



function showSwipeIndicator(direction) {

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
    "prev"
  );


  indicator.classList.add(
    direction,
    "show"
  );


  icon.textContent =
    direction === "next"
      ? "→"
      : "←";

}



function hideSwipeIndicator() {

  const indicator =
    document.getElementById(
      "swipeIndicator"
    );


  if (!indicator) {

    return;

  }


  indicator.classList.remove(
    "show",
    "next",
    "prev"
  );

}



function initialiseSwipeNavigation() {

  const touchCapable =
    (
      "ontouchstart" in window
    ) ||
    (
      navigator.maxTouchPoints > 0
    );


  if (!touchCapable) {

    return;

  }



  document.addEventListener(

    "touchstart",

    event => {


      if (
        event.touches.length !== 1
      ) {

        resetSwipe();

        return;

      }


      const touch =
        event.touches[0];


      /*
        Protect browser edge gestures such as
        iOS Safari Back / Forward.
      */

      if (
        touch.clientX <
        SWIPE_EDGE_GUARD ||
        touch.clientX >
        window.innerWidth -
        SWIPE_EDGE_GUARD
      ) {

        resetSwipe();

        return;

      }


      if (
        isSwipeBlockedElement(
          event.target
        )
      ) {

        resetSwipe();

        return;

      }


      swipeStartX =
        touch.clientX;


      swipeStartY =
        touch.clientY;


      swipeStartTime =
        Date.now();


      swipeTarget =
        event.target;


      swipeCancelled =
        false;


      horizontalIntent =
        false;


    },

    {
      passive: true
    }

  );



  document.addEventListener(

    "touchmove",

    event => {


      if (
        swipeStartX === null ||
        swipeCancelled ||
        event.touches.length !== 1
      ) {

        return;

      }


      const touch =
        event.touches[0];


      const dx =
        touch.clientX -
        swipeStartX;


      const dy =
        touch.clientY -
        swipeStartY;


      const absX =
        Math.abs(dx);


      const absY =
        Math.abs(dy);



      /*
        If user clearly begins vertical scrolling,
        immediately cancel swipe navigation.
      */

      if (
        absY > 20 &&
        absY > absX
      ) {

        swipeCancelled =
          true;

        hideSwipeIndicator();

        return;

      }



      /*
        Only classify as horizontal intent after
        sufficient movement and a clear horizontal bias.
      */

      if (

        !horizontalIntent &&

        absX > 32 &&

        absX >
        absY *
        SWIPE_DIRECTION_RATIO

      ) {

        horizontalIntent =
          true;

      }



      if (
        horizontalIntent
      ) {

        /*
          Once gesture is clearly horizontal,
          stop browser content from drifting horizontally.
        */

        if (
          event.cancelable
        ) {

          event.preventDefault();

        }


        if (
          absX > 72
        ) {

          showSwipeIndicator(

            dx < 0
              ? "next"
              : "prev"

          );

        }

      }


    },

    {
      passive: false
    }

  );



  document.addEventListener(

    "touchend",

    event => {


      if (
        swipeStartX === null ||
        swipeCancelled
      ) {

        resetSwipe();

        return;

      }


      if (
        event.changedTouches.length !== 1
      ) {

        resetSwipe();

        return;

      }


      const touch =
        event.changedTouches[0];


      const dx =
        touch.clientX -
        swipeStartX;


      const dy =
        touch.clientY -
        swipeStartY;


      const absX =
        Math.abs(dx);


      const absY =
        Math.abs(dy);


      const duration =
        Date.now() -
        swipeStartTime;



      const deliberateSwipe =

        horizontalIntent &&

        absX >=
        SWIPE_MIN_DISTANCE &&

        absY <=
        SWIPE_MAX_VERTICAL &&

        absX >=
        absY *
        SWIPE_DIRECTION_RATIO &&

        duration <=
        SWIPE_MAX_DURATION;



      if (
        !deliberateSwipe
      ) {

        resetSwipe();

        return;

      }



      const currentFile =
        getCurrentFile();


      const currentIndex =
        getPageIndex(
          currentFile
        );


      if (
        currentIndex === -1
      ) {

        resetSwipe();

        return;

      }



      /*
        Finger moves LEFT:
        go to NEXT page.
      */

      if (
        dx < 0
      ) {


        const nextIndex =
          currentIndex + 1;


        if (
          nextIndex <
          RIZSIM_PUBLIC_PAGES.length
        ) {


          const nextPage =
            RIZSIM_PUBLIC_PAGES[
              nextIndex
            ];


          navigateToPublicPage(
            nextPage.file,
            "next"
          );


        }


      }



      /*
        Finger moves RIGHT:
        go to PREVIOUS page.
      */

      if (
        dx > 0
      ) {


        const previousIndex =
          currentIndex - 1;


        if (
          previousIndex >= 0
        ) {


          const previousPage =
            RIZSIM_PUBLIC_PAGES[
              previousIndex
            ];


          navigateToPublicPage(
            previousPage.file,
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


}



/* ============================================================
   LOGIN MENU
============================================================ */

function initialiseLoginMenu() {

  const loginButton =
    document.getElementById(
      "loginButton"
    );


  const loginMenu =
    document.getElementById(
      "loginMenu"
    );


  if (
    !loginButton ||
    !loginMenu
  ) {

    return;

  }



  loginButton.addEventListener(
    "click",
    event => {


      event.stopPropagation();


      const isOpen =
        loginMenu.classList.toggle(
          "is-open"
        );


      loginButton.setAttribute(
        "aria-expanded",
        String(isOpen)
      );


    }
  );



  document.addEventListener(
    "click",
    event => {


      if (
        !loginMenu.contains(
          event.target
        ) &&
        event.target !== loginButton
      ) {


        loginMenu.classList.remove(
          "is-open"
        );


        loginButton.setAttribute(
          "aria-expanded",
          "false"
        );


      }


    }
  );

}



/* ============================================================
   MOBILE MENU
============================================================ */

function initialiseMobileMenu() {

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
    () => {


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
   SPLASH
   HOME PAGE ONLY
   ONCE PER BROWSER SESSION
============================================================ */

function initialiseSplash() {

  const splash =
    document.getElementById(
      "rizsimSplash"
    );


  if (!splash) {

    return;

  }


  let alreadySeen =
    false;


  try {

    alreadySeen =
      sessionStorage.getItem(
        "rizsimSplashSeen"
      ) === "1";

  } catch (error) {

    alreadySeen =
      false;

  }



  if (alreadySeen) {

    splash.style.display =
      "none";

    return;

  }


  document.body.classList.add(
    "splash-locked"
  );


  try {

    sessionStorage.setItem(
      "rizsimSplashSeen",
      "1"
    );

  } catch (error) {

    /* Continue */

  }



  const reducedMotion =
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;


  const duration =
    reducedMotion
      ? 700
      : 3650;



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

          splash.style.display =
            "none";

        },
        reducedMotion
          ? 40
          : 950
      );


    },
    duration
  );

}



/* ============================================================
   FOOTER YEAR
============================================================ */

function setFooterYear() {

  const target =
    document.getElementById(
      "footerYear"
    );


  if (target) {

    target.textContent =
      new Date().getFullYear();

  }

}



/* ============================================================
   INITIALISE WEBSITE
============================================================ */

document.addEventListener(
  "DOMContentLoaded",
  () => {


    setActiveNavigation();

    applyEnterTransition();

    initialisePageLinks();

    initialiseSwipeNavigation();

    initialiseLoginMenu();

    initialiseMobileMenu();

    initialiseSplash();

    setFooterYear();


  }
);
