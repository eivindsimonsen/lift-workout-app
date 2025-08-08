<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4" @click="handleBackdropClick">
    <div class="bg-dark-800 rounded-lg max-w-2xl w-full max-h-[90vh] md:max-h-[80vh] overflow-hidden flex flex-col" @click.stop>
      <!-- Header -->
      <div class="flex items-center justify-between p-6 pb-4">
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
      <div class="flex-1 overflow-y-auto p-6 pt-2 space-y-6" style="-webkit-overflow-scrolling: touch; overscroll-behavior: contain;">
        <slot />
      </div>

      <!-- Footer -->
      <div class="flex gap-3 justify-end p-6 pt-4 border-t border-dark-600 flex-shrink-0 bg-dark-800">
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
