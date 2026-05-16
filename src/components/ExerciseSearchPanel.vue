<script setup lang="ts">
// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------
import { computed, ref, watch } from 'vue'
import SlideOver from '@/components/SlideOver.vue'
import { useHybridData } from '@/composables/useHybridData'
import * as workoutTypesData from '@/data/workout-types.json'
import * as muscleGroupsData from '@/data/muscle-groups.json'
import type { ExerciseData } from '@/types/workout'

// ---------------------------------------------------------------------------
// Props / Emits
// ---------------------------------------------------------------------------

const props = defineProps<{
  isOpen: boolean
  title?: string
  workoutType?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', exerciseId: number): void
}>()

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const workoutData = useHybridData()

const panelTitle = computed(() => props.title || 'Velg variant')
const onClose = () => emit('close')

const query = ref('')
const selectedCategories = ref<string[]>([])

/** Set of exercise IDs whose variant list is currently expanded. */
const expandedIds = ref(new Set<number>())

// ---------------------------------------------------------------------------
// Computed
// ---------------------------------------------------------------------------

const availableCategories = computed(() =>
  muscleGroupsData.muscleGroups.map((g) => g.name)
)

const getMuscleGroupColor = (category: string): string => {
  const group = muscleGroupsData.muscleGroups.find((g) => g.name === category)
  return group?.color || '#6b7280'
}

/**
 * Returns exercises filtered by category and search query.
 * When a query matches the exercise name, all its variants are included.
 * When a query matches a variant name, only matching variants are shown.
 */
const groupedResults = computed<ExerciseData[]>(() => {
  let exercises = workoutData.exercises.value

  if (selectedCategories.value.length > 0) {
    exercises = exercises.filter((e) => selectedCategories.value.includes(e.category))
  }

  const q = query.value.trim().toLowerCase()
  if (!q) return exercises

  const results: ExerciseData[] = []
  exercises.forEach((exercise) => {
    const nameMatch = exercise.name.toLowerCase().includes(q)
    if (nameMatch) {
      results.push(exercise)
      return
    }
    const matchingVariants = exercise.variants?.filter((v) =>
      v.name.toLowerCase().includes(q)
    )
    if (matchingVariants && matchingVariants.length > 0) {
      results.push({ ...exercise, variants: matchingVariants })
    }
  })

  return results
})

/** Returns the default category filters for a given workout type. */
const getDefaultCategories = (workoutType: string): string[] => {
  const map: Record<string, string[]> = {
    push:        ['Bryst', 'Skuldre', 'Triceps'],
    pull:        ['Rygg', 'Biceps'],
    legs:        ['Ben', 'Legger'],
    upper:       ['Bryst', 'Rygg', 'Skuldre', 'Biceps', 'Triceps'],
    lower:       ['Ben', 'Kjerne', 'Legger'],
    'full-body': ['Bryst', 'Rygg', 'Ben', 'Skuldre', 'Biceps', 'Triceps', 'Kjerne', 'Legger'],
    bryst:       ['Bryst'],
    rygg:        ['Rygg'],
    ben:         ['Ben'],
    legger:      ['Legger'],
    skuldre:     ['Skuldre'],
    biceps:      ['Biceps'],
    triceps:     ['Triceps'],
    kjerne:      ['Kjerne'],
  }
  return map[workoutType.toLowerCase()] || []
}

const workoutTypes = computed(() => workoutTypesData.workoutTypes)

const CATEGORY_ORDER = ['Bryst', 'Rygg', 'Ben', 'Skuldre', 'Biceps', 'Triceps', 'Kjerne', 'Legger', 'Annet']

/** Exercises from groupedResults arranged into labelled category sections. */
const categorySections = computed(() => {
  const map = new Map<string, ExerciseData[]>()

  for (const exercise of groupedResults.value) {
    const cat = exercise.category || 'Annet'
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(exercise)
  }

  const sections: Array<{ category: string; exercises: ExerciseData[] }> = []

  // Emit in the standard muscle-group order first
  for (const cat of CATEGORY_ORDER) {
    if (map.has(cat)) sections.push({ category: cat, exercises: map.get(cat)! })
  }
  // Then any categories not in the standard order
  for (const [cat, exercises] of map) {
    if (!CATEGORY_ORDER.includes(cat)) sections.push({ category: cat, exercises })
  }

  return sections
})

const isExpanded = (id: number) => expandedIds.value.has(id)

const toggleExpand = (id: number) => {
  const next = new Set(expandedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedIds.value = next
}

// ---------------------------------------------------------------------------
// Watchers
// ---------------------------------------------------------------------------

// Auto-expand all matching groups when the user types a search query
watch(
  () => query.value,
  (q) => {
    if (q.trim()) {
      expandedIds.value = new Set(groupedResults.value.map((e) => e.id))
    }
  }
)

// Reset state when panel opens
watch(
  () => props.isOpen,
  (open) => {
    if (!open) return
    query.value = ''
    expandedIds.value = new Set()
    selectedCategories.value = props.workoutType
      ? getDefaultCategories(props.workoutType)
      : []
  }
)
</script>

<template>
  <SlideOver :is-open="isOpen" :title="panelTitle" @close="onClose">
    <div class="ep-panel">

      <!-- Search -->
      <div class="ep-panel__search">
        <svg class="ep-panel__search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="query"
          type="text"
          class="input-field w-full pl-10 text-base"
          placeholder="Søk etter øvelse eller variant..."
          @keydown.escape.prevent="onClose"
        />
      </div>

      <!-- Category filters -->
      <div class="ep-panel__filters">
        <p class="ep-panel__filters-label">
          Muskelgruppe
          <span v-if="props.workoutType" class="ep-panel__filters-hint">
            (filtrert for {{ workoutTypes.find((t) => t.id === props.workoutType)?.name || props.workoutType }})
          </span>
        </p>
        <div class="ep-panel__filter-chips">
          <label
            v-for="cat in availableCategories"
            :key="cat"
            class="ep-panel__chip"
            :class="{ 'ep-panel__chip--active': selectedCategories.includes(cat) }"
          >
            <input v-model="selectedCategories" type="checkbox" :value="cat" class="sr-only" />
            <span class="ep-panel__chip-dot" :style="{ background: getMuscleGroupColor(cat) }"></span>
            {{ cat }}
          </label>
        </div>
      </div>

      <div class="ep-panel__divider"></div>

      <!-- Empty state -->
      <div v-if="groupedResults.length === 0" class="ep-panel__empty">
        Ingen øvelser funnet
      </div>

      <!-- Exercises grouped by muscle category -->
      <div v-else class="ep-panel__groups">
        <div
          v-for="section in categorySections"
          :key="section.category"
          class="ep-panel__category-section"
        >
          <!-- Category heading -->
          <div class="ep-panel__category-header">
            <span
              class="ep-panel__category-dot"
              :style="{ background: getMuscleGroupColor(section.category) }"
            ></span>
            <span class="ep-panel__category-name">{{ section.category }}</span>
          </div>

          <!-- Exercise accordions within this category -->
          <div class="ep-panel__category-exercises">
        <div
          v-for="exercise in section.exercises"
          :key="exercise.id"
          class="ep-panel__group"
        >

          <!-- ── Group with variants: expandable accordion header ── -->
          <template v-if="exercise.variants && exercise.variants.length > 0">
            <button
              type="button"
              class="ep-panel__group-header"
              :class="{ 'ep-panel__group-header--open': isExpanded(exercise.id) }"
              @click="toggleExpand(exercise.id)"
            >
              <span
                class="ep-panel__group-dot"
                :style="{ background: getMuscleGroupColor(exercise.category) }"
              ></span>
              <span class="ep-panel__group-name">{{ exercise.name }}</span>
              <span class="ep-panel__group-meta">
                {{ exercise.variants.length }} variant{{ exercise.variants.length !== 1 ? 'er' : '' }}
              </span>
              <!-- Expand / collapse chevron -->
              <svg
                class="ep-panel__chevron"
                :class="{ 'ep-panel__chevron--open': isExpanded(exercise.id) }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <!-- Variants panel (shown when expanded) -->
            <div v-if="isExpanded(exercise.id)" class="ep-panel__variants">
              <button
                v-for="variant in exercise.variants"
                :key="variant.id"
                type="button"
                class="ep-panel__variant-btn"
                @click="emit('select', variant.id)"
              >
                <span class="ep-panel__variant-name">{{ variant.name }}</span>
              </button>
            </div>
          </template>

          <!-- ── No variants: exercise is directly selectable ── -->
          <button
            v-else
            type="button"
            class="ep-panel__group-header ep-panel__group-header--solo"
            @click="emit('select', exercise.id)"
          >
            <span
              class="ep-panel__group-dot"
              :style="{ background: getMuscleGroupColor(exercise.category) }"
            ></span>
            <span class="ep-panel__group-name">{{ exercise.name }}</span>
            <span class="ep-panel__group-meta ep-panel__group-meta--solo">Velg</span>
          </button>

        </div>
          </div><!-- /.ep-panel__category-exercises -->
        </div><!-- /.ep-panel__category-section -->

      </div>

    </div>
  </SlideOver>
</template>

<style scoped>
.ep-panel {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

/* Search */
.ep-panel__search {
  position: relative;
}

.ep-panel__search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1rem;
  height: 1rem;
  color: #6b7280;
  pointer-events: none;
}

/* Filters */
.ep-panel__filters {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ep-panel__filters-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.ep-panel__filters-hint {
  font-weight: 400;
  text-transform: none;
  color: #f97316;
}

.ep-panel__filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.ep-panel__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  border: 1px solid #374151;
  background: #111827;
  color: #9ca3af;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
}

.ep-panel__chip:hover { border-color: #4b5563; color: #e5e7eb; }
.ep-panel__chip--active { background: #1f2937; border-color: #6b7280; color: #fff; }

.ep-panel__chip-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  flex-shrink: 0;
}

/* Divider */
.ep-panel__divider { height: 1px; background: #1f2937; }

/* Empty */
.ep-panel__empty {
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
  padding: 2rem 0;
}

/* Groups */
.ep-panel__groups {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Category section */
.ep-panel__category-section {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.ep-panel__category-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.25rem;
}

.ep-panel__category-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  flex-shrink: 0;
}

.ep-panel__category-name {
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #6b7280;
}

.ep-panel__category-exercises {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.ep-panel__group {
  display: flex;
  flex-direction: column;
  border-radius: 0.5rem;
  overflow: hidden;
  border: 1px solid #374151;
}

/* Accordion header (used for both with-variants and solo) */
.ep-panel__group-header {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.75rem;
  background: #111827;
  border: none;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background 0.12s;
}

.ep-panel__group-header:hover {
  background: #1a2232;
}

.ep-panel__group-header--open {
  background: #1a2232;
  border-bottom: 1px solid #374151;
}

.ep-panel__group-header--solo:hover {
  background: #1f2937;
}

.ep-panel__group-dot {
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 9999px;
  flex-shrink: 0;
}

.ep-panel__group-name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #f3f4f6;
  flex: 1;
  text-align: left;
}

.ep-panel__group-meta {
  font-size: 0.6875rem;
  color: #6b7280;
  background: #1f2937;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  flex-shrink: 0;
  white-space: nowrap;
}

.ep-panel__group-meta--solo {
  color: #f97316;
  background: rgb(249 115 22 / 0.1);
  border: 1px solid rgb(249 115 22 / 0.2);
}

/* Expand chevron */
.ep-panel__chevron {
  width: 1rem;
  height: 1rem;
  color: #6b7280;
  flex-shrink: 0;
  transition: transform 0.15s ease;
}

.ep-panel__chevron--open {
  transform: rotate(90deg);
}

/* Variants list */
.ep-panel__variants {
  display: flex;
  flex-direction: column;
  background: #0c1422;
  border-top: 1px solid #1e293b;
}

.ep-panel__variant-btn {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  /* left padding creates visual nesting under the group header */
  padding: 0.625rem 0.875rem 0.625rem 1.25rem;
  background: transparent;
  border: none;
  border-top: 1px solid #162032;
  cursor: pointer;
  text-align: left;
  transition: background 0.1s;
  width: 100%;
}

.ep-panel__variant-btn:first-child {
  border-top: none;
}

.ep-panel__variant-btn:hover {
  background: #172032;
}

.ep-panel__variant-name {
  font-size: 0.875rem;
  color: #cbd5e1;
  flex: 1;
}

</style>
