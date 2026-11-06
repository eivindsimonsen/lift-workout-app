<script setup lang="ts">
import { ref, computed, onMounted, type Ref, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHybridData } from '@/composables/useHybridData'
import { useErrorHandler } from '@/composables/useErrorHandler'
import type { WorkoutSession, WeightUnit } from '@/types/workout'
import ExerciseSearchPanel from '@/components/ExerciseSearchPanel.vue'
import SwipeableCard from '@/components/SwipeableCard.vue'
import Breadcrumbs from '@/components/Breadcrumbs.vue'
import * as muscleGroupsData from '@/data/muscle-groups.json'
import SlideOver from '@/components/SlideOver.vue'
import CardioActivity from '@/components/CardioActivity.vue'
import { vibrate } from '@/composables/useHaptics'
import { useSwipeToDelete } from '@/composables/useSwipeToDelete'
import { useLongPressReorder } from '@/composables/useLongPressReorder'
import {
  isCardioExercise,
  isSetCounted,
  isSetLogged,
  setVolume,
  setProgressKg,
  setWeightText,
  weightUnitOf,
  hasBodyweight,
  formatDuration,
  formatDistance,
  lastLoggedByExercise,
  startingSetCount,
} from '@/composables/useSetMetrics'
import {
  formatClock,
  isExerciseRunning,
  isSetRunning,
  liveExerciseSeconds,
  pauseTimer,
} from '@/composables/useCardioTimer'
import { summarizeCardioExercise } from '@/composables/useCardioActivities'
import { useTrainingGoals, MUSCLE_GROUP_COLORS, CARDIO_GROUP_NAME } from '@/composables/useTrainingGoals'
import { useGoalStreak, addSessionToTally, emptyTally } from '@/composables/useGoalStreak'
import { sessionGoalRows, weekKeyOf, type SessionGoalRow } from '@/composables/goalStreak'

const route = useRoute()
const router = useRouter()
const workoutData = useHybridData()
const { handleAuthError } = useErrorHandler()

// State
const session = ref<WorkoutSession | null>(null)
const startTime = ref<Date | null>(null)
const showAddExerciseModal = ref(false)
const newExerciseId = ref<number | null>(null)
const isMobileExercisePanelOpen: Ref<boolean> = ref(false)
const hasUnsavedChanges = ref(false)
const isSaving = ref(false)
const isSyncingPendingChanges = ref(false)
const showResetConfirm = ref(false)
const activeExerciseIndex = ref<number | null>(null)

// Swipe-to-delete for set rows inside the sheet. The set is looked up by id when
// the swipe completes, so the index is the current one even if the list changed.
const setSwipe = useSwipeToDelete({
  onDelete: (setId) => {
    if (activeExerciseIndex.value === null || !session.value) return
    const exerciseIndex = activeExerciseIndex.value
    const setIndex = session.value.exercises[exerciseIndex].sets.findIndex(set => set.id === setId)
    if (setIndex < 0) return
    vibrate(50)
    removeSet(exerciseIndex, setIndex)
  },
})

// Quick View state
const isExerciseQuickViewOpen = ref(false)
const exerciseQuickViewTitle = ref('Øvelsesdetaljer')
const exerciseQuickViewData = ref<{ history: { date: Date; sets: { id: string; text: string; reps: number }[] }[]; best: { weight: number; reps: number; date: Date } | null } | null>(null)
let exerciseQuickViewId: number | null = null

function openExerciseQuickView(exerciseId: number, exerciseName: string) {
  closeExerciseSheet()
  exerciseQuickViewTitle.value = exerciseName
  exerciseQuickViewId = exerciseId

  // Get best lift (all-time)
  const best = getHeaviestLift(exerciseId)

  // Build recent history (last 12 sets, grouped by session)
  const completedSessions = workoutData.sessions.value
    .filter(s => s.isCompleted)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const history: { date: Date; sets: { id: string; text: string; reps: number }[] }[] = []
  let sessionCounter = 0
  const SESSION_LIMIT = 4

  for (const s of completedSessions) {
    if (sessionCounter >= SESSION_LIMIT) break

    const ex = s.exercises.find((e: any) => e.exerciseId === exerciseId)
    if (!ex) continue

    const sessionSets: { id: string; text: string; reps: number }[] = []

    for (const set of ex.sets) {
      // Strength history only — a cardio round would read "0 × 0 kg".
      if (isCardioExercise(ex) || !isSetCounted(ex, set)) continue
      sessionSets.push({ id: `${s.id}-${set.id}`, text: setWeightText(set), reps: Number(set.reps) })
    }

    if (sessionSets.length > 0) {
      history.push({
        date: new Date(s.date),
        sets: sessionSets // Standard order (1, 2, 3...)
      })
      
      sessionCounter++
    }
  }

  exerciseQuickViewData.value = { history, best }
  isExerciseQuickViewOpen.value = true
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
      return isSetCounted(exercise, set) ? setTotal + setVolume(exercise, set) : setTotal
    }, 0)
    return exerciseTotal + exerciseVolume
  }, 0)
})

const sessionDuration = computed(() => {
  if (!startTime.value) return '0 min'
  const duration = Math.round((now.value - startTime.value.getTime()) / 60000)
  return `${duration} min`
})

// Timer for dynamic duration updates
const now = ref(Date.now())
let durationTimer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  durationTimer = setInterval(() => {
    now.value = Date.now()
  }, 10000) // Update every 10 seconds
})

onUnmounted(() => {
  clearInterval(durationTimer)
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

// Offline changes still queued for Supabase. Owned by the data store — the store
// keeps the count current, so this view just reads it.
const pendingChangesCount = workoutData.pendingChangesCount

const syncPendingChanges = async () => {
  if (!workoutData.isOnline.value) return

  isSyncingPendingChanges.value = true
  try {
    await workoutData.syncPendingChanges()
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

/** "Sist 8×60kg" for strength, "Sist 45:00 · 7,20 km · 7/10" for cardio. */
const lastPerformanceLabel = (exerciseId: number): string | null => {
  const last = getLastPerformance(exerciseId)
  if (!last) return null

  // As logged, so the number matches the machine you'll stand at.
  if (!last.isCardio) {
    const typed = last.weightUnit === 'lbs' ? `${last.weight} lbs` : `${last.weight}kg`
    return `Sist ${last.reps}×${last.withBodyweight ? (last.weight ? `KV + ${typed}` : 'KV') : typed}`
  }

  const parts: string[] = []
  if (Number(last.duration) > 0) parts.push(formatDuration(Number(last.duration)))
  if (Number(last.distance) > 0) parts.push(formatDistance(Number(last.distance)))
  if (last.effort) parts.push(`${last.effort}/10`)
  return parts.length > 0 ? `Sist ${parts.join(' · ')}` : null
}

// ===== Cardio =====

/** A session made only of cardio has no sets or kilos worth showing. */
const isCardioOnly = computed(() => {
  const exercises = session.value?.exercises ?? []
  return exercises.length > 0 && exercises.every(ex => isCardioExercise(ex))
})

const sessionCardioSeconds = computed(() =>
  (session.value?.exercises ?? [])
    .filter(ex => isCardioExercise(ex))
    .reduce((sum, ex) => sum + liveExerciseSeconds(ex, now.value), 0)
)

/**
 * The summary card: sets only when the session has strength work, volume only
 * once a strength set is done, cardio only when there's cardio in the session.
 */
const summaryTiles = computed(() => {
  const exercises = session.value?.exercises ?? []
  const strength = exercises.filter(ex => !isCardioExercise(ex))
  const tiles: Array<{ key: string; value: string; label: string; cardio?: boolean }> = []

  if (strength.length > 0) {
    const done = strength.reduce((sum, ex) => sum + ex.sets.filter(set => isSetCounted(ex, set)).length, 0)
    const total = strength.reduce((sum, ex) => sum + ex.sets.length, 0)
    tiles.push({ key: 'sets', value: `${done} / ${total}`, label: 'Sett' })
    if (done > 0) tiles.push({ key: 'volume', value: formatNumber(estimatedVolume.value), label: 'Volum (kg)' })
  }

  if (exercises.some(ex => isCardioExercise(ex))) {
    tiles.push({ key: 'cardio', value: formatClock(sessionCardioSeconds.value), label: 'Kondisjon', cardio: true })
  }

  tiles.push({ key: 'duration', value: sessionDuration.value, label: 'Varighet' })
  return tiles
})

// ---------------------------------------------------------------------------
// Weekly goal — the groups this session trains, counted live on top of the week
// ---------------------------------------------------------------------------

const { goals, hasGoals } = useTrainingGoals()
const { ready: goalsReady, thisWeekTally, thisWeekKey } = useGoalStreak()

/** Muscle groups in the order the session first trains them. */
const sessionGroups = computed(() => {
  const index = workoutData.exerciseIndex.value
  const groups: string[] = []
  ;(session.value?.exercises ?? []).forEach(ex => {
    if (isCardioExercise(ex)) return
    const category = index.get(Number(ex.exerciseId))?.category
    if (category && category !== CARDIO_GROUP_NAME && !groups.includes(category)) groups.push(category)
  })
  return groups
})

const goalRows = computed<SessionGoalRow[]>(() => {
  const s = session.value
  // Once the store marks it completed it's already in thisWeekTally — adding it again would double it.
  if (!s || workoutData.getSessionById(s.id)?.isCompleted) return []
  // A session started before Monday counts in last week, so this week's numbers would mislead.
  if (!hasGoals.value || !goalsReady.value || weekKeyOf(new Date(s.date)) !== thisWeekKey.value) return []
  const today = emptyTally()
  addSessionToTally(today, s, workoutData.exerciseIndex.value)
  // Include a running stopwatch, like the Kondisjon tile — banked rounds are already part of it.
  today.cardioSeconds = sessionCardioSeconds.value
  return sessionGoalRows(thisWeekTally.value, today, sessionGroups.value, s.exercises.some(ex => isCardioExercise(ex)), goals.value)
})

const allGoalsMet = computed(() => goalRows.value.length > 0 && goalRows.value.every(row => row.met))

const goalKmFormat = new Intl.NumberFormat('no-NO', { maximumFractionDigits: 1 })
const GOAL_UNIT = { strength: '', minutes: ' min', km: ' km' } as const

const goalRowValue = (row: SessionGoalRow): string => {
  const format = (n: number) => (row.kind === 'km' ? goalKmFormat.format(n) : String(n))
  return `${format(row.before + row.today)} / ${format(row.target)}${GOAL_UNIT[row.kind]}${row.met ? ' ✓' : ''}`
}

const goalRowColor = (row: SessionGoalRow): string =>
  row.kind === 'strength' ? (MUSCLE_GROUP_COLORS[row.name] ?? '#64748b') : '#06b6d4'

/** "Bryst", "Bryst og Skuldre", "Bryst, Skuldre og Triceps". */
const metGroupNames = computed(() => {
  const names = goalRows.value.map(row => row.name)
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} og ${names[names.length - 1]}` : names.join('')
})

const anyCardioRunning = computed(() =>
  (session.value?.exercises ?? []).some(ex => isCardioExercise(ex) && isExerciseRunning(ex))
)

/** A second-level tick only while a stopwatch actually runs; otherwise the 10 s one is enough. */
let clockTicker: ReturnType<typeof setInterval> | undefined
watch(anyCardioRunning, (running) => {
  clearInterval(clockTicker)
  clockTicker = undefined
  if (!running) return
  now.value = Date.now()
  clockTicker = setInterval(() => { now.value = Date.now() }, 500)
}, { immediate: true })
onUnmounted(() => clearInterval(clockTicker))

/** A running clock counts: completing the session banks it first. */
const canComplete = computed(() => completedSets.value > 0 || anyCardioRunning.value)

/** Banks every running stopwatch, so the logged time is final. */
const stopCardioTimers = () => {
  if (!session.value) return
  const stoppedAt = Date.now()
  session.value.exercises.forEach(ex => {
    if (isCardioExercise(ex)) pauseTimer(ex, stoppedAt)
  })
}

/**
 * Lands straight in the stopwatch when that's what the session is for: a
 * running clock, or a session holding a single cardio exercise.
 */
const openCardioOnArrival = () => {
  const exercises = session.value?.exercises ?? []
  const running = exercises.findIndex(ex => isCardioExercise(ex) && isExerciseRunning(ex))
  if (running >= 0) openExerciseSheet(running)
  else if (exercises.length === 1 && isCardioExercise(exercises[0])) openExerciseSheet(0)
}

/** Whether the exercise currently open in the sheet is a cardio one. */
const activeExerciseIsCardio = computed(() => {
  if (activeExerciseIndex.value === null || !session.value) return false
  return isCardioExercise(session.value.exercises[activeExerciseIndex.value])
})

const updateSetCompletion = (exerciseIndex: number, setIndex: number) => {
  if (!session.value) return
  const set = session.value.exercises[exerciseIndex].sets[setIndex]
  if (typeof set.weight === 'string') {
    set.weight = parseFloat(set.weight) || 0
  }
  if (typeof set.reps === 'string') {
    set.reps = parseInt(set.reps) || 0
  }
  const exercise = session.value.exercises[exerciseIndex]
  const isCompleted = isSetLogged(exercise, set)
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
  const previous = exercise.sets[exercise.sets.length - 1]
  const newSet = {
    id: `set-${Date.now()}-${exercise.sets.length}`,
    reps: 0,
    weight: 0,
    // Same machine as the set above
    weightUnit: previous?.weightUnit,
    withBodyweight: previous?.withBodyweight,
    bodyweight: previous?.bodyweight,
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
  const setSeed = Date.now()
  const exerciseSlotIndex = session.value.exercises.length

  // Same reasoning as when a session starts: carry the type with the session.
  const trackingType = workoutData.exerciseIndex.value.get(exerciseId)?.trackingType ?? 'strength'
  // Cardio is one activity that grows rounds as you go; strength starts with
  // as many sets as were logged last time (3 if never done).
  const setCount = trackingType === 'cardio' ? 1 : startingSetCount(workoutData.sessions.value, exerciseId)

  const newExercise = {
    exerciseId,
    name: exerciseName,
    trackingType,
    sets: Array.from({ length: setCount }, (_, setIndex) => ({
      id: `set-${setSeed}-${exerciseSlotIndex}-${setIndex}`,
      reps: 0,
      weight: 0,
      duration: undefined as number | undefined,
      distance: undefined as number | undefined,
      isCompleted: false
    }))
  }

  session.value.exercises.push(newExercise)
  persistExercisesToLocal()

  newExerciseId.value = null
  showAddExerciseModal.value = false
}

const openMobileAddExercise = () => {
  isMobileExercisePanelOpen.value = true
}

const closeMobileAddExercise = () => {
  isMobileExercisePanelOpen.value = false
}

const handleAddExerciseFromPanel = (exerciseId: number) => {
  newExerciseId.value = exerciseId
  addExerciseToSession()
  isMobileExercisePanelOpen.value = false
}

const removeExercise = (exerciseIndex: number) => {
  const confirmDeletion = confirm('Er du sikker på at du vil slette denne øvelsen?');
  if (!confirmDeletion) return;
  if (!session.value) return
  session.value.exercises.splice(exerciseIndex, 1)
  closeExerciseSheet()
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

// ===== Deferred cleanup =====
// Vue can only bind lifecycle hooks synchronously during setup. The onMounted
// below is async, so calling onUnmounted after one of its awaits silently fails
// to register — leaving every listener it set up attached for the rest of the
// session. Collect the teardown callbacks instead and run them from a single
// hook registered here, synchronously.
const deferredCleanups: Array<() => void> = []

const addCleanup = (fn: () => void) => {
  deferredCleanups.push(fn)
}

onUnmounted(() => {
  while (deferredCleanups.length > 0) {
    const fn = deferredCleanups.pop()
    try {
      fn?.()
    } catch (error) {
      console.warn('⚠️ Cleanup failed:', error)
    }
  }
})

// ===== Long-press drag to reorder exercises =====
// Shared with the template editor; see useLongPressReorder for why a long press
// is required rather than a plain vertical drag.
const exListRef = ref<HTMLElement | null>(null)

const {
  draggingIndex,
  dragTranslateY,
  onRowPointerDown,
  consumeClickSuppression,
} = useLongPressReorder({
  getItems: () => session.value?.exercises ?? null,
  listEl: exListRef,
  onReordered: () => persistExercisesToLocal(),
})
// ===== end drag section =====

/** Opens the bottom sheet for a specific exercise index. */
const openExerciseSheet = (idx: number) => {
  activeExerciseIndex.value = idx
  const exercise = session.value?.exercises[idx]
  // First open this session: start where last time ended, so a lbs machine or body weight carries over.
  // Plain kg is what missing values mean, so only write otherwise — opening a sheet shouldn't dirty the session.
  if (exercise && !isCardioExercise(exercise) && !exercise.sets.some(set => set.weightUnit || hasBodyweight(set))) {
    const last = getLastPerformance(exercise.exerciseId)
    if (last && !last.isCardio && (last.weightUnit !== 'kg' || last.withBodyweight)) {
      setExerciseWeighing(idx, { unit: last.weightUnit, withBodyweight: last.withBodyweight })
    }
  }
}

// ---------------------------------------------------------------------------
// Weight unit — chosen per exercise, stored on every set
// ---------------------------------------------------------------------------

const UNIT_OPTIONS: WeightUnit[] = ['kg', 'lbs']

const profileBodyweight = computed<number | null>(() => {
  const kg = Number(workoutData.currentUser.value?.user_metadata?.bodyweight)
  return kg > 0 ? kg : null
})

/** Every set of an exercise shares unit and body weight, so the first set speaks for them. */
const activeFirstSet = computed(() =>
  activeExerciseIndex.value === null ? undefined : session.value?.exercises[activeExerciseIndex.value]?.sets[0]
)
const activeUnit = computed<WeightUnit>(() => weightUnitOf(activeFirstSet.value))
const activeWithBodyweight = computed(() => hasBodyweight(activeFirstSet.value))
const weightHeader = computed(() => `${activeWithBodyweight.value ? 'Ekstra' : 'Vekt'} (${activeUnit.value})`)

// Two decimals like formatKg elsewhere, so an old 61,25 kg PB isn't rounded.
const formatKgShort = (kg: number): string => kg.toLocaleString('no-NO', { maximumFractionDigits: 2 })

/** Writes unit and body weight to every set — body weight on or off can make a 0 kg set count or stop counting. */
const setExerciseWeighing = (exerciseIndex: number, { unit, withBodyweight }: { unit: WeightUnit; withBodyweight: boolean }) => {
  if (!session.value) return
  session.value.exercises[exerciseIndex].sets.forEach((set, setIndex) => {
    set.weightUnit = unit
    set.withBodyweight = withBodyweight
    if (!withBodyweight) delete set.bodyweight
    else if (profileBodyweight.value) set.bodyweight = profileBodyweight.value
    updateSetCompletion(exerciseIndex, setIndex)
  })
  persistExercisesToLocal()
}

/** Last time's weight as a hint, only when it was logged the way it's set up now. */
const weightPlaceholder = (exerciseId: number): string => {
  const last = getLastPerformance(exerciseId)
  const same = last && !last.isCardio && last.weightUnit === activeUnit.value && last.withBodyweight === activeWithBodyweight.value
  return same && last.weight ? String(last.weight) : '–'
}

const onRowClick = (index: number) => {
  if (consumeClickSuppression()) return
  openExerciseSheet(index)
}

const closeExerciseSheet = () => {
  activeExerciseIndex.value = null
}

const prevExercise = () => {
  if (activeExerciseIndex.value !== null && activeExerciseIndex.value > 0) {
    openExerciseSheet(activeExerciseIndex.value - 1)
  }
}

const nextExercise = () => {
  if (
    activeExerciseIndex.value !== null &&
    session.value &&
    activeExerciseIndex.value < session.value.exercises.length - 1
  ) {
    openExerciseSheet(activeExerciseIndex.value + 1)
  }
}

/** Removes all exercises from the current session run so the user can add their own. */
const resetExercises = () => {
  if (!session.value) return
  session.value.exercises = []
  collapsedExercises.value = []
  showResetConfirm.value = false
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

/** Returns the parent exercise group name for a variant ID, or null if it's a standalone exercise. */
const getParentGroupName = (exerciseId: number): string | null => {
  for (const exercise of workoutData.exercises.value) {
    if (exercise.variants?.some(v => v.id === exerciseId)) {
      return exercise.name
    }
  }
  return null
}

// Last logging of every exercise, built once. It only reads completed sessions, so
// logging sets in the active session (or the stopwatch ticking) doesn't rebuild it.
const lastLoggedIndex = computed(() => lastLoggedByExercise(workoutData.sessions.value))

const getLastPerformance = (exerciseId: number) => {
  // The most recent completed session with this exercise logged — the same rule the
  // starting set count uses — then the last completed set in it (not the best by volume).
  const last = lastLoggedIndex.value.get(Number(exerciseId))
  if (!last) return null
  const { session, exercise } = last

  // Cardio compares whole activities — last time's football match, not its last round.
  if (isCardioExercise(exercise)) {
    const activity = summarizeCardioExercise(exercise)
    return {
      weight: 0,
      weightUnit: 'kg' as WeightUnit,
      withBodyweight: false,
      reps: 0,
      duration: activity.seconds,
      distance: activity.metres,
      effort: exercise.effort,
      isCardio: true,
      date: session.date
    }
  }

  const completedSets = exercise.sets.filter(set => isSetCounted(exercise, set))
  const lastSet = completedSets[completedSets.length - 1]
  return {
    weight: lastSet.weight,
    weightUnit: weightUnitOf(lastSet),
    withBodyweight: hasBodyweight(lastSet),
    reps: lastSet.reps,
    duration: lastSet.duration,
    distance: lastSet.distance,
    effort: undefined as number | undefined,
    isCardio: false,
    date: session.date
  }
}

// Heaviest lift across completed sessions for the exercise
const getHeaviestLift = (exerciseId: number) => {
  const completedSessions = workoutData.sessions.value
    .filter(session => session.isCompleted)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  let best: { weight: number; reps: number; date: Date } | null = null

  for (const session of completedSessions) {
    const exercise = session.exercises.find(e => e.exerciseId === exerciseId)
    if (!exercise) continue

    for (const set of exercise.sets) {
      if (!set.isCompleted) continue
      
      // Progress kg: lbs converted, only the extra load on body weight sets.
      const w = setProgressKg(exercise, set)
      const r = Number(set.reps) || 0

      if (w <= 0 || r <= 0) continue

      if (!best) {
        best = { weight: w, reps: r, date: new Date(session.date) }
        continue
      }

      // Logic: Heaviest weight wins. Tie? More reps wins. Tie? Newer date wins.
      if (w > best.weight) {
        best = { weight: w, reps: r, date: new Date(session.date) }
      } else if (w === best.weight) {
        if (r > best.reps) {
          best = { weight: w, reps: r, date: new Date(session.date) }
        } else if (r === best.reps) {
          // If weight and reps are equal, prefer the more recent date.
          // Since we iterate from newest to oldest, the first one we found (current 'best') 
          // is already the newest, so we don't update.
          if (new Date(session.date).getTime() > new Date(best.date).getTime()) {
             best = { weight: w, reps: r, date: new Date(session.date) }
          }
        }
      }
    }
  }

  return best
}

// Calculate total volume for a single exercise (completed sets only)
const calculateExerciseVolume = (exercise: any): number => {
  if (!exercise || !Array.isArray(exercise.sets)) return 0
  return exercise.sets.reduce((sum: number, set: any) => {
    return isSetCounted(exercise, set) ? sum + setVolume(exercise, set) : sum
  }, 0)
}

const getExerciseMuscleGroups = (exerciseId: number): string[] => {
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
  // A round whose clock is still running is kept: completing banks its time.
  const incompleteExercises = session.value?.exercises.filter(exercise =>
    !exercise.sets.some(set => set.isCompleted || isSetRunning(set))
  ) || []

  const incompleteSets = session.value?.exercises.reduce((total, exercise) =>
    total + exercise.sets.filter(set => !set.isCompleted && !isSetRunning(set)).length, 0
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

  let message = 'Er du sikker på at du vil avbryte denne økten?'

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

    // Bank running stopwatches and write them locally first — the local copy is
    // what gets saved below.
    stopCardioTimers()
    persistExercisesToLocal()

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

  // Body weight entered in the profile mid-session still counts for this session's sets.
  cleanedSession.exercises.forEach((exercise: any) =>
    exercise.sets.forEach((set: any) => {
      if (hasBodyweight(set) && !(Number(set.bodyweight) > 0) && profileBodyweight.value) {
        set.bodyweight = profileBodyweight.value
      }
    })
  )

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
      const isComplete = isSetCounted(exercise, set)
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
const uiReady = ref(false)

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
  return exercise.sets.every((set: any) => isSetCounted(exercise, set))
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
        addCleanup(() => {
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

  // After the restore: a running stopwatch lives in the local copy.
  openCardioOnArrival()

  // Initialize collapsed state: keep completed collapsed, expand only active/incomplete
  if (session.value) {
    collapsedExercises.value = session.value.exercises.map((ex: any) => isExerciseCompleted(ex))
  }
  // Defer enabling transitions so initial state paints without animation
  requestAnimationFrame(() => {
    uiReady.value = true
  })

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

  addCleanup(() => {
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

<template>
  <div class="space-y-3">
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
      <!-- Safe area: rely on App.vue main padding-top; avoid doubling env(safe-area-inset-top) here -->
      <div class="sticky top-[env(safe-area-inset-top,0px)] z-30 -mx-4 px-4 pt-2 pb-2 bg-dark-900/80 backdrop-blur supports-[backdrop-filter]:backdrop-blur border-b border-dark-700">
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
              </div>
              <div class="mt-1 flex items-center gap-3 text-xs text-dark-300">
                <template v-if="isCardioOnly">
                  <span class="tabular-nums">Aktiv tid {{ formatClock(sessionCardioSeconds) }}</span>
                </template>
                <template v-else>
                  <span>{{ completedSets }} / {{ totalSets }} sett</span>
                  <span class="hidden sm:inline">•</span>
                  <span class="hidden sm:inline">{{ formatNumber(estimatedVolume) }} kg</span>
                </template>
                <span class="hidden sm:inline">•</span>
                <span>{{ sessionDuration }}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <!-- The only way to cancel a session on a phone since the home page's swipe-to-cancel card is gone.
                 Deleting is a red text button (DESIGN.md → Knapper), with a 44px tap target. -->
            <button
              type="button"
              @click="handleAbandonWorkout"
              class="inline-flex items-center justify-center min-h-[2.75rem] px-3 rounded-lg text-sm font-medium text-[#f87171] hover:text-red-300 active:bg-[#7f1d1d40] transition-colors"
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

      <!-- Exercise list — compact rows, tap to open bottom sheet, swipe to delete -->
      <div v-if="session" ref="exListRef" class="ex-list">
        <SwipeableCard
          v-for="(exercise, exerciseIndex) in session.exercises"
          :key="exercise.exerciseId"
          :show-swipe-hint="false"
          :disabled="draggingIndex !== null"
          :class="{ 'ex-item--dragging': draggingIndex === exerciseIndex }"
          :style="draggingIndex === exerciseIndex ? { transform: `translateY(${dragTranslateY}px)` } : undefined"
          @delete="removeExercise(exerciseIndex)"
        >
          <button
            type="button"
            class="ex-row"
            :class="{ 'ex-row--done': isExerciseCompleted(exercise) }"
            :style="{ '--ex-color': getMuscleGroupColor(getExerciseMuscleGroups(exercise.exerciseId)[0] || '') }"
            @pointerdown="onRowPointerDown($event, exerciseIndex)"
            @click="onRowClick(exerciseIndex)"
          >
            <span class="ex-row__dot"></span>
            <span class="ex-row__body">
              <span class="ex-row__name">{{ exercise.name }}</span>
              <span v-if="lastPerformanceLabel(exercise.exerciseId)" class="ex-row__ref">
                {{ lastPerformanceLabel(exercise.exerciseId) }}
              </span>
            </span>
            <span class="ex-row__right">
              <!-- Cardio shows its clock, live while it runs, instead of a set count -->
              <template v-if="isCardioExercise(exercise)">
                <span v-if="isExerciseRunning(exercise)" class="ex-row__badge ex-row__badge--running">
                  <span class="ex-row__live-dot"></span>
                  {{ formatClock(liveExerciseSeconds(exercise, now)) }}
                </span>
                <span v-else-if="liveExerciseSeconds(exercise, now) > 0" class="ex-row__badge ex-row__badge--done">
                  {{ formatClock(liveExerciseSeconds(exercise, now)) }}
                </span>
                <span v-else class="ex-row__badge">Ikke startet</span>
              </template>
              <span v-else-if="isExerciseCompleted(exercise)" class="ex-row__badge ex-row__badge--done">
                <svg class="w-2.5 h-2.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                </svg>
                {{ exercise.sets.length }} sett
              </span>
              <span v-else class="ex-row__badge">
                {{ exercise.sets.filter(s => s.isCompleted).length }}/{{ exercise.sets.length }}
              </span>
              <svg class="ex-row__chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </span>
          </button>
        </SwipeableCard>
      </div>

      <!-- Quick actions -->
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <button 
          v-if="!showResetConfirm"
          class="md:hidden btn-secondary py-2.5 flex items-center justify-center gap-2 flex-1"
          :disabled="availableExercises.length === 0"
          @click="openMobileAddExercise()"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Legg til øvelse</span>
        </button>

        <!-- Reset exercises: two-step inline confirm -->
        <template v-if="!showResetConfirm">
          <button
            v-if="session && session.exercises.length > 0"
            class="session-reset-btn"
            title="Fjern alle øvelser for denne økten"
            @click="showResetConfirm = true"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Nullstill øvelser</span>
          </button>
        </template>
        <template v-else>
          <div class="session-reset-confirm">
            <span class="session-reset-confirm__label">Fjerne alle øvelser?</span>
            <button class="btn-secondary btn-sm" @click="showResetConfirm = false">Avbryt</button>
            <button class="btn-danger btn-sm" @click="resetExercises">Ja, nullstill</button>
          </div>
        </template>
      </div>

      <!-- Mobile Exercise Picker -->
      <!-- No :exercises binding: the panel reads the exercise store itself. -->
      <ExerciseSearchPanel
        :is-open="isMobileExercisePanelOpen"
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
          <!-- Best Lift Card -->
          <div v-if="exerciseQuickViewData.best" class="mt-1 mb-6">
            <div class="text-xs font-medium text-dark-400 mb-2 uppercase tracking-wide">Personlig Beste</div>
            <div class="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20 rounded-xl p-3 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="bg-yellow-500/10 p-2 rounded-lg text-yellow-500">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <div class="text-white font-bold text-lg leading-none">
                    {{ formatKgShort(exerciseQuickViewData.best.weight) }} <span class="text-sm font-normal text-yellow-500/80">kg</span>
                  </div>
                  <div class="text-xs text-yellow-500/60 mt-0.5">
                    {{ exerciseQuickViewData.best.reps }} reps • {{ formatDate(exerciseQuickViewData.best.date) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between mb-1">
            <div class="text-xs font-medium text-dark-400 uppercase tracking-wide">Historikk</div>
          </div>

          <div class="space-y-3">
            <div 
              v-for="group in exerciseQuickViewData.history"
              :key="group.date.getTime()"
              class="bg-dark-800/40 rounded-xl overflow-hidden border border-dark-700/50"
            >
              <!-- Session Header -->
              <div class="bg-dark-800/60 px-3 py-2 flex items-center gap-2 border-b border-dark-700/50">
                <svg class="w-3.5 h-3.5 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span class="text-xs font-bold text-dark-300 uppercase tracking-wider">
                  {{ formatDate(group.date) }}
                </span>
              </div>
              
              <!-- Sets List -->
              <div class="p-1">
                <div 
                  v-for="(set, idx) in group.sets"
                  :key="set.id"
                  class="flex items-center justify-between py-2 px-3 hover:bg-dark-700/30 rounded-lg transition-colors"
                >
                  <span class="text-[10px] text-dark-500 font-mono w-6">#{{ idx + 1 }}</span>
                  <div class="flex items-baseline gap-1">
                      <span class="text-white font-semibold">{{ set.reps }}</span>
                      <span class="text-dark-400 text-xs px-0.5">×</span>
                      <span class="text-white font-semibold">{{ set.text }}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div v-if="exerciseQuickViewData.history.length === 0" class="text-center py-8">
              <p class="text-dark-400 text-sm">Ingen historikk funnet</p>
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
          <!-- Each kind of training only shows up when it's part of the session -->
          <div class="grid gap-3 text-center" :style="{ gridTemplateColumns: `repeat(${summaryTiles.length}, minmax(0, 1fr))` }">
            <div v-for="tile in summaryTiles" :key="tile.key">
              <p class="text-lg font-bold" :class="tile.cardio ? 'text-cyan-400 tabular-nums' : 'text-primary-500'">{{ tile.value }}</p>
              <p class="text-[12px] text-dark-300">{{ tile.label }}</p>
            </div>
          </div>

          <!-- Weekly goal for the groups this session trains — before the session, plus today on top -->
          <div v-if="goalRows.length" class="ws-goal mt-4 pt-3 border-t border-dark-700">
            <p v-if="allGoalsMet" class="ws-goal__done">✓ Ukesmålet er nådd for {{ metGroupNames }}</p>
            <template v-else>
              <p class="ws-goal__title">Ukesmålet</p>
              <!-- One grid for all rows, so every track starts and ends in the same place -->
              <div class="ws-goal__rows">
                <div v-for="row in goalRows" :key="row.kind + row.name" class="ws-goal__row">
                  <span class="ws-goal__name">{{ row.name }}</span>
                  <span class="ws-goal__track">
                    <span
                      :class="['ws-goal__seg', { 'ws-goal__seg--end': row.todayShare === 0 }]"
                      :style="{ left: '0', width: row.beforeShare * 100 + '%', background: goalRowColor(row) }"></span>
                    <span
                      v-if="row.todayShare > 0"
                      class="ws-goal__seg ws-goal__seg--today ws-goal__seg--end"
                      :style="{ left: row.beforeShare * 100 + '%', width: row.todayShare * 100 + '%', background: goalRowColor(row) }"></span>
                  </span>
                  <span :class="['ws-goal__value', { 'ws-goal__value--met': row.met }]">{{ goalRowValue(row) }}</span>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Complete Button -->
      <div class="mt-5">
        <button 
          @click="handleCompleteWorkout"
          class="w-full btn-primary py-3 flex items-center justify-center gap-2"
          :disabled="!canComplete"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Fullfør Økt
        </button>
        <p v-if="!canComplete" class="text-xs text-dark-400 text-center mt-2">
          {{ isCardioOnly ? 'Start klokka eller før inn tid for å kunne fullføre økten' : 'Du må fullføre minst ett sett for å kunne fullføre økten' }}
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

  <!-- ── Exercise bottom sheet ─────────────────────────────────────────── -->
  <Teleport to="body">
    <Transition name="ex-sheet">
      <div
        v-if="activeExerciseIndex !== null && session"
        class="ex-sheet"
        @click.self="closeExerciseSheet"
      >
        <!-- Backdrop -->
        <div class="ex-sheet__backdrop" @click="closeExerciseSheet"></div>

        <!-- Panel -->
        <div class="ex-sheet__panel">

          <!-- Drag handle -->
          <div class="ex-sheet__handle" role="button" tabindex="0" aria-label="Lukk" @click="closeExerciseSheet" @keydown.enter="closeExerciseSheet"></div>

          <!-- Header: prev / name+ref / next -->
          <div class="ex-sheet__header">
            <button
              class="ex-sheet__nav-btn"
              :disabled="activeExerciseIndex === 0"
              aria-label="Forrige øvelse"
              @click="prevExercise"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>

            <div class="ex-sheet__header-info">
              <p
                v-if="getParentGroupName(session.exercises[activeExerciseIndex].exerciseId)"
                class="ex-sheet__group"
              >
                {{ getParentGroupName(session.exercises[activeExerciseIndex].exerciseId) }}
              </p>
              <button
                class="ex-sheet__title-btn"
                @click="openExerciseQuickView(session.exercises[activeExerciseIndex].exerciseId, session.exercises[activeExerciseIndex].name)"
              >
                {{ session.exercises[activeExerciseIndex].name }}
                <svg class="w-3.5 h-3.5 text-dark-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                </svg>
              </button>
              <p
                v-if="lastPerformanceLabel(session.exercises[activeExerciseIndex].exerciseId) || getHeaviestLift(session.exercises[activeExerciseIndex].exerciseId)"
                class="ex-sheet__ref"
              >
                <span v-if="lastPerformanceLabel(session.exercises[activeExerciseIndex].exerciseId)">
                  {{ lastPerformanceLabel(session.exercises[activeExerciseIndex].exerciseId) }}
                </span>
                <span v-if="lastPerformanceLabel(session.exercises[activeExerciseIndex].exerciseId) && getHeaviestLift(session.exercises[activeExerciseIndex].exerciseId)" class="ex-sheet__ref-sep"> · </span>
                <span v-if="getHeaviestLift(session.exercises[activeExerciseIndex].exerciseId)" class="ex-sheet__ref-pb">
                  PB {{ formatKgShort(getHeaviestLift(session.exercises[activeExerciseIndex].exerciseId)!.weight) }}kg
                </span>
              </p>
            </div>

            <button
              class="ex-sheet__nav-btn"
              :disabled="activeExerciseIndex === session.exercises.length - 1"
              aria-label="Neste øvelse"
              @click="nextExercise"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>

          <!-- Position dots (only when multiple exercises) -->
          <div v-if="session.exercises.length > 1" class="ex-sheet__dots">
            <span
              v-for="(_, i) in session.exercises"
              :key="i"
              class="ex-sheet__dot"
              :class="{ 'ex-sheet__dot--active': i === activeExerciseIndex }"
            ></span>
          </div>

          <!-- Set table, or the stopwatch view for cardio -->
          <div class="ex-sheet__body">

            <CardioActivity
              v-if="activeExerciseIsCardio"
              :key="session.exercises[activeExerciseIndex].exerciseId"
              :exercise="session.exercises[activeExerciseIndex]"
              :now="now"
              @change="persistExercisesToLocal"
              @remove-exercise="removeExercise(activeExerciseIndex!)"
            />

            <template v-else>
            <!-- Unit for this exercise today — the kg machine may be taken — and body weight on top -->
            <div class="ex-unit-row">
              <div class="ex-unit" role="group" aria-label="Enhet">
                <button
                  v-for="unit in UNIT_OPTIONS"
                  :key="unit"
                  type="button"
                  class="ex-unit__btn"
                  :class="{ 'ex-unit__btn--on': activeUnit === unit }"
                  :aria-pressed="activeUnit === unit"
                  @click="setExerciseWeighing(activeExerciseIndex!, { unit, withBodyweight: activeWithBodyweight })"
                ><span class="ex-unit__label">{{ unit }}</span></button>
              </div>
              <button
                type="button"
                class="ex-unit__toggle"
                :class="{ 'ex-unit__toggle--on': activeWithBodyweight }"
                :aria-pressed="activeWithBodyweight"
                @click="setExerciseWeighing(activeExerciseIndex!, { unit: activeUnit, withBodyweight: !activeWithBodyweight })"
              >+ kroppsvekt</button>
            </div>
            <p v-if="activeWithBodyweight" class="ex-unit__bw">
              <template v-if="profileBodyweight">Kroppsvekt <strong>{{ formatKgShort(profileBodyweight) }} kg</strong> · fra profilen</template>
              <template v-else>Legg inn kroppsvekt under Profil for å få den med i volumet</template>
            </p>
            <!-- Column headers -->
            <div class="ex-set__headers">
              <span>#</span>
              <span>Reps</span>
              <span>{{ weightHeader }}</span>
              <!-- Volume is always kg, whatever unit the weight is typed in -->
              <span class="ex-set__col-right ex-set__head-volume">Volum (kg)</span>
            </div>

            <!-- Keyed wrapper: switching exercises remounts the list so TransitionGroup -->
            <!-- does not run leave/enter on the same DOM keys from different exercises -->
            <div class="ex-set__rows" :key="activeExerciseIndex">
            <TransitionGroup
              name="set"
              tag="div"
              enter-active-class="transition duration-200 ease-out"
              leave-active-class="transition duration-200 ease-in"
            >
              <div
                v-for="(set, setIndex) in session.exercises[activeExerciseIndex].sets"
                :key="set.id"
                class="ex-set__swipe-wrapper"
                @touchstart="setSwipe.onTouchStart($event, set.id)"
                @touchmove="setSwipe.onTouchMove($event, set.id)"
                @touchend="setSwipe.onTouchEnd(set.id)"
                @touchcancel="setSwipe.onTouchCancel()"
              >
                <!-- Swipe delete background -->
                <div
                  class="ex-set__swipe-bg"
                  :class="{ 'ex-set__swipe-bg--visible': setSwipe.revealed[set.id] }"
                >
                  <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </div>

                <!-- Actual row content, slides on swipe -->
                <div
                  class="ex-set__row"
                  :class="{ 'ex-set__row--done': set.isCompleted }"
                  :style="{ transform: `translateX(${setSwipe.offset[set.id] ?? 0}px)`, transition: setSwipe.offset[set.id] ? 'none' : 'transform 0.2s ease-out' }"
                >
                <span
                  class="ex-set__num"
                  :class="{ 'ex-set__num--done': set.isCompleted }"
                >{{ setIndex + 1 }}</span>

                <input
                  :value="set.reps === 0 ? '' : set.reps"
                  type="text"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  min="0"
                  class="ex-set__input"
                  :class="{ 'ex-set__input--done': set.isCompleted }"
                  :placeholder="getLastPerformance(session.exercises[activeExerciseIndex].exerciseId)?.reps?.toString() || '–'"
                  :id="`sreps-${activeExerciseIndex}-${setIndex}`"
                  :data-exercise-index="activeExerciseIndex"
                  :data-set-index="setIndex"
                  :ref="el => registerInputRef(activeExerciseIndex!, setIndex, 'reps', el as HTMLInputElement)"
                  @focus="markFocus"
                  @input="(event) => handleRepsInput(event, activeExerciseIndex!, setIndex)"
                  @blur="(event) => handleRepsBlur(event, activeExerciseIndex!, setIndex)"
                />

                <input
                  :value="set.weight === 0 ? '' : set.weight"
                  type="text"
                  inputmode="decimal"
                  pattern="^[0-9]+([\\.,][0-9]{1,2})?$"
                  min="0"
                  step="0.5"
                  class="ex-set__input"
                  :class="{ 'ex-set__input--done': set.isCompleted }"
                  :placeholder="weightPlaceholder(session.exercises[activeExerciseIndex].exerciseId)"
                  :id="`sweight-${activeExerciseIndex}-${setIndex}`"
                  :data-exercise-index="activeExerciseIndex"
                  :data-set-index="setIndex"
                  :ref="el => registerInputRef(activeExerciseIndex!, setIndex, 'weight', el as HTMLInputElement)"
                  @focus="markFocus"
                  @input="(event) => handleWeightInput(event, activeExerciseIndex!, setIndex)"
                  @blur="(event) => handleWeightBlur(event, activeExerciseIndex!, setIndex)"
                />

                <span class="ex-set__vol" :class="{ 'ex-set__vol--done': set.isCompleted }">
                  {{ isSetLogged(session.exercises[activeExerciseIndex], set) ? formatNumber(setVolume(session.exercises[activeExerciseIndex], set)) : '–' }}
                </span>
                </div><!-- /.ex-set__row -->
              </div><!-- /.ex-set__swipe-wrapper -->
            </TransitionGroup>
            </div>

            <!-- Sheet footer: volume + add set -->
            <div class="ex-card__footer">
              <span class="ex-card__footer-vol">
                {{ formatNumber(calculateExerciseVolume(session.exercises[activeExerciseIndex])) }} kg totalt
              </span>
              <button class="ex-card__add-set" @click="addSet(activeExerciseIndex)">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
                </svg>
                Sett
              </button>
            </div>
            </template>

          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* TransitionGroup fade for set rows */
.set-enter-from, .set-leave-to { opacity: 0; }
.set-leave-from, .set-enter-to { opacity: 1; }

/* ── Compact exercise row list ───────────────────────────────────────────── */

.ex-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-top: 0.75rem;
}

/* SwipeableCard wrapper inside ex-list needs overflow hidden for the swipe animation */
.ex-list > * {
  border-radius: 0.875rem;
  overflow: hidden;
}

.ex-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.8125rem 1rem;
  background: #0d1117;
  border: none;
  border-bottom: none;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background 0.15s;
  -webkit-tap-highlight-color: transparent;
  border-radius: 0.875rem;
  /* A long press must not raise iOS' selection callout on the row. */
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

/* ── Drag to reorder ─────────────────────────────────────────────────────── */

/* The list clips its children for the swipe animation; the lifted card needs
   to escape that so its shadow isn't cut off. */
.ex-list > .ex-item--dragging {
  overflow: visible;
  position: relative;
  z-index: 20;
}

.ex-item--dragging .ex-row {
  background: #16202f;
  transform: scale(1.02);
  box-shadow: 0 14px 30px -10px rgba(0, 0, 0, 0.7);
  cursor: grabbing;
}

.ex-row:hover, .ex-row:active { background: #131c2b; }
.ex-row--done { background: #052e160a; }
.ex-row--done:hover { background: #052e1612; }

.ex-row__dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--ex-color, #374151);
  flex-shrink: 0;
  opacity: 0.85;
}

.ex-row__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.ex-row__name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #f3f4f6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ex-row--done .ex-row__name { color: #86efac; }

.ex-row__ref {
  font-size: 0.6875rem;
  color: #4b5563;
}

.ex-row__right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.ex-row__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 700;
  padding: 0.1875rem 0.5rem;
  border-radius: 999px;
  background: #1f2937;
  color: #6b7280;
  white-space: nowrap;
}

.ex-row__badge--done {
  background: #16a34a1a;
  color: #4ade80;
}

/* A stopwatch running in the background, visible from the list. */
.ex-row__badge--running {
  background: #06b6d41a;
  color: #22d3ee;
  font-variant-numeric: tabular-nums;
}

.ex-row__live-dot {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 50%;
  background: currentColor;
  animation: ex-row-pulse 1.4s ease-in-out infinite;
}

@keyframes ex-row-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

@media (prefers-reduced-motion: reduce) {
  .ex-row__live-dot { animation: none; }
}

.ex-row__chevron {
  width: 1rem;
  height: 1rem;
  color: #374151;
  flex-shrink: 0;
}

/* ── Bottom sheet ────────────────────────────────────────────────────────── */

.ex-sheet {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.ex-sheet__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(2px);
}

.ex-sheet__panel {
  position: relative;
  z-index: 1;
  background: #1a2233;
  border-top: 1px solid #2d3a4f;
  border-radius: 1.25rem 1.25rem 0 0;
  max-height: 88dvh;
  overflow-y: auto;
  overscroll-behavior: contain;
}

/* Drag handle */
/* The visible bar is 4px; the tap target is the full width of the sheet top,
   so closing doesn't take aim. */
.ex-sheet__handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 1.5rem;
  cursor: pointer;
}

.ex-sheet__handle::before {
  content: '';
  width: 2.5rem;
  height: 0.25rem;
  background: #4b5563;
  border-radius: 999px;
  transition: background 0.15s;
}

.ex-sheet__handle:hover::before { background: #9ca3af; }

/* Sheet header */
.ex-sheet__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 1rem 0.5rem;
}

.ex-sheet__header-info {
  flex: 1;
  min-width: 0;
  text-align: center;
}

.ex-sheet__group {
  font-size: 0.625rem;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #5a6e85;
  margin-bottom: 0.125rem;
}

.ex-sheet__title-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  font-size: 1rem;
  font-weight: 700;
  color: #f9fafb;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.15s;
}

.ex-sheet__title-btn:hover { color: #f97316; }

.ex-sheet__ref {
  font-size: 0.6875rem;
  color: #7b8fa8;
  margin-top: 0.25rem;
}

.ex-sheet__ref-sep { color: #374151; }

.ex-sheet__ref-pb { color: #f59e0baa; }

.ex-sheet__nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.625rem;
  background: #243044;
  border: 1px solid #3d5068;
  color: #9ca3af;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
}

.ex-sheet__nav-btn:hover:not(:disabled) {
  background: #2d3a4f;
  color: #f3f4f6;
}

.ex-sheet__nav-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

/* Position dots */
.ex-sheet__dots {
  display: flex;
  justify-content: center;
  gap: 0.375rem;
  padding-bottom: 0.5rem;
}

.ex-sheet__dot {
  width: 0.3125rem;
  height: 0.3125rem;
  border-radius: 50%;
  background: #4b5a6e;
  transition: background 0.2s, transform 0.2s;
}

.ex-sheet__dot--active {
  background: #f97316;
  transform: scale(1.4);
}

/* Sheet body scrollable area */
.ex-sheet__body {
  border-top: 1px solid #2d3a4f;
}

/* ── Weight unit selector: plain text, so it stays quieter than the set fields ── */
/* Every button keeps the 44px tap area from style.css; only the look is small. */

.ex-unit-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* Lines «kg» up over the set numbers and «+ kroppsvekt» over the volume column */
  margin: 0.25rem 0.5rem 0.25rem 0.75rem;
}

.ex-unit {
  display: flex;
}

.ex-unit__btn {
  position: relative;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #64748b;
  transition: color 0.15s;
}

/* The dot between kg and lbs sits on the seam, so it takes no room of its own */
.ex-unit__btn + .ex-unit__btn::before {
  content: "·";
  position: absolute;
  left: 0;
  top: 50%;
  transform: translate(-50%, -50%);
  color: #3d5068;
  pointer-events: none;
}

.ex-unit__btn--on {
  color: #f1f5f9;
}

/* The underline is always there, just transparent when off, so the text never shifts */
.ex-unit__label {
  padding-bottom: 2px;
  border-bottom: 2px solid transparent;
  transition: border-color 0.15s;
}

.ex-unit__btn--on .ex-unit__label {
  border-bottom-color: #f97316;
}

/* On/off as text: dim when off, toned orange when on; tap again to turn it off */
.ex-unit__toggle {
  display: inline-flex;
  align-items: center;
  padding: 0 0.5rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #64748b;
  white-space: nowrap;
  transition: color 0.15s;
}

.ex-unit__toggle--on {
  color: #fdba74;
}

.ex-unit__bw {
  margin: -0.25rem 1rem 0.75rem;
  font-size: 0.75rem;
  color: #94a3b8;
}

.ex-unit__bw strong {
  font-weight: 600;
  color: #e2e8f0;
}

/* ── Set table (shared between sheet and any future use) ─────────────────── */

.ex-set__headers {
  display: grid;
  grid-template-columns: 2.25rem 1fr 1fr 3.75rem;
  gap: 0.5rem;
  padding: 0.375rem 1rem;
  background: #131e2e;
  border-bottom: 1px solid #2d3a4f;
}

.ex-set__headers span {
  font-size: 0.5625rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: #6b7a8d;
}

.ex-set__col-right { text-align: right; }

/* Wider than its column: keep it on one line and let it reach left into the weight column */
.ex-set__head-volume {
  justify-self: end;
  white-space: nowrap;
}

.ex-set__row {
  display: grid;
  grid-template-columns: 2.25rem 1fr 1fr 3.75rem;
  gap: 0.5rem;
  align-items: center;
  padding: 0.5rem 1rem;
  background: #1a2233;
  transition: background 0.15s;
}

.ex-set__row--done { background: #16a34a12; }

/* ── Set row swipe-to-delete ─────────────────────────────────────────────── */

.ex-set__swipe-wrapper {
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid #2d3a4f80;
}

.ex-set__swipe-wrapper:last-child { border-bottom: none; }

.ex-set__swipe-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 1.25rem;
  opacity: 0;
  transition: opacity 0.15s;
}

.ex-set__swipe-bg--visible { opacity: 1; }

.ex-set__num {
  width: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7a8d;
  flex-shrink: 0;
  user-select: none;
}

.ex-set__num--done { color: #4ade8070; }

.ex-set__input {
  width: 100%;
  height: 2.75rem;
  padding: 0 0.5rem;
  font-size: 1.0625rem;
  font-weight: 700;
  color: #f3f4f6;
  background: #243044;
  border: 1px solid #3d5068;
  border-radius: 0.625rem;
  text-align: center;
  -webkit-appearance: none;
  appearance: none;
  transition: border-color 0.15s, background 0.15s;
}

.ex-set__input::placeholder { color: #5a6e85; font-weight: 400; font-size: 0.875rem; }
.ex-set__input:focus { outline: none; border-color: #f97316; background: #2d3a4f; box-shadow: 0 0 0 3px #f9731620; }
.ex-set__input--done { color: #86efac; border-color: #16a34a50; background: #16a34a15; }

.ex-set__input--right { text-align: right; }

.ex-set__vol {
  text-align: right;
  font-size: 0.6875rem;
  font-weight: 600;
  color: #6b7a8d;
  white-space: nowrap;
}

.ex-set__vol--done { color: #4ade8080; }

/* Sheet footer */
.ex-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 1rem;
  padding-bottom: calc(0.625rem + env(safe-area-inset-bottom));
  background: #131e2e;
  border-top: 1px solid #2d3a4f;
}

.ex-card__footer-vol { font-size: 0.6875rem; color: #7b8fa8; }

.ex-card__add-set {
  display: inline-flex;
  align-items: center;
  gap: 0.3125rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #f97316;
  background: #f9731612;
  border: 1px solid #f9731630;
  border-radius: 0.5rem;
  padding: 0.4375rem 0.875rem;
  cursor: pointer;
  transition: background 0.15s;
}

.ex-card__add-set:hover { background: #f9731622; }

/* ── Sheet slide-up transition ───────────────────────────────────────────── */

.ex-sheet-enter-active { transition: opacity 0.25s ease; }
.ex-sheet-leave-active { transition: opacity 0.2s ease; }
.ex-sheet-enter-from, .ex-sheet-leave-to { opacity: 0; }

.ex-sheet-enter-active .ex-sheet__panel {
  transition: transform 0.32s cubic-bezier(0.32, 0.72, 0, 1);
}

.ex-sheet-leave-active .ex-sheet__panel {
  transition: transform 0.22s cubic-bezier(0.4, 0, 1, 1);
}

.ex-sheet-enter-from .ex-sheet__panel,
.ex-sheet-leave-to .ex-sheet__panel {
  transform: translateY(100%);
}

.session-reset-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #9ca3af;
  background: transparent;
  border: 1px solid #374151;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  white-space: nowrap;
  margin-left: auto;
}

.session-reset-btn:hover {
  color: #f87171;
  border-color: #f8717140;
}

.session-reset-confirm {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-left: auto;
}

.session-reset-confirm__label {
  font-size: 0.8125rem;
  color: #9ca3af;
  white-space: nowrap;
}

/* ── Weekly goal in the summary box ───────────────────────────────────────── */

.ws-goal__title {
  margin: 0 0 0.375rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #64748b;
}

.ws-goal__rows {
  display: grid;
  grid-template-columns: 4.5rem minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.625rem;
}

.ws-goal__row {
  display: contents;
}

.ws-goal__name {
  overflow: hidden;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #f1f5f9;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ws-goal__track {
  position: relative;
  height: 0.375rem;
  overflow: hidden;
  background: #0d1117;
  border-radius: 0 4px 4px 0;
}

.ws-goal__seg {
  position: absolute;
  top: 0;
  bottom: 0;
  transition: width 0.3s ease-out, left 0.3s ease-out;
}

/* Today's sets: same colour, lighter — no new shades */
.ws-goal__seg--today {
  opacity: 0.5;
}

/* DESIGN.md bars: straight start, 4px rounding on the data end */
.ws-goal__seg--end {
  border-radius: 0 4px 4px 0;
}

.ws-goal__value {
  /* Room for "15 / 15 ✓", so the column doesn't jump when a row is met */
  min-width: 4.5rem;
  font-size: 0.75rem;
  color: #cbd5e1;
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}

.ws-goal__value--met {
  color: #4ade80;
}

.ws-goal__done {
  margin: 0;
  font-size: 0.8125rem;
  color: #4ade80;
}

@media (prefers-reduced-motion: reduce) {
  .ws-goal__seg {
    transition: none;
  }
}
</style>


