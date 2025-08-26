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
          <div class="flex-1">
            <span class="text-white">{{ getVariantName(ex.name) }}</span>
            <!-- Show variant details if available -->
            <div v-if="ex.equipment || ex.angle || ex.grip" class="flex gap-1 mt-1">
              <span v-if="ex.equipment" class="text-xs bg-primary-500/20 text-primary-400 px-1.5 py-0.5 rounded">
                {{ ex.equipment }}
              </span>
              <span v-if="ex.angle" class="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                {{ ex.angle }}
              </span>
              <span v-if="ex.grip" class="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                {{ ex.grip }}
              </span>
            </div>
          </div>
          <div class="flex gap-1 flex-wrap justify-end">
            <span
              v-if="ex.category"
              class="px-2 py-1 text-sm font-medium rounded-full bg-dark-600"
              :style="{ color: getMuscleGroupColor(ex.category) }"
            >
              {{ ex.category }}
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
import * as exercisesData from '@/data/exercises.json'
import * as muscleGroupsData from '@/data/muscle-groups.json'

interface ExerciseItem {
  id: string
  name: string
  category: string
  equipment?: string
  angle?: string
  grip?: string
  position?: string
  direction?: string
  focus?: string
}

const props = defineProps<{
  isOpen: boolean
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

// Get all available muscle groups
const availableMuscleGroups = computed(() => muscleGroupsData.muscleGroups.map(group => group.name))

// Get muscle group colors from the JSON data
const getMuscleGroupColor = (muscleGroup: string): string => {
  const group = muscleGroupsData.muscleGroups.find(g => g.name === muscleGroup)
  return group?.color || '#6b7280' // Grå som fallback
}

// Get all exercises from exercises.json
const allExercises = computed(() => {
  const exercises: ExerciseItem[] = []
  const seenIds = new Set<string>()
  
  exercisesData.exercises.forEach(exercise => {
    if (exercise.variants && exercise.variants.length > 0) {
      // Add each variant as a separate exercise
      exercise.variants.forEach(variant => {
        // Skip if we've already seen this variant ID
        if (seenIds.has(variant.id)) return
        
        seenIds.add(variant.id)
        exercises.push({
          id: variant.id,
          name: `${exercise.name} - ${variant.name}`,
          category: exercise.category,
          equipment: (variant as any).equipment,
          angle: (variant as any).angle,
          grip: (variant as any).grip,
          position: (variant as any).position,
          direction: (variant as any).direction,
          focus: (variant as any).focus
        })
      })
    } else {
      // Exercises without variants
      if (!seenIds.has(exercise.id)) {
        seenIds.add(exercise.id)
        exercises.push({
          id: exercise.id,
          name: exercise.name,
          category: exercise.category
        })
      }
    }
  })
  
  return exercises
})

// Filter results based on search query and selected muscle groups
const filteredResults = computed(() => {
  let exercises = allExercises.value
  
  // Filter by selected muscle groups
  if (selectedMuscleGroups.value.length > 0) {
    exercises = exercises.filter(ex => selectedMuscleGroups.value.includes(ex.category))
  }
  
  // Filter by search query
  const searchText = query.value.trim().toLowerCase()
  if (searchText) {
    exercises = exercises.filter(ex => {
      const fullName = ex.name.toLowerCase()
      const variantName = getVariantName(ex.name).toLowerCase()
      return fullName.includes(searchText) || variantName.includes(searchText)
    })
  }
  
  return exercises.sort((a, b) => a.name.localeCompare(b.name, 'no'))
})

const selectExercise = (ex: ExerciseItem) => {
  emit('select', ex.id)
}

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

const workoutTypes = computed(() => workoutTypesData.workoutTypes)

// Computed property to extract the variant name from the full exercise name
const getVariantName = (fullName: string): string => {
  // Extract variant name from "Main Exercise - Variant" format
  // For example: "Squats - Front Squats" -> "Front Squats"
  // "Bench Press - Barbell Bench Press" -> "Barbell Bench Press"
  const parts = fullName.split(' - ')
  if (parts.length > 1) {
    return parts[1] // Return the variant part
  }
  return fullName // Return original if no dash found
}

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
    /* await nextTick()
    if (searchInput.value) {
      searchInput.value.focus()
    } */
  }
})
</script>


