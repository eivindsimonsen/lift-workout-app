<template>
  <div>
         <!-- Header -->
      <div class="mb-6">
       <div class="flex items-center justify-between">
         <div class="flex items-center gap-3">
           <div class="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
             <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
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

      <!-- Active Exercises Section -->
      <div v-if="!hasSearch" class="mb-8">
        <!-- Loading State for Active Exercises -->
        <div v-if="isLoading" class="mb-4">
          <div class="h-6 bg-dark-600 rounded w-40 mb-4 animate-pulse"></div>
          <div class="h-4 bg-dark-600 rounded w-64 mb-2 animate-pulse"></div>
          <div class="mt-2 border-b border-dark-700"></div>
        </div>

        <!-- Active Exercises Content -->
        <div v-else-if="activeExercises.length > 0">
          <div class="mb-4">
            <h2 class="text-lg font-semibold text-white flex items-center gap-2">
              <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Brukte øvelser
            </h2>
            <p class="text-sm text-dark-300">Øvelser du har brukt i dine økter</p>
            <div class="mt-2 border-b border-dark-700"></div>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div 
              v-for="exercise in activeExercises" 
              :key="exercise.id"
              @click="viewExercise(exercise.id)"
              class="group bg-primary-500/10 border border-primary-500/20 rounded-lg p-3 hover:border-primary-500/40 transition-colors cursor-pointer hover:bg-primary-500/20 overflow-hidden"
            >
              <div class="flex items-center h-10">
                <div class="min-w-0 flex-1">
                  <h3 class="font-medium text-white text-sm max-w-full">{{ exercise.name }}</h3>
                </div>
                <svg class="w-4 h-4 text-primary-400 group-hover:text-primary-300 transition-colors pointer-events-none flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
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
    <div v-else class="grid grid-cols-1 gap-4">
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
            :class="{
              'group bg-primary-500/10 border border-primary-500/20 hover:border-primary-500/40 hover:bg-primary-500/20': isExerciseInTemplate(exercise.id),
              'group bg-dark-700 border border-dark-600 hover:border-primary-500/50 hover:bg-dark-600': !isExerciseInTemplate(exercise.id)
            }"
            class="rounded-lg p-3 transition-colors cursor-pointer overflow-hidden"
          >
            <div class="flex items-center h-10">
              <div class="min-w-0 flex-1">
                <h3 class="font-medium text-white text-sm max-w-full">{{ exercise.displayName }}</h3>
              </div>
              <svg class="w-4 h-4 text-primary-400 group-hover:text-primary-300 transition-colors pointer-events-none flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
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
          <div class="mb-6 text-center">
            <h2 class="text-xl font-bold text-white mb-2">{{ getCategoryName(category) }}</h2>
            <div class="h-1 bg-gradient-to-r from-primary-500 to-primary-400 rounded-full mx-auto w-24"></div>
          </div>

          <!-- Exercise Grid -->
          <div class="space-y-4">
            <div 
              v-for="exercise in getExercisesByCategory(category)" 
              :key="exercise.id"
              class="overflow-hidden rounded-lg"
            >
              <!-- Main Exercise Header -->
              <div 
                v-if="exercise.isMainExercise"
                class="p-3 border-b border-dark-600"
              >
                <div class="flex items-center justify-between">
                  <div class="flex-1 min-w-0">
                    <h3 class="font-medium text-white text-sm truncate text-gray-400">{{ exercise.name }}</h3>
                    <div class="flex items-center gap-2 mt-1">
                      <span v-if="exercise.totalSessions > 0" class="text-xs text-primary-400">
                        {{ exercise.totalSessions }} økter
                      </span>
                      <span v-if="exercise.oneRepMax > 0" class="text-xs text-blue-400">
                        1RM: {{ exercise.oneRepMax }}kg
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Variants -->
              <div v-if="exercise.variants && exercise.variants.length > 0" class="pt-2">
                <div class="grid grid-cols-2 gap-3">
                  <div 
                    v-for="variant in exercise.variants" 
                    :key="variant.id"
                    @click="viewExercise(variant.id)"
                    class="bg-dark-800 rounded p-2 hover:bg-dark-600 cursor-pointer transition-colors"
                  >
                    <div class="flex items-center justify-between">
                      <div class="flex-1 min-w-0">
                        <span class="text-white text-sm truncate block">{{ variant.name }}</span>
                        <div class="flex gap-1 mt-1 flex-wrap">
                          <span v-if="variant.equipment" class="text-xs bg-primary-500/20 text-primary-400 px-1.5 py-0.5 rounded">
                            {{ variant.equipment }}
                          </span>
                          <span v-if="variant.angle" class="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                            {{ variant.angle }}
                          </span>
                          <span v-if="variant.grip" class="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                            {{ variant.grip }}
                          </span>
                        </div>
                      </div>
                      <svg class="w-3 h-3 text-dark-400 group-hover:text-primary-400 transition-colors flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Exercise without variants -->
              <div 
                v-else-if="!exercise.isMainExercise"
                @click="viewExercise(exercise.id)"
                class="p-3 hover:bg-dark-600 cursor-pointer"
              >
                <div class="flex items-center justify-between">
                  <div class="flex-1 min-w-0">
                    <span class="text-white text-sm truncate block">{{ exercise.name }}</span>
                    <div class="flex items-center gap-2 mt-1">
                      <span v-if="exercise.totalSessions > 0" class="text-xs text-primary-400">
                        {{ exercise.totalSessions }} økter
                      </span>
                      <span v-if="exercise.oneRepMax > 0" class="text-xs text-blue-400">
                        1RM: {{ exercise.oneRepMax }}kg
                      </span>
                    </div>
                  </div>
                  <svg class="w-4 h-4 text-dark-300 group-hover:text-primary-400 transition-colors flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
const searchResults = computed(() => {
  if (!hasSearch.value) return []
  const q = searchQuery.value.trim().toLowerCase()
  
  // Use the flattened exercises for consistent search results
  const results: any[] = []
  const seenIds = new Set<string>() // Prevent duplicates
  
  workoutData.getFlattenedExercises.value.forEach(exercise => {
    // Skip if we've already seen this exercise ID
    if (seenIds.has(exercise.id)) {
      return
    }
    
    // Search in the exercise name
    if (exercise.name.toLowerCase().includes(q)) {
      seenIds.add(exercise.id)
      results.push({
        id: exercise.id,
        name: exercise.name,
        displayName: exercise.name,
        category: exercise.category || '',
        // Include exercise details
        equipment: exercise.equipment,
        angle: exercise.angle,
        grip: exercise.grip,
        position: exercise.position,
        direction: exercise.direction,
        focus: exercise.focus
      })
    }
  })
  
  // Sort results by relevance (exact matches first, then partial matches)
  return results.sort((a, b) => {
    const aExact = a.name.toLowerCase() === q
    const bExact = b.name.toLowerCase() === q
    const aStartsWith = a.name.toLowerCase().startsWith(q)
    const bStartsWith = b.name.toLowerCase().startsWith(q)
    
    if (aExact && !bExact) return -1
    if (!aExact && bExact) return 1
    if (aStartsWith && !bStartsWith) return -1
    if (!aStartsWith && bStartsWith) return 1
    
    return a.name.localeCompare(b.name, 'no')
  })
})



// Muscle group order for categorization
const muscleGroupOrder = ['Bryst', 'Rygg', 'Ben', 'Skuldre', 'Biceps', 'Triceps', 'Kjerne']

// Computed properties
const isLoading = computed(() => workoutData.isLoading.value)

const allExercises = computed(() => {
  const exercises: Array<{
    id: string;
    name: string;
    muscleGroups: string[];
    totalSessions: number;
    lastPerformance: any;
    oneRepMax: number;
    isMainExercise: boolean;
    mainExerciseName?: string;
    variants?: any[];
  }> = []

  workoutData.exercises.value?.forEach(exercise => {
    if (exercise.variants && exercise.variants.length > 0) {
      // Add main exercise with variants
      const mainExerciseData = getExerciseData(exercise.categoryId, exercise.name, exercise.muscleGroups || [])
      exercises.push({
        ...mainExerciseData,
        isMainExercise: true,
        variants: exercise.variants
      })
      // Don't add variants as separate entries - they're already shown under the main exercise
    } else {
      // Exercise without variants
      const exerciseData = getExerciseData(exercise.categoryId, exercise.name, exercise.muscleGroups || [])
      exercises.push({
        ...exerciseData,
        isMainExercise: true
      })
    }
  })

  // Sort exercises by name within each category
  return exercises.sort((a, b) => a.name.localeCompare(b.name, 'no'))
})

// Helper function to get exercise data (sessions, performance, etc.)
const getExerciseData = (exerciseId: string, exerciseName: string, muscleGroups: string[]) => {
  const performances: any[] = []
  let totalSessions = 0

  // Find all performances of this exercise in completed sessions
  workoutData.sessions.value
    ?.filter(session => session.isCompleted)
    ?.forEach(session => {
      const sessionExercise = session.exercises?.find(e => e.exerciseId === exerciseId)
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
      const sessionExercise = session.exercises?.find(e => e.exerciseId === exerciseId)
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
    id: exerciseId,
    name: exerciseName,
    muscleGroups,
    totalSessions,
    lastPerformance,
    oneRepMax
  }
}

// Active exercises - exercises that are used in workout templates, sessions, or are popular
const activeExercises = computed(() => {
  // Get exercises that are used in any workout template or session
  const activeExerciseIds = new Set<string>()
  
  // Check workout templates
  workoutData.templates.value?.forEach(template => {
    template.exercises?.forEach(exercise => {
      activeExerciseIds.add(exercise.exerciseId)
    })
  })
  
  // Check workout sessions (both active and completed)
  workoutData.sessions.value?.forEach(session => {
    session.exercises?.forEach(exercise => {
      activeExerciseIds.add(exercise.exerciseId)
    })
  })
  
  // If user has no templates or sessions yet, show popular exercise variants
  if (activeExerciseIds.size === 0) {
    // Show popular exercise variants from each major category
    const popularExerciseVariants = [
      'barbell-bench-press', 'dumbbell-bench-press', 'push-ups', // Chest
      'pull-ups', 'lat-pulldown', 'barbell-rows', // Back
      'squat', 'deadlift', 'walking-lunges', // Legs
      'overhead-press', 'lateral-raises', // Shoulders
      'bicep-curls', 'tricep-dips', // Arms
      'planks', 'crunches' // Core
    ]
    
    // Get the actual exercise data for these variants
    const exercises: any[] = []
    workoutData.exercises.value?.forEach(exercise => {
      if (exercise.variants && exercise.variants.length > 0) {
        // Add variants that are in the popular list
                 exercise.variants.forEach(variant => {
           if (popularExerciseVariants.includes(variant.id)) {
             const exerciseData = getExerciseData(variant.id, variant.name, exercise.muscleGroups || [])
             exercises.push({
               ...exerciseData,
               isMainExercise: false
             })
           }
         })
      } else if (popularExerciseVariants.includes(exercise.categoryId)) {
        // Add exercises without variants
        const exerciseData = getExerciseData(exercise.categoryId, exercise.name, exercise.muscleGroups || [])
        exercises.push({
          ...exerciseData,
          isMainExercise: false
        })
      }
    })
    
    return exercises.sort((a, b) => a.name.localeCompare(b.name, 'no'))
  }
  
  // Get active exercises with their variants
  const exercises: any[] = []
  
  workoutData.exercises.value?.forEach(exercise => {
    if (exercise.variants && exercise.variants.length > 0) {
             // For exercises with variants, check if any variant is active
       exercise.variants.forEach(variant => {
         if (activeExerciseIds.has(variant.id)) {
           const exerciseData = getExerciseData(variant.id, variant.name, exercise.muscleGroups || [])
           exercises.push({
             ...exerciseData,
             isMainExercise: false
           })
         }
       })
    } else if (activeExerciseIds.has(exercise.categoryId)) {
      // Exercise without variants
      const exerciseData = getExerciseData(exercise.categoryId, exercise.name, exercise.muscleGroups || [])
      exercises.push({
        ...exerciseData,
        isMainExercise: false
      })
    }
  })
  
  // If user has very few active exercises, add some popular variants
  if (exercises.length < 5) {
    const popularVariantIds = ['barbell-bench-press', 'squat', 'pull-ups', 'overhead-press']
    const additionalExercises: any[] = []
    
    workoutData.exercises.value?.forEach(exercise => {
      if (exercise.variants && exercise.variants.length > 0) {
                 exercise.variants.forEach(variant => {
           if (popularVariantIds.includes(variant.id) && !activeExerciseIds.has(variant.id)) {
             const exerciseData = getExerciseData(variant.id, variant.name, exercise.muscleGroups || [])
             additionalExercises.push({
               ...exerciseData,
               isMainExercise: false
             })
           }
         })
      } else if (popularVariantIds.includes(exercise.categoryId) && !activeExerciseIds.has(exercise.categoryId)) {
        const exerciseData = getExerciseData(exercise.categoryId, exercise.name, exercise.muscleGroups || [])
        additionalExercises.push({
          ...exerciseData,
          isMainExercise: false
        })
      }
    })
    
    exercises.push(...additionalExercises.slice(0, 3))
  }
  
  return exercises.sort((a, b) => b.totalSessions - a.totalSessions) // Sort by most used first
})

const categories = computed(() => {
  // Get all unique primary muscle groups from exercises
  const allMuscleGroups = new Set<string>()
  allExercises.value?.forEach((exercise: any) => {
    if (exercise.muscleGroups && exercise.muscleGroups.length > 0) {
      allMuscleGroups.add(exercise.muscleGroups[0])
    }
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
  return allExercises.value?.filter(exercise => {
    // Only show exercises under their primary muscle group (first in the array)
    return exercise.muscleGroups?.[0] === muscleGroup
  }) || []
}

const viewExercise = (exerciseId: string) => {
  // Navigate directly to the exercise ID (could be main exercise or variant)
  // ExerciseDetail.vue will handle both cases
  router.push(`/exercise/${exerciseId}`)
}

// Helper function to check if an exercise is in a template
const isExerciseInTemplate = (exerciseId: string): boolean => {
  return workoutData.templates.value?.some(template =>
    template.exercises?.some(exercise => exercise.exerciseId === exerciseId)
  ) || false
}
</script>
