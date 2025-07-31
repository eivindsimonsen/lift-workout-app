<template>
  <div 
    class="card hover:bg-dark-750 transition-colors cursor-pointer"
    @click="$emit('click')"
  >
    <div class="flex items-start justify-between">
      <div class="flex-1">
        <div class="flex items-center gap-3 mb-2">
          <h3 class="text-lg font-semibold text-white">{{ workout.name }}</h3>
          <span class="text-xs bg-primary-500/20 text-primary-400 px-2 py-1 rounded-full">
            {{ formatNumber(workout.totalVolume || 0) }} kg
          </span>
        </div>
        
        <div class="flex items-center gap-4 text-sm text-dark-300 mb-3">
          <span class="flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {{ formatDate(workout.date) }}
          </span>
          <span class="flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ workout.duration }} min
          </span>
          <span class="flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {{ workout.exercises.length }} øvelser
          </span>
        </div>

        <!-- Exercise Preview -->
        <div class="flex flex-wrap gap-2">
          <span 
            v-for="exercise in workout.exercises.slice(0, 3)" 
            :key="exercise.id"
            class="text-xs bg-dark-600 text-dark-200 px-2 py-1 rounded"
          >
            {{ exercise.name }}
          </span>
          <span 
            v-if="workout.exercises.length > 3"
            class="text-xs text-dark-400"
          >
            +{{ workout.exercises.length - 3 }} flere
          </span>
        </div>

        <!-- Notes Preview -->
        <p v-if="workout.notes" class="text-sm text-dark-300 mt-3 italic">
          "{{ workout.notes.length > 100 ? workout.notes.substring(0, 100) + '...' : workout.notes }}"
        </p>
      </div>

      <div class="flex items-center gap-2 ml-4">
        <slot name="actions">
          <svg class="w-4 h-4 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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