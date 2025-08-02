import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '@/lib/supabase'
import Dashboard from '@/views/Dashboard.vue'
import History from '@/views/History.vue'
import Stats from '@/views/Stats.vue'
import Login from '@/views/Login.vue'
import ResetPassword from '@/views/ResetPassword.vue'
import WorkoutSession from '@/views/WorkoutSession.vue'
import TemplateForm from '@/views/TemplateForm.vue'
import SessionDetails from '@/views/SessionDetails.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'Dashboard', component: Dashboard, meta: { requiresAuth: true } },
    { path: '/history', name: 'History', component: History, meta: { requiresAuth: true } },
    { path: '/stats', name: 'Stats', component: Stats, meta: { requiresAuth: true } },
    { path: '/login', name: 'Login', component: Login, meta: { requiresAuth: false } },
    { path: '/reset-password', name: 'ResetPassword', component: ResetPassword, meta: { requiresAuth: false } },
    { path: '/workout/:id', name: 'WorkoutSession', component: WorkoutSession, meta: { requiresAuth: true } },
    { path: '/template/create', name: 'CreateTemplate', component: TemplateForm, meta: { requiresAuth: true } },
    { path: '/template/edit/:id', name: 'EditTemplate', component: TemplateForm, meta: { requiresAuth: true } },
    { path: '/session/:id', name: 'SessionDetails', component: SessionDetails, meta: { requiresAuth: true } },
    // Catch all route - redirect to login if not authenticated, dashboard if authenticated
    {
      path: '/:pathMatch(.*)*',
      redirect: '/login'
    }
  ],
  scrollBehavior(to, from, savedPosition) {
    return { top: 0 }
  }
})

// Navigation guard
router.beforeEach(async (to, from, next) => {
  // Get current session
  const { data: { session } } = await supabase.auth.getSession()
  const isAuthenticated = !!session

  // Check if route requires authentication
  const requiresAuth = to.meta.requiresAuth !== false // Default to true unless explicitly set to false

  if (requiresAuth && !isAuthenticated) {
    // User is not authenticated and trying to access protected route
    // Redirect to login
    next('/login')
  } else if (to.path === '/login' && isAuthenticated) {
    // User is authenticated and trying to access login page
    // Redirect to dashboard
    next('/')
  } else {
    // Allow navigation
    next()
  }
})

export default router 