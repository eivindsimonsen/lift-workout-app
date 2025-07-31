<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-white mb-2">Historikk</h1>
        <p class="text-dark-300">Alle dine treningsøkter</p>
      </div>
      <router-link to="/new-workout" class="btn-primary">
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Ny Økt
      </router-link>
    </div>

    <!-- Filters and Search -->
    <div class="card">
      <div class="flex flex-col md:flex-row gap-4">
        <div class="flex-1">
          <label class="block text-sm font-medium text-white mb-2">Søk</label>
          <input 
            v-model="searchQuery"
            type="text"
            placeholder="Søk etter øktnavn eller øvelser..."
            class="input-field w-full"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-white mb-2">Sorter etter</label>
          <select v-model="sortBy" class="input-field">
            <option value="date">Dato (nyeste først)</option>
            <option value="name">Navn (A-Å)</option>
            <option value="duration">Varighet (lengste først)</option>
            <option value="volume">Volum (høyeste først)</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Workouts List -->
    <div v-if="filteredWorkouts.length === 0" class="text-center py-12">
      <div class="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <p class="text-dark-300 mb-4">
        {{ searchQuery ? 'Ingen økter matcher søket ditt' : 'Ingen økter registrert ennå' }}
      </p>
      <router-link v-if="!searchQuery" to="/new-workout" class="btn-primary">
        Start din første økt
      </router-link>
    </div>

    <div v-else class="space-y-4">
      <div 
        v-for="workout in filteredWorkouts" 
        :key="workout.id"
        class="card hover:bg-dark-750 transition-colors cursor-pointer"
        @click="showWorkoutDetails(workout)"
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
            <button 
              @click.stop="deleteWorkout(workout.id)"
              class="text-red-400 hover:text-red-300 p-2"
              title="Slett økt"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <svg class="w-4 h-4 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Workout Details Modal -->
    <div 
      v-if="selectedWorkout"
      class="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      @click="selectedWorkout = null"
    >
      <div 
        class="bg-dark-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        @click.stop
      >
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-white">{{ selectedWorkout.name }}</h2>
            <button 
              @click="selectedWorkout = null"
              class="text-dark-400 hover:text-white"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="bg-dark-700 rounded-lg p-4">
              <p class="text-dark-300 text-sm">Dato</p>
              <p class="text-white font-semibold">{{ formatDate(selectedWorkout.date) }}</p>
            </div>
            <div class="bg-dark-700 rounded-lg p-4">
              <p class="text-dark-300 text-sm">Varighet</p>
              <p class="text-white font-semibold">{{ selectedWorkout.duration }} min</p>
            </div>
            <div class="bg-dark-700 rounded-lg p-4">
              <p class="text-dark-300 text-sm">Total Volum</p>
              <p class="text-white font-semibold">{{ formatNumber(selectedWorkout.totalVolume || 0) }} kg</p>
            </div>
          </div>

          <div class="space-y-6">
            <div 
              v-for="exercise in selectedWorkout.exercises" 
              :key="exercise.id"
              class="bg-dark-700 rounded-lg p-4"
            >
              <h3 class="text-lg font-semibold text-white mb-3">{{ exercise.name }}</h3>
              
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

              <p v-if="exercise.notes" class="text-sm text-dark-300 mt-3 italic">
                {{ exercise.notes }}
              </p>
            </div>
          </div>

          <div v-if="selectedWorkout.notes" class="mt-6 p-4 bg-dark-700 rounded-lg">
            <h4 class="text-sm font-medium text-white mb-2">Notater</h4>
            <p class="text-dark-200">{{ selectedWorkout.notes }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWorkoutStore } from '@/stores/workoutStore'
import type { Workout } from '@/types/workout'

const workoutStore = useWorkoutStore()

const searchQuery = ref('')
const sortBy = ref('date')
const selectedWorkout = ref<Workout | null>(null)

const filteredWorkouts = computed(() => {
  let workouts = [...workoutStore.workouts]

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    workouts = workouts.filter(workout => 
      workout.name.toLowerCase().includes(query) ||
      workout.exercises.some(exercise => 
        exercise.name.toLowerCase().includes(query)
      ) ||
      workout.notes?.toLowerCase().includes(query)
    )
  }

  // Sort workouts
  workouts.sort((a, b) => {
    switch (sortBy.value) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'duration':
        return b.duration - a.duration
      case 'volume':
        return (b.totalVolume || 0) - (a.totalVolume || 0)
      case 'date':
      default:
        return new Date(b.date).getTime() - new Date(a.date).getTime()
    }
  })

  return workouts
})

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

const showWorkoutDetails = (workout: Workout) => {
  selectedWorkout.value = workout
}

const deleteWorkout = (id: string) => {
  if (confirm('Er du sikker på at du vil slette denne økten?')) {
    workoutStore.deleteWorkout(id)
  }
}
</script> 