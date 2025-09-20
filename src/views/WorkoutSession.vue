<template>
  <div class="space-y-5">
    <!-- Loading state -->
    <div v-if="workoutData.isLoading.value || !session" class="flex items-center justify-center py-12">
      <div class="text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-3"></div>
        <p class="text-dark-300">Laster økt...</p>
      </div>
    </div>

    <!-- Session content -->
    <div v-else>
      <!-- Sticky compact header -->
      <div class="sticky top-0 z-30 -mx-4 px-4 pt-[calc(env(safe-area-inset-top)+0.25rem)] pb-2 bg-dark-900/80 backdrop-blur supports-[backdrop-filter]:backdrop-blur border-b border-dark-700">
        <Breadcrumbs 
          :breadcrumbs="[
            { name: 'Økter', path: '/' },
            { name: 'Aktiv økt' }
          ]"
        />
        <div class="mt-2 flex items-center justify-between">
          <div class="flex items-center gap-3 min-w-0">
            <router-link 
              to="/" 
              class="inline-flex items-center justify-center w-9 h-9 bg-[#3F302A] hover:bg-[#4A3A32] rounded-lg transition-colors flex-shrink-0"
            >
              <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </router-link>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <h1 class="text-lg md:text-xl font-semibold text-white truncate">{{ session?.templateName }}</h1>
                <span 
                  class="inline-block px-2.5 py-0.5 text-xs font-medium rounded-full hidden sm:inline"
                  :style="{ 
                    backgroundColor: getWorkoutTypeColor(session?.workoutType || '') + '20',
                    color: getWorkoutTypeColor(session?.workoutType || '')
                  }"
                >
                  {{ getWorkoutTypeName(session?.workoutType || '') }}
                </span>
              </div>
              <div class="mt-1 flex items-center gap-3 text-xs text-dark-300">
                <span>{{ completedSets }} / {{ totalSets }} sett</span>
                <span class="hidden sm:inline">•</span>
                <span class="hidden sm:inline">{{ formatNumber(estimatedVolume) }} kg</span>
                <span class="hidden sm:inline">•</span>
                <span>{{ sessionDuration }}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span 
              class="inline-block px-2.5 py-0.5 text-xs font-medium rounded-full sm:hidden"
              :style="{ 
                backgroundColor: getWorkoutTypeColor(session?.workoutType || '') + '20',
                color: getWorkoutTypeColor(session?.workoutType || '')
              }"
            >
              {{ getWorkoutTypeName(session?.workoutType || '') }}
            </span>
            <button 
              @click="handleAbandonWorkout"
              class="hidden md:inline-flex px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors text-xs font-medium"
              title="Avbryt økt"
            >
              Avbryt
            </button>
          </div>
        </div>
        <!-- Progress bar -->
        <div class="mt-2 h-1 w-full bg-dark-800 rounded">
          <div class="h-1 rounded bg-primary-500 transition-all" :style="{ width: progressPercentage + '%' }"></div>
        </div>
      </div>

      <!-- Status row -->
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <div v-if="!workoutData.isOnline.value" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-600/20 border border-yellow-500/40 text-yellow-300 text-xs">
          <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          <span>Offline: lagrer lokalt</span>
        </div>
        <div v-if="workoutData.isOnline.value && pendingChangesCount > 0" class="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-600/20 border border-blue-500/40 text-blue-300 text-xs">
          <span>{{ pendingChangesCount }} endring(er)</span>
          <button 
            @click="syncPendingChanges"
            class="px-2 py-0.5 rounded bg-blue-500 hover:bg-blue-600 text-white text-[11px]"
            :disabled="isSyncingPendingChanges"
          >
            <span v-if="isSyncingPendingChanges">Synker…</span>
            <span v-else>Synk nå</span>
          </button>
        </div>
      </div>

      <!-- Exercises -->
      <div v-if="session" class="mt-4 space-y-4">
        <div 
          v-for="(exercise, exerciseIndex) in session.exercises" 
          :key="exercise.exerciseId"
          class="rounded-xl border border-dark-700 bg-dark-800/60"
        >
          <!-- Header -->
          <div class="flex items-start justify-between gap-3 p-4 cursor-pointer" @click="toggleExercise(exerciseIndex)">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-1.5 mb-1.5">
                <span 
                  v-for="muscleGroup in getExerciseMuscleGroups(exercise.exerciseId)" 
                  :key="muscleGroup"
                  class="inline-block px-2 py-0.5 text-[11px] font-medium rounded-full"
                  :style="{
                    backgroundColor: getMuscleGroupColor(muscleGroup) + '20',
                    color: getMuscleGroupColor(muscleGroup)
                  }"
                >
                  {{ muscleGroup }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <button 
                  type="button"
                  @click.stop="openExerciseQuickView(exercise.exerciseId, exercise.name)"
                  class="text-base md:text-lg font-semibold text-white truncate hover:text-primary-400 transition-colors text-left"
                >
                  {{ exercise.name }}
                </button>
                <span v-if="isExerciseCompleted(exercise)" class="inline-flex items-center gap-1 text-[11px] text-green-400 bg-green-500/10 border border-green-500/30 px-1.5 py-0.5 rounded-full">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Fullført
                </span>
              </div>
              <div v-if="getLastPerformance(exercise.exerciseId) || getHeaviestLift(exercise.exerciseId)" class="mt-1 text-[12px] text-dark-300">
                <div v-if="getLastPerformance(exercise.exerciseId)" class="flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span class="truncate">Sist: {{ getLastPerformance(exercise.exerciseId)?.reps }} × {{ getLastPerformance(exercise.exerciseId)?.weight }}kg • {{ getLastPerformance(exercise.exerciseId)?.date ? formatDate(getLastPerformance(exercise.exerciseId)!.date) : '' }}</span>
                </div>
                <div v-if="getHeaviestLift(exercise.exerciseId)" class="mt-0.5 flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10v4 M5 9v6 M7 10v4 M9 12h6 M17 10v4 M19 9v6 M21 10v4" />
                  </svg>
                  <span class="truncate">Tyngste: {{ getHeaviestLift(exercise.exerciseId)?.weight }}kg<span v-if="getHeaviestLift(exercise.exerciseId)?.reps"> × {{ getHeaviestLift(exercise.exerciseId)?.reps }}</span></span>
                </div>
              </div>
            </div>
            <svg 
              class="w-5 h-5 text-dark-300 mt-1 transition-transform flex-shrink-0"
              :class="{ 'rotate-180': !collapsedExercises[exerciseIndex] }"
              fill="none"
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <!-- Sets -->
          <Transition @enter="expand" @after-enter="afterExpand" @leave="collapse" @after-leave="afterCollapse">
            <div v-show="!collapsedExercises[exerciseIndex]" class="border-t border-dark-700">
              <TransitionGroup
                name="set"
                tag="div"
                enter-active-class="transition duration-200 ease-out"
                leave-active-class="transition duration-200 ease-in"
              >
                <div 
                  v-for="(set, setIndex) in exercise.sets" 
                  :key="set.id"
                  class="px-4 py-2.5 grid grid-cols-[auto,1fr,1fr] items-start gap-3 md:gap-4 border-b border-dark-700 hover:bg-dark-800/70"
                  :class="{ 'border-l-4 [border-left-color:#f97316]': set.isCompleted }"
                >
                  <button 
                    @click="removeSet(exerciseIndex, setIndex)"
                    class="self-center text-dark-400 hover:text-white transition-colors p-2 rounded-lg flex items-center justify-center"
                    title="Slett sett"
                    aria-label="Slett sett"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  <div>
                    <label :for="`reps-${exerciseIndex}-${setIndex}`" class="block text-[11px] text-dark-300 mb-1">Reps</label>
                    <input
                      :value="set.reps === 0 ? '' : set.reps"
                      type="text"
                      inputmode="numeric"
                      pattern="[0-9]*"
                      min="0"
                      required
                      class="input-field w-full text-sm h-7 py-0.5 bg-dark-700 border-dark-600 focus:border-primary-500"
                      :placeholder="getLastPerformance(exercise.exerciseId)?.reps?.toString() || '0'"
                      :id="`reps-${exerciseIndex}-${setIndex}`"
                      :data-exercise-index="exerciseIndex"
                      :data-set-index="setIndex"
                      :ref="el => registerInputRef(exerciseIndex, setIndex, 'reps', el as HTMLInputElement)"
                      @focus="markFocus"
                      @input="(event) => handleRepsInput(event, exerciseIndex, setIndex)"
                      @blur="(event) => handleRepsBlur(event, exerciseIndex, setIndex)"
                    />
                  </div>

                  <div class="relative">
                    <label :for="`weight-${exerciseIndex}-${setIndex}`" class="block text-[11px] text-dark-300 mb-1">Vekt (kg)</label>
                    <input
                      :value="set.weight === 0 ? '' : set.weight"
                      type="text"
                      inputmode="decimal"
                      pattern="^[0-9]+([\\.,][0-9]{1,2})?$"
                      min="0"
                      step="0.5"
                      required
                      class="input-field w-full text-sm h-7 py-0.5 pr-8 bg-dark-700 border-dark-600 focus:border-primary-500"
                      :placeholder="getLastPerformance(exercise.exerciseId)?.weight?.toString() || '0'"
                      :id="`weight-${exerciseIndex}-${setIndex}`"
                      :data-exercise-index="exerciseIndex"
                      :data-set-index="setIndex"
                      :ref="el => registerInputRef(exerciseIndex, setIndex, 'weight', el as HTMLInputElement)"
                      @focus="markFocus"
                      @input="(event) => handleWeightInput(event, exerciseIndex, setIndex)"
                      @blur="(event) => handleWeightBlur(event, exerciseIndex, setIndex)"
                    />
                  </div>

                  <!-- <div class="text-right text-[12px] text-primary-400 font-semibold whitespace-nowrap">
                    <span v-if="set.weight && set.reps">{{ set.weight * set.reps }} kg</span>
                  </div> -->
                  
                </div>
              </TransitionGroup>

              <!-- Footer: exercise volume + add set -->
              <div class="px-4 py-3 flex items-center justify-between bg-dark-900/40">
                <div class="flex items-center gap-3">
                  <div class="text-[12px] text-dark-300">
                    Total volum: <span class="text-primary-400 font-semibold">{{ formatNumber(calculateExerciseVolume(exercise)) }}</span> kg  • Sett {{ exercise.sets.filter(s => s.isCompleted).length }} / {{ exercise.sets.length }}
                  </div>
                </div>
                <button
                  @click="addSet(exerciseIndex)"
                  class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-dark-700 hover:bg-dark-600 border border-dark-600 text-white transition-colors"
                  aria-label="Legg til sett"
                  title="Legg til sett"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <!-- Quick actions -->
      <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button 
          class="md:hidden btn-secondary py-2.5 flex items-center justify-center gap-2"
          :disabled="availableExercises.length === 0"
          @click="openMobileAddExercise()"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Legg til ekstra øvelse</span>
        </button>
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

      <!-- Exercise Quick View -->
      <SlideOver
        :is-open="isExerciseQuickViewOpen"
        :title="exerciseQuickViewTitle"
        @close="closeExerciseQuickView"
      >
        <div v-if="exerciseQuickViewData" class="space-y-4">
          <div class="text-sm text-dark-300">Siste økter (maks 6):</div>
          <div class="space-y-2">
            <div 
              v-for="item in exerciseQuickViewData.recent"
              :key="item.id"
              class="flex items-center justify-between bg-dark-700 rounded-lg px-3 py-2"
            >
              <div class="text-[12px] text-dark-300">{{ formatDate(item.date) }}</div>
              <div class="text-white text-sm font-medium">{{ item.weight }}kg<span v-if="item.reps"> × {{ item.reps }}</span></div>
            </div>
            <div v-if="exerciseQuickViewData.recent.length === 0" class="text-dark-300 text-sm">Ingen data ennå</div>
          </div>

          <div v-if="exerciseQuickViewData.best" class="mt-2">
            <div class="text-sm text-dark-300 mb-1">Beste løft</div>
            <div class="bg-dark-700 rounded-lg px-3 py-2 flex items-center justify-between">
              <div class="text-white font-semibold">{{ exerciseQuickViewData.best.weight }}kg<span v-if="exerciseQuickViewData.best.reps"> × {{ exerciseQuickViewData.best.reps }}</span></div>
              <div class="text-[12px] text-dark-300">{{ formatDate(exerciseQuickViewData.best.date) }}</div>
            </div>
          </div>
        </div>
        <div v-else class="text-sm text-dark-300">Laster…</div>

        <template #footer>
          <button type="button" class="btn-primary w-full" @click="openQuickViewGoogleSearch">
            Åpne i Google
          </button>
        </template>
      </SlideOver>

      <!-- Summary -->
      <div class="mt-4">
        <div class="rounded-xl border border-dark-700 bg-dark-800/60 p-4">
          <div class="grid grid-cols-3 gap-3 text-center">
            <div>
              <p class="text-lg font-bold text-primary-500">{{ completedSets }} / {{ totalSets }}</p>
              <p class="text-[12px] text-dark-300">Sett</p>
            </div>
            <div>
              <p class="text-lg font-bold text-primary-500">{{ formatNumber(estimatedVolume) }}</p>
              <p class="text-[12px] text-dark-300">Volum (kg)</p>
            </div>
            <div>
              <p class="text-lg font-bold text-primary-500">{{ sessionDuration }}</p>
              <p class="text-[12px] text-dark-300">Varighet</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Complete Button -->
      <div class="mt-5">
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

      <!-- Add Exercise Modal (desktop) -->
      <div v-if="showAddExerciseModal" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div class="bg-dark-800 rounded-lg p-6 w-full max-w-md mx-4 border border-dark-700">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-semibold text-white">Legg til Øvelse</h3>
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
import SlideOver from '@/components/SlideOver.vue'

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

// Quick View state
const isExerciseQuickViewOpen = ref(false)
const exerciseQuickViewTitle = ref('Øvelsesdetaljer')
const exerciseQuickViewData = ref<{ recent: { id: string; weight: number; reps: number; date: Date }[]; best: { weight: number; reps: number; date: Date } | null } | null>(null)
let exerciseQuickViewId: string | null = null

function openExerciseQuickView(exerciseId: string, exerciseName: string) {
  exerciseQuickViewTitle.value = exerciseName
  exerciseQuickViewId = exerciseId
  isExerciseQuickViewOpen.value = true
  // Build recent 4-6 performances for this exercise from completed sessions
  const completedSessions = workoutData.sessions.value
    .filter(s => s.isCompleted)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const recent: { id: string; weight: number; reps: number; date: Date }[] = []
  let best: { weight: number; reps: number; date: Date } | null = null

  for (const s of completedSessions) {
    const ex = s.exercises.find((e: any) => e.exerciseId === exerciseId)
    if (!ex) continue
    for (const set of ex.sets) {
      if (!set.isCompleted || !set.weight || !set.reps) continue
      const entry = { id: `${s.id}-${set.id}`, weight: Number(set.weight), reps: Number(set.reps), date: new Date(s.date) }
      recent.push(entry)
      if (!best || entry.weight > best.weight || (entry.weight === best.weight && entry.date.getTime() > best.date.getTime())) {
        best = { weight: entry.weight, reps: entry.reps, date: entry.date }
      }
    }
    if (recent.length >= 6) break
  }
  exerciseQuickViewData.value = { recent: recent.slice(0, 6), best }
}

function closeExerciseQuickView() {
  isExerciseQuickViewOpen.value = false
}

function openQuickViewGoogleSearch() {
  const name = exerciseQuickViewTitle.value || ''
  if (!name) return
  const searchQuery = encodeURIComponent(`${name} strength training exercise`)
  const url = `https://www.google.com/search?q=${searchQuery}&tbm=isch`
  window.open(url, '_blank')
}

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
const pendingChangesCount = ref(0);

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

function markFocus() {
  justFocusedAt = Date.now()
  window.dispatchEvent(new CustomEvent('toggleBottomNav', { detail: { hidden: true } }))
}

function unhideNavSoon() {
  // Delay slightly: allows tapping toolbar “Done/Next” without flicker
  setTimeout(() => {
    // Only unhide if nothing focusable is active
    const active = document.activeElement as HTMLElement | null
    const stillFocused = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)
    if (!stillFocused) {
      window.dispatchEvent(new CustomEvent('toggleBottomNav', { detail: { hidden: false } }))
    }
  }, 120)
}

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
  unhideNavSoon()
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
  unhideNavSoon()
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
    // If this is the last set, trigger full exercise removal (with confirmation)
    removeExercise(exerciseIndex)
    return
  }

  // Remove the set
  exercise.sets.splice(setIndex, 1)
  persistExercisesToLocal()
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
  // We want the most recent completed session containing this exercise,
  // then the last completed set within that session (not the best by volume).
  const completedSessions = workoutData.sessions.value
    .filter(session => session.isCompleted)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  for (const session of completedSessions) {
    const exercise = session.exercises.find(e => e.exerciseId === exerciseId)
    if (!exercise) continue

    const completedSets = exercise.sets.filter(set => set.isCompleted && set.weight && set.reps)
    if (completedSets.length === 0) continue

    const lastSet = completedSets[completedSets.length - 1]
    return {
      weight: lastSet.weight,
      reps: lastSet.reps,
      date: session.date
    }
  }

  return null
}

// Heaviest lift across completed sessions for the exercise
const getHeaviestLift = (exerciseId: string) => {
  const completedSessions = workoutData.sessions.value
    .filter(session => session.isCompleted)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  let best: { weight: number; reps: number; date: any } | null = null

  for (const session of completedSessions) {
    const exercise = session.exercises.find(e => e.exerciseId === exerciseId)
    if (!exercise) continue

    for (const set of exercise.sets) {
      if (!set.isCompleted || !set.weight || !set.reps) continue
      if (!best || set.weight > best.weight || (set.weight === best.weight && new Date(session.date).getTime() > new Date(best.date).getTime())) {
        best = { weight: set.weight, reps: set.reps, date: session.date }
      }
    }
  }

  return best
}

// Calculate total volume for a single exercise (completed sets only)
const calculateExerciseVolume = (exercise: any): number => {
  if (!exercise || !Array.isArray(exercise.sets)) return 0
  return exercise.sets.reduce((sum: number, set: any) => {
    if (set.isCompleted && set.weight && set.reps) {
      return sum + set.weight * set.reps
    }
    return sum
  }, 0)
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

// State for collapsible exercises
const collapsedExercises = ref<boolean[]>([])

// Methods
const toggleExercise = (index: number) => {
  collapsedExercises.value[index] = !collapsedExercises.value[index]
}

// Smooth expand/collapse animations for exercise content
function expand(el: Element) {
  const element = el as HTMLElement
  const targetHeight = `${element.scrollHeight}px`

  element.style.overflow = 'hidden'
  element.style.height = '0px'
  element.style.willChange = 'height'
  element.style.contain = 'layout paint'

  requestAnimationFrame(() => {
    element.style.transition = 'height 160ms ease-out'
    element.style.height = targetHeight
  })
}

function afterExpand(el: Element) {
  const element = el as HTMLElement
  element.style.transition = ''
  element.style.height = ''
  element.style.overflow = ''
  element.style.willChange = ''
  element.style.contain = ''
}

function collapse(el: Element) {
  const element = el as HTMLElement
  const startHeight = `${element.scrollHeight}px`

  element.style.overflow = 'hidden'
  element.style.height = startHeight
  element.style.willChange = 'height'
  element.style.contain = 'layout paint'

  requestAnimationFrame(() => {
    element.style.transition = 'height 130ms ease-in'
    element.style.height = '0px'
  })
}

function afterCollapse(el: Element) {
  const element = el as HTMLElement
  element.style.transition = ''
  element.style.height = ''
  element.style.overflow = ''
  element.style.willChange = ''
  element.style.contain = ''
}

// Determine when an exercise is fully completed (all sets complete)
const isExerciseCompleted = (exercise: any): boolean => {
  if (!exercise || !Array.isArray(exercise.sets) || exercise.sets.length === 0) return false
  return exercise.sets.every((set: any) => set.isCompleted && set.weight > 0 && set.reps > 0)
}

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

  const setSessionFromStore = () => {
    const s = workoutData.getSessionById(sessionId)
    if (!s) return false
    session.value = s
    startTime.value = new Date(s.date)
    return true
  }

  if (!setSessionFromStore()) {
    // If user is not authenticated yet, wait for auth and stay on page
    const stopAuthWait = watch(
      () => workoutData.currentUser.value,
      async (u) => {
        if (!u) return
        try {
          await (workoutData as any).refreshUIData?.()
          if (!setSessionFromStore()) await workoutData.loadData(0, true)
          setSessionFromStore()
        } finally {
          stopAuthWait()
        }
      },
      { immediate: false }
    )
    try {
      // Paint from cache first if available
      if ((workoutData as any).refreshUIData) {
        await (workoutData as any).refreshUIData()
        if (setSessionFromStore()) return
      }

      // Force a data load (will no-op if auth not ready yet)
      await workoutData.loadData(0, true)
      if (!setSessionFromStore()) {
        // Defer: wait for auth/data to hydrate, then set session when available
        const stopSessionsWatch = watch(
          () => workoutData.sessions.value,
          () => {
            if (setSessionFromStore()) {
              stopSessionsWatch()
            }
          }
        )
        const stopAuthWatch = watch(
          () => workoutData.currentUser.value,
          async (u) => {
            if (u) {
              try {
                await (workoutData as any).refreshUIData?.()
                if (setSessionFromStore()) {
                  stopAuthWatch()
                  return
                }
                await workoutData.loadData(0, true)
                if (setSessionFromStore()) stopAuthWatch()
              } catch {}
            }
          },
          { immediate: false }
        )
        // Ensure we clean these up later
        onUnmounted(() => {
          try { stopSessionsWatch() } catch {}
          try { stopAuthWatch() } catch {}
        })
      }
    } catch (error) {
      console.error('Error ensuring session after refresh:', error)
      // Do not redirect; keep user on page while data hydrates
      return
    }
  }

  updateAppSaveState()

  // Restore local shape/values first (local wins for in-progress)
  await restoreLocalChanges()

  // Initialize collapsed state for all exercises
  if (session.value) {
    collapsedExercises.value = session.value.exercises.map(() => false)
  }

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

