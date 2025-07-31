import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '@/views/Dashboard.vue'
import History from '@/views/History.vue'
import Stats from '@/views/Stats.vue'
import NewWorkout from '@/views/NewWorkout.vue'
import Login from '@/views/Login.vue'
import WorkoutSession from '@/views/WorkoutSession.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'Dashboard', component: Dashboard },
    { path: '/history', name: 'History', component: History },
    { path: '/stats', name: 'Stats', component: Stats },
    { path: '/new-workout', name: 'NewWorkout', component: NewWorkout },
    { path: '/login', name: 'Login', component: Login },
    { path: '/workout/:id', name: 'WorkoutSession', component: WorkoutSession }
  ]
})

export default router 