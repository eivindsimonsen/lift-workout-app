<template>
  <div>
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-white mb-2">Øvelser</h1>
      <p class="text-dark-300">Oversikt over alle øvelser og din fremgang</p>
    </div>

    <!-- Exercises by Category -->
    <div class="space-y-12">
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
            class="bg-dark-700 rounded-lg p-4 hover:bg-dark-600 cursor-pointer transition-colors border border-dark-600 hover:border-primary-500/50"
          >
            <div class="flex items-center justify-between mb-2">
              <h3 class="font-medium text-white">{{ exercise.name }}</h3>
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




  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useHybridData } from '@/composables/useHybridData'


const router = useRouter()
const workoutData = useHybridData()

// Category order
const categoryOrder = ['Bryst', 'Rygg', 'Ben', 'Armer', 'Skuldre', 'Core', 'Andre']

// Computed properties
const allExercises = computed(() => {
  // Start with all exercises from the database
  const exercises = workoutData.exercises.value.map(exercise => {
    const performances: any[] = []
    let totalSessions = 0

    // Find all performances of this exercise in completed sessions
    workoutData.sessions.value
      .filter(session => session.isCompleted)
      .forEach(session => {
        const sessionExercise = session.exercises.find(e => e.exerciseId === exercise.id)
        if (sessionExercise) {
          totalSessions++
          
          // Find best set for this exercise in this session
          let bestSet: any = null
          let bestVolume = 0
          
          sessionExercise.sets.forEach(set => {
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
      category: getSimplifiedCategory(exercise.muscleGroups?.[0] || 'Andre'),
      totalSessions,
      lastPerformance
    }
  })

  // Sort exercises by name within each category
  return exercises.sort((a, b) => a.name.localeCompare(b.name, 'no'))
})

const categories = computed(() => {
  const usedCategories = new Set(allExercises.value.map((exercise: any) => exercise.category))
  return categoryOrder.filter(category => usedCategories.has(category))
})
const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('no-NO', {
    day: 'numeric',
    month: 'short'
  }).format(date)
}

const getSimplifiedCategory = (muscleGroup: string): string => {
  const categoryMap: { [key: string]: string } = {
    'bryst': 'Bryst',
    'triceps': 'Armer',
    'biceps': 'Armer',
    'skuldre': 'Skuldre',
    'rygg': 'Rygg',
    'quadriceps': 'Ben',
    'glutes': 'Ben',
    'hamstrings': 'Ben',
    'calves': 'Ben',
    'core': 'Core',
    'other': 'Andre',
    'Andre': 'Andre'
  }
  
  return categoryMap[muscleGroup] || 'Andre'
}

const getCategoryName = (category: string): string => {
  return category
}

const getExercisesByCategory = (category: string) => {
  return allExercises.value.filter(exercise => exercise.category === category)
}

const viewExercise = (exerciseId: string) => {
  router.push(`/exercise/${exerciseId}`)
}
</script>
