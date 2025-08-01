<template>
  <div>
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-white mb-2">Legg til Øvelse</h1>
      <p class="text-dark-300">Legg til en ny øvelse i økten</p>
    </div>

    <div v-if="!session" class="text-center py-12">
      <p class="text-dark-300">Økt ikke funnet</p>
      <router-link to="/" class="btn-primary mt-4">Tilbake til Dashboard</router-link>
    </div>

         <!-- Add Exercise Form -->
     <form v-else @submit.prevent="addExercise" class="space-y-6">
       <!-- Exercise Selection -->
       <div class="card">
         <div class="space-y-4">
           <div>
             <label class="block text-sm font-medium text-white mb-2">Øvelse</label>
             <select 
               v-model="exerciseForm.exerciseId"
               required
               class="input-field w-full"
             >
               <option value="">Velg øvelse</option>
               <option 
                 v-for="exercise in availableExercises" 
                 :key="exercise.id" 
                 :value="exercise.id"
               >
                 {{ exercise.name }}
               </option>
             </select>
           </div>
         </div>
       </div>



      <!-- Actions -->
      <div class="flex gap-3 justify-end">
        <router-link 
          :to="`/workout/${workoutId}`" 
          class="btn-secondary"
        >
          Avbryt
        </router-link>
        <button 
          type="submit"
          class="btn-primary"
        >
          Legg til Øvelse
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useWorkoutStore } from '@/stores/workoutStore'
import type { WorkoutSession } from '@/types/workout'

const router = useRouter()
const route = useRoute()
const workoutStore = useWorkoutStore()

const session = ref<WorkoutSession | null>(null)
const workoutId = route.params.id as string

const exerciseForm = ref({
  exerciseId: ''
})

// Computed
const availableExercises = computed(() => {
  if (!session.value) return workoutStore.exercises
  
  return workoutStore.getExercisesByWorkoutType(session.value.workoutType)
})

// Methods
const addExercise = () => {
  if (!session.value) return

  const exerciseData = workoutStore.exercises.find(e => e.id === exerciseForm.value.exerciseId)
  if (!exerciseData) return

  const newExercise = {
    exerciseId: exerciseForm.value.exerciseId,
    name: exerciseData.name,
    sets: [{
      id: `set-${Date.now()}`,
      reps: 8,
      weight: 0,
      isCompleted: false
    }]
  }

  // Add the exercise to the session
  session.value.exercises.push(newExercise)
  
  // Update the session in the store
  workoutStore.updateWorkoutSession(session.value.id, {
    exercises: session.value.exercises
  })

  // Navigate back to the workout session
  router.push(`/workout/${workoutId}`)
}

// Lifecycle
onMounted(() => {
  const foundSession = workoutStore.getSessionById(workoutId)
  
  if (foundSession) {
    session.value = foundSession
  }
})
</script> 