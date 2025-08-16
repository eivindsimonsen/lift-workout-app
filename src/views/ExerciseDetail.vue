<template>
  <div>
    <!-- Breadcrumbs - moved above header -->
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
        <h1 class="text-2xl font-bold text-white">{{ exercise?.name }}</h1>
        
        <!-- Muscle Groups -->
        <div v-if="exercise?.muscleGroups && exercise.muscleGroups.length > 0" class="mt-2">
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
    </div>

    <!-- Loading State for Exercise Details -->
    <div v-if="isLoading" class="space-y-6 animate-pulse">
      <!-- Variant Details Skeleton -->
      <div class="card">
        <div class="h-6 bg-dark-600 rounded w-32 mb-4"></div>
        <div class="flex flex-wrap gap-3">
          <div v-for="i in 4" :key="i" class="h-8 bg-dark-600 rounded-lg w-20"></div>
        </div>
      </div>

      <!-- Stats Overview Skeleton -->
      <div class="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div v-for="i in 6" :key="i" class="card text-center space-y-2">
          <div class="h-8 bg-dark-600 rounded w-16 mx-auto"></div>
          <div class="h-4 bg-dark-600 rounded w-20 mx-auto"></div>
        </div>
      </div>

      <!-- Performance Chart Skeleton -->
      <div class="card">
        <div class="h-6 bg-dark-600 rounded w-48 mb-4"></div>
        <div class="h-64 bg-dark-700 rounded-lg"></div>
      </div>

      <!-- Recent Sessions Skeleton -->
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

    <div v-else-if="exercise" class="space-y-6">
      <!-- Variant Details (if this is a variant) -->
      <div v-if="exercise.equipment || exercise.angle || exercise.grip" class="card">
        <h3 class="text-lg font-semibold text-white mb-4">Variant Detaljer</h3>
        <div class="flex flex-wrap gap-3">
          <span v-if="exercise.equipment" class="px-3 py-2 bg-primary-500/20 text-primary-400 rounded-lg text-sm">
            {{ exercise.equipment }}
          </span>
          <span v-if="exercise.angle" class="px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm">
            {{ exercise.angle }}
          </span>
          <span v-if="exercise.grip" class="px-3 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm">
            {{ exercise.grip }}
          </span>
          <span v-if="exercise.position" class="px-3 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-sm">
            {{ exercise.position }}
          </span>
          <span v-if="exercise.direction" class="px-3 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm">
            {{ exercise.direction }}
          </span>
          <span v-if="exercise.focus" class="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm">
            {{ exercise.focus }}
          </span>
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

      <!-- Performance Chart -->
      <div class="card">
        <h3 class="text-lg font-semibold text-white mb-4">Fremgang over tid</h3>
        <div class="h-64 relative">
          <!-- Chart container -->
          <div class="absolute inset-0 flex items-end justify-between">
            <!-- Y-axis labels -->
            <div class="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-dark-400">
              <span>{{ maxWeight }}kg</span>
              <span>{{ Math.round(maxWeight * 0.75) }}kg</span>
              <span>{{ Math.round(maxWeight * 0.5) }}kg</span>
              <span>{{ Math.round(maxWeight * 0.25) }}kg</span>
              <span>0kg</span>
            </div>
            
            <!-- Chart area -->
            <div class="flex-1 ml-8 relative">
              <!-- Grid lines -->
              <div class="absolute inset-0 flex flex-col justify-between">
                <div class="border-t border-dark-600"></div>
                <div class="border-t border-dark-600"></div>
                <div class="border-t border-dark-600"></div>
                <div class="border-t border-dark-600"></div>
                <div class="border-t border-dark-600"></div>
              </div>
              
              <!-- Line chart -->
              <svg class="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <polyline
                  :points="lineChartPoints"
                  fill="none"
                  stroke="#3B82F6"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <!-- Data points -->
                <circle
                  v-for="(point, index) in lineChartPointsArray"
                  :key="index"
                  :cx="point.x"
                  :cy="point.y"
                  r="3"
                  fill="#3B82F6"
                  stroke="#1E293B"
                  stroke-width="1"
                />
              </svg>
            </div>
          </div>
          
          <!-- X-axis labels -->
          <div class="absolute bottom-0 left-8 right-0 flex justify-between text-xs text-dark-400">
            <span v-for="(week, index) in weeklyData" :key="index" class="text-center">
              Uke {{ week.weekNumber }}
            </span>
          </div>
        </div>
      </div>

      <!-- PR-tavle -->
      <div class="card">
        <h3 class="text-lg font-semibold text-white mb-4">PR‑tavle</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div 
            v-for="rep in repTargets" 
            :key="rep" 
            class="bg-dark-700 rounded-lg p-3 text-center"
          >
            <div class="text-xs text-dark-300 mb-1">{{ rep }} ×</div>
            <div class="text-xl font-bold text-primary-500">{{ prBoard[rep]?.weight ?? '-' }}<span v-if="prBoard[rep]?.weight">kg</span></div>
            <div class="text-xs text-dark-400" v-if="prBoard[rep]?.date">{{ formatDate(prBoard[rep].date) }}</div>
          </div>
        </div>
      </div>

      <!-- Estimert 1RM (Epley) -->
      <div class="card">
        <h3 class="text-lg font-semibold text-white mb-4">Estimert 1RM (Epley)</h3>
        <div class="h-64 relative">
          <div class="absolute inset-0 flex items-end justify-between">
            <div class="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-dark-400">
              <span>{{ estimatedMax1RM }}kg</span>
              <span>{{ Math.round(estimatedMax1RM * 0.75) }}kg</span>
              <span>{{ Math.round(estimatedMax1RM * 0.5) }}kg</span>
              <span>{{ Math.round(estimatedMax1RM * 0.25) }}kg</span>
              <span>0kg</span>
            </div>
            <div class="flex-1 ml-8 relative">
              <div class="absolute inset-0 flex flex-col justify-between">
                <div class="border-t border-dark-600"></div>
                <div class="border-t border-dark-600"></div>
                <div class="border-t border-dark-600"></div>
                <div class="border-t border-dark-600"></div>
                <div class="border-t border-dark-600"></div>
              </div>
              <svg class="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <polyline :points="estimatedLineChartPoints" fill="none" stroke="#F97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                <circle v-for="(point, idx) in estimatedLineChartPointsArray" :key="idx" :cx="point.x" :cy="point.y" r="3" fill="#F97316" stroke="#1E293B" stroke-width="1" />
              </svg>
            </div>
          </div>
          <div class="absolute bottom-0 left-8 right-0 flex justify-between text-xs text-dark-400">
            <span v-for="(week, index) in estimated1RMWeeklyData" :key="index" class="text-center">Uke {{ week.weekNumber }}</span>
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
              <span class="text-dark-300">4‑ukers trend</span>
              <span :class="volumeWeekStats.trendDelta >= 0 ? 'text-green-400' : 'text-red-400'">
                {{ volumeWeekStats.trendDelta >= 0 ? '+' : '' }}{{ Math.round(volumeWeekStats.trendDelta) }}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Performances (last 3 sets) -->
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

      <!-- Reps- og settsammensetning -->
      <div class="card">
        <h3 class="text-lg font-semibold text-white mb-4">Reps- og settsammensetning</h3>
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <div class="w-24 text-xs text-dark-300">Styrke (1–5)</div>
            <div class="flex-1 h-2 bg-dark-700 rounded">
              <div class="h-2 rounded bg-primary-500" :style="{ width: repRangeDistribution.strength + '%' }"></div>
            </div>
            <div class="w-10 text-right text-xs text-white">{{ repRangeDistribution.strength }}%</div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-24 text-xs text-dark-300">Hypertrofi (6–12)</div>
            <div class="flex-1 h-2 bg-dark-700 rounded">
              <div class="h-2 rounded bg-primary-500/80" :style="{ width: repRangeDistribution.hypertrophy + '%' }"></div>
            </div>
            <div class="w-10 text-right text-xs text-white">{{ repRangeDistribution.hypertrophy }}%</div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-24 text-xs text-dark-300">Utholdenhet (13+)</div>
            <div class="flex-1 h-2 bg-dark-700 rounded">
              <div class="h-2 rounded bg-primary-500/60" :style="{ width: repRangeDistribution.endurance + '%' }"></div>
            </div>
            <div class="w-10 text-right text-xs text-white">{{ repRangeDistribution.endurance }}%</div>
          </div>
        </div>
      </div>
      <!-- Google Search Button -->
      <div class="mb-6 flex justify-end">
        <button 
          @click="openGoogleSearch"
          class="btn-primary flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Åpne i Google
        </button>
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

const route = useRoute()
const router = useRouter()
const workoutData = useHybridData()

// Loading state
const isLoading = computed(() => workoutData.isLoading.value)

const exercise = ref<any>(null)

// Computed properties
const performances = computed(() => {
  if (!exercise.value) return []
  
  const allPerformances: any[] = []
  
  workoutData.sessions.value
    .filter(session => session.isCompleted)
    .forEach(session => {
      const sessionExercise = session.exercises.find(e => e.exerciseId === exercise.value.id)
      if (sessionExercise) {
        sessionExercise.sets.forEach(set => {
          if (set.isCompleted && set.weight && set.reps) {
            // Ensure weight and reps are valid numbers
            const weight = Number(set.weight)
            const reps = Number(set.reps)
            
            if (!isNaN(weight) && isFinite(weight) && !isNaN(reps) && isFinite(reps) && weight > 0 && reps > 0) {
              allPerformances.push({
                id: `${session.id}-${set.id}`,
                weight: weight,
                reps: reps,
                volume: weight * reps,
                date: session.date,
                sessionName: session.templateName
              })
            }
          }
        })
      }
    })
  
  return allPerformances
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 200)
})

// Recent last 3 sets
const recentPerformances = computed(() => performances.value.slice(0, 3))

// Weekly progression data
const weeklyData = computed(() => {
  if (performances.value.length === 0) return []
  
  // Group performances by week
  const weeklyPerformances: { [key: string]: any[] } = {}
  
  performances.value.forEach(performance => {
    const date = new Date(performance.date)
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay()) // Start of week (Sunday)
    const weekKey = weekStart.toISOString().split('T')[0]
    
    if (!weeklyPerformances[weekKey]) {
      weeklyPerformances[weekKey] = []
    }
    weeklyPerformances[weekKey].push(performance)
  })
  
  // Convert to array and get best performance per week
  return Object.entries(weeklyPerformances)
    .map(([weekKey, weekPerformances]) => {
      // Filter out invalid performances
      const validPerformances = weekPerformances.filter(p => 
        p.weight && !isNaN(p.weight) && isFinite(p.weight)
      )
      
      if (validPerformances.length === 0) return null
      
      const bestPerformance = validPerformances.reduce((best, current) => {
        return current.weight > best.weight ? current : best
      })
      
      return {
        weekKey,
        weekNumber: getWeekNumber(new Date(weekKey)),
        weight: bestPerformance.weight,
        date: new Date(weekKey)
      }
    })
    .filter(week => week !== null) // Remove null entries
    .sort((a, b) => new Date(a.weekKey).getTime() - new Date(b.weekKey).getTime())
    .slice(-8) // Last 8 weeks
})

// PR board (best weight for exact rep counts)
type PRItem = { weight: number; date: Date }
const repTargets = [1, 3, 4, 6, 8, 10, 12, 14]
const prBoard = computed<Record<number, PRItem | undefined>>(() => {
  const targets = repTargets
  const best: Record<number, PRItem | undefined> = {}
  performances.value.forEach(p => {
    if (!p.reps || !p.weight) return
    if (targets.includes(p.reps)) {
      const existing = best[p.reps]
      if (!existing || p.weight > existing.weight) {
        best[p.reps] = { weight: p.weight, date: new Date(p.date) }
      }
    }
  })
  return best
})

// Estimated 1RM (Epley) progression per week
const estimated1RMWeeklyData = computed(() => {
  if (performances.value.length === 0) return []
  const byWeek: { [key: string]: { weekNumber: number; ests: number[]; date: Date } } = {}
  performances.value.forEach(p => {
    const d = new Date(p.date)
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - d.getDay())
    const key = weekStart.toISOString().split('T')[0]
    const est = p.weight * (1 + (p.reps || 0) / 30)
    if (!isFinite(est) || isNaN(est)) return
    if (!byWeek[key]) byWeek[key] = { weekNumber: getWeekNumber(weekStart), ests: [], date: weekStart }
    byWeek[key].ests.push(est)
  })
  const arr = Object.values(byWeek).map(w => ({
    weekKey: w.date.toISOString(),
    weekNumber: w.weekNumber,
    value: Math.max(...w.ests)
  })).sort((a, b) => new Date(a.weekKey).getTime() - new Date(b.weekKey).getTime()).slice(-8)
  return arr
})

const estimatedMax1RM = computed(() => {
  if (estimated1RMWeeklyData.value.length === 0) return 100
  return Math.round(Math.max(...estimated1RMWeeklyData.value.map(w => w.value)))
})

const estimatedLineChartPoints = computed(() => {
  if (estimated1RMWeeklyData.value.length === 0) return ''
  const data = estimated1RMWeeklyData.value
  const maxVal = Math.max(...data.map(w => w.value))
  if (maxVal <= 0) return ''
  const pts = data.map((w, i) => {
    const x = (i / (data.length - 1)) * 80 + 10
    const y = 90 - ((w.value / maxVal) * 80)
    if (!isFinite(x) || !isFinite(y)) return '10,90'
    return `${x},${y}`
  })
  return pts.join(' ')
})

const estimatedLineChartPointsArray = computed(() => {
  if (estimated1RMWeeklyData.value.length === 0) return []
  const data = estimated1RMWeeklyData.value
  const maxVal = Math.max(...data.map(w => w.value))
  if (maxVal <= 0) return []
  return data.map((w, i) => {
    const x = (i / (data.length - 1)) * 80 + 10
    const y = 90 - ((w.value / maxVal) * 80)
    if (!isFinite(x) || !isFinite(y)) return { x: 10, y: 90 }
    return { x, y }
  })
})

// Weekly intensity: sum(weight*reps)/sum(reps)
const weeklyIntensityData = computed(() => {
  if (performances.value.length === 0) return []
  const byWeek: { [key: string]: { weekNumber: number; vol: number; reps: number; date: Date } } = {}
  performances.value.forEach(p => {
    const d = new Date(p.date)
    const weekStart = new Date(d)
    weekStart.setDate(d.getDate() - d.getDay())
    const key = weekStart.toISOString().split('T')[0]
    if (!byWeek[key]) byWeek[key] = { weekNumber: getWeekNumber(weekStart), vol: 0, reps: 0, date: weekStart }
    byWeek[key].vol += p.weight * (p.reps || 0)
    byWeek[key].reps += (p.reps || 0)
  })
  return Object.values(byWeek)
    .map(w => ({ weekKey: w.date.toISOString(), weekNumber: w.weekNumber, intensity: w.reps > 0 ? w.vol / w.reps : 0 }))
    .sort((a, b) => new Date(a.weekKey).getTime() - new Date(b.weekKey).getTime())
})

// Volume best week/month and 4-week rolling trend
const volumeWeekStats = computed(() => {
  const byWeek: { label: string; weekNumber: number; volume: number; weekStart: Date }[] = []
  const byMonth: { label: string; volume: number }[] = []
  const weekMap: { [k: string]: number } = {}
  const monthMap: { [k: string]: number } = {}
  performances.value.forEach(p => {
    const d = new Date(p.date)
    // week
    const ws = new Date(d)
    ws.setDate(d.getDate() - d.getDay())
    ws.setHours(0, 0, 0, 0)
    const wKey = ws.toISOString()
    weekMap[wKey] = (weekMap[wKey] || 0) + p.weight * (p.reps || 0)
    // month
    const mKey = `${d.getFullYear()}-${d.getMonth()}`
    monthMap[mKey] = (monthMap[mKey] || 0) + p.weight * (p.reps || 0)
  })
  Object.entries(weekMap).forEach(([k, v]) => {
    const d = new Date(k)
    byWeek.push({ label: k, weekNumber: getWeekNumber(d), volume: Math.round(v), weekStart: d })
  })
  Object.entries(monthMap).forEach(([k, v]) => {
    const [y, m] = k.split('-').map(Number)
    const label = new Intl.DateTimeFormat('no-NO', { month: 'short', year: 'numeric' }).format(new Date(y, m, 1))
    byMonth.push({ label, volume: Math.round(v) })
  })
  const bestWeek = byWeek.sort((a, b) => b.volume - a.volume)[0] || { label: '', weekNumber: 0, volume: 0, weekStart: new Date() }
  const bestMonth = byMonth.sort((a, b) => b.volume - a.volume)[0] || { label: '', volume: 0 }

  // rolling 4 weeks vs previous 4 weeks
  const sortedWeeks = Object.entries(weekMap)
    .map(([k, v]) => ({ date: new Date(k), volume: v }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
  const last4 = sortedWeeks.slice(-4).reduce((s, x) => s + x.volume, 0)
  const prev4 = sortedWeeks.slice(-8, -4).reduce((s, x) => s + x.volume, 0)
  const trendDelta = prev4 > 0 ? ((last4 - prev4) / prev4) * 100 : 0
  return { bestWeek: { weekNumber: bestWeek.weekNumber, volume: Math.round(bestWeek.volume) }, bestMonth, trendDelta }
})

// Rep range distribution
const repRangeDistribution = computed(() => {
  let strength = 0, hypertrophy = 0, endurance = 0, totalSetsCount = 0
  performances.value.forEach(p => {
    if (!p.reps) return
    totalSetsCount++
    if (p.reps <= 5) strength++
    else if (p.reps <= 12) hypertrophy++
    else endurance++
  })
  if (totalSetsCount === 0) return { strength: 0, hypertrophy: 0, endurance: 0 }
  const pct = (n: number) => Math.round((n / totalSetsCount) * 100)
  return { strength: pct(strength), hypertrophy: pct(hypertrophy), endurance: pct(endurance) }
})

const lineChartPoints = computed(() => {
  if (weeklyData.value.length === 0) return ''
  
  // Filter out invalid weight values and ensure we have valid numbers
  const validData = weeklyData.value.filter(w => w.weight && !isNaN(w.weight) && isFinite(w.weight))
  if (validData.length === 0) return ''
  
  const maxWeight = Math.max(...validData.map(w => w.weight))
  if (maxWeight <= 0) return ''
  
  const points = validData.map((week, index) => {
    const x = (index / (validData.length - 1)) * 80 + 10 // 10-90% of width
    const y = 90 - ((week.weight / maxWeight) * 80) // 10-90% of height, inverted
    
    // Ensure x and y are valid numbers
    if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) {
      return '10,90' // Fallback to bottom-left
    }
    
    return `${x},${y}`
  })
  
  return points.join(' ')
})

const lineChartPointsArray = computed(() => {
  if (weeklyData.value.length === 0) return []
  
  // Filter out invalid weight values and ensure we have valid numbers
  const validData = weeklyData.value.filter(w => w.weight && !isNaN(w.weight) && isFinite(w.weight))
  if (validData.length === 0) return []
  
  const maxWeight = Math.max(...validData.map(w => w.weight))
  if (maxWeight <= 0) return []
  
  return validData.map((week, index) => {
    const x = (index / (validData.length - 1)) * 80 + 10
    const y = 90 - ((week.weight / maxWeight) * 80)
    
    // Ensure x and y are valid numbers
    if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) {
      return { x: 10, y: 90 } // Fallback to bottom-left
    }
    
    return { x, y }
  })
})

const maxWeight = computed(() => {
  if (performances.value.length === 0) return 100
  
  // Filter out invalid weight values
  const validWeights = performances.value
    .map(p => p.weight)
    .filter(weight => weight && !isNaN(weight) && isFinite(weight))
  
  if (validWeights.length === 0) return 100
  
  const max = Math.max(...validWeights)
  return isNaN(max) || !isFinite(max) ? 100 : max
})

const totalSessions = computed(() => {
  if (!exercise.value) return 0
  return workoutData.sessions.value
    .filter(session => session.isCompleted)
    .filter(session => session.exercises.some(e => e.exerciseId === exercise.value.id))
    .length
})

const totalSets = computed(() => {
  if (!exercise.value) return 0
  let total = 0
  
  workoutData.sessions.value
    .filter(session => session.isCompleted)
    .forEach(session => {
      const exerciseData = session.exercises.find(e => e.exerciseId === exercise.value.id)
      if (exerciseData) {
        total += exerciseData.sets.filter(set => set.isCompleted).length
      }
    })
  
  return total
})

const totalReps = computed(() => {
  if (!exercise.value) return 0
  let total = 0
  
  workoutData.sessions.value
    .filter(session => session.isCompleted)
    .forEach(session => {
      const exerciseData = session.exercises.find(e => e.exerciseId === exercise.value.id)
      if (exerciseData) {
        exerciseData.sets.forEach(set => {
          if (set.isCompleted && set.reps) {
            total += set.reps
          }
        })
      }
    })
  
  return total
})

const personalBest = computed(() => {
  if (!exercise.value) return { weight: 0, reps: 0 }
  
  // Find the highest weight lifted for 1 rep (one rep max)
  let oneRepMax = 0
  
  workoutData.sessions.value
    .filter(session => session.isCompleted)
    .forEach(session => {
      const exerciseData = session.exercises.find(e => e.exerciseId === exercise.value.id)
      if (exerciseData) {
        exerciseData.sets.forEach(set => {
          if (set.isCompleted && set.weight && set.reps === 1) {
            if (set.weight > oneRepMax) {
              oneRepMax = set.weight
            }
          }
        })
      }
    })
  
  return { weight: oneRepMax, reps: 1 }
})

const oneRepMax = computed(() => {
  if (!exercise.value) return 0
  
  // Find the highest weight lifted for 1 rep (one rep max)
  let max = 0
  
  workoutData.sessions.value
    .filter(session => session.isCompleted)
    .forEach(session => {
      const exerciseData = session.exercises.find(e => e.exerciseId === exercise.value.id)
      if (exerciseData) {
        exerciseData.sets.forEach(set => {
          if (set.isCompleted && set.weight && set.reps === 1) {
            if (set.weight > max) {
              max = set.weight
            }
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
  const lastDate = new Date(performances.value[0].date)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'I dag'
  if (diffDays === 1) return 'I går'
  if (diffDays < 7) return `${diffDays} dager siden`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} uker siden`
  return `${Math.floor(diffDays / 30)} måneder siden`
})

// Methods
const openGoogleSearch = () => {
  if (exercise.value?.name) {
    const searchQuery = encodeURIComponent(`${exercise.value.name} strength training exercise`)
    const googleSearchUrl = `https://www.google.com/search?q=${searchQuery}&tbm=isch`
    window.open(googleSearchUrl, '_blank')
  }
}

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('no-NO', {
    day: 'numeric',
    month: 'short'
  }).format(date)
}

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('no-NO').format(Math.round(num))
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

const getWeekNumber = (date: Date): number => {
  const startOfYear = new Date(date.getFullYear(), 0, 1)
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
  return Math.ceil((days + startOfYear.getDay() + 1) / 7)
}

// Lifecycle
onMounted(() => {
  const exerciseId = route.params.id as string
  
  // Use getExerciseById which can handle both main exercises and variants
  const foundExercise = workoutData.getExerciseById.value(exerciseId)
  
  if (foundExercise) {
    exercise.value = foundExercise
  } else {
    // If not found, redirect to exercises page
    router.push('/exercises')
  }
})
</script>
