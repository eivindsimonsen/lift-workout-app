import { ref } from 'vue'

interface ConfirmModalConfig {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  onCancel?: () => void
}

export function useConfirmModal() {
  const isVisible = ref(false)
  const config = ref<ConfirmModalConfig>({
    title: 'Bekreftelse',
    message: '',
    confirmText: 'Bekreft',
    cancelText: 'Avbryt'
  })

  const showConfirm = (modalConfig: ConfirmModalConfig): Promise<boolean> => {
    return new Promise((resolve) => {
      config.value = {
        title: 'Bekreftelse',
        confirmText: 'Bekreft',
        cancelText: 'Avbryt',
        ...modalConfig
      }
      
      isVisible.value = true
      
      // Override the callbacks to resolve the promise
      const originalOnConfirm = config.value.onConfirm
      const originalOnCancel = config.value.onCancel
      
      config.value.onConfirm = () => {
        if (originalOnConfirm) {
          originalOnConfirm()
        }
        isVisible.value = false
        resolve(true)
      }
      
      config.value.onCancel = () => {
        if (originalOnCancel) {
          originalOnCancel()
        }
        isVisible.value = false
        resolve(false)
      }
    })
  }

  const hideConfirm = () => {
    isVisible.value = false
  }

  return {
    isVisible,
    config,
    showConfirm,
    hideConfirm
  }
}
