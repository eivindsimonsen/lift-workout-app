<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
          <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 class="text-3xl font-bold text-white">Økt Detaljer</h1>
      </div>
      <router-link 
        to="/history" 
        class="btn-secondary"
      >
        Tilbake
      </router-link>
    </div>

    <div v-if="!session" class="text-center py-12">
      <p class="text-dark-300">Økt ikke funnet</p>
      <router-link to="/history" class="btn-primary mt-4">Tilbake til Historikk</router-link>
    </div>

    <!-- Session Details -->
    <div v-else class="space-y-6">
      <!-- Session Header -->
      <div class="card">
        <div class="flex items-start justify-between">
          <div>
            <h2 class="text-2xl font-bold text-white mb-2">{{ session.templateName }}</h2>
            <p class="text-dark-300 mb-4">
              {{ formatDate(session.date) }} • {{ session.duration }} minutter
            </p>
            <span 
              class="px-3 py-1 rounded-full text-sm font-medium"
              :style="{ 
                backgroundColor: getWorkoutTypeColor(session.workoutType) + '20',
                color: getWorkoutTypeColor(session.workoutType)
              }"
            >
              {{ getWorkoutTypeName(session.workoutType) }}
            </span>
          </div>
          <div class="text-right">
            <p class="text-2xl font-bold text-primary-500">
              {{ formatNumber(session.totalVolume || 0) }} kg
            </p>
            <p class="text-sm text-dark-300">Total volum</p>
          </div>
        </div>
      </div>

      <!-- Session Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-dark-700 rounded-lg p-4 text-center">
          <p class="text-2xl font-bold text-primary-500">{{ session.exercises.length }}</p>
          <p class="text-sm text-dark-300">Øvelser</p>
        </div>
        <div class="bg-dark-700 rounded-lg p-4 text-center">
          <p class="text-2xl font-bold text-primary-500">{{ getTotalSets(session) }}</p>
          <p class="text-sm text-dark-300">Sett</p>
        </div>
        <div class="bg-dark-700 rounded-lg p-4 text-center">
          <p class="text-2xl font-bold text-primary-500">{{ session.duration }}</p>
          <p class="text-sm text-dark-300">Minutter</p>
        </div>
      </div>

      <!-- Exercises -->
      <div class="card">
        <h3 class="text-xl font-semibold text-white mb-4">Øvelser</h3>
        <div class="space-y-4">
          <div 
            v-for="exercise in session.exercises" 
            :key="exercise.exerciseId"
            class="bg-dark-700 rounded-lg p-4"
          >
            <h4 
              class="font-medium text-white mb-3 cursor-pointer hover:text-primary-400 transition-colors"
              @click="viewExercise(exercise.exerciseId)"
            >
              {{ exercise.name }}
            </h4>
            
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
          </div>
        </div>
      </div>

        <!-- Actions -->
       <div class="flex gap-3">
         <button 
           @click="deleteSession"
           class="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
         >
           Slett økt
         </button>
       </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useHybridData } from '@/composables/useHybridData'
import type { WorkoutSession } from '@/types/workout'

const router = useRouter()
const route = useRoute()
const workoutData = useHybridData()

const session = ref<WorkoutSession | null>(null)

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

const deleteSession = () => {
  if (!session.value) return
  
  if (confirm('Er du sikker på at du vil slette denne økten?')) {
    workoutData.deleteWorkoutSession(session.value.id)
    router.push('/history')
  }
}

const viewExercise = (exerciseId: string) => {
  router.push(`/exercise/${exerciseId}`)
}

// Lifecycle
onMounted(() => {
  const sessionId = route.params.id as string
  const foundSession = workoutData.getSessionById.value(sessionId)
  
  if (foundSession) {
    session.value = foundSession
  }
})
</script> 