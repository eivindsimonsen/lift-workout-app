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
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-white">{{ exercise.name }}</h3>
            <!-- Last Performance -->
            <div v-if="getLastPerformance(exercise.exerciseId)" class="mt-1">
              <p class="text-xs text-dark-400">
                Sist: {{ getLastPerformance(exercise.exerciseId)?.reps }} reps × {{ getLastPerformance(exercise.exerciseId)?.weight }}kg
                <span class="text-dark-500">• {{ getLastPerformance(exercise.exerciseId)?.date ? formatDate(getLastPerformance(exercise.exerciseId)!.date) : '' }}</span>
              </p>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-sm text-dark-300">
              {{ getCompletedSets(exercise) }}/{{ exercise.sets.length }} sett
            </span>
            <button 
              @click="removeExercise(exerciseIndex)"
              class="text-red-400 hover:text-red-300 transition-colors p-1"
              title="Slett øvelse"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Sets -->
        <div class="space-y-2">
          <div 
            v-for="(set, setIndex) in exercise.sets" 
            :key="set.id"
            class="bg-dark-700 rounded-lg p-3"
            :class="{ 'border-l-4 border-primary-500': set.isCompleted }"
          >
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-white">Sett {{ setIndex + 1 }}</span>
                             <button 
                 @click="removeSet(exerciseIndex, setIndex)"
                 class="text-dark-400 hover:text-red-400 transition-colors p-1"
                 title="Slett sett"
               >
                 <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
            </div>

                         <div class="grid grid-cols-2 gap-3">
                               <div>
                  <label class="block text-xs text-dark-300 mb-1">Reps</label>
                  <input
                    :value="set.reps"
                    type="number"
                    inputmode="numeric"
                    min="0"
                    required
                    class="input-field w-full text-sm py-1"
                    :placeholder="getLastPerformance(exercise.exerciseId)?.reps?.toString() || '8'"
                    @input="(event) => handleRepsInput(event, exerciseIndex, setIndex)"
                    @blur="(event) => handleRepsBlur(event, exerciseIndex, setIndex)"
                  />
                </div>
                               <div>
                  <label class="block text-xs text-dark-300 mb-1">Vekt (kg)</label>
                  <input
                    :value="set.weight"
                    type="number"
                    inputmode="decimal"
                    min="0"
                    step="0.5"
                    required
                    class="input-field w-full text-sm py-1"
                    :placeholder="getLastPerformance(exercise.exerciseId)?.weight?.toString() || '20'"
                    @input="(event) => handleWeightInput(event, exerciseIndex, setIndex)"
                    @blur="(event) => handleWeightBlur(event, exerciseIndex, setIndex)"
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
              <div class="hidden md:block">
                <button 
                  @click="showAddExerciseModal = true"
                  :disabled="availableExercises.length === 0"
                  class="w-full btn-secondary py-3 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span v-if="availableExercises.length === 0">
                    Alle øvelser lagt til
                  </span>
                  <span v-else>
                    + Legg til øvelse
                  </span>
                </button>
              </div>
              <div class="md:hidden">
                <button 
                  @click="openMobileAddExercise()"
                  :disabled="availableExercises.length === 0"
                  class="w-full btn-secondary py-3 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span v-if="availableExercises.length === 0">
                    Alle øvelser lagt til
                  </span>
                  <span v-else>
                    + Legg til øvelse
                  </span>
                </button>
              </div>
            </div>

            <!-- Add Exercise Modal (desktop) -->
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
                    <div v-if="availableExercises.length === 0" class="text-center py-4">
                      <p class="text-dark-300">Alle øvelser er allerede lagt til i økten.</p>
                    </div>
                    <select 
                      v-else
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
                      v-if="availableExercises.length > 0"
                      type="submit"
                      class="btn-primary"
                    >
                      Legg til Øvelse
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <!-- Mobile Exercise Picker -->
            <ExerciseSearchPanel
              :is-open="isMobileExercisePanelOpen"
              :exercises="availableExercises"
              title="Velg øvelse"
              @close="closeMobileAddExercise"
              @select="handleAddExerciseFromPanel"
            />

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
import { ref, computed, onMounted, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHybridData } from '@/composables/useHybridData'
import { useErrorHandler } from '@/composables/useErrorHandler'
import type { WorkoutSession } from '@/types/workout'
import ExerciseSearchPanel from '@/components/ExerciseSearchPanel.vue'

const route = useRoute()
const router = useRouter()
const workoutData = useHybridData()
const { handleAuthError } = useErrorHandler()

// State
const session = ref<WorkoutSession | null>(null)
const startTime = ref<Date | null>(null)
const showAddExerciseModal = ref(false)
const newExerciseId = ref('')
const isMobileExercisePanelOpen: Ref<boolean> = ref(false)

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
  if (!session.value) return workoutData.exercises.value
  
  // Filter out exercises that are already in the session
  const existingExerciseIds = session.value.exercises.map(e => e.exerciseId)
  return workoutData.exercises.value.filter(exercise => !existingExerciseIds.includes(exercise.id))
})

// Methods
const getWorkoutTypeName = (typeId: string): string => {
  return workoutData.getWorkoutType.value(typeId)
}

const getWorkoutTypeColor = (typeId: string): string => {
  return workoutData.getWorkoutTypeColor.value(typeId)
}

const getCompletedSets = (exercise: any): number => {
  return exercise.sets.filter((set: any) => set.isCompleted).length
}

const handleWeightInput = (event: Event, exerciseIndex: number, setIndex: number) => {
  if (!session.value) return
  
  const target = event.target as HTMLInputElement
  const value = target.value
  
  // Update the weight value immediately for display
  session.value.exercises[exerciseIndex].sets[setIndex].weight = value === '' ? 0 : parseFloat(value) || 0
  
  // Update completion status in real-time for progress bar
  updateSetCompletion(exerciseIndex, setIndex)
}

const handleWeightBlur = (event: Event, exerciseIndex: number, setIndex: number) => {
  if (!session.value) return
  
  const target = event.target as HTMLInputElement
  const value = target.value
  
  // Ensure weight is a number
  const weight = value === '' ? 0 : parseFloat(value) || 0
  session.value.exercises[exerciseIndex].sets[setIndex].weight = weight
  
  // Update completion status and save
  updateSetCompletion(exerciseIndex, setIndex)
}

const handleRepsInput = (event: Event, exerciseIndex: number, setIndex: number) => {
  if (!session.value) return
  
  const target = event.target as HTMLInputElement
  const value = target.value
  
  // Update the reps value immediately for display
  session.value.exercises[exerciseIndex].sets[setIndex].reps = value === '' ? 0 : parseInt(value) || 0
  
  // Update completion status in real-time for progress bar
  updateSetCompletion(exerciseIndex, setIndex)
}

const handleRepsBlur = (event: Event, exerciseIndex: number, setIndex: number) => {
  if (!session.value) return
  
  const target = event.target as HTMLInputElement
  const value = target.value
  
  // Ensure reps is a number
  const reps = value === '' ? 0 : parseInt(value) || 0
  session.value.exercises[exerciseIndex].sets[setIndex].reps = reps
  
  // Update completion status and save
  updateSetCompletion(exerciseIndex, setIndex)
}

const updateSetCompletion = (exerciseIndex: number, setIndex: number) => {
  if (!session.value) return
  
  const set = session.value.exercises[exerciseIndex].sets[setIndex]
  
    // Ensure weight and reps are numbers
  if (typeof set.weight === 'string') {
    set.weight = parseFloat(set.weight) || 0
  }
  if (typeof set.reps === 'string') {
    set.reps = parseInt(set.reps) || 0
  }
  
  // A set is only completed if both weight and reps are provided and greater than 0
  const isCompleted = Boolean(
    set.weight && 
    set.reps && 
    set.weight > 0 && 
    set.reps > 0
  )
  
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
  
  // Ensure weight and reps are numbers
  newSet.weight = Number(newSet.weight) || 0
  newSet.reps = Number(newSet.reps) || 0
  
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

  // Check if exercise already exists in session
  const exerciseExists = session.value.exercises.some(e => e.exerciseId === newExerciseId.value)
  if (exerciseExists) {
    alert('Denne øvelsen er allerede lagt til i økten.')
    return
  }

  // Check if there are available exercises
  if (availableExercises.value.length === 0) {
    alert('Det er ingen flere øvelser å legge til.')
    return
  }

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
  
  // Ensure weight and reps are numbers
  newExercise.sets[0].weight = Number(newExercise.sets[0].weight) || 0
  newExercise.sets[0].reps = Number(newExercise.sets[0].reps) || 0

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

const openMobileAddExercise = () => {
  isMobileExercisePanelOpen.value = true
}

const closeMobileAddExercise = () => {
  isMobileExercisePanelOpen.value = false
}

const handleAddExerciseFromPanel = (exerciseId: string) => {
  newExerciseId.value = exerciseId
  addExerciseToSession()
  isMobileExercisePanelOpen.value = false
}

const removeExercise = (index: number) => {
  if (!session.value) return
  
  session.value.exercises.splice(index, 1)
  
  // Update the session in the store
  workoutData.updateWorkoutSession(session.value.id, {
    exercises: session.value.exercises
  })
}

const removeSet = (exerciseIndex: number, setIndex: number) => {
  if (!session.value) return
  
  const exercise = session.value.exercises[exerciseIndex]
  
  // If this is the last set of the exercise, remove the entire exercise
  if (exercise.sets.length <= 1) {
    session.value.exercises.splice(exerciseIndex, 1)
    
    // Update the session in the store
    workoutData.updateWorkoutSession(session.value.id, {
      exercises: session.value.exercises
    })
    return
  }
  
  // Otherwise, just remove the set
  exercise.sets.splice(setIndex, 1)
  
  // Update the session in the store
  workoutData.updateWorkoutSession(session.value.id, {
    exercises: session.value.exercises
  })
}

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('no-NO').format(Math.round(num))
}

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('no-NO', {
    day: 'numeric',
    month: 'short'
  }).format(date)
}

const getLastPerformance = (exerciseId: string) => {
  // Get all completed sessions
  const completedSessions = workoutData.sessions.value.filter(session => session.isCompleted)
  
  // Find the most recent session that contains this exercise
  for (const session of completedSessions) {
    const exercise = session.exercises.find(e => e.exerciseId === exerciseId)
    if (exercise) {
      // Find the best set (highest weight × reps)
      let bestSet: any = null
      let bestVolume = 0
      
      exercise.sets.forEach(set => {
        if (set.isCompleted && set.weight && set.reps) {
          const volume = set.weight * set.reps
          if (volume > bestVolume) {
            bestVolume = volume
            bestSet = set
          }
        }
      })
      
      if (bestSet) {
        return {
          weight: bestSet.weight,
          reps: bestSet.reps,
          date: session.date
        }
      }
    }
  }
  
  return null
}

const handleCompleteWorkout = () => {
  if (confirm('Er du sikker på at du vil avslutte økten?')) {
    completeWorkout()
  }
}

const completeWorkout = async () => {
  if (!session.value) return
  
  try {
    await workoutData.completeWorkoutSession(session.value.id)
    router.push('/history')
  } catch (error: any) {
    handleAuthError(error)
  }
}

// Lifecycle
onMounted(() => {
  const sessionId = route.params.id as string
  const foundSession = workoutData.getSessionById.value(sessionId)
  
  if (!foundSession) {
    handleAuthError({ message: 'Økt ikke funnet' })
    router.push('/')
    return
  }
  
  session.value = foundSession
  startTime.value = new Date(foundSession.date)
})
</script> 