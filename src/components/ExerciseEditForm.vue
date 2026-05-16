<script setup lang="ts">
// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------
import { ref, computed, watch } from 'vue'
import SlideOver from '@/components/SlideOver.vue'
import { useExercises } from '@/composables/useExercises'
import muscleGroupsData from '@/data/muscle-groups.json'
import type { ExerciseData, ExerciseVariant } from '@/types/workout'

// ---------------------------------------------------------------------------
// Props / Emits
// ---------------------------------------------------------------------------

interface Props {
  visible: boolean
  /** Provide when editing a variant. */
  variant?: ExerciseVariant | null
  /** The current parent exercise group ID when editing a variant. */
  parentExerciseId?: number | null
  /** Provide when editing a main exercise group. */
  exercise?: ExerciseData | null
}

const props = withDefaults(defineProps<Props>(), {
  variant: null,
  parentExerciseId: null,
  exercise: null,
})

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'saved'): void
  (e: 'deleted'): void
}>()

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
// State
// ---------------------------------------------------------------------------

const exercisesStore = useExercises()

const isVariant = computed(() => props.variant != null)

/** All exercise groups available as parent options for variants. */
const allGroups = computed<ExerciseData[]>(() =>
  exercisesStore.exercises.value.slice().sort((a, b) => a.name.localeCompare(b.name, 'no'))
)

// Form fields
const name = ref('')
const selectedParentId = ref<number | null>(null)
const selectedCategory = ref('')
const selectedWorkoutTypes = ref<string[]>([])

// Deletion
const isSaving = ref(false)
const isDeleting = ref(false)
const confirmDelete = ref(false)

/** The category of the currently selected parent group (for variant mode, shown as a read-only badge). */
const derivedCategory = computed<string>(() => {
  if (!isVariant.value || selectedParentId.value == null) return ''
  return allGroups.value.find(g => g.id === selectedParentId.value)?.category ?? ''
})

const categoryColor = computed<string>(() => {
  const cat = isVariant.value ? derivedCategory.value : selectedCategory.value
  return (muscleGroupsData.muscleGroups as any[]).find(
    mg => mg.name.toLowerCase() === cat.toLowerCase()
  )?.color ?? '#6b7280'
})

const drawerTitle = computed(() => isVariant.value ? 'Rediger variant' : 'Rediger øvelsegruppe')

// Populate form when props change
watch(
  [() => props.variant, () => props.exercise, () => props.visible],
  () => {
    if (!props.visible) return
    confirmDelete.value = false

    if (isVariant.value && props.variant) {
      name.value = props.variant.name
      selectedParentId.value = props.parentExerciseId ?? null
    } else if (props.exercise) {
      name.value = props.exercise.name
      selectedCategory.value = props.exercise.category
      selectedWorkoutTypes.value = [...(props.exercise.workoutTypes ?? [])]
    }
  },
  { immediate: true }
)

// ---------------------------------------------------------------------------
// Methods
// ---------------------------------------------------------------------------

const close = () => emit('update:visible', false)

const save = async () => {
  const trimmedName = name.value.trim()
  if (!trimmedName) return

  isSaving.value = true

  if (isVariant.value && props.variant && props.parentExerciseId != null) {
    const payload: { name: string; exerciseId?: number } = { name: trimmedName }
    if (selectedParentId.value != null && selectedParentId.value !== props.parentExerciseId) {
      payload.exerciseId = selectedParentId.value
    }
    const ok = await exercisesStore.updateVariant(props.variant.id, props.parentExerciseId, payload)
    if (ok) emit('saved')
  } else if (!isVariant.value && props.exercise) {
    const ok = await exercisesStore.updateExercise(props.exercise.id, {
      name: trimmedName,
      category: selectedCategory.value,
      workoutTypes: selectedWorkoutTypes.value,
    })
    if (ok) emit('saved')
  }

  isSaving.value = false
}

const deleteItem = async () => {
  isDeleting.value = true

  if (isVariant.value && props.variant && props.parentExerciseId != null) {
    const ok = await exercisesStore.deleteVariant(props.variant.id, props.parentExerciseId)
    if (ok) emit('deleted')
  } else if (!isVariant.value && props.exercise) {
    const ok = await exercisesStore.deleteExercise(props.exercise.id)
    if (ok) emit('deleted')
  }

  isDeleting.value = false
}
</script>

<template>
  <SlideOver :is-open="visible" :title="drawerTitle" @close="close">
    <div class="ef">

      <!-- Name -->
      <div class="ef__field">
        <label class="ef__label" for="ef-name">Navn</label>
        <input
          id="ef-name"
          v-model="name"
          class="input-field"
          :placeholder="isVariant ? 'f.eks. Barbell Bench Press' : 'f.eks. Bench Press'"
          @keydown.enter="save"
        />
      </div>

      <!-- Variant: parent group selector -->
      <div v-if="isVariant" class="ef__field">
        <label class="ef__label" for="ef-parent">Øvelsegruppe</label>
        <select id="ef-parent" v-model="selectedParentId" class="input-field w-full">
          <option :value="null" disabled>Velg gruppe</option>
          <option v-for="group in allGroups" :key="group.id" :value="group.id">
            {{ group.name }}
          </option>
        </select>
        <!-- Derived category badge -->
        <span
          v-if="derivedCategory"
          class="ef__badge"
          :style="{ background: categoryColor + '22', color: categoryColor, borderColor: categoryColor + '44' }"
        >
          {{ derivedCategory }}
        </span>
      </div>

      <!-- Group: category selector -->
      <div v-else class="ef__field">
        <label class="ef__label" for="ef-category">Muskeltype</label>
        <select id="ef-category" v-model="selectedCategory" class="input-field w-full">
          <option value="" disabled>Velg muskeltype</option>
          <option v-for="cat in CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
        </select>
      </div>

      <!-- Group: workout types -->
      <div v-if="!isVariant" class="ef__field">
        <label class="ef__label">Treningstype(r)</label>
        <div class="ef__checkbox-group">
          <label
            v-for="wt in WORKOUT_TYPE_OPTIONS"
            :key="wt.id"
            class="ef__checkbox-item"
          >
            <input v-model="selectedWorkoutTypes" type="checkbox" :value="wt.id" />
            <span>{{ wt.label }}</span>
          </label>
        </div>
      </div>

    </div>

    <!-- Footer -->
    <template #footer>
      <div class="ef__footer">

        <!-- Confirm delete state -->
        <template v-if="confirmDelete">
          <span class="ef__footer-confirm-label">
            {{ isVariant ? 'Slett varianten permanent?' : 'Slett gruppen og alle varianter?' }}
          </span>
          <div class="ef__footer-actions">
            <button class="btn-secondary btn-sm" type="button" @click="confirmDelete = false">Avbryt</button>
            <button class="btn-danger btn-sm" type="button" :disabled="isDeleting" @click="deleteItem">
              {{ isDeleting ? 'Sletter…' : 'Ja, slett' }}
            </button>
          </div>
        </template>

        <!-- Normal footer -->
        <template v-else>
          <button class="btn-secondary btn-sm" type="button" @click="close">Avbryt</button>
          <div class="ef__footer-actions">
            <button class="btn-danger-outline btn-sm" type="button" @click="confirmDelete = true">
              {{ isVariant ? 'Slett variant' : 'Slett gruppe' }}
            </button>
            <button
              class="btn-primary btn-sm"
              type="button"
              :disabled="isSaving || !name.trim()"
              @click="save"
            >
              {{ isSaving ? 'Lagrer…' : 'Lagre endringer' }}
            </button>
          </div>
        </template>

      </div>
    </template>
  </SlideOver>
</template>

<style scoped>
.ef {
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.ef__field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ef__label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #d1d5db;
}

.ef__badge {
  display: inline-flex;
  align-self: flex-start;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.625rem;
  border-radius: 999px;
  border: 1px solid;
}

.ef__checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.ef__checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  color: #d1d5db;
  cursor: pointer;
  padding: 0.375rem 0.75rem;
  background: #1f2937;
  border: 1px solid #374151;
  border-radius: 0.5rem;
  transition: background 0.15s, border-color 0.15s;
}

.ef__checkbox-item:has(input:checked) {
  background: #f9731620;
  border-color: #f9731650;
  color: #f97316;
}

.ef__checkbox-item input {
  display: none;
}

.ef__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.ef__footer-confirm-label {
  font-size: 0.8125rem;
  color: #9ca3af;
  flex: 1;
}

.ef__footer-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
</style>
