<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
          <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-white">Statistikk</h1>
      </div>
    </div>

    <!-- Loading State for Overview Stats -->
    <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div 
        v-for="i in 6" 
        :key="i"
        class="card animate-pulse"
      >
        <div class="flex items-center justify-between">
          <div>
            <div class="h-4 bg-dark-600 rounded w-20 mb-2"></div>
            <div class="h-8 bg-dark-600 rounded w-16"></div>
          </div>
          <div class="w-12 h-12 bg-dark-600 rounded-lg"></div>
        </div>
      </div>
    </div>

    <!-- All Stats in One Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-dark-300 text-sm">Total Sets</p>
            <p class="text-2xl font-bold text-white">{{ totalSets }}</p>
          </div>
          <div class="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-dark-300 text-sm">Total Reps</p>
            <p class="text-2xl font-bold text-white">{{ totalReps }}</p>
          </div>
          <div class="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-dark-300 text-sm">Fullførte Økter</p>
            <p class="text-2xl font-bold text-white">{{ workoutData.completedSessions.value.length }}</p>
          </div>
          <div class="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-dark-300 text-sm">Snitt Varighet</p>
            <p class="text-2xl font-bold text-white">{{ workoutData.averageWorkoutDuration.value }} min</p>
          </div>
          <div class="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-dark-300 text-sm">Total Varighet</p>
            <p class="text-2xl font-bold text-white">{{ totalDuration }} min</p>
          </div>
          <div class="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-dark-300 text-sm">Total Volum</p>
            <p class="text-2xl font-bold text-white">{{ formatNumber(workoutData.totalVolume.value) }} kg</p>
          </div>
          <div class="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Progress Over Time -->
    <div v-if="isLoading" class="card animate-pulse">
      <div class="h-6 bg-dark-600 rounded w-48 mb-6"></div>
      
      <!-- Power Exercise Records Skeleton -->
      <div class="mb-6">
        <div class="h-5 bg-dark-600 rounded w-40 mb-4"></div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div 
            v-for="i in 3" 
            :key="i"
            class="bg-dark-700 rounded-lg p-3 space-y-2"
          >
            <div class="h-4 bg-dark-600 rounded w-24"></div>
            <div class="h-6 bg-dark-600 rounded w-16"></div>
            <div class="h-3 bg-dark-600 rounded w-20"></div>
          </div>
        </div>
      </div>

      <!-- One Rep Max Progression Skeleton -->
      <div>
        <div class="h-5 bg-dark-600 rounded w-44 mb-4"></div>
        <div class="space-y-2">
          <div 
            v-for="i in 3" 
            :key="i"
            class="bg-dark-700 rounded-lg p-3 space-y-2"
          >
            <div class="h-4 bg-dark-600 rounded w-28"></div>
            <div class="h-6 bg-dark-600 rounded w-20"></div>
            <div class="h-3 bg-dark-600 rounded w-16"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Progress Over Time -->
    <div v-else class="card">
      <h3 class="text-lg font-semibold text-white mb-6">Fremgang over Tid</h3>
      
      <!-- Power Exercise Records -->
      <div class="mb-6">
        <h4 class="text-md font-medium text-white mb-4">Power Exercise Records</h4>
        <div v-if="powerExerciseRecords.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div 
            v-for="pr in powerExerciseRecords" 
            :key="pr.exercise"
            class="bg-dark-700 rounded-lg p-3"
          >
            <div class="text-sm text-dark-300">{{ pr.exercise }}</div>
            <div class="text-lg font-bold text-primary-500">{{ pr.weight }} kg</div>
            <div class="text-xs text-dark-300">{{ pr.reps }} reps • {{ pr.date }}</div>
          </div>
        </div>
        <div v-else class="bg-dark-700 rounded-lg p-4 text-sm text-dark-300">
          Ingen power exercise records ennå. Start med å trene Barbell Bench Press, Deadlift, Squat eller Barbell Shoulder Press for å bygge styrke.
        </div>
      </div>

      <!-- One Rep Max Progression -->
      <div>
        <h4 class="text-md font-medium text-white mb-4">One Rep Max Progresjon</h4>
        <div v-if="oneRepMaxProgression.length > 0" class="space-y-2">
          <div 
            v-for="max in oneRepMaxProgression" 
            :key="max.exercise"
            class="bg-dark-700 rounded-lg p-3"
          >
            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm text-white font-medium">{{ max.exercise }}</div>
                <div class="text-xs text-dark-300">{{ max.date }}</div>
              </div>
              <div class="text-right">
                <div class="text-lg font-bold text-primary-500">{{ max.weight }} kg</div>
                <div class="text-xs text-dark-300">1RM</div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="bg-dark-700 rounded-lg p-4 text-sm text-dark-300">
          For å logge 1RM: fullfør et sett med 1 repetisjon på en øvelse.
        </div>
      </div>
    </div>

    <!-- Training Habits -->
    <div v-if="isLoading" class="card animate-pulse">
      <div class="h-6 bg-dark-600 rounded w-32 mb-6"></div>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div v-for="i in 3" :key="i" class="text-center p-4 bg-dark-700 rounded-lg space-y-2">
          <div class="h-8 bg-dark-600 rounded w-16 mx-auto mb-1"></div>
          <div class="h-3 bg-dark-600 rounded w-32 mx-auto"></div>
        </div>
      </div>
    </div>

    <!-- Training Habits -->
    <div v-else class="card">
      <h3 class="text-lg font-semibold text-white mb-6">Treningsvaner</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Completed Workouts -->
        <div class="text-center p-4 bg-dark-700 rounded-lg">
          <div class="text-2xl font-bold text-primary-500 mb-1">{{ workoutData.completedSessions.value.length }}</div>
          <div class="text-xs text-dark-300">Antall økter fullført</div>
        </div>
        
        <!-- Rest Days -->
        <div class="text-center p-4 bg-dark-700 rounded-lg">
          <div class="text-2xl font-bold text-primary-500 mb-1">{{ restDaysCount }}</div>
          <div class="text-xs text-dark-300">Antall dager med restitusjon</div>
        </div>
      </div>

      <!-- Training Calendar (Monthly) -->
      <div class="mt-6">
        <h4 class="text-md font-medium text-white">Treningskalender</h4>
        <div class="flex items-center gap-2 mt-2 mb-4">
          <button @click="changeMonth(-1)" class="px-2 py-1 bg-dark-700 hover:bg-dark-600 rounded text-sm text-white">Forrige</button>
          <div class="text-sm text-dark-200 w-40 text-center capitalize">{{ monthLabel }}</div>
          <button v-if="canGoNext" @click="changeMonth(1)" class="px-2 py-1 bg-dark-700 hover:bg-dark-600 rounded text-sm text-white">Neste</button>
        </div>

        <!-- Weekday Labels -->
        <div class="grid grid-cols-7 gap-1 text-xs text-dark-300 mb-1">
          <div v-for="wd in weekDayLabels" :key="wd" class="text-center">{{ wd }}</div>
        </div>

        <!-- Month Grid -->
        <div class="grid grid-cols-7 gap-1">
          <template v-for="(week, wi) in monthlyCalendar" :key="wi">
            <div 
              v-for="day in week" 
              :key="day.key"
              class="aspect-square rounded-sm border border-dark-700 flex items-center justify-center text-xs select-none"
              :class="getMonthlyDayClass(day)"
              :title="`${formatDate(day.date)}: ${day.trained ? 'Trenet' : 'Ikke trent'}`"
            >
              <span>{{ day.date.getDate() }}</span>
            </div>
          </template>
        </div>

        <div class="flex items-center gap-4 mt-3 text-xs text-dark-300">
          <span>Ikke trent</span>
          <div class="w-3 h-3 bg-dark-700 rounded-sm"></div>
          <span>Trent</span>
          <div class="w-3 h-3 bg-primary-500 rounded-sm"></div>
        </div>
      </div>
    </div>

    <!-- Distribution and Balance -->
    <div v-if="isLoading" class="card animate-pulse">
      <div class="h-6 bg-dark-600 rounded w-40 mb-6"></div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div v-for="i in 2" :key="i" class="space-y-4">
          <div class="h-5 bg-dark-600 rounded w-44"></div>
          <div class="space-y-3">
            <div v-for="j in 3" :key="j" class="flex items-center gap-3">
              <div class="w-4 h-4 bg-dark-600 rounded-full"></div>
              <div class="h-4 bg-dark-600 rounded w-24 flex-1"></div>
              <div class="h-4 bg-dark-600 rounded w-12"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Distribution and Balance -->
    <div v-else class="card">
      <h3 class="text-lg font-semibold text-white mb-6">Fordeling og Balanse</h3>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Muscle Group Distribution -->
        <div>
          <h4 class="text-md font-medium text-white mb-4">Muskelgruppe Fordeling</h4>
          <div class="space-y-3">
            <div 
              v-for="group in muscleGroupDistribution" 
              :key="group.name"
              class="flex items-center gap-3"
            >
              <div class="w-4 h-4 rounded-full" :style="{ backgroundColor: group.color }"></div>
              <div class="flex-1 text-sm text-white">{{ group.name }}</div>
              <div class="text-sm font-medium text-primary-500">{{ group.percentage }}%</div>
            </div>
          </div>
        </div>
        
        <!-- Training Type Balance -->
        <div>
          <h4 class="text-md font-medium text-white mb-4">Trenings Type Balanse</h4>
          <div class="space-y-3">
            <div 
              v-for="type in trainingTypeBalance" 
              :key="type.name"
              class="flex items-center gap-3"
            >
              <div class="w-4 h-4 rounded-full" :style="{ backgroundColor: type.color }"></div>
              <div class="flex-1 text-sm text-white">{{ type.name }}</div>
              <div class="text-sm font-medium text-primary-500">{{ type.percentage }}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Achievements and Motivation -->
    <div class="card">
      <h3 class="text-lg font-semibold text-white mb-6">Prestasjoner og Motivasjon</h3>
      
      <!-- Achievements Grid -->
      <div v-if="isLoading" class="mb-6">
        <div class="h-5 bg-dark-600 rounded w-32 mb-4"></div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 animate-pulse">
          <div v-for="i in 8" :key="i" class="text-center p-3 bg-dark-700 rounded-lg space-y-2">
            <div class="h-6 bg-dark-600 rounded w-8 mx-auto"></div>
            <div class="h-3 bg-dark-600 rounded w-16 mx-auto"></div>
            <div class="h-3 bg-dark-600 rounded w-20 mx-auto"></div>
          </div>
        </div>
      </div>

      <!-- Achievements Grid -->
      <div v-else class="mb-6">
        <h4 class="text-md font-medium text-white mb-4">Prestasjoner</h4>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div 
            v-for="achievement in achievements" 
            :key="achievement.id"
            class="text-center p-3 bg-dark-700 rounded-lg"
            :class="{ 'border-2 border-primary-500': achievement.earned, 'opacity-50': !achievement.earned }"
          >
            <div class="text-2xl mb-1">{{ achievement.icon }}</div>
            <div class="text-xs text-white font-medium">{{ achievement.title }}</div>
            <div class="text-xs text-dark-300">{{ achievement.description }}</div>
          </div>
        </div>
      </div>

      <!-- Volume Progress -->
      <div v-if="isLoading" class="animate-pulse">
        <div class="h-5 bg-dark-600 rounded w-16 mb-1"></div>
        <div class="h-3 bg-dark-600 rounded w-64 mb-4"></div>
        <div class="bg-dark-700 rounded-lg p-4 space-y-2">
          <div class="flex items-center justify-between">
            <div class="h-4 bg-dark-600 rounded w-32"></div>
            <div class="h-4 bg-dark-600 rounded w-24"></div>
          </div>
          <div class="w-full bg-dark-600 rounded-full h-2"></div>
          <div class="h-3 bg-dark-600 rounded w-48"></div>
        </div>
      </div>

      <!-- Volume Progress (Total volume toward next milestone) -->
      <div v-else>
        <h4 class="text-md font-medium text-white mb-1">Volum</h4>
        <p class="text-xs text-dark-300 mb-4">Totalvolum er summen av vekt × reps i alle fullførte økter.</p>
        <div class="bg-dark-700 rounded-lg p-4 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm text-white">Neste mål: {{ formatNumber(volumeProgress.nextTarget) }} kg</span>
            <span class="text-sm text-primary-500">{{ formatNumber(volumeProgress.current) }} / {{ formatNumber(volumeProgress.nextTarget) }} kg</span>
          </div>
          <div class="w-full bg-dark-600 rounded-full h-2">
            <div 
              class="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-500"
              :style="{ width: `${volumeProgress.percentage}%` }"
            ></div>
          </div>
          <div v-if="volumeProgress.isMax" class="text-xs text-dark-300">Du har nådd høyeste milepæl. Rått!</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useHybridData } from '@/composables/useHybridData'

const workoutData = useHybridData()

// Loading state
const isLoading = computed(() => workoutData.isLoading.value)

// Computed
const averageVolumePerWorkout = computed(() => {
  if (workoutData.completedSessions.value.length === 0) return 0
  return workoutData.totalVolume.value / workoutData.completedSessions.value.length
})

const totalSets = computed(() => {
  return workoutData.completedSessions.value.reduce((total, session) => {
    return total + session.exercises.reduce((exerciseTotal, exercise) => {
      return exerciseTotal + exercise.sets.filter(set => set.isCompleted).length
    }, 0)
  }, 0)
})

const totalReps = computed(() => {
  return workoutData.completedSessions.value.reduce((total, session) => {
    return total + session.exercises.reduce((exerciseTotal, exercise) => {
      return exerciseTotal + exercise.sets.reduce((setTotal, set) => {
        return setTotal + (set.isCompleted && set.reps ? set.reps : 0)
      }, 0)
    }, 0)
  }, 0)
})

const workoutTypeStats = computed(() => {
  const typeCounts: { [key: string]: number } = {}
  
  workoutData.completedSessions.value.forEach(session => {
    typeCounts[session.workoutType] = (typeCounts[session.workoutType] || 0) + 1
  })

  const totalSessions = workoutData.completedSessions.value.length
  
  return workoutData.workoutTypes.value.map(type => ({
    id: type.id,
    name: type.name,
    color: type.color,
    count: typeCounts[type.id] || 0,
    percentage: totalSessions > 0 ? Math.round((typeCounts[type.id] || 0) / totalSessions * 100) : 0
  })).filter(stat => stat.count > 0)
})

const bestPerformances = computed(() => {
  const performances: { [key: string]: { name: string; weight: number; reps: number; date: string; volume: number } } = {}
  
  workoutData.completedSessions.value.forEach(session => {
    session.exercises.forEach(exercise => {
      exercise.sets.forEach(set => {
        if (set.isCompleted && set.weight && set.reps) {
          const volume = set.weight * set.reps
          const exerciseId = exercise.exerciseId
          
          if (!performances[exerciseId] || volume > performances[exerciseId].volume) {
            performances[exerciseId] = {
              name: exercise.name,
              weight: set.weight,
              reps: set.reps,
              date: formatDate(session.date),
              volume: volume
            }
          }
        }
      })
    })
  })
  
  return Object.values(performances)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5)
})

const muscleGroupStats = computed(() => {
  const groupVolumes: { [key: string]: number } = {}
  
  workoutData.completedSessions.value.forEach(session => {
    session.exercises.forEach(exercise => {
      // Get exercise data to find muscle groups
      const exerciseData = workoutData.exercises.value.find(e => e.id === exercise.exerciseId)
      const muscleGroups = exerciseData?.muscleGroups || []
      
      exercise.sets.forEach(set => {
        if (set.isCompleted && set.weight && set.reps) {
          const volume = set.weight * set.reps
          muscleGroups.forEach((group: string) => {
            groupVolumes[group] = (groupVolumes[group] || 0) + volume
          })
        }
      })
    })
  })
  
  return Object.entries(groupVolumes)
    .map(([name, volume]) => ({ name, volume }))
    .sort((a, b) => b.volume - a.volume)
})

const currentStreak = computed(() => {
  return getCurrentStreak()
})

const longestStreak = computed(() => {
  if (workoutData.completedSessions.value.length === 0) return 0
  
  const sortedSessions = [...workoutData.completedSessions.value]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  let maxStreak = 0
  let currentStreak = 0
  let lastDate: Date | null = null
  
  for (const session of sortedSessions) {
    const sessionDate = new Date(session.date)
    sessionDate.setHours(0, 0, 0, 0)
    
    if (lastDate) {
      const daysDiff = Math.floor((sessionDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
      if (daysDiff === 1) {
        currentStreak++
      } else {
        maxStreak = Math.max(maxStreak, currentStreak)
        currentStreak = 1
      }
    } else {
      currentStreak = 1
    }
    
    lastDate = sessionDate
  }
  
  return Math.max(maxStreak, currentStreak)
})

const averageWorkoutsPerWeek = computed(() => {
  if (workoutData.completedSessions.value.length === 0) return 0
  
  const sortedSessions = [...workoutData.completedSessions.value]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  if (sortedSessions.length < 2) return 1
  
  const firstDate = new Date(sortedSessions[0].date)
  const lastDate = new Date(sortedSessions[sortedSessions.length - 1].date)
  const weeksDiff = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 7))
  
  return weeksDiff > 0 ? Math.round((sortedSessions.length / weeksDiff) * 10) / 10 : sortedSessions.length
})

const consistencyPercentage = computed(() => {
  if (workoutData.completedSessions.value.length === 0) return 0
  
  const sortedSessions = [...workoutData.completedSessions.value]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  if (sortedSessions.length < 2) return 100
  
  const firstDate = new Date(sortedSessions[0].date)
  const lastDate = new Date(sortedSessions[sortedSessions.length - 1].date)
  const totalDays = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24))
  
  // Count days with workouts
  const workoutDays = new Set()
  sortedSessions.forEach(session => {
    const date = new Date(session.date)
    date.setHours(0, 0, 0, 0)
    workoutDays.add(date.getTime())
  })
  
  return totalDays > 0 ? Math.round((workoutDays.size / totalDays) * 100) : 100
})

// Methods
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('no-NO').format(Math.round(num))
}

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('no-NO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date)
}

const getWorkoutTypeName = (typeId: string): string => {
  return workoutData.getWorkoutType.value(typeId)
}

const getWorkoutTypeColor = (typeId: string): string => {
  return workoutData.getWorkoutTypeColor.value(typeId)
}

const getWeeklyProgressPercentage = (volume: number): number => {
  const maxVolume = Math.max(...workoutData.workoutStats.value.weeklyProgress.map(w => w.volume))
  if (maxVolume === 0) return 0
  return Math.round((volume / maxVolume) * 100)
}

const getCalendarDayClass = (trained: boolean): string => {
  if (!trained) return 'bg-dark-700'
  return 'bg-primary-500 rounded-sm'
}

// Monthly calendar state
import { ref } from 'vue'
const currentMonth = ref(new Date())
const monthOffset = ref(0)

const monthLabel = computed(() => {
  return new Intl.DateTimeFormat('no-NO', { month: 'long', year: 'numeric' }).format(currentMonth.value)
})

const canGoNext = computed(() => monthOffset.value < 0)

const weekDayLabels = computed(() => {
  // Monday first
  const base = [] as string[]
  const formatter = new Intl.DateTimeFormat('no-NO', { weekday: 'short' })
  // Build week starting Monday
  const monday = new Date(2020, 5, 1) // arbitrary Monday (June 1, 2020 is Monday)
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    base.push(formatter.format(d))
  }
  return base
})

type MonthlyDay = { date: Date; trained: boolean; inCurrentMonth: boolean; key: string }

const monthlyCalendar = computed(() => {
  const firstOfMonth = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth(), 1)
  const lastOfMonth = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 0)

  // Determine start on Monday
  const start = new Date(firstOfMonth)
  const day = (firstOfMonth.getDay() + 6) % 7 // 0 Monday ... 6 Sunday
  start.setDate(firstOfMonth.getDate() - day)

  // End at Sunday of the last week
  const end = new Date(lastOfMonth)
  const endDay = (lastOfMonth.getDay() + 6) % 7
  end.setDate(lastOfMonth.getDate() + (6 - endDay))

  // Build a Set of trained days for quick lookup
  const trainedDays = new Set<number>()
  workoutData.completedSessions.value.forEach(session => {
    const d = new Date(session.date)
    d.setHours(0, 0, 0, 0)
    trainedDays.add(d.getTime())
  })

  const weeks: MonthlyDay[][] = []
  let cursor = new Date(start)
  while (cursor <= end) {
    const week: MonthlyDay[] = []
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(cursor)
      dayDate.setHours(0, 0, 0, 0)
      const inCurrentMonth = dayDate.getMonth() === currentMonth.value.getMonth()
      const trained = trainedDays.has(dayDate.getTime())
      week.push({
        date: new Date(dayDate),
        trained,
        inCurrentMonth,
        key: `${dayDate.getFullYear()}-${dayDate.getMonth()}-${dayDate.getDate()}`
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
})

const getMonthlyDayClass = (day: MonthlyDay): string => {
  const base = day.inCurrentMonth ? '' : 'opacity-40'
  const fill = day.trained ? 'bg-primary-500 text-white' : 'bg-dark-700 text-dark-300'
  return `${base} ${fill}`
}

const changeMonth = (delta: number) => {
  // Prevent navigating to future months beyond current month
  if (delta > 0 && monthOffset.value >= 0) return
  const next = new Date(currentMonth.value)
  next.setMonth(currentMonth.value.getMonth() + delta)
  currentMonth.value = next
  monthOffset.value += delta
}

const getMuscleGroupPercentage = (volume: number): number => {
  const maxVolume = Math.max(...muscleGroupStats.value.map(group => group.volume))
  if (maxVolume === 0) return 0
  return Math.round((volume / maxVolume) * 100)
}



const trainingCalendar = computed(() => {
  const calendar: { date: string; trained: boolean }[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30); // Show last 30 days

  for (let i = 0; i < 30; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    date.setHours(0, 0, 0, 0);

    const sessionsOnDate = workoutData.completedSessions.value.filter(session => {
      const sessionDate = new Date(session.date);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.getTime() === date.getTime();
    });

    const trained = sessionsOnDate.length > 0;
    calendar.push({ date: formatDate(date), trained: trained });
  }
  return calendar;
});

const oneRepMaxProgression = computed(() => {
  const oneRepMaxes: { [key: string]: { exercise: string; weight: number; date: string } } = {}
  
  workoutData.completedSessions.value.forEach(session => {
    session.exercises.forEach(exercise => {
      exercise.sets.forEach(set => {
        // Look for sets with exactly 1 rep (one rep max attempts)
        if (set.isCompleted && set.weight && set.reps === 1) {
          const exerciseId = exercise.exerciseId
          
          // Keep the highest weight for each exercise
          if (!oneRepMaxes[exerciseId] || set.weight > oneRepMaxes[exerciseId].weight) {
            oneRepMaxes[exerciseId] = {
              exercise: exercise.name,
              weight: set.weight,
              date: formatDate(session.date)
            }
          }
        }
      })
    })
  })
  
  return Object.values(oneRepMaxes)
    .sort((a, b) => b.weight - a.weight) // Sort by weight descending
    .slice(0, 5) // Show top 5
})

const powerExerciseRecords = computed(() => {
  // Define power exercises (major compound movements) - now using specific variant IDs
  const powerExerciseIds = [
    'barbell-bench-press',           // Barbell Bench Press variant
    'deadlift',                      // Deadlift (no variants)
    'squat',                         // Squat (no variants)
    'barbell-shoulder-press'         // Barbell Shoulder Press variant
  ]
  
  const records: { exercise: string; weight: number; reps: number; date: string }[] = []
  
  // Get all completed sessions
  const completedSessions = workoutData.completedSessions.value.filter(session => session.isCompleted)
  
  // Find the best performance for each power exercise
  powerExerciseIds.forEach(exerciseId => {
    let bestSet: { weight: number; reps: number; date: Date } | null = null
    let bestVolume = 0
    
    completedSessions.forEach(session => {
      const exercise = session.exercises.find(e => e.exerciseId === exerciseId)
      if (exercise) {
        exercise.sets.forEach(set => {
          if (set.isCompleted && set.weight && set.reps) {
            const volume = set.weight * set.reps
            if (volume > bestVolume) {
              bestVolume = volume
              bestSet = {
                weight: set.weight,
                reps: set.reps,
                date: session.date
              }
            }
          }
        })
      }
    })
    
    if (bestSet) {
      // Get exercise name from exercises data using the new helper function
      const exerciseData = workoutData.getExerciseById.value(exerciseId)
      if (exerciseData) {
        records.push({
          exercise: exerciseData.name,
          weight: (bestSet as { weight: number; reps: number; date: Date }).weight,
          reps: (bestSet as { weight: number; reps: number; date: Date }).reps,
          date: formatDate((bestSet as { weight: number; reps: number; date: Date }).date)
        })
      }
    }
  })
  
  // Sort by weight (highest first), then by reps, then by date
  return records.sort((a, b) => {
    if (a.weight !== b.weight) return b.weight - a.weight
    if (a.reps !== b.reps) return b.reps - a.reps
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })
})

// Helper function to get better exercise display names
const getExerciseDisplayName = (exerciseId: string): string => {
  const mainExercise = workoutData.getMainExerciseByVariantId.value(exerciseId)
  if (mainExercise && mainExercise.variants) {
    const variant = mainExercise.variants.find((v: any) => v.id === exerciseId)
    return variant ? `${mainExercise.name} - ${variant.name}` : mainExercise.name
  }
  
  // Fallback to direct exercise lookup
  const exerciseData = workoutData.getExerciseById.value(exerciseId)
  return exerciseData?.name || exerciseId
}

const muscleGroupDistribution = computed(() => {
  const totalVolume = muscleGroupStats.value.reduce((sum, group) => sum + group.volume, 0)
  if (totalVolume === 0) return []

  return muscleGroupStats.value.map(group => ({
    name: group.name,
    color: getWorkoutTypeColor(group.name), // Assuming muscle groups are workout types for now
    percentage: Math.round((group.volume / totalVolume) * 100)
  }))
})

const trainingTypeBalance = computed(() => {
  const typeCounts: { [key: string]: number } = {}
  workoutData.completedSessions.value.forEach(session => {
    typeCounts[session.workoutType] = (typeCounts[session.workoutType] || 0) + 1
  })

  const totalSessions = workoutData.completedSessions.value.length
  if (totalSessions === 0) return []

  return workoutData.workoutTypes.value.map(type => ({
    name: type.name,
    color: type.color,
    percentage: Math.round((typeCounts[type.id] || 0) / totalSessions * 100)
  }))
})

type Achievement = { id: string; icon: string; title: string; description: string; earned: boolean }

const achievements = computed(() => {
  const sessions = workoutData.completedSessions.value
  const totalSessions = sessions.length

  // Metrics
  const uniqueExerciseIds = new Set<string>()
  sessions.forEach(s => s.exercises.forEach(e => uniqueExerciseIds.add(e.exerciseId)))

  const oneRmExercises = new Set<string>()
  sessions.forEach(s => s.exercises.forEach(e => e.sets.forEach(set => {
    if (set.isCompleted && set.weight && set.reps === 1) {
      oneRmExercises.add(e.exerciseId)
    }
  })))

  let morningCount = 0
  let nightCount = 0
  sessions.forEach(s => {
    const h = new Date(s.date).getHours()
    if (h >= 5 && h < 9) morningCount++
    if (h >= 20 && h <= 23) nightCount++
  })

  const trainedMonths = new Set<string>()
  sessions.forEach(s => {
    const d = new Date(s.date)
    trainedMonths.add(`${d.getFullYear()}-${d.getMonth()}`)
  })

  const now = new Date()
  const mondayOfThisWeek = new Date(now)
  const dayIdx = (now.getDay() + 6) % 7
  mondayOfThisWeek.setDate(now.getDate() - dayIdx)
  mondayOfThisWeek.setHours(0, 0, 0, 0)
  const sundayOfThisWeek = new Date(mondayOfThisWeek)
  sundayOfThisWeek.setDate(mondayOfThisWeek.getDate() + 6)
  sundayOfThisWeek.setHours(23, 59, 59, 999)
  const workoutsThisWeek = sessions.filter(s => {
    const d = new Date(s.date)
    return d >= mondayOfThisWeek && d <= sundayOfThisWeek
  })

  const distribution = muscleGroupDistribution.value
  const topShare = distribution.reduce((m, g) => Math.max(m, g.percentage), 0)
  const groupsAbove15 = distribution.filter(g => g.percentage >= 15).length

  const all: Achievement[] = [
    { id: 'first-workout', icon: '🎬', title: 'Første økt', description: 'Du fullførte din første økt!', earned: totalSessions >= 1 },
    { id: 'workouts-10', icon: '🔟', title: '10 økter', description: 'To-sifret antall økter!', earned: totalSessions >= 10 },
    { id: 'workouts-50', icon: '🏅', title: '50 økter', description: 'Solid mengde arbeid!', earned: totalSessions >= 50 },
    { id: 'workouts-100', icon: '🥇', title: '100 økter', description: 'Tresifret — imponerende!', earned: totalSessions >= 100 },

    { id: 'sets-500', icon: '⚙️', title: '500 sets', description: 'Du har fullført 500 sets!', earned: totalSets.value >= 500 },
    { id: 'sets-2000', icon: '⚙️', title: '2000 sets', description: 'Maskineri i arbeid!', earned: totalSets.value >= 2000 },
    { id: 'reps-1000', icon: '💪', title: '1000 reps', description: 'Fire siffer med reps!', earned: totalReps.value >= 1000 },
    { id: 'reps-5000', icon: '💪', title: '5000 reps', description: 'Fem siffer med reps!', earned: totalReps.value >= 5000 },

    { id: 'streak-7', icon: '🔥', title: '7 dagers streak', description: 'En uke på rad!', earned: currentStreak.value >= 7 },
    { id: 'streak-30', icon: '⚡️', title: '30 dagers streak', description: 'Du har holdt 30 dager på rad!', earned: currentStreak.value >= 30 },
    { id: 'streak-14-best', icon: '🏁', title: 'Lengste streak 14+', description: 'Sterk kontinuitet!', earned: longestStreak.value >= 14 },
    { id: 'volume-1m', icon: '🏆', title: '1 000 000 kg totalvolum', description: 'En million kilo løftet!', earned: Math.round(workoutData.totalVolume.value) >= 1000000 },

    { id: '1rm-first', icon: '🧱', title: 'Første 1RM', description: 'Du har logget en 1RM‑økt (1 rep).', earned: oneRmExercises.size >= 1 },
    { id: '1rm-5-exercises', icon: '🏋️', title: '1RM på 5 øvelser', description: 'Bred styrketesting!', earned: oneRmExercises.size >= 5 },

    { id: 'variety-10', icon: '🧩', title: 'Variasjon 10+', description: 'Du har trent 10 forskjellige øvelser.', earned: uniqueExerciseIds.size >= 10 },
    { id: 'variety-20', icon: '🧩', title: 'Variasjon 20+', description: 'Bredt øvelsesutvalg!', earned: uniqueExerciseIds.size >= 20 },

    { id: 'balanced-training', icon: '⚖️', title: 'Balansert trening', description: 'God fordeling mellom muskelgrupper.', earned: (distribution.length >= 3 && topShare <= 40 && groupsAbove15 >= 3) },

    { id: 'week-3plus', icon: '📅', title: '3+ økter denne uken', description: 'Stødig rytme!', earned: workoutsThisWeek.length >= 3 },

    { id: 'morning-trainer', icon: '🌅', title: 'Morgenhelt', description: '5 økter før kl 09.', earned: morningCount >= 5 },
    { id: 'night-owl', icon: '🌙', title: 'Nattugle', description: '5 økter etter kl 20.', earned: nightCount >= 5 },

    { id: 'months-6', icon: '🗓️', title: '6 aktive måneder', description: 'Halvt år med aktivitet!', earned: trainedMonths.size >= 6 },
    { id: 'months-12', icon: '🗓️', title: '12 aktive måneder', description: 'Et helt år med trening!', earned: trainedMonths.size >= 12 }
  ]

  return all
})

type VolumeProgress = { current: number; nextTarget: number; percentage: number; isMax: boolean }

const volumeProgress = computed<VolumeProgress>(() => {
  const current = Math.max(0, Math.round(workoutData.totalVolume.value))
  const targets = [5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000]
  const nextTarget = targets.find(t => current < t) ?? targets[targets.length - 1]
  const isMax = current >= targets[targets.length - 1]
  const denominator = isMax ? current || 1 : nextTarget
  const percentage = Math.min(100, Math.round((current / denominator) * 100))
  return { current, nextTarget, percentage, isMax }
})

const totalDuration = computed(() => {
  if (workoutData.completedSessions.value.length === 0) return 0
  return workoutData.completedSessions.value.reduce((total, session) => {
    return total + session.duration
  }, 0)
})

const restDaysCount = computed(() => {
  if (workoutData.completedSessions.value.length === 0) return 0
  
  const sortedSessions = [...workoutData.completedSessions.value]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  if (sortedSessions.length < 2) return 0
  
  const firstDate = new Date(sortedSessions[0].date)
  const lastDate = new Date(sortedSessions[sortedSessions.length - 1].date)
  
  // Count total days between first and last workout
  const totalDays = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  
  // Count workout days
  const workoutDays = new Set()
  sortedSessions.forEach(session => {
    const date = new Date(session.date)
    date.setHours(0, 0, 0, 0)
    workoutDays.add(date.getTime())
  })
  
  // Rest days = total days - workout days
  return Math.max(0, totalDays - workoutDays.size)
})

const getCurrentStreak = (): number => {
  if (workoutData.completedSessions.value.length === 0) return 0
  
  const sortedSessions = [...workoutData.completedSessions.value]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  
  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  for (let i = 0; i < sortedSessions.length; i++) {
    const sessionDate = new Date(sortedSessions[i].date)
    sessionDate.setHours(0, 0, 0, 0)
    
    const daysDiff = Math.floor((today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff === streak) {
      streak++
    } else {
      break
    }
  }
  
  return streak
}
</script> 