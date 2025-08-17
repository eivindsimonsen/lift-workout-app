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
      <!-- Breadcrumbs - moved above header -->
      <Breadcrumbs 
        :breadcrumbs="[
          { name: 'Økter', path: '/' },
          { name: 'Aktiv økt' }
        ]"
      />

      <!-- Header -->
      <div class="flex items-center justify-between mt-4">
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

      <!-- Network status indicator -->
      <div v-if="!workoutData.isOnline.value" class="mt-4 p-3 bg-yellow-600 bg-opacity-20 border border-yellow-500 rounded-lg">
        <div class="flex items-center gap-2 text-yellow-400 text-sm">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          <span>Offline modus - endringer lagres lokalt og synkroniseres når du er tilkoblet</span>
        </div>
      </div>

      <!-- Pending changes indicator -->
      <div v-if="workoutData.isOnline.value && pendingChangesCount > 0" class="mt-4 p-3 bg-blue-600 bg-opacity-20 border border-blue-500 rounded-lg">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-blue-400 text-sm">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            <span>{{ pendingChangesCount }} endring(er) venter på synkronisering</span>
          </div>
          <button 
            @click="syncPendingChanges"
            class="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-lg transition-colors"
            :disabled="isSyncingPendingChanges"
          >
            <span v-if="isSyncingPendingChanges">Synkroniserer...</span>
            <span v-else>Synkroniser nå</span>
          </button>
        </div>
      </div>

             <!-- Exercises -->
       <div v-if="session" class="mt-8">
         <div 
           v-for="(exercise, exerciseIndex) in session.exercises" 
           :key="exercise.exerciseId"
           class="mb-10 last:mb-0"
         >
           <!-- Exercise Separator -->
           <div v-if="exerciseIndex > 0" class="mb-8 flex items-center">
             <div class="flex-1 h-px bg-dark-600"></div>
             <div class="mx-4 px-3 py-1 bg-dark-700 rounded-full border border-dark-600">
               <span class="text-xs font-medium text-dark-400">Øvelse {{ exerciseIndex + 1 }}</span>
             </div>
             <div class="flex-1 h-px bg-dark-600"></div>
           </div>
                     <!-- Exercise Header -->
           <div class="flex items-start justify-between mb-6">
             <!-- Left Column: Exercise Info -->
             <div class="flex-1 min-w-0">
                <!-- Muscle Groups - moved above exercise title -->
                <div v-if="getExerciseMuscleGroups(exercise.exerciseId)" class="flex flex-wrap gap-1 mb-2">
                  <span 
                    v-for="muscleGroup in getExerciseMuscleGroups(exercise.exerciseId)" 
                    :key="muscleGroup"
                    class="inline-block px-2 py-1 text-xs font-medium rounded-full"
                    :style="{
                      backgroundColor: getMuscleGroupColor(muscleGroup) + '20',
                      color: getMuscleGroupColor(muscleGroup)
                    }"
                  >
                    {{ muscleGroup }}
                  </span>
                </div>
                
                <h3 class="text-xl font-bold text-white mb-2">{{ exercise.name }}</h3>
                
                <!-- Last Performance - moved below exercise title -->
                <div v-if="getLastPerformance(exercise.exerciseId)" class="flex items-center gap-2 text-sm text-dark-300">
                  <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Sist: {{ getLastPerformance(exercise.exerciseId)?.reps }} reps × {{ getLastPerformance(exercise.exerciseId)?.weight }}kg • {{ getLastPerformance(exercise.exerciseId)?.date ? formatDate(getLastPerformance(exercise.exerciseId)!.date) : '' }}</span>
                </div>
              </div>
            
            <!-- Right Column: Actions -->
            <div class="flex items-center gap-3 ml-4">
              <span class="text-sm font-medium text-primary-400 bg-primary-500/10 px-3 py-1.5 rounded-full">
                {{ getCompletedSets(exercise) }}/{{ exercise.sets.length }} sett
              </span>
              <button 
                @click="removeExercise(exerciseIndex)"
                class="text-red-400 hover:text-red-300 transition-colors p-2 hover:bg-red-500/10 rounded-lg flex items-center justify-center w-8 h-8"
                title="Slett øvelse"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Sets -->
          <div class="bg-dark-800/50 border border-dark-700 rounded-xl overflow-hidden">
            <div 
              v-for="(set, setIndex) in exercise.sets" 
              :key="set.id"
              class="py-5 px-6 transition-all duration-200"
              :class="{ 
                'bg-primary-500/5 border-l-4 border-l-primary-500': set.isCompleted,
                'border-b border-dark-600': setIndex < exercise.sets.length - 1
              }"
            >
              <div class="flex items-center justify-between">
                <button 
                  @click="removeSet(exerciseIndex, setIndex)"
                  class="text-dark-400 hover:text-red-400 transition-colors p-2 hover:bg-red-500/10 rounded-lg flex items-center justify-center w-8 h-8"
                  title="Slett sett"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <span class="text-sm font-semibold text-white bg-dark-700 px-3 py-1.5 rounded-full">Sett {{ setIndex + 1 }}</span>
              </div>

              <div class="grid grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-dark-300 mb-3">Reps</label>
                  <input
                    :value="set.reps === 0 ? '' : set.reps"
                    type="number"
                    inputmode="numeric"
                    min="0"
                    required
                    class="input-field w-full text-sm py-3 bg-dark-700 border-dark-600 focus:border-primary-500"
                    :placeholder="getLastPerformance(exercise.exerciseId)?.reps?.toString() || '8'"
                    @input="(event) => handleRepsInput(event, exerciseIndex, setIndex)"
                    @blur="(event) => handleRepsBlur(event, exerciseIndex, setIndex)"
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-dark-300 mb-3">Vekt (kg)</label>
                  <input
                    :value="set.weight === 0 ? '' : set.weight"
                    type="number"
                    inputmode="decimal"
                    min="0"
                    step="0.5"
                    required
                    class="input-field w-full text-sm py-3 bg-dark-700 border-dark-600 focus:border-primary-500"
                    :placeholder="getLastPerformance(exercise.exerciseId)?.weight?.toString() || '20'"
                    @input="(event) => handleWeightInput(event, exerciseIndex, setIndex)"
                    @blur="(event) => handleWeightBlur(event, exerciseIndex, setIndex)"
                  />
                </div>
              </div>

              <!-- Volume Display -->
              <div v-if="set.weight && set.reps" class="mt-4 pt-4 border-t border-dark-600">
                <div class="flex items-center justify-between">
                  <span class="text-dark-300 font-medium text-sm">Volum:</span>
                  <span class="text-primary-400 font-bold text-base">
                    {{ set.weight * set.reps }} kg
                  </span>
                </div>
              </div>
            </div>
            
            <!-- Add Set Button -->
            <div class="p-5 border-t border-dark-600">
              <button 
                @click="addSet(exerciseIndex)"
                class="w-full btn-secondary text-sm py-4 border-dashed border-2 border-dark-600 hover:border-primary-500 hover:bg-primary-500/10 transition-all duration-200"
              >
                <svg class="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Legg til sett
              </button>
            </div>
          </div>
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

      <!-- Add Exercise Section -->
      <div class="mt-8">
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
      </div>

       <!-- Summary -->
       <div class="mt-8">
         <div class="card">
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
       
       <!-- Complete Button - moved below summary box -->
       <div class="mt-6">
         <button 
           @click="handleCompleteWorkout"
           class="w-full btn-primary py-3 flex items-center justify-center gap-2"
           :disabled="completedSets === 0"
         >
           <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
           </svg>
           Fullfør Økt
         </button>
         <p v-if="completedSets === 0" class="text-xs text-dark-400 text-center mt-2">
           Du må fullføre minst ett sett for å kunne fullføre økten
         </p>
       </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, type Ref, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHybridData } from '@/composables/useHybridData'
import { useErrorHandler } from '@/composables/useErrorHandler'
import type { WorkoutSession } from '@/types/workout'
import ExerciseSearchPanel from '@/components/ExerciseSearchPanel.vue'
import Breadcrumbs from '@/components/Breadcrumbs.vue'

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
const isSyncingPendingChanges = ref(false)

// Scroll position persistence
const scrollPositionKey = computed(() => `workout-session-scroll-${route.params.id}`)
const shouldRestoreScroll = ref(false)
const scrollUpdateTimeout = ref<NodeJS.Timeout | null>(null)


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

const progressPercentage = computed(() => {
  if (totalSets.value === 0) return 0
  return Math.round((completedSets.value / totalSets.value) * 100)
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
  if (!session.value) {
    return []
  }
  
  const existingExerciseIds = session.value.exercises.map(e => e.exerciseId)
  
  // Use the getFlattenedExercises helper for consistency
  const allExercises = workoutData.getFlattenedExercises.value
  const available = allExercises.filter(exercise => !existingExerciseIds.includes(exercise.id))
  
  return available
})

// Pending changes functionality
const pendingChangesCount = ref(0)

const updatePendingChangesCount = async () => {
  // For now, we'll set this to 0 and update it when we implement the full functionality
  // This will be enhanced later when we add proper pending changes tracking
  pendingChangesCount.value = 0
}

const syncPendingChanges = async () => {
  if (!workoutData.isOnline.value) return
  
  isSyncingPendingChanges.value = true
  try {
    await workoutData.syncPendingChanges()
    // Update the count after syncing
    await updatePendingChangesCount()
  } catch (error) {
    console.error('❌ Error syncing pending changes:', error)
  } finally {
    isSyncingPendingChanges.value = false
  }
}


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
  
  console.log('💪 Weight input:', { exerciseIndex, setIndex, value })
  
  // Store as number, but allow empty input to be treated as 0
  const weight = value === '' ? 0 : parseFloat(value) || 0
  session.value.exercises[exerciseIndex].sets[setIndex].weight = weight
  
  console.log('💪 Weight stored:', weight)
  
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
  
  console.log('💪 Reps input:', { exerciseIndex, setIndex, value })
  
  // Store as number, but allow empty input to be treated as 0
  const reps = value === '' ? 0 : parseInt(value) || 0
  session.value.exercises[exerciseIndex].sets[setIndex].reps = reps
  
  console.log('💪 Reps stored:', reps)
  
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
  
  // Mark as having unsaved changes
  hasUnsavedChanges.value = true
  
  // Update scroll position during workout
  updateCurrentScrollPosition()
  
  // Save immediately to IndexedDB for instant persistence
  if (!isSaving.value) {
    try {
      saveSessionChanges()
    } catch (error) {
      console.error('❌ Error in updateSetCompletion:', error)
    }
  }
}

const saveSessionChanges = async () => {
  if (!session.value || !hasUnsavedChanges.value) return
  
  console.log('💾 Starting to save session changes...')
  isSaving.value = true
  
  try {
    // Create a clean, serializable copy of the exercises data
    const cleanExercises = session.value.exercises.map(exercise => ({
      exerciseId: exercise.exerciseId,
      name: exercise.name,
      sets: exercise.sets.map(set => ({
        id: set.id,
        reps: Number(set.reps) || 0,
        weight: Number(set.weight) || 0,
        duration: set.duration,
        distance: set.distance,
        isCompleted: Boolean(set.isCompleted)
      }))
    }))
    
    console.log('💾 Clean exercises data:', cleanExercises)
    
    // Use offline-first save function with clean data
    console.log('💾 Calling updateWorkoutSessionOffline with session ID:', session.value.id)
    const result = await workoutData.updateWorkoutSessionOffline(session.value.id, {
      exercises: cleanExercises
    })
    
    console.log('💾 Save result:', result)
    
    // Check if the result indicates offline mode
    if (result && typeof result === 'object' && 'offline' in result && result.offline) {
      console.log('📱 Changes saved offline, will sync when online')
    } else {
      console.log('✅ Session saved and synced successfully')
    }
    
    // Clear unsaved changes flag
    hasUnsavedChanges.value = false
    
  } catch (error: any) {
    console.error('❌ Error saving session:', error)
    console.error('❌ Error details:', {
      message: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace',
      sessionId: session.value?.id,
      exercisesCount: session.value?.exercises?.length
    })
    
    // Check if it's an authentication error
    if (error.message && (
      error.message.includes("not authenticated") || 
      error.message.includes("Session expired") ||
      error.message.includes("Please log in again")
    )) {
      console.log("🔄 Authentication error detected in saveSessionChanges")
      
      // Show a more user-friendly message
      alert("Din sesjon har utløpt. Du vil bli sendt til innloggingssiden.")
      
      // Redirect to login
      router.push('/login')
      return
    }
    
    // Keep the unsaved changes flag so user can retry
  } finally {
    isSaving.value = false
    console.log('💾 Save operation completed')
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
  
  // Update scroll position during workout
  updateCurrentScrollPosition()
  
  // Mark as having unsaved changes and save immediately
  hasUnsavedChanges.value = true
  if (!isSaving.value) {
    saveSessionChanges()
  }
}

const addExerciseToSession = () => {
  console.log('🔍 addExerciseToSession called')
  console.log('🔍 newExerciseId.value:', newExerciseId.value)
  
  if (!session.value || !newExerciseId.value) {
    console.log('❌ Early return - missing session or exercise ID')
    return
  }

  // Find the exercise from the flattened exercises list for consistency
  const exerciseData = workoutData.getFlattenedExercises.value.find(e => e.id === newExerciseId.value)
  console.log('🔍 exerciseData found from flattened exercises:', exerciseData)
  
  if (!exerciseData) {
    console.log('❌ No exercise data found for ID:', newExerciseId.value)
    return
  }

  // Check if exercise already exists in session
  const exerciseExists = session.value.exercises.some(e => e.exerciseId === newExerciseId.value)
  console.log('🔍 exerciseExists:', exerciseExists)
  
  if (exerciseExists) {
    console.log('❌ Exercise already exists in session')
    alert('Denne øvelsen er allerede lagt til i økten.')
    return
  }

  // Check if there are available exercises
  if (availableExercises.value.length === 0) {
    console.log('❌ No available exercises')
    alert('Det er ingen flere øvelser å legge til.')
    return
  }

  // The exercise data from getFlattenedExercises should already have the correct name
  const exerciseName = exerciseData.name
  const exerciseId = exerciseData.id
  
  console.log('🔍 Using exercise name:', exerciseName, 'and ID:', exerciseId)

  const newExercise = {
    exerciseId: exerciseId,
    name: exerciseName,
    sets: [{
      id: `set-${Date.now()}`,
      reps: 0,
      weight: 0,
      duration: undefined,
      distance: undefined,
      isCompleted: false
    }]
  }
  
  console.log('🔍 newExercise created:', newExercise)
  
  // Add the exercise to the session
  session.value.exercises.push(newExercise)
  console.log('✅ Exercise added to session. New exercises array:', session.value.exercises)
  
  // Update scroll position during workout
  updateCurrentScrollPosition()
  
  // Mark as having unsaved changes and save immediately
  hasUnsavedChanges.value = true
  if (!isSaving.value) {
    saveSessionChanges()
  }

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
  
  // Update scroll position during workout
  updateCurrentScrollPosition()
  
  // Mark as having unsaved changes and save immediately
  hasUnsavedChanges.value = true
  if (!isSaving.value) {
    saveSessionChanges()
  }
}

const removeSet = (exerciseIndex: number, setIndex: number) => {
  if (!session.value) return
  
  const exercise = session.value.exercises[exerciseIndex]
  
  // If this is the last set of the exercise, remove the entire exercise
  if (exercise.sets.length <= 1) {
    session.value.exercises.splice(exerciseIndex, 1)
    
    // Update scroll position during workout
    updateCurrentScrollPosition()
    
    // Mark as having unsaved changes and save immediately
    hasUnsavedChanges.value = true
    if (!isSaving.value) {
      saveSessionChanges()
    }
    return
  }
  
  // Otherwise, just remove the set
  exercise.sets.splice(setIndex, 1)
  
  // Update scroll position during workout
  updateCurrentScrollPosition()
  
  // Mark as having unsaved changes and save immediately
  hasUnsavedChanges.value = true
  if (!isSaving.value) {
    saveSessionChanges()
  }
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

const getExerciseMuscleGroups = (exerciseId: string): string[] => {
  const exerciseData = workoutData.getExerciseById.value(exerciseId)
  return exerciseData?.muscleGroups || []
}

const getMuscleGroupColor = (muscleGroupName: string): string => {
  // Import muscle groups data
  const muscleGroupsData = {
    "muscleGroups": [
      {
        "id": "bryst",
        "name": "Bryst",
        "displayName": "Bryst",
        "description": "Brystmuskulatur inkludert pectoralis major og minor",
        "color": "#f97316"
      },
      {
        "id": "rygg",
        "name": "Rygg",
        "displayName": "Rygg",
        "description": "Ryggmuskulatur inkludert latissimus dorsi, rhomboids og trapezius",
        "color": "#3b82f6"
      },
      {
        "id": "ben",
        "name": "Ben",
        "displayName": "Ben",
        "description": "Bekkemuskulatur inkludert quadriceps, hamstrings og glutes",
        "color": "#10b981"
      },
      {
        "id": "skuldre",
        "name": "Skuldre",
        "displayName": "Skuldre",
        "description": "Skuldermuskulatur inkludert deltoids",
        "color": "#8b5cf6"
      },
      {
        "id": "biceps",
        "name": "Biceps",
        "displayName": "Biceps",
        "color": "#f59e0b"
      },
      {
        "id": "triceps",
        "name": "Triceps",
        "displayName": "Triceps",
        "color": "#ec4899"
      },
      {
        "id": "kjerne",
        "name": "Kjerne",
        "displayName": "Kjerne",
        "description": "Kjerne- og mage-muskulatur inkludert abs og obliques",
        "color": "#ef4444"
      }
    ]
  }
  
  // Find the muscle group by name and return its color
  const muscleGroup = muscleGroupsData.muscleGroups.find(mg => 
    mg.name.toLowerCase() === muscleGroupName.toLowerCase() ||
    mg.displayName.toLowerCase() === muscleGroupName.toLowerCase()
  )
  
  return muscleGroup?.color || '#6b7280' // Default gray color if not found
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
  const incompleteExercises = session.value?.exercises.filter(exercise => 
    !exercise.sets.some(set => set.isCompleted)
  ) || []
  
  const incompleteSets = session.value?.exercises.reduce((total, exercise) => 
    total + exercise.sets.filter(set => !set.isCompleted).length, 0
  ) || 0
  
  let message = 'Er du sikker på at du vil fullføre økten?'
  
  if (incompleteExercises.length > 0 || incompleteSets > 0) {
    message += `\n\nMerk: ${incompleteExercises.length} ufullførte øvelser og ${incompleteSets} ufullførte sett vil bli fjernet fra økten før den lagres.`
  }
  
  if (confirm(message)) {
    completeWorkout()
  }
}

const handleAbandonWorkout = () => {
  const incompleteExercises = session.value?.exercises.filter(exercise => 
    !exercise.sets.some(set => set.isCompleted)
  ) || []
  
  const incompleteSets = session.value?.exercises.reduce((total, exercise) => 
    total + exercise.sets.filter(set => !set.isCompleted).length, 0
  ) || 0
  
  let message = 'Er du sikker på at du vil avbryte denne økten? Dette kan ikke angres og økten vil slettes permanent.'
  
  if (incompleteExercises.length > 0 || incompleteSets > 0) {
    message += `\n\nMerk: ${incompleteExercises.length} ufullførte øvelser og ${incompleteSets} ufullførte sett vil bli fjernet fra økten før den slettes.`
  }
  
  if (confirm(message)) {
    abandonWorkout()
  }
}

const abandonWorkout = async () => {
  if (!session.value) return
  
  try {
    // Clean up session data before abandoning to avoid storing unnecessary 0-values
    const cleanedSession = await cleanupSessionData(session.value)
    
    // Update the session with cleaned data before abandoning
    await workoutData.updateWorkoutSessionOffline(session.value.id, {
      exercises: cleanedSession.exercises
    })
    
    // Clear scroll position since workout is abandoned
    clearScrollPosition()
    
    // Now abandon the workout with clean data
    await workoutData.abandonWorkoutSession(session.value.id)
    router.push('/')
  } catch (error: any) {
    console.error("❌ Error abandoning workout:", error)
    
    // Check if it's an authentication error
    if (error.message && (
      error.message.includes("not authenticated") || 
      error.message.includes("Session expired") ||
      error.message.includes("Please log in again")
    )) {
      // Show a more user-friendly message
      alert("Din sesjon har utløpt. Du vil bli sendt til innloggingssiden.")
      
      // Redirect to login
      router.push('/login')
      return
    }
    
    // Handle other errors
    handleAuthError(error)
  }
}

const completeWorkout = async () => {
  if (!session.value) return
  
  try {
    // Clean up session data before completing to avoid storing unnecessary 0-values
    const cleanedSession = await cleanupSessionData(session.value)
    
    // Update the session with cleaned data
    await workoutData.updateWorkoutSessionOffline(session.value.id, {
      exercises: cleanedSession.exercises
    })
    
    // Clear scroll position since workout is completed
    clearScrollPosition()
    
    // Now complete the workout with clean data
    await workoutData.completeWorkoutSession(session.value.id)
    router.push(`/session/${session.value.id}`)
  } catch (error: any) {
    console.error("❌ Error completing workout:", error)
    
    // Check if it's an authentication error
    if (error.message && (
      error.message.includes("not authenticated") || 
      error.message.includes("Session expired") ||
      error.message.includes("Please log in again")
    )) {
      // Show a more user-friendly message
      alert("Din sesjon har utløpt. Du vil bli sendt til innloggingssiden.")
      
      // Redirect to login
      router.push('/login')
      return
    }
    
    // Handle other errors
    handleAuthError(error)
  }
}

// Helper function to clean up session data before completion
const cleanupSessionData = async (sessionData: WorkoutSession): Promise<WorkoutSession> => {
  console.log('🧹 Cleaning up session data before completion...')
  
  // Create a deep copy to avoid mutating the original
  const cleanedSession = JSON.parse(JSON.stringify(sessionData))
  
  // Filter out exercises that have no completed sets
  const originalExerciseCount = cleanedSession.exercises.length
  cleanedSession.exercises = cleanedSession.exercises.filter((exercise: any) => {
    const hasCompletedSets = exercise.sets.some((set: any) => set.isCompleted)
    if (!hasCompletedSets) {
      console.log(`🧹 Removing exercise "${exercise.name}" - no completed sets`)
    }
    return hasCompletedSets
  })
  
  // For each remaining exercise, filter out incomplete sets
  let totalSetsRemoved = 0
  cleanedSession.exercises.forEach((exercise: any) => {
    const originalSetCount = exercise.sets.length
    exercise.sets = exercise.sets.filter((set: any) => {
      const isComplete = set.isCompleted && set.weight > 0 && set.reps > 0
      if (!isComplete) {
        console.log(`🧹 Removing incomplete set from "${exercise.name}" - weight: ${set.weight}, reps: ${set.reps}`)
        totalSetsRemoved++
      }
      return isComplete
    })
    
    if (exercise.sets.length === 0) {
      console.log(`🧹 Exercise "${exercise.name}" now has no sets after cleanup, will be removed`)
    }
  })
  
  // Remove exercises that ended up with no sets after cleanup
  cleanedSession.exercises = cleanedSession.exercises.filter((exercise: any) => exercise.sets.length > 0)
  
  console.log('🧹 Session cleaned up:', {
    originalExercises: originalExerciseCount,
    cleanedExercises: cleanedSession.exercises.length,
    totalSetsRemoved,
    exercisesRemoved: originalExerciseCount - cleanedSession.exercises.length
  })
  
  return cleanedSession
}

// Scroll position management methods
const saveScrollPosition = () => {
  try {
    if (!shouldRestoreScroll.value) return
    
    const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop
    if (scrollY > 0) {
      localStorage.setItem(scrollPositionKey.value, scrollY.toString())
      console.log('📱 Saved scroll position:', scrollY)
    }
  } catch (error) {
    console.warn('⚠️ Failed to save scroll position:', error)
  }
}

const restoreScrollPosition = () => {
  try {
    const savedPosition = localStorage.getItem(scrollPositionKey.value)
    if (savedPosition && shouldRestoreScroll.value) {
      const scrollY = parseInt(savedPosition, 10)
      if (scrollY > 0) {
        console.log('📱 Attempting to restore scroll position:', scrollY)
        
        // Use nextTick to ensure DOM is fully rendered
        nextTick(() => {
          // Small delay to ensure everything is rendered and stable
          setTimeout(() => {
            try {
              window.scrollTo({ top: scrollY, behavior: 'auto' })
              console.log('📱 Successfully restored scroll position to:', scrollY)
            } catch (error) {
              console.warn('⚠️ Failed to restore scroll position:', error)
            }
          }, 150) // Increased delay for better reliability
        })
      }
    } else {
      console.log('📱 No scroll position to restore or restoration disabled')
    }
  } catch (error) {
    console.warn('⚠️ Failed to restore scroll position:', error)
  }
}

const clearScrollPosition = () => {
  try {
    localStorage.removeItem(scrollPositionKey.value)
    console.log('📱 Cleared scroll position for session:', route.params.id)
  } catch (error) {
    console.warn('⚠️ Failed to clear scroll position:', error)
  }
}

// Update scroll position during workout (called when exercises are modified)
const updateCurrentScrollPosition = () => {
  try {
    if (shouldRestoreScroll.value) {
      const currentScrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop
      if (currentScrollY > 0) {
        localStorage.setItem(scrollPositionKey.value, currentScrollY.toString())
        console.log('📱 Updated scroll position during workout:', currentScrollY)
      }
    }
  } catch (error) {
    console.warn('⚠️ Failed to update scroll position:', error)
  }
}

// Handle app state changes (important for PWA)
const handleAppStateChange = () => {
  if (document.visibilityState === 'visible' && shouldRestoreScroll.value) {
    // App became visible again, restore scroll position
    console.log('📱 App became visible, restoring scroll position')
    setTimeout(() => {
      restoreScrollPosition()
    }, 300) // Longer delay for PWA state changes
  }
}

// Debug method for testing scroll position functionality
const debugScrollPosition = () => {
  const currentScroll = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop
  const storedPosition = localStorage.getItem(scrollPositionKey.value)
  
  console.log('📱 Scroll Position Debug:', {
    currentScroll,
    storedPosition: storedPosition ? parseInt(storedPosition, 10) : null,
    shouldRestoreScroll: shouldRestoreScroll.value,
    scrollPositionKey: scrollPositionKey.value
  })
  
  alert(`Current scroll: ${currentScroll}px\nStored position: ${storedPosition || 'none'}px\nRestore enabled: ${shouldRestoreScroll.value}`)
}

// Computed property for development mode check
const isDevelopment = computed(() => import.meta.env.DEV)

// Lifecycle
onMounted(async () => {
  const sessionId = route.params.id as string
  
  // Check if we should restore scroll position (returning to same session)
  const hasStoredPosition = localStorage.getItem(scrollPositionKey.value)
  shouldRestoreScroll.value = !!hasStoredPosition
  
  console.log('📱 WorkoutSession mounted:', {
    sessionId,
    hasStoredPosition,
    shouldRestoreScroll: shouldRestoreScroll.value,
    storedPosition: hasStoredPosition ? parseInt(hasStoredPosition, 10) : null
  })
  
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
        
        // Restore scroll position after session is loaded
        if (shouldRestoreScroll.value) {
          restoreScrollPosition()
        }
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
  
  // Restore scroll position after session is loaded
  if (shouldRestoreScroll.value) {
    restoreScrollPosition()
  }
  
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

  // Watch for changes in pending changes count and update App.vue
  watch(pendingChangesCount, (newCount) => {
    const updateEvent = new CustomEvent('updatePendingChangesCount', {
      detail: { pendingChangesCount: newCount }
    })
    window.dispatchEvent(updateEvent)
  })

  // Update pending changes count on mount
  await updatePendingChangesCount()
  
  // Add beforeunload listener to warn about unsaved changes
  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (hasUnsavedChanges.value) {
      event.preventDefault()
      event.returnValue = 'Er du sikker på at du vil forlate siden?'
      return 'Er du sikker på at du vil forlate siden?'
    }
  }
  
  // Add visibility change listener to save scroll position when app goes to background
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      saveScrollPosition()
    }
  }
  
  // Add page focus listener to handle PWA focus events
  const handlePageFocus = () => {
    // When page regains focus, check if we should restore scroll
    if (document.visibilityState === 'visible' && shouldRestoreScroll.value) {
      // Small delay to ensure everything is stable
      setTimeout(() => {
        restoreScrollPosition()
      }, 200)
    }
  }
  
  // Add scroll listener to continuously track position during workout
  const handleScroll = () => {
    // Debounce scroll updates to avoid excessive localStorage writes
    if (scrollUpdateTimeout.value) {
      clearTimeout(scrollUpdateTimeout.value)
    }
    
    scrollUpdateTimeout.value = setTimeout(() => {
      updateCurrentScrollPosition()
    }, 100) // Update scroll position 100ms after scrolling stops
  }
  
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('saveWorkoutSession', handleSaveEvent as EventListener)
  window.addEventListener('beforeunload', handleBeforeUnload)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('focus', handlePageFocus)
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('appstatechange', handleAppStateChange) // Add this listener
  
  // Cleanup on unmount
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
    window.removeEventListener('saveWorkoutSession', handleSaveEvent as EventListener)
    window.removeEventListener('beforeunload', handleBeforeUnload)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('focus', handlePageFocus)
    window.removeEventListener('scroll', handleScroll)
    window.removeEventListener('appstatechange', handleAppStateChange) // Remove this listener
    
    // Clear any pending scroll update timeout
    if (scrollUpdateTimeout.value) {
      clearTimeout(scrollUpdateTimeout.value)
    }
    
    // Save scroll position before unmounting
    saveScrollPosition()
  })
})

// Watch for route changes to warn about unsaved changes
watch(() => route.params.id, async (newId, oldId) => {
  if (newId && newId !== oldId) {
    // Save scroll position before navigating away
    if (oldId && shouldRestoreScroll.value) {
      saveScrollPosition()
    }
    
    // Check if there are unsaved changes before navigating away
    if (hasUnsavedChanges.value) {
      const shouldLeave = confirm('Vil du lagre endringene først?')
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
      
      // Check if we should restore scroll position for new session
      const hasStoredPosition = localStorage.getItem(scrollPositionKey.value)
      shouldRestoreScroll.value = !!hasStoredPosition
      
      // Restore scroll position for new session if available
      if (shouldRestoreScroll.value) {
        restoreScrollPosition()
      }
    }
  }
})


</script> 