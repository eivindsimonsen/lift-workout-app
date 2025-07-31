<template>
  <div class="space-y-8">
    <!-- Header with Start Workout button -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p class="text-dark-300">Din personlige treningslogg</p>
      </div>
      <router-link 
        to="/new-workout" 
        class="btn-primary inline-flex items-center gap-2"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Start Økt
      </router-link>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="card">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-dark-300 text-sm">Total Volum</p>
            <p class="text-2xl font-bold text-white">{{ formatNumber(workoutStore.totalVolume) }} kg</p>
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
            <p class="text-dark-300 text-sm">Antall Økter</p>
            <p class="text-2xl font-bold text-white">{{ workoutStore.workouts.length }}</p>
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
            <p class="text-2xl font-bold text-white">{{ workoutStore.averageWorkoutDuration }} min</p>
          </div>
          <div class="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Workouts -->
    <div class="card">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-semibold text-white">Siste Økter</h2>
        <router-link 
          to="/history" 
          class="text-primary-500 hover:text-primary-400 text-sm font-medium"
        >
          Se alle
        </router-link>
      </div>

      <div v-if="workoutStore.recentWorkouts.length === 0" class="text-center py-12">
        <div class="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p class="text-dark-300 mb-4">Ingen økter registrert ennå</p>
        <router-link to="/new-workout" class="btn-primary">
          Start din første økt
        </router-link>
      </div>

      <div v-else class="space-y-4">
        <div 
          v-for="workout in workoutStore.recentWorkouts" 
          :key="workout.id"
          class="flex items-center justify-between p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
        >
          <div class="flex-1">
            <h3 class="font-medium text-white">{{ workout.name }}</h3>
            <p class="text-sm text-dark-300">
              {{ formatDate(workout.date) }} • {{ workout.duration }} min
            </p>
            <p class="text-xs text-dark-400">
              {{ workout.exercises.length }} øvelser • {{ formatNumber(workout.totalVolume || 0) }} kg
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-primary-500 font-medium">
              {{ formatNumber(workout.totalVolume || 0) }} kg
            </span>
            <svg class="w-4 h-4 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="card">
        <h3 class="text-lg font-semibold text-white mb-4">Raske Handlinger</h3>
        <div class="space-y-3">
          <router-link 
            to="/new-workout" 
            class="flex items-center gap-3 p-3 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
          >
            <div class="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <p class="font-medium text-white">Ny Økt</p>
              <p class="text-sm text-dark-300">Registrer en ny treningsøkt</p>
            </div>
          </router-link>

          <router-link 
            to="/stats" 
            class="flex items-center gap-3 p-3 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
          >
            <div class="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p class="font-medium text-white">Statistikk</p>
              <p class="text-sm text-dark-300">Se din progresjon over tid</p>
            </div>
          </router-link>
        </div>
      </div>

      <div class="card">
        <h3 class="text-lg font-semibold text-white mb-4">Motivasjon</h3>
        <div class="space-y-4">
          <div class="p-4 bg-gradient-to-r from-primary-500/20 to-primary-600/20 rounded-lg border border-primary-500/30">
            <p class="text-white font-medium mb-2">Neste repetisjon</p>
            <p class="text-dark-200 text-sm">
              Hver økt er et steg mot ditt mål. Hold deg konsistent og se resultatene komme.
            </p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-primary-500 mb-1">
              {{ workoutStore.workouts.length }}
            </p>
            <p class="text-dark-300 text-sm">Økter fullført</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useWorkoutStore } from '@/stores/workoutStore'

const workoutStore = useWorkoutStore()

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
</script> 