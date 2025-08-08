<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-dark-800 rounded-lg p-6 w-full max-w-md">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-semibold text-white">
          {{ isEditing ? 'Rediger Øvelse' : 'Legg til Øvelse' }}
        </h2>
        <button 
          @click="$emit('close')"
          class="text-dark-300 hover:text-white transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Exercise Name -->
        <div>
          <label for="name" class="block text-sm font-medium text-white mb-2">
            Øvelse Navn *
          </label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            required
            class="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:border-primary-500"
            placeholder="F.eks. Barbell Bench Press"
          />
        </div>

        <!-- Muscle Groups -->
        <div>
          <label class="block text-sm font-medium text-white mb-2">
            Muskelgrupper *
          </label>
          <div class="grid grid-cols-2 gap-2">
            <label class="flex items-center">
              <input
                v-model="form.muscleGroups"
                type="checkbox"
                value="chest"
                class="mr-2 text-primary-500 bg-dark-700 border-dark-600 rounded focus:ring-primary-500"
              />
                             <span class="text-white text-sm">Bryst</span>
             </label>
             <label class="flex items-center">
               <input
                 v-model="form.muscleGroups"
                 type="checkbox"
                 value="back"
                 class="mr-2 text-primary-500 bg-dark-700 border-dark-600 rounded focus:ring-primary-500"
               />
               <span class="text-white text-sm">Rygg</span>
             </label>
             <label class="flex items-center">
               <input
                 v-model="form.muscleGroups"
                 type="checkbox"
                 value="legs"
                 class="mr-2 text-primary-500 bg-dark-700 border-dark-600 rounded focus:ring-primary-500"
               />
               <span class="text-white text-sm">Ben</span>
             </label>
             <label class="flex items-center">
               <input
                 v-model="form.muscleGroups"
                 type="checkbox"
                 value="arms"
                 class="mr-2 text-primary-500 bg-dark-700 border-dark-600 rounded focus:ring-primary-500"
               />
               <span class="text-white text-sm">Armer</span>
             </label>
             <label class="flex items-center">
               <input
                 v-model="form.muscleGroups"
                 type="checkbox"
                 value="shoulders"
                 class="mr-2 text-primary-500 bg-dark-700 border-dark-600 rounded focus:ring-primary-500"
               />
               <span class="text-white text-sm">Skuldre</span>
            </label>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-3 pt-4">
          <button
            type="button"
            @click="$emit('close')"
            class="flex-1 px-4 py-2 bg-dark-600 hover:bg-dark-500 text-white rounded-lg transition-colors"
          >
            Avbryt
          </button>
          <button
            type="submit"
            :disabled="!isFormValid || isSubmitting"
            class="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isSubmitting ? 'Lagrer...' : (isEditing ? 'Oppdater' : 'Legg til') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Props {
  exercise?: {
    id: string
    name: string
    muscleGroups: string[]
  } | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  save: [exercise: {
    name: string
    muscleGroups: string[]
  }]
}>()

const isSubmitting = ref(false)
const isEditing = computed(() => !!props.exercise)

const form = ref({
  name: '',
  muscleGroups: [] as string[]
})

// Initialize form with exercise data if editing
watch(() => props.exercise, (exercise) => {
  if (exercise) {
    form.value = {
      name: exercise.name,
      muscleGroups: [...exercise.muscleGroups]
    }
  } else {
    form.value = {
      name: '',
      muscleGroups: []
    }
  }
}, { immediate: true })

const isFormValid = computed(() => {
  return form.value.name.trim() && form.value.muscleGroups.length > 0
})

const handleSubmit = async () => {
  if (!isFormValid.value) return

  console.log('📝 Form data before submit:', {
    name: form.value.name.trim(),
    muscleGroups: form.value.muscleGroups
  })

  isSubmitting.value = true
  
  try {
    emit('save', {
      name: form.value.name.trim(),
      muscleGroups: form.value.muscleGroups
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>
