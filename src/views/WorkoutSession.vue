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

      <!-- Remove Local changes indicator -->
      <!-- Remove Manual save button -->

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
                  <span class="whitespace-nowrap overflow-hidden text-ellipsis">Sist: {{ getLastPerformance(exercise.exerciseId)?.reps }} reps × {{ getLastPerformance(exercise.exerciseId)?.weight }}kg • {{ getLastPerformance(exercise.exerciseId)?.date ? formatDate(getLastPerformance(exercise.exerciseId)!.date) : '' }}</span>
                </div>
              </div>
            
            <!-- Right Column: Actions -->
            <div class="flex items-center gap-3 ml-4">
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
                    :placeholder="getLastPerformance(exercise.exerciseId)?.reps?.toString() || '0'"
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
                    :placeholder="getLastPerformance(exercise.exerciseId)?.weight?.toString() || '0'"
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
       
                 <!-- Save and Complete Buttons -->
          <div class="mt-6 space-y-3">
            <!-- Complete Button -->
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
import * as muscleGroupsData from '@/data/muscle-groups.json'

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
  return workoutData.getWorkoutType(typeId)
}

const getWorkoutTypeColor = (typeId: string): string => {
  return workoutData.getWorkoutTypeColor(typeId)
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
  
  // Save to local storage instead of making API calls
  saveToLocalStorage(exerciseIndex, setIndex)
}

// saveSessionChanges function removed - replaced with local storage solution

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
  
  // Save to local storage instead of making API calls
  saveToLocalStorage(exerciseIndex, exercise.sets.length - 1)
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
  
  // Save to local storage instead of making API calls
  if (session.value) {
    const sessionId = session.value.id
    const key = getLocalStorageKey(sessionId)
    
    try {
      const existingData = JSON.parse(localStorage.getItem(key) || '{}')
      existingData.exercises = [...session.value.exercises]
      existingData.lastUpdated = Date.now()
      existingData.sessionId = sessionId
      
      localStorage.setItem(key, JSON.stringify(existingData))
      hasUnsavedChanges.value = true;
      console.log('💾 Saved new exercise to local storage');
    } catch (error) {
      console.error('❌ Error saving new exercise to local storage:', error);
      hasUnsavedChanges.value = true;
    }
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
  
  // Save to local storage instead of making API calls
  if (session.value) {
    const sessionId = session.value.id
    const key = getLocalStorageKey(sessionId)
    
    try {
      const existingData = JSON.parse(localStorage.getItem(key) || '{}')
      existingData.exercises = [...session.value.exercises]
      existingData.lastUpdated = Date.now()
      existingData.sessionId = sessionId
      
      localStorage.setItem(key, JSON.stringify(existingData))
      hasUnsavedChanges.value = true;
      console.log('💾 Saved exercise removal to local storage');
    } catch (error) {
      console.error('❌ Error saving exercise removal to local storage:', error);
      hasUnsavedChanges.value = true;
    }
  }
}

const removeSet = (exerciseIndex: number, setIndex: number) => {
  if (!session.value) return
  
  const exercise = session.value.exercises[exerciseIndex]
  
  // Show confirmation dialog before removing
  const confirmMessage = exercise.sets.length <= 1 
    ? `Dette er det siste settet for "${exercise.name}". Øvelsen vil bli fjernet fra økten. Er du sikker?`
    : `Er du sikker på at du vil fjerne sett ${setIndex + 1} fra "${exercise.name}"?`
  
  if (!confirm(confirmMessage)) {
    return
  }
  
  // If this is the last set of the exercise, remove the entire exercise
  if (exercise.sets.length <= 1) {
    session.value.exercises.splice(exerciseIndex, 1)
    
    // Save to local storage instead of making API calls
    // Note: We'll save the entire session since we added a new exercise
    if (session.value) {
      const sessionId = session.value.id
      const key = getLocalStorageKey(sessionId)
      
      try {
        const existingData = JSON.parse(localStorage.getItem(key) || '{}')
        existingData.exercises = [...session.value.exercises]
        existingData.lastUpdated = Date.now()
        existingData.sessionId = sessionId
        
        localStorage.setItem(key, JSON.stringify(existingData))
        hasUnsavedChanges.value = true;
        console.log('💾 Saved new exercise to local storage');
      } catch (error) {
        console.error('❌ Error saving new exercise to local storage:', error);
        hasUnsavedChanges.value = true;
      }
    }
    return
  }
  
  // Otherwise, just remove the set
  exercise.sets.splice(setIndex, 1)
  
  // Save to local storage instead of making API calls
  saveToLocalStorage(exerciseIndex, 0) // Save the first set to update the exercise structure
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
  const exerciseData = workoutData.getExerciseById(exerciseId)
  return exerciseData?.muscleGroups || []
}

const getMuscleGroupColor = (muscleGroupName: string): string => {
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
    // Get all local changes first
    const sessionId = session.value.id
    const localChanges = getLocalChanges(sessionId)
    
    // Clean up session data before abandoning to avoid storing unnecessary 0-values
    const cleanedSession = await cleanupSessionData(session.value)
    
    // If we have local changes, merge them with the cleaned session
    if (localChanges && localChanges.exercises) {
      console.log('🔄 Merging local changes before abandoning workout')
      
      // Merge local changes with cleaned data
      const mergedExercises = cleanedSession.exercises.map((exercise, exerciseIndex) => {
        const localExercise = localChanges.exercises[exerciseIndex]
        if (localExercise && localExercise.sets) {
          return {
            ...exercise,
            sets: exercise.sets.map((set, setIndex) => {
              const localSet = localExercise.sets[setIndex]
              if (localSet) {
                return {
                  ...set,
                  weight: localSet.weight || set.weight,
                  reps: localSet.reps || set.reps,
                  isCompleted: localSet.isCompleted || set.isCompleted
                }
              }
              return set
            })
          }
        }
        return exercise
      })
      
      // Update the session with merged data before abandoning
      await workoutData.updateWorkoutSessionOffline(sessionId, {
        exercises: mergedExercises
      })
      
      console.log('✅ Local changes merged before abandoning workout')
    } else {
      // No local changes, just update with cleaned data
      await workoutData.updateWorkoutSessionOffline(sessionId, {
      exercises: cleanedSession.exercises
    })
    }
    
    // Now abandon the workout
    await workoutData.abandonWorkoutSession(sessionId)
    
    // Clear local changes after successful abandonment
    clearLocalChanges(sessionId)
    
    console.log('✅ Workout abandoned and synced successfully')
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
    // Get all local changes first
    const sessionId = session.value.id
    const localChanges = getLocalChanges(sessionId)
    
    // Clean up session data before completing to avoid storing unnecessary 0-values
    const cleanedSession = await cleanupSessionData(session.value)
    
    // If we have local changes, merge them with the cleaned session
    if (localChanges && localChanges.exercises) {
      console.log('🔄 Merging local changes with cleaned session data')
      
      // Merge local changes with cleaned data
      const mergedExercises = cleanedSession.exercises.map((exercise, exerciseIndex) => {
        const localExercise = localChanges.exercises[exerciseIndex]
        if (localExercise && localExercise.sets) {
          return {
            ...exercise,
            sets: exercise.sets.map((set, setIndex) => {
              const localSet = localExercise.sets[setIndex]
              if (localSet) {
                return {
                  ...set,
                  weight: localSet.weight || set.weight,
                  reps: localSet.reps || set.reps,
                  isCompleted: localSet.isCompleted || set.isCompleted
                }
              }
              return set
            })
          }
        }
        return exercise
      })
      
      // Update the session with merged data
      await workoutData.updateWorkoutSessionOffline(sessionId, {
        exercises: mergedExercises
      })
      
      console.log('✅ Local changes merged and synced with Supabase')
    } else {
      // No local changes, just update with cleaned data
      await workoutData.updateWorkoutSessionOffline(sessionId, {
      exercises: cleanedSession.exercises
    })
    }
    
    // Now complete the workout
    await workoutData.completeWorkoutSession(sessionId)
    
    // Clear local changes after successful completion
    clearLocalChanges(sessionId)
    
    console.log('✅ Workout completed and synced successfully')
    router.push(`/session/${sessionId}`)
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

// ===== LOCAL STORAGE SOLUTION =====
// These functions replace the excessive API calls with local storage

const getLocalStorageInfo = () => {
  try {
    const keys = Object.keys(localStorage);
    const workoutKeys = keys.filter(key => key.startsWith('workout-session-'));
    
    if (workoutKeys.length === 0) return '';
    
    const totalSize = workoutKeys.reduce((total, key) => {
      try {
        const data = localStorage.getItem(key);
        return total + (data ? new Blob([data]).size : 0);
      } catch {
        return total;
      }
    }, 0);
    
    return `(${(totalSize / 1024).toFixed(1)} KB)`;
  } catch {
    return '';
  }
};

const getLocalStorageKey = (sessionId: string) => `workout-session-${sessionId}`;

const saveToLocalStorage = (exerciseIndex: number, setIndex: number) => {
  if (!session.value) return;
  
  // Check if localStorage is available
  if (!isLocalStorageAvailable()) {
    console.warn('⚠️ localStorage not available, falling back to memory-only mode');
    hasUnsavedChanges.value = true;
    return;
  }
  
  const sessionId = session.value.id;
  const key = getLocalStorageKey(sessionId);
  
  try {
    // Get existing data or create new
    const existingData = JSON.parse(localStorage.getItem(key) || '{}');
    
    // Initialize structure if it doesn't exist
    if (!existingData.exercises) {
      existingData.exercises = [...session.value.exercises];
    }
    
    // Ensure exercise exists
    if (!existingData.exercises[exerciseIndex]) {
      existingData.exercises[exerciseIndex] = { ...session.value.exercises[exerciseIndex] };
    }
    
    // Ensure sets array exists
    if (!existingData.exercises[exerciseIndex].sets) {
      existingData.exercises[exerciseIndex].sets = [...session.value.exercises[exerciseIndex].sets];
    }
    
    // Update only the specific set
    existingData.exercises[exerciseIndex].sets[setIndex] = {
      ...session.value.exercises[exerciseIndex].sets[setIndex]
    };
    
    // Add metadata
    existingData.lastUpdated = Date.now();
    existingData.sessionId = sessionId;
    
    // Check storage size before saving
    const dataSize = new Blob([JSON.stringify(existingData)]).size;
    const maxSize = 5 * 1024 * 1024; // 5MB limit
    
    if (dataSize > maxSize) {
      console.warn('⚠️ Local data too large, clearing old data');
      clearOldWorkoutData();
    }
    
    // Save to localStorage
    localStorage.setItem(key, JSON.stringify(existingData));
    
    // Mark as having unsaved changes
    hasUnsavedChanges.value = true;
    
    console.log('💾 Saved to local storage:', { exerciseIndex, setIndex, key });
    
  } catch (error) {
    console.error('❌ Error saving to local storage:', error);
    // Fallback to memory-only mode if localStorage fails
    hasUnsavedChanges.value = true;
  }
};

const isLocalStorageAvailable = () => {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

const clearOldWorkoutData = () => {
  try {
    const keys = Object.keys(localStorage);
    const workoutKeys = keys.filter(key => key.startsWith('workout-session-'));
    
    // Sort by last updated and keep only the 5 most recent
    const workoutData = workoutKeys.map(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        return { key, lastUpdated: data.lastUpdated || 0 };
      } catch {
        return { key, lastUpdated: 0 };
      }
    });
    
    workoutData.sort((a, b) => b.lastUpdated - a.lastUpdated);
    
    // Remove old workout data (keep only 5 sessions in local storage at the time)
    workoutData.slice(5).forEach(({ key }) => {
      localStorage.removeItem(key);
      console.log('🗑️ Removed old workout data:', key);
    });
    
    // Log storage usage for debugging
    const totalSize = workoutKeys.reduce((total, key) => {
      try {
        const data = localStorage.getItem(key);
        return total + (data ? new Blob([data]).size : 0);
      } catch {
        return total;
      }
    }, 0);
    
    console.log(`💾 Local storage usage: ${(totalSize / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error('❌ Error clearing old workout data:', error);
  }
};

const getLocalChanges = (sessionId: string) => {
  try {
    const key = getLocalStorageKey(sessionId);
    const localData = localStorage.getItem(key);
    
    if (localData) {
      return JSON.parse(localData);
    }
  } catch (error) {
    console.error('❌ Error reading local changes:', error);
  }
  
  return null;
};

const clearLocalChanges = (sessionId: string) => {
  try {
    const key = getLocalStorageKey(sessionId);
    localStorage.removeItem(key);
    console.log('🗑️ Cleared local changes for session:', sessionId);
  } catch (error) {
    console.error('❌ Error clearing local changes:', error);
  }
};

const restoreLocalChanges = async () => {
  if (!session.value) return;
  
  try {
    const sessionId = session.value.id;
    const localChanges = getLocalChanges(sessionId);
    
    if (localChanges && localChanges.exercises) {
      console.log('🔄 Restoring local changes for session:', sessionId);
      
      // Merge local changes with current session
      session.value.exercises = session.value.exercises.map((exercise, exerciseIndex) => {
        const localExercise = localChanges.exercises[exerciseIndex];
        if (localExercise && localExercise.sets) {
          return {
            ...exercise,
            sets: exercise.sets.map((set, setIndex) => {
              const localSet = localExercise.sets[setIndex];
              if (localSet) {
                return {
                  ...set,
                  weight: localSet.weight || set.weight,
                  reps: localSet.reps || set.reps,
                  isCompleted: localSet.isCompleted || set.isCompleted
                };
              }
              return set;
            })
          };
        }
        return exercise;
      });
      
      // Mark as having unsaved changes since we restored local data
      hasUnsavedChanges.value = true;
      
      console.log('✅ Local changes restored successfully');
    }
  } catch (error) {
    console.error('❌ Error restoring local changes:', error);
  }
};

// Handle offline sync when coming back online
const handleOnlineSync = async () => {
  if (!session.value || !workoutData.isOnline.value) return;
  
  try {
    const sessionId = session.value.id;
    const localChanges = getLocalChanges(sessionId);
    
    if (localChanges && localChanges.exercises && hasUnsavedChanges.value) {
      console.log('🌐 Back online - syncing local changes automatically');
      
      // Auto-sync when coming back online
      await syncLocalChangesToSupabase();
    }
  } catch (error) {
    console.error('❌ Error in automatic online sync:', error);
  }
};

// ===== END LOCAL STORAGE SOLUTION =====

// Manual sync function for Ctrl+S or manual save
const syncLocalChangesToSupabase = async () => {
  if (!session.value || !hasUnsavedChanges.value || isSaving.value) return;
  
  console.log('💾 Manually syncing local changes to Supabase...');
  isSaving.value = true;
  
  try {
    const sessionId = session.value.id;
    const localChanges = getLocalChanges(sessionId);
    
    if (localChanges && localChanges.exercises) {
      console.log('🔄 Syncing local changes to Supabase');
      
      // Merge local changes with current session data
      const mergedExercises = session.value.exercises.map((exercise, exerciseIndex) => {
        const localExercise = localChanges.exercises[exerciseIndex];
        if (localExercise && localExercise.sets) {
          return {
            ...exercise,
            sets: exercise.sets.map((set, setIndex) => {
              const localSet = localExercise.sets[setIndex];
              if (localSet) {
                return {
                  ...set,
                  weight: localSet.weight || set.weight,
                  reps: localSet.reps || set.reps,
                  isCompleted: localSet.isCompleted || set.isCompleted
                };
              }
              return set;
            })
          };
        }
        return exercise;
      });
      
      // Update in Supabase
      await workoutData.updateWorkoutSessionOffline(sessionId, {
        exercises: mergedExercises
      });
      
      // Clear local changes after successful sync
      clearLocalChanges(sessionId);
      hasUnsavedChanges.value = false;
      
      console.log('✅ Local changes synced to Supabase successfully');
    } else {
      console.log('ℹ️ No local changes to sync');
      hasUnsavedChanges.value = false;
    }
  } catch (error: any) {
    console.error('❌ Error syncing local changes:', error);
    
    // Check if it's an authentication error
    if (error.message && (
      error.message.includes("not authenticated") || 
      error.message.includes("Session expired") ||
      error.message.includes("Please log in again")
    )) {
      console.log("🔄 Authentication error detected in syncLocalChangesToSupabase");
      alert("Din sesjon har utløpt. Du vil bli sendt til innloggingssiden.");
      router.push('/login');
      return;
    }
    
    // Keep the unsaved changes flag so user can retry
  } finally {
    isSaving.value = false;
    console.log('💾 Manual sync operation completed');
  }
};

// Computed property for development mode check
const isDevelopment = computed(() => import.meta.env.DEV)

// Scroll position persistence - only for this component, doesn't affect route navigation
const saveScrollPosition = () => {
  if (!session.value) return
  
  const scrollPosition = window.scrollY || window.pageYOffset || document.documentElement.scrollTop
  const sessionId = session.value.id
  
  // Save to sessionStorage (survives page reloads)
  sessionStorage.setItem(`workout-scroll-${sessionId}`, scrollPosition.toString())
  
  // Also save to localStorage as backup
  localStorage.setItem(`workout-scroll-${sessionId}`, scrollPosition.toString())
  
  console.log('💾 Saved scroll position:', { sessionId, scrollPosition })
}

const restoreScrollPosition = () => {
  if (!session.value) return
  
  const sessionId = session.value.id
  
  // Try sessionStorage first, then localStorage as fallback
  const savedPosition = sessionStorage.getItem(`workout-scroll-${sessionId}`) || 
                       localStorage.getItem(`workout-scroll-${sessionId}`)
  
  if (savedPosition) {
    const position = parseInt(savedPosition)
    console.log('🔄 Restoring scroll position:', { sessionId, position })
    
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      window.scrollTo(0, position)
      console.log('✅ Scroll position restored to:', position)
    })
  }
}

// Lifecycle
onMounted(async () => {
  const sessionId = route.params.id as string
  
  // Check if we're on mobile/PWA
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  const isPWA = window.matchMedia('(display-mode: standalone)').matches
  
  console.log('📱 WorkoutSession mounted:', {
    sessionId,
    isMobile,
    isPWA
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
  
  const foundSession = workoutData.getSessionById(sessionId)
  
  if (!foundSession) {
    // Try to load data again if session not found
    try {
      await workoutData.loadData()
      const retrySession = workoutData.getSessionById(sessionId)
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
  
  // Restore local changes if they exist
  await restoreLocalChanges()
  
  // Add keyboard shortcut for saving (Ctrl+S)
  const handleKeydown = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault()
      if (hasUnsavedChanges.value && !isSaving.value) {
        syncLocalChangesToSupabase()
      }
    }
  }
  
  // Listen for save event from App.vue
  const handleSaveEvent = (event: CustomEvent) => {
    if (event.detail.sessionId === session.value?.id && hasUnsavedChanges.value && !isSaving.value) {
      syncLocalChangesToSupabase()
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
  
  // Clean up old local storage data periodically
  // setInterval(() => {
  //   clearOldWorkoutData()
  // }, 5 * 60 * 1000) // Every 5 minutes
  
  // Listen for network status changes to auto-sync when coming back online
  const handleNetworkChange = () => {
    if (workoutData.isOnline.value && hasUnsavedChanges.value) {
      console.log('🌐 Network back online - checking for local changes to sync');
      // Small delay to ensure network is stable
      setTimeout(() => {
        if (workoutData.isOnline.value) {
          handleOnlineSync();
        }
      }, 2000);
    }
  };
  
  window.addEventListener('online', handleNetworkChange);
  
  // Save scroll position when user scrolls (only affects this component)
  const handleScroll = () => {
    saveScrollPosition()
  }
  
  // Add scroll event listener
  window.addEventListener('scroll', handleScroll)
  
  // Restore scroll position after a short delay to ensure DOM is ready
  setTimeout(() => {
    restoreScrollPosition()
  }, 300)
  
  // Also restore scroll position when the page becomes visible (handles service worker reloads)
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      console.log('👁️ Page became visible, restoring scroll position')
      setTimeout(() => {
        restoreScrollPosition()
      }, 100)
    }
  }
  
  document.addEventListener('visibilitychange', handleVisibilityChange)
  
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
  window.addEventListener('scroll', handleScroll)
  
  // Cleanup on unmount
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
    window.removeEventListener('saveWorkoutSession', handleSaveEvent as EventListener)
    window.removeEventListener('beforeunload', handleBeforeUnload)
    window.removeEventListener('scroll', handleScroll)
    window.removeEventListener('online', handleNetworkChange)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })

  // Clear old workout data every 5 minutes
    clearOldWorkoutData();
})

// Watch for route changes to warn about unsaved changes
watch(() => route.params.id, async (newId, oldId) => {
  // Only handle actual route changes, not when returning to the same session
  if (newId && oldId && newId !== oldId) {
    // Check if there are unsaved changes before navigating away
    if (hasUnsavedChanges.value) {
      const shouldLeave = confirm('Vil du lagre endringene først?')
      if (shouldLeave) {
        await syncLocalChangesToSupabase()
      }
    }
    
    // Load new session
    const foundSession = workoutData.getSessionById(newId as string)
    if (foundSession) {
      session.value = foundSession
      startTime.value = new Date(foundSession.date)
      hasUnsavedChanges.value = false // Reset for new session
    }
  }
})
</script> 