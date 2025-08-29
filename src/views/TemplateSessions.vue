<template>
  <NetworkStatus />
    <div>
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
              <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
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

        <div class="space-y-2">
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
          <p class="text-xs text-dark-400 text-center md:hidden">Swipe for å avbryte økt</p>
        </div>
      </div>
    </div>

    <!-- Workout Templates Section -->
    <div class="mt-8 pb-24 md:pb-0">
      <div class="mb-4">
        <h2 class="text-xl font-semibold text-white">Treningsøkter</h2>
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

      <!-- Debug info section -->
      <!-- <div class="mb-4 p-4 bg-gray-500/10 border border-gray-500/20 rounded-lg">
        <div class="flex items-center gap-3 mb-2">
          <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-gray-300 text-sm font-medium">Debug Info</span>
        </div>
        <div class="text-xs text-gray-400 space-y-1">
          <p>Sist synkronisert: {{ workoutData.lastSyncTime.value ? new Date(workoutData.lastSyncTime.value).toLocaleString('no-NO') : 'Aldri' }}</p>
        </div>
      </div> -->

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
        <p class="text-dark-300 mb-4">Ingen økter opprettet enda</p>
        <router-link to="/template/create" class="btn-primary">
          Opprett din første økt
        </router-link>
      </div>

      <!-- Templates Grid -->
      <div v-else class="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div 
          v-for="template in filteredTemplates" 
          :key="template.id"
          :class="['bg-dark-800', 'rounded-lg', 'p-6', 'transition-colors', 'flex', 'flex-col', 'h-full']">
          <!-- Template Title and Workout Type -->
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-white">{{ template.name }}</h3>
            <span 
              class="px-3 py-1 rounded-full text-sm font-semibold tracking-wider"
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
              :class="['flex-1', 'text-sm', 'py-2', 'disabled:opacity-50', 'disabled:cursor-not-allowed', 'rounded-lg']"
              :style="{ backgroundColor: getWorkoutTypeColor(template.workoutType), color: '#fff' }"
              :title="activeSessions.length > 0 ? 'Du har allerede en aktiv økt. Fullfør den først.' : 'Start ny økt'"
            >
              Start Økt
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Countdown Modal -->
    <div 
      v-if="showCountdown" 
      class="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
      @click="cancelCountdown"
    >
      <div 
        class="w-full h-full flex flex-col items-center justify-center text-center p-8"
        @click.stop
      >
        <!-- Countdown Number -->
        <div class="mb-8">
          <div 
            class="text-9xl md:text-[12rem] font-bold text-primary-500 transition-all duration-300"
            :class="countdownNumber === 0 ? 'scale-110' : ''"
          >
            {{ countdownNumber }}
          </div>
        </div>

        <!-- Motivational Text -->
        <div class="mb-12">
          <h3 class="text-4xl md:text-5xl font-bold text-white mb-4">
            {{ getMotivationalText() }}
          </h3>
          <p class="text-xl md:text-2xl text-dark-300">
            {{ getMotivationalSubtext() }}
          </p>
        </div>

        <!-- Progress Bar -->
        <div class="w-full max-w-md bg-dark-700 rounded-full h-3 mb-8">
          <div 
            class="bg-primary-500 h-3 rounded-full transition-all duration-1000 ease-out"
            :style="{ width: `${((4 - countdownNumber) / 4) * 100}%` }"
          ></div>
        </div>

        <!-- Cancel Button -->
        <button 
          @click="cancelCountdown"
          class="text-dark-400 hover:text-white transition-colors text-lg px-6 py-3 rounded-lg hover:bg-dark-700/50 transition-all"
        >
          Avbryt
        </button>
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

// Countdown state
const showCountdown = ref(false)
const countdownNumber = ref(3)
const countdownInterval = ref<number | null>(null)
const pendingSessionId = ref<string | null>(null)

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
  return workoutData.getWorkoutType(typeId)
}

const getWorkoutTypeColor = (typeId: string): string => {
  return workoutData.getWorkoutTypeColor(typeId)
}

const getMotivationalText = (): string => {
  const texts = [
    'Gjør deg klar!',
    'Fokus!',
    'Nesten der!',
    'Løft!'
  ]
  return texts[4 - countdownNumber.value] || 'Gjør deg klar!'
}

const getMotivationalSubtext = (): string => {
  const subtexts = [
    'Treningsøkten starter snart',
    'Konsentrer deg på formen',
    'Beregn deg for å løfte',
    'La oss gjøre dette!'
  ]
  return subtexts[4 - countdownNumber.value] || 'Treningsøkten starter snart'
}

const startCountdown = (sessionId: string) => {
  pendingSessionId.value = sessionId
  showCountdown.value = true
  countdownNumber.value = 3
  
  // Haptic feedback on mobile
  if ('vibrate' in navigator) {
    navigator.vibrate(100)
  }
  
  countdownInterval.value = window.setInterval(() => {
    countdownNumber.value--
    
    // Haptic feedback for each countdown number
    if ('vibrate' in navigator && countdownNumber.value > 0) {
      navigator.vibrate(50)
    }
    
    if (countdownNumber.value <= 0) {
      clearInterval(countdownInterval.value!)
      countdownInterval.value = null
      
      // Final haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100])
      }
      
      // Navigate to workout after a brief pause
      setTimeout(() => {
        showCountdown.value = false
        router.push(`/workout/${sessionId}`)
      }, 500)
    }
  }, 1000)
}

const cancelCountdown = async () => {
  if (countdownInterval.value) {
    clearInterval(countdownInterval.value)
    countdownInterval.value = null
  }
  showCountdown.value = false
  
  // Cancel the workout session in the backend
  if (pendingSessionId.value) {
    try {
      await workoutData.abandonWorkoutSession(pendingSessionId.value)
    } catch (error) {
      console.error("Error abandoning workout session:", error)
    }
    pendingSessionId.value = null
  }
  
  // Haptic feedback for cancellation
  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200])
  }
}

const startWorkout = async (templateId: string) => {
  // 1) Do ONLY the primary action in a guarded try/catch
  let session: { id: string } | null = null;
  try {
    session = await workoutData.startWorkoutSession(templateId);
  } catch (error) {
    console.error("Error starting workout:", error);
    alert("Kunne ikke starte økt. Prøv igjen.");
    return;
  }

  if (!session) {
    // explicit null/undefined -> primary action failed
    alert("Kunne ikke starte økt. Prøv igjen.");
    return;
  }

  // 2) Kick off a best-effort refresh, but don't block UX or show alerts if it fails
  workoutData
    .refreshUIData?.()
    .catch((e: unknown) => console.warn("refreshUIData failed (non-fatal):", e));

  // 3) Proceed with UX
  startCountdown(session.id);
};


const continueWorkout = (sessionId: string) => {
  router.push(`/workout/${sessionId}`)
}

const abandonWorkout = async (sessionId: string) => {
  if (
    !confirm(
      "Er du sikker på at du vil avbryte denne økten? Dette kan ikke angres og økten vil slettes permanent."
    )
  ) {
    return;
  }

  // Haptic feedback on mobile
  if ("vibrate" in navigator) navigator.vibrate(100);

  // 1) Do ONLY the primary action in a guarded try/catch
  try {
    await workoutData.abandonWorkoutSession(sessionId);
  } catch (error) {
    console.error("Error abandoning workout:", error);
    if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
    alert("Kunne ikke avbryte økt. Prøv igjen.");
    return;
  }

  // 2) Best-effort refresh that won't trigger alerts on failure
  workoutData
    .refreshUIData?.()
    .catch((e: unknown) => console.warn("refreshUIData failed (non-fatal):", e));

  // Success feedback
  if ("vibrate" in navigator) navigator.vibrate([50, 100, 50]);
};


// Helper methods for exercise grouping
const getExerciseGroups = (exercises: any[]) => {
  const groups: Record<string, any[]> = {}
  
  // Safety check for exercises
  if (!exercises || !Array.isArray(exercises)) {
    return groups
  }
  
  exercises.forEach(exercise => {
    // Find the exercise data using getExerciseById which can handle both main exercises and variants
    const exerciseData = workoutData.getExerciseById(exercise.exerciseId)
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

// Cleanup on component unmount
import { onUnmounted } from 'vue'

onUnmounted(() => {
  if (countdownInterval.value) {
    clearInterval(countdownInterval.value)
  }
})

</script> 