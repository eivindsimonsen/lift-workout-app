<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
          <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-white">{{ isEditing ? 'Rediger Økt' : 'Opprett Ny Økt' }}</h1>
      </div>
      <router-link 
        to="/" 
        class="btn-secondary"
      >
        Avbryt
      </router-link>
    </div>

    <div v-if="isEditing && !template" class="text-center py-12">
      <p class="text-dark-300">Økt ikke funnet</p>
      <router-link to="/" class="btn-primary mt-4">Tilbake til Økter</router-link>
    </div>

    <!-- Template Form -->
    <form v-else @submit.prevent="saveTemplate" class="space-y-6">
      <!-- Basic Info -->
      <div class="card">
        <h2 class="text-xl font-semibold text-white mb-4">Grunnleggende Informasjon</h2>
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
                v-for="type in workoutTypes" 
                :key="type.id" 
                :value="type.id"
              >
                {{ type.name }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Exercises -->
      <div class="card">
        <div class="mb-4">
          <h2 class="text-xl font-semibold text-white">Øvelser</h2>
        </div>
        
        <div class="space-y-4">
          <div 
            v-for="(exercise, index) in templateForm.exercises" 
            :key="index"
            class="bg-dark-700 rounded-lg p-4 relative"
          >
            <div class="flex items-center mb-3 pr-6">
              <h4 class="font-medium text-white leading-none">Øvelse {{ index + 1 }}</h4>
            </div>
            <button 
              @click="removeExercise(index)"
              type="button"
              class="absolute top-4 right-4 text-dark-400 hover:text-red-400 transition-colors p-1"
              title="Slett øvelse"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div>
              <label class="block text-xs text-dark-300 mb-2">Øvelse</label>
              <!-- Desktop selector -->
              <div class="hidden md:block">
                <ExerciseSelector 
                  :exercises="availableExercises"
                  v-model="exercise.exerciseId"
                />
              </div>
              <!-- Mobile slide-over trigger -->
              <div class="md:hidden">
                <button
                  type="button"
                  class="input-field w-full flex items-center justify-between"
                  @click="openMobilePicker(index)"
                >
                  <span>{{ getExerciseName(exercise.exerciseId) || 'Velg øvelse' }}</span>
                  <svg class="w-4 h-4 text-dark-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          <!-- Add Exercise Button at bottom -->
          <button 
            @click="addExercise"
            type="button"
            class="w-full btn-secondary py-3 flex items-center justify-center"
          >
            + Legg til øvelse
          </button>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3">
        <button 
          v-if="isEditing"
          @click="deleteTemplate"
          type="button"
          class="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Slett økt
        </button>
        <button 
          type="submit"
          class="flex-1 btn-primary"
        >
          {{ isEditing ? 'Oppdater Økt' : 'Opprett Økt' }}
        </button>
      </div>
    </form>
    
    <!-- Mobile Exercise Picker -->
    <ExerciseSearchPanel
      :is-open="isMobileExercisePanelOpen"
      :exercises="availableExercises"
      title="Velg øvelse"
      @close="closeMobilePicker"
      @select="handleSelectExercise"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, type Ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useHybridData } from '@/composables/useHybridData'
import type { WorkoutTemplate, ExerciseTemplate } from '@/types/workout'
import ExerciseSelector from '@/components/ExerciseSelector.vue'
import ExerciseSearchPanel from '@/components/ExerciseSearchPanel.vue'

const router = useRouter()
const route = useRoute()
const workoutData = useHybridData()

const template = ref<WorkoutTemplate | null>(null)
const templateForm = ref({
  name: '',
  workoutType: '',
  exercises: [] as ExerciseTemplate[]
})

// Computed
const isEditing = computed(() => {
  return route.name === 'EditTemplate'
})

const workoutTypes = computed(() => {
  return workoutData.workoutTypes.value
})

const availableExercises = computed(() => {
  return workoutData.exercises.value
})

const isMobileExercisePanelOpen: Ref<boolean> = ref(false)
const activeExerciseIndex: Ref<number | null> = ref(null)

const openMobilePicker = (index: number) => {
  activeExerciseIndex.value = index
  isMobileExercisePanelOpen.value = true
}

const closeMobilePicker = () => {
  isMobileExercisePanelOpen.value = false
}

const handleSelectExercise = (exerciseId: string) => {
  if (activeExerciseIndex.value === null) return
  const idx = activeExerciseIndex.value
  if (!templateForm.value.exercises[idx]) return
  templateForm.value.exercises[idx].exerciseId = exerciseId
  isMobileExercisePanelOpen.value = false
}

const getExerciseName = (id: string): string => {
  if (!id) return ''
  const ex = workoutData.exercises.value.find(e => e.id === id)
  return ex?.name || ''
}

// Methods
const addExercise = () => {
  templateForm.value.exercises.push({
    exerciseId: '',
    name: '',
    sets: 0, // Will be configured during workout session
    reps: 0 // Will be configured during workout session
  })
}

const removeExercise = (index: number) => {
  templateForm.value.exercises.splice(index, 1)
}

const deleteTemplate = () => {
  if (template.value && confirm('Er du sikker på at du vil slette denne økten?')) {
    workoutData.deleteTemplate(template.value.id)
    router.push('/')
  }
}

const saveTemplate = () => {
  // Update exercise names based on selected exercise IDs
  const exercisesWithNames = templateForm.value.exercises.map(exercise => {
    const exerciseData = workoutData.exercises.value.find(e => e.id === exercise.exerciseId)
    return {
      ...exercise,
      name: exerciseData?.name || exercise.name
    }
  })

  if (isEditing.value && template.value) {
    // Update existing template
    workoutData.updateTemplate(template.value.id, {
      name: templateForm.value.name,
      workoutType: templateForm.value.workoutType,
      exercises: exercisesWithNames
    })
  } else {
    // Create new template
    const templateData = {
      id: `template-${Date.now()}`,
      name: templateForm.value.name,
      workoutType: templateForm.value.workoutType,
      exercises: exercisesWithNames
    }
    workoutData.addTemplate(templateData)
  }

  router.push('/')
}

// Lifecycle
onMounted(() => {
  if (isEditing.value) {
    const templateId = route.params.id as string
    const foundTemplate = workoutData.templates.value.find(t => t.id === templateId)
    
    if (foundTemplate) {
      template.value = foundTemplate
      templateForm.value = {
        name: foundTemplate.name,
        workoutType: foundTemplate.workoutType,
        exercises: foundTemplate.exercises.map(exercise => {
          // Find the correct exerciseId based on the exercise name
          const matchingExercise = workoutData.exercises.value.find(e => e.name === exercise.name)
          return {
            ...exercise,
            exerciseId: exercise.exerciseId || matchingExercise?.id || ''
          }
        })
      }
    }
  }
})
</script> 