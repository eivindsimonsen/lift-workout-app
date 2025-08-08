<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
          <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </div>
        <h1 class="text-3xl font-bold text-white">{{ exercise?.name }}</h1>
      </div>
      <router-link 
        to="/exercises" 
        class="btn-secondary"
      >
        Tilbake
      </router-link>
    </div>

    <div v-if="exercise" class="space-y-6">
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

      <!-- Recent Performances -->
      <div class="card">
        <h3 class="text-lg font-semibold text-white mb-4">Siste prestasjoner</h3>
        <div v-if="performances.length === 0" class="text-center py-8">
          <p class="text-dark-300">Ingen data ennå</p>
        </div>
        <div v-else class="space-y-3">
          <div 
            v-for="performance in performances" 
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

const route = useRoute()
const router = useRouter()
const workoutData = useHybridData()

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
    .slice(0, 10)
})

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
const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('no-NO', {
    day: 'numeric',
    month: 'short'
  }).format(date)
}



const getWeekNumber = (date: Date): number => {
  const startOfYear = new Date(date.getFullYear(), 0, 1)
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
  return Math.ceil((days + startOfYear.getDay() + 1) / 7)
}

// Lifecycle
onMounted(() => {
  const exerciseId = route.params.id as string
  const foundExercise = workoutData.exercises.value.find(e => e.id === exerciseId)
  
  if (foundExercise) {
    exercise.value = foundExercise
  } else {
    router.push('/')
  }
})
</script>
