<template>
  <div>
         <!-- Header -->
      <div class="mb-6">
       <div class="flex items-center justify-between">
         <div class="flex items-center gap-3">
           <div class="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
             <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
             </svg>
           </div>
           <h1 class="text-2xl font-bold text-white">Øvelser</h1>
         </div>
       </div>
     </div>

      <!-- Search -->
      <div class="mb-6">
        <div class="relative">
          <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            class="input-field w-full pl-10 text-base"
            placeholder="Søk etter øvelse..."
          />
        </div>
      </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-12">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
        <p class="text-dark-300">Laster øvelser...</p>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="allExercises.length === 0" class="text-center py-12">
      <div class="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      </div>
      <p class="text-dark-300 mb-2">Ingen øvelser funnet</p>
      <p class="text-dark-400 mb-4 text-sm">Prøv igjen senere.</p>
    </div>

    <!-- Exercises by Category OR Search Results -->
    <div v-else class="space-y-12">
      <!-- Search results -->
      <div v-if="hasSearch">
        <div v-if="searchResults.length === 0" class="text-center py-12">
          <p class="text-dark-300">Ingen treff</p>
        </div>
        <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
          <div
            v-for="exercise in searchResults"
            :key="exercise.id"
            @click="viewExercise(exercise.id)"
            class="group bg-dark-700 rounded-lg p-3 border border-dark-600 hover:border-primary-500/50 transition-colors cursor-pointer hover:bg-dark-600 overflow-hidden"
          >
            <div class="flex items-center justify-between h-10">
              <div class="flex items-center gap-2 min-w-0 flex-1">
                <h3 class="font-medium text-white truncate text-sm max-w-full">{{ exercise.name }}</h3>
                <svg class="w-4 h-4 text-dark-300 group-hover:text-primary-400 transition-colors pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Grouped by category (default) -->
      <template v-else>
        <div 
          v-for="category in categories" 
          :key="category"
        >
          <!-- Category Header (compact) -->
          <div class="mb-4">
            <h2 class="text-lg font-semibold text-dark-200 uppercase tracking-wide">{{ getCategoryName(category) }}</h2>
            <div class="mt-2 border-b border-dark-700"></div>
          </div>

          <!-- Exercise Grid -->
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
            <div 
              v-for="exercise in getExercisesByCategory(category)" 
              :key="exercise.id"
              @click="viewExercise(exercise.id)"
              class="group bg-dark-700 rounded-lg p-3 border border-dark-600 hover:border-primary-500/50 transition-colors cursor-pointer hover:bg-dark-600 overflow-hidden"
            >
              <div class="flex items-center justify-between h-10">
                <div class="flex items-center gap-2 min-w-0 flex-1">
                  <h3 class="font-medium text-white truncate text-sm max-w-full">{{ exercise.name }}</h3>
                  <svg class="w-4 h-4 text-dark-300 group-hover:text-primary-400 transition-colors pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useHybridData } from '@/composables/useHybridData'

const router = useRouter()
const workoutData = useHybridData()

// Search
const searchQuery = ref('')
const hasSearch = computed(() => searchQuery.value.trim().length > 0)
const flatExercises = computed(() => workoutData.exercises.value || [])
const searchResults = computed(() => {
  if (!hasSearch.value) return []
  const q = searchQuery.value.trim().toLowerCase()
  return flatExercises.value.filter((e: any) => e.name.toLowerCase().includes(q))
})

// Muscle group order for categorization
const muscleGroupOrder = ['Bryst', 'Rygg', 'Ben', 'Armer', 'Skuldre', 'Kjerne']

// Computed properties
const isLoading = computed(() => workoutData.isLoading.value)

const allExercises = computed(() => {
  // Start with all exercises from Supabase
  const exercises = workoutData.exercises.value?.map(exercise => {
    const performances: any[] = []
    let totalSessions = 0

    // Find all performances of this exercise in completed sessions
    workoutData.sessions.value
      ?.filter(session => session.isCompleted)
      ?.forEach(session => {
        const sessionExercise = session.exercises?.find(e => e.exerciseId === exercise.id)
        if (sessionExercise) {
          totalSessions++
          
          // Find best set for this exercise in this session
          let bestSet: any = null
          let bestVolume = 0
          
          sessionExercise.sets?.forEach(set => {
            if (set.isCompleted && set.weight && set.reps) {
              const volume = set.weight * set.reps
              if (volume > bestVolume) {
                bestVolume = volume
                bestSet = set
              }
            }
          })
          
          if (bestSet) {
            performances.push({
              weight: bestSet.weight,
              reps: bestSet.reps,
              date: session.date,
              volume: bestVolume
            })
          }
        }
      })

    // Sort performances by date and get the latest one
    const lastPerformance = performances.length > 0 
      ? performances.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
      : null

    // Calculate one rep max from all completed sets with 1 rep
    let oneRepMax = 0
    workoutData.sessions.value
      ?.filter(session => session.isCompleted)
      ?.forEach(session => {
        const sessionExercise = session.exercises?.find(e => e.exerciseId === exercise.id)
        if (sessionExercise) {
          sessionExercise.sets?.forEach(set => {
            if (set.isCompleted && set.weight && set.reps === 1) {
              if (set.weight > oneRepMax) {
                oneRepMax = set.weight
              }
            }
          })
        }
      })

    return {
      id: exercise.id,
      name: exercise.name,
      muscleGroups: exercise.muscleGroups || [],
      totalSessions,
      lastPerformance,
      oneRepMax
    }
  }) || []

  // Sort exercises by name within each category
  return exercises.sort((a, b) => a.name.localeCompare(b.name, 'no'))
})

const categories = computed(() => {
  // Get all unique muscle groups from exercises
  const allMuscleGroups = new Set<string>()
  allExercises.value?.forEach((exercise: any) => {
    exercise.muscleGroups?.forEach((group: string) => {
      allMuscleGroups.add(group)
    })
  })
  
  // Return muscle groups in the defined order, only if they exist
  return muscleGroupOrder.filter(group => allMuscleGroups.has(group))
})

// Methods
const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('no-NO', {
    day: 'numeric',
    month: 'short'
  }).format(date)
}

const getCategoryName = (muscleGroup: string): string => {
  return muscleGroup
}

const getExercisesByCategory = (muscleGroup: string) => {
  return allExercises.value?.filter(exercise => exercise.muscleGroups?.includes(muscleGroup)) || []
}

const viewExercise = (exerciseId: string) => {
  router.push(`/exercise/${exerciseId}`)
}
</script>
