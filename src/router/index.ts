import { createRouter, createWebHistory } from "vue-router";
import { useSupabase } from "@/composables/useSupabase";
import { scrollToTopGlobal, scrollToTopImmediate, scrollToTopMobile } from "@/composables/useScrollToTop";

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
  { path: "/exercises", name: "Exercises", component: Exercises, meta: { requiresAuth: true } },
  // Catch all route - redirect to login if not authenticated, økter if authenticated
  {
    path: "/:pathMatch(.*)*",
    redirect: "/login",
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to: any, from: any, savedPosition: any) {
    // Always scroll to top when navigating to a new route
    if (to.path !== from.path) {
      // For mobile, use immediate scroll to prevent issues
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768 || "ontouchstart" in window;

      if (isMobile) {
        return { top: 0, behavior: "auto" };
      } else {
        return { top: 0, behavior: "smooth" };
      }
    }

    // If navigating to the same route with different params, also scroll to top
    if (to.name === from.name && to.params !== from.params) {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768 || "ontouchstart" in window;

      if (isMobile) {
        return { top: 0, behavior: "auto" };
      } else {
        return { top: 0, behavior: "smooth" };
      }
    }

    // If there's a saved position (browser back/forward), restore it
    if (savedPosition) {
      return savedPosition;
    }

    // Default: always scroll to top
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768 || "ontouchstart" in window;

    if (isMobile) {
      return { top: 0, behavior: "auto" };
    } else {
      return { top: 0, behavior: "smooth" };
    }
  },
});

// Navigation guard with improved authentication handling
router.beforeEach(async (to: any, from: any, next: any) => {
  // Immediately lock scrolling to prevent flicker
  if (to.path !== from.path) {
    document.body.classList.add("route-transitioning");
    console.log("🔒 Scroll lock applied before navigation");
  }

  const { supabase } = useSupabase();

  try {
    // Check if route requires authentication
    const requiresAuth = to.meta.requiresAuth !== false; // Default to true unless explicitly set to false

    if (!requiresAuth) {
      // Public routes - allow access
      next();
      return;
    }

    // For protected routes, check authentication
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Auth check error:", error);
      // On error, redirect to login
      next("/login");
      return;
    }

    const isAuthenticated = !!session;

    if (isAuthenticated) {
      // User is authenticated - allow access
      next();
    } else {
      // User is not authenticated - redirect to login
      next("/login");
    }

    // Handle case where authenticated user tries to access login page
    if (to.path === "/login" && isAuthenticated) {
      next("/");
      return;
    }
  } catch (error) {
    console.error("Navigation guard error:", error);
    // On any unexpected error, redirect to login
    next("/login");
  }
});

// Navigation guard to ensure scrolling to top after route changes
router.afterEach((to: any, from: any) => {
  // Force scroll to top after navigation
  if (to.path !== from.path) {
    console.log("🔄 Router navigation detected:", { from: from.path, to: to.path });

    // Detect mobile and use appropriate scroll method
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768 || "ontouchstart" in window;

    if (isMobile) {
      console.log("📱 Using mobile-specific scroll");
      scrollToTopMobile();
    } else {
      console.log("💻 Using desktop scroll");
      scrollToTopImmediate();
    }

    // Release scroll lock after a short delay
    setTimeout(() => {
      document.body.classList.remove("route-transitioning");
      console.log("🔓 Router scroll lock released");
    }, 150);
  }
});

export default router;
