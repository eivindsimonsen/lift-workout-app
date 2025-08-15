<template>
  <div>
    <!-- Breadcrumbs - moved above header -->
    <Breadcrumbs 
      :breadcrumbs="[
        { name: 'Hjem', path: '/' },
        { name: isEditing ? 'Rediger Økt' : 'Opprett Ny Økt' }
      ]"
    />

    <!-- Header -->
    <div class="flex items-center justify-between mb-4 mt-4">
      <div class="flex items-center gap-3">
        <router-link 
          to="/" 
          class="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center hover:bg-primary-500/30 transition-colors"
        >
          <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </router-link>
        <h1 class="text-2xl font-bold text-white">{{ isEditing ? 'Rediger Økt' : 'Opprett Ny Økt' }}</h1>
      </div>
    </div>

    <div v-if="isEditing && !template" class="text-center py-12">
      <p class="text-dark-300">Økt ikke funnet</p>
      <router-link to="/" class="btn-primary mt-4">Tilbake til Økter</router-link>
    </div>

    <!-- Loading State for Template Form -->
    <div v-if="isLoading" class="space-y-6 animate-pulse">
      <!-- Basic Info Skeleton -->
      <div class="card">
        <div class="h-6 bg-dark-600 rounded w-64 mb-4"></div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-for="i in 2" :key="i" class="space-y-2">
            <div class="h-4 bg-dark-600 rounded w-24"></div>
            <div class="h-10 bg-dark-600 rounded w-full"></div>
          </div>
        </div>
      </div>

      <!-- Exercises Skeleton -->
      <div class="card">
        <div class="h-6 bg-dark-600 rounded w-20 mb-4"></div>
        <div class="space-y-4">
          <div v-for="i in 3" :key="i" class="bg-dark-700 rounded-lg p-4 space-y-3">
            <div class="h-5 bg-dark-600 rounded w-24"></div>
            <div class="space-y-2">
              <div class="h-4 bg-dark-600 rounded w-16"></div>
              <div class="h-10 bg-dark-600 rounded w-full"></div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div v-for="j in 3" :key="j" class="space-y-2">
                <div class="h-4 bg-dark-600 rounded w-16"></div>
                <div class="h-10 bg-dark-600 rounded w-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Save Button Skeleton -->
      <div class="flex justify-end">
        <div class="h-10 bg-dark-600 rounded w-24"></div>
      </div>
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
      :workout-type="templateForm.workoutType"
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
import Breadcrumbs from '@/components/Breadcrumbs.vue'

const router = useRouter()
const route = useRoute()
const workoutData = useHybridData()

// Loading state
const isLoading = computed(() => workoutData.isLoading.value)

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

// Function to get default muscle groups based on workout type
const getDefaultMuscleGroups = (workoutType: string): string[] => {
  const muscleGroupMap: Record<string, string[]> = {
    'push': ['Bryst', 'Skuldre', 'Armer'],
    'pull': ['Rygg', 'Armer'],
    'legs': ['Ben'],
    'upper': ['Bryst', 'Rygg', 'Skuldre', 'Armer'],
    'lower': ['Ben', 'Kjerne'],
    'full-body': ['Bryst', 'Rygg', 'Ben', 'Skuldre', 'Armer', 'Kjerne'],
    'bryst': ['Bryst'],
    'rygg': ['Rygg'],
    'ben': ['Ben'],
    'skuldre': ['Skuldre'],
    'armer': ['Armer'],
    'kjerne': ['Kjerne']
  }
  
  return muscleGroupMap[workoutType.toLowerCase()] || []
}

const availableExercises = computed(() => {
  const exercises: Array<{id: string, name: string, category: string, muscleGroups?: string[]}> = []
  
  // If workout type is selected, only include exercises that match
  if (templateForm.value.workoutType) {
    const relevantMuscleGroups = getDefaultMuscleGroups(templateForm.value.workoutType)
    
    workoutData.exercises.value.forEach(exercise => {
      // Check if this exercise matches the workout type
      const hasMatchingMuscleGroup = exercise.muscleGroups && 
        exercise.muscleGroups.some(group => relevantMuscleGroups.includes(group))
      
      if (hasMatchingMuscleGroup) {
        if (exercise.variants && exercise.variants.length > 0) {
          // Add each variant as a separate exercise
          exercise.variants.forEach(variant => {
            exercises.push({
              id: variant.id,
              name: `${exercise.name} - ${variant.name}`,
              category: exercise.category,
              muscleGroups: exercise.muscleGroups
            })
          })
        } else {
          // Exercises without variants
          exercises.push({
            id: exercise.id,
            name: exercise.name,
            category: exercise.category,
            muscleGroups: exercise.muscleGroups
          })
        }
      }
    })
  } else {
    // If no workout type selected, include all exercises
    workoutData.exercises.value.forEach(exercise => {
      if (exercise.variants && exercise.variants.length > 0) {
        // Add each variant as a separate exercise
        exercise.variants.forEach(variant => {
          exercises.push({
            id: variant.id,
            name: `${exercise.name} - ${variant.name}`,
            category: exercise.category,
            muscleGroups: exercise.muscleGroups
          })
        })
      } else {
        // Exercises without variants
        exercises.push({
          id: exercise.id,
          name: exercise.name,
          category: exercise.category,
          muscleGroups: exercise.muscleGroups
        })
      }
    })
  }
  
  return exercises
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
  const exercise = workoutData.getExerciseById.value(id)
  if (!exercise?.name) return ''
  
  // Extract variant name from "Main Exercise - Variant" format
  // For example: "Squats - Front Squats" -> "Front Squats"
  const parts = exercise.name.split(' - ')
  if (parts.length > 1) {
    return parts[1] // Return the variant part
  }
  return exercise.name // Return original if no dash found
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

const deleteTemplate = async () => {
  if (template.value && confirm('Er du sikker på at du vil slette denne økten?')) {
    try {
      await workoutData.deleteTemplate(template.value.id)
      
      // Force refresh the UI data to ensure changes are visible immediately
      await workoutData.refreshUIData()
      
      router.push('/')
    } catch (error) {
      console.error('Error deleting template:', error)
      alert('Kunne ikke slette økt. Prøv igjen.')
    }
  }
}

const saveTemplate = async () => {
  // Update exercise names based on selected exercise IDs
  const exercisesWithNames = templateForm.value.exercises.map(exercise => {
    const exerciseData = workoutData.getExerciseById.value(exercise.exerciseId)
    return {
      ...exercise,
      name: exerciseData?.name || exercise.name
    }
  })

  try {
    if (isEditing.value && template.value) {
      // Update existing template
      await workoutData.updateTemplate(template.value.id, {
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
      await workoutData.addTemplate(templateData)
    }

    // Force refresh the UI data to ensure changes are visible immediately
    await workoutData.refreshUIData()
    
    // Navigate back to templates list
    router.push('/')
  } catch (error) {
    console.error('Error saving template:', error)
    alert('Kunne ikke lagre økt. Prøv igjen.')
  }
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