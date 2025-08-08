<template>
  <div>
         <!-- Header -->
     <div class="mb-8">
       <div class="flex items-start justify-between">
         <div>
           <h1 class="text-3xl font-bold text-white mb-2">Øvelser</h1>
           <p class="text-dark-300">Oversikt over alle øvelser og din fremgang</p>
         </div>
         <button 
           @click="showAddForm = true"
           class="btn-primary px-8 py-4 text-base font-medium flex items-center gap-2 whitespace-nowrap"
         >
           <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
           </svg>
           Legg til
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
             <button @click="showAddForm = true" class="btn-primary px-6 py-3 text-base font-medium flex items-center gap-2">
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
        <!-- Category Header -->
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-white">{{ getCategoryName(category) }}</h2>
          <div class="mt-2 border-b border-dark-600"></div>
        </div>

        <!-- Exercise Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div 
            v-for="exercise in getExercisesByCategory(category)" 
            :key="exercise.id"
            @click="viewExercise(exercise.id)"
            class="bg-dark-700 rounded-lg p-4 border border-dark-600 hover:border-primary-500/50 transition-colors cursor-pointer hover:bg-dark-600"
          >
            <div class="flex items-center justify-between mb-2">
              <h3 class="font-medium text-white">{{ exercise.name }}</h3>
              <div class="flex items-center gap-2">
                <button 
                  @click.stop="editExercise(exercise)"
                  class="text-dark-400 hover:text-primary-400 transition-colors p-1"
                  title="Rediger øvelse"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button 
                  @click.stop="deleteExercise(exercise.id)"
                  class="text-dark-400 hover:text-red-400 transition-colors p-1"
                  title="Slett øvelse"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            
            
            
            <!-- Muscle Groups -->
            <div class="mb-3">
              <div class="flex flex-wrap gap-1">
                <span 
                  v-for="muscle in exercise.muscleGroups" 
                  :key="muscle"
                  class="px-2 py-1 text-xs bg-dark-600 text-dark-300 rounded"
                >
                  {{ getMuscleGroupDisplayName(muscle) }}
                </span>
              </div>
            </div>
            
            <div v-if="exercise.lastPerformance" class="space-y-1">
              <p class="text-sm text-dark-300">
                Sist: {{ exercise.lastPerformance.weight }}kg × {{ exercise.lastPerformance.reps }} reps
              </p>
              <p class="text-xs text-dark-400">
                {{ formatDate(exercise.lastPerformance.date) }}
              </p>
            </div>
            
            <div v-else class="text-sm text-dark-400">
              Ingen data ennå
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
const muscleGroupOrder = ['chest', 'back', 'legs', 'arms', 'shoulders']

// Computed properties
const isLoading = computed(() => workoutData.isLoading.value)

const allExercises = computed(() => {
  console.log('🔍 Computing allExercises, workoutData.exercises.value:', workoutData.exercises.value)
  
  // Start with all exercises from Supabase
  const exercises = workoutData.exercises.value?.map(exercise => {
    console.log('🔍 Processing exercise:', exercise)
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

    return {
      id: exercise.id,
      name: exercise.name,
      muscleGroups: exercise.muscleGroups || [],
      totalSessions,
      lastPerformance
    }
  }) || []

  console.log('🔍 Final exercises array:', exercises)
  
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
  return getMuscleGroupDisplayName(muscleGroup)
}

const getExercisesByCategory = (muscleGroup: string) => {
  return allExercises.value?.filter(exercise => exercise.muscleGroups?.includes(muscleGroup)) || []
}



const getMuscleGroupDisplayName = (groupName: string): string => {
  const displayNames: Record<string, string> = {
    'chest': 'Bryst',
    'back': 'Rygg',
    'legs': 'Ben',
    'arms': 'Armer',
    'shoulders': 'Skuldre'
  }
  
  return displayNames[groupName] || groupName
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
