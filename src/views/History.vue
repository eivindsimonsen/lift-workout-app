<template>
  <div class="w-full">
         <!-- Header -->
     <div class="flex items-center justify-between mb-8">
       <div class="flex items-center gap-3">
         <div class="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
           <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg>
         </div>
         <h1 class="text-3xl font-bold text-white">Historikk</h1>
       </div>
       
       <!-- Filter Button -->
       <button 
         @click="showFilterModal = true"
         class="inline-flex items-center gap-2 px-4 py-2 bg-dark-600 hover:bg-dark-500 text-white rounded-lg transition-colors text-sm font-medium"
       >
         <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
         </svg>
         Filtre
         <span v-if="hasActiveFilters" class="w-2 h-2 bg-primary-500 rounded-full"></span>
       </button>
     </div>

    <!-- Active Filters Display -->
    <div v-if="hasActiveFilters" class="mt-4 flex items-center gap-2 flex-wrap">
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
      <template v-for="typeId in selectedTypes.value" :key="typeId">
        <button 
          @click="removeType(typeId)"
          class="inline-flex items-center gap-1 px-2 py-1 bg-primary-500/20 text-primary-400 rounded-full text-xs hover:bg-primary-500/30 transition-colors"
        >
          Type: {{ getWorkoutTypeName(typeId) }}
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </template>
      <button 
        @click="clearAllFilters"
        class="text-xs text-dark-400 hover:text-white transition-colors"
      >
        Nullstill alle filtre
      </button>
    </div>



    <!-- Workout Sessions -->
    <div v-if="filteredSessions.length === 0" class="mt-8 text-center py-8 sm:py-12">
      <div class="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p class="text-dark-300 mb-4 px-4">Ingen fullførte økter funnet</p>
      <router-link to="/" class="btn-primary block no-underline mx-auto w-fit">
        Start din første økt
      </router-link>
    </div>

    <div v-else class="mt-8 space-y-4 px-1">
      <router-link 
        v-for="session in filteredSessions" 
        :key="session.id"
        :to="`/session/${session.id}`"
        class="card hover:bg-dark-700 transition-colors cursor-pointer block no-underline"
      >
        <div class="flex items-center justify-between w-full">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-3 mb-2">
              <h3 class="font-semibold text-white truncate">{{ session.templateName }}</h3>
              <span 
                class="px-2 py-1 rounded-full text-xs font-medium flex-shrink-0"
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
          <div class="flex items-center gap-4 flex-shrink-0">
            <div class="text-right">
              <p class="text-lg font-bold text-primary-500">
                {{ formatNumber(session.totalVolume || 0) }}
              </p>
              <p class="text-xs text-dark-400">kg</p>
            </div>
            <svg class="w-5 h-5 text-dark-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </router-link>
    </div>

    <!-- Filter Modal -->
    <FilterModal
      :is-visible="showFilterModal"
      title="Filtrer historikk"
      apply-text="Bruk filtre"
      @close="showFilterModal = false"
      @apply="showFilterModal = false"
      @clear-all="clearAllFilters"
    >
      <!-- Search -->
      <div>
        <label class="block text-sm font-medium text-white mb-2">Søk etter økt</label>
        <div class="relative">
          <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            class="input-field w-full pl-10 text-base"
            placeholder="Søk etter økt navn..."
          />
        </div>
      </div>
      
      <!-- Workout Type Filter -->
      <div>
        <label class="block text-sm font-medium text-white mb-2">Økt Typer</label>
        <div class="space-y-2">
          <div 
            v-for="type in workoutData.workoutTypes.value" 
            :key="type.id"
            class="flex items-center gap-2"
          >
            <label class="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox"
                :checked="selectedTypes.value.includes(type.id)"
                @change="(e: Event) => {
                  const target = e.target as HTMLInputElement
                  if (target.checked) {
                    addType(type.id)
                  } else {
                    removeType(type.id)
                  }
                }"
                class="form-checkbox h-4 w-4 text-primary-500 rounded bg-dark-600 border-dark-500"
              >
              <span class="text-dark-200">{{ type.name }}</span>
            </label>
          </div>
        </div>
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
    </FilterModal>
      
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useHybridData } from '@/composables/useHybridData'
import FilterModal from '@/components/FilterModal.vue'
import type { WorkoutSession } from '@/types/workout'

const workoutData = useHybridData()

// State
const searchQuery = ref('')
const selectedTypes = ref<{ value: string[] }>({ value: [] })
const selectedWorkoutTypes = computed(() => ({ data: new Set(selectedTypes.value.value) }))
const sortBy = ref('date')
const showFilterModal = ref(false)

// Computed
const filteredSessions = computed(() => {
  let sessions = workoutData.completedSessions.value

  // Filter by search query
  if (searchQuery.value) {
    sessions = sessions.filter(session =>
      session.templateName.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }

  // Filter by workout types
  if (selectedWorkoutTypes.value.data.size > 0) {
    sessions = sessions.filter(session =>
      selectedWorkoutTypes.value.data.has(session.workoutType)
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
  return searchQuery.value || selectedWorkoutTypes.value.data.size > 0
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
  const type = workoutData.getWorkoutType.value(typeId)
  return type?.name || typeId
}

const getWorkoutTypeColor = (typeId: string): string => {
  return workoutData.getWorkoutTypeColor.value(typeId)
}

const getTotalSets = (session: WorkoutSession): number => {
  return session.exercises.reduce((total, exercise) => {
    return total + exercise.sets.length
  }, 0)
}



const addType = (typeId: string) => {
  selectedTypes.value.value = [...selectedTypes.value.value, typeId]
}

const removeType = (typeId: string) => {
  selectedTypes.value.value = selectedTypes.value.value.filter(id => id !== typeId)
}

const clearAllFilters = () => {
  searchQuery.value = ''
  selectedTypes.value.value = []
  sortBy.value = 'date'
  showFilterModal.value = false
}


</script> 