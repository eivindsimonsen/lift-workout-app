<template>
  <div>
         <!-- Header -->
     <div class="mb-8">
       <div class="flex items-center justify-between">
         <div class="flex items-center gap-3">
           <div class="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
             <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
             </svg>
           </div>
           <h1 class="text-3xl font-bold text-white">Øvelser</h1>
         </div>
         <button 
           @click="showAddForm = true"
           class="btn-primary px-4 py-3 text-base font-medium flex items-center gap-2 whitespace-nowrap"
         >
           <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
           </svg>
         </button>
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
      <p class="text-dark-400 mb-4 text-sm">Du må legge til øvelser før du kan se dem her</p>
             <button @click="showAddForm = true" class="btn-primary px-6 py-3 text-base font-medium flex items-center gap-2 mx-auto">
         <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
         </svg>
         Legg til øvelse
       </button>
    </div>

    <!-- Exercises by Category -->
    <div v-else class="space-y-12">
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
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div 
            v-for="exercise in getExercisesByCategory(category)" 
            :key="exercise.id"
            @click="viewExercise(exercise.id)"
            class="group bg-dark-700 rounded-lg p-3 border border-dark-600 hover:border-primary-500/50 transition-colors cursor-pointer hover:bg-dark-600"
          >
            <div class="flex items-center justify-between h-10">
              <div class="flex items-center gap-2">
                <h3 class="font-medium text-white truncate">{{ exercise.name }}</h3>
                <svg class="w-4 h-4 text-dark-300 group-hover:text-primary-400 transition-colors pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div class="flex items-center gap-2">
                <button 
                  @click.stop="editExercise(exercise)"
                  class="w-9 h-9 grid place-items-center rounded-md bg-primary-500/20 text-primary-300 hover:bg-primary-500 hover:text-white transition-colors"
                  title="Rediger øvelse"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button 
                  @click.stop="deleteExercise(exercise.id)"
                  class="w-9 h-9 grid place-items-center rounded-md bg-red-500/20 text-red-300 hover:bg-red-500 hover:text-white transition-colors"
                  title="Slett øvelse"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            
            
            
            <!-- Removed 'Sist' for compact list -->
            
            <!-- One Rep Max -->
            <div v-if="exercise.oneRepMax > 0" class="space-y-1">
              <p class="text-sm text-dark-300">
                1RM: {{ exercise.oneRepMax }}kg × 1 rep
              </p>
            </div>
            
            
          </div>
        </div>
      </div>
    </div>

    <!-- Exercise Form Modal -->
    <ExerciseForm
      v-if="showAddForm || editingExercise"
      :exercise="editingExercise"
      @close="closeForm"
      @save="handleSaveExercise"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useHybridData } from '@/composables/useHybridData'
import ExerciseForm from '@/components/ExerciseForm.vue'

const router = useRouter()
const workoutData = useHybridData()

// State
const showAddForm = ref(false)
const editingExercise = ref<any>(null)

// Muscle group order for categorization
const muscleGroupOrder = ['Bryst', 'Rygg', 'Ben', 'Armer', 'Skuldre']

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

const editExercise = (exercise: any) => {
  editingExercise.value = exercise
}

const deleteExercise = async (exerciseId: string) => {
  if (confirm('Er du sikker på at du vil slette denne øvelsen?')) {
    await workoutData.deleteExercise(exerciseId)
  }
}

const viewExercise = (exerciseId: string) => {
  router.push(`/exercise/${exerciseId}`)
}

const closeForm = () => {
  showAddForm.value = false
  editingExercise.value = null
}

const handleSaveExercise = async (exerciseData: {
  name: string
  muscleGroups: string[]
}) => {
  if (editingExercise.value) {
    // Update existing exercise
    await workoutData.updateExercise(editingExercise.value.id, exerciseData)
  } else {
    // Add new exercise
    await workoutData.addExercise(exerciseData)
  }
  
  closeForm()
}
</script>
