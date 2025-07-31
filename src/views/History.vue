<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-white mb-2">Historikk</h1>
        <p class="text-dark-300">Se dine fullførte treningsøkter</p>
      </div>
    </div>

         <!-- Filters -->
     <div class="mt-8 bg-dark-700 rounded-lg p-6">
       <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <!-- Search -->
         <div class="lg:col-span-2">
           <label class="block text-sm font-medium text-white mb-2">Søk etter økt</label>
           <div class="relative">
             <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
             </svg>
             <input
               v-model="searchQuery"
               type="text"
               class="input-field w-full pl-10"
               placeholder="Søk etter økt navn..."
             />
           </div>
         </div>
         
         <!-- Workout Type Filter -->
         <div>
           <label class="block text-sm font-medium text-white mb-2">Økt Type</label>
           <select 
             v-model="selectedWorkoutType" 
             class="input-field w-full"
           >
             <option value="">Alle typer</option>
             <option 
               v-for="type in workoutStore.workoutTypes" 
               :key="type.id" 
               :value="type.id"
             >
               {{ type.name }}
             </option>
           </select>
         </div>
         
         <!-- Sort By -->
         <div>
           <label class="block text-sm font-medium text-white mb-2">Sorter etter</label>
           <select 
             v-model="sortBy" 
             class="input-field w-full"
           >
             <option value="date">Dato (nyeste først)</option>
             <option value="date-asc">Dato (eldste først)</option>
             <option value="volume">Volum (høyest først)</option>
             <option value="volume-asc">Volum (lavest først)</option>
             <option value="duration">Varighet (lengst først)</option>
             <option value="duration-asc">Varighet (kortest først)</option>
             <option value="exercises">Antall øvelser</option>
             <option value="sets">Antall sett</option>
             <option value="name">Navn (A-Å)</option>
             <option value="name-desc">Navn (Å-A)</option>
           </select>
         </div>
       </div>
       
       <!-- Active Filters Display -->
       <div v-if="hasActiveFilters" class="mt-4 pt-4 border-t border-dark-600">
         <div class="flex items-center gap-2 flex-wrap">
           <span class="text-sm text-dark-300">Aktive filtre:</span>
           <button 
             v-if="searchQuery"
             @click="searchQuery = ''"
             class="inline-flex items-center gap-1 px-2 py-1 bg-primary-500/20 text-primary-400 rounded-full text-xs hover:bg-primary-500/30 transition-colors"
           >
             Søk: "{{ searchQuery }}"
             <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
             </svg>
           </button>
           <button 
             v-if="selectedWorkoutType"
             @click="selectedWorkoutType = ''"
             class="inline-flex items-center gap-1 px-2 py-1 bg-primary-500/20 text-primary-400 rounded-full text-xs hover:bg-primary-500/30 transition-colors"
           >
             Type: {{ getWorkoutTypeName(selectedWorkoutType) }}
             <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
             </svg>
           </button>
           <button 
             @click="clearAllFilters"
             class="text-xs text-dark-400 hover:text-white transition-colors"
           >
             Nullstill alle filtre
           </button>
         </div>
       </div>
     </div>

    <!-- Workout Sessions -->
    <div v-if="filteredSessions.length === 0" class="mt-8 text-center py-12">
      <div class="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p class="text-dark-300 mb-4">Ingen fullførte økter funnet</p>
      <router-link to="/" class="btn-primary">
        Start din første økt
      </router-link>
    </div>

    <div v-else class="mt-8 space-y-4">
      <div 
        v-for="session in filteredSessions" 
        :key="session.id"
        class="card hover:bg-dark-700 transition-colors cursor-pointer"
        @click="viewSession(session)"
      >
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <h3 class="font-semibold text-white">{{ session.templateName }}</h3>
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
            <p class="text-sm text-dark-300 mb-1">
              {{ formatDate(session.date) }} • {{ session.duration }} minutter
            </p>
            <p class="text-xs text-dark-400">
              {{ session.exercises.length }} øvelser • {{ formatNumber(session.totalVolume || 0) }} kg totalvolum
            </p>
          </div>
          <div class="flex items-center gap-4">
            <div class="text-right">
              <p class="text-lg font-bold text-primary-500">
                {{ formatNumber(session.totalVolume || 0) }}
              </p>
              <p class="text-xs text-dark-400">kg</p>
            </div>
            <svg class="w-5 h-5 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Session Details Modal -->
    <div v-if="selectedSession" class="fixed bg-black/50 flex items-center justify-center p-4" style="top: 0; left: 0; right: 0; bottom: 0; width: 100vw; height: 100vh; z-index: 9999;">
      <div class="bg-dark-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h3 class="text-xl font-semibold text-white">{{ selectedSession.templateName }}</h3>
              <p class="text-dark-300">
                {{ formatDate(selectedSession.date) }} • {{ selectedSession.duration }} minutter
              </p>
            </div>
            <div class="flex items-center gap-2">
              <span 
                class="px-3 py-1 rounded-full text-sm font-medium"
                :style="{ 
                  backgroundColor: getWorkoutTypeColor(selectedSession.workoutType) + '20',
                  color: getWorkoutTypeColor(selectedSession.workoutType)
                }"
              >
                {{ getWorkoutTypeName(selectedSession.workoutType) }}
              </span>
              <button 
                @click="selectedSession = null"
                class="text-dark-300 hover:text-white transition-colors"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Session Summary -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="bg-dark-700 rounded-lg p-4 text-center">
              <p class="text-2xl font-bold text-primary-500">{{ formatNumber(selectedSession.totalVolume || 0) }}</p>
              <p class="text-sm text-dark-300">Total Volum (kg)</p>
            </div>
            <div class="bg-dark-700 rounded-lg p-4 text-center">
              <p class="text-2xl font-bold text-primary-500">{{ selectedSession.exercises.length }}</p>
              <p class="text-sm text-dark-300">Øvelser</p>
            </div>
            <div class="bg-dark-700 rounded-lg p-4 text-center">
              <p class="text-2xl font-bold text-primary-500">{{ getTotalSets(selectedSession) }}</p>
              <p class="text-sm text-dark-300">Sett</p>
            </div>
          </div>

          <!-- Exercises -->
          <div class="space-y-4">
            <h4 class="text-lg font-semibold text-white">Øvelser</h4>
            <div 
              v-for="exercise in selectedSession.exercises" 
              :key="exercise.exerciseId"
              class="bg-dark-700 rounded-lg p-4"
            >
              <h5 class="font-medium text-white mb-3">{{ exercise.name }}</h5>
              
              <div class="space-y-2">
                <div 
                  v-for="set in exercise.sets" 
                  :key="set.id"
                  class="flex items-center justify-between text-sm"
                >
                  <span class="text-dark-300">Sett {{ exercise.sets.indexOf(set) + 1 }}:</span>
                  <div class="flex items-center gap-4">
                    <span class="text-white">{{ set.reps }} reps</span>
                    <span v-if="set.weight" class="text-white">{{ set.weight }} kg</span>
                    <span v-if="set.weight && set.reps" class="text-primary-500 font-medium">
                      {{ set.weight * set.reps }} kg
                    </span>
                  </div>
                </div>
              </div>

              <div v-if="exercise.notes" class="mt-3 pt-3 border-t border-dark-600">
                <p class="text-sm text-dark-300">{{ exercise.notes }}</p>
              </div>
            </div>
          </div>

          <!-- Session Notes -->
          <div v-if="selectedSession.notes" class="mt-6 pt-6 border-t border-dark-600">
            <h4 class="text-lg font-semibold text-white mb-3">Notater</h4>
            <p class="text-dark-300">{{ selectedSession.notes }}</p>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 mt-6 pt-6 border-t border-dark-600">
            <button 
              @click="deleteSession(selectedSession.id)"
              class="btn-secondary text-red-400 hover:text-red-300"
            >
              Slett økt
            </button>
            <button 
              @click="selectedSession = null"
              class="btn-primary"
            >
              Lukk
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useWorkoutStore } from '@/stores/workoutStore'
import type { WorkoutSession } from '@/types/workout'

const route = useRoute()
const workoutStore = useWorkoutStore()

// State
const searchQuery = ref('')
const selectedWorkoutType = ref('')
const sortBy = ref('date')
const selectedSession = ref<WorkoutSession | null>(null)

// Computed
const filteredSessions = computed(() => {
  let sessions = workoutStore.completedSessions

  // Filter by search query
  if (searchQuery.value) {
    sessions = sessions.filter(session =>
      session.templateName.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }

  // Filter by workout type
  if (selectedWorkoutType.value) {
    sessions = sessions.filter(session =>
      session.workoutType === selectedWorkoutType.value
    )
  }

  // Sort sessions
  sessions = [...sessions].sort((a, b) => {
    switch (sortBy.value) {
      case 'volume':
        return (b.totalVolume || 0) - (a.totalVolume || 0)
      case 'volume-asc':
        return (a.totalVolume || 0) - (b.totalVolume || 0)
      case 'duration':
        return b.duration - a.duration
      case 'duration-asc':
        return a.duration - b.duration
      case 'exercises':
        return b.exercises.length - a.exercises.length
      case 'sets':
        return getTotalSets(b) - getTotalSets(a)
      case 'name':
        return a.templateName.localeCompare(b.templateName, 'no')
      case 'name-desc':
        return b.templateName.localeCompare(a.templateName, 'no')
      case 'date-asc':
        return new Date(a.date).getTime() - new Date(b.date).getTime()
      case 'date':
      default:
        return new Date(b.date).getTime() - new Date(a.date).getTime()
    }
  })

  return sessions
})

const hasActiveFilters = computed(() => {
  return searchQuery.value || selectedWorkoutType.value
})

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
  const type = workoutStore.getWorkoutType(typeId)
  return type?.name || typeId
}

const getWorkoutTypeColor = (typeId: string): string => {
  const type = workoutStore.getWorkoutType(typeId)
  return type?.color || '#f97316'
}

const getTotalSets = (session: WorkoutSession): number => {
  return session.exercises.reduce((total, exercise) => {
    return total + exercise.sets.length
  }, 0)
}

const viewSession = (session: WorkoutSession) => {
  selectedSession.value = session
}

const deleteSession = (sessionId: string) => {
  if (confirm('Er du sikker på at du vil slette denne økten?')) {
    workoutStore.deleteWorkoutSession(sessionId)
    selectedSession.value = null
  }
}

const clearAllFilters = () => {
  searchQuery.value = ''
  selectedWorkoutType.value = ''
  sortBy.value = 'date'
}

// Lifecycle
onMounted(() => {
  // Check if there's a session parameter in the URL
  const sessionId = route.query.session as string
  if (sessionId) {
    const session = workoutStore.getSessionById(sessionId)
    if (session) {
      selectedSession.value = session
    }
  }
})
</script> 