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
          <div class="px-3 py-2 text-[11px] uppercase text-dark-400 tracking-wide sticky top-0 bg-dark-800">{{ section.group }}</div>
          <button
            v-for="ex in section.items"
            :key="ex.id"
            type="button"
            class="w-full text-left px-3 py-2 hover:bg-dark-700 text-sm"
            @click="select(ex.id, ex.name)"
          >
            {{ ex.name }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'

interface ExerciseItem {
  id: string
  name: string
  category?: string
  workoutTypes?: string[]
  muscleGroups?: string[]
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

// Grouped results in dropdown
type GroupSection = { group: string; items: ExerciseItem[] }

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
  push: ['push', 'bryst', 'skuldre', 'triceps'],
  pull: ['pull', 'rygg', 'biceps'],
}

const filtered = computed(() => {
  const raw = query.value.trim()
  const tokens = raw
    ? raw.split(/\s+/).map((t) => norm(t)).filter(Boolean)
    : []

  const hasTokens = tokens.length > 0
  if (!hasTokens) return props.exercises

  return props.exercises.filter((ex) => {
    const name = norm(ex.name)
    const category = norm(ex.category || '')
    const groups = (ex.muscleGroups || []).map((g) => norm(g)).join(' ')
    const types = (ex.workoutTypes || []).map((t) => norm(t)).join(' ')
    const haystack = norm(`${name} ${category} ${groups} ${types}`)

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
  const groups = new Map<string, ExerciseItem[]>()
  for (const ex of items) {
    const key = ex.category || 'Annet'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(ex)
  }
  // Sort groups in the typical order
  const order = ['Bryst', 'Rygg', 'Ben', 'Skuldre', 'Armer', 'Kjerne']
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
      const found = props.exercises.find(e => e.id === val)
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


