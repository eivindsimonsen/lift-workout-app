<template>
  <div class="space-y-6">
         <!-- Header -->
     <div class="flex items-center justify-between">
       <h1 class="text-2xl font-bold text-white">{{ session?.templateName }}</h1>
       <span 
         class="inline-block px-3 py-1 text-sm font-medium rounded-full"
         :style="{ 
           backgroundColor: getWorkoutTypeColor(session?.workoutType || '') + '20',
           color: getWorkoutTypeColor(session?.workoutType || '')
         }"
       >
         {{ getWorkoutTypeName(session?.workoutType || '') }}
       </span>
     </div>



    <!-- Exercises -->
    <div v-if="session" class="space-y-6">
      <div 
        v-for="(exercise, exerciseIndex) in session.exercises" 
        :key="exercise.exerciseId"
        class="card"
      >
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-white">{{ exercise.name }}</h3>
          <span class="text-sm text-dark-300">
            {{ getCompletedSets(exercise) }}/{{ exercise.sets.length }} sett
          </span>
        </div>

        <!-- Sets -->
        <div class="space-y-2">
          <div 
            v-for="(set, setIndex) in exercise.sets" 
            :key="set.id"
            class="bg-dark-700 rounded-lg p-3"
            :class="{ 'border-l-4 border-primary-500': set.isCompleted }"
          >
                         <div class="mb-2">
               <span class="text-sm font-medium text-white">Sett {{ setIndex + 1 }}</span>
             </div>

                         <div class="grid grid-cols-2 gap-3">
               <div>
                 <label class="block text-xs text-dark-300 mb-1">Reps</label>
                                   <input
                    v-model.number="set.reps"
                    type="number"
                    inputmode="numeric"
                    min="0"
                    class="input-field w-full text-sm py-1"
                    placeholder="8"
                    @input="updateSetCompletion(exerciseIndex, setIndex)"
                  />
               </div>
               <div>
                 <label class="block text-xs text-dark-300 mb-1">Vekt (kg)</label>
                                   <input
                    v-model.number="set.weight"
                    type="number"
                    inputmode="decimal"
                    min="0"
                    step="0.5"
                    class="input-field w-full text-sm py-1"
                    placeholder="20"
                    @input="updateSetCompletion(exerciseIndex, setIndex)"
                  />
               </div>
             </div>

            <!-- Volume Display -->
            <div v-if="set.weight && set.reps" class="mt-2 pt-2 border-t border-dark-600">
              <div class="flex items-center justify-between text-xs">
                <span class="text-dark-300">Volum:</span>
                <span class="text-primary-500 font-medium">
                  {{ set.weight * set.reps }} kg
                </span>
              </div>
            </div>
          </div>
          
          <!-- Add Set Button -->
          <button 
            @click="addSet(exerciseIndex)"
            class="w-full mt-3 btn-secondary text-sm py-2"
          >
            + Legg til sett
          </button>
        </div>
      </div>
         </div>

                 <!-- Add Exercise Button -->
            <div class="card">
              <button 
                @click="showAddExerciseModal = true"
                class="w-full btn-secondary py-3 flex items-center justify-center"
              >
                + Legg til øvelse
              </button>
            </div>

            <!-- Add Exercise Modal -->
            <div v-if="showAddExerciseModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div class="bg-dark-800 rounded-lg p-6 w-full max-w-md mx-4">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-xl font-semibold text-white">Legg til Øvelse</h3>
                  <button 
                    @click="showAddExerciseModal = false"
                    class="text-dark-400 hover:text-white"
                  >
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <form @submit.prevent="addExerciseToSession" class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-white mb-2">Øvelse</label>
                    <select 
                      v-model="newExerciseId"
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
                  
                  <div class="flex gap-3 justify-end">
                    <button 
                      type="button"
                      @click="showAddExerciseModal = false"
                      class="btn-secondary"
                    >
                      Avbryt
                    </button>
                    <button 
                      type="submit"
                      class="btn-primary"
                    >
                      Legg til Øvelse
                    </button>
                  </div>
                </form>
              </div>
            </div>



     <!-- Summary -->
     <div class="card">
       <h3 class="text-lg font-semibold text-white mb-4">Sammendrag</h3>
       <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div class="text-center">
           <p class="text-2xl font-bold text-primary-500">{{ completedSets }} av {{ totalSets }}</p>
           <p class="text-sm text-dark-300">Sett gjennomført</p>
         </div>
         <div class="text-center">
           <p class="text-2xl font-bold text-primary-500">{{ formatNumber(estimatedVolume) }}</p>
           <p class="text-sm text-dark-300">Estimert volum (kg)</p>
         </div>
         <div class="text-center">
           <p class="text-2xl font-bold text-primary-500">{{ sessionDuration }}</p>
           <p class="text-sm text-dark-300">Varighet</p>
         </div>
       </div>
     </div>



  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHybridData } from '@/composables/useHybridData'
import type { WorkoutSession } from '@/types/workout'

const route = useRoute()
const router = useRouter()
const workoutData = useHybridData()

// State
const session = ref<WorkoutSession | null>(null)
const startTime = ref<Date | null>(null)
const showAddExerciseModal = ref(false)
const newExerciseId = ref('')

// Computed
const completedSets = computed(() => {
  if (!session.value) return 0
  return session.value.exercises.reduce((total, exercise) => {
    return total + exercise.sets.filter(set => set.isCompleted).length
  }, 0)
})

const totalSets = computed(() => {
  if (!session.value) return 0
  return session.value.exercises.reduce((total, exercise) => {
    return total + exercise.sets.length
  }, 0)
})



const estimatedVolume = computed(() => {
  if (!session.value) return 0
  return session.value.exercises.reduce((exerciseTotal, exercise) => {
    const exerciseVolume = exercise.sets.reduce((setTotal, set) => {
      if (set.isCompleted && set.weight && set.reps) {
        return setTotal + (set.weight * set.reps)
      }
      return setTotal
    }, 0)
    return exerciseTotal + exerciseVolume
  }, 0)
})

const sessionDuration = computed(() => {
  if (!startTime.value) return '0 min'
  const duration = Math.round((Date.now() - startTime.value.getTime()) / 60000)
  return `${duration} min`
})

const availableExercises = computed(() => {
  return workoutData.exercises.value
})

// Methods
const getWorkoutTypeName = (typeId: string): string => {
  const type = workoutData.getWorkoutType.value(typeId)
  return type?.name || typeId
}

const getWorkoutTypeColor = (typeId: string): string => {
  return workoutData.getWorkoutTypeColor.value(typeId)
}

const getCompletedSets = (exercise: any): number => {
  return exercise.sets.filter((set: any) => set.isCompleted).length
}

const updateSetCompletion = (exerciseIndex: number, setIndex: number) => {
  if (!session.value) return
  
  const set = session.value.exercises[exerciseIndex].sets[setIndex]
  const isCompleted = Boolean(set.weight && set.reps && set.weight > 0 && set.reps > 0)
  
  if (set.isCompleted !== isCompleted) {
    set.isCompleted = isCompleted
    
    // Auto-save session
    workoutData.updateWorkoutSession(session.value.id, {
      exercises: session.value.exercises
    })
  }
}

const addSet = (exerciseIndex: number) => {
  if (!session.value) return
  
  const exercise = session.value.exercises[exerciseIndex]
  const newSet = {
    id: `set-${Date.now()}-${exercise.sets.length}`,
    reps: 0,
    weight: 0,
    duration: undefined,
    distance: undefined,
    isCompleted: false
  }
  
  exercise.sets.push(newSet)
  
  // Auto-save session
  workoutData.updateWorkoutSession(session.value.id, {
    exercises: session.value.exercises
  })
}

const addExerciseToSession = () => {
  if (!session.value || !newExerciseId.value) return

  const exerciseData = workoutData.exercises.value.find(e => e.id === newExerciseId.value)
  if (!exerciseData) return

  const newExercise = {
    exerciseId: newExerciseId.value,
    name: exerciseData.name,
    sets: [{
      id: `set-${Date.now()}`,
      reps: 0,
      weight: 0,
      duration: undefined,
      distance: undefined,
      isCompleted: false
    }]
  }

  // Add the exercise to the session
  session.value.exercises.push(newExercise)
  
  // Update the session in the store
  workoutData.updateWorkoutSession(session.value.id, {
    exercises: session.value.exercises
  })

  // Reset form and close modal
  newExerciseId.value = ''
  showAddExerciseModal.value = false
}





const completeWorkout = () => {
  if (!session.value) return
  
  // Complete the workout
  workoutData.completeWorkoutSession(session.value.id)
  
  // Show completion message and redirect
  alert('Økt fullført! Godt jobbet! 💪')
  router.push('/')
}

const handleSaveWorkout = () => {
  if (!session.value) return
  
  // Mark session as active (saved but not completed)
  workoutData.markSessionAsActive(session.value.id)
  
  alert('Økt lagret! 💾')
  
  // Navigate back to dashboard to see the active session
  router.push('/')
}

const handleCompleteWorkout = () => {
  completeWorkout()
}

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('no-NO').format(Math.round(num))
}

// Lifecycle
onMounted(() => {
  const sessionId = route.params.id as string
  const foundSession = workoutData.getSessionById.value(sessionId)
  
  if (!foundSession) {
    alert('Økt ikke funnet')
    router.push('/')
    return
  }
  
  session.value = foundSession
  startTime.value = new Date(foundSession.date)
  
  // Add event listeners for navigation buttons
  window.addEventListener('save-workout', handleSaveWorkout)
  window.addEventListener('complete-workout', handleCompleteWorkout)
})

onUnmounted(() => {
  // Remove event listeners
  window.removeEventListener('save-workout', handleSaveWorkout)
  window.removeEventListener('complete-workout', handleCompleteWorkout)
})
</script> 