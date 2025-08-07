<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" @click="handleBackdropClick">
    <div class="bg-dark-800 rounded-lg max-w-md w-full p-6" @click.stop>
      <div class="text-center">
        <h3 class="text-xl font-semibold text-white mb-4">{{ title }}</h3>
        <p class="text-dark-300 mb-6">{{ message }}</p>
        <div class="flex gap-3 justify-center">
          <button 
            @click="handleCancel"
            class="btn-secondary"
          >
            {{ cancelText }}
          </button>
          <button 
            @click="handleConfirm"
            class="btn-primary"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  isVisible: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  onCancel?: () => void
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Bekreftelse',
  confirmText: 'Bekreft',
  cancelText: 'Avbryt'
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const handleConfirm = () => {
  if (props.onConfirm) {
    props.onConfirm()
  }
  emit('confirm')
}

const handleCancel = () => {
  if (props.onCancel) {
    props.onCancel()
  }
  emit('cancel')
}

const handleBackdropClick = () => {
  handleCancel()
}
</script>
