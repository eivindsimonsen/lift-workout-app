<template>
  <SlideOver :is-open="isOpen" :title="title" @close="onClose">
    <div class="space-y-3">
      <!-- Search input -->
      <div class="relative">
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="query"
          type="text"
          class="input-field w-full pl-10 text-base"
          placeholder="Søk etter øvelse..."
          autofocus
          @keydown.escape.prevent="onClose"
        />
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
              :style="{ color: getMuscleGroupColor(getPrimaryMuscleGroup(ex)!) }"
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
import { computed, ref, watch, type Ref } from 'vue'
import SlideOver from '@/components/SlideOver.vue'

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
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', exerciseId: string): void
}>()

const title = computed(() => props.title || 'Velg øvelse')
const isOpen: Ref<boolean> = ref(props.isOpen)
watch(() => props.isOpen, v => isOpen.value = v)

const onClose = () => emit('close')

// search
const query = ref('')
watch(() => props.isOpen, (open) => {
  if (open) query.value = ''
})

const norm = (s: string) => (s || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[‑–—−]/g, '-')
  .replace(/[^a-z0-9æøå\-\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const ALIASES: Record<string, string[]> = {
  bryst: ['bryst', 'chest'],
  chest: ['chest', 'bryst'],
  rygg: ['rygg', 'back'],
  back: ['back', 'rygg'],
  ben: ['ben', 'bein', 'legs', 'leg', 'quads', 'quadriceps', 'hamstrings', 'glutes', 'calves', 'legger'],
  bein: ['ben', 'bein', 'legs', 'leg', 'quads', 'quadriceps', 'hamstrings', 'glutes', 'calves', 'legger'],
  legs: ['legs', 'leg', 'ben', 'bein', 'quads', 'quadriceps', 'hamstrings', 'glutes', 'calves', 'legger'],
  skuldre: ['skuldre', 'skulder', 'shoulders', 'shoulder', 'delts', 'deltoid'],
  skulder: ['skuldre', 'skulder', 'shoulders', 'shoulder', 'delts', 'deltoid'],
  shoulders: ['shoulders', 'shoulder', 'skuldre', 'skulder', 'delts', 'deltoid'],
  armer: ['armer', 'arm', 'arms', 'biceps', 'triceps', 'forearms', 'underarmer'],
  arms: ['arms', 'arm', 'armer', 'biceps', 'triceps', 'forearms', 'underarmer'],
  kjerne: ['kjerne', 'core', 'mage', 'abs'],
  core: ['core', 'kjerne', 'mage', 'abs'],
  push: ['push', 'bryst', 'skuldre', 'triceps'],
  pull: ['pull', 'rygg', 'biceps'],
}

const filteredResults = computed(() => {
  const raw = query.value.trim()
  const tokens = raw ? raw.split(/\s+/).map(t => norm(t)).filter(Boolean) : []
  if (!tokens.length) return props.exercises
  
  return props.exercises.filter((ex) => {
    const name = norm(ex.name)
    const category = norm(ex.category || '')
    const groups = (ex.muscleGroups || []).map(g => norm(g)).join(' ')
    const types = (ex.workoutTypes || []).map(t => norm(t)).join(' ')
    const haystack = norm(`${name} ${category} ${groups} ${types}`)
    return tokens.every((t) => {
      const candidates = (ALIASES[t] || [t]).map(a => norm(a))
      return candidates.some(a => a && haystack.includes(a))
    })
  }).sort((x, y) => x.name.localeCompare(y.name, 'no'))
})

const getPrimaryMuscleGroup = (exercise: ExerciseItem): string | null => {
  // Return the first muscle group, or category as fallback
  return exercise.muscleGroups?.[0] || exercise.category || null
}

const getMuscleGroupColor = (muscleGroup: string): string => {
  const colors: Record<string, string> = {
    'Bryst': '#f97316',      // Oransje
    'Rygg': '#3b82f6',      // Blå
    'Ben': '#10b981',       // Grønn
    'Skuldre': '#8b5cf6',   // Lilla
    'Armer': '#f59e0b',     // Gul
    'Kjerne': '#ef4444',    // Rød
    'Legger': '#06b6d4',    // Cyan
    'Underarmer': '#f59e0b' // Gul (samme som Armer)
  }
  return colors[muscleGroup] || '#6b7280' // Grå som fallback
}

const selectExercise = (ex: ExerciseItem) => {
  emit('select', ex.id)
}
</script>


