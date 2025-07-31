<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-white">{{ session?.templateName }}</h1>
      <p class="text-dark-300">{{ getWorkoutTypeName(session?.workoutType || '') }}</p>
    </div>

    <!-- Progress Bar -->
    <div class="bg-dark-700 rounded-lg p-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-dark-300">Fremgang</span>
        <span class="text-sm text-white">{{ completedSets }}/{{ totalSets }} sett</span>
      </div>
      <div class="w-full bg-dark-600 rounded-full h-2">
        <div 
          class="bg-primary-500 h-2 rounded-full transition-all duration-300"
          :style="{ width: `${progressPercentage}%` }"
        ></div>
      </div>
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
        <div class="space-y-3">
          <div 
            v-for="(set, setIndex) in exercise.sets" 
            :key="set.id"
            class="bg-dark-700 rounded-lg p-4"
            :class="{ 'border-l-4 border-primary-500': set.isCompleted }"
          >
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-medium text-white">Sett {{ setIndex + 1 }}</span>
              <div class="flex items-center gap-2">
                <button 
                  @click="toggleSet(exerciseIndex, setIndex)"
                  class="flex items-center gap-2 px-3 py-1 rounded-lg text-sm transition-colors"
                  :class="set.isCompleted 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-dark-600 text-dark-300 hover:bg-dark-500'"
                >
                  <svg v-if="set.isCompleted" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{{ set.isCompleted ? 'Fullført' : 'Marker som fullført' }}</span>
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs text-dark-300 mb-1">Reps</label>
                <input
                  v-model.number="set.reps"
                  type="number"
                  min="0"
                  class="input-field w-full text-sm"
                  placeholder="0"
                />
              </div>
              <div>
                <label class="block text-xs text-dark-300 mb-1">Vekt (kg)</label>
                <input
                  v-model.number="set.weight"
                  type="number"
                  min="0"
                  step="0.5"
                  class="input-field w-full text-sm"
                  placeholder="0"
                />
              </div>
              <div>
                <label class="block text-xs text-dark-300 mb-1">Hvile (min)</label>
                <input
                  v-model.number="set.restTime"
                  type="number"
                  min="0"
                  class="input-field w-full text-sm"
                  placeholder="0"
                />
              </div>
            </div>

            <!-- Volume Display -->
            <div v-if="set.weight && set.reps" class="mt-3 pt-3 border-t border-dark-600">
              <div class="flex items-center justify-between text-sm">
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
       <button 
         @click="showAddExerciseModal = true"
         class="w-full btn-secondary py-3"
       >
         + Legg til øvelse
       </button>
     </div>

     <!-- Session Notes -->
     <div class="card">
       <h3 class="text-lg font-semibold text-white mb-4">Økt Notater</h3>
       <textarea
         v-model="sessionNotes"
         rows="4"
         class="input-field w-full"
         placeholder="Generelle notater om økten..."
       ></textarea>
     </div>

     <!-- Summary -->
     <div class="card">
       <h3 class="text-lg font-semibold text-white mb-4">Sammendrag</h3>
       <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div class="text-center">
           <p class="text-2xl font-bold text-primary-500">{{ completedSets }}</p>
           <p class="text-sm text-dark-300">Fullførte sett</p>
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

     <!-- Complete Workout Button -->
     <div class="flex justify-center">
       <button 
         @click="completeWorkout"
         class="btn-primary px-8 py-3 text-lg"
       >
         Fullfør økt
       </button>
     </div>

     <!-- Add Exercise Modal -->
     <div v-if="showAddExerciseModal" class="fixed bg-black/50 flex items-center justify-center p-4" style="top: 0; left: 0; right: 0; bottom: 0; width: 100vw; height: 100vh; z-index: 9999;">
       <div class="bg-dark-800 rounded-lg max-w-md w-full">
         <div class="p-6">
           <h3 class="text-xl font-semibold text-white mb-4">Legg til øvelse</h3>
           
           <div class="space-y-4">
             <div>
               <label class="block text-sm font-medium text-white mb-2">Øvelse</label>
               <select 
                 v-model="newExercise.exerciseId"
                 required
                 class="input-field w-full"
               >
                 <option value="">Velg øvelse</option>
                 <option 
                   v-for="exercise in availableExercises" 
                   :key="exercise.id" 
                   :value="exercise.id"
                 >
                   {{ exercise.name }}
                 </option>
               </select>
             </div>
             
             <div class="grid grid-cols-2 gap-4">
               <div>
                 <label class="block text-xs text-dark-300 mb-1">Antall sett</label>
                 <input
                   v-model.number="newExercise.sets"
                   type="number"
                   min="1"
                   required
                   class="input-field w-full text-sm"
                 />
               </div>
               <div>
                 <label class="block text-xs text-dark-300 mb-1">Reps</label>
                 <input
                   v-model.number="newExercise.reps"
                   type="number"
                   min="1"
                   required
                   class="input-field w-full text-sm"
                 />
               </div>
             </div>
           </div>
           
           <div class="flex gap-3 justify-end mt-6">
             <button 
               @click="showAddExerciseModal = false"
               class="btn-secondary"
             >
               Avbryt
             </button>
             <button 
               @click="addExercise"
               class="btn-primary"
               :disabled="!newExercise.exerciseId"
             >
               Legg til
             </button>
           </div>
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
const showAddExerciseModal = ref(false)
const newExercise = ref({
  exerciseId: '',
  sets: 3,
  reps: 8
})

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

const progressPercentage = computed(() => {
  if (totalSets.value === 0) return 0
  return Math.round((completedSets.value / totalSets.value) * 100)
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

const getCompletedSets = (exercise: any): number => {
  return exercise.sets.filter((set: any) => set.isCompleted).length
}

const toggleSet = (exerciseIndex: number, setIndex: number) => {
  if (!session.value) return
  
  const set = session.value.exercises[exerciseIndex].sets[setIndex]
  set.isCompleted = !set.isCompleted
  
  // Auto-save session
  workoutStore.updateWorkoutSession(session.value.id, {
    exercises: session.value.exercises
  })
}

const addSet = (exerciseIndex: number) => {
  if (!session.value) return
  
  const exercise = session.value.exercises[exerciseIndex]
  const newSet = {
    id: `set-${Date.now()}-${exercise.sets.length}`,
    reps: exercise.sets[exercise.sets.length - 1]?.reps || 8,
    weight: exercise.sets[exercise.sets.length - 1]?.weight || 0,
    restTime: exercise.sets[exercise.sets.length - 1]?.restTime || 0,
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

const addExercise = () => {
  if (!session.value || !newExercise.value.exerciseId) return
  
  const exerciseData = workoutStore.exercises.find(e => e.id === newExercise.value.exerciseId)
  if (!exerciseData) return
  
  const exercise = {
    exerciseId: newExercise.value.exerciseId,
    name: exerciseData.name,
    sets: Array.from({ length: newExercise.value.sets }, (_, i) => ({
      id: `set-${Date.now()}-${i}`,
      reps: newExercise.value.reps,
      weight: undefined,
      restTime: undefined,
      duration: undefined,
      distance: undefined,
      isCompleted: false
    })),
    notes: ''
  }
  
  session.value.exercises.push(exercise)
  
  // Auto-save session
  workoutStore.updateWorkoutSession(session.value.id, {
    exercises: session.value.exercises
  })
  
  // Reset form and close modal
  newExercise.value = {
    exerciseId: '',
    sets: 3,
    reps: 8
  }
  showAddExerciseModal.value = false
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
})

onUnmounted(() => {
  // Auto-save when leaving
  if (session.value) {
    workoutStore.updateWorkoutSession(session.value.id, {
      notes: sessionNotes.value
    })
  }
})
</script> 