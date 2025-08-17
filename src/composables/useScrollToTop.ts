import { onMounted } from "vue";

// Global scroll utility that can be called from anywhere
export const scrollToTopGlobal = (behavior: ScrollBehavior = "smooth") => {
  console.log("🔄 Attempting to scroll to top with behavior:", behavior);

  // Try multiple methods to ensure scrolling works
  try {
    // Method 1: window.scrollTo
    window.scrollTo({ top: 0, behavior });
    console.log("✅ Method 1 (window.scrollTo) executed");

    // Method 2: document.documentElement.scrollTop (fallback)
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
      console.log("✅ Method 2 (documentElement.scrollTop) executed");
    }

    // Method 3: document.body.scrollTop (fallback)
    if (document.body) {
      document.body.scrollTop = 0;
      console.log("✅ Method 3 (body.scrollTop) executed");
    }

    console.log("🎯 Scroll to top completed successfully");
  } catch (error) {
    console.warn("⚠️ Scroll to top failed:", error);
    // Fallback to immediate scroll
    window.scrollTo(0, 0);
    console.log("🔄 Fallback scroll executed");
  }
};

// Immediate scroll to top without animation - prevents flicker
export const scrollToTopImmediate = () => {
  console.log("⚡ Immediate scroll to top (no animation)");

  try {
    // Use immediate scroll methods
    window.scrollTo(0, 0);

    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }

    if (document.body) {
      document.body.scrollTop = 0;
    }

    console.log("✅ Immediate scroll completed");
  } catch (error) {
    console.warn("⚠️ Immediate scroll failed:", error);
  }
};

export function useScrollToTop() {
  const scrollToTop = (behavior: ScrollBehavior = "smooth") => {
    scrollToTopGlobal(behavior);
  };

  const scrollToTopImmediate = () => {
    scrollToTopGlobal("auto");
  };

  // Auto-scroll to top when component mounts (for new route navigation)
  onMounted(() => {
    // Use immediate scroll to prevent flicker
    scrollToTopImmediate();
  });

  return {
    scrollToTop,
    scrollToTopImmediate,
  };
}
