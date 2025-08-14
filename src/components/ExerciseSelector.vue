<template>
  <div class="relative" ref="rootRef">
    <input
      v-model="query"
      type="text"
      class="input-field w-full text-sm pr-10"
      :placeholder="placeholder"
      @focus="open = true"
      @keydown.escape.prevent="open = false"
    />
    <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>

    <div v-if="open" class="absolute z-20 mt-2 w-full max-h-56 overflow-auto rounded-lg bg-dark-800 border border-dark-700 shadow-lg">
      <div v-if="groupedFiltered.length === 0" class="p-3 text-sm text-dark-300">Ingen treff</div>
      <template v-else>
        <div v-for="section in groupedFiltered" :key="section.group">
          <div class="px-3 py-2 text-[11px] uppercase text-dark-400 tracking-wide sticky top-0 z-10 bg-dark-800 border-b border-dark-700">{{ section.group }}</div>
          <button
            v-for="ex in section.items"
            :key="ex.id"
            type="button"
            class="w-full text-left px-3 py-2 hover:bg-dark-700 text-sm"
            @click="select(ex.id, ex.name)"
          >
            <div class="flex items-center justify-between">
              <span>{{ ex.name }}</span>
              <div v-if="ex.equipment || ex.angle || ex.grip" class="flex gap-1">
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
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'

interface ExerciseVariant {
  id: string
  name: string
  equipment?: string
  angle?: string
  grip?: string
  position?: string
  direction?: string
  focus?: string
}

interface ExerciseItem {
  id: string
  name: string
  category?: string
  workoutTypes?: string[]
  muscleGroups?: string[]
  variants?: ExerciseVariant[]
}

interface FlattenedExercise {
  id: string
  name: string
  category?: string
  workoutTypes?: string[]
  muscleGroups?: string[]
  equipment?: string
  angle?: string
  grip?: string
  position?: string
  direction?: string
  focus?: string
}

const props = defineProps<{
  exercises: ExerciseItem[]
  modelValue: string
  placeholder?: string
}>()

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

const query = ref('')
const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)

const placeholder = computed(() => props.placeholder || 'Søk og velg øvelse')

// Flatten exercises with variants into individual selectable exercises
const flattenedExercises = computed<FlattenedExercise[]>(() => {
  const flattened: FlattenedExercise[] = []
  
  props.exercises.forEach(exercise => {
    if (exercise.variants && exercise.variants.length > 0) {
      // Add each variant as a separate exercise
      exercise.variants.forEach(variant => {
        flattened.push({
          id: variant.id,
          name: `${exercise.name} - ${variant.name}`,
          category: exercise.category,
          workoutTypes: exercise.workoutTypes,
          muscleGroups: exercise.muscleGroups,
          equipment: variant.equipment,
          angle: variant.angle,
          grip: variant.grip,
          position: variant.position,
          direction: variant.direction,
          focus: variant.focus
        })
      })
    } else {
      // Exercise without variants
      flattened.push({
        id: exercise.id,
        name: exercise.name,
        category: exercise.category,
        workoutTypes: exercise.workoutTypes,
        muscleGroups: exercise.muscleGroups
      })
    }
  })
  
  return flattened
})

// Grouped results in dropdown
type GroupSection = { group: string; items: FlattenedExercise[] }

// Normalization and alias mapping to support Norwegian/English terms and workout types
const norm = (s: string) =>
  (s || '')
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
  annet: ['annet', 'custom', 'other', 'egen'],
  custom: ['custom', 'annet', 'other', 'egen'],
  push: ['push', 'bryst', 'skuldre', 'triceps'],
  pull: ['pull', 'rygg', 'biceps'],
}

const filtered = computed(() => {
  const raw = query.value.trim()
  const tokens = raw
    ? raw.split(/\s+/).map((t) => norm(t)).filter(Boolean)
    : []

  const hasTokens = tokens.length > 0
  if (!hasTokens) return flattenedExercises.value

  return flattenedExercises.value.filter((ex) => {
    const name = norm(ex.name)
    const category = norm(ex.category || '')
    const groups = (ex.muscleGroups || []).map((g) => norm(g)).join(' ')
    const types = (ex.workoutTypes || []).map((t) => norm(t)).join(' ')
    const equipment = norm(ex.equipment || '')
    const angle = norm(ex.angle || '')
    const grip = norm(ex.grip || '')
    const haystack = norm(`${name} ${category} ${groups} ${types} ${equipment} ${angle} ${grip}`)

    const tokenMatch = tokens.every((t) => {
      const candidates = (ALIASES[t] || [t]).map((a) => norm(a))
      return candidates.some((a) => a && haystack.includes(a))
    })

    return tokenMatch
  })
})

const groupedFiltered = computed<GroupSection[]>(() => {
  const items = filtered.value
  if (!items.length) return []
  const groups = new Map<string, FlattenedExercise[]>()
  for (const ex of items) {
    const key = ex.category || 'Annet'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(ex)
  }
  // Sort groups in the typical order, including "Annet" at the end
  const order = ['Bryst', 'Rygg', 'Ben', 'Skuldre', 'Armer', 'Kjerne', 'Annet']
  const byOrder = (a: string, b: string) => order.indexOf(a) - order.indexOf(b)
  return Array.from(groups.entries())
    .sort((a, b) => byOrder(a[0], b[0]))
    .map(([group, items]) => ({ group, items: items.sort((x, y) => x.name.localeCompare(y.name, 'no')) }))
})

watch(
  () => props.modelValue,
  (val) => {
    if (!val) {
      query.value = ''
    } else {
      const found = flattenedExercises.value.find(e => e.id === val)
      if (found) query.value = found.name
    }
  },
  { immediate: true }
)

const select = (id: string, name: string) => {
  query.value = name
  emit('update:modelValue', id)
  open.value = false
}

const onClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  const root = rootRef.value
  if (root && !root.contains(target)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))
</script>


