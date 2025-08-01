<template>
  <div class="space-y-6">
         <!-- Header -->
     <div class="flex items-center justify-between">
       <h1 class="text-2xl font-bold text-white">{{ session?.templateName }}</h1>
       <span 
         class="inline-block px-3 py-1 text-sm font-medium rounded-full"
         :style="{ 
           backgroundColor: getWorkoutTypeColor(session?.workoutType || '') + '20',
           color: getWorkoutTypeColor(session?.workoutType || '')
         }"
       >
         {{ getWorkoutTypeName(session?.workoutType || '') }}
       </span>
     </div>



    <!-- Exercises -->
    <div v-if="session" class="space-y-6">
      <div 
        v-for="(exercise, exerciseIndex) in session.exercises" 
        :key="exercise.exerciseId"
        class="card"
      >
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-white">{{ exercise.name }}</h3>
          <span class="text-sm text-dark-300">
            {{ getCompletedSets(exercise) }}/{{ exercise.sets.length }} sett
          </span>
        </div>

        <!-- Sets -->
        <div class="space-y-2">
          <div 
            v-for="(set, setIndex) in exercise.sets" 
            :key="set.id"
            class="bg-dark-700 rounded-lg p-3"
            :class="{ 'border-l-4 border-primary-500': set.isCompleted }"
          >
                         <div class="mb-2">
               <span class="text-sm font-medium text-white">Sett {{ setIndex + 1 }}</span>
             </div>

                         <div class="grid grid-cols-2 gap-3">
               <div>
                 <label class="block text-xs text-dark-300 mb-1">Reps</label>
                 <input
                   v-model.number="set.reps"
                   type="number"
                   min="0"
                   class="input-field w-full text-sm py-1"
                   placeholder="0"
                   @input="updateSetCompletion(exerciseIndex, setIndex)"
                 />
               </div>
               <div>
                 <label class="block text-xs text-dark-300 mb-1">Vekt (kg)</label>
                 <input
                   v-model.number="set.weight"
                   type="number"
                   min="0"
                   step="0.5"
                   class="input-field w-full text-sm py-1"
                   placeholder="0"
                   @input="updateSetCompletion(exerciseIndex, setIndex)"
                 />
               </div>
             </div>

            <!-- Volume Display -->
            <div v-if="set.weight && set.reps" class="mt-2 pt-2 border-t border-dark-600">
              <div class="flex items-center justify-between text-xs">
                <span class="text-dark-300">Volum:</span>
                <span class="text-primary-500 font-medium">
                  {{ set.weight * set.reps }} kg
                </span>
              </div>
            </div>
          </div>
          
          <!-- Add Set Button -->
          <button 
            @click="addSet(exerciseIndex)"
            class="w-full mt-3 btn-secondary text-sm py-2"
          >
            + Legg til sett
          </button>
        </div>
      </div>
         </div>

                 <!-- Add Exercise Button -->
            <div class="card">
              <router-link 
                :to="`/workout/${session?.id}/add-exercise`"
                class="w-full btn-secondary py-3 flex items-center justify-center"
              >
                + Legg til øvelse
              </router-link>
            </div>



     <!-- Summary -->
     <div class="card">
       <h3 class="text-lg font-semibold text-white mb-4">Sammendrag</h3>
       <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div class="text-center">
           <p class="text-2xl font-bold text-primary-500">{{ completedSets }} av {{ totalSets }}</p>
           <p class="text-sm text-dark-300">Sett gjennomført</p>
         </div>
         <div class="text-center">
           <p class="text-2xl font-bold text-primary-500">{{ formatNumber(estimatedVolume) }}</p>
           <p class="text-sm text-dark-300">Estimert volum (kg)</p>
         </div>
         <div class="text-center">
           <p class="text-2xl font-bold text-primary-500">{{ sessionDuration }}</p>
           <p class="text-sm text-dark-300">Varighet</p>
         </div>
       </div>
     </div>

     

     

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWorkoutStore } from '@/stores/workoutStore'
import type { WorkoutSession } from '@/types/workout'

const route = useRoute()
const router = useRouter()
const workoutStore = useWorkoutStore()

// State
const session = ref<WorkoutSession | null>(null)
const sessionNotes = ref('')
const startTime = ref<Date | null>(null)

// Computed
const completedSets = computed(() => {
  if (!session.value) return 0
  return session.value.exercises.reduce((total, exercise) => {
    return total + exercise.sets.filter(set => set.isCompleted).length
  }, 0)
})

const totalSets = computed(() => {
  if (!session.value) return 0
  return session.value.exercises.reduce((total, exercise) => {
    return total + exercise.sets.length
  }, 0)
})



const estimatedVolume = computed(() => {
  if (!session.value) return 0
  return session.value.exercises.reduce((exerciseTotal, exercise) => {
    const exerciseVolume = exercise.sets.reduce((setTotal, set) => {
      if (set.isCompleted && set.weight && set.reps) {
        return setTotal + (set.weight * set.reps)
      }
      return setTotal
    }, 0)
    return exerciseTotal + exerciseVolume
  }, 0)
})

const sessionDuration = computed(() => {
  if (!startTime.value) return '0 min'
  const duration = Math.round((Date.now() - startTime.value.getTime()) / 60000)
  return `${duration} min`
})

const availableExercises = computed(() => {
  return workoutStore.exercises
})

// Methods
const getWorkoutTypeName = (typeId: string): string => {
  const type = workoutStore.getWorkoutType(typeId)
  return type?.name || typeId
}

const getWorkoutTypeColor = (typeId: string): string => {
  const type = workoutStore.getWorkoutType(typeId)
  return type?.color || '#f97316'
}

const getCompletedSets = (exercise: any): number => {
  return exercise.sets.filter((set: any) => set.isCompleted).length
}

const updateSetCompletion = (exerciseIndex: number, setIndex: number) => {
  if (!session.value) return
  
  const set = session.value.exercises[exerciseIndex].sets[setIndex]
  const isCompleted = Boolean(set.weight && set.reps && set.weight > 0 && set.reps > 0)
  
  if (set.isCompleted !== isCompleted) {
    set.isCompleted = isCompleted
    
    // Auto-save session
    workoutStore.updateWorkoutSession(session.value.id, {
      exercises: session.value.exercises
    })
  }
}

const addSet = (exerciseIndex: number) => {
  if (!session.value) return
  
  const exercise = session.value.exercises[exerciseIndex]
  const newSet = {
    id: `set-${Date.now()}-${exercise.sets.length}`,
    reps: exercise.sets[exercise.sets.length - 1]?.reps || 8,
    weight: exercise.sets[exercise.sets.length - 1]?.weight || 0,
    restTime: 0,
    duration: undefined,
    distance: undefined,
    isCompleted: false
  }
  
  exercise.sets.push(newSet)
  
  // Auto-save session
  workoutStore.updateWorkoutSession(session.value.id, {
    exercises: session.value.exercises
  })
}





const completeWorkout = () => {
  if (!session.value) return
  
  // Update session notes before completing
  workoutStore.updateWorkoutSession(session.value.id, {
    notes: sessionNotes.value
  })
  
  // Complete the workout
  workoutStore.completeWorkoutSession(session.value.id)
  
  // Show completion message and redirect
  alert('Økt fullført! Godt jobbet! 💪')
  router.push('/')
}

const handleSaveWorkout = () => {
  if (!session.value) return
  
  // Auto-save current session
  workoutStore.updateWorkoutSession(session.value.id, {
    notes: sessionNotes.value
  })
  
  // Mark session as active (saved but not completed)
  workoutStore.markSessionAsActive(session.value.id)
  
  alert('Økt lagret! 💾')
  
  // Navigate back to dashboard to see the active session
  router.push('/')
}

const handleCompleteWorkout = () => {
  completeWorkout()
}

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('no-NO').format(Math.round(num))
}

// Lifecycle
onMounted(() => {
  const sessionId = route.params.id as string
  const foundSession = workoutStore.getSessionById(sessionId)
  
  if (!foundSession) {
    alert('Økt ikke funnet')
    router.push('/')
    return
  }
  
  session.value = foundSession
  sessionNotes.value = foundSession.notes || ''
  startTime.value = new Date(foundSession.date)
  
  // Add event listeners for navigation buttons
  window.addEventListener('save-workout', handleSaveWorkout)
  window.addEventListener('complete-workout', handleCompleteWorkout)
})

onUnmounted(() => {
  // Auto-save when leaving
  if (session.value) {
    workoutStore.updateWorkoutSession(session.value.id, {
      notes: sessionNotes.value
    })
  }
  
  // Remove event listeners
  window.removeEventListener('save-workout', handleSaveWorkout)
  window.removeEventListener('complete-workout', handleCompleteWorkout)
})
</script> 