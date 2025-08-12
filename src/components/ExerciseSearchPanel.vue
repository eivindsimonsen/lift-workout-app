<template>
  <SlideOver :is-open="isOpen" :title="title" @close="onClose">
    <div class="space-y-3">
      <!-- Search input -->
      <div class="relative">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref="searchInput"
          v-model="query"
          type="text"
          class="input-field w-full pl-10 text-base"
          placeholder="Søk etter øvelse..."
          @keydown.escape.prevent="onClose"
        />
      </div>

      <!-- Muscle Group Filters -->
      <div class="space-y-2">
        <h4 class="text-sm font-medium text-white">Filtrer etter muskelgruppe:</h4>
        <div v-if="props.workoutType && getDefaultMuscleGroups(props.workoutType).length > 0" class="mb-2">
          <p class="text-xs text-primary-400">
            Automatisk valgt basert på {{ workoutTypes.find((t: any) => t.id === props.workoutType)?.name || props.workoutType }}:
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <label
            v-for="muscleGroup in availableMuscleGroups"
            :key="muscleGroup"
            class="flex items-center gap-2 cursor-pointer"
          >
            <input
              v-model="selectedMuscleGroups"
              type="checkbox"
              :value="muscleGroup"
              class="w-4 h-4 text-dark-600 bg-dark-700 border-dark-600 rounded focus:ring-dark-500 focus:ring-2"
            />
            <span class="text-sm text-white">{{ muscleGroup }}</span>
            
          </label>
        </div>
      </div>

      <!-- Results -->
      <div v-if="filteredResults.length === 0" class="text-sm text-dark-300 py-4">Ingen treff</div>
      <div v-else class="space-y-1">
        <button
          v-for="ex in filteredResults"
          :key="ex.id"
          type="button"
          class="w-full text-left px-3 py-3 rounded-md hover:bg-dark-700 text-sm z-0 relative flex items-center justify-between group"
          @click="selectExercise(ex)"
        >
          <span class="text-white">{{ ex.name }}</span>
          <div class="flex gap-1 flex-wrap justify-end">
            <span
              v-if="getPrimaryMuscleGroup(ex)"
              class="px-2 py-1 text-xs font-medium rounded-full bg-dark-600"
              :style="{ color: getMuscleGroupColor(getPrimaryMuscleGroup(ex) || '') }"
            >
              {{ getPrimaryMuscleGroup(ex) }}
            </span>
          </div>
        </button>
      </div>
    </div>
  </SlideOver>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import SlideOver from '@/components/SlideOver.vue'
import * as workoutTypesData from '@/data/workout-types.json'

interface ExerciseItem {
  id: string
  name: string
  category?: string
  workoutTypes?: string[]
  muscleGroups?: string[]
}

const props = defineProps<{
  isOpen: boolean
  exercises: ExerciseItem[]
  title?: string
  workoutType?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', exerciseId: string): void
}>()

const title = computed(() => props.title || 'Velg øvelse')
const onClose = () => emit('close')

// search and filters
const query = ref('')
const selectedMuscleGroups = ref<string[]>([])
const searchInput = ref<HTMLInputElement>()

// Reset when opening
watch(() => props.isOpen, async (open) => {
  if (open) {
    query.value = ''
    // Auto-select muscle groups based on workout type
    if (props.workoutType) {
      selectedMuscleGroups.value = getDefaultMuscleGroups(props.workoutType)
    } else {
      selectedMuscleGroups.value = []
    }
    
    // Focus the search input after the slide-over is fully rendered
    await nextTick()
    if (searchInput.value) {
      searchInput.value.focus()
    }
  }
})

// Get all available muscle groups from exercises (only main categories)
const availableMuscleGroups = computed(() => {
  const mainCategories = ['Bryst', 'Rygg', 'Ben', 'Skuldre', 'Armer', 'Kjerne']
  const groups = new Set<string>()
  
  props.exercises.forEach(ex => {
    // Add category if it exists and is a main category
    if (ex.category && mainCategories.includes(ex.category)) {
      groups.add(ex.category)
    }
    
    // Add muscle groups if they exist and are main categories
    if (ex.muscleGroups) {
      ex.muscleGroups.forEach(group => {
        if (mainCategories.includes(group)) {
          groups.add(group)
        }
      })
    }
  })
  
  // Return in the specific order we want
  return mainCategories.filter(category => groups.has(category))
})

const filteredResults = computed(() => {
  let exercises = props.exercises
  
  // Remove duplicates based on name (keep the first occurrence)
  const uniqueExercises = exercises.filter((exercise, index, self) => 
    index === self.findIndex(e => e.name === exercise.name)
  )
  
  // Always include "Annet øvelse" regardless of filters
  const customExercise = uniqueExercises.find(ex => ex.id === 'custom-exercise')
  
  // Filter by selected muscle groups (using both category and muscleGroups fields)
  if (selectedMuscleGroups.value.length > 0) {
    exercises = uniqueExercises.filter(ex => {
      // Always include custom exercise
      if (ex.id === 'custom-exercise') return true
      
      // Check if exercise matches any selected muscle group
      const hasMatchingCategory = ex.category && selectedMuscleGroups.value.includes(ex.category)
      const hasMatchingMuscleGroup = ex.muscleGroups && ex.muscleGroups.some(group => 
        selectedMuscleGroups.value.includes(group)
      )
      
      return hasMatchingCategory || hasMatchingMuscleGroup
    })
  } else {
    exercises = uniqueExercises
  }
  
  // Filter by search query - only show exercises with search text in name
  const searchText = query.value.trim().toLowerCase()
  if (!searchText) return exercises
  
  return exercises.filter((ex) => {
    // Always include custom exercise in search results
    if (ex.id === 'custom-exercise') return true
    
    // Only include exercises where the name contains the search text
    return ex.name.toLowerCase().includes(searchText)
  }).sort((x, y) => x.name.localeCompare(y.name, 'no'))
})

const getPrimaryMuscleGroup = (exercise: ExerciseItem): string | null => {
  // Return the first muscle group, or category as fallback
  if (exercise.muscleGroups && exercise.muscleGroups.length > 0) {
    return exercise.muscleGroups[0]
  }
  return exercise.category || null
}

const getMuscleGroupColor = (muscleGroup: string): string => {
  const colors: Record<string, string> = {
    'Bryst': '#f97316',      // Oransje
    'Rygg': '#3b82f6',      // Blå
    'Ben': '#10b981',       // Grønn
    'Skuldre': '#8b5cf6',   // Lilla
    'Armer': '#f59e0b',     // Gul
    'Kjerne': '#ef4444',    // Rød
    'Annet': '#6b7280',    // Grå
  }
  return colors[muscleGroup] || '#6b7280' // Grå som fallback
}

const selectExercise = (ex: ExerciseItem) => {
  emit('select', ex.id)
}

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

const workoutTypes = computed(() => workoutTypesData.workoutTypes)
</script>


