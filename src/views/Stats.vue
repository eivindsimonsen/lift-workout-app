<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-white mb-2">Statistikk</h1>
        <p class="text-dark-300">Din treningsprogresjon over tid</p>
      </div>
    </div>

    <!-- Overview Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
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
            <p class="text-dark-300 text-sm">Snitt Volum/økt</p>
            <p class="text-2xl font-bold text-white">{{ formatNumber(averageVolumePerWorkout) }} kg</p>
          </div>
          <div class="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Workout Type Distribution -->
    <div class="card">
      <h3 class="text-lg font-semibold text-white mb-6">Økt Type Fordeling</h3>
      <div class="space-y-4">
        <div 
          v-for="type in workoutTypeStats" 
          :key="type.id"
          class="flex items-center gap-4"
        >
          <div class="w-20 text-sm text-dark-300">{{ type.name }}</div>
          <div class="flex-1 bg-dark-700 rounded-full h-4 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :style="{ 
                width: `${type.percentage}%`,
                backgroundColor: type.color
              }"
            ></div>
          </div>
          <div class="w-16 text-right text-sm font-medium text-white">
            {{ type.count }}
          </div>
        </div>
      </div>
    </div>

    <!-- Weekly Progress -->
    <div class="card">
      <h3 class="text-lg font-semibold text-white mb-6">Ukentlig Progresjon</h3>
      <div class="space-y-4">
        <div 
          v-for="week in workoutData.workoutStats.value.weeklyProgress" 
          :key="week.week"
          class="flex items-center gap-4"
        >
          <div class="w-20 text-sm text-dark-300">{{ week.week }}</div>
          <div class="flex-1 bg-dark-700 rounded-full h-4 overflow-hidden">
            <div
              class="bg-gradient-to-r from-primary-500 to-primary-600 h-full rounded-full transition-all duration-500"
              :style="{ width: `${getWeeklyProgressPercentage(week.volume)}%` }"
            ></div>
          </div>
          <div class="w-16 text-right text-sm font-medium text-white">
            {{ formatNumber(week.volume) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Most Used Exercises -->
    <div class="card">
      <h3 class="text-lg font-semibold text-white mb-6">Mest Brukte Øvelser</h3>
      <div class="space-y-4">
        <div 
          v-for="exercise in workoutData.workoutStats.value.mostUsedExercises" 
          :key="exercise.name"
          class="flex items-center gap-4"
        >
          <div class="flex-1 text-sm text-dark-300">{{ exercise.name }}</div>
          <div class="flex-1 bg-dark-700 rounded-full h-4 overflow-hidden">
            <div
              class="bg-gradient-to-r from-primary-500 to-primary-600 h-full rounded-full transition-all duration-500"
              :style="{ width: `${getExerciseUsagePercentage(exercise.count)}%` }"
            ></div>
          </div>
          <div class="w-16 text-right text-sm font-medium text-white">
            {{ exercise.count }}
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="card">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-lg font-semibold text-white">Siste Aktivitet</h3>
        <router-link 
          to="/history" 
          class="text-primary-500 hover:text-primary-400 text-sm font-medium"
        >
          Se alle
        </router-link>
      </div>

      <div v-if="workoutData.recentSessions.value.length === 0" class="text-center py-8">
        <p class="text-dark-300">Ingen aktivitet ennå</p>
      </div>

      <div v-else class="space-y-4">
        <div 
          v-for="session in workoutData.recentSessions.value" 
          :key="session.id"
          class="flex items-center justify-between p-4 bg-dark-700 rounded-lg"
        >
          <div class="flex-1">
            <h4 class="font-medium text-white">{{ session.templateName }}</h4>
            <p class="text-sm text-dark-300">
              {{ formatDate(session.date) }} • {{ session.duration }} min
            </p>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-primary-500 font-medium">
              {{ formatNumber(session.totalVolume || 0) }} kg
            </span>
            <span 
              class="px-2 py-1 rounded-full text-xs font-medium"
              :style="{ 
                backgroundColor: getWorkoutTypeColor(session.workoutType) + '20',
                color: getWorkoutTypeColor(session.workoutType)
              }"
            >
              {{ getWorkoutTypeName(session.workoutType) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Motivation -->
    <div class="card">
      <h3 class="text-lg font-semibold text-white mb-4">Motivasjon</h3>
      <div class="space-y-4">
        <div class="p-4 bg-gradient-to-r from-primary-500/20 to-primary-600/20 rounded-lg border border-primary-500/30">
          <p class="text-white font-medium mb-2">Neste repetisjon</p>
                     <p class="text-dark-200 text-sm">
             Du har fullført {{ workoutData.completedSessions.value.length }} økter med totalt {{ formatNumber(workoutData.totalVolume.value) }} kg volum. 
             Hold deg konsistent og se resultatene komme!
           </p>
        </div>
        <div class="text-center">
          <p class="text-2xl font-bold text-primary-500 mb-1">
            {{ getCurrentStreak() }}
          </p>
          <p class="text-dark-300 text-sm">Dager på rad</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWorkoutData } from '@/composables/useWorkoutData'

const workoutData = useWorkoutData()

// Computed
const averageVolumePerWorkout = computed(() => {
  if (workoutData.completedSessions.value.length === 0) return 0
  return workoutData.totalVolume.value / workoutData.completedSessions.value.length
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
  const type = workoutData.getWorkoutType.value(typeId)
  return type?.name || typeId
}

const getWorkoutTypeColor = (typeId: string): string => {
  return workoutData.getWorkoutTypeColor.value(typeId)
}

const getWeeklyProgressPercentage = (volume: number): number => {
  const maxVolume = Math.max(...workoutData.workoutStats.value.weeklyProgress.map(w => w.volume))
  if (maxVolume === 0) return 0
  return Math.round((volume / maxVolume) * 100)
}

const getExerciseUsagePercentage = (count: number): number => {
  const maxCount = Math.max(...workoutData.workoutStats.value.mostUsedExercises.map(e => e.count))
  if (maxCount === 0) return 0
  return Math.round((count / maxCount) * 100)
}

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