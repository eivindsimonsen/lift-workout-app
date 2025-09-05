import { onMounted } from "vue";

// Detect if we're on mobile
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768 || "ontouchstart" in window;
};

// Detect if we're in PWA mode
const isPWA = () => {
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
};

// Global scroll utility that can be called from anywhere
export const scrollToTopGlobal = (behavior: ScrollBehavior = "smooth") => {
  // Try multiple methods to ensure scrolling works
  try {
    // Method 1: window.scrollTo
    window.scrollTo({ top: 0, behavior });

    // Method 2: document.documentElement.scrollTop (fallback)
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }

    // Method 3: document.body.scrollTop (fallback)
    if (document.body) {
      document.body.scrollTop = 0;
    }

    // Method 4: Mobile-specific scrolling
    if (isMobile()) {
      // For mobile, also try scrolling the main content area
      const mainContent = document.querySelector("main");
      if (mainContent) {
        mainContent.scrollTop = 0;
      }

      // Try scrolling any scrollable containers
      const scrollableElements = document.querySelectorAll("[data-scrollable], .overflow-auto, .overflow-scroll");
      scrollableElements.forEach((element: any) => {
        if (element.scrollTop !== undefined) {
          element.scrollTop = 0;
        }
      });
    }
  } catch (error) {
    console.warn("⚠️ Scroll to top failed:", error);
    // Fallback to immediate scroll
    window.scrollTo(0, 0);
  }
};

// Immediate scroll to top without animation - prevents flicker
export const scrollToTopImmediate = () => {
  try {
    // Use immediate scroll methods
    window.scrollTo(0, 0);

    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }

    if (document.body) {
      document.body.scrollTop = 0;
    }

    // Mobile-specific immediate scrolling
    if (isMobile()) {
      // Force scroll on all possible scrollable elements
      const allElements = [document.documentElement, document.body];

      // Add main content and any other scrollable elements
      const mainContent = document.querySelector("main");
      if (mainContent) allElements.push(mainContent);

      // Add any elements with overflow scroll
      const scrollableElements = document.querySelectorAll("[data-scrollable], .overflow-auto, .overflow-scroll");
      scrollableElements.forEach((element: any) => {
        if (element.scrollTop !== undefined) {
          allElements.push(element);
        }
      });

      // Force scroll to top on all elements
      allElements.forEach((element: any) => {
        if (element && element.scrollTop !== undefined) {
          element.scrollTop = 0;
        }
      });

      // For iOS Safari, also try using scrollIntoView
      if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        const firstElement = document.querySelector("main, .container, h1, h2") || document.body;
        if (firstElement) {
          firstElement.scrollIntoView({ behavior: "auto", block: "start" });
        }
      }
    }
  } catch (error) {
    console.warn("⚠️ Immediate scroll failed:", error);
  }
};

// Mobile-specific scroll reset for PWA and mobile devices
export const scrollToTopMobile = () => {
  try {
    // Force scroll reset on all possible scrollable elements
    const elements = [document.documentElement, document.body, document.querySelector("main"), document.querySelector("#app"), ...Array.from(document.querySelectorAll("[data-scrollable], .overflow-auto, .overflow-scroll"))].filter(Boolean);

    // Reset scroll position on all elements
    elements.forEach((element: any) => {
      if (element && element.scrollTop !== undefined) {
        element.scrollTop = 0;
        element.scrollLeft = 0;
      }
    });

    // For iOS Safari PWA, use additional methods
    if (/iPad|iPhone|iPod/.test(navigator.userAgent) && isPWA()) {
      // Force viewport reset
      window.scrollTo(0, 0);

      // Use scrollIntoView on the first visible element
      const firstElement = document.querySelector("main, .container, h1, h2") || document.body;
      if (firstElement) {
        firstElement.scrollIntoView({ behavior: "auto", block: "start", inline: "start" });
      }

      // Force touch scroll reset
      document.body.style.transform = "translateZ(0)";
      setTimeout(() => {
        document.body.style.transform = "";
      }, 10);
    }

    // For Android PWA
    if (/Android/.test(navigator.userAgent) && isPWA()) {
      // Force scroll reset on Android
      window.scrollTo(0, 0);

      // Reset any scrollable containers
      const containers = document.querySelectorAll("main, .container, [data-scrollable]");
      containers.forEach((container: any) => {
        if (container && container.scrollTop !== undefined) {
          container.scrollTop = 0;
        }
      });
    }
  } catch (error) {
    console.warn("⚠️ Mobile scroll reset failed:", error);
    // Fallback to basic scroll
    window.scrollTo(0, 0);
  }
};

export function useScrollToTop() {
  const scrollToTop = (behavior: ScrollBehavior = "smooth") => {
    // On mobile, always use immediate scroll
    if (isMobile()) {
      scrollToTopMobile();
    } else {
      scrollToTopGlobal(behavior);
    }
  };

  const scrollToTopImmediate = () => {
    // On mobile, use mobile-specific scroll
    if (isMobile()) {
      scrollToTopMobile();
    } else {
      scrollToTopGlobal("auto");
    }
  };

  // Auto-scroll to top when component mounts (for new route navigation)
  onMounted(() => {
    // Use immediate scroll to prevent flicker
    scrollToTopImmediate();
  });

  return {
    scrollToTop,
    scrollToTopImmediate,
    scrollToTopMobile, // Export mobile-specific function
  };
}
