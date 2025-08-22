<template>
  <div class="min-h-screen bg-dark-900">
    <!-- Loading state during login -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
        <p class="text-dark-300">Logger inn...</p>
      </div>
    </div>

    <!-- Login form content -->
    <div v-else class="flex items-center justify-center px-4 flex-1 min-h-screen">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <h1 class="text-2xl font-bold text-white mb-2">
            {{ isRegistering ? 'Registrer deg' : 'Logg inn' }}
          </h1>
          <p class="text-dark-300">
            {{ isRegistering ? 'Create your LIFT account' : 'Sign in to your LIFT account' }}
          </p>
        </div>

        <div class="card">
          <form @submit.prevent="handleSubmit" class="space-y-6">
            <div v-if="isRegistering">
              <label for="name" class="block text-sm font-medium text-white mb-2">
                Navn
              </label>
              <input
                id="name"
                v-model="name"
                type="text"
                required
                class="input-field w-full"
                placeholder="Skriv inn ditt navn"
                autocomplete="name"
              />
            </div>

            <div>
              <label for="email" class="block text-sm font-medium text-white mb-2">
                E-post
              </label>
              <input
                id="email"
                v-model="email"
                type="email"
                required
                class="input-field w-full"
                placeholder="Skriv inn din e-post"
                autocomplete="email"
                inputmode="email"
              />
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-white mb-2">
                Passord
              </label>
              <div class="relative">
                <input
                  id="password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  class="input-field w-full pr-10"
                  :placeholder="isRegistering ? 'Minst 6 tegn' : 'Skriv inn passord'"
                  minlength="6"
                  autocomplete="current-password"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-dark-400 hover:text-dark-300 transition-colors"
                  aria-label="Vis/skjul passord"
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

            <div v-if="isRegistering">
              <label for="confirmPassword" class="block text-sm font-medium text-white mb-2">
                Bekreft passord
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
                  autocomplete="new-password"
                />
                <button
                  type="button"
                  @click="showConfirmPassword = !showConfirmPassword"
                  class="absolute inset-y-0 right-0 pr-3 flex items-center text-dark-400 hover:text-dark-300 transition-colors"
                  aria-label="Vis/skjul bekreftelsespassord"
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

            <div v-if="!isRegistering" class="flex items-center justify-between">
              <label class="flex items-center cursor-pointer">
                <input
                  v-model="rememberMe"
                  type="checkbox"
                  class="cursor-pointer"
                />
                <span class="ml-2 text-sm text-dark-300 cursor-pointer">Husk meg</span>
              </label>

              <button
                type="button"
                @click="forgotPassword"
                class="text-sm text-primary-500 hover:text-primary-400 transition-colors"
              >
                Glemt passord?
              </button>
            </div>

            <div v-if="errorMessage" class="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p class="text-red-400 text-sm">{{ errorMessage }}</p>
            </div>

            <button
              type="submit"
              class="btn-primary w-full"
              :disabled="isLoading || !isFormValid"
            >
              <span v-if="isLoading" class="flex items-center justify-center">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isRegistering ? 'Registrerer...' : 'Logger inn...' }}
              </span>
              <span v-else>{{ isRegistering ? 'Registrer deg' : 'Logg inn' }}</span>
            </button>
          </form>

          <div class="mt-6 text-center">
            <p class="text-dark-300 text-sm">
              {{ isRegistering ? 'Har du allerede en konto?' : 'Har du ikke en konto?' }}
              <button
                @click="toggleMode"
                class="text-primary-500 hover:text-primary-400 transition-colors font-medium"
              >
                {{ isRegistering ? 'Logg inn' : 'Registrer deg' }}
              </button>
            </p>
          </div>
        </div>

        <div class="mt-8 text-center">
          <p class="text-xs text-dark-400">
            Ved å {{ isRegistering ? 'registrere deg' : 'logge inn' }} godtar du våre
            <a href="#" class="text-primary-500 hover:text-primary-400">vilkår</a>
            og
            <a href="#" class="text-primary-500 hover:text-primary-400">personvernregler</a>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSupabase } from '@/composables/useSupabase'
import { reinitSupabase } from '@/composables/useSupabase'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { useSignupProtection } from '@/composables/useSignupProtection'

const router = useRouter()
const { supabase } = useSupabase()
const { showError, showSuccess, handleAuthError } = useErrorHandler()
const { isRecentlySignedUp, markSignupAttempt, clearSignupAttempt } = useSignupProtection()

// Form data
const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const rememberMe = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const isRegistering = ref(false)

// Password visibility
const showPassword = ref(false)
const showConfirmPassword = ref(false)

// Prefill remembered email + rememberMe (no password)
onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) {
    router.push('/')
  } else {
    const savedEmail = localStorage.getItem('rememberedEmail')
    const savedPref = localStorage.getItem('rememberMe')
    if (savedEmail && savedPref === 'true') {
      email.value = savedEmail
      rememberMe.value = true
    }
  }
})

// Computed
const isFormValid = computed(() => {
  if (isRegistering.value) {
    return !!(name.value.trim() &&
      email.value.trim() &&
      password.value.length >= 6 &&
      password.value === confirmPassword.value)
  }
  return !!(email.value.trim() && password.value.length >= 6)
})

// Methods
const clearForm = () => {
  name.value = ''
  if (!rememberMe.value) {
    email.value = ''
  }
  password.value = ''
  confirmPassword.value = ''
  errorMessage.value = ''
  showPassword.value = false
  showConfirmPassword.value = false
}

const toggleMode = () => {
  isRegistering.value = !isRegistering.value
  clearForm()
}

const handleSubmit = async () => {
  if (!isFormValid.value) {
    errorMessage.value = isRegistering.value
      ? 'Vennligst fyll ut alle felter og sørg for at passordene matcher'
      : 'Vennligst fyll ut alle felter'
    return
  }

  if (isLoading.value) return

  isLoading.value = true
  errorMessage.value = ''

  try {
    if (isRegistering.value) {
      await handleRegister()
    } else {
      await handleLogin()
    }
  } catch (error: any) {
    console.error('Auth error:', error)
    handleAuthError(error)
  } finally {
    isLoading.value = false
  }
}

const handleRegister = async () => {
  if (isRecentlySignedUp(email.value)) {
    errorMessage.value = 'Du har nylig forsøkt å registrere deg. Vennligst vent litt før du prøver igjen.'
    return
  }

  markSignupAttempt(email.value)

  const { data, error } = await supabase.auth.signUp({
    email: email.value,
    password: password.value,
    options: {
      data: { name: name.value }
    }
  })

  if (error) {
    errorMessage.value = error.message
    return
  }

  if (data.user) {
    showSuccess('Registrering vellykket! Sjekk din e-post for bekreftelse.')
    clearForm()
    isRegistering.value = false
  } else {
    clearSignupAttempt(email.value)
  }
}

const handleLogin = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })

    if (error) {
      errorMessage.value = error.message
      return
    }

    if (data.user) {
      // Remember preference + email (optional). Never store password.
      if (rememberMe.value) {
        localStorage.setItem('rememberMe', 'true')
        localStorage.setItem('rememberedEmail', email.value)
      } else {
        localStorage.setItem('rememberMe', 'false')
        localStorage.removeItem('rememberedEmail')
      }

      // OPTIONAL: immediately apply chosen persistence for this session
      await reinitSupabase(rememberMe.value ? 'local' : 'session')

      // Redirect to økter
      router.push('/')
    }
  } catch (error: any) {
    console.error('Login error:', error)
    errorMessage.value = 'En feil oppstod under innlogging. Prøv igjen.'
  }
}

const forgotPassword = async () => {
  if (!email.value) {
    errorMessage.value = 'Vennligst skriv inn din e-post først'
    return
  }
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.value, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    if (error) {
      errorMessage.value = error.message
    } else {
      errorMessage.value = ''
      showSuccess('Tilbakestillingslenke sendt til din e-post! Sjekk innboksen din og følg lenken for å tilbakestille passordet.')
    }
  } catch (error: any) {
    console.error('Password reset error:', error)
    showError('En feil oppstod ved sending av tilbakestillingslenke. Prøv igjen.')
  }
}

// Optional helper to clear email preference somewhere in settings
const clearRememberedCredentials = () => {
  localStorage.removeItem('rememberedEmail')
  localStorage.removeItem('rememberMe')
}
</script>
