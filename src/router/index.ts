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
  { path: "/exercises", name: "Exercises", component: Exercises, meta: { requiresAuth: true } },
  // Catch all route
  { path: "/:pathMatch(.*)*", redirect: "/login" },
];

const isMobile = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768 || "ontouchstart" in window;

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // ✅ For WorkoutSession: preserve scroll entirely (no forced top)
    if (to.name === "WorkoutSession") {
      // Use browser's saved position on popstate if available, else keep current
      if (savedPosition) return savedPosition;
      return undefined; // do nothing -> keep current scroll
    }

    // For other routes keep your current behavior
    const goingToDifferentPath = to.path !== from.path;
    const sameRouteDifferentParams = to.name === from.name && to.params !== from.params;

    if (goingToDifferentPath || sameRouteDifferentParams) {
      return { top: 0, behavior: isMobile() ? "auto" : "smooth" };
    }

    if (savedPosition) return savedPosition;

    // Default for non-workout routes: go to top
    return { top: 0, behavior: isMobile() ? "auto" : "smooth" };
  },
});

// Navigation guard with improved authentication handling
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
      next("/login");
      return;
    }

    const isAuthenticated = !!session;

    if (isAuthenticated) {
      next();
    } else {
      next("/login");
    }

    if (to.path === "/login" && isAuthenticated) {
      next("/");
      return;
    }
  } catch (error) {
    console.error("Navigation guard error:", error);
    next("/login");
  }
});

// After-each: DO NOT force scroll for WorkoutSession
router.afterEach((to: any, from: any) => {
  if (to.path !== from.path) {
    console.log("🔄 Router navigation detected:", { from: from.path, to: to.path });

    if (to.name !== "WorkoutSession") {
      if (isMobile()) {
        console.log("🔄 Mobile: scroll to top");
        scrollToTopMobile();
      } else {
        console.log("🔄 Desktop: scroll to top");
        scrollToTopImmediate();
      }
    }

    setTimeout(() => {
      document.body.classList.remove("route-transitioning");
      console.log("🔓 Router scroll lock released");
    }, 150);
  }
});

export default router;
