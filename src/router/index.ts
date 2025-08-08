import { createRouter, createWebHistory } from 'vue-router'
import { useSupabase } from '@/composables/useSupabase'

// View imports
import Økter from '@/views/Økter.vue'
import History from '@/views/History.vue'
import Stats from '@/views/Stats.vue'
import Login from '@/views/Login.vue'
import ResetPassword from '@/views/ResetPassword.vue'
import WorkoutSession from '@/views/WorkoutSession.vue'
import TemplateForm from '@/views/TemplateForm.vue'
import SessionDetails from '@/views/SessionDetails.vue'
import Profile from '@/views/Profile.vue'
import ExerciseDetail from '@/views/ExerciseDetail.vue'
import Exercises from '@/views/Exercises.vue'

// Route configuration
const routes = [
  { path: '/', name: 'Økter', component: Økter, meta: { requiresAuth: true } },
  { path: '/history', name: 'History', component: History, meta: { requiresAuth: true } },
  { path: '/stats', name: 'Stats', component: Stats, meta: { requiresAuth: true } },
  { path: '/profile', name: 'Profile', component: Profile, meta: { requiresAuth: true } },
  { path: '/login', name: 'Login', component: Login, meta: { requiresAuth: false } },
  { path: '/reset-password', name: 'ResetPassword', component: ResetPassword, meta: { requiresAuth: false } },
  { path: '/workout/:id', name: 'WorkoutSession', component: WorkoutSession, meta: { requiresAuth: true } },
  { path: '/template/create', name: 'CreateTemplate', component: TemplateForm, meta: { requiresAuth: true } },
  { path: '/template/edit/:id', name: 'EditTemplate', component: TemplateForm, meta: { requiresAuth: true } },
  { path: '/session/:id', name: 'SessionDetails', component: SessionDetails, meta: { requiresAuth: true } },
  { path: '/exercise/:id', name: 'ExerciseDetail', component: ExerciseDetail, meta: { requiresAuth: true } },
  { path: '/exercises', name: 'Exercises', component: Exercises, meta: { requiresAuth: true } },
  // Catch all route - redirect to login if not authenticated, økter if authenticated
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    return { top: 0 }
  }
})

// Navigation guard
router.beforeEach(async (to, from, next) => {
  const { supabase } = useSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  const isAuthenticated = !!session

  // Check if route requires authentication
  const requiresAuth = to.meta.requiresAuth !== false // Default to true unless explicitly set to false

  if (requiresAuth && !isAuthenticated) {
    // User is not authenticated and trying to access protected route
    next('/login')
  } else if (to.path === '/login' && isAuthenticated) {
    // User is authenticated and trying to access login page
    next('/')
  } else {
    // Allow navigation
    next()
  }
})

export default router 