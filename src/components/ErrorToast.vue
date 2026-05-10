<template>
  <Transition
    enter-active-class="transition ease-out duration-200"
    enter-from-class="opacity-0 -translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition ease-in duration-150"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="error"
      :class="['toast', toastClasses]"
    >
      <!-- Icon -->
      <svg class="toast__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path v-if="error.type === 'error' || error.type === 'warning'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
      </svg>

      <!-- Message -->
      <span class="toast__message">{{ error.message }}</span>

      <!-- Close -->
      <button class="toast__close" aria-label="Lukk" @click="closeToast">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useErrorHandler } from '@/composables/useErrorHandler'

interface Props {
  error?: any
  errorId?: string
  autoClose?: boolean
  autoCloseDelay?: number
  showDetails?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  autoClose: true,
  autoCloseDelay: 5000,
  showDetails: false
})

const { globalError, clearError } = useErrorHandler();

// Access the error ID directly
const globalErrorId = globalError.value ? globalError.value.id : null;

// Use props or global error
const error = computed(() => props.error || globalError.value)
const errorId = computed(() => props.errorId || globalErrorId)

// Auto-close functionality
const isVisible = ref(true)
let autoCloseTimer: NodeJS.Timeout | null = null

const startAutoCloseTimer = () => {
  if (props.autoClose && props.autoCloseDelay > 0) {
    autoCloseTimer = setTimeout(() => {
      closeToast()
    }, props.autoCloseDelay)
  }
}

const clearAutoCloseTimer = () => {
  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer)
    autoCloseTimer = null
  }
}

// Watch for error changes
watch(error, (newError) => {
  if (newError) {
    isVisible.value = true
    startAutoCloseTimer()
  }
}, { immediate: true })

// Computed classes
const toastClasses = computed(() => {
  if (!error.value) return ''
  switch (error.value.type) {
    case 'error':   return 'toast--error'
    case 'warning': return 'toast--warning'
    default:        return 'toast--success'
  }
})

// Methods
const closeToast = () => {
  isVisible.value = false
  clearAutoCloseTimer()
  
  // Clear global error if this toast is using it
  if (!props.error) {
    clearError()
  }
}

// Cleanup on unmount
import { onUnmounted } from 'vue'
onUnmounted(() => {
  clearAutoCloseTimer()
})
</script>

<style scoped>
.toast {
  position: fixed;
  top: 0.75rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 92%;
  max-width: 22rem;
  padding: 0.625rem 0.875rem;
  border-radius: 0.625rem;
  box-shadow: 0 4px 16px rgb(0 0 0 / 0.35);
  line-height: 1;
}

.toast--success { background: #16a34a; }
.toast--error   { background: #dc2626; }
.toast--warning { background: #d97706; }

.toast__icon {
  width: 1.125rem;
  height: 1.125rem;
  flex-shrink: 0;
  color: #fff;
}

.toast__message {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 600;
  color: #fff;
  line-height: 1.3;
}

.toast__close {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: none;
  border: none;
  color: rgb(255 255 255 / 0.75);
  cursor: pointer;
  padding: 0.125rem;
  border-radius: 0.25rem;
  transition: color 0.15s;
}

.toast__close:hover {
  color: #fff;
}
</style>
