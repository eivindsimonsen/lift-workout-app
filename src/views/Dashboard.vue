<template>
  <div>
  <!-- Header with Filter and New Workout Button -->
         <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
           <div class="flex items-center gap-2 flex-wrap">
             <button 
               @click="selectedWorkoutType = ''"
               :class="[
                 'px-4 py-2 rounded-lg border transition-colors text-sm font-medium',
                 selectedWorkoutType === '' 
                   ? 'bg-primary-500 text-white border-primary-500' 
                   : 'bg-dark-600 text-dark-300 border-dark-500 hover:bg-dark-500'
               ]"
             >
               Alle typer
             </button>
                           <button 
                v-for="type in workoutTypes" 
                :key="type.id"
               @click="selectedWorkoutType = type.id"
               :class="[
                 'px-4 py-2 rounded-lg border transition-colors text-sm font-medium',
                 selectedWorkoutType === type.id 
                   ? 'bg-primary-500 text-white border-primary-500' 
                   : 'bg-dark-600 text-dark-300 border-dark-500 hover:bg-dark-500'
               ]"
             >
               {{ type.name }}
             </button>
           </div>
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
                  class="px-2 py-1 rounded-full text-xs font-medium"
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
              <h2 class="text-xl font-semibold text-white mb-4">Treningsøkter</h2>
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
                              <!-- Workout Type Badge -->
           <div class="mb-4">
             <span 
               class="px-3 py-1 rounded-full text-xs font-medium"
               :style="{ 
                 backgroundColor: getWorkoutTypeColor(template.workoutType) + '20',
                 color: getWorkoutTypeColor(template.workoutType)
               }"
             >
               {{ getWorkoutTypeName(template.workoutType) }}
             </span>
           </div>

           <!-- Template Info -->
           <div class="flex items-center justify-between mb-4">
             <h3 class="text-lg font-semibold text-white">{{ template.name }}</h3>
             <button 
               @click.stop="deleteTemplate(template.id)"
               class="text-red-400 hover:text-red-300 transition-colors p-1"
             >
               <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1 1v3M4 7h16" />
               </svg>
             </button>
           </div>

          <p class="text-sm text-dark-300 mb-4">
            {{ template.exercises.length }} øvelser
          </p>

                   <!-- Exercise Preview -->
          <div class="space-y-2 mb-6 flex-grow">
            <div 
              v-for="exercise in template.exercises.slice(0, 3)" 
              :key="exercise.exerciseId"
              class="flex items-center justify-between text-sm"
            >
              <span class="text-dark-200">{{ exercise.name }}</span>
              <span class="text-dark-400">{{ exercise.sets }}x{{ exercise.reps }}</span>
            </div>
            
            <!-- Expandable Section -->
            <div v-if="template.exercises.length > 3">
              <div v-if="!expandedTemplates.has(template.id)" class="text-xs text-dark-400">
                +{{ template.exercises.length - 3 }} flere øvelser
              </div>
              
              <div v-else class="space-y-2">
                <div 
                  v-for="exercise in template.exercises.slice(3)" 
                  :key="exercise.exerciseId"
                  class="flex items-center justify-between text-sm"
                >
                  <span class="text-dark-200">{{ exercise.name }}</span>
                  <span class="text-dark-400">{{ exercise.sets }}x{{ exercise.reps }}</span>
                </div>
              </div>
              
              <button 
                @click="toggleExpanded(template.id)"
                class="text-xs text-primary-500 hover:text-primary-400 mt-2 transition-colors"
              >
                {{ expandedTemplates.has(template.id) ? 'Vis mindre' : 'Vis alle øvelser' }}
              </button>
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
               class="flex-1 btn-primary text-sm py-2"
             >
               Start Økt
             </button>
           </div>
               </div>
     </div>

      

     <!-- Recent Completed Workouts -->
    <div class="mt-8 card">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-semibold text-white">Siste Fullførte Økter</h2>
        <router-link 
          to="/history" 
          class="text-primary-500 hover:text-primary-400 text-sm font-medium"
        >
          Se alle
        </router-link>
      </div>

      <div v-if="recentSessions.length === 0" class="text-center py-8">
        <p class="text-dark-300">Ingen fullførte økter ennå</p>
      </div>

      <div v-else class="space-y-4">
        <div 
          v-for="session in recentSessions" 
          :key="session.id"
          @click="viewSession(session.id)"
          class="flex items-center justify-between p-4 bg-dark-700 rounded-lg hover:bg-dark-600 cursor-pointer transition-colors"
        >
          <div class="flex-1">
            <h3 class="font-medium text-white">{{ session.templateName }}</h3>
            <p class="text-sm text-dark-300">
              {{ formatDate(session.date) }} • {{ session.duration }} min
            </p>
            <p class="text-xs text-dark-400">
              {{ session.exercises.length }} øvelser • {{ formatNumber(session.totalVolume || 0) }} kg
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-primary-500 font-medium">
              {{ formatNumber(session.totalVolume || 0) }} kg
            </span>
            <span 
              class="px-2 py-1 rounded-full text-xs font-medium"
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

    
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useHybridData } from '@/composables/useHybridData'

const router = useRouter()
const workoutData = useHybridData()

// State
const selectedWorkoutType = ref('')
const expandedTemplates = ref<Set<string>>(new Set())

// Computed
const filteredTemplates = computed(() => {
  if (!selectedWorkoutType.value) {
    return workoutData.templates.value
  }
  return workoutData.templates.value.filter(t => t.workoutType === selectedWorkoutType.value)
})

const activeSessions = computed(() => {
  return workoutData.sessions.value.filter(session => !session.isCompleted)
})

const recentSessions = computed(() => {
  return workoutData.recentSessions.value
})

const workoutTypes = computed(() => {
  console.log('🔍 Dashboard workoutTypes:', workoutData.workoutTypes.value)
  return workoutData.workoutTypes.value || []
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



const deleteTemplate = (id: string) => {
  if (confirm('Er du sikker på at du vil slette denne økten?')) {
    workoutData.deleteTemplate(id)
  }
}

const startWorkout = async (templateId: string) => {
  try {
    const session = await workoutData.startWorkoutSession(templateId)
    if (session) {
      router.push(`/workout/${session.id}`)
    } else {
      console.error('❌ Failed to start workout session')
      alert('Kunne ikke starte økt. Prøv igjen.')
    }
  } catch (error) {
    console.error('Failed to start workout:', error)
    alert('Kunne ikke starte økt. Prøv igjen.')
  }
}

const viewSession = (sessionId: string) => {
  router.push(`/session/${sessionId}`)
}

const continueWorkout = (sessionId: string) => {
  router.push(`/workout/${sessionId}`)
}

const toggleExpanded = (templateId: string) => {
  if (expandedTemplates.value.has(templateId)) {
    expandedTemplates.value.delete(templateId)
  } else {
    expandedTemplates.value.add(templateId)
  }
}


</script> 