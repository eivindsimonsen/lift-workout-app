<template>
  <div v-if="showInstallPrompt" class="fixed bottom-4 left-4 right-4 z-50">
    <div class="bg-dark-800 border border-dark-600 rounded-lg p-4 shadow-lg">
      <div class="flex items-center justify-between">
        <div class="flex-1">
          <h3 class="text-white font-medium">Installer Treningsloggen</h3>
          <p class="text-dark-300 text-sm mt-1">
            Få app-opplevelse og offline tilgang
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="installApp"
            :disabled="isInstalling"
            class="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {{ isInstalling ? 'Installerer...' : 'Installer' }}
          </button>
          <button
            @click="dismissPrompt"
            class="text-dark-400 hover:text-dark-300 p-2 transition-colors"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const showInstallPrompt = ref(false)
const isInstalling = ref(false)
let deferredPrompt: any = null

const installApp = async () => {
  if (!deferredPrompt) return
  
  isInstalling.value = true
  
  try {
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      console.log('PWA installed successfully')
      showInstallPrompt.value = false
    } else {
      console.log('PWA installation declined')
    }
  } catch (error) {
    console.error('PWA installation error:', error)
  } finally {
    isInstalling.value = false
    deferredPrompt = null
  }
}

const dismissPrompt = () => {
  showInstallPrompt.value = false
  // Store dismissal in localStorage to avoid showing again
  localStorage.setItem('pwa-prompt-dismissed', 'true')
}

onMounted(() => {
  // Check if already dismissed
  if (localStorage.getItem('pwa-prompt-dismissed')) return
  
  // Listen for beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    showInstallPrompt.value = true
  })
  
  // Check if already installed
  if (window.matchMedia('(display-mode: standalone)').matches) {
    showInstallPrompt.value = false
  }
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', () => {})
})
</script>
