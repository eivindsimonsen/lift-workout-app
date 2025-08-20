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
  { path: "/exercises", name: "Exercises", component: Exercises, meta: { requiresAuth: true } },
  // Catch-all
  { path: "/:pathMatch(.*)*", redirect: "/login" },
];

const isMobile = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768 || "ontouchstart" in window;

// Define ScrollPosition type
type ScrollPosition = { left: number; top: number } | null;

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to: any, from: any, savedPosition: ScrollPosition) {
    // ✅ Preserve scroll for WorkoutSession: do nothing (keep current scroll)
    if (to.name === "WorkoutSession") {
      if (savedPosition) return savedPosition; // popstate/back-forward
      return undefined; // leave scroll as-is
    }

    const goingToDifferentPath = to.path !== from.path;
    const sameRouteDifferentParams = to.name === from.name && to.params !== from.params;

    if (goingToDifferentPath || sameRouteDifferentParams) {
      return { top: 0, behavior: isMobile() ? "auto" : "smooth" };
    }

    if (savedPosition) return savedPosition;

    // Default for non-workout routes
    return { top: 0, behavior: isMobile() ? "auto" : "smooth" };
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

    // Check current session
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
      // Carry intended route to login
      next({ path: "/login", query: { redirect: to.fullPath } });
      return;
    }

    // If already authenticated and going to /login, send to intended target if present
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

// After-each: don't force scroll for WorkoutSession; store lastRoute
router.afterEach((to: any, from: any) => {
  if (to.path !== from.path) {
    console.log("🔄 Router navigation detected:", { from: from.path, to: to.path });

    if (to.name !== "WorkoutSession") {
      if (isMobile()) {
        scrollToTopMobile();
      } else {
        scrollToTopImmediate();
      }
    }

    // ✅ Remember last route for restore on cold start
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
