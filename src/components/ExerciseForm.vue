<script setup lang="ts">
// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------
import { ref, computed, watch } from 'vue'
import SlideOver from '@/components/SlideOver.vue'
import { useExercises } from '@/composables/useExercises'
import { useHybridData } from '@/composables/useHybridData'
import type { ExerciseData, ExerciseVariant } from '@/types/workout'

// ---------------------------------------------------------------------------
// Props / Emits
// ---------------------------------------------------------------------------

interface Props {
  visible: boolean
  /** Pass an exercise to edit it; omit / null to create a new one. */
  exercise?: ExerciseData | null
}

const props = withDefaults(defineProps<Props>(), {
  exercise: null,
})

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'saved', exercise: ExerciseData): void
  (e: 'deleted', exerciseId: number): void
}>()

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const exercisesStore = useExercises()
const workoutData = useHybridData()

const isEditMode = computed(() => props.exercise != null)

const isSaving = ref(false)
const isDeletingExercise = ref(false)
const confirmDeleteId = ref<'exercise' | number | null>(null)

// Main exercise form fields
const exerciseForm = ref({ name: '', category: '', workoutTypes: [] as string[] })

// ---- Pending variants (create mode: local list until user hits "Opprett") ----
interface PendingVariant {
  tempId: number
  name: string
  equipment: string
}
const pendingVariants = ref<PendingVariant[]>([])

// ---- Shared new-variant input (create → pending; edit → Supabase) ----
const newVariantName = ref('')

// ---- Inline variant editing (edit mode only) ----
const editingVariantId = ref<number | null>(null)
const editVariantName = ref('')

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES = [
  'Bryst', 'Rygg', 'Ben', 'Skuldre',
  'Biceps', 'Triceps', 'Kjerne', 'Legger', 'Annet',
]

const WORKOUT_TYPE_OPTIONS = [
  { id: 'push',      label: 'Push' },
  { id: 'pull',      label: 'Pull' },
  { id: 'legs',      label: 'Legs' },
  { id: 'upper',     label: 'Upper' },
  { id: 'lower',     label: 'Lower' },
  { id: 'full-body', label: 'Full Body' },
]

// ---------------------------------------------------------------------------
// Computed
// ---------------------------------------------------------------------------

const drawerTitle = computed(() => isEditMode.value ? 'Rediger øvelsegruppe' : 'Ny øvelsegruppe')
const currentVariants = computed<ExerciseVariant[]>(() => props.exercise?.variants ?? [])
const canSave = computed(() =>
  exerciseForm.value.name.trim().length > 0 && exerciseForm.value.category.length > 0
)

// ---------------------------------------------------------------------------
// Watchers
// ---------------------------------------------------------------------------

// Reset / populate form whenever the drawer opens or the exercise prop changes
watch(
  () => [props.visible, props.exercise],
  () => {
    if (!props.visible) return
    exerciseForm.value = props.exercise
      ? { name: props.exercise.name, category: props.exercise.category, workoutTypes: [...props.exercise.workoutTypes] }
      : { name: '', category: '', workoutTypes: [] }
    resetVariantForm()
    pendingVariants.value = []
    confirmDeleteId.value = null
  },
  { immediate: true }
)

// ---------------------------------------------------------------------------
// Methods – drawer
// ---------------------------------------------------------------------------

const close = () => emit('update:visible', false)

// ---------------------------------------------------------------------------
// Methods – exercise CRUD
// ---------------------------------------------------------------------------

const saveExercise = async () => {
  if (!canSave.value) return
  isSaving.value = true
  try {
    const payload = {
      name: exerciseForm.value.name.trim(),
      category: exerciseForm.value.category,
      workoutTypes: exerciseForm.value.workoutTypes,
    }

    if (isEditMode.value && props.exercise) {
      const ok = await exercisesStore.updateExercise(props.exercise.id, payload)
      if (ok) {
        emit('saved', { ...props.exercise, ...payload })
        close()
      }
    } else {
      const userId = workoutData.currentUser.value?.id
      if (!userId) return
      const created = await exercisesStore.createExercise(userId, payload)
      if (created) {
        // Persist all pending variants in one pass
        for (const pv of pendingVariants.value) {
          await exercisesStore.createVariant(
            created.id,
            userId,
            { name: pv.name, equipment: pv.equipment || undefined }
          )
        }
        // Grab the fully populated exercise (with variants) from the store
        const withVariants = exercisesStore.exercises.value.find(e => e.id === created.id) ?? created
        emit('saved', withVariants)
        close()
      }
    }
  } finally {
    isSaving.value = false
  }
}

const deleteExercise = async () => {
  if (!props.exercise || confirmDeleteId.value !== 'exercise') return
  isDeletingExercise.value = true
  try {
    const ok = await exercisesStore.deleteExercise(props.exercise.id)
    if (ok) {
      emit('deleted', props.exercise.id)
      close()
    }
  } finally {
    isDeletingExercise.value = false
    confirmDeleteId.value = null
  }
}

// ---------------------------------------------------------------------------
// Methods – variant CRUD
// ---------------------------------------------------------------------------

const resetVariantForm = () => {
  newVariantName.value = ''
  editingVariantId.value = null
  editVariantName.value = ''
}

/**
 * Create mode  → adds to local pendingVariants list (nothing saved yet).
 * Edit mode    → immediately persists the new variant to Supabase.
 */
const addVariant = async () => {
  if (!newVariantName.value.trim()) return

  if (isEditMode.value && props.exercise) {
    const variantUserId = workoutData.currentUser.value?.id ?? props.exercise.userId
    await exercisesStore.createVariant(
      props.exercise.id,
      variantUserId ?? null,
      { name: newVariantName.value }
    )
  } else {
    pendingVariants.value.push({
      tempId: Date.now(),
      name: newVariantName.value.trim(),
      equipment: '',
    })
  }

  newVariantName.value = ''
}

const removePendingVariant = (tempId: number) => {
  pendingVariants.value = pendingVariants.value.filter(v => v.tempId !== tempId)
}

const startEditVariant = (variant: ExerciseVariant) => {
  editingVariantId.value = variant.id
  editVariantName.value = variant.name
}

const saveVariantEdit = async () => {
  if (!props.exercise || editingVariantId.value === null || !editVariantName.value.trim()) return
  await exercisesStore.updateVariant(editingVariantId.value, props.exercise.id, {
    name: editVariantName.value,
  })
  resetVariantForm()
}

const deleteVariant = async (variant: ExerciseVariant) => {
  if (!props.exercise || confirmDeleteId.value !== variant.id) return
  await exercisesStore.deleteVariant(variant.id, props.exercise.id)
  confirmDeleteId.value = null
}
</script>

<template>
  <SlideOver :is-open="visible" :title="drawerTitle" @close="close">

    <div class="exercise-form">

      <!-- Create-mode explainer -->
      <!-- <div v-if="!isEditMode" class="exercise-form__create-hint">
        <svg class="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-sm leading-relaxed">
          En <strong>øvelsegruppe</strong> (f.eks. «Knebøy») samler
          <strong>varianter</strong> (f.eks. «Stang», «Goblet»).
          Det er variantene som velges i treningsprogrammer.
          Du kan legge til varianter allerede nå.
        </p>
      </div> -->

      <!-- ------------------------------------------------------------------ -->
      <!-- Group info                                                           -->
      <!-- ------------------------------------------------------------------ -->
      <section class="exercise-form__section">
        <h3 class="exercise-form__section-title">Øvelsegruppe</h3>

        <div class="exercise-form__field">
          <label class="exercise-form__label" for="ex-name">Navn *</label>
          <input
            id="ex-name"
            v-model="exerciseForm.name"
            type="text"
            class="input-field w-full"
            placeholder="F.eks. Knebøy"
            autofocus
          />
        </div>

        <div class="exercise-form__field">
          <label class="exercise-form__label" for="ex-category">Muskelgruppe *</label>
          <select
            id="ex-category"
            v-model="exerciseForm.category"
            class="input-field w-full"
          >
            <option value="" disabled>Velg muskelgruppe</option>
            <option v-for="cat in CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>

        <div class="exercise-form__field">
          <label class="exercise-form__label">Treningstype(r)</label>
          <div class="exercise-form__checkbox-group">
            <label
              v-for="wt in WORKOUT_TYPE_OPTIONS"
              :key="wt.id"
              class="exercise-form__checkbox-item"
            >
              <input
                v-model="exerciseForm.workoutTypes"
                type="checkbox"
                :value="wt.id"
              />
              <span>{{ wt.label }}</span>
            </label>
          </div>
        </div>
      </section>

      <!-- ------------------------------------------------------------------ -->
      <!-- Variants (create mode only — in edit mode, variants are managed    -->
      <!-- inline on the Øvelser page)                                        -->
      <!-- ------------------------------------------------------------------ -->
      <section v-if="!isEditMode" class="exercise-form__section">
        <div class="exercise-form__variants-header">
          <h3 class="exercise-form__section-title">Varianter</h3>
          <span class="exercise-form__variants-hint">Det er varianter som velges i treningsprogrammer</span>
        </div>

        <!-- EDIT MODE: persisted variants with inline edit / delete -->
        <template v-if="isEditMode">
          <div v-if="currentVariants.length > 0" class="exercise-form__variants">
            <div
              v-for="variant in currentVariants"
              :key="variant.id"
              class="exercise-form__variant-row"
            >
              <template v-if="editingVariantId !== variant.id">
                <div class="exercise-form__variant-info">
                  <span class="exercise-form__variant-name">{{ variant.name }}</span>
                </div>

                <div class="exercise-form__variant-actions">
                  <button
                    class="exercise-form__icon-btn exercise-form__icon-btn--edit"
                    title="Rediger variant"
                    @click="startEditVariant(variant)"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  <button
                    v-if="confirmDeleteId !== variant.id"
                    class="exercise-form__icon-btn exercise-form__icon-btn--delete"
                    title="Slett variant"
                    @click="confirmDeleteId = variant.id"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <template v-else>
                    <button class="exercise-form__icon-btn exercise-form__icon-btn--confirm" @click="deleteVariant(variant)">
                      Slett?
                    </button>
                    <button class="exercise-form__icon-btn" @click="confirmDeleteId = null">Avbryt</button>
                  </template>
                </div>
              </template>

              <!-- Inline edit form -->
              <template v-else>
                <div class="exercise-form__variant-edit">
                  <input
                    v-model="editVariantName"
                    type="text"
                    class="input-field flex-1"
                    placeholder="Variantnavn"
                    @keydown.enter="saveVariantEdit"
                    @keydown.escape="resetVariantForm"
                  />
                  <button class="exercise-form__icon-btn exercise-form__icon-btn--save" title="Lagre" @click="saveVariantEdit">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button class="exercise-form__icon-btn" title="Avbryt" @click="resetVariantForm">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </template>
            </div>
          </div>
          <p v-else class="exercise-form__empty-variants">Ingen varianter ennå.</p>
        </template>

        <!-- CREATE MODE: local pending list (not yet saved) -->
        <template v-else>
          <div v-if="pendingVariants.length > 0" class="exercise-form__variants">
            <div
              v-for="pv in pendingVariants"
              :key="pv.tempId"
              class="exercise-form__variant-row"
            >
              <div class="exercise-form__variant-info">
                <span class="exercise-form__variant-name">{{ pv.name }}</span>
              </div>
              <button
                class="exercise-form__icon-btn exercise-form__icon-btn--delete"
                title="Fjern"
                @click="removePendingVariant(pv.tempId)"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
          <p v-else class="exercise-form__empty-variants">Ingen varianter lagt til ennå.</p>
        </template>

        <!-- Add variant input (both modes) -->
        <div class="exercise-form__add-variant">
          <label class="exercise-form__label">Legg til variant</label>
          <div class="exercise-form__add-variant-inputs">
            <input
              v-model="newVariantName"
              type="text"
              class="input-field flex-1"
              placeholder="F.eks. Barbell squat"
              @keydown.enter="addVariant"
            />
            <button
              class="btn-primary text-sm px-3 py-2 flex-shrink-0"
              :disabled="!newVariantName.trim()"
              type="button"
              @click="addVariant"
            >
              + Legg til
            </button>
          </div>
        </div>
      </section>

    </div>

    <!-- Footer -->
    <template #footer>
      <div class="exercise-form__footer">

        <!-- Confirm delete state: replaces everything -->
        <template v-if="isEditMode && confirmDeleteId === 'exercise'">
          <span class="exercise-form__footer-confirm-label">Sikker på at du vil slette gruppen?</span>
          <div class="exercise-form__footer-actions">
            <button class="btn-secondary btn-sm" type="button" @click="confirmDeleteId = null">
              Avbryt
            </button>
            <button
              class="btn-danger btn-sm"
              :disabled="isDeletingExercise"
              type="button"
              @click="deleteExercise"
            >
              {{ isDeletingExercise ? 'Sletter...' : 'Ja, slett' }}
            </button>
          </div>
        </template>

        <!-- Normal footer -->
        <template v-else>
          <button class="btn-secondary btn-sm" type="button" @click="close">Avbryt</button>
          <div class="exercise-form__footer-actions">
            <button
              v-if="isEditMode"
              class="btn-danger-outline btn-sm"
              :disabled="isDeletingExercise"
              type="button"
              @click="confirmDeleteId = 'exercise'"
            >
              Slett gruppe
            </button>
            <button
              class="btn-primary btn-sm"
              :disabled="!canSave || isSaving"
              type="button"
              @click="saveExercise"
            >
              {{ isSaving
                ? (isEditMode ? 'Lagrer...' : 'Oppretter...')
                : isEditMode
                  ? 'Lagre endringer'
                  : pendingVariants.length > 0
                    ? `Opprett gruppe + ${pendingVariants.length} variant${pendingVariants.length !== 1 ? 'er' : ''}`
                    : 'Opprett gruppe'
              }}
            </button>
          </div>
        </template>

      </div>
    </template>

  </SlideOver>
</template>

<style scoped>
.exercise-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding-bottom: 1rem;
}

/* Create hint */
.exercise-form__create-hint {
  display: flex;
  gap: 0.625rem;
  align-items: flex-start;
  background: rgb(59 130 246 / 0.08);
  border: 1px solid rgb(59 130 246 / 0.2);
  border-radius: 0.5rem;
  padding: 0.75rem;
  color: #93c5fd;
}

.exercise-form__create-hint strong {
  color: #bfdbfe;
}

/* Section */
.exercise-form__section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.exercise-form__section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #fff;
  border-bottom: 1px solid #374151;
  padding-bottom: 0.5rem;
}

.exercise-form__variants-header {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.exercise-form__variants-hint {
  font-size: 0.75rem;
  color: #6b7280;
}

/* Fields */
.exercise-form__field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.exercise-form__label {
  font-size: 0.875rem;
  color: #d1d5db;
}

.exercise-form__checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.exercise-form__checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  color: #e5e7eb;
  cursor: pointer;
}

.exercise-form__checkbox-item input[type="checkbox"] {
  width: 1rem;
  height: 1rem;
  accent-color: var(--color-primary-500, #f97316);
}

/* Variant list */
.exercise-form__variants {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.exercise-form__variant-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #111827;
  border: 1px solid #374151;
  border-radius: 0.5rem;
  padding: 0.625rem 0.75rem;
  gap: 0.5rem;
}

.exercise-form__variant-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1;
  min-width: 0;
}

.exercise-form__variant-name {
  font-size: 0.875rem;
  color: #fff;
  font-weight: 500;
}


.exercise-form__variant-actions {
  display: flex;
  gap: 0.375rem;
  flex-shrink: 0;
}

.exercise-form__variant-edit {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex: 1;
  flex-wrap: wrap;
}

/* Icon buttons */
.exercise-form__icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  height: 2rem;
  padding: 0 0.375rem;
  border-radius: 0.375rem;
  border: 1px solid #374151;
  background: transparent;
  color: #9ca3af;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  flex-shrink: 0;
}

.exercise-form__icon-btn:hover { background: #374151; color: #fff; }
.exercise-form__icon-btn--edit:hover { color: #60a5fa; border-color: #60a5fa; }
.exercise-form__icon-btn--delete:hover { color: #f87171; border-color: #f87171; }
.exercise-form__icon-btn--confirm { color: #f87171; border-color: #f87171; font-weight: 600; }
.exercise-form__icon-btn--save:hover { color: #34d399; border-color: #34d399; }

.exercise-form__empty-variants {
  font-size: 0.875rem;
  color: #6b7280;
  font-style: italic;
}

/* Add-variant input row */
.exercise-form__add-variant {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.exercise-form__add-variant-inputs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: flex-start;
}

/* Footer */
.exercise-form__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}


.exercise-form__footer-confirm-label {
  font-size: 0.8125rem;
  color: #9ca3af;
  flex: 1;
}

.exercise-form__footer-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
</style>
