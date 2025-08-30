<template>
  <div>
    <!-- Breadcrumbs -->
    <Breadcrumbs 
      :breadcrumbs="[
        { name: 'Øvelser', path: '/exercises' },
        { name: exercise?.name || 'Øvelse' }
      ]"
    />

    <!-- Header -->
    <div class="mb-4 mt-4">
      <div class="flex items-center gap-3">
        <router-link 
          to="/exercises" 
          class="inline-flex items-center justify-center w-10 h-10 bg-[#3F302A] hover:bg-[#4A3A32] rounded-lg transition-colors"
        >
          <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </router-link>
        <h1 class="text-2xl font-bold text-white" @click="openGoogleSearch">{{ exercise?.name }}</h1>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-6 animate-pulse">
      <div class="card">
        <div class="h-6 bg-dark-600 rounded w-32 mb-4"></div>
        <div class="flex flex-wrap gap-3">
          <div v-for="i in 4" :key="i" class="h-8 bg-dark-600 rounded-lg w-20"></div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div v-for="i in 6" :key="i" class="card text-center space-y-2">
          <div class="h-8 bg-dark-600 rounded w-16 mx-auto"></div>
          <div class="h-4 bg-dark-600 rounded w-20 mx-auto"></div>
        </div>
      </div>

      <div class="card">
        <div class="h-6 bg-dark-600 rounded w-48 mb-4"></div>
        <div class="h-64 bg-dark-700 rounded-lg"></div>
      </div>

      <div class="card">
        <div class="h-6 bg-dark-600 rounded w-40 mb-4"></div>
        <div class="space-y-3">
          <div v-for="i in 5" :key="i" class="bg-dark-700 rounded-lg p-3 space-y-2">
            <div class="h-4 bg-dark-600 rounded w-32"></div>
            <div class="h-3 bg-dark-600 rounded w-24"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main -->
    <div v-else-if="exercise" class="space-y-6">
      <!-- Variant Details -->
      <div>
        <!-- Muscle Groups -->
        <div v-if="exercise?.muscleGroups && exercise.muscleGroups.length > 0" class="mt-2 mb-4">
          <div class="flex flex-wrap gap-2">
            <span 
              v-for="muscleGroup in exercise.muscleGroups" 
              :key="muscleGroup"
              class="inline-block px-3 py-1 text-sm font-medium rounded-full"
              :style="{
                backgroundColor: getMuscleGroupColor(muscleGroup) + '20',
                color: getMuscleGroupColor(muscleGroup)
              }"
            >
              {{ muscleGroup }}
            </span>
          </div>
        </div>
      </div>

      <!-- Stats Overview -->
      <div class="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div class="card text-center">
          <p class="text-2xl font-bold text-primary-500">{{ totalSessions }}</p>
          <p class="text-sm text-dark-300">Totale økter</p>
        </div>
        <div class="card text-center">
          <p class="text-2xl font-bold text-primary-500">{{ totalSets }}</p>
          <p class="text-sm text-dark-300">Totale sett</p>
        </div>
        <div class="card text-center">
          <p class="text-2xl font-bold text-primary-500">{{ totalReps }}</p>
          <p class="text-sm text-dark-300">Totale reps</p>
        </div>
        <div class="card text-center">
          <p class="text-2xl font-bold text-primary-500">{{ oneRepMax }}kg</p>
          <p class="text-sm text-dark-300">1RM</p>
        </div>
        <div class="card text-center">
          <p class="text-2xl font-bold text-primary-500">{{ averageWeight }}kg</p>
          <p class="text-sm text-dark-300">Gjennomsnitt</p>
        </div>
        <div class="card text-center">
          <p class="text-2xl font-bold text-primary-500">{{ lastWorkout }}</p>
          <p class="text-sm text-dark-300">Sist trent</p>
        </div>
      </div>

      <!-- Fremgang over tid (ApexCharts) -->
      <div class="card">
        <h3 class="text-lg font-semibold text-white mb-4">Fremgang (beste sett per uke)</h3>
        <div v-if="progressCategories.length > 0" class="h-72">
          <VueApexCharts
            :options="progressOptions"
            :series="progressSeries"
            type="line"
            height="100%"
          />
        </div>
        <div v-else class="h-32 flex items-center justify-center text-dark-300 text-sm">
          Ingen data ennå for denne øvelsen.
        </div>
      </div>

      <!-- Estimert 1RM (Epley) (ApexCharts) -->
      <div class="card">
        <h3 class="text-lg font-semibold text-white mb-4">Estimert 1RM (Epley) per uke</h3>
        <div v-if="epleyCategories.length > 0" class="h-72">
          <VueApexCharts
            :options="epleyOptions"
            :series="epleySeries"
            type="line"
            height="100%"
          />
        </div>
        <div v-else class="h-32 flex items-center justify-center text-dark-300 text-sm">
          Ingen data ennå for denne øvelsen.
        </div>
      </div>

      <!-- PR-tavle -->
      <div class="card">
        <h3 class="text-lg font-semibold text-white mb-4">PR-tavle</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div 
            v-for="rep in repTargets" 
            :key="rep" 
            class="bg-dark-700 rounded-lg p-3 text-center"
          >
            <div class="text-xs text-dark-300 mb-1">{{ rep }} ×</div>
            <div class="text-xl font-bold text-primary-500">
              {{ prBoard[rep]?.weight ?? '-' }}<span v-if="prBoard[rep]?.weight">kg</span>
            </div>
            <div class="text-xs text-dark-400" v-if="prBoard[rep]?.date">{{ formatDate(prBoard[rep]!.date) }}</div>
          </div>
        </div>
      </div>

      <!-- Intensitet og Volumtrend -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="card">
          <h3 class="text-lg font-semibold text-white mb-4">Intensitet</h3>
          <div class="text-xs text-dark-300 mb-2">Snitt kg/rep per uke</div>
          <div class="space-y-2">
            <div v-for="w in weeklyIntensityData" :key="w.weekKey" class="flex items-center justify-between bg-dark-700 rounded p-2">
              <span class="text-dark-300">Uke {{ w.weekNumber }}</span>
              <span class="text-white font-medium">{{ Math.round(w.intensity) }} kg/rep</span>
            </div>
            <div v-if="weeklyIntensityData.length === 0" class="text-dark-300 text-sm">Ingen data ennå</div>
          </div>
        </div>
        <div class="card">
          <h3 class="text-lg font-semibold text-white mb-4">Volumtopp og trend</h3>
          <div class="space-y-2 text-sm">
            <div class="flex items-center justify-between">
              <span class="text-dark-300">Beste uke</span>
              <span class="text-white font-medium">{{ volumeWeekStats.bestWeek.volume }} kg (Uke {{ volumeWeekStats.bestWeek.weekNumber }})</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-dark-300">Beste måned</span>
              <span class="text-white font-medium">{{ formatNumber(volumeWeekStats.bestMonth.volume) }} kg ({{ volumeWeekStats.bestMonth.label }})</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-dark-300">4-ukers trend</span>
              <span :class="volumeWeekStats.trendDelta >= 0 ? 'text-green-400' : 'text-red-400'">
                {{ volumeWeekStats.trendDelta >= 0 ? '+' : '' }}{{ Math.round(volumeWeekStats.trendDelta) }}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Siste prestasjoner -->
      <div class="card">
        <h3 class="text-lg font-semibold text-white mb-4">Siste prestasjoner</h3>
        <div v-if="recentPerformances.length === 0" class="text-center py-8">
          <p class="text-dark-300">Ingen data ennå</p>
        </div>
        <div v-else class="space-y-3">
          <div 
            v-for="performance in recentPerformances" 
            :key="performance.id"
            class="flex items-center justify-between p-3 bg-dark-700 rounded-lg"
          >
            <div>
              <p class="text-white font-medium">
                {{ performance.weight }}kg × {{ performance.reps }} reps
              </p>
              <p class="text-sm text-dark-300">
                {{ formatDate(performance.date) }}
              </p>
            </div>
            <div class="text-right">
              <p class="text-primary-500 font-medium">
                {{ performance.volume }}kg totalt
              </p>
              <p class="text-xs text-dark-400">
                {{ performance.sessionName }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-12">
      <p class="text-dark-300">Øvelse ikke funnet</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHybridData } from '@/composables/useHybridData'
import Breadcrumbs from '@/components/Breadcrumbs.vue'
import muscleGroups from '@/data/muscle-groups.json'

// Charts
import VueApexCharts from 'vue3-apexcharts'
import type { ApexOptions } from 'apexcharts'

/** ========= Types ========= */
type Performance = {
  id: string
  weight: number
  reps: number
  volume: number
  date: Date
  sessionName?: string
}
type WeeklyIntensityItem = { weekKey: number; weekNumber: number; intensity: number }
type VolumeWeekStats = {
  bestWeek: { weekNumber: number; volume: number }
  bestMonth: { label: string; volume: number }
  trendDelta: number
}
type PRItem = { weight: number; date: Date }

/** ========= Setup ========= */
const route = useRoute()
const router = useRouter()
const workoutData = useHybridData()

/** ========= Helpers ========= */
// ID-match uansett type (string/number)
const sameId = (a: any, b: any) => String(a) === String(b)

// Parse numbers (støtter komma og enheter som "kg")
const parseNum = (v: any): number | null => {
  if (typeof v === 'number') return isFinite(v) ? v : null
  if (typeof v === 'string') {
    const norm = v.replace(',', '.')
    const m = norm.match(/-?\d+(\.\d+)?/)
    if (!m) return null
    const n = Number(m[0])
    return isFinite(n) ? n : null
  }
  return null
}

const toDate = (d: any): Date => (d instanceof Date ? d : new Date(d))

const parseMaybeDate = (v: any): Date | null => {
  if (!v && v !== 0) return null
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v

  if (typeof v === 'number') {
    if (v > 10_000_000_000) {
      const ms = new Date(v)
      return isNaN(ms.getTime()) ? null : ms
    }
    const sec = new Date(v * 1000)
    return isNaN(sec.getTime()) ? null : sec
  }

  if (typeof v === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
    if (m) {
      const [, y, mon, d] = m
      const dt = new Date(Date.UTC(Number(y), Number(mon) - 1, Number(d)))
      return isNaN(dt.getTime()) ? null : dt
    }
    const d2 = new Date(v)
    return isNaN(d2.getTime()) ? null : d2
  }
  return null
}

const getSafeDate = (session: any, set?: any): Date => {
  const candidates = [
    session?.date,
    session?.completedAt,
    session?.startedAt,
    session?.createdAt,
    set?.date,
    set?.completedAt,
  ]
  for (const c of candidates) {
    const d = parseMaybeDate(c)
    if (d) return d
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

const startOfIsoWeek = (input: Date): Date => {
  const d = new Date(input)
  const day = (d.getDay() + 6) % 7 // Mon=0..Sun=6
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}
const getWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}
const safeWeekKey = (d: Date): number => startOfIsoWeek(d).getTime()

/** ========= State ========= */
const isLoading = computed(() => workoutData.isLoading.value)
const exercise = ref<any>(null)

/** ========= Core computed data ========= */

// Alle gyldige sett for denne øvelsen
const performances = computed<Performance[]>(() => {
  if (!exercise.value) return []
  const allPerformances: Performance[] = []

  ;(workoutData.sessions.value || [])
    .filter((session: any) => (session.isCompleted ?? true)) // tillat hvis undefined
    .forEach((session: any) => {
      const sessionExercise = session.exercises?.find((e: any) => sameId(e.exerciseId, exercise.value.id))
      if (!sessionExercise) return

      ;(sessionExercise.sets || []).forEach((set: any) => {
        if (set.isCompleted === false) return
        if (!(set.weight && set.reps)) return

        const weight = parseNum(set.weight)
        const reps = parseNum(set.reps)
        if (weight === null || reps === null) return
        if (weight <= 0 || reps <= 0) return

        const d = getSafeDate(session, set)

        allPerformances.push({
          id: `${session.id}-${set.id}`,
          weight,
          reps,
          volume: weight * reps,
          date: d,
          sessionName: session.templateName
        })
      })
    })

  return allPerformances
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 500)
})

// Siste 3 sett
const recentPerformances = computed(() => performances.value.slice(0, 3))

/** ========= Weekly buckets for charts ========= */
const weeksToShow = 12

const weeklyBuckets = computed(() => {
  // key: weekStart (ms) → { weekNumber, label, maxWeight, maxEpley }
  const m = new Map<number, { weekNumber: number; label: string; maxWeight: number; maxEpley: number }>()
  performances.value.forEach(p => {
    const ws = safeWeekKey(p.date)
    const d = new Date(ws)
    const wNum = getWeekNumber(d)
    const label = `Uke ${wNum}`
    const epley = p.weight * (1 + (p.reps || 0) / 30)

    if (!m.has(ws)) {
      m.set(ws, { weekNumber: wNum, label, maxWeight: p.weight, maxEpley: epley })
    } else {
      const cur = m.get(ws)!
      cur.maxWeight = Math.max(cur.maxWeight, p.weight)
      cur.maxEpley = Math.max(cur.maxEpley, epley)
    }
  })

  return Array.from(m.entries())
    .sort((a, b) => a[0] - b[0])
    .slice(-weeksToShow)
    .map(([ws, v]) => ({ ...v, ws }))
})

/** ========= Charts: progress (weight) ========= */
const progressCategories = computed(() => weeklyBuckets.value.map(b => b.label))
const progressSeries = computed(() => [{
  name: 'Maks kg',
  data: weeklyBuckets.value.map(b => Math.round(b.maxWeight))
}])

const progressOptions = computed<ApexOptions>(() => ({
  chart: { 
    id: 'progress-weight', 
    toolbar: { show: false }, 
    foreColor: '#CBD5E1' // Update this to your app's text color
  },
  stroke: { 
    curve: 'smooth', 
    width: 3, 
    colors: ['#FF5733'] // Update this to your app's primary color
  },
  markers: { 
    size: 4, 
    colors: ['#FF5733'] // Update this to your app's primary color
  },
  grid: { 
    borderColor: '#CBD5E1' // Update this to your app's grid color
  },
  xaxis: { 
    categories: progressCategories.value, 
    labels: { 
      rotate: 0, 
      style: { 
        colors: '#CBD5E1', // Update this to your app's text color
        fontSize: '12px', 
        fontFamily: 'Inter, system-ui, sans-serif' // Update this to your app's font
      }
    }
  },
  yaxis: { 
    labels: { 
      formatter: (v) => `${Math.round(v)} kg`,
      style: { 
        colors: '#CBD5E1', // Update this to your app's text color
        fontSize: '12px', 
        fontFamily: 'Inter, system-ui, sans-serif' // Update this to your app's font
      }
    }
  },
  tooltip: { 
    y: { 
      formatter: (v) => `${Math.round(v)} kg` 
    }
  }
}))

/** ========= Charts: Epley 1RM ========= */
const epleyCategories = computed(() => weeklyBuckets.value.map(b => b.label))
const epleySeries = computed(() => [{
  name: 'Estimert 1RM',
  data: weeklyBuckets.value.map(b => Math.round(b.maxEpley))
}])

const epleyOptions = computed<ApexOptions>(() => ({
  chart: { 
    id: 'epley-1rm', 
    toolbar: { show: false }, 
    foreColor: '#CBD5E1' // Update this to your app's text color
  },
  stroke: { 
    curve: 'smooth', 
    width: 3, 
    colors: ['#FF5733'] // Update this to your app's primary color
  },
  markers: { 
    size: 4, 
    colors: ['#FF5733'] // Update this to your app's primary color
  },
  grid: { 
    borderColor: '#CBD5E1' // Update this to your app's grid color
  },
  xaxis: { 
    categories: epleyCategories.value, 
    labels: { 
      rotate: 0, 
      style: { 
        colors: '#CBD5E1', // Update this to your app's text color
        fontSize: '12px', 
        fontFamily: 'Inter, system-ui, sans-serif' // Update this to your app's font
      }
    }
  },
  yaxis: { 
    labels: { 
      formatter: (v) => `${Math.round(v)} kg`,
      style: { 
        colors: '#CBD5E1', // Update this to your app's text color
        fontSize: '12px', 
        fontFamily: 'Inter, system-ui, sans-serif' // Update this to your app's font
      }
    }
  },
  tooltip: { 
    y: { 
      formatter: (v) => `${Math.round(v)} kg` 
    }
  }
}))

/** ========= Other stats ========= */
const repTargets = [1, 3, 4, 6, 8, 10, 12, 14]
const prBoard = computed<Record<number, PRItem | undefined>>(() => {
  const best: Record<number, PRItem | undefined> = {}
  performances.value.forEach(p => {
    if (!p.reps || !p.weight) return
    if (repTargets.includes(p.reps)) {
      const existing = best[p.reps]
      if (!existing || p.weight > existing.weight) {
        best[p.reps] = { weight: p.weight, date: toDate(p.date) }
      }
    }
  })
  return best
})

const weeklyIntensityData = computed<WeeklyIntensityItem[]>(() => {
  if (performances.value.length === 0) return []
  const byWeek: Record<number, { weekNumber: number; vol: number; reps: number; date: Date }> = {}
  performances.value.forEach(p => {
    const d = toDate(p.date)
    if (isNaN(d.getTime())) return
    const wk = safeWeekKey(d)
    if (!byWeek[wk]) byWeek[wk] = { weekNumber: getWeekNumber(new Date(wk)), vol: 0, reps: 0, date: new Date(wk) }
    byWeek[wk].vol += p.weight * (p.reps || 0)
    byWeek[wk].reps += (p.reps || 0)
  })
  return Object.entries(byWeek)
    .map(([k, w]) => ({ weekKey: Number(k), weekNumber: w.weekNumber, intensity: w.reps > 0 ? w.vol / w.reps : 0 }))
    .sort((a, b) => a.weekKey - b.weekKey)
})

const volumeWeekStats = computed<VolumeWeekStats>(() => {
  const weekMap: Record<number, number> = {}
  const monthMap: Record<string, number> = {}

  performances.value.forEach(p => {
    const d = toDate(p.date)
    const ws = startOfIsoWeek(d).getTime()
    weekMap[ws] = (weekMap[ws] || 0) + p.weight * (p.reps || 0)

    const mKey = `${d.getFullYear()}-${d.getMonth()}`
    monthMap[mKey] = (monthMap[mKey] || 0) + p.weight * (p.reps || 0)
  })

  const bestWeekEntry = Object.entries(weekMap)
    .map(([k, v]) => ({ date: new Date(Number(k)), volume: v }))
    .sort((a, b) => b.volume - a.volume)[0] ?? { date: new Date(), volume: 0 }
  const bestWeek = { weekNumber: getWeekNumber(bestWeekEntry.date), volume: Math.round(bestWeekEntry.volume) }

  const bestMonthEntry = Object.entries(monthMap)
    .map(([k, v]) => {
      const [y, m] = k.split('-').map(Number)
      return { label: new Intl.DateTimeFormat('no-NO', { month: 'short', year: 'numeric' }).format(new Date(y, m, 1)), volume: Math.round(v) }
    })
    .sort((a, b) => b.volume - a.volume)[0] ?? { label: '', volume: 0 }

  const sortedWeeks = Object.entries(weekMap)
    .map(([k, v]) => ({ date: new Date(Number(k)), volume: v }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
  const last4 = sortedWeeks.slice(-4).reduce((s, x) => s + x.volume, 0)
  const prev4 = sortedWeeks.slice(-8, -4).reduce((s, x) => s + x.volume, 0)
  const trendDelta = prev4 > 0 ? ((last4 - prev4) / prev4) * 100 : 0

  return { bestWeek, bestMonth: bestMonthEntry, trendDelta }
})

const maxWeight = computed(() => {
  if (performances.value.length === 0) return 100
  const validWeights = performances.value.map(p => p.weight).filter(w => isFinite(w))
  if (validWeights.length === 0) return 100
  const max = Math.max(...validWeights)
  return isFinite(max) ? max : 100
})

const totalSessions = computed(() => {
  if (!exercise.value) return 0
  return (workoutData.sessions.value || [])
    .filter((session: any) => (session.isCompleted ?? true))
    .filter((session: any) => session.exercises?.some((e: any) => sameId(e.exerciseId, exercise.value.id)))
    .length
})

const totalSets = computed(() => {
  if (!exercise.value) return 0
  let total = 0
  ;(workoutData.sessions.value || [])
    .filter((session: any) => (session.isCompleted ?? true))
    .forEach((session: any) => {
      const exerciseData = session.exercises?.find((e: any) => sameId(e.exerciseId, exercise.value.id))
      if (exerciseData) total += (exerciseData.sets || []).filter((set: any) => (set.isCompleted ?? true)).length
    })
  return total
})

const totalReps = computed(() => {
  if (!exercise.value) return 0
  let total = 0
  ;(workoutData.sessions.value || [])
    .filter((session: any) => (session.isCompleted ?? true))
    .forEach((session: any) => {
      const exerciseData = session.exercises?.find((e: any) => sameId(e.exerciseId, exercise.value.id))
      if (exerciseData) {
        (exerciseData.sets || []).forEach((set: any) => {
          if (set.isCompleted === false) return
          if (set.reps) {
            const r = parseNum(set.reps)
            if (r) total += r
          }
        })
      }
    })
  return total
})

const personalBest = computed(() => {
  if (!exercise.value) return { weight: 0, reps: 0 }
  let oneRepMax = 0
  ;(workoutData.sessions.value || [])
    .filter((session: any) => (session.isCompleted ?? true))
    .forEach((session: any) => {
      const exerciseData = session.exercises?.find((e: any) => sameId(e.exerciseId, exercise.value.id))
      if (exerciseData) {
        (exerciseData.sets || []).forEach((set: any) => {
          if (set.isCompleted === false) return
          if (set.weight && set.reps === 1) {
            const w = parseNum(set.weight)
            if (w && w > oneRepMax) oneRepMax = w
          }
        })
      }
    })
  return { weight: oneRepMax, reps: 1 }
})

const oneRepMax = computed(() => {
  if (!exercise.value) return 0
  let max = 0
  ;(workoutData.sessions.value || [])
    .filter((session: any) => (session.isCompleted ?? true))
    .forEach((session: any) => {
      const exerciseData = session.exercises?.find((e: any) => sameId(e.exerciseId, exercise.value.id))
      if (exerciseData) {
        (exerciseData.sets || []).forEach((set: any) => {
          if (set.isCompleted === false) return
          if (set.weight && set.reps === 1) {
            const w = parseNum(set.weight)
            if (w && w > max) max = w
          }
        })
      }
    })
  return max
})

const averageWeight = computed(() => {
  if (performances.value.length === 0) return 0
  const total = performances.value.reduce((sum, p) => sum + p.weight, 0)
  return Math.round(total / performances.value.length)
})

const lastWorkout = computed(() => {
  if (performances.value.length === 0) return 'Aldri'
  const lastDate = toDate(performances.value[0].date)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'I dag'
  if (diffDays === 1) return 'I går'
  if (diffDays < 7) return `${diffDays} dager siden`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} uker siden`
  return `${Math.floor(diffDays / 30)} måneder siden`
})

/** ========= Methods ========= */
const openGoogleSearch = () => {
  if (exercise.value?.name) {
    const searchQuery = encodeURIComponent(`${exercise.value.name} strength training exercise`)
    const googleSearchUrl = `https://www.google.com/search?q=${searchQuery}&tbm=isch`
    window.open(googleSearchUrl, '_blank')
  }
}
const formatDate = (date: Date): string => {
  const d = toDate(date)
  if (isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('no-NO', { day: 'numeric', month: 'short' }).format(d)
}
const formatNumber = (num: number): string => new Intl.NumberFormat('no-NO').format(Math.round(num))
const getMuscleGroupColor = (muscleGroupName: string): string => {
  const mg = (muscleGroups as any).muscleGroups.find((x: any) => 
    x.name.toLowerCase() === muscleGroupName.toLowerCase() ||
    (x.displayName ?? '').toLowerCase() === muscleGroupName.toLowerCase()
  )
  return mg?.color || '#6b7280'
}

/** ========= Lifecycle ========= */
onMounted(() => {
  const exerciseId = route.params.id as string
  const foundExercise = workoutData.getExerciseById(exerciseId)
  if (foundExercise) exercise.value = foundExercise
  else router.push('/exercises')
})
</script>
