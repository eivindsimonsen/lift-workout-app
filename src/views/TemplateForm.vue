<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold text-white mb-2">{{ isEditing ? 'Rediger Økt' : 'Opprett Ny Økt' }}</h1>
        <p class="text-dark-300">{{ isEditing ? 'Endre treningsøkten din' : 'Lag en ny treningsøkt' }}</p>
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
            class="bg-dark-700 rounded-lg p-4"
          >
            <div class="flex items-center justify-between mb-3">
              <h4 class="font-medium text-white">Øvelse {{ index + 1 }}</h4>
              <button 
                @click="removeExercise(index)"
                type="button"
                class="text-dark-400 hover:text-red-400 transition-colors p-1"
                title="Slett øvelse"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useHybridData } from '@/composables/useHybridData'
import type { WorkoutTemplate, ExerciseTemplate } from '@/types/workout'

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
  if (!templateForm.value.workoutType) {
    return workoutData.exercises.value
  }
  return workoutData.getExercisesByWorkoutType.value(templateForm.value.workoutType)
})

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