<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-white mb-2">Statistikk</h1>
        <p class="text-dark-300">Din progresjon over tid</p>
      </div>
      <router-link to="/new-workout" class="btn-primary">
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Ny Økt
      </router-link>
    </div>

    <!-- Overview Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-dark-300 text-sm">Total Økter</p>
            <p class="text-2xl font-bold text-white">{{ workoutStore.workoutStats.totalWorkouts }}</p>
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
            <p class="text-dark-300 text-sm">Total Volum</p>
            <p class="text-2xl font-bold text-white">{{ formatNumber(workoutStore.workoutStats.totalVolume) }} kg</p>
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
            <p class="text-dark-300 text-sm">Snitt Varighet</p>
            <p class="text-2xl font-bold text-white">{{ workoutStore.workoutStats.averageWorkoutDuration }} min</p>
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
            <p class="text-dark-300 text-sm">Snitt Volum/Økt</p>
            <p class="text-2xl font-bold text-white">
              {{ workoutStore.workoutStats.totalWorkouts > 0 
                ? formatNumber(workoutStore.workoutStats.totalVolume / workoutStore.workoutStats.totalWorkouts) 
                : '0' }} kg
            </p>
          </div>
          <div class="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Weekly Progress Chart -->
      <div class="card">
        <h2 class="text-xl font-semibold text-white mb-6">Ukentlig Progresjon</h2>
        <div v-if="workoutStore.workoutStats.weeklyProgress.length === 0" class="text-center py-12">
          <div class="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p class="text-dark-300">Ingen data tilgjengelig ennå</p>
        </div>
        <div v-else class="space-y-4">
          <div 
            v-for="(week, index) in workoutStore.workoutStats.weeklyProgress" 
            :key="index"
            class="flex items-center gap-4"
          >
            <div class="w-20 text-sm text-dark-300">{{ week.week }}</div>
            <div class="flex-1 bg-dark-700 rounded-full h-4 overflow-hidden">
              <div 
                class="bg-gradient-to-r from-primary-500 to-primary-600 h-full rounded-full transition-all duration-500"
                :style="{ width: `${getProgressPercentage(week.volume)}%` }"
              ></div>
            </div>
            <div class="w-16 text-right text-sm font-medium text-white">
              {{ formatNumber(week.volume) }} kg
            </div>
          </div>
        </div>
      </div>

      <!-- Most Used Exercises -->
      <div class="card">
        <h2 class="text-xl font-semibold text-white mb-6">Mest Brukte Øvelser</h2>
        <div v-if="workoutStore.workoutStats.mostUsedExercises.length === 0" class="text-center py-12">
          <div class="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p class="text-dark-300">Ingen øvelser registrert ennå</p>
        </div>
        <div v-else class="space-y-4">
          <div 
            v-for="(exercise, index) in workoutStore.workoutStats.mostUsedExercises" 
            :key="exercise.name"
            class="flex items-center gap-4"
          >
            <div class="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center text-sm font-bold text-primary-500">
              {{ index + 1 }}
            </div>
            <div class="flex-1">
              <p class="text-white font-medium">{{ exercise.name }}</p>
              <p class="text-sm text-dark-300">{{ exercise.count }} ganger</p>
            </div>
            <div class="w-20 bg-dark-700 rounded-full h-2 overflow-hidden">
              <div 
                class="bg-primary-500 h-full rounded-full transition-all duration-500"
                :style="{ width: `${getExercisePercentage(exercise.count)}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="card">
      <h2 class="text-xl font-semibold text-white mb-6">Siste Aktivitet</h2>
      <div v-if="workoutStore.recentWorkouts.length === 0" class="text-center py-12">
        <p class="text-dark-300">Ingen økter registrert ennå</p>
      </div>
      <div v-else class="space-y-4">
        <div 
          v-for="workout in workoutStore.recentWorkouts.slice(0, 5)" 
          :key="workout.id"
          class="flex items-center justify-between p-4 bg-dark-700 rounded-lg"
        >
          <div class="flex items-center gap-4">
            <div class="w-3 h-3 bg-primary-500 rounded-full"></div>
            <div>
              <p class="text-white font-medium">{{ workout.name }}</p>
              <p class="text-sm text-dark-300">{{ formatDate(workout.date) }}</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-white font-medium">{{ formatNumber(workout.totalVolume || 0) }} kg</p>
            <p class="text-sm text-dark-300">{{ workout.duration }} min</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Motivation Section -->
    <div class="card">
      <h2 class="text-xl font-semibold text-white mb-6">Motivasjon</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="p-6 bg-gradient-to-r from-primary-500/20 to-primary-600/20 rounded-lg border border-primary-500/30">
          <h3 class="text-lg font-semibold text-white mb-2">Neste Mål</h3>
          <p class="text-dark-200 mb-4">
            Hold deg konsistent og se hvordan du utvikler deg over tid. Hver økt teller!
          </p>
          <div class="text-center">
            <p class="text-3xl font-bold text-primary-500 mb-1">
              {{ workoutStore.workoutStats.totalWorkouts + 1 }}
            </p>
            <p class="text-dark-300 text-sm">Neste økt</p>
          </div>
        </div>

        <div class="p-6 bg-gradient-to-r from-dark-700 to-dark-600 rounded-lg">
          <h3 class="text-lg font-semibold text-white mb-2">Progresjon</h3>
          <p class="text-dark-200 mb-4">
            Du har allerede fullført {{ workoutStore.workoutStats.totalWorkouts }} økter. 
            Fortsett å bygge på denne styrken!
          </p>
          <div class="text-center">
            <p class="text-3xl font-bold text-white mb-1">
              {{ formatNumber(workoutStore.workoutStats.totalVolume) }}
            </p>
            <p class="text-dark-300 text-sm">kg totalt løftet</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWorkoutStore } from '@/stores/workoutStore'

const workoutStore = useWorkoutStore()

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('no-NO').format(Math.round(num))
}

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('no-NO', {
    day: 'numeric',
    month: 'short'
  }).format(date)
}

const getProgressPercentage = (volume: number): number => {
  const maxVolume = Math.max(...workoutStore.workoutStats.weeklyProgress.map(w => w.volume))
  return maxVolume > 0 ? (volume / maxVolume) * 100 : 0
}

const getExercisePercentage = (count: number): number => {
  const maxCount = Math.max(...workoutStore.workoutStats.mostUsedExercises.map(e => e.count))
  return maxCount > 0 ? (count / maxCount) * 100 : 0
}
</script> 