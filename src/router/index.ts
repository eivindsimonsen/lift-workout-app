// src/router/index.ts
import { createRouter, createWebHistory } from "vue-router";
import { useSupabase } from "@/composables/useSupabase";
import { scrollToTopImmediate, scrollToTopMobile } from "@/composables/useScrollToTop";

// View imports
import TemplateSessions from "@/views/TemplateSessions.vue";
import History from "@/views/History.vue";
import Stats from "@/views/Stats.vue";
import Login from "@/views/Login.vue";
import ResetPassword from "@/views/ResetPassword.vue";
import WorkoutSession from "@/views/WorkoutSession.vue";
import TemplateForm from "@/views/TemplateForm.vue";
import SessionDetails from "@/views/SessionDetails.vue";
import Profile from "@/views/Profile.vue";
import ExerciseDetail from "@/views/ExerciseDetail.vue";
import Exercises from "@/views/Exercises.vue";

// Route configuration
const routes = [
  { path: "/", name: "TemplateSessions", component: TemplateSessions, meta: { requiresAuth: true } },
  { path: "/history", name: "History", component: History, meta: { requiresAuth: true } },
  { path: "/stats", name: "Stats", component: Stats, meta: { requiresAuth: true } },
  { path: "/profile", name: "Profile", component: Profile, meta: { requiresAuth: true } },
  { path: "/login", name: "Login", component: Login, meta: { requiresAuth: false } },
  { path: "/reset-password", name: "ResetPassword", component: ResetPassword, meta: { requiresAuth: false } },
  { path: "/workout/:id", name: "WorkoutSession", component: WorkoutSession, meta: { requiresAuth: true } },
  { path: "/template/create", name: "CreateTemplate", component: TemplateForm, meta: { requiresAuth: true } },
  { path: "/template/edit/:id", name: "EditTemplate", component: TemplateForm, meta: { requiresAuth: true } },
  { path: "/session/:id", name: "SessionDetails", component: SessionDetails, meta: { requiresAuth: true } },
  { path: "/exercise/:id", name: "ExerciseDetail", component: ExerciseDetail, meta: { requiresAuth: true } },
  { path: "/exercises", name: "Exercises", meta: { requiresAuth: true }, component: Exercises },
  // Catch-all
  { path: "/:pathMatch(.*)*", redirect: "/login" },
];

const isMobile = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768 || "ontouchstart" in window;

type ScrollPosition = { left: number; top: number } | null;

/**
 * Force all likely scroll containers to top (in addition to window/document).
 * If you know your real scroll root, add a data attribute to it:
 *   <main data-scroll-root>...</main>
 * and this will pick it up reliably.
 */

// helper near the top of router/index.ts
function getSavedWorkoutScrollY(id: string): number | null {
  try {
    const s = sessionStorage.getItem(`workout-scroll-${id}`) || localStorage.getItem(`workout-scroll-${id}`);
    if (!s) return null;
    const y = parseInt(s, 10);
    return Number.isFinite(y) ? y : null;
  } catch {
    return null;
  }
}

function forceAllScrollRootsToTop() {
  // Window & document
  try {
    window.scrollTo(0, 0);
  } catch {}
  try {
    if (document.scrollingElement) (document.scrollingElement as HTMLElement).scrollTop = 0;
  } catch {}
  try {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  } catch {}

  // App-level containers commonly used as scroll roots
  const selectors = [
    "[data-scroll-root]", // <== add this to your real scroll container if possible
    "#app",
    "main",
    ".scroll-container",
    ".app-main",
    ".content",
  ];
  selectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      try {
        (el as HTMLElement).scrollTop = 0;
      } catch {}
    });
  });
}

const router = createRouter({
  history: createWebHistory(),
  routes,
  // inside createRouter({ ..., scrollBehavior(to, from, savedPosition) { ... } })
  scrollBehavior(to: any, from: any, savedPosition: { left: number; top: number } | null) {
    // 🏋️ workout route special handling
    if (to.name === "WorkoutSession") {
      const fromIsEmpty = !from || !from.name || (Array.isArray(from.matched) && from.matched.length === 0); // cold start
      const fromIsWorkout = from && from.name === "WorkoutSession";
      const newWorkout = !fromIsWorkout || from.params.id !== to.params.id;

      // ✅ COLD START: if we have a saved scroll for this workout, restore it immediately
      if (fromIsEmpty) {
        const y = getSavedWorkoutScrollY(String(to.params.id));
        if (y !== null) {
          return { left: 0, top: y, behavior: "auto" };
        }
        // no saved scroll → just top
        return { top: 0, behavior: "auto" };
      }

      if (newWorkout) {
        // navigation to a DIFFERENT workout id inside the app
        return { top: 0, behavior: "auto" };
      }

      // resuming the SAME workout via in-app nav/back/forward
      if (savedPosition) return savedPosition;
      return false;
    }

    // Default for non-workout routes
    if (savedPosition) return savedPosition;
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768 || "ontouchstart" in window;
    return { top: 0, behavior: mobile ? "auto" : "smooth" };
  },
});

// Navigation guard with redirect preservation
router.beforeEach(async (to: any, from: any, next: any) => {
  if (to.path !== from.path) {
    document.body.classList.add("route-transitioning");
    console.log("🔒 Scroll lock applied before navigation");
  }

  const { supabase } = useSupabase();

  try {
    const requiresAuth = to.meta.requiresAuth !== false;

    if (!requiresAuth) {
      next();
      return;
    }

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Auth check error:", error);
      next({ path: "/login", query: { redirect: to.fullPath } });
      return;
    }

    const isAuthenticated = !!session;

    if (!isAuthenticated) {
      next({ path: "/login", query: { redirect: to.fullPath } });
      return;
    }

    if (to.path === "/login") {
      const redirectTarget = (to.query?.redirect as string) || "/";
      next(redirectTarget);
      return;
    }

    next();
  } catch (err) {
    console.error("Navigation guard error:", err);
    next({ path: "/login", query: { redirect: to.fullPath } });
  }
});

// After-each: handle workout resume/new & scroll containers explicitly
router.afterEach((to: any, from: any) => {
  if (to.path !== from.path) {
    console.log("🔄 Router navigation detected:", { from: from.path, to: to.path });

    if (to.name === "WorkoutSession") {
      const coldStart = !from || !from.name || (Array.isArray(from.matched) && from.matched.length === 0);
      const fromIsWorkout = from && from.name === "WorkoutSession";
      const sameId = fromIsWorkout && from.params.id === to.params.id;

      if (coldStart) {
        // ✅ Cold start directly into a workout
        const y = getSavedWorkoutScrollY(String(to.params.id));
        if (y !== null) {
          // mark for component restore safety (in case component wants to re-apply after mount)
          sessionStorage.setItem(`workout-restore-${to.params.id}`, "1");
        }
        // don't force scroll here; scrollBehavior already positioned us
      } else if (sameId) {
        // ✅ Resuming same workout inside the app
        sessionStorage.setItem(`workout-restore-${to.params.id}`, "1");
      } else {
        // ✅ Switching to a different workout id: start fresh
        sessionStorage.removeItem(`workout-restore-${to.params.id}`);
        sessionStorage.removeItem(`workout-scroll-${to.params.id}`);
        localStorage.removeItem(`workout-scroll-${to.params.id}`);

        // optional: nudge containers to top
        const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768 || "ontouchstart" in window;
        if (mobile) {
          scrollToTopMobile();
        } else {
          scrollToTopImmediate();
        }
      }
    } else {
      // non-workout routes: your existing scroll-to-top behavior
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768 || "ontouchstart" in window;
      if (mobile) {
        scrollToTopMobile();
      } else {
        scrollToTopImmediate();
      }
    }

    // remember last route (unchanged)
    try {
      const { supabase } = useSupabase();
      supabase.auth.getSession().then(({ data }: { data: { session: any } }) => {
        if (data?.session) {
          sessionStorage.setItem("lastRoute", to.fullPath);
        }
      });
    } catch (err) {
      console.warn("Could not store last route", err);
    }

    setTimeout(() => {
      document.body.classList.remove("route-transitioning");
      console.log("🔓 Router scroll lock released");
    }, 150);
  }
});

export default router;
