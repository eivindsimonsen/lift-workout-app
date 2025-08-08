<template>
  <div>
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-white mb-2">Dashboard</h1>
      <p class="text-dark-300">Oversikt over dine treningsøkter og aktiviteter</p>
    </div>

                                                   <!-- Active Workout Sessions -->
         <div v-if="activeSessions.length > 0" class="mt-8">
           <h2 class="text-xl font-semibold text-white mb-4">Aktiv Økt</h2>

          <div class="space-y-4">
            <div 
              v-for="session in activeSessions" 
              :key="session.id"
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
          </div>
                                   </div>

                                                                                                                                                               <!-- Workout Templates Section -->
                           <div class="mt-8">
                <div class="flex items-center justify-between mb-4">
                  <h2 class="text-xl font-semibold text-white">Treningsøkter</h2>
                  <router-link 
                    to="/template/create"
                    class="btn-primary inline-flex items-center gap-2"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Ny Økt
                  </router-link>
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
              </div>

                  <div v-if="filteredTemplates.length === 0" class="mt-4 text-center py-12">
         <div class="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4">
           <svg class="w-8 h-8 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
           </svg>
         </div>
         <p class="text-dark-300 mb-4">Ingen treningsøkter opprettet ennå</p>
         <router-link to="/template/create" class="btn-primary">
           Opprett din første økt
         </router-link>
       </div>

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
                       {{ (getMuscleGroupDisplayName && getMuscleGroupDisplayName(groupName)) || groupName }}
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
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useHybridData } from '@/composables/useHybridData'

const router = useRouter()
const workoutData = useHybridData()

// Computed
const filteredTemplates = computed(() => {
  return workoutData.templates.value
})

const activeSessions = computed(() => {
  return workoutData.sessions.value.filter(session => !session.isCompleted)
})







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
  const type = workoutData.getWorkoutType.value(typeId)
  return type?.name || typeId
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

// Helper methods for exercise grouping
const getExerciseGroups = (exercises: any[]) => {
  const groups: Record<string, any[]> = {}
  
  // Safety check for exercises
  if (!exercises || !Array.isArray(exercises)) {
    return groups
  }
  
  exercises.forEach(exercise => {
    // Find the exercise data to get muscle groups
    const exerciseData = workoutData.exercises.value?.find(e => e.id === exercise.exerciseId)
    if (exerciseData && exerciseData.muscleGroups) {
      // Use the first muscle group as the primary category
      const primaryGroup = exerciseData.muscleGroups[0]
      if (!groups[primaryGroup]) {
        groups[primaryGroup] = []
      }
      groups[primaryGroup].push(exercise)
    } else {
      // Fallback for exercises without muscle groups
      if (!groups['andre']) {
        groups['andre'] = []
      }
      groups['andre'].push(exercise)
    }
  })
  
  return groups
}

const getMuscleGroupDisplayName = (groupName: string): string => {
  const displayNames: Record<string, string> = {
    'bryst': 'Bryst',
    'rygg': 'Rygg',
    'skuldre': 'Skuldre',
    'biceps': 'Biceps',
    'triceps': 'Triceps',
    'quadriceps': 'Ben (Fram)',
    'hamstrings': 'Ben (Bak)',
    'glutes': 'Glutes',
    'calves': 'Legger',
    'core': 'Mage/Core',
    'andre': 'Andre'
  }
  
  return displayNames[groupName] || groupName
}








</script> 