<template>
  <div>
                   <!-- Header with Filter -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-center gap-4">
          <div>
            <h1 class="text-3xl font-bold text-white mb-2">Treningsøkter</h1>
            <p class="text-dark-300">Administrer og start dine treningsøkter</p>
          </div>
          <select 
            v-model="selectedWorkoutType" 
            class="input-field text-sm"
          >
            <option value="">Alle typer</option>
            <option 
              v-for="type in workoutStore.workoutTypes" 
              :key="type.id" 
              :value="type.id"
            >
              {{ type.name }}
            </option>
          </select>
        </div>
      </div>

         <div v-if="filteredTemplates.length === 0" class="mt-8 text-center py-12">
      <div class="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <p class="text-dark-300 mb-4">Ingen treningsøkter opprettet ennå</p>
      <button @click="showCreateModal = true" class="btn-primary">
        Opprett din første økt
      </button>
    </div>

         <div v-else class="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     <div 
          v-for="template in filteredTemplates" 
          :key="template.id"
          class="bg-dark-700 rounded-lg p-6 border border-dark-600 hover:border-primary-500/50 transition-colors flex flex-col h-full"
        >
         <!-- Workout Type Badge -->
         <div class="flex items-center justify-between mb-4">
           <span 
             class="px-3 py-1 rounded-full text-xs font-medium"
             :style="{ 
               backgroundColor: getWorkoutTypeColor(template.workoutType) + '20',
               color: getWorkoutTypeColor(template.workoutType)
             }"
           >
             {{ getWorkoutTypeName(template.workoutType) }}
           </span>
                       <div class="flex items-center gap-2">
              <button 
                @click.stop="deleteTemplate(template.id)"
                class="text-dark-300 hover:text-red-400 transition-colors"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
         </div>

         <!-- Template Info -->
         <h3 class="text-lg font-semibold text-white mb-2">{{ template.name }}</h3>
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
            <button 
              @click.stop="startWorkout(template.id)"
              class="flex-1 btn-primary text-sm py-2"
            >
              Start Økt
            </button>
            <button 
              @click.stop="editTemplate(template)"
              class="flex-1 bg-dark-600 hover:bg-dark-500 text-white rounded-lg transition-colors text-sm py-2"
            >
              Rediger
            </button>
          </div>
               </div>
     </div>

     <!-- Separator with New Workout Button -->
     <div class="mt-8 flex items-center gap-4">
       <hr class="flex-1 border-dark-600">
       <button 
         @click="showCreateModal = true"
         class="btn-primary inline-flex items-center gap-2"
       >
         <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
         </svg>
         Ny Økt
       </button>
       <hr class="flex-1 border-dark-600">
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

      <div v-if="workoutStore.recentSessions.length === 0" class="text-center py-8">
        <p class="text-dark-300">Ingen fullførte økter ennå</p>
      </div>

      <div v-else class="space-y-4">
        <div 
          v-for="session in workoutStore.recentSessions" 
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

    <!-- Create/Edit Template Modal -->
    <div v-if="showCreateModal || editingTemplate" class="fixed bg-black/50 flex items-center justify-center p-4" style="top: 0; left: 0; right: 0; bottom: 0; width: 100vw; height: 100vh; z-index: 9999;">
      <div class="bg-dark-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6">
                                <h3 class="text-xl font-semibold text-white mb-4">
             {{ editingTemplate ? 'Rediger Økt' : 'Opprett Ny Økt' }}
           </h3>
           
                       <!-- Create/Edit Template Mode -->
            <form @submit.prevent="saveTemplate" class="space-y-6">
            <!-- Basic Info -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-white mb-2">Navn på økt</label>
                <input
                  v-model="templateForm.name"
                  type="text"
                  required
                  class="input-field w-full"
                  placeholder="F.eks. Push Økt"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-white mb-2">Økt Type</label>
                <select 
                  v-model="templateForm.workoutType"
                  required
                  class="input-field w-full"
                >
                  <option value="">Velg type</option>
                  <option 
                    v-for="type in workoutStore.workoutTypes" 
                    :key="type.id" 
                    :value="type.id"
                  >
                    {{ type.name }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Exercises -->
            <div>
              <label class="block text-sm font-medium text-white mb-2">Øvelser</label>
              <div class="space-y-4">
                <div 
                  v-for="(exercise, index) in templateForm.exercises" 
                  :key="index"
                  class="bg-dark-700 rounded-lg p-4"
                >
                  <div class="flex items-center justify-between mb-3">
                    <h4 class="font-medium text-white">Øvelse {{ index + 1 }}</h4>
                    <button 
                      @click="removeExercise(index)"
                      type="button"
                      class="text-red-400 hover:text-red-300"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-xs text-dark-300 mb-1">Øvelse</label>
                      <select 
                        v-model="exercise.exerciseId"
                        required
                        class="input-field w-full text-sm"
                      >
                        <option value="">Velg øvelse</option>
                        <option 
                          v-for="ex in availableExercises" 
                          :key="ex.id" 
                          :value="ex.id"
                        >
                          {{ ex.name }}
                        </option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-xs text-dark-300 mb-1">Antall sett</label>
                      <input
                        v-model.number="exercise.sets"
                        type="number"
                        min="1"
                        required
                        class="input-field w-full text-sm"
                      />
                    </div>
                    <div>
                      <label class="block text-xs text-dark-300 mb-1">Reps</label>
                      <input
                        v-model.number="exercise.reps"
                        type="number"
                        min="1"
                        required
                        class="input-field w-full text-sm"
                      />
                    </div>
                    <div>
                      <label class="block text-xs text-dark-300 mb-1">Vekt (kg)</label>
                      <input
                        v-model.number="exercise.weight"
                        type="number"
                        min="0"
                        class="input-field w-full text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <button 
                @click="addExercise"
                type="button"
                class="mt-4 btn-secondary text-sm"
              >
                + Legg til øvelse
              </button>
            </div>

            <!-- Notes -->
            <div>
              <label class="block text-sm font-medium text-white mb-2">Notater</label>
              <textarea
                v-model="templateForm.notes"
                rows="3"
                class="input-field w-full"
                placeholder="Valgfrie notater om økten..."
              ></textarea>
            </div>

            <!-- Actions -->
            <div class="flex gap-3 justify-end">
              <button 
                @click="closeModal"
                type="button"
                class="btn-secondary"
              >
                Avbryt
              </button>
              <button 
                type="submit"
                class="btn-primary"
              >
                {{ editingTemplate ? 'Oppdater' : 'Opprett' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkoutStore } from '@/stores/workoutStore'
import type { WorkoutTemplate, ExerciseTemplate } from '@/types/workout'

const router = useRouter()
const workoutStore = useWorkoutStore()

// State
const showCreateModal = ref(false)
const editingTemplate = ref<WorkoutTemplate | null>(null)
const viewingTemplate = ref<WorkoutTemplate | null>(null)
const selectedWorkoutType = ref('')
const expandedTemplates = ref<Set<string>>(new Set())

const templateForm = ref({
  name: '',
  workoutType: '',
  exercises: [] as ExerciseTemplate[],
  notes: ''
})

// Computed
const filteredTemplates = computed(() => {
  if (!selectedWorkoutType.value) {
    return workoutStore.templates
  }
  return workoutStore.templates.filter(t => t.workoutType === selectedWorkoutType.value)
})

const availableExercises = computed(() => {
  if (!templateForm.value.workoutType) {
    return workoutStore.exercises
  }
  return workoutStore.getExercisesByWorkoutType(templateForm.value.workoutType)
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
  const type = workoutStore.getWorkoutType(typeId)
  return type?.name || typeId
}

const getWorkoutTypeColor = (typeId: string): string => {
  const type = workoutStore.getWorkoutType(typeId)
  return type?.color || '#f97316'
}

const resetForm = () => {
  templateForm.value = {
    name: '',
    workoutType: '',
    exercises: [],
    notes: ''
  }
}

const addExercise = () => {
  templateForm.value.exercises.push({
    exerciseId: '',
    name: '',
    sets: 3,
    reps: 8,
    weight: undefined,
    restTime: undefined,
    notes: ''
  })
}

const removeExercise = (index: number) => {
  templateForm.value.exercises.splice(index, 1)
}

const editTemplate = (template: WorkoutTemplate) => {
  editingTemplate.value = template
  templateForm.value = {
    name: template.name,
    workoutType: template.workoutType,
    exercises: template.exercises.map(exercise => {
      // Find the correct exerciseId based on the exercise name
      const matchingExercise = workoutStore.exercises.find(e => e.name === exercise.name)
      return {
        ...exercise,
        exerciseId: exercise.exerciseId || matchingExercise?.id || ''
      }
    }),
    notes: template.notes || ''
  }
  showCreateModal.value = true
}



const saveTemplate = () => {
  // Update exercise names based on selected exercise IDs
  const exercisesWithNames = templateForm.value.exercises.map(exercise => {
    const exerciseData = workoutStore.exercises.find(e => e.id === exercise.exerciseId)
    return {
      ...exercise,
      name: exerciseData?.name || exercise.name
    }
  })

  const templateData: WorkoutTemplate = {
    id: editingTemplate.value?.id || `template-${Date.now()}`,
    name: templateForm.value.name,
    workoutType: templateForm.value.workoutType,
    exercises: exercisesWithNames,
    notes: templateForm.value.notes
  }

  if (editingTemplate.value) {
    workoutStore.updateTemplate(templateData.id, {
      name: templateData.name,
      workoutType: templateData.workoutType,
      exercises: templateData.exercises,
      notes: templateData.notes
    })
  } else {
    workoutStore.addTemplate(templateData)
  }

  closeModal()
}

const deleteTemplate = (id: string) => {
  if (confirm('Er du sikker på at du vil slette denne økten?')) {
    workoutStore.deleteTemplate(id)
  }
}

const startWorkout = (templateId: string) => {
  try {
    const session = workoutStore.startWorkoutSession(templateId)
    router.push(`/workout/${session.id}`)
  } catch (error) {
    console.error('Failed to start workout:', error)
  }
}

const viewSession = (sessionId: string) => {
  router.push(`/history?session=${sessionId}`)
}

const toggleExpanded = (templateId: string) => {
  if (expandedTemplates.value.has(templateId)) {
    expandedTemplates.value.delete(templateId)
  } else {
    expandedTemplates.value.add(templateId)
  }
}

const closeModal = () => {
  showCreateModal.value = false
  editingTemplate.value = null
  resetForm()
}

// Watch for workout type changes to update available exercises
watch(() => templateForm.value.workoutType, () => {
  // Only clear exercise selections when creating a new template (not editing)
  if (!editingTemplate.value) {
    templateForm.value.exercises.forEach(exercise => {
      exercise.exerciseId = ''
      exercise.name = ''
    })
  }
})
</script> 