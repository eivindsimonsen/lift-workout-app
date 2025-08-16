<template>
  <div class="min-h-screen bg-dark-900">
    <!-- Header - same as authenticated pages -->
    <header class="bg-dark-800 border-b border-dark-700">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-white">
              <span class="text-primary-500">Fremv</span>
            </h1>
                          <p class="text-sm text-dark-300">Full kontroll på din fremgang</p>
          </div>
        </div>
      </div>
    </header>

    <!-- Reset password form content -->
    <div class="flex items-center justify-center px-4 flex-1 mt-8">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <h1 class="text-2xl font-bold text-white mb-2">
            Tilbakestill passord
          </h1>
          <p class="text-dark-300">
            Skriv inn ditt nye passord
          </p>
        </div>

        <div class="card">
          <form @submit.prevent="handleSubmit" class="space-y-6">
            <div>
              <label for="password" class="block text-sm font-medium text-white mb-2">
                Nytt passord
              </label>
              <div class="relative">
                <input
                  id="password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  class="input-field w-full pr-10"
                  placeholder="Minst 6 tegn"
                  minlength="6"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-dark-400 hover:text-dark-300 transition-colors"
                >
                  <svg v-if="showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                  <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label for="confirmPassword" class="block text-sm font-medium text-white mb-2">
                Bekreft nytt passord
              </label>
              <div class="relative">
                <input
                  id="confirmPassword"
                  v-model="confirmPassword"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  required
                  class="input-field w-full pr-10"
                  placeholder="Skriv inn passord igjen"
                  minlength="6"
                />
                <button
                  type="button"
                  @click="showConfirmPassword = !showConfirmPassword"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-dark-400 hover:text-dark-300 transition-colors"
                >
                  <svg v-if="showConfirmPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                  <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            </div>

            <div v-if="errorMessage" class="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p class="text-red-400 text-sm">{{ errorMessage }}</p>
            </div>

            <div v-if="successMessage" class="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
              <p class="text-green-400 text-sm">{{ successMessage }}</p>
            </div>

            <button
              type="submit"
              class="btn-primary w-full"
              :disabled="isLoading"
            >
              <span v-if="isLoading" class="flex items-center justify-center">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Tilbakestiller...
              </span>
              <span v-else>Tilbakestill passord</span>
            </button>
          </form>

          <div class="mt-6 text-center">
            <router-link 
              to="/login"
              class="text-primary-500 hover:text-primary-400 transition-colors font-medium"
            >
              Tilbake til innlogging
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSupabase } from '@/composables/useSupabase'
import { useErrorHandler } from '@/composables/useErrorHandler'

const router = useRouter()
const { supabase } = useSupabase()
const { showError, handleAuthError } = useErrorHandler()

// Form data
const password = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Password visibility
const showPassword = ref(false)
const showConfirmPassword = ref(false)

// Computed
const isFormValid = computed(() => {
  return password.value.length >= 6 && password.value === confirmPassword.value
})

// Methods
const handleSubmit = async () => {
  if (!isFormValid.value) {
    errorMessage.value = 'Vennligst fyll ut alle felter og sørg for at passordene matcher'
    return
  }

  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const { error } = await supabase.auth.updateUser({
      password: password.value
    })

    if (error) {
      errorMessage.value = error.message
    } else {
      successMessage.value = 'Passordet ditt er tilbakestilt! Du blir omdirigert til innlogging...'
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    }
  } catch (error: any) {
    console.error('Password reset error:', error)
    handleAuthError(error)
  } finally {
    isLoading.value = false
  }
}
</script> 