<template>
  <div 
    v-if="showPrompt && !isInstalled"
    class="fixed bottom-4 left-4 right-4 z-50 bg-dark-800 border border-primary-500/20 rounded-lg p-4 shadow-xl"
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
          <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h3 class="text-sm font-semibold text-white">Installer Treningsloggen</h3>
          <p class="text-xs text-dark-300">Få app-opplevelse med offline støtte</p>
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <button 
          @click="dismissPrompt"
          class="text-dark-400 hover:text-white transition-colors p-1"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <button 
          @click="installApp"
          class="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Installer
        </button>
      </div>
    </div>
    
    <!-- Installation Instructions -->
    <div v-if="showInstructions" class="mt-3 pt-3 border-t border-dark-600">
      <div class="text-xs text-dark-300 space-y-2">
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Trykk på del-knappen i nettleseren</span>
        </div>
        <div class="flex items-center gap-2">
          <svg class="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Velg "Legg til på Hjem-skjerm"</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const showPrompt = ref(false)
const showInstructions = ref(false)
const isInstalled = ref(false)
const deferredPrompt = ref<any>(null)

const checkInstallation = () => {
  // Check if app is installed
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  const isInstalledFromHomeScreen = window.navigator.standalone === true
  const hasInstalledPWA = localStorage.getItem('pwa-installed') === 'true'
  
  isInstalled.value = isStandalone || isInstalledFromHomeScreen || hasInstalledPWA
}

const installApp = async () => {
  if (deferredPrompt.value) {
    try {
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(100)
      }
      
      deferredPrompt.value.prompt()
      const { outcome } = await deferredPrompt.value.userChoice
      
      if (outcome === 'accepted') {
        localStorage.setItem('pwa-installed', 'true')
        isInstalled.value = true
        showPrompt.value = false
        
        // Success feedback
        if ('vibrate' in navigator) {
          navigator.vibrate([50, 100, 50])
        }
      }
    } catch (error) {
      console.error('Installation failed:', error)
      showInstructions.value = true
    }
    
    deferredPrompt.value = null
  } else {
    // Show manual instructions
    showInstructions.value = true
  }
}

const dismissPrompt = () => {
  showPrompt.value = false
  localStorage.setItem('pwa-prompt-dismissed', 'true')
}

const handleBeforeInstallPrompt = (e: Event) => {
  e.preventDefault()
  deferredPrompt.value = e
  showPrompt.value = true
}

const handleAppInstalled = () => {
  localStorage.setItem('pwa-installed', 'true')
  isInstalled.value = true
  showPrompt.value = false
}

onMounted(() => {
  checkInstallation()
  
  // Check if prompt was dismissed
  const wasDismissed = localStorage.getItem('pwa-prompt-dismissed') === 'true'
  if (!wasDismissed && !isInstalled.value) {
    // Show prompt after a delay
    setTimeout(() => {
      showPrompt.value = true
    }, 3000)
  }
  
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.addEventListener('appinstalled', handleAppInstalled)
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.removeEventListener('appinstalled', handleAppInstalled)
})
</script>
