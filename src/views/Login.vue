<template>
  <div class="max-w-md mx-auto">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-white mb-2">Logg inn</h1>
      <p class="text-dark-300">Logg inn på din NextRep konto</p>
    </div>

    <div class="card">
      <form @submit.prevent="handleLogin" class="space-y-6">
        <div>
          <label for="username" class="block text-sm font-medium text-white mb-2">
            Brukernavn
          </label>
          <input
            id="username"
            v-model="username"
            type="text"
            required
            class="input-field w-full"
            placeholder="Skriv inn brukernavn"
          />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-white mb-2">
            Passord
          </label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            class="input-field w-full"
            placeholder="Skriv inn passord"
          />
        </div>

        <div class="flex items-center justify-between">
          <label class="flex items-center">
            <input
              v-model="rememberMe"
              type="checkbox"
              class="w-3 h-3 text-primary-500 bg-dark-700 border-dark-600 rounded focus:ring-primary-500 focus:ring-1"
            />
            <span class="ml-2 text-sm text-dark-300">Husk meg</span>
          </label>
          
          <a href="#" class="text-sm text-primary-500 hover:text-primary-400 transition-colors">
            Glemt passord?
          </a>
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
            Logger inn...
          </span>
          <span v-else>Logg inn</span>
        </button>
      </form>

      <div class="mt-6 text-center">
        <p class="text-dark-300 text-sm">
          Har du ikke en konto?
          <a href="#" class="text-primary-500 hover:text-primary-400 transition-colors font-medium">
            Registrer deg
          </a>
        </p>
      </div>
    </div>

    <div class="mt-8 text-center">
      <p class="text-xs text-dark-400">
        Ved å logge inn godtar du våre 
        <a href="#" class="text-primary-500 hover:text-primary-400">vilkår</a> 
        og 
        <a href="#" class="text-primary-500 hover:text-primary-400">personvernregler</a>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const username = ref('')
const password = ref('')
const rememberMe = ref(false)
const isLoading = ref(false)

const handleLogin = async () => {
  isLoading.value = true
  
  // Simulerer en login-forespørsel
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // TODO: Implementer faktisk login-logikk her
  console.log('Login attempt:', {
    username: username.value,
    password: password.value,
    rememberMe: rememberMe.value
  })
  
  isLoading.value = false
  
  // TODO: Håndter suksess/feil og navigering
  alert('Login-funksjonalitet kommer snart!')
}
</script> 