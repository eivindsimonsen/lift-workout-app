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
      <div v-if="filtered.length === 0" class="p-3 text-sm text-dark-300">Ingen treff</div>
      <button
        v-for="ex in filtered"
        :key="ex.id"
        type="button"
        class="w-full text-left px-3 py-2 hover:bg-dark-700 text-sm"
        @click="select(ex.id, ex.name)"
      >
        {{ ex.name }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'

interface ExerciseItem {
  id: string
  name: string
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

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return props.exercises
  return props.exercises.filter(ex => ex.name.toLowerCase().includes(q))
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


