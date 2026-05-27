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
  'Biceps', 'Triceps', 'Kjerne',
]

const CATEGORY_COLORS: Record<string, string> = {
  ...Object.fromEntries(muscleGroupsData.muscleGroups.map((g) => [g.name, g.color])),
  Annet: '#6b7280',
}

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

const selectedGroup = computed(() =>
  allGroups.value.find((g) => g.id === selectedParentId.value) ?? null
)

const isGroupPickerOpen = ref(false)

const getCategoryColor = (category: string): string =>
  CATEGORY_COLORS[category] ?? '#6b7280'

const toggleGroupPicker = () => {
  isGroupPickerOpen.value = !isGroupPickerOpen.value
}

const selectGroup = (groupId: number) => {
  selectedParentId.value = groupId
  isGroupPickerOpen.value = false
}

// Form fields
const name = ref('')
const selectedParentId = ref<number | null>(null)
const selectedCategory = ref('')
const selectedWorkoutTypes = ref<string[]>([])

// Deletion
const isSaving = ref(false)
const isDeleting = ref(false)
const confirmDelete = ref(false)

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
      isGroupPickerOpen.value = false
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
        <label class="ef__label">Øvelsegruppe</label>

        <div class="ef__group-picker">
          <button
            type="button"
            class="ef__selected-group"
            :class="{ 'ef__selected-group--open': isGroupPickerOpen }"
            :style="selectedGroup ? { '--cat-color': getCategoryColor(selectedGroup.category) } : undefined"
            :aria-expanded="isGroupPickerOpen"
            aria-haspopup="listbox"
            @click="toggleGroupPicker"
          >
            <span
              v-if="selectedGroup"
              class="ef__selected-group-dot"
            ></span>
            <span
              class="ef__selected-group-name"
              :class="{ 'ef__selected-group-name--placeholder': !selectedGroup }"
            >
              {{ selectedGroup?.name ?? 'Velg gruppe' }}
            </span>
            <span v-if="selectedGroup" class="ef__selected-group-category">
              {{ selectedGroup.category }}
            </span>
            <svg
              class="ef__selected-group-chevron"
              :class="{ 'ef__selected-group-chevron--open': isGroupPickerOpen }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div
            v-if="isGroupPickerOpen"
            class="ef__group-list"
            role="listbox"
            aria-label="Velg øvelsegruppe"
          >
            <button
              v-for="group in allGroups"
              :key="group.id"
              type="button"
              role="option"
              class="ef__group-option"
              :class="{ 'ef__group-option--selected': group.id === selectedParentId }"
              :aria-selected="group.id === selectedParentId"
              :style="{ '--cat-color': getCategoryColor(group.category) }"
              @click="selectGroup(group.id)"
            >
              <span class="ef__group-option-dot"></span>
              <span class="ef__group-option-name">{{ group.name }}</span>
              <span class="ef__group-option-category">{{ group.category }}</span>
            </button>
          </div>
        </div>
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

.ef__selected-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.625rem 0.75rem;
  background: #111827;
  border: 1px solid #374151;
  border-radius: 0.5rem;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, border-color 0.15s;
}

.ef__selected-group:hover {
  background: #1a2232;
  border-color: #4b5563;
}

.ef__selected-group--open {
  border-color: rgb(249 115 22 / 0.4);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  background: #1a2232;
}

.ef__selected-group-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background: var(--cat-color, #6b7280);
  flex-shrink: 0;
}

.ef__selected-group-name {
  flex: 1;
  min-width: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #f3f4f6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ef__selected-group-name--placeholder {
  color: #6b7280;
  font-weight: 500;
}

.ef__selected-group-category {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--cat-color, #9ca3af);
  flex-shrink: 0;
}

.ef__selected-group-chevron {
  width: 1rem;
  height: 1rem;
  color: #6b7280;
  flex-shrink: 0;
  transition: transform 0.15s ease;
}

.ef__selected-group-chevron--open {
  transform: rotate(180deg);
  color: #f97316;
}

.ef__group-picker {
  display: flex;
  flex-direction: column;
}

.ef__group-list {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  max-height: 18rem;
  overflow-y: auto;
  padding: 0.25rem;
  background: #0f1419;
  border: 1px solid rgb(249 115 22 / 0.4);
  border-top: none;
  border-radius: 0 0 0.5rem 0.5rem;
}

.ef__group-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.625rem;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 0.375rem;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, border-color 0.15s;
}

.ef__group-option:hover {
  background: #1f2937;
}

.ef__group-option--selected {
  background: rgb(249 115 22 / 0.1);
  border-color: rgb(249 115 22 / 0.25);
}

.ef__group-option-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background: var(--cat-color, #6b7280);
  flex-shrink: 0;
}

.ef__group-option-name {
  flex: 1;
  min-width: 0;
  font-size: 0.875rem;
  color: #f3f4f6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ef__group-option-category {
  font-size: 0.6875rem;
  font-weight: 600;
  color: #6b7280;
  flex-shrink: 0;
}

.ef__group-option--selected .ef__group-option-category {
  color: var(--cat-color, #9ca3af);
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
  gap: 0.375rem;
}

.ef__footer button {
  white-space: nowrap;
  flex-shrink: 0;
}

.ef__footer .btn-sm {
  padding-inline: 0.625rem !important;
}

.ef__footer-confirm-label {
  font-size: 0.8125rem;
  color: #9ca3af;
  flex: 1;
  min-width: 0;
}

.ef__footer-actions {
  display: flex;
  gap: 0.375rem;
  align-items: center;
  flex-shrink: 0;
}

@media (max-width: 420px) {
  .ef__footer {
    flex-wrap: wrap;
  }

  .ef__footer > .btn-secondary {
    flex: 1 1 100%;
  }

  .ef__footer-actions {
    flex: 1 1 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
</style>
