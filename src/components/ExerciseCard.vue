<template>
  <div class="bg-dark-700 rounded-lg p-4">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-lg font-semibold text-white">{{ exercise.name }}</h3>
      <div class="flex items-center gap-2">
        <span class="text-xs bg-primary-500/20 text-primary-400 px-2 py-1 rounded-full">
          {{ exercise.sets.length }} sett
        </span>
      </div>
    </div>

    <!-- Sets Table -->
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-dark-300 border-b border-dark-600">
            <th class="pb-2">Sett</th>
            <th class="pb-2">Reps</th>
            <th class="pb-2">Vekt (kg)</th>
            <th class="pb-2">Volum</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="(set, index) in exercise.sets" 
            :key="set.id"
            class="border-b border-dark-600/50"
          >
            <td class="py-2 text-white">{{ index + 1 }}</td>
            <td class="py-2 text-white">{{ set.reps }}</td>
            <td class="py-2 text-white">{{ set.weight || '-' }}</td>
            <td class="py-2 text-primary-400 font-medium">
              {{ formatNumber((set.reps || 0) * (set.weight || 0)) }} kg
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Exercise Notes -->
    <p v-if="exercise.notes" class="text-sm text-dark-300 mt-3 italic">
      {{ exercise.notes }}
    </p>

    <!-- Total Volume for Exercise -->
    <div class="mt-3 pt-3 border-t border-dark-600">
      <div class="flex justify-between items-center">
        <span class="text-sm text-dark-300">Total volum:</span>
        <span class="text-primary-500 font-semibold">
          {{ formatNumber(exerciseTotalVolume) }} kg
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Exercise } from '@/types/workout'

interface Props {
  exercise: Exercise
}

const props = defineProps<Props>()

const exerciseTotalVolume = computed(() => {
  return props.exercise.sets.reduce((total, set) => {
    const weight = set.weight || 0
    const reps = set.reps || 0
    return total + (reps * weight)
  }, 0)
})

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('no-NO').format(Math.round(num))
}
</script> 