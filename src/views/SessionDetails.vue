<template>
  <div>
    <!-- Breadcrumbs - moved above header -->
    <Breadcrumbs 
      :breadcrumbs="[
        { name: 'Hjem', path: '/' },
        { name: 'Historikk', path: '/history' },
        { name: 'Økt Detaljer' }
      ]"
    />

    <!-- Header -->
    <div class="flex items-center justify-between mb-4 mt-4">
      <div class="flex items-center gap-3">
        <router-link 
          to="/history" 
          class="inline-flex items-center justify-center w-10 h-10 bg-[#3F302A] hover:bg-[#4A3A32] rounded-lg transition-colors"
        >
          <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </router-link>
        <h1 class="text-2xl font-bold text-white">Økt Detaljer</h1>
      </div>
    </div>

    <div v-if="!session" class="text-center py-12">
      <p class="text-dark-300">Økt ikke funnet</p>
      <router-link to="/history" class="btn-primary mt-4">Tilbake til Historikk</router-link>
    </div>

    <!-- Loading State for Session Details -->
    <div v-if="isLoading" class="space-y-6 animate-pulse">
      <!-- Session Header Skeleton -->
      <div class="card">
        <div class="flex items-start justify-between">
          <div class="space-y-3">
            <div class="h-8 bg-dark-600 rounded w-48"></div>
            <div class="h-4 bg-dark-600 rounded w-40"></div>
            <div class="h-6 bg-dark-600 rounded w-24"></div>
          </div>
          <div class="text-right space-y-2">
            <div class="h-6 bg-dark-600 rounded w-20"></div>
            <div class="h-3 bg-dark-600 rounded w-16"></div>
          </div>
        </div>
      </div>
      
      <!-- Metrics Grid Skeleton -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div v-for="i in 5" :key="i" class="bg-dark-700 rounded-lg p-4 text-center space-y-2">
          <div class="h-6 bg-dark-600 rounded w-12 mx-auto"></div>
          <div class="h-3 bg-dark-600 rounded w-16 mx-auto"></div>
        </div>
      </div>

      <!-- Exercise List Skeleton -->
      <div class="card">
        <div class="h-6 bg-dark-600 rounded w-32 mb-4"></div>
        <div class="space-y-4">
          <div v-for="i in 4" :key="i" class="bg-dark-700 rounded-lg p-4 space-y-3">
            <div class="h-5 bg-dark-600 rounded w-40"></div>
            <div class="space-y-2">
              <div v-for="j in 3" :key="j" class="flex items-center gap-3">
                <div class="h-4 bg-dark-600 rounded w-16"></div>
                <div class="h-4 bg-dark-600 rounded w-12"></div>
                <div class="h-4 bg-dark-600 rounded w-20"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Session Details -->
    <div v-else-if="session" class="space-y-6">
      <!-- Session Header -->
      <div class="card">
        <div class="flex items-start justify-between">
          <div>
            <h2 class="text-2xl font-bold text-white mb-2">{{ session.templateName }}</h2>
            <p class="text-dark-300 mb-4">
              {{ formatDate(session.date) }} • {{ session.duration }} minutter
            </p>
            <span 
              class="px-3 py-1 rounded-full text-sm font-medium"
              :style="{ 
                backgroundColor: getWorkoutTypeColor(session.workoutType) + '20',
                color: getWorkoutTypeColor(session.workoutType)
              }"
            >
              {{ getWorkoutTypeName(session.workoutType) }}
            </span>
          </div>
          <div class="text-right">
            <p class="text-sm font-semibold text-primary-500 whitespace-nowrap tabular-nums">
              {{ formatNumber(session.totalVolume || 0) }} kg
            </p>
            <p class="text-[10px] text-dark-300 leading-tight">Total volum</p>
          </div>
        </div>
      </div>
      
      <!-- Metrics Grid (ordered: Øvelser, Sett, Reps, Varighet, Volum/min) -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-dark-700 rounded-lg p-4 text-center">
          <p class="text-lg font-bold text-primary-500 tabular-nums">{{ session.exercises.length }}</p>
          <p class="text-xs text-dark-300">Øvelser</p>
        </div>
        <div class="bg-dark-700 rounded-lg p-4 text-center">
          <p class="text-lg font-bold text-primary-500 tabular-nums">{{ getTotalSets(session) }}</p>
          <p class="text-xs text-dark-300">Sett</p>
        </div>
        <div class="bg-dark-700 rounded-lg p-4 text-center">
          <p class="text-lg font-bold text-primary-500 tabular-nums">{{ totalReps }} reps</p>
          <p class="text-xs text-dark-300">Reps</p>
        </div>
        <div class="bg-dark-700 rounded-lg p-4 text-center">
          <p class="text-lg font-bold text-primary-500 tabular-nums">{{ session.duration }} min</p>
          <p class="text-xs text-dark-300">Varighet</p>
        </div>
        <div class="bg-dark-700 rounded-lg p-4 text-center">
          <p class="text-lg font-bold text-primary-500 tabular-nums">{{ volumePerMinute }} kg/min</p>
          <p class="text-xs text-dark-300">Volum per minutt</p>
        </div>
      </div>

      

      <!-- Rep ranges -->
      <div class="card">
        <h3 class="text-xl font-semibold text-white mb-4">Rep-områder</h3>
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <div class="w-44 whitespace-nowrap truncate flex-shrink-0 text-xs text-dark-300">Styrke (1–5)</div>
            <div class="flex-1 h-2 bg-dark-700 rounded overflow-hidden">
              <div class="h-2 bg-primary-500" :style="{ width: repRangePct.strength + '%' }"></div>
            </div>
            <div class="w-10 text-right text-xs text-white tabular-nums">{{ repRangePct.strength }}%</div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-44 whitespace-nowrap truncate flex-shrink-0 text-xs text-dark-300">Hypertrofi (6–12)</div>
            <div class="flex-1 h-2 bg-dark-700 rounded overflow-hidden">
              <div class="h-2 bg-primary-500/80" :style="{ width: repRangePct.hypertrophy + '%' }"></div>
            </div>
            <div class="w-10 text-right text-xs text-white tabular-nums">{{ repRangePct.hypertrophy }}%</div>
          </div>
          <div class="flex items-center gap-3">
            <div class="w-44 whitespace-nowrap truncate flex-shrink-0 text-xs text-dark-300">Utholdenhet (13+)</div>
            <div class="flex-1 h-2 bg-dark-700 rounded overflow-hidden">
              <div class="h-2 bg-primary-500/60" :style="{ width: repRangePct.endurance + '%' }"></div>
            </div>
            <div class="w-10 text-right text-xs text-white tabular-nums">{{ repRangePct.endurance }}%</div>
          </div>
        </div>
      </div>

      <!-- Volume per exercise -->
      <div class="card">
        <h3 class="text-xl font-semibold text-white mb-4">Volum per øvelse</h3>
        <div class="space-y-3">
          <div v-for="ex in exerciseVolumes" :key="ex.exerciseId" class="space-y-1">
            <div class="flex items-center justify-between text-sm">
              <span class="text-white truncate">{{ ex.name }}</span>
              <span class="text-dark-300 tabular-nums">{{ formatNumber(ex.volume) }} kg ({{ ex.percentage }}%)</span>
            </div>
            <div class="w-full h-2 bg-dark-700 rounded overflow-hidden">
              <div class="h-2 bg-primary-500" :style="{ width: ex.percentage + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Muscle groups -->
      <div class="card">
        <h3 class="text-xl font-semibold text-white mb-4">Muskelgrupper i økten</h3>
        <div class="space-y-3">
          <div v-for="mg in muscleGroupDistribution" :key="mg.name" class="space-y-1">
            <div class="flex items-center justify-between text-sm">
              <span class="text-white">{{ mg.name }}</span>
              <span class="text-dark-300 tabular-nums">{{ mg.percentage }}%</span>
            </div>
            <div class="w-full h-2 bg-dark-700 rounded overflow-hidden">
              <div class="h-2" :style="{ width: mg.percentage + '%', backgroundColor: getWorkoutTypeColor(session.workoutType) }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Exercises -->
      <div class="card">
        <h3 class="text-xl font-semibold text-white mb-4">Øvelser</h3>
        <div class="space-y-4">
          <div 
            v-for="exercise in session.exercises" 
            :key="exercise.exerciseId"
            class="bg-dark-700 rounded-lg p-4"
          >
            <h4 
              class="font-medium text-white mb-3 cursor-pointer hover:text-primary-400 transition-colors"
              @click="viewExercise(exercise.exerciseId)"
            >
              {{ exercise.name }}
            </h4>
            
            <div class="space-y-2">
              <div 
                v-for="set in exercise.sets" 
                :key="set.id"
                class="grid grid-cols-[auto_1fr_auto_auto] items-center text-sm gap-x-3"
              >
                <span class="text-dark-300">Sett {{ exercise.sets.indexOf(set) + 1 }}:</span>
                <div class="h-px bg-dark-600"></div>
                <span class="text-white tabular-nums whitespace-nowrap">{{ set.reps }} reps</span>
                <span v-if="set.weight" class="text-primary-500 font-medium tabular-nums whitespace-nowrap">{{ set.weight }} kg</span>
              </div>
            </div>
            <!-- Insights under all sets -->
            <div class="mt-3 flex flex-wrap items-center gap-3 text-xs text-dark-300">
              <span v-if="exerciseInsights[exercise.exerciseId]?.isPR" class="px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300 font-medium">PR</span>
              <span class="tabular-nums text-white">Tungeste sett: {{ exerciseInsights[exercise.exerciseId]?.heaviest.weight }}×{{ exerciseInsights[exercise.exerciseId]?.heaviest.reps }}</span>
              <span class="tabular-nums">Estimert 1RM: ~{{ exerciseInsights[exercise.exerciseId]?.estimated1RM }} kg</span>
              <span class="text-dark-400">Neste gang: {{ exerciseInsights[exercise.exerciseId]?.nextHint }}</span>
            </div>
          </div>
        </div>
      </div>

       <!-- Actions -->
       <div class="space-y-3">
         <!-- Active session info (same message style as Økter) -->
         <div v-if="activeSessions.length > 0" class="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
           <div class="flex items-center gap-3">
             <svg class="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
             <div>
               <p class="text-blue-300 text-sm font-medium">Du har en aktiv økt</p>
               <p class="text-blue-400/80 text-xs">Fullfør den aktive økten først for å starte en ny økt.</p>
             </div>
           </div>
         </div>

         <div class="flex flex-col md:flex-row gap-3">
           <button 
             v-if="session.templateId"
             @click="restartWorkout"
             class="flex-1 btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
             :disabled="activeSessions.length > 0"
             :title="activeSessions.length > 0 ? 'Du har allerede en aktiv økt. Fullfør den først.' : 'Start ny økt'"
           >
             Start samme økt
           </button>
           <button 
             @click="saveAsTemplate"
             class="flex-1 btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
             disabled
             title="Kommer snart"
           >
             Bruk som mal
           </button>
           <button 
             @click="shareSummary"
             class="flex-1 btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
             disabled
             title="Kommer snart"
           >
             Del økt
           </button>
         </div>

         <div class="flex">
           <button 
             @click="deleteSession"
             class="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
           >
             Slett økt
           </button>
         </div>
       </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useHybridData } from '@/composables/useHybridData'
import type { WorkoutSession } from '@/types/workout'
import Breadcrumbs from '@/components/Breadcrumbs.vue'

const router = useRouter()
const route = useRoute()
const workoutData = useHybridData()

const session = ref<WorkoutSession | null>(null)
const activeSessions = computed(() => workoutData.sessions.value.filter(s => !s.isCompleted))
const isLoading = computed(() => workoutData.isLoading.value)

// Methods
const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('no-NO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('no-NO').format(Math.round(num))
}

const getWorkoutTypeName = (typeId: string): string => {
  return workoutData.getWorkoutType.value(typeId)
}

const getWorkoutTypeColor = (typeId: string): string => {
  return workoutData.getWorkoutTypeColor.value(typeId)
}

const getTotalSets = (session: WorkoutSession): number => {
  return session.exercises.reduce((total, exercise) => {
    return total + exercise.sets.length
  }, 0)
}

// Derived metrics
const totalReps = computed(() => {
  if (!session.value) return 0
  return session.value.exercises.reduce((sum, ex) => {
    return sum + ex.sets.reduce((s, set) => s + (set.reps || 0), 0)
  }, 0)
})

const kgPerRep = computed(() => {
  if (!session.value) return 0
  const volume = session.value.totalVolume || 0
  const reps = totalReps.value || 1
  return Math.round((volume / reps) * 10) / 10
})

const volumePerMinute = computed(() => {
  if (!session.value) return 0
  const volume = session.value.totalVolume || 0
  const minutes = Math.max(1, session.value.duration || 0)
  return Math.round((volume / minutes))
})

const setsPerMinute = computed(() => {
  if (!session.value) return 0
  const sets = getTotalSets(session.value)
  const minutes = Math.max(1, session.value.duration || 0)
  return Math.round((sets / minutes) * 10) / 10
})

const repRangePct = computed(() => {
  if (!session.value) return { strength: 0, hypertrophy: 0, endurance: 0 }
  let strength = 0, hypertrophy = 0, endurance = 0, total = 0
  session.value.exercises.forEach(ex => {
    ex.sets.forEach(set => {
      if (!set.reps) return
      total++
      if (set.reps <= 5) strength++
      else if (set.reps <= 12) hypertrophy++
      else endurance++
    })
  })
  if (total === 0) return { strength: 0, hypertrophy: 0, endurance: 0 }
  const pct = (n: number) => Math.round((n / total) * 100)
  return { strength: pct(strength), hypertrophy: pct(hypertrophy), endurance: pct(endurance) }
})

const exerciseVolumes = computed(() => {
  if (!session.value) return [] as Array<{ exerciseId: string; name: string; volume: number; percentage: number }>
  const volumes = session.value.exercises.map(ex => {
    const vol = ex.sets.reduce((s, set) => s + ((set.weight || 0) * (set.reps || 0)), 0)
    return { exerciseId: ex.exerciseId, name: ex.name, volume: vol }
  })
  const total = volumes.reduce((s, v) => s + v.volume, 0) || 1
  return volumes.map(v => ({ ...v, percentage: Math.round((v.volume / total) * 100) }))
})

const muscleGroupDistribution = computed(() => {
  if (!session.value) return [] as Array<{ name: string; percentage: number }>
  const groups: Record<string, number> = {}
  // We infer muscle group from exercise name by simple keywords (fallback)
  // Since the session doesn't carry muscle group, we approximate
  const mapExerciseToGroup = (name: string): string => {
    const n = name.toLowerCase()
    if (/(benk|chest|bryst)/.test(n)) return 'Bryst'
    if (/(roing|row|rygg|pull|nedtrekk|mark)/.test(n)) return 'Rygg'
    if (/(kne|bøy|squat|beins|bein|leg|utfall|calf|tåhev)/.test(n)) return 'Ben'
    if (/(skuld|press|sidehev|fronthev|delt)/.test(n)) return 'Skuldre'
    if (/(biceps|triceps|curl|dip|pushdown|arm)/.test(n)) return 'Armer'
    return 'Kjerne'
  }
  session.value.exercises.forEach(ex => {
    const g = mapExerciseToGroup(ex.name)
    const vol = ex.sets.reduce((s, set) => s + ((set.weight || 0) * (set.reps || 0)), 0)
    groups[g] = (groups[g] || 0) + vol
  })
  const total = Object.values(groups).reduce((s, v) => s + v, 0) || 1
  return Object.entries(groups)
    .map(([name, vol]) => ({ name, percentage: Math.round((vol / total) * 100) }))
    .sort((a, b) => b.percentage - a.percentage)
})

// Per-exercise insights: heaviest set, estimated 1RM, PR check and next hint
const exerciseInsights = computed(() => {
  if (!session.value) return {} as Record<string, any>
  const insights: Record<string, any> = {}
  session.value.exercises.forEach(ex => {
    let heaviest = { weight: 0, reps: 0 }
    ex.sets.forEach(set => {
      const vol = (set.weight || 0) * (set.reps || 0)
      const bestVol = heaviest.weight * heaviest.reps
      if (vol > bestVol) heaviest = { weight: set.weight || 0, reps: set.reps || 0 }
    })
    const estimated1RM = Math.round((heaviest.weight || 0) * (1 + (heaviest.reps || 0) / 30))
    // Simple PR check against this session only (highlight if highest volume set equals exercise volume)
    const exerciseVolume = ex.sets.reduce((s, set) => s + ((set.weight || 0) * (set.reps || 0)), 0)
    const isPR = heaviest.weight * heaviest.reps >= exerciseVolume // placeholder until historical PRs are wired
    const nextHint = heaviest.weight > 0 ? `${heaviest.weight + 2.5} kg eller +1 rep` : 'Start lett og bygg opp'
    insights[ex.exerciseId] = { heaviest, estimated1RM, isPR, nextHint }
  })
  return insights
})

const deleteSession = () => {
  if (!session.value) return
  
  if (confirm('Er du sikker på at du vil slette denne økten?')) {
    workoutData.deleteWorkoutSession(session.value.id)
    router.push('/history')
  }
}

const viewExercise = (exerciseId: string) => {
  router.push(`/exercise/${exerciseId}`)
}

// Lifecycle
onMounted(() => {
  const sessionId = route.params.id as string
  const foundSession = workoutData.getSessionById.value(sessionId)
  
  if (foundSession) {
    session.value = foundSession
  }
})

// Actions
const restartWorkout = () => {
  if (!session.value?.templateId) return
  router.push(`/workout/${session.value.id}`)
}

const saveAsTemplate = () => {
  if (!session.value) return
  const tpl = {
    id: `template-${Date.now()}`,
    name: session.value.templateName + ' (kopi)',
    workoutType: session.value.workoutType,
    exercises: session.value.exercises.map(ex => ({ exerciseId: ex.exerciseId, name: ex.name, sets: 0, reps: 0 }))
  }
  workoutData.addTemplate(tpl as any)
}

const shareSummary = async () => {
  if (!session.value) return
  const text = `Økt: ${session.value.templateName}\nDato: ${formatDate(session.value.date)}\nVarighet: ${session.value.duration} min\nVolum: ${formatNumber(session.value.totalVolume || 0)} kg`
  try {
    await navigator.clipboard.writeText(text)
    // Optional toast via existing system
  } catch {}
}
</script> 