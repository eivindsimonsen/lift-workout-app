<template>
  <NetworkStatus />
    <div>
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
              </svg>
            </div>
            <h1 class="text-2xl font-bold text-white">Økter</h1>
          </div>
          <router-link 
            to="/template/create"
            class="btn-primary inline-flex items-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </router-link>
        </div>
      </div>

    <!-- Active Workout Sessions -->
    <div class="mt-8">
      <!-- Loading State for Active Sessions -->
      <div v-if="isLoading" class="mb-4">
        <div class="h-7 bg-dark-600 rounded w-32 mb-4 animate-pulse"></div>
        <div class="space-y-4">
          <div class="bg-dark-700 rounded-lg p-4 border border-dark-600 animate-pulse">
            <div class="flex items-center justify-between">
              <div class="flex-1 space-y-2">
                <div class="h-5 bg-dark-600 rounded w-40"></div>
                <div class="h-4 bg-dark-600 rounded w-32"></div>
                <div class="h-3 bg-dark-600 rounded w-48"></div>
              </div>
              <div class="h-8 bg-dark-600 rounded-full w-20"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Active Sessions Content -->
      <div v-else-if="activeSessions.length > 0">
        <h2 class="text-xl font-semibold text-white mb-4">Aktiv Økt</h2>

        <div class="space-y-4">
          <SwipeableCard
            v-for="session in activeSessions" 
            :key="session.id"
            @delete="abandonWorkout(session.id)"
          >
            <div 
              @click="continueWorkout(session.id)"
              class="flex items-center justify-between p-4 bg-dark-700 rounded-lg hover:bg-dark-600 cursor-pointer transition-colors border-l-4 border-primary-500"
            >
              <div class="flex-1">
                <h3 class="font-medium text-white">{{ session.templateName }}</h3>
                <p class="text-sm text-dark-300">
                  Startet {{ formatDate(session.date) }}
                </p>
                <p class="text-xs text-dark-400">
                  {{ session.exercises.length }} øvelser • Fortsett økt
                </p>
              </div>
              <div class="flex items-center gap-2">
                <span 
                  class="px-3 py-2 rounded-full text-sm font-medium"
                  :style="{ 
                    backgroundColor: getWorkoutTypeColor(session.workoutType) + '20',
                    color: getWorkoutTypeColor(session.workoutType)
                  }"
                >
                  {{ getWorkoutTypeName(session.workoutType) }}
                </span>
              </div>
            </div>
          </SwipeableCard>
        </div>
      </div>
    </div>

    <!-- Workout Templates Section -->
    <div class="mt-8 pb-24 md:pb-0">
      <div class="mb-4">
        <h2 class="text-xl font-semibold text-white">Training Templates</h2>
      </div>

      <!-- Info message when there's an active session -->
      <div v-if="activeSessions.length > 0" class="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div class="flex items-center gap-3">
          <svg class="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p class="text-blue-300 text-sm font-medium">Du har en aktiv økt</p>
            <p class="text-blue-400/80 text-xs">Fullfør den aktive økten først for å starte en ny økt.</p>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="mt-4">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div 
            v-for="i in 6" 
            :key="i"
            class="bg-dark-700 rounded-lg p-6 border border-dark-600 animate-pulse"
          >
            <!-- Template Title and Workout Type Skeleton -->
            <div class="flex items-center justify-between mb-4">
              <div class="h-6 bg-dark-600 rounded w-32"></div>
              <div class="h-6 bg-dark-600 rounded w-20"></div>
            </div>

            <!-- Exercise Count Skeleton -->
            <div class="h-4 bg-dark-600 rounded w-24 mb-6"></div>

            <!-- Exercise Preview Skeleton -->
            <div class="mb-6 space-y-3">
              <div class="space-y-2">
                <div class="h-3 bg-dark-600 rounded w-16"></div>
                <div class="space-y-1">
                  <div class="h-3 bg-dark-600 rounded w-full"></div>
                  <div class="h-3 bg-dark-600 rounded w-3/4"></div>
                  <div class="h-3 bg-dark-600 rounded w-1/2"></div>
                </div>
              </div>
            </div>

            <!-- Action Buttons Skeleton -->
            <div class="flex gap-2 mt-auto">
              <div class="flex-1 h-8 bg-dark-600 rounded-lg"></div>
              <div class="flex-1 h-8 bg-dark-600 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredTemplates.length === 0" class="mt-4 text-center py-12">
        <div class="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p class="text-dark-300 mb-4">No training templates created yet</p>
        <router-link to="/template/create" class="btn-primary">
          Create your first template
        </router-link>
      </div>

      <!-- Templates Grid -->
      <div v-else class="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="template in filteredTemplates" 
          :key="template.id"
          class="bg-dark-700 rounded-lg p-6 border border-dark-600 hover:border-primary-500/50 transition-colors flex flex-col h-full"
        >
          <!-- Template Title and Workout Type -->
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-white">{{ template.name }}</h3>
            <span 
              class="px-3 py-1 rounded-full text-sm font-medium"
              :style="{ 
                backgroundColor: getWorkoutTypeColor(template.workoutType) + '20',
                color: getWorkoutTypeColor(template.workoutType)
              }"
            >
              {{ getWorkoutTypeName(template.workoutType) }}
            </span>
          </div>

          <p class="text-sm text-dark-300 mb-4">
            {{ template.exercises.length }} øvelser
          </p>

          <!-- Exercise Preview -->
          <div class="mb-6 flex-grow">
            <div class="space-y-3">
              <div 
                v-for="(group, groupName) in (getExerciseGroups && getExerciseGroups(template.exercises)) || {}" 
                :key="groupName"
                class="space-y-1"
              >
                                 <h4 class="text-xs font-medium text-primary-400 uppercase tracking-wide">
                   {{ groupName }}
                 </h4>
                <div class="space-y-1">
                  <div 
                    v-for="(exercise, index) in group" 
                    :key="exercise.exerciseId"
                    class="text-sm text-dark-200"
                  >
                    <span class="truncate">{{ exercise.name }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-2 mt-auto">
            <router-link 
              :to="`/template/edit/${template.id}`"
              class="flex-1 bg-dark-600 hover:bg-dark-500 text-white rounded-lg transition-colors text-sm py-2 flex items-center justify-center"
            >
              Rediger
            </router-link>
            <button 
              @click.stop="startWorkout(template.id)"
              :disabled="activeSessions.length > 0"
              class="flex-1 btn-primary text-sm py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              :title="activeSessions.length > 0 ? 'Du har allerede en aktiv økt. Fullfør den først.' : 'Start ny økt'"
            >
              Start Økt
            </button>
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
import SwipeableCard from '@/components/SwipeableCard.vue'
import NetworkStatus from '@/components/NetworkStatus.vue'

const router = useRouter()
const workoutData = useHybridData()

// Computed properties
const filteredTemplates = computed(() => {
  return workoutData.templates.value
})

const activeSessions = computed(() => {
  return workoutData.sessions.value.filter(session => !session.isCompleted)
})

// Loading state
const isLoading = computed(() => workoutData.isLoading.value)

// Methods
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('no-NO').format(Math.round(num))
}

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('no-NO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date)
}

const getWorkoutTypeName = (typeId: string): string => {
  return workoutData.getWorkoutType.value(typeId)
}

const getWorkoutTypeColor = (typeId: string): string => {
  return workoutData.getWorkoutTypeColor.value(typeId)
}

const startWorkout = async (templateId: string) => {
  try {
    const session = await workoutData.startWorkoutSession(templateId)
    if (session) {
      router.push(`/workout/${session.id}`)
    } else {
      alert('Kunne ikke starte økt. Prøv igjen.')
    }
  } catch (error) {
    alert('Kunne ikke starte økt. Prøv igjen.')
  }
}

const continueWorkout = (sessionId: string) => {
  router.push(`/workout/${sessionId}`)
}

const abandonWorkout = async (sessionId: string) => {
  if (confirm('Er du sikker på at du vil avbryte denne økten? Dette kan ikke angres og økten vil markeres som fullført.')) {
    try {
      // Haptic feedback on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(100)
      }
      
      await workoutData.abandonWorkoutSession(sessionId)
      // Refresh data to update the UI
      await workoutData.loadData()
      
      // Success feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 100, 50])
      }
    } catch (error) {
      // Error feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200])
      }
      alert('Kunne ikke avbryte økt. Prøv igjen.')
    }
  }
}





// Helper methods for exercise grouping
const getExerciseGroups = (exercises: any[]) => {
  const groups: Record<string, any[]> = {}
  
  // Safety check for exercises
  if (!exercises || !Array.isArray(exercises)) {
    return groups
  }
  
  exercises.forEach(exercise => {
    // Find the exercise data using getExerciseById which can handle both main exercises and variants
    const exerciseData = workoutData.getExerciseById.value(exercise.exerciseId)
    if (exerciseData && exerciseData.muscleGroups && exerciseData.muscleGroups.length > 0) {
      // Use the first muscle group as the primary category
      const primaryGroup = exerciseData.muscleGroups[0]
      if (!groups[primaryGroup]) {
        groups[primaryGroup] = []
      }
      groups[primaryGroup].push(exercise)
    } else if (exerciseData && exerciseData.category) {
      // Fallback to category if no muscleGroups
      if (!groups[exerciseData.category]) {
        groups[exerciseData.category] = []
      }
      groups[exerciseData.category].push(exercise)
    } else {
      // Last resort fallback
      if (!groups['other']) {
        groups['other'] = []
      }
      groups['other'].push(exercise)
    }
  })
  
  return groups
}


</script> 