<template>
  <div v-if="error" class="min-h-screen bg-dark-900 flex items-center justify-center px-4 py-8">
    <div class="max-w-md w-full">
      <div class="text-center mb-8">
        <div class="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-white mb-2">Noe gikk galt</h1>
        <p class="text-dark-300 mb-6">
          Det oppstod en uventet feil. Prøv å laste siden på nytt eller kontakt support hvis problemet vedvarer.
        </p>
      </div>

      <div class="card">
        <div class="space-y-4">
          <div v-if="error.message" class="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <h3 class="text-sm font-medium text-red-400 mb-2">Feilmelding:</h3>
            <p class="text-sm text-red-300">{{ error.message }}</p>
          </div>

          <div v-if="error.details" class="bg-dark-700/50 border border-dark-600 rounded-lg p-4">
            <h3 class="text-sm font-medium text-dark-300 mb-2">Tekniske detaljer:</h3>
            <p class="text-xs text-dark-400 font-mono break-all">{{ error.details }}</p>
          </div>

          <div class="flex gap-3">
            <button 
              @click="reloadPage"
              class="btn-primary flex-1"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Last siden på nytt
            </button>
            <button 
              @click="goHome"
              class="btn-secondary flex-1"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Gå til hjem
            </button>
          </div>

          <div class="text-center">
            <p class="text-xs text-dark-400">
              Feil-ID: {{ errorId }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'
import { useRouter } from 'vue-router'

interface AppError {
  message: string
  details?: string
  stack?: string
}

const router = useRouter()
const error = ref<AppError | null>(null)
const errorId = ref<string>('')

// Generate a unique error ID for tracking
const generateErrorId = (): string => {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Handle errors caught by Vue
onErrorCaptured((err: any, instance, info) => {
  console.error('Error caught by ErrorBoundary:', err, info)
  
  error.value = {
    message: err.message || 'En uventet feil oppstod',
    details: err.stack || info,
    stack: err.stack
  }
  errorId.value = generateErrorId()
  
  // Log error for debugging
  console.error('Error ID:', errorId.value)
  console.error('Error details:', {
    message: error.value.message,
    details: error.value.details,
    stack: error.value.stack,
    component: instance?.$options?.name || 'Unknown',
    info
  })
  
  return false // Prevent error from propagating
})

// Methods
const reloadPage = () => {
  window.location.reload()
}

const goHome = () => {
  error.value = null
  router.push('/')
}

// Expose error handling methods for global use
const setError = (err: AppError) => {
  error.value = err
  errorId.value = generateErrorId()
}

const clearError = () => {
  error.value = null
}

// Expose methods globally
defineExpose({
  setError,
  clearError
})
</script> 