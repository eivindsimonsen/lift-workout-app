<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" @click="handleBackdropClick">
    <div class="bg-dark-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" @click.stop>
      <div class="p-6">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-semibold text-white">{{ title }}</h3>
          <button 
            @click="handleClose"
            class="text-dark-400 hover:text-white transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Filter Content -->
        <div class="space-y-6">
          <slot />
        </div>

        <!-- Footer -->
        <div class="flex gap-3 justify-end mt-6 pt-6 border-t border-dark-600">
          <button 
            @click="handleClearAll"
            class="btn-secondary"
          >
            Nullstill alle
          </button>
          <button 
            @click="handleApply"
            class="btn-primary"
          >
            {{ applyText }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  isVisible: boolean
  title?: string
  applyText?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Filtre',
  applyText: 'Bruk filtre'
})

const emit = defineEmits<{
  close: []
  apply: []
  clearAll: []
}>()

const handleClose = () => {
  emit('close')
}

const handleApply = () => {
  emit('apply')
}

const handleClearAll = () => {
  emit('clearAll')
}

const handleBackdropClick = () => {
  handleClose()
}
</script>
