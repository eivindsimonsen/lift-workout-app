import { ref } from 'vue'

interface ConfirmModalConfig {
  title: string
  message: string
  confirmText: string
  cancelText: string
  onConfirm: () => void
  onCancel: () => void
}

// Global state
const showConfirmModal = ref(false)
const confirmModalConfig = ref<ConfirmModalConfig>({
  title: '',
  message: '',
  confirmText: '',
  cancelText: '',
  onConfirm: () => {},
  onCancel: () => {}
})

export function useGlobalModal() {
  const showConfirm = (config: ConfirmModalConfig) => {
    confirmModalConfig.value = config
    showConfirmModal.value = true
  }

  const hideConfirm = () => {
    showConfirmModal.value = false
  }

  return {
    showConfirmModal,
    confirmModalConfig,
    showConfirm,
    hideConfirm
  }
}
