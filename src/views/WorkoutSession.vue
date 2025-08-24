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
              <!-- Muscle Groups -->
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
              
              <!-- Last Performance -->
              <div v-if="getLastPerformance(exercise.exerciseId)" class="flex items-center gap-2 text-sm text-dark-300">
                <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span class="whitespace-nowrap overflow-hidden text-ellipsis">
                  Sist: {{ getLastPerformance(exercise.exerciseId)?.reps }} reps × {{ getLastPerformance(exercise.exerciseId)?.weight }}kg • {{ getLastPerformance(exercise.exerciseId)?.date ? formatDate(getLastPerformance(exercise.exerciseId)!.date) : '' }}
                </span>
              </div>
            </div>
            
            <!-- Right Column: Actions -->
            <div class="flex items-center gap-3 ml-4">
              <button 
                @mousedown.prevent
                @touchstart.prevent
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
            <!-- Animate add/remove of sets -->
            <TransitionGroup
              name="set"
              tag="div"
              enter-active-class="transition duration-200 ease-out"
              leave-active-class="transition duration-200 ease-in"
            >
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
                      type="text"
                      inputmode="numeric"
                      pattern="[0-9]*"
                      min="0"
                      required
                      class="input-field w-full text-sm py-3 bg-dark-700 border-dark-600 focus:border-primary-500"
                      :placeholder="getLastPerformance(exercise.exerciseId)?.reps?.toString() || '0'"
                      :data-exercise-index="exerciseIndex"
                      :data-set-index="setIndex"
                      :ref="el => registerInputRef(exerciseIndex, setIndex, 'reps', el as HTMLInputElement)"
                      @focus="markFocus"
                      @input="(event) => handleRepsInput(event, exerciseIndex, setIndex)"
                      @blur="(event) => handleRepsBlur(event, exerciseIndex, setIndex)"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-dark-300 mb-3">Vekt (kg)</label>
                    <input
                      :value="set.weight === 0 ? '' : set.weight"
                      type="text"
                      inputmode="decimal"
                      pattern="^[0-9]+([\\.,][0-9]{1,2})?$"
                      min="0"
                      step="0.5"
                      required
                      class="input-field w-full text-sm py-3 bg-dark-700 border-dark-600 focus:border-primary-500"
                      :placeholder="getLastPerformance(exercise.exerciseId)?.weight?.toString() || '0'"
                      :data-exercise-index="exerciseIndex"
                      :data-set-index="setIndex"
                      :ref="el => registerInputRef(exerciseIndex, setIndex, 'weight', el as HTMLInputElement)"
                      @focus="markFocus"
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
            </TransitionGroup>

            <!-- Add Set Button -->
            <div class="p-5 border-t border-dark-600">
              <button
                @click="addSet(exerciseIndex)"
                tabindex="-1"
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
  const allExercises = workoutData.getFlattenedExercises.value
  const available = allExercises.filter(exercise => !existingExerciseIds.includes(exercise.id))

  return available
})

// Pending changes functionality
const pendingChangesCount = ref(0)

const updatePendingChangesCount = async () => {
  pendingChangesCount.value = 0
}

const syncPendingChanges = async () => {
  if (!workoutData.isOnline.value) return

  isSyncingPendingChanges.value = true
  try {
    await workoutData.syncPendingChanges()
    await updatePendingChangesCount()
  } catch (error) {
    console.error('❌ Error syncing pending changes:', error)
  } finally {
    isSyncingPendingChanges.value = false
  }
}

// === Input focus helpers ===
type Field = 'reps' | 'weight'
const inputRefs = new Map<string, HTMLInputElement>()
const keyOf = (ex: number, set: number, field: Field) => `${ex}-${set}-${field}`

function registerInputRef(ex: number, set: number, field: Field, el?: HTMLInputElement) {
  const k = keyOf(ex, set, field)
  if (el) inputRefs.set(k, el)
  else inputRefs.delete(k) // cleanup on unmount
}

let justFocusedAt = 0
function markFocus() { justFocusedAt = Date.now() }

// === Utilities for parsing numbers (locale friendly) ===
const toNumber = (v: string) => parseFloat(v.replace(',', '.')) || 0

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
  const weight = value === '' ? 0 : toNumber(value)
  session.value.exercises[exerciseIndex].sets[setIndex].weight = weight
  updateSetCompletion(exerciseIndex, setIndex)
  persistExercisesToLocal()
}

const handleWeightBlur = (event: Event, exerciseIndex: number, setIndex: number) => {
  if (!session.value) return
  const target = event.target as HTMLInputElement
  const value = target.value
  const weight = value === '' ? 0 : toNumber(value)
  session.value.exercises[exerciseIndex].sets[setIndex].weight = weight
  updateSetCompletion(exerciseIndex, setIndex)
  persistExercisesToLocal()
}

const handleRepsInput = (event: Event, exerciseIndex: number, setIndex: number) => {
  if (!session.value) return
  const target = event.target as HTMLInputElement
  const value = target.value
  const reps = value === '' ? 0 : parseInt(value) || 0
  session.value.exercises[exerciseIndex].sets[setIndex].reps = reps
  updateSetCompletion(exerciseIndex, setIndex)
  persistExercisesToLocal()
}

const handleRepsBlur = (event: Event, exerciseIndex: number, setIndex: number) => {
  if (!session.value) return
  const target = event.target as HTMLInputElement
  const value = target.value
  const reps = value === '' ? 0 : parseInt(value) || 0
  session.value.exercises[exerciseIndex].sets[setIndex].reps = reps
  updateSetCompletion(exerciseIndex, setIndex)
  persistExercisesToLocal()
}

const updateSetCompletion = (exerciseIndex: number, setIndex: number) => {
  if (!session.value) return
  const set = session.value.exercises[exerciseIndex].sets[setIndex]
  if (typeof set.weight === 'string') {
    set.weight = parseFloat(set.weight) || 0
  }
  if (typeof set.reps === 'string') {
    set.reps = parseInt(set.reps) || 0
  }
  const isCompleted = Boolean(
    set.weight &&
    set.reps &&
    set.weight > 0 &&
    set.reps > 0
  )
  if (set.isCompleted !== isCompleted) {
    set.isCompleted = isCompleted
  }
  hasUnsavedChanges.value = true
}

// === Local persistence helpers ===
const getLocalStorageKey = (sessionId: string) => `workout-session-${sessionId}`

const isLocalStorageAvailable = () => {
  try {
    const test = '__localStorage_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}

const persistExercisesToLocal = () => {
  if (!session.value || !isLocalStorageAvailable()) {
    hasUnsavedChanges.value = true
    return
  }
  const key = getLocalStorageKey(session.value.id)
  const payload = {
    sessionId: session.value.id,
    lastUpdated: Date.now(),
    exercises: JSON.parse(JSON.stringify(session.value.exercises)),
  }
  try {
    localStorage.setItem(key, JSON.stringify(payload))
    hasUnsavedChanges.value = true
    clearOldWorkoutData()
  } catch (e) {
    console.error('❌ Error persisting exercises to localStorage:', e)
    hasUnsavedChanges.value = true
  }
}

const clearOldWorkoutData = () => {
  try {
    const keys = Object.keys(localStorage)
    const workoutKeys = keys.filter(key => key.startsWith('workout-session-'))

    const workoutData = workoutKeys.map(key => {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}')
        return { key, lastUpdated: data.lastUpdated || 0 }
      } catch {
        return { key, lastUpdated: 0 }
      }
    })

    workoutData.sort((a, b) => b.lastUpdated - a.lastUpdated)
    workoutData.slice(5).forEach(({ key }) => {
      localStorage.removeItem(key)
      console.log('🗑️ Removed old workout data:', key)
    })
  } catch (error) {
    console.error('❌ Error clearing old workout data:', error)
  }
}

const getLocalChanges = (sessionId: string) => {
  try {
    const key = getLocalStorageKey(sessionId)
    const localData = localStorage.getItem(key)
    if (localData) return JSON.parse(localData)
  } catch (error) {
    console.error('❌ Error reading local changes:', error)
  }
  return null
}

const clearLocalChanges = (sessionId: string) => {
  try {
    const key = getLocalStorageKey(sessionId)
    localStorage.removeItem(key)
    console.log('🗑️ Cleared local changes for session:', sessionId)
  } catch (error) {
    console.error('❌ Error clearing local changes:', error)
  }
}

const restoreLocalChanges = async () => {
  if (!session.value) return
  try {
    const key = getLocalStorageKey(session.value.id)
    const localData = localStorage.getItem(key)
    if (!localData) return

    const parsed = JSON.parse(localData)
    if (parsed && Array.isArray(parsed.exercises)) {
      session.value.exercises = parsed.exercises
      hasUnsavedChanges.value = true
      console.log('✅ Restored exercises from local (source of truth)')
    }
  } catch (error) {
    console.error('❌ Error restoring local changes:', error)
  }
}
// === end local helpers ===

// ===== Scroll position persistence (WorkoutSession-only) =====
const shouldRestoreScroll = () => {
  if (!session.value) return false
  return sessionStorage.getItem(`workout-restore-${session.value.id}`) === '1'
}

const onScrollCapture = () => {
  if (!session.value) return
  const y =
    window.scrollY ||
    window.pageYOffset ||
    document.documentElement.scrollTop ||
    0
  const id = session.value.id
  sessionStorage.setItem(`workout-scroll-${id}`, String(y))
  localStorage.setItem(`workout-scroll-${id}`, String(y))
}

const restoreScrollPosition = () => {
  if (!session.value) return
  const id = session.value.id
  const saved =
    sessionStorage.getItem(`workout-scroll-${id}`) ||
    localStorage.getItem(`workout-scroll-${id}`)
  if (!saved) return
  const y = parseInt(saved, 10) || 0
  requestAnimationFrame(() => window.scrollTo(0, y))
}
// ===== end scroll section =====

const addSet = (exerciseIndex: number) => {
  if (!session.value) return
  const exercise = session.value.exercises[exerciseIndex]
  const newSet = {
    id: `set-${Date.now()}-${exercise.sets.length}`,
    reps: 0,
    weight: 0,
    duration: undefined as number | undefined,
    distance: undefined as number | undefined,
    isCompleted: false
  }
  exercise.sets.push(newSet)
  persistExercisesToLocal()
}

const addExerciseToSession = () => {
  if (!session.value || !newExerciseId.value) return

  const exerciseData = workoutData.getFlattenedExercises.value.find(e => e.id === newExerciseId.value)
  if (!exerciseData) return

  const exerciseExists = session.value.exercises.some(e => e.exerciseId === newExerciseId.value)
  if (exerciseExists) {
    alert('Denne øvelsen er allerede lagt til i økten.')
    return
  }

  if (availableExercises.value.length === 0) {
    alert('Det er ingen flere øvelser å legge til.')
    return
  }

  const exerciseName = exerciseData.name
  const exerciseId = exerciseData.id

  const newExercise = {
    exerciseId,
    name: exerciseName,
    sets: [{
      id: `set-${Date.now()}`,
      reps: 0,
      weight: 0,
      duration: undefined as number | undefined,
      distance: undefined as number | undefined,
      isCompleted: false
    }]
  }

  session.value.exercises.push(newExercise)
  persistExercisesToLocal()

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

const removeExercise = (exerciseIndex: number) => {
  const confirmDeletion = confirm('Er du sikker på at du vil slette denne øvelsen?');
  if (!confirmDeletion) return;
  if (!session.value) return
  session.value.exercises.splice(exerciseIndex, 1)
  persistExercisesToLocal()
}

const removeSet = (exerciseIndex: number, setIndex: number) => {
  if (!session.value) return

  const exercise = session.value.exercises[exerciseIndex]

  if (exercise.sets.length <= 1) {
    // Removing the only set removes the whole exercise; no focus restore
    session.value.exercises.splice(exerciseIndex, 1)
    persistExercisesToLocal()
    return
  }

  // Remove the set
  exercise.sets.splice(setIndex, 1)
  persistExercisesToLocal()

  if (document.activeElement) {
    (document.activeElement as HTMLElement).blur();
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
  const completedSessions = workoutData.sessions.value.filter(session => session.isCompleted)

  for (const session of completedSessions) {
    const exercise = session.exercises.find(e => e.exerciseId === exerciseId)
    if (exercise) {
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
  const muscleGroup = muscleGroupsData.muscleGroups.find(mg =>
    mg.name.toLowerCase() === muscleGroupName.toLowerCase() ||
    mg.displayName.toLowerCase() === muscleGroupName.toLowerCase()
  )

  return muscleGroup?.color || '#6b7280'
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
    const sessionId = session.value.id
    const localChanges = getLocalChanges(sessionId)

    const cleanedSession = await cleanupSessionData(session.value)

    // Prefer LOCAL exercises if present (source of truth)
    let exercisesToPersist = cleanedSession.exercises
    if (localChanges?.exercises) {
      exercisesToPersist = localChanges.exercises
      const tmpSession: WorkoutSession = {
        ...session.value,
        exercises: exercisesToPersist
      }
      const cleaned = await cleanupSessionData(tmpSession)
      exercisesToPersist = cleaned.exercises
    }

    await workoutData.updateWorkoutSessionOffline(sessionId, {
      exercises: exercisesToPersist
    })

    await workoutData.abandonWorkoutSession(sessionId)

    clearLocalChanges(sessionId)
    console.log('✅ Workout abandoned and synced successfully')
    router.push('/')
  } catch (error: any) {
    console.error("❌ Error abandoning workout:", error)
    if (error.message && (
      error.message.includes("not authenticated") ||
      error.message.includes("Session expired") ||
      error.message.includes("Please log in again")
    )) {
      alert("Din sesjon har utløpt. Du vil bli sendt til innloggingssiden.")
      router.push('/login')
      return
    }
    handleAuthError(error)
  }
}

const completeWorkout = async () => {
  if (!session.value) return

  try {
    const sessionId = session.value.id
    const localChanges = getLocalChanges(sessionId)

    const cleanedSession = await cleanupSessionData(session.value)

    // Prefer LOCAL exercises if present (source of truth)
    let exercisesToPersist = cleanedSession.exercises
    if (localChanges?.exercises) {
      exercisesToPersist = localChanges.exercises
      const tmpSession: WorkoutSession = {
        ...session.value,
        exercises: exercisesToPersist
      }
      const cleaned = await cleanupSessionData(tmpSession)
      exercisesToPersist = cleaned.exercises
    }

    await workoutData.updateWorkoutSessionOffline(sessionId, {
      exercises: exercisesToPersist
    })

    await workoutData.completeWorkoutSession(sessionId)

    clearLocalChanges(sessionId)
    console.log('✅ Workout completed and synced successfully')
    router.push(`/session/${sessionId}`)
  } catch (error: any) {
    console.error("❌ Error completing workout:", error)
    if (error.message && (
      error.message.includes("not authenticated") ||
      error.message.includes("Session expired") ||
      error.message.includes("Please log in again")
    )) {
      alert("Din sesjon har utløpt. Du vil bli sendt til innloggingssiden.")
      router.push('/login')
      return
    }
    handleAuthError(error)
  }
}

// Helper function to clean up session data before completion
const cleanupSessionData = async (sessionData: WorkoutSession): Promise<WorkoutSession> => {
  console.log('🧹 Cleaning up session data before completion...')

  const cleanedSession = JSON.parse(JSON.stringify(sessionData))

  const originalExerciseCount = cleanedSession.exercises.length
  cleanedSession.exercises = cleanedSession.exercises.filter((exercise: any) => {
    const hasCompletedSets = exercise.sets.some((set: any) => set.isCompleted)
    if (!hasCompletedSets) {
      console.log(`🧹 Removing exercise "${exercise.name}" - no completed sets`)
    }
    return hasCompletedSets
  })

  let totalSetsRemoved = 0
  cleanedSession.exercises.forEach((exercise: any) => {
    exercise.sets = exercise.sets.filter((set: any) => {
      const isComplete = set.isCompleted && set.weight > 0 && set.reps > 0
      if (!isComplete) {
        console.log(`🧹 Removing incomplete set from "${exercise.name}" - weight: ${set.weight}, reps: ${set.reps}`)
        totalSetsRemoved++
      }
      return isComplete
    })
  })

  cleanedSession.exercises = cleanedSession.exercises.filter((exercise: any) => exercise.sets.length > 0)

  console.log('🧹 Session cleaned up:', {
    originalExercises: originalExerciseCount,
    cleanedExercises: cleanedSession.exercises.length,
    totalSetsRemoved,
    exercisesRemoved: originalExerciseCount - cleanedSession.exercises.length
  })

  return cleanedSession
}

// Manual sync function for Ctrl+S or manual save
const syncLocalChangesToSupabase = async () => {
  if (!session.value || !hasUnsavedChanges.value || isSaving.value) return

  console.log('💾 Manually syncing local changes to Supabase...')
  isSaving.value = true

  try {
    const sessionId = session.value.id
    const local = getLocalChanges(sessionId)

    if (local?.exercises) {
      await workoutData.updateWorkoutSessionOffline(sessionId, {
        exercises: local.exercises
      })
      clearLocalChanges(sessionId)
      hasUnsavedChanges.value = false
      console.log('✅ Local changes synced to Supabase successfully')
    } else {
      console.log('ℹ️ No local changes to sync')
      hasUnsavedChanges.value = false
    }
  } catch (error: any) {
    console.error('❌ Error syncing local changes:', error)
    if (error.message && (
      error.message.includes("not authenticated") ||
      error.message.includes("Session expired") ||
      error.message.includes("Please log in again")
    )) {
      alert("Din sesjon har utløpt. Du vil bli sendt til innloggingssiden.")
      router.push('/login')
      return
    }
  } finally {
    isSaving.value = false
    console.log('💾 Manual sync operation completed')
  }
}

const isDevelopment = computed(() => import.meta.env.DEV)

// Lifecycle
onMounted(async () => {
  const sessionId = route.params.id as string

  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  const isPWA = window.matchMedia('(display-mode: standalone)').matches

  console.log('📱 WorkoutSession mounted:', {
    sessionId,
    isMobile: isMobileUA,
    isPWA
  })

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

  updateAppSaveState()

  // Restore local shape/values first (local wins for in-progress)
  await restoreLocalChanges()

  // Keyboard/Save integrations
  const handleKeydown = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault()
      if (hasUnsavedChanges.value && !isSaving.value) {
        syncLocalChangesToSupabase()
      }
    }
  }

  const handleSaveEvent = (event: CustomEvent) => {
    if (event.detail.sessionId === session.value?.id && hasUnsavedChanges.value && !isSaving.value) {
      syncLocalChangesToSupabase()
    }
  }

  watch([hasUnsavedChanges, isSaving], () => {
    updateAppSaveState()
  })

  watch(pendingChangesCount, (newCount) => {
    const updateEvent = new CustomEvent('updatePendingChangesCount', {
      detail: { pendingChangesCount: newCount }
    })
    window.dispatchEvent(updateEvent)
  })

  await updatePendingChangesCount()

  // Online auto-sync
  const handleOnlineSync = async () => {
    if (!session.value || !workoutData.isOnline.value) return
    try {
      const localChanges = getLocalChanges(session.value.id)
      if (localChanges?.exercises && hasUnsavedChanges.value) {
        console.log('🌐 Back online - syncing local changes automatically')
        await syncLocalChangesToSupabase()
      }
    } catch (error) {
      console.error('❌ Error in automatic online sync:', error)
    }
  }

  const handleNetworkChange = () => {
    if (workoutData.isOnline.value && hasUnsavedChanges.value) {
      console.log('🌐 Network back online - checking for local changes to sync')
      setTimeout(() => {
        if (workoutData.isOnline.value) {
          handleOnlineSync()
        }
      }, 2000)
    }
  }

  window.addEventListener('online', handleNetworkChange)

  // ===== Scroll wiring (attach once, restore only on resume flag) =====
  window.addEventListener('scroll', onScrollCapture)

  setTimeout(() => {
    if (shouldRestoreScroll()) {
      restoreScrollPosition()
      // consume flag so we don't keep restoring
      sessionStorage.removeItem(`workout-restore-${session.value!.id}`)
    }
  }, 300)

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      if (shouldRestoreScroll()) {
        setTimeout(() => {
          restoreScrollPosition()
          sessionStorage.removeItem(`workout-restore-${session.value!.id}`)
        }, 100)
      }
    }
  }
  document.addEventListener('visibilitychange', handleVisibilityChange)
  // ===== End scroll wiring =====

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

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
    window.removeEventListener('saveWorkoutSession', handleSaveEvent as EventListener)
    window.removeEventListener('beforeunload', handleBeforeUnload)
    window.removeEventListener('scroll', onScrollCapture)
    window.removeEventListener('online', handleNetworkChange)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })

  // initial cleanup of old local entries
  clearOldWorkoutData()
})

// Watch for route changes to warn about unsaved changes
watch(() => route.params.id, async (newId, oldId) => {
  if (newId && oldId && newId !== oldId) {
    if (hasUnsavedChanges.value) {
      const shouldLeave = confirm('Vil du lagre endringene først?')
      if (shouldLeave) {
        await syncLocalChangesToSupabase()
      }
    }
    const foundSession = workoutData.getSessionById(newId as string)
    if (foundSession) {
      session.value = foundSession
      startTime.value = new Date(foundSession.date)
      hasUnsavedChanges.value = false
    }
  }
})
</script>


<style scoped>
.set-enter-from, .set-leave-to { opacity: 0; }
.set-leave-from, .set-enter-to { opacity: 1; }
</style>

