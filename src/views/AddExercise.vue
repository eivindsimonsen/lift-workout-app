<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold text-white mb-2">Legg til Øvelse</h1>
        <p class="text-dark-300">Legg til en ny øvelse i økten</p>
      </div>
      <router-link 
        :to="`/workout/${workoutId}`" 
        class="btn-secondary"
      >
        Avbryt
      </router-link>
    </div>

    <div v-if="!session" class="text-center py-12">
      <p class="text-dark-300">Økt ikke funnet</p>
      <router-link to="/" class="btn-primary mt-4">Tilbake til Dashboard</router-link>
    </div>

    <!-- Add Exercise Form -->
    <form v-else @submit.prevent="addExercise" class="space-y-6">
      <!-- Exercise Selection -->
      <div class="card">
        <h2 class="text-xl font-semibold text-white mb-4">Velg Øvelse</h2>
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
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-white mb-2">Antall sett</label>
              <input
                v-model.number="exerciseForm.sets"
                type="number"
                min="1"
                required
                class="input-field w-full"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-white mb-2">Reps</label>
              <input
                v-model.number="exerciseForm.reps"
                type="number"
                min="1"
                required
                class="input-field w-full"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-white mb-2">Vekt (kg)</label>
              <input
                v-model.number="exerciseForm.weight"
                type="number"
                min="0"
                class="input-field w-full"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Notes -->
      <div class="card">
        <h2 class="text-xl font-semibold text-white mb-4">Notater</h2>
        <textarea
          v-model="exerciseForm.notes"
          rows="3"
          class="input-field w-full"
          placeholder="Valgfrie notater om øvelsen..."
        ></textarea>
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
  exerciseId: '',
  sets: 3,
  reps: 8,
  weight: undefined as number | undefined,
  notes: ''
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
      reps: exerciseForm.value.reps,
      weight: exerciseForm.value.weight,
      completed: false
    }],
    notes: exerciseForm.value.notes
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