<script setup lang="ts">
// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------
import { ref, computed, watch } from 'vue'
import SlideOver from '@/components/SlideOver.vue'
import { useExercises } from '@/composables/useExercises'
import { STRENGTH_MUSCLE_GROUP_NAMES, CARDIO_GROUP_NAME } from '@/composables/useTrainingGoals'
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

// Derived from muscle-groups.json so a new group (e.g. Kondisjon) shows up
// everywhere at once instead of drifting out of sync with a hardcoded list.
const CATEGORIES = muscleGroupsData.muscleGroups.map((g) => g.name)

const CATEGORY_COLORS: Record<string, string> = {
  ...Object.fromEntries(muscleGroupsData.muscleGroups.map((g) => [g.name, g.color])),
  Annet: '#6b7280',
}

// Same category order used throughout the app (Exercises.vue, ExerciseSearchPanel.vue).
const CATEGORY_ORDER = [...CATEGORIES, 'Annet']

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const exercisesStore = useExercises()

const isVariant = computed(() => props.variant != null)

/**
 * Cardio always belongs to Kondisjon and strength never does. Same rule as in
 * ExerciseForm: a strength exercise under Kondisjon drops out of the week stats.
 */
const isCardio = computed(() => props.exercise?.trackingType === 'cardio')
const categoryOptions = computed(() =>
  isCardio.value ? [CARDIO_GROUP_NAME] : STRENGTH_MUSCLE_GROUP_NAMES
)

/** All exercise groups available as parent options for variants. */
const allGroups = computed<ExerciseData[]>(() => exercisesStore.exercises.value)

/**
 * Parent-group options for the picker, grouped by muscle category and
 * alphabetised within each — a flat, unsorted list was hard to scan for a
 * specific group.
 */
const groupedAllGroups = computed(() => {
  const map = new Map<string, ExerciseData[]>()
  for (const group of allGroups.value) {
    const cat = group.category || 'Annet'
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(group)
  }
  return CATEGORY_ORDER.filter((cat) => map.has(cat)).map((cat) => ({
    category: cat,
    groups: map.get(cat)!.sort((a, b) => a.name.localeCompare(b.name, 'no')),
  }))
})

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

// Deletion
const isSaving = ref(false)
const isDeleting = ref(false)
const confirmDelete = ref(false)

const drawerTitle = computed(() => isVariant.value ? 'Rediger variant' : 'Rediger øvelsegruppe')
const canSave = computed(() =>
  name.value.trim().length > 0 && (isVariant.value || selectedCategory.value.length > 0)
)

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
      // A category that doesn't fit the tracking type is replaced, so saving
      // fixes the mismatch instead of keeping it.
      selectedCategory.value = categoryOptions.value.includes(props.exercise.category)
        ? props.exercise.category
        : isCardio.value ? CARDIO_GROUP_NAME : ''
    }
  },
  { immediate: true }
)

// ---------------------------------------------------------------------------
// Methods
// ---------------------------------------------------------------------------

const close = () => emit('update:visible', false)

const save = async () => {
  if (!canSave.value) return
  const trimmedName = name.value.trim()

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
            <div v-for="section in groupedAllGroups" :key="section.category" class="ef__group-section">
              <div
                class="ef__group-section-header"
                :style="{ '--cat-color': getCategoryColor(section.category) }"
              >
                <span class="ef__group-section-dot"></span>
                <span>{{ section.category }}</span>
              </div>
              <button
                v-for="group in section.groups"
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
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Group: category selector -->
      <div v-else class="ef__field">
        <label class="ef__label" for="ef-category">Muskeltype</label>
        <select
          id="ef-category"
          v-model="selectedCategory"
          class="input-field w-full"
          :disabled="isCardio"
        >
          <option value="" disabled>Velg muskeltype</option>
          <option v-for="cat in categoryOptions" :key="cat" :value="cat">{{ cat }}</option>
        </select>
        <p v-if="isCardio" class="ef__note">Kondisjonsøvelser havner alltid i Kondisjon.</p>
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
          <button class="btn-secondary" type="button" @click="confirmDelete = false">Avbryt</button>
          <button class="btn-danger" type="button" :disabled="isDeleting" @click="deleteItem">
            {{ isDeleting ? 'Sletter…' : 'Ja, slett' }}
          </button>
        </template>

        <!-- Normal footer: closing the slide-over is how you cancel -->
        <template v-else>
          <button class="btn-danger-outline" type="button" @click="confirmDelete = true">
            {{ isVariant ? 'Slett variant' : 'Slett gruppe' }}
          </button>
          <button
            class="btn-primary"
            type="button"
            :disabled="isSaving || !canSave"
            @click="save"
          >
            {{ isSaving ? 'Lagrer…' : 'Lagre endringer' }}
          </button>
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

.ef__note {
  font-size: 0.6875rem;
  color: #64748b;
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

.ef__group-section:not(:last-child) {
  margin-bottom: 0.5rem;
}

.ef__group-section-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.375rem 0.625rem 0.25rem;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #6b7280;
}

.ef__group-section-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background: var(--cat-color, #6b7280);
  flex-shrink: 0;
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

/* Footer: full-size buttons share the row and wrap onto their own rows
   when the labels don't fit side by side (narrow phones). */
.ef__footer {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.ef__footer button {
  flex: 1 1 auto;
  padding-inline: 0.875rem;
}

.ef__footer-confirm-label {
  flex: 1 1 100%;
  font-size: 0.8125rem;
  color: #9ca3af;
}
</style>
