<template>
  <Transition
    enter-active-class="transition ease-out duration-300"
    enter-from-class="transform translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
    enter-to-class="transform translate-y-0 opacity-100 sm:translate-x-0"
    leave-active-class="transition ease-in duration-100"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="error"
      class="fixed z-50 max-w-sm w-full mx-4 sm:mx-0"
      :class="toastPosition"
    >
      <div
        class="rounded-lg p-4 shadow-lg border"
        :class="toastClasses"
      >
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <svg
              v-if="error.type === 'error'"
              class="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <svg
              v-else-if="error.type === 'warning'"
              class="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <svg
              v-else
              class="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <div class="ml-3 flex-1">
            <p class="text-sm font-semibold" :class="textClasses">
              {{ error.message }}
            </p>
            
            <div v-if="error.details && showDetails" class="mt-2">
              <details class="text-xs">
                <summary class="cursor-pointer text-white hover:text-gray-200">
                  Vis tekniske detaljer
                </summary>
                <div class="mt-1 p-2 bg-white/20 rounded text-white font-mono break-all">
                  {{ error.details }}
                </div>
              </details>
            </div>
            
            <div v-if="errorId" class="mt-1">
              <p class="text-xs text-white/80">
                Feil-ID: {{ errorId }}
              </p>
            </div>
          </div>
          
          <div class="ml-4 flex-shrink-0 flex">
            <button
              @click="closeToast"
              class="inline-flex text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <span class="sr-only">Lukk</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
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

const { globalError, errorId: globalErrorId, clearError } = useErrorHandler()

// Use props or global error
const error = computed(() => props.error || globalError.value)
const errorId = computed(() => props.errorId || globalErrorId.value)

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
const toastPosition = computed(() => {
  // On mobile, position at top center. On desktop, position at top right
  return 'top-4 left-1/2 transform -translate-x-1/2 sm:left-auto sm:right-4 sm:transform-none'
})

const toastClasses = computed(() => {
  if (!error.value) return ''
  
  switch (error.value.type) {
    case 'error':
      return 'bg-red-500 border-red-500'
    case 'warning':
      return 'bg-yellow-500 border-yellow-500'
    case 'info':
      return 'bg-blue-500 border-blue-500'
    default:
      return 'bg-red-500 border-red-500'
  }
})

const textClasses = computed(() => {
  if (!error.value) return ''
  
  switch (error.value.type) {
    case 'error':
      return 'text-white'
    case 'warning':
      return 'text-white'
    case 'info':
      return 'text-white'
    default:
      return 'text-white'
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