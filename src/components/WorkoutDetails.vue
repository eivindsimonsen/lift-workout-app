<template>
  <div class="space-y-6">
    <!-- Workout Header -->
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-bold text-white">{{ workout.name }}</h2>
      <button 
        @click="$emit('close')"
        class="text-dark-400 hover:text-white"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Workout Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-dark-700 rounded-lg p-4">
        <p class="text-dark-300 text-sm">Dato</p>
        <p class="text-white font-semibold">{{ formatDate(workout.date) }}</p>
      </div>
      <div class="bg-dark-700 rounded-lg p-4">
        <p class="text-dark-300 text-sm">Varighet</p>
        <p class="text-white font-semibold">{{ workout.duration }} min</p>
      </div>
      <div class="bg-dark-700 rounded-lg p-4">
        <p class="text-dark-300 text-sm">Total Volum</p>
        <p class="text-white font-semibold">{{ formatNumber(workout.totalVolume || 0) }} kg</p>
      </div>
    </div>

    <!-- Exercises -->
    <div class="space-y-6">
      <h3 class="text-xl font-semibold text-white">Øvelser</h3>
      <div class="space-y-4">
        <ExerciseCard 
          v-for="exercise in workout.exercises" 
          :key="exercise.id"
          :exercise="exercise"
        />
      </div>
    </div>


  </div>
</template>

<script setup lang="ts">
import ExerciseCard from './ExerciseCard.vue'
import type { Workout } from '@/types/workout'

interface Props {
  workout: Workout
}

defineProps<Props>()

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