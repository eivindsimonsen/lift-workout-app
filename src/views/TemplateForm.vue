<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useHybridData } from '@/composables/useHybridData'
import type { WorkoutTemplate, ExerciseTemplate } from '@/types/workout'
import ExerciseSearchPanel from '@/components/ExerciseSearchPanel.vue'
import SwipeableCard from '@/components/SwipeableCard.vue'
import { useLongPressReorder } from '@/composables/useLongPressReorder'
import Breadcrumbs from '@/components/Breadcrumbs.vue'
import * as muscleGroupsData from '@/data/muscle-groups.json'
import { TEMPLATE_COLORS, DEFAULT_TEMPLATE_COLOR, templateColorOf } from '@/composables/templateColors'

const router = useRouter()
const route = useRoute()
const workoutData = useHybridData()

// Loading state
const isLoading = computed(() => workoutData.isLoading.value)

const template = ref<WorkoutTemplate | null>(null)
const templateForm = ref({
  name: '',
  // New templates start orange; an existing one without a colour stays null (grey) until one is picked.
  color: DEFAULT_TEMPLATE_COLOR as string | null,
  exercises: [] as ExerciseTemplate[]
})

// ---------------------------------------------------------------------------
// Colour — a swatch inside the name field opens a palette of the muscle-group colours
// ---------------------------------------------------------------------------

const isPaletteOpen = ref(false)
const colorPickerRef = ref<HTMLElement | null>(null)
const swatchRef = ref<HTMLButtonElement | null>(null)

const pickColor = (color: string) => {
  templateForm.value.color = color
  isPaletteOpen.value = false
}

// Close on a tap outside the swatch and palette (the name field counts as outside), or on Escape
const onDocumentPointerDown = (event: PointerEvent) => {
  if (isPaletteOpen.value && colorPickerRef.value && !colorPickerRef.value.contains(event.target as Node)) {
    isPaletteOpen.value = false
  }
}
const onDocumentKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || !isPaletteOpen.value) return
  // The focused colour disappears with the palette, so hand focus back to the swatch
  const focusWasInPalette = colorPickerRef.value?.contains(document.activeElement) ?? false
  isPaletteOpen.value = false
  if (focusWasInPalette) swatchRef.value?.focus()
}
onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
  document.addEventListener('keydown', onDocumentKeydown)
})
onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  document.removeEventListener('keydown', onDocumentKeydown)
})

// Computed
const isEditing = computed(() => {
  return route.name === 'EditTemplate'
})

const isExercisePanelOpen: Ref<boolean> = ref(false)
const activeExerciseIndex: Ref<number | null> = ref(null)

const openExercisePicker = (index: number) => {
  if (index === templateForm.value.exercises.length) {
    templateForm.value.exercises.push({
      exerciseId: 0,
      name: ''
    })
  }
  activeExerciseIndex.value = index
  isExercisePanelOpen.value = true
}

const closeExercisePicker = () => {
  isExercisePanelOpen.value = false
}

const handleSelectExercise = (exerciseId: number) => {
  const exerciseData = workoutData.getExerciseById(exerciseId)
  if (!exerciseData) {
    console.error('Invalid exercise data for id:', exerciseId)
    return
  }

  if (activeExerciseIndex.value === null) {
    templateForm.value.exercises.push({
      exerciseId,
      name: exerciseData.name,
    })
  } else {
    const idx = activeExerciseIndex.value
    if (!templateForm.value.exercises[idx]) return
    templateForm.value.exercises[idx].exerciseId = exerciseId
    templateForm.value.exercises[idx].name = exerciseData.name
  }
  isExercisePanelOpen.value = false
}

/** Returns the variant name only (not the parent group prefix). */
const getVariantName = (id: number): string => {
  if (!id) return ''
  return workoutData.getExerciseById(id)?.name ?? ''
}

/** Returns the parent exercise group name for variants. */
const getExerciseGroupName = (id: number): string => {
  if (!id) return ''
  const parent = workoutData.getMainExerciseByVariantId(id)
  if (parent) return parent.name
  return workoutData.getExerciseById(id)?.name ?? ''
}

// Display helpers (UI only)
const getExerciseCategory = (id: number): string => {
  if (!id) return ''
  return workoutData.getExerciseById(id)?.category || ''
}
const getMuscleGroupColor = (muscleGroup: string): string => {
  const group = (muscleGroupsData as any).muscleGroups.find((g: any) => g.name === muscleGroup)
  return group?.color || '#6b7280'
}
const getExerciseAccentColor = (exerciseId: number): string => {
  const exercise = workoutData.getExerciseById(exerciseId)
  if (exercise?.muscleGroups && exercise.muscleGroups.length > 0) {
    return getMuscleGroupColor(exercise.muscleGroups[0])
  }
  if (exercise?.category) {
    return getMuscleGroupColor(exercise.category)
  }
  return '#64748b'
}

// ---------------------------------------------------------------------------
// Drag to reorder
// ---------------------------------------------------------------------------

// Rows need an identity that survives reordering, and exerciseId won't do: a
// freshly added row has none, and the same exercise may appear twice. Keyed on
// the object itself, which splice preserves.
const rowKeys = new WeakMap<object, number>()
let nextRowKey = 0
const rowKey = (exercise: object): number => {
  let key = rowKeys.get(exercise)
  if (key === undefined) {
    key = nextRowKey += 1
    rowKeys.set(exercise, key)
  }
  return key
}

const exListRef = ref<HTMLElement | null>(null)

const {
  draggingIndex,
  dragTranslateY,
  onRowPointerDown,
  consumeClickSuppression,
} = useLongPressReorder({
  getItems: () => templateForm.value.exercises,
  listEl: exListRef,
})

/** The order is written to the template on save, so nothing to persist here. */
const onRowClick = (index: number) => {
  if (consumeClickSuppression()) return
  openExercisePicker(index)
}

// Methods
const removeExercise = (index: number) => {
  if (!confirm('Er du sikker på at du vil fjerne denne øvelsen?')) return
  templateForm.value.exercises.splice(index, 1)
}

const deleteTemplate = async () => {
  if (template.value && confirm('Er du sikker på at du vil slette denne økten?')) {
    try {
      await workoutData.deleteTemplate(template.value.id)
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
  const exercisesWithNames = templateForm.value.exercises
    .filter((exercise) => exercise.exerciseId)
    .map(exercise => {
      const exerciseData = workoutData.getExerciseById(exercise.exerciseId)
      // Only id and name: old templates still carry the phased-out sets/reps/weight
      // in their JSON, and re-saving shouldn't write them back.
      return {
        exerciseId: exercise.exerciseId,
        name: exerciseData?.name || exercise.name
      }
    })

  try {
    if (isEditing.value && template.value) {
      // Update existing template
      // Offline-first: saved locally at once and queued when there's no network
      await workoutData.updateTemplateOffline(template.value.id, {
        name: templateForm.value.name,
        color: templateForm.value.color,
        exercises: exercisesWithNames
      })
    } else {
      // Create new template
      const templateData = {
        id: `template-${Date.now()}`,
        name: templateForm.value.name,
        color: templateForm.value.color,
        exercises: exercisesWithNames
      }
      await workoutData.addTemplate(templateData)
    }

    router.push('/')
  } catch (error) {
    console.error('Error saving template:', error)
    alert('Kunne ikke lagre økt. Prøv igjen.')
  } finally {
    isSaving.value = false
  }
}

// Lifecycle
onMounted(async () => {
  // Case 1: Edit existing template
  if (isEditing.value) {
    const templateId = route.params.id as string
    const foundTemplate = workoutData.templates.value.find(t => t.id === templateId)
    
    if (foundTemplate) {
      template.value = foundTemplate
      templateForm.value = {
        name: foundTemplate.name,
        color: foundTemplate.color ?? null,
        exercises: foundTemplate.exercises.map(exercise => {
          // Find the correct exerciseId based on the exercise name
          const matchingExercise = workoutData.exercises.value.find(e => e.name === exercise.name)
          return {
            ...exercise,
            exerciseId: exercise.exerciseId || matchingExercise?.id || 0
          }
        })
      }
    }
  } 
  // Case 2: Create from Session (Copy)
  else if (route.query.fromSession) {
    const sessionId = route.query.fromSession as string
    // Ensure sessions are loaded
    if (workoutData.sessions.value.length === 0 && !workoutData.isLoading.value) {
        await workoutData.loadData(0, true)
    }
    
    const sourceSession = workoutData.getSessionById(sessionId)
    
    if (sourceSession) {
      templateForm.value = {
        name: sourceSession.templateName,
        color: DEFAULT_TEMPLATE_COLOR,
        exercises: sourceSession.exercises.map(ex => ({
          exerciseId: ex.exerciseId,
          name: ex.name
        }))
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
    <div v-if="isLoading" class="template-form template-form--loading">
      <div class="template-form__section">
        <div class="h-4 bg-dark-700 rounded w-32 mb-4 animate-pulse"></div>
        <div class="template-form__fields">
          <div class="space-y-2">
            <div class="h-3 bg-dark-700 rounded w-20 animate-pulse"></div>
            <div class="h-10 bg-dark-700 rounded w-full animate-pulse"></div>
          </div>
        </div>
      </div>
      <div class="template-form__section">
        <div class="h-4 bg-dark-700 rounded w-20 mb-4 animate-pulse"></div>
        <div class="space-y-2">
          <div v-for="i in 3" :key="i" class="h-14 bg-dark-700 rounded-xl animate-pulse"></div>
        </div>
      </div>
    </div>

    <!-- Template Form -->
    <form v-else @submit.prevent="saveTemplate" class="template-form">
      <!-- Basic Info -->
      <section class="template-form__section">
        <h2 class="template-form__section-title">Grunnleggende</h2>
        <div class="template-form__fields">
          <div class="template-form__field">
            <label class="template-form__label" for="template-name">Navn og farge</label>
            <div class="name-color">
              <input
                id="template-name"
                v-model="templateForm.name"
                type="text"
                required
                class="input-field w-full name-color__input"
                placeholder="F.eks. Push Økt"
              />
              <!-- The colour lives in the name field; tapping it opens the palette. Only the swatch and
                   the palette count as "inside", so tapping the name field closes the palette. -->
              <div ref="colorPickerRef" class="name-color__picker">
                <button
                  ref="swatchRef"
                  type="button"
                  class="name-color__swatch"
                  :aria-expanded="isPaletteOpen"
                  aria-controls="template-color-palette"
                  aria-label="Velg farge"
                  @click="isPaletteOpen = !isPaletteOpen"
                >
                  <span class="name-color__chip" :style="{ background: templateColorOf(templateForm) }"></span>
                </button>
                <div v-if="isPaletteOpen" id="template-color-palette" class="name-color__palette" role="group" aria-label="Farger">
                  <button
                    v-for="(color, i) in TEMPLATE_COLORS"
                    :key="color"
                    type="button"
                    class="name-color__option"
                    :aria-label="`Farge ${i + 1}`"
                    :aria-pressed="templateForm.color === color"
                    @click="pickColor(color)"
                  >
                    <span class="name-color__dot" :class="{ 'name-color__dot--selected': templateForm.color === color }" :style="{ background: color }">
                      <svg v-if="templateForm.color === color" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                        <path d="M2 5.5l2.2 2.2 3.8-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    </span>
                  </button>
                </div>
              </div>
            </div>
            <p class="template-form__hint">Gi økten et tydelig navn, og en farge den kjennes igjen på.</p>
          </div>
        </div>
      </section>

      <!-- Exercises -->
      <section class="template-form__section">
        <div class="template-form__section-header">
          <h2 class="template-form__section-title">Øvelser</h2>
          <span v-if="templateForm.exercises.length" class="template-form__count">
            {{ templateForm.exercises.length }} valgt
          </span>
        </div>
        <div v-if="templateForm.exercises.length" ref="exListRef" class="ex-list">
          <SwipeableCard
            v-for="(exercise, index) in templateForm.exercises"
            :key="rowKey(exercise)"
            :show-swipe-hint="false"
            :disabled="draggingIndex !== null"
            :class="{ 'ex-item--dragging': draggingIndex === index }"
            :style="draggingIndex === index ? { transform: `translateY(${dragTranslateY}px)` } : undefined"
            @delete="removeExercise(index)"
          >
            <button
              type="button"
              class="ex-row"
              :class="{ 'ex-row--empty': !exercise.exerciseId }"
              :style="{ '--ex-color': getExerciseAccentColor(exercise.exerciseId) }"
              @pointerdown="onRowPointerDown($event, index)"
              @click="onRowClick(index)"
            >
              <span class="ex-row__dot"></span>
              <span class="ex-row__body">
                <span class="ex-row__name">
                  {{ exercise.exerciseId ? getVariantName(exercise.exerciseId) : 'Velg variant…' }}
                </span>
                <span v-if="exercise.exerciseId" class="ex-row__ref">
                  <span v-if="getExerciseGroupName(exercise.exerciseId)">
                    {{ getExerciseGroupName(exercise.exerciseId) }}
                  </span>
                  <span
                    v-if="getExerciseGroupName(exercise.exerciseId) && getExerciseCategory(exercise.exerciseId)"
                    class="ex-row__ref-sep"
                  >·</span>
                  <span v-if="getExerciseCategory(exercise.exerciseId)">
                    {{ getExerciseCategory(exercise.exerciseId) }}
                  </span>
                </span>
              </span>
              <span class="ex-row__right">
                <svg class="ex-row__chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </button>
          </SwipeableCard>
        </div>

        <p v-else class="text-sm text-dark-400 italic">
          Ingen øvelser lagt til ennå.
        </p>

        <button
          type="button"
          class="w-full btn-secondary py-2.5 flex items-center justify-center gap-2"
          @click="openExercisePicker(templateForm.exercises.length)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Legg til øvelse
        </button>
      </section>

      <!-- Actions -->
      <div class="template-form__actions">
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
    
    <!-- Exercise variant picker (all devices) -->
    <ExerciseSearchPanel
      :is-open="isExercisePanelOpen"
      title="Velg variant"
      @close="closeExercisePicker"
      @select="handleSelectExercise"
    />
  </div>
</template>

<style scoped>
.template-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.template-form--loading {
  gap: 2rem;
}

.template-form__section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.template-form__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.template-form__section-title {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #9ca3af;
}

.template-form__count {
  font-size: 0.75rem;
  color: #6b7280;
  flex-shrink: 0;
}

.template-form__fields {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
}

.template-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.template-form__label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #d1d5db;
}

.template-form__hint {
  margin: 0;
  font-size: 0.75rem;
  color: #6b7280;
}

/* ── Name and colour ─────────────────────────────────────────────────────── */

.name-color {
  position: relative;
}

.name-color__input {
  padding-left: 3rem;
}

/* Swatch and palette: a 44px column over the left edge of the field */
.name-color__picker {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 2.75rem;
}

.name-color__swatch {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 0;
  padding: 0;
}

.name-color__chip {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 0.375rem;
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.12);
}

.name-color__palette {
  position: absolute;
  top: calc(100% + 0.375rem);
  left: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: repeat(4, 2.75rem);
  gap: 0.25rem;
  padding: 0.5rem;
  background: #1a2233;
  border: 1px solid #2d3a4f;
  border-radius: 0.75rem;
  box-shadow: 0 10px 24px -10px rgb(0 0 0 / 0.8);
}

.name-color__option {
  width: 2.75rem;
  height: 2.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 0;
  padding: 0;
}

.name-color__dot {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.name-color__dot svg {
  width: 0.875rem;
  height: 0.875rem;
}

.name-color__dot--selected {
  box-shadow: 0 0 0 2px #1a2233, 0 0 0 4px #f1f5f9;
}

.template-form__actions {
  display: flex;
  gap: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid #1f2937;
}

/* ── Compact exercise row list (matches WorkoutSession) ─────────────────── */

.ex-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-top: 0.25rem;
}

.ex-list > * {
  border-radius: 0.875rem;
  overflow: hidden;
}

.ex-row {
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.8125rem 1rem;
  background: #0d1117;
  border: none;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background 0.15s;
  -webkit-tap-highlight-color: transparent;
  border-radius: 0.875rem;
}

.ex-row:active {
  background: #131c2b;
}

@media (hover: hover) and (pointer: fine) {
  .ex-row:hover {
    background: #131c2b;
  }
}

.ex-row--empty .ex-row__name {
  color: #6b7280;
  font-weight: 500;
}

.ex-row__dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--ex-color, #374151);
  flex-shrink: 0;
  opacity: 0.85;
}

.ex-row__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.ex-row__name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #f3f4f6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ex-row__ref {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.6875rem;
  color: #4b5563;
  min-width: 0;
}

.ex-row__ref > span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ex-row__ref-sep {
  flex-shrink: 0;
  color: #374151;
}

.ex-row__right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.ex-row__chevron {
  width: 1rem;
  height: 1rem;
  color: #374151;
  flex-shrink: 0;
}

/* ── Drag to reorder ─────────────────────────────────────────────────────── */

/* The list clips its children for the swipe animation; the lifted card needs to
   escape that so its shadow isn't cut off. */
.ex-list > .ex-item--dragging {
  overflow: visible;
  position: relative;
  z-index: 20;
}

.ex-item--dragging .ex-row {
  background: #16202f;
  transform: scale(1.02);
  box-shadow: 0 14px 30px -10px rgba(0, 0, 0, 0.7);
  cursor: grabbing;
}
</style>