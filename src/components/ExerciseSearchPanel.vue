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
      <div v-if="groupedResults.length === 0" class="text-sm text-dark-300 py-4">Ingen treff</div>
      <div v-else>
        <div v-for="(section, idx) in groupedResults" :key="section.group" :class="{ 'mt-4': idx > 0 }">
          <div class="px-1 py-2 text-[11px] uppercase text-dark-400 tracking-wide sticky top-0 z-30 bg-dark-800 border-b border-dark-700">{{ section.group }}</div>
          <button
            v-for="ex in section.items"
            :key="ex.id"
            type="button"
            class="w-full text-left px-3 py-2 rounded-md hover:bg-dark-700 text-sm z-0 relative"
            @click="selectExercise(ex)"
          >
            {{ ex.name }}
          </button>
        </div>
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

type GroupSection = { group: string; items: ExerciseItem[] }

const filtered = computed(() => {
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
  })
})

const groupedResults = computed<GroupSection[]>(() => {
  const items = filtered.value
  if (!items.length) return []
  const groups = new Map<string, ExerciseItem[]>()
  for (const ex of items) {
    const key = ex.category || 'Annet'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(ex)
  }
  const order = ['Bryst', 'Rygg', 'Ben', 'Skuldre', 'Armer', 'Kjerne']
  const byOrder = (a: string, b: string) => order.indexOf(a) - order.indexOf(b)
  return Array.from(groups.entries())
    .sort((a, b) => byOrder(a[0], b[0]))
    .map(([group, items]) => ({ group, items: items.sort((x, y) => x.name.localeCompare(y.name, 'no')) }))
})

const selectExercise = (ex: ExerciseItem) => {
  emit('select', ex.id)
}
</script>


