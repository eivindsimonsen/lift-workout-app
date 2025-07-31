import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '@/views/Dashboard.vue'
import History from '@/views/History.vue'
import Stats from '@/views/Stats.vue'
import NewWorkout from '@/views/NewWorkout.vue'
import Login from '@/views/Login.vue'
import WorkoutSession from '@/views/WorkoutSession.vue'
import CreateTemplate from '@/views/CreateTemplate.vue'
import EditTemplate from '@/views/EditTemplate.vue'
import SessionDetails from '@/views/SessionDetails.vue'
import AddExercise from '@/views/AddExercise.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'Dashboard', component: Dashboard },
    { path: '/history', name: 'History', component: History },
    { path: '/stats', name: 'Stats', component: Stats },
    { path: '/new-workout', name: 'NewWorkout', component: NewWorkout },
    { path: '/login', name: 'Login', component: Login },
    { path: '/workout/:id', name: 'WorkoutSession', component: WorkoutSession },
    { path: '/template/create', name: 'CreateTemplate', component: CreateTemplate },
    { path: '/template/edit/:id', name: 'EditTemplate', component: EditTemplate },
    { path: '/session/:id', name: 'SessionDetails', component: SessionDetails },
    { path: '/workout/:id/add-exercise', name: 'AddExercise', component: AddExercise }
  ]
})

export default router 