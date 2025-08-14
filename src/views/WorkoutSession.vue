<template>
  <div class="space-y-6">
    <!-- Loading state -->
    <div v-if="workoutData.isLoading.value || !session" class="flex items-center justify-center py-12">
      <div class="text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
        <p class="text-dark-300">Laster økt...</p>
      </div>
    </div>
    
    <!-- Session content -->
    <div v-else>
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <router-link 
            to="/" 
            class="inline-flex items-center justify-center w-10 h-10 bg-[#3F302A] hover:bg-[#4A3A32] rounded-lg transition-colors"
          >
            <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </router-link>
          <h1 class="text-2xl font-bold text-white">{{ session?.templateName }}</h1>
        </div>
        <div class="flex items-center gap-3">
          <!-- Unsaved changes indicator -->
          <div v-if="hasUnsavedChanges" class="flex items-center gap-2 text-yellow-400 text-sm">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <span>Ulagrede endringer</span>
          </div>
          <span 
            class="inline-block px-3 py-1 text-sm font-medium rounded-full"
            :style="{ 
              backgroundColor: getWorkoutTypeColor(session?.workoutType || '') + '20',
              color: getWorkoutTypeColor(session?.workoutType || '')
            }"
          >
            {{ getWorkoutTypeName(session?.workoutType || '') }}
          </span>
          <!-- Abandon workout button (desktop only) -->
          <button 
            @click="handleAbandonWorkout"
            class="hidden md:block px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors text-sm font-medium"
            title="Avbryt økt"
          >
            Avbryt økt
          </button>
        </div>
      </div>

      <!-- Success message -->
      <div v-if="showSaveSuccess" class="mt-4 p-3 bg-green-600 bg-opacity-20 border border-green-500 rounded-lg">
        <div class="flex items-center gap-2 text-green-400 text-sm">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 01-1.414-1.414L9 10.586 7.707 9.293a1 1 0 01-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          <span>Lagring velykket!</span>
        </div>
      </div>

      <!-- Exercises -->
      <div v-if="session" class="space-y-6 mt-6">
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
          <div class="space-y-4">
            <div 
              v-for="(set, setIndex) in exercise.sets" 
              :key="set.id"
              class="bg-dark-700 rounded-lg p-3"
              :class="{ 'border-l-4 border-primary-500': set.isCompleted }"
            >
              <div class="flex items-center justify-between mb-2">
                <button 
                  @click="removeSet(exerciseIndex, setIndex)"
                  class="text-dark-400 hover:text-red-400 transition-colors p-1"
                  title="Slett sett"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <span class="text-sm font-medium text-white">Sett {{ setIndex + 1 }}</span>
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
      <div class="card mt-6">
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
        :workout-type="session?.workoutType"
        title="Velg øvelse"
        @close="closeMobileAddExercise"
        @select="handleAddExerciseFromPanel"
      />

      <!-- Summary -->
      <div class="card mt-6">
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
        
        <!-- Action Buttons -->
        <div class="mt-6 flex gap-3 justify-center">
          <button 
            @click="handleCompleteWorkout"
            :disabled="completedSets === 0"
            class="btn-primary px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            :title="completedSets === 0 ? 'Du må ha minst ett fullført sett for å fullføre økten' : 'Fullfør økt'"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Fullfør økt
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, type Ref, onUnmounted, watch } from 'vue'
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
const hasUnsavedChanges = ref(false)
const isSaving = ref(false)
const showSaveSuccess = ref(false)


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
  if (!session.value) return []
  
  const existingExerciseIds = session.value.exercises.map(e => e.exerciseId)
  const exercises: Array<{id: string, name: string, category: string}> = []
  
  workoutData.exercises.value.forEach(exercise => {
    if (exercise.variants && exercise.variants.length > 0) {
      exercise.variants.forEach(variant => {
        if (!existingExerciseIds.includes(variant.id)) {
          exercises.push({
            id: variant.id,
            name: `${exercise.name} - ${variant.name}`,
            category: exercise.category
          })
        }
      })
    } else {
      if (!existingExerciseIds.includes(exercise.id)) {
        exercises.push({
          id: exercise.id,
          name: exercise.name,
          category: exercise.category
        })
      }
    }
  })
  
  return exercises
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
  
  // Always store as number, never as string
  const weight = value === '' ? 0 : parseFloat(value) || 0
  session.value.exercises[exerciseIndex].sets[setIndex].weight = weight
  
  // Update completion status in real-time for progress bar
  updateSetCompletion(exerciseIndex, setIndex)
  
  // Mark as having unsaved changes
  hasUnsavedChanges.value = true
}

const handleWeightBlur = (event: Event, exerciseIndex: number, setIndex: number) => {
  if (!session.value) return
  
  const target = event.target as HTMLInputElement
  const value = target.value
  
  // Ensure weight is a number
  const weight = value === '' ? 0 : parseFloat(value) || 0
  session.value.exercises[exerciseIndex].sets[setIndex].weight = weight
  
  // Update completion status
  updateSetCompletion(exerciseIndex, setIndex)
  
  // Mark as having unsaved changes
  hasUnsavedChanges.value = true
}

const handleRepsInput = (event: Event, exerciseIndex: number, setIndex: number) => {
  if (!session.value) return
  
  const target = event.target as HTMLInputElement
  const value = target.value
  
  // Always store as number, never as string
  const reps = value === '' ? 0 : parseInt(value) || 0
  session.value.exercises[exerciseIndex].sets[setIndex].reps = reps
  
  // Update completion status in real-time for progress bar
  updateSetCompletion(exerciseIndex, setIndex)
  
  // Mark as having unsaved changes
  hasUnsavedChanges.value = true
}

const handleRepsBlur = (event: Event, exerciseIndex: number, setIndex: number) => {
  if (!session.value) return
  
  const target = event.target as HTMLInputElement
  const value = target.value
  
  // Ensure reps is a number
  const reps = value === '' ? 0 : parseInt(value) || 0
  session.value.exercises[exerciseIndex].sets[setIndex].reps = reps
  
  // Update completion status
  updateSetCompletion(exerciseIndex, setIndex)
  
  // Mark as having unsaved changes
  hasUnsavedChanges.value = true
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
  }
  
  // Don't auto-save anymore - just mark as having unsaved changes
  // The user will manually save when ready
}

const saveSessionChanges = async () => {
  if (!session.value || !hasUnsavedChanges.value) return
  
  isSaving.value = true
  
  try {
    // Ensure all data is properly formatted before saving
    const formattedExercises = session.value.exercises.map(exercise => ({
      ...exercise,
      sets: exercise.sets.map(set => ({
        ...set,
        weight: Number(set.weight) || 0,
        reps: Number(set.reps) || 0
      }))
    }))
    
    // Save session with formatted data
    await workoutData.updateWorkoutSession(session.value.id, {
      exercises: formattedExercises
    })
    
    // Clear unsaved changes flag
    hasUnsavedChanges.value = false
    showSaveSuccess.value = true
    setTimeout(() => {
      showSaveSuccess.value = false
    }, 3000) // Hide after 3 seconds
    
    console.log('✅ Session saved successfully')
  } catch (error) {
    console.error('❌ Error saving session:', error)
    // Keep the unsaved changes flag so user can retry
  } finally {
    isSaving.value = false
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
  
  // Mark as having unsaved changes instead of auto-saving
  hasUnsavedChanges.value = true
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
  
  // Mark as having unsaved changes instead of auto-saving
  hasUnsavedChanges.value = true

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
  
  // Mark as having unsaved changes instead of auto-saving
  hasUnsavedChanges.value = true
}

const removeSet = (exerciseIndex: number, setIndex: number) => {
  if (!session.value) return
  
  const exercise = session.value.exercises[exerciseIndex]
  
  // If this is the last set of the exercise, remove the entire exercise
  if (exercise.sets.length <= 1) {
    session.value.exercises.splice(exerciseIndex, 1)
    
    // Mark as having unsaved changes instead of auto-saving
    hasUnsavedChanges.value = true
    return
  }
  
  // Otherwise, just remove the set
  exercise.sets.splice(setIndex, 1)
  
  // Mark as having unsaved changes instead of auto-saving
  hasUnsavedChanges.value = true
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

// Communicate save state to App.vue
const updateAppSaveState = () => {
  const updateEvent = new CustomEvent('updateAppSaveState', {
    detail: { 
      hasUnsavedChanges: hasUnsavedChanges.value,
      isSaving: isSaving.value 
    }
  })
  window.dispatchEvent(updateEvent)
}

const handleCompleteWorkout = () => {
  if (confirm('Er du sikker på at du vil fullføre økten?')) {
    completeWorkout()
  }
}

const handleAbandonWorkout = () => {
  if (confirm('Er du sikker på at du vil avbryte denne økten? Dette kan ikke angres og økten vil markeres som fullført.')) {
    abandonWorkout()
  }
}

const abandonWorkout = async () => {
  if (!session.value) return
  
  try {
    await workoutData.abandonWorkoutSession(session.value.id)
    router.push('/')
  } catch (error: any) {
    handleAuthError(error)
  }
}

const completeWorkout = async () => {
  if (!session.value) return
  
  try {
    await workoutData.completeWorkoutSession(session.value.id)
    router.push(`/session/${session.value.id}`)
  } catch (error: any) {
    handleAuthError(error)
  }
}

// Lifecycle
onMounted(async () => {
  const sessionId = route.params.id as string
  
  // Wait for data to be loaded if it's still loading
  if (workoutData.isLoading.value) {
    await new Promise<void>((resolve) => {
      const unwatch = watch(() => workoutData.isLoading.value, (newValue) => {
        if (!newValue) {
          unwatch()
          resolve()
        }
      })
    })
  }
  
  const foundSession = workoutData.getSessionById.value(sessionId)
  
  if (!foundSession) {
    // Try to load data again if session not found
    try {
      await workoutData.loadData()
      const retrySession = workoutData.getSessionById.value(sessionId)
      if (retrySession) {
        session.value = retrySession
        startTime.value = new Date(retrySession.date)
        return
      }
    } catch (error) {
      console.error("Error retrying data load:", error)
    }
    
    handleAuthError({ message: 'Økt ikke funnet' })
    router.push('/')
    return
  }
  
  session.value = foundSession
  startTime.value = new Date(foundSession.date)
  
  // Initial state update to App.vue
  updateAppSaveState()
  
  // Add keyboard shortcut for saving (Ctrl+S)
  const handleKeydown = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault()
      if (hasUnsavedChanges.value && !isSaving.value) {
        saveSessionChanges()
      }
    }
  }
  
  // Listen for save event from App.vue
  const handleSaveEvent = (event: CustomEvent) => {
    if (event.detail.sessionId === session.value?.id && hasUnsavedChanges.value && !isSaving.value) {
      saveSessionChanges()
    }
  }
  
  // Watch for changes in save state and communicate to App.vue
  watch([hasUnsavedChanges, isSaving], () => {
    updateAppSaveState()
  })
  
  // Add beforeunload listener to warn about unsaved changes
  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (hasUnsavedChanges.value) {
      event.preventDefault()
      event.returnValue = 'Du har ulagrede endringer. Er du sikker på at du vil forlate siden?'
      return 'Du har ulagrede endringer. Er du sikker på at du vil forlate siden?'
    }
  }
  
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('saveWorkoutSession', handleSaveEvent as EventListener)
  window.addEventListener('beforeunload', handleBeforeUnload)
  
  // Cleanup on unmount
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
    window.removeEventListener('saveWorkoutSession', handleSaveEvent as EventListener)
    window.removeEventListener('beforeunload', handleBeforeUnload)
  })
})

// Watch for route changes to warn about unsaved changes
watch(() => route.params.id, async (newId, oldId) => {
  if (newId && newId !== oldId) {
    // Check if there are unsaved changes before navigating away
    if (hasUnsavedChanges.value) {
      const shouldLeave = confirm('Du har ulagrede endringer. Vil du lagre dem først?')
      if (shouldLeave) {
        await saveSessionChanges()
      }
    }
    
    // Load new session
    const foundSession = workoutData.getSessionById.value(newId as string)
    if (foundSession) {
      session.value = foundSession
      startTime.value = new Date(foundSession.date)
      hasUnsavedChanges.value = false // Reset for new session
    }
  }
})


</script> 