<script setup lang="ts">
// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------
import { ref, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useHybridData } from '@/composables/useHybridData'
import { useExercises } from '@/composables/useExercises'
import ExerciseForm from '@/components/ExerciseForm.vue'
import muscleGroupsData from '@/data/muscle-groups.json'
import type { ExerciseData } from '@/types/workout'

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const router = useRouter()
const workoutData = useHybridData()
const exercisesStore = useExercises()

const searchQuery = ref('')
const showForm = ref(false)
const selectedExercise = ref<ExerciseData | null>(null)

// Inline "add variant" only (edit/delete live on the variant's detail page)
const addingToGroupId = ref<number | null>(null)
const newInlineVariantName = ref('')
const isSavingVariant = ref(false)

// Template ref for auto-focus on inline add input
const addVariantInputRefs = ref<Record<number, HTMLInputElement | null>>({})

// ---------------------------------------------------------------------------
// Computed
// ---------------------------------------------------------------------------

const isLoading = computed(() => workoutData.isLoading.value || workoutData.isLoadingExercises.value)
const hasSearch = computed(() => searchQuery.value.trim().length > 0)

const CATEGORY_ORDER = ['Bryst', 'Rygg', 'Ben', 'Skuldre', 'Biceps', 'Triceps', 'Kjerne', 'Legger', 'Annet']

const CATEGORY_COLORS: Record<string, string> = {
  ...Object.fromEntries(muscleGroupsData.muscleGroups.map((g) => [g.name, g.color])),
  Annet: '#6b7280',
}

/** Returns the accent color for a given category name. */
const getCategoryColor = (category: string): string =>
  CATEGORY_COLORS[category] ?? '#6b7280'

/** All exercises enriched with session stats (totalSessions, oneRepMax). */
const enrichedExercises = computed(() => {
  return workoutData.exercises.value.map((exercise) => {
    const allVariantIds = new Set<number>([
      exercise.id,
      ...(exercise.variants?.map((v) => v.id) ?? []),
    ])

    let totalSessions = 0
    let oneRepMax = 0

    workoutData.sessions.value
      ?.filter((s) => s.isCompleted)
      .forEach((session) => {
        const matched = session.exercises?.filter((e) =>
          allVariantIds.has(Number(e.exerciseId))
        )
        if (matched && matched.length > 0) totalSessions++

        matched?.forEach((e) => {
          e.sets?.forEach((set) => {
            if (set.isCompleted && set.weight && set.reps === 1) {
              if (set.weight > oneRepMax) oneRepMax = set.weight
            }
          })
        })
      })

    return { ...exercise, totalSessions, oneRepMax }
  })
})

/**
 * When a query is active, keep only groups whose name or any variant name
 * contains the query. Variants within a matching group are not filtered —
 * the whole group is shown for context.
 */
const filteredExercises = computed(() => {
  if (!hasSearch.value) return enrichedExercises.value
  const q = searchQuery.value.trim().toLowerCase()
  return enrichedExercises.value.filter(
    (exercise) =>
      exercise.name.toLowerCase().includes(q) ||
      exercise.variants?.some((v) => v.name.toLowerCase().includes(q))
  )
})

const categories = computed(() => {
  const present = new Set(filteredExercises.value.map((e) => e.category))
  return CATEGORY_ORDER.filter((c) => present.has(c))
})

const getExercisesByCategory = (category: string) =>
  filteredExercises.value
    .filter((e) => e.category === category)
    .sort((a, b) => a.name.localeCompare(b.name, 'no'))

/** Active exercises – those used in at least one template. */
const activeExercises = computed(() => {
  const activeVariantIds = new Set<number>()

  workoutData.templates.value?.forEach((t) =>
    t.exercises?.forEach((e) => activeVariantIds.add(Number(e.exerciseId)))
  )

  if (activeVariantIds.size === 0) {
    return []
  }

  const results: Array<{ id: number; name: string; totalSessions: number }> = []

  workoutData.exercises.value.forEach((exercise) => {
    if (activeVariantIds.has(exercise.id)) {
      results.push({ id: exercise.id, name: exercise.name, totalSessions: 0 })
      return
    }
    exercise.variants?.forEach((variant) => {
      if (activeVariantIds.has(variant.id)) {
        results.push({ id: variant.id, name: variant.name, totalSessions: 0 })
      }
    })
  })

  return results
    .map((r) => {
      const sessions = workoutData.sessions.value?.filter((s) =>
        s.exercises?.some((e) => Number(e.exerciseId) === r.id)
      ).length ?? 0
      return { ...r, totalSessions: sessions }
    })
    .sort((a, b) => b.totalSessions - a.totalSessions)
    .slice(0, 12)
})


// ---------------------------------------------------------------------------
// Methods – navigation
// ---------------------------------------------------------------------------

const viewExercise = (exerciseId: number) =>
  router.push(`/exercise/${exerciseId}`)

// ---------------------------------------------------------------------------
// Methods – form (create / edit group metadata)
// ---------------------------------------------------------------------------

const openCreateForm = () => {
  selectedExercise.value = null
  showForm.value = true
}

const openEditForm = (exercise: ExerciseData) => {
  selectedExercise.value = exercise
  showForm.value = true
  addingToGroupId.value = null
}

const onExerciseSaved = (_exercise: ExerciseData) => {
  showForm.value = false
}


// ---------------------------------------------------------------------------
// Methods – inline variant add
// ---------------------------------------------------------------------------

const openAddVariant = async (exerciseId: number) => {
  newInlineVariantName.value = ''
  addingToGroupId.value = exerciseId
  await nextTick()
  addVariantInputRefs.value[exerciseId]?.focus()
}

const cancelAddVariant = () => {
  addingToGroupId.value = null
  newInlineVariantName.value = ''
}

const saveNewVariant = async (exercise: ExerciseData) => {
  const name = newInlineVariantName.value.trim()
  if (!name || isSavingVariant.value) return
  isSavingVariant.value = true
  const userId = workoutData.currentUser.value?.id ?? null
  await exercisesStore.createVariant(exercise.id, userId, { name })
  isSavingVariant.value = false
  cancelAddVariant()
}

</script>

<template>
  <div class="exercises-view">

    <!-- Header -->
    <header class="exercises-view__header">
      <div class="exercises-view__header-left">
        <div class="exercises-view__header-icon">
          <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-white">Øvelser</h1>
      </div>
      <button class="exercises-view__create-btn" @click="openCreateForm">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Ny gruppe
      </button>
    </header>

    <!-- Search -->
    <div class="exercises-view__search">
      <svg class="exercises-view__search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        v-model="searchQuery"
        type="text"
        class="input-field w-full pl-10 text-base"
        placeholder="Søk etter øvelse..."
      />
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="exercises-view__skeleton">
      <div v-for="i in 6" :key="i" class="exercises-view__skeleton-row animate-pulse"></div>
    </div>

    <template v-else>

      <!-- Active exercises (only when not searching) -->
      <section v-if="!hasSearch && activeExercises.length > 0" class="exercises-view__section">
        <div class="exercises-view__section-header">
          <svg class="w-5 h-5 text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <h2 class="text-lg font-semibold text-white">Brukte øvelser</h2>
        </div>
        <p class="exercises-view__section-subtitle">Øvelser i dine treningsprogrammer</p>
        <div class="exercises-view__grid exercises-view__grid--active">
          <button
            v-for="exercise in activeExercises"
            :key="exercise.id"
            class="exercises-view__active-card"
            @click="viewExercise(exercise.id)"
          >
            <span class="exercises-view__active-card-name">{{ exercise.name }}</span>
            <svg class="w-4 h-4 text-primary-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </section>

      <!-- No results when searching -->
      <div v-if="hasSearch && filteredExercises.length === 0" class="exercises-view__empty">
        <p class="text-dark-300">Ingen treff på "{{ searchQuery }}"</p>
      </div>

      <!-- Exercises grouped by category (same layout for both search and no-search) -->
      <template v-if="!hasSearch || filteredExercises.length > 0">
        <div
          v-for="category in categories"
          :key="category"
          class="ex-cat"
          :style="{ '--cat-color': getCategoryColor(category) }"
        >
          <!-- Category heading -->
          <div class="ex-cat__header">
            <h2 class="ex-cat__title">{{ category }}</h2>
            <div class="ex-cat__divider"></div>
          </div>

          <!-- Exercise groups in this category -->
          <div class="ex-cat__groups">
            <div
              v-for="exercise in getExercisesByCategory(category)"
              :key="exercise.id"
              class="ex-group"
            >

              <!-- Group header: muted name + action buttons -->
              <div class="ex-group__header">
                <span class="ex-group__name">{{ exercise.name }}</span>
                <div class="ex-group__header-actions">
                  <button
                    class="ex-group__add-btn"
                    title="Legg til variant"
                    @click.stop="openAddVariant(exercise.id)"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Legg til variant</span>
                  </button>
                  <button
                    class="ex-group__settings-btn"
                    title="Gruppeinnstillinger"
                    @click.stop="openEditForm(exercise)"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Variant rows -->
              <div class="ex-group__variants">

                <div
                  v-for="variant in exercise.variants"
                  :key="variant.id"
                  class="ex-group__variant"
                >
                  <button
                    class="ex-group__variant-name"
                    @click="viewExercise(variant.id)"
                  >
                    <span class="ex-group__variant-dot"></span>
                    {{ variant.name }}
                  </button>
                </div>

                <!-- Empty state -->
                <div
                  v-if="(!exercise.variants || exercise.variants.length === 0) && addingToGroupId !== exercise.id"
                  class="ex-group__empty"
                >
                  Ingen varianter ennå —
                  <button class="ex-group__empty-link" @click.stop="openAddVariant(exercise.id)">
                    legg til den første
                  </button>
                </div>

                <!-- Inline add row -->
                <div v-if="addingToGroupId === exercise.id" class="ex-group__add-row">
                  <input
                    :ref="(el) => { addVariantInputRefs[exercise.id] = el as HTMLInputElement }"
                    v-model="newInlineVariantName"
                    type="text"
                    class="input-field ex-group__variant-input"
                    placeholder="Variantnavn, f.eks. Stang"
                    @keydown.enter="saveNewVariant(exercise)"
                    @keydown.escape="cancelAddVariant"
                  />
                  <button
                    class="ex-group__action-btn ex-group__action-btn--save"
                    title="Legg til"
                    :disabled="!newInlineVariantName.trim() || isSavingVariant"
                    @click="saveNewVariant(exercise)"
                  >
                    <svg v-if="!isSavingVariant" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    <span v-else class="text-xs">...</span>
                  </button>
                  <button
                    class="ex-group__action-btn"
                    title="Avbryt"
                    @click="cancelAddVariant"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Empty state (no exercises at all) -->
      <div v-if="!hasSearch && enrichedExercises.length === 0" class="exercises-view__empty">
        <div class="exercises-view__empty-icon">
          <svg class="w-8 h-8 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </div>
        <p class="text-dark-300 mb-2">Ingen øvelser funnet</p>
        <button class="exercises-view__create-btn" @click="openCreateForm">Opprett din første øvelsegruppe</button>
      </div>

    </template>

    <!-- Exercise create / edit drawer -->
    <ExerciseForm
      v-model:visible="showForm"
      :exercise="selectedExercise"
      @saved="onExerciseSaved"
      @deleted="showForm = false"
    />

  </div>
</template>

<style scoped>
.exercises-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ── Header ─────────────────────────────────────────────────────────────── */

.exercises-view__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.exercises-view__header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.exercises-view__header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  background: rgb(249 115 22 / 0.2);
  border-radius: 0.5rem;
}

/* ── Search ──────────────────────────────────────────────────────────────── */

.exercises-view__search {
  position: relative;
}

.exercises-view__search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1rem;
  height: 1rem;
  color: #6b7280;
  pointer-events: none;
}

/* ── Create button ───────────────────────────────────────────────────────── */

.exercises-view__create-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  background: var(--color-primary-500, #f97316);
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 0.5rem;
  border: none;
  cursor: pointer;
  transition: background 0.15s;
}

.exercises-view__create-btn:hover {
  background: var(--color-primary-600, #ea6c0e);
}

/* ── Active exercises section ────────────────────────────────────────────── */

.exercises-view__section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.exercises-view__section-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.exercises-view__section-subtitle {
  font-size: 0.875rem;
  color: #6b7280;
  margin: -0.25rem 0 0;
}

.exercises-view__grid {
  display: grid;
  gap: 0.75rem;
}

.exercises-view__grid--active {
  grid-template-columns: repeat(2, 1fr);
}

@media (min-width: 768px) {
  .exercises-view__grid--active {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1024px) {
  .exercises-view__grid--active {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* Active card */
.exercises-view__active-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgb(249 115 22 / 0.1);
  border: 1px solid rgb(249 115 22 / 0.2);
  border-radius: 0.5rem;
  padding: 0.625rem 0.75rem;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  text-align: left;
  overflow: hidden;
  gap: 0.5rem;
}

.exercises-view__active-card:hover {
  background: rgb(249 115 22 / 0.2);
  border-color: rgb(249 115 22 / 0.4);
}

.exercises-view__active-card-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Skeleton ────────────────────────────────────────────────────────────── */

.exercises-view__skeleton {
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.exercises-view__skeleton-row {
  height: 3rem;
  background: #1f2937;
  border-radius: 0.5rem;
}

/* ── Empty ───────────────────────────────────────────────────────────────── */

.exercises-view__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 3rem 0;
  gap: 0.75rem;
}

.exercises-view__empty-icon {
  width: 4rem;
  height: 4rem;
  background: #1f2937;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Category section ────────────────────────────────────────────────────── */

.ex-cat {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.ex-cat__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.ex-cat__title {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--cat-color, #6b7280);
  white-space: nowrap;
}

.ex-cat__divider {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, color-mix(in srgb, var(--cat-color, #6b7280) 35%, transparent), transparent);
}

.ex-cat__groups {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ── Exercise group ──────────────────────────────────────────────────────── */

.ex-group {
  border-left: 2px solid color-mix(in srgb, var(--cat-color, #1f2937) 20%, #1f2937);
  margin-left: 0.25rem;
  padding-left: 0;
  transition: border-color 0.15s;
}

.ex-group:not(:last-child) {
  margin-bottom: 0.25rem;
}

.ex-group:hover {
  border-left-color: #374151;
}

/* Group header row */
.ex-group__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.625rem 0.375rem 0.75rem;
  gap: 0.5rem;
}

.ex-group__name {
  font-size: 0.8rem;
  font-weight: 600;
  color: #9ca3af;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ex-group__header-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

/* "+ Legg til variant" text button */
.ex-group__add-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
  background: transparent;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
  white-space: nowrap;
}

.ex-group__add-btn:hover {
  color: #f97316;
  background: rgb(249 115 22 / 0.08);
}

/* Settings (pencil) icon button */
.ex-group__settings-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.375rem;
  border: none;
  background: transparent;
  color: #4b5563;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
  flex-shrink: 0;
}

.ex-group__settings-btn:hover {
  color: #9ca3af;
  background: #1f2937;
}

/* ── Variant list ────────────────────────────────────────────────────────── */

.ex-group__variants {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0 0.5rem 0.5rem 0.75rem;
}

/* Individual variant row */
.ex-group__variant {
  display: flex;
  align-items: center;
  border-radius: 0.375rem;
  overflow: hidden;
  min-height: 2.25rem;
}

/* Variant name button (clickable → detail page) */
.ex-group__variant-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
  padding: 0.375rem 0.5rem 0.375rem 0.375rem;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  border-radius: 0.375rem 0 0 0.375rem;
  transition: background 0.15s;
  color: #f3f4f6;
  font-size: 0.9rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ex-group__variant-name:hover {
  background: #1f2937;
  color: #fff;
}

/* The coloured dot before variant name */
.ex-group__variant-dot {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 50%;
  background: var(--cat-color, #f97316);
  flex-shrink: 0;
  opacity: 0.7;
}

/* Shared small action button (used by inline add row) */
.ex-group__action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 1.75rem;
  height: 1.75rem;
  padding: 0 0.25rem;
  border-radius: 0.375rem;
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;
}

.ex-group__action-btn:hover:not(:disabled) {
  background: #1f2937;
  color: #d1d5db;
}

.ex-group__action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ex-group__action-btn--save:hover:not(:disabled) {
  color: #34d399 !important;
  background: rgb(52 211 153 / 0.1) !important;
}

/* Shared input sizing within the inline add row */
.ex-group__variant-input {
  flex: 1;
  min-width: 0;
  height: 1.875rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}

/* Inline add row */
.ex-group__add-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.25rem 0.25rem 0.375rem;
  background: rgb(249 115 22 / 0.04);
  border-radius: 0.375rem;
  border: 1px dashed rgb(249 115 22 / 0.2);
}

/* Empty state hint */
.ex-group__empty {
  font-size: 0.8rem;
  color: #4b5563;
  font-style: italic;
  padding: 0.25rem 0.375rem;
}

.ex-group__empty-link {
  background: none;
  border: none;
  color: #6b7280;
  font-size: 0.8rem;
  font-style: italic;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
  transition: color 0.15s;
}

.ex-group__empty-link:hover {
  color: #f97316;
}
</style>
