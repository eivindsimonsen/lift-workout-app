import { ref } from 'vue'

interface AppError {
  message: string
  details?: string
  stack?: string
  type?: 'error' | 'warning' | 'info' | 'success'
}

// Global error state
const globalError = ref<AppError | null>(null)
const errorId = ref<string>('')

// Generate unique error ID
const generateErrorId = (): string => {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Global error handler
const handleError = (error: any, context?: string): void => {
  console.error('Global error handler:', error, context)
  
  const appError: AppError = {
    message: error.message || 'En uventet feil oppstod',
    details: error.stack || context || 'Ingen detaljer tilgjengelig',
    stack: error.stack,
    type: 'error'
  }
  
  globalError.value = appError
  errorId.value = generateErrorId()
  
  // Log for debugging
  console.error('Error ID:', errorId.value)
  console.error('Error context:', context)
  console.error('Full error:', error)
}

// Handle specific error types
const handleNetworkError = (error: any): void => {
  handleError({
    message: 'Nettverksfeil',
    stack: error.stack
  }, 'Network error')
}

const handleAuthError = (error: any): void => {
  handleError({
    message: 'Autentiseringsfeil - prøv å logge inn på nytt',
    stack: error.stack
  }, 'Authentication error')
}

const handleDatabaseError = (error: any): void => {
  handleError({
    message: 'Databasefeil - data kunne ikke lastes',
    stack: error.stack
  }, 'Database error')
}

const handleValidationError = (error: any): void => {
  handleError({
    message: 'Valideringsfeil - sjekk at alle felter er riktig utfylt',
    stack: error.stack
  }, 'Validation error')
}

// Clear error
const clearError = (): void => {
  globalError.value = null
  errorId.value = ''
}

// Show user-friendly error message
const showError = (message: string, details?: string): void => {
  globalError.value = {
    message,
    details,
    type: 'error'
  }
  errorId.value = generateErrorId()
}

// Show warning
const showWarning = (message: string, details?: string): void => {
  globalError.value = {
    message,
    details,
    type: 'warning'
  }
  errorId.value = generateErrorId()
}

// Show info
const showInfo = (message: string, details?: string): void => {
  globalError.value = {
    message,
    details,
    type: 'info'
  }
  errorId.value = generateErrorId()
}

// Show success
const showSuccess = (message: string, details?: string): void => {
  globalError.value = {
    message,
    details,
    type: 'success'
  }
  errorId.value = generateErrorId()
}

// Handle async operations with error catching
const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  errorMessage?: string
): Promise<T | null> => {
  try {
    return await operation()
  } catch (error: any) {
    const message = errorMessage || error.message || 'Operasjonen feilet'
    handleError(error, message)
    return null
  }
}

export function useErrorHandler() {
  return {
    // State
    globalError,
    errorId,
    
    // Methods
    handleError,
    handleNetworkError,
    handleAuthError,
    handleDatabaseError,
    handleValidationError,
    clearError,
    showError,
    showWarning,
    showInfo,
    showSuccess,
    withErrorHandling
  }
} 