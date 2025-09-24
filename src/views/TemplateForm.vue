<script setup lang="ts">
import { ref, computed, onMounted, type Ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useHybridData } from '@/composables/useHybridData'
import type { WorkoutTemplate, ExerciseTemplate } from '@/types/workout'
import ExerciseSelector from '@/components/ExerciseSelector.vue'
import ExerciseSearchPanel from '@/components/ExerciseSearchPanel.vue'
import Breadcrumbs from '@/components/Breadcrumbs.vue'
import * as muscleGroupsData from '@/data/muscle-groups.json'
import * as workoutTypeData from '@/data/workout-types.json'

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
    'push': ['Bryst', 'Skuldre', 'Triceps'],
    'pull': ['Rygg', 'Biceps'],
    'legs': ['Ben'],
    'upper': ['Bryst', 'Rygg', 'Skuldre', 'Biceps', 'Triceps'],
    'lower': ['Ben', 'Kjerne'],
    'full-body': ['Bryst', 'Rygg', 'Ben', 'Skuldre', 'Biceps', 'Triceps', 'Kjerne'],
    'bryst': ['Bryst'],
    'rygg': ['Rygg'],
    'ben': ['Ben'],
    'skuldre': ['Skuldre'],
    'biceps': ['Biceps'],
    'triceps': ['Triceps'],
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
            id: exercise.categoryId,
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
          id: exercise.categoryId,
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
  if (index === templateForm.value.exercises.length) {
    templateForm.value.exercises.push({
      exerciseId: '',
      name: '',
      sets: 0, // Will be configured during workout session
      reps: 0 // Will be configured during workout session
    })
  }
  activeExerciseIndex.value = index
  isMobileExercisePanelOpen.value = true
}

const closeMobilePicker = () => {
  isMobileExercisePanelOpen.value = false
}

const handleSelectExercise = (exerciseId: string) => {
  const exerciseData = workoutData.getExerciseById(exerciseId)
  if (!exerciseData) {
    console.error('Invalid exercise data for id:', exerciseId)
    return
  }

  if (activeExerciseIndex.value === null) {
    // Add a new exercise if none is active
    templateForm.value.exercises.push({
      exerciseId,
      name: exerciseData.name,
      sets: 0, // Will be configured during workout session
      reps: 0 // Will be configured during workout session
    })
  } else {
    const idx = activeExerciseIndex.value
    if (!templateForm.value.exercises[idx]) return
    templateForm.value.exercises[idx].exerciseId = exerciseId
    templateForm.value.exercises[idx].name = exerciseData.name
  }
  isMobileExercisePanelOpen.value = false
}

const getExerciseName = (id: string): string => {
  if (!id) return ''
  const exercise = workoutData.getExerciseById(id)
  if (!exercise?.name) return ''
  
  // Extract variant name from "Main Exercise - Variant" format
  // For example: "Squats - Front Squats" -> "Front Squats"
  const parts = exercise.name.split(' - ')
  if (parts.length > 1) {
    return parts[1] // Return the variant part
  }
  return exercise.name // Return original if no dash found
}

// Display helpers (UI only)
const getExerciseCategory = (id: string): string => {
  if (!id) return ''
  return workoutData.getExerciseById(id)?.category || ''
}
const getExerciseMuscleGroups = (id: string): string[] => {
  if (!id) return []
  return workoutData.getExerciseById(id)?.muscleGroups || []
}
const getMuscleGroupColor = (muscleGroup: string): string => {
  const group = (muscleGroupsData as any).muscleGroups.find((g: any) => g.name === muscleGroup)
  return group?.color || '#6b7280'
}
const getWorkoutTypeColor = (workoutTypeId: string): string => {
  const wt = (workoutTypeData as any).workoutTypes.find((w: any) => w.id === workoutTypeId)
  return wt?.color || '#6b7280'
}
const getExerciseAccentColor = (exerciseId: string): string => {
  const exercise = workoutData.getExerciseById(exerciseId)
  if (exercise?.muscleGroups && exercise.muscleGroups.length > 0) {
    return getMuscleGroupColor(exercise.muscleGroups[0])
  }
  if (exercise?.category) {
    return getMuscleGroupColor(exercise.category)
  }
  if (templateForm.value.workoutType) {
    return getWorkoutTypeColor(templateForm.value.workoutType)
  }
  return '#64748b'
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
      
      // Cache is already updated by data layer; no repaint from stale cache
      
      router.push('/')
    } catch (error) {
      console.error('Error deleting template:', error)
      alert('Kunne ikke slette økt. Prøv igjen.')
    }
  }
}

const isSaving = ref(false)

const saveTemplate = async () => {
  isSaving.value = true
  // Update exercise names based on selected exercise IDs
  const exercisesWithNames = templateForm.value.exercises.map(exercise => {
    const exerciseData = workoutData.getExerciseById(exercise.exerciseId)
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

    // Cache is already updated by data layer; no repaint from stale cache
    
    // Navigate back to templates list
    router.push('/')
  } catch (error) {
    console.error('Error saving template:', error)
    alert('Kunne ikke lagre økt. Prøv igjen.')
  } finally {
    isSaving.value = false
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
            exerciseId: exercise.exerciseId || matchingExercise?.categoryId || ''
          }
        })
      }
    }
  }
})
</script>

<template>
  <div>
    <!-- Breadcrumbs - moved above header -->
    <Breadcrumbs 
      :breadcrumbs="[
        { name: 'Økter', path: '/' },
        { name: isEditing ? 'Rediger Økt' : 'Opprett Ny Økt' }
      ]"
    />
    <!-- Header -->
    <div class="mb-4 mt-4">
      <div class="flex items-center gap-3">
        <router-link 
          to="/" 
          class="inline-flex items-center justify-center w-10 h-10 bg-[#3F302A] hover:bg-[#4A3A32] rounded-lg transition-colors"
        >
          <svg class="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <div class="card fancy-card">
        <div class="flex items-center gap-2 mb-4">
          <span class="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary-500/15 ring-1 ring-primary-500/30">
            <svg class="w-4 h-4 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v8" />
              <circle cx="12" cy="18" r="1.25" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <h2 class="text-xl font-semibold text-white">Grunnleggende Informasjon</h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-white mb-2">Navn på økt</label>
            <input
              v-model="templateForm.name"
              type="text"
              required
              class="input-field w-full focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/50 transition-shadow"
              placeholder="F.eks. Push Økt"
            />
            <p class="mt-1 text-xs text-dark-300">Gi økten et tydelig og motiverende navn.</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-white mb-2">Økt Type</label>
            <select 
              v-model="templateForm.workoutType"
              required
              class="input-field w-full focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/50 transition-shadow"
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
            <p class="mt-1 text-xs text-dark-300">Bruk type for å filtrere relevante øvelser.</p>
          </div>
        </div>
      </div>

      <!-- Exercises -->
      <div class="card fancy-card">
        <div class="mb-4 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary-500/15 ring-1 ring-primary-500/30">
              <svg class="w-4 h-4 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7h18M3 12h18M3 17h18" />
              </svg>
            </span>
            <h2 class="text-xl font-semibold text-white">Øvelser</h2>
          </div>
          <div v-if="templateForm.exercises.length" class="text-xs text-dark-300">
            {{ templateForm.exercises.length }} valgt
          </div>
        </div>
        
        <div class="space-y-4">
          <div 
            v-for="(exercise, index) in templateForm.exercises" 
            :key="index"
            class="exercise-item bg-dark-700/70 rounded-lg p-4 relative border border-dark-600/60 hover:border-primary-500/30 transition-colors"
            :style="{ '--accent': getExerciseAccentColor(exercise.exerciseId) }"
          >
            <div class="flex items-center mb-3 gap-2">
              <div class="inline-flex h-6 w-6 items-center justify-center rounded-md bg-dark-600/60 ring-1 ring-dark-500/40">
                <span class="text-xs text-dark-200">{{ index + 1 }}</span>
              </div>
              <h4 class="font-medium text-white leading-none">Øvelse {{ index + 1 }}</h4>
              <button 
                @click="removeExercise(index)"
                type="button"
                class="ml-auto text-dark-400 hover:text-red-400 transition-colors p-1 rounded-md hover:bg-red-500/10 flex items-center justify-end"
                title="Slett øvelse"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
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
                  class="input-field w-full flex items-center justify-between focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/50 transition-shadow"
                  @click="openMobilePicker(index)"
                >
                  <span>{{ getExerciseName(exercise.exerciseId) || 'Velg øvelse' }}</span>
                  <svg class="w-4 h-4 text-dark-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              <div v-if="exercise.exerciseId" class="mt-3 flex flex-wrap items-center gap-2">
                <span 
                  v-for="mg in getExerciseMuscleGroups(exercise.exerciseId)" 
                  :key="mg"
                  class="inline-flex px-2 py-1 rounded-md text-[11px] bg-primary-500/10 ring-1 ring-primary-500/30 text-primary-200"
                >
                  {{ mg }}
                </span>
              </div>
            </div>
          </div>
          
          <!-- Add Exercise Button at bottom -->
          <button 
            @click="openMobilePicker(templateForm.exercises.length)"
            type="button"
            class="w-full btn-secondary py-3 flex items-center justify-center hover:opacity-95 group"
          >
            <svg class="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Legg til øvelse
          </button>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3">
        <button 
          v-if="isEditing"
          @click="deleteTemplate"
          type="button"
          class="flex-1 bg-red-500/90 hover:bg-red-500 text-white px-4 py-2 rounded-lg transition-colors ring-1 ring-red-400/30"
        >
          <span class="inline-flex items-center justify-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Slett økt
          </span>
        </button>
        <button 
          type="submit"
          class="flex-1 btn-primary hover:opacity-95"
          :disabled="isSaving"
        >
          <span class="inline-flex items-center justify-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            {{ isEditing ? 'Oppdater Økt' : 'Opprett Økt' }}
          </span>
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

<style scoped>
.fancy-card {
  position: relative;
  overflow: hidden;
}
.fancy-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg, rgba(59,130,246,0.25), rgba(168,85,247,0.25));
  -webkit-mask: 
    linear-gradient(#000 0 0) content-box, 
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
          mask-composite: exclude;
  pointer-events: none;
}
.exercise-item {
  position: relative;
}
.exercise-item::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  border-radius: 2px;
  background: var(--accent, linear-gradient(180deg, rgba(59,130,246,0.6), rgba(168,85,247,0.6)));
  opacity: 0.9;
}
</style>