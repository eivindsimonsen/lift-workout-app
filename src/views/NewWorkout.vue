<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-white mb-2">Ny Økt</h1>
        <p class="text-dark-300">Registrer din treningsøkt</p>
      </div>
      <button 
        @click="$router.back()" 
        class="btn-secondary"
      >
        Avbryt
      </button>
    </div>

    <form @submit.prevent="saveWorkout" class="space-y-8">
      <!-- Workout Details -->
      <div class="card">
        <h2 class="text-xl font-semibold text-white mb-6">Økt Detaljer</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-sm font-medium text-white mb-2">
              Navn på økta
            </label>
            <input 
              v-model="workoutForm.name"
              type="text"
              placeholder="f.eks. Fullkropp, Ben, Overkropp"
              class="input-field w-full"
              required
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-white mb-2">
              Varighet (minutter)
            </label>
            <input 
              v-model.number="workoutForm.duration"
              type="number"
              min="1"
              class="input-field w-full"
              required
            />
          </div>
        </div>
        <div class="mt-6">
          <label class="block text-sm font-medium text-white mb-2">
            Notater (valgfritt)
          </label>
          <textarea 
            v-model="workoutForm.notes"
            rows="3"
            placeholder="Hvordan følte økta seg? Noen spesielle observasjoner?"
            class="input-field w-full resize-none"
          ></textarea>
        </div>
      </div>

      <!-- Exercises -->
      <div class="card">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-semibold text-white">Øvelser</h2>
          <button 
            type="button"
            @click="addExercise"
            class="btn-primary"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Legg til øvelse
          </button>
        </div>

        <div v-if="workoutForm.exercises.length === 0" class="text-center py-12">
          <div class="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p class="text-dark-300 mb-4">Ingen øvelser lagt til ennå</p>
          <button 
            type="button"
            @click="addExercise"
            class="btn-primary"
          >
            Legg til din første øvelse
          </button>
        </div>

        <div v-else class="space-y-6">
          <div 
            v-for="(exercise, exerciseIndex) in workoutForm.exercises" 
            :key="exercise.id"
            class="bg-dark-700 rounded-lg p-6"
          >
            <div class="flex items-center justify-between mb-4">
              <input 
                v-model="exercise.name"
                type="text"
                placeholder="Øvelsenavn"
                class="input-field flex-1 mr-4"
                required
              />
              <button 
                type="button"
                @click="removeExercise(exerciseIndex)"
                class="text-red-400 hover:text-red-300 p-2"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            <!-- Sets -->
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <h4 class="text-sm font-medium text-white">Sett</h4>
                <button 
                  type="button"
                  @click="addSet(exerciseIndex)"
                  class="text-primary-500 hover:text-primary-400 text-sm font-medium"
                >
                  + Legg til sett
                </button>
              </div>

              <div v-if="exercise.sets.length === 0" class="text-center py-4">
                <p class="text-dark-400 text-sm">Ingen sett lagt til</p>
              </div>

              <div v-else class="space-y-3">
                <div 
                  v-for="(set, setIndex) in exercise.sets" 
                  :key="set.id"
                  class="grid grid-cols-2 md:grid-cols-4 gap-3"
                >
                  <div>
                    <label class="block text-xs text-dark-300 mb-1">Reps</label>
                    <input 
                      v-model.number="set.reps"
                      type="number"
                      min="1"
                      class="input-field w-full text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-dark-300 mb-1">Vekt (kg)</label>
                    <input 
                      v-model.number="set.weight"
                      type="number"
                      min="0"
                      step="0.5"
                      class="input-field w-full text-sm"
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-dark-300 mb-1">Varighet (sek)</label>
                    <input 
                      v-model.number="set.duration"
                      type="number"
                      min="0"
                      class="input-field w-full text-sm"
                    />
                  </div>
                  <div class="flex items-end">
                    <button 
                      type="button"
                      @click="removeSet(exerciseIndex, setIndex)"
                      class="text-red-400 hover:text-red-300 p-2"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Exercise Notes -->
            <div class="mt-4">
              <label class="block text-xs text-dark-300 mb-1">Notater (valgfritt)</label>
              <input 
                v-model="exercise.notes"
                type="text"
                placeholder="Spesielle observasjoner for denne øvelsen"
                class="input-field w-full text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <div class="card">
        <h2 class="text-xl font-semibold text-white mb-4">Sammendrag</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div class="bg-dark-700 rounded-lg p-4">
            <p class="text-dark-300">Antall øvelser</p>
            <p class="text-white font-semibold text-lg">{{ workoutForm.exercises.length }}</p>
          </div>
          <div class="bg-dark-700 rounded-lg p-4">
            <p class="text-dark-300">Total sett</p>
            <p class="text-white font-semibold text-lg">{{ totalSets }}</p>
          </div>
          <div class="bg-dark-700 rounded-lg p-4">
            <p class="text-dark-300">Estimert volum</p>
            <p class="text-white font-semibold text-lg">{{ estimatedVolume }} kg</p>
          </div>
        </div>
      </div>

      <!-- Save Button -->
      <div class="flex justify-end gap-4">
        <button 
          type="button"
          @click="$router.back()" 
          class="btn-secondary"
        >
          Avbryt
        </button>
        <button 
          type="submit"
          :disabled="!isFormValid"
          class="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Lagre Økt
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkoutStore } from '@/stores/workoutStore'
import type { Exercise, Set } from '@/types/workout'

const router = useRouter()
const workoutStore = useWorkoutStore()

const workoutForm = ref({
  name: '',
  duration: 0,
  notes: '',
  exercises: [] as Exercise[]
})

const addExercise = () => {
  workoutForm.value.exercises.push({
    id: crypto.randomUUID(),
    name: '',
    sets: [],
    notes: ''
  })
}

const removeExercise = (index: number) => {
  workoutForm.value.exercises.splice(index, 1)
}

const addSet = (exerciseIndex: number) => {
  workoutForm.value.exercises[exerciseIndex].sets.push({
    id: crypto.randomUUID(),
    reps: 0,
    weight: 0
  })
}

const removeSet = (exerciseIndex: number, setIndex: number) => {
  workoutForm.value.exercises[exerciseIndex].sets.splice(setIndex, 1)
}

const totalSets = computed(() => {
  return workoutForm.value.exercises.reduce((total, exercise) => {
    return total + exercise.sets.length
  }, 0)
})

const estimatedVolume = computed(() => {
  return workoutForm.value.exercises.reduce((total, exercise) => {
    return total + exercise.sets.reduce((exerciseTotal, set) => {
      const weight = set.weight || 0
      const reps = set.reps || 0
      return exerciseTotal + (reps * weight)
    }, 0)
  }, 0)
})

const isFormValid = computed(() => {
  return workoutForm.value.name.trim() !== '' &&
         workoutForm.value.duration > 0 &&
         workoutForm.value.exercises.length > 0 &&
         workoutForm.value.exercises.every(exercise => 
           exercise.name.trim() !== '' && 
           exercise.sets.length > 0 &&
           exercise.sets.every(set => set.reps > 0)
         )
})

const saveWorkout = () => {
  if (!isFormValid.value) return

  const workout = {
    name: workoutForm.value.name,
    date: new Date(),
    duration: workoutForm.value.duration,
    exercises: workoutForm.value.exercises,
    notes: workoutForm.value.notes
  }

  workoutStore.addWorkout(workout)
  router.push('/')
}
</script> 