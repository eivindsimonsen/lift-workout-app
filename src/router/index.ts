import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '@/views/Dashboard.vue'
import History from '@/views/History.vue'
import Stats from '@/views/Stats.vue'
import Login from '@/views/Login.vue'
import WorkoutSession from '@/views/WorkoutSession.vue'
import TemplateForm from '@/views/TemplateForm.vue'
import SessionDetails from '@/views/SessionDetails.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'Dashboard', component: Dashboard },
    { path: '/history', name: 'History', component: History },
    { path: '/stats', name: 'Stats', component: Stats },
    { path: '/login', name: 'Login', component: Login },
    { path: '/workout/:id', name: 'WorkoutSession', component: WorkoutSession },
    { path: '/template/create', name: 'CreateTemplate', component: TemplateForm },
    { path: '/template/edit/:id', name: 'EditTemplate', component: TemplateForm },
    { path: '/session/:id', name: 'SessionDetails', component: SessionDetails }
  ],
  scrollBehavior(to, from, savedPosition) {
    // Always scroll to top when navigating to a new route
    return { top: 0 }
  }
})

export default router 