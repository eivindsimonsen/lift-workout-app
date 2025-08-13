<template>
  <div v-if="showBlocker" class="fixed inset-0 z-50 bg-dark-900 flex items-center justify-center p-6">
    <div class="max-w-md w-full text-center">
      <!-- App Icon -->
      <div class="w-24 h-24 bg-primary-500 rounded-2xl mx-auto mb-8 flex items-center justify-center">
        <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>

      <!-- Title -->
      <h1 class="text-2xl font-bold text-white mb-4">Treningsloggen</h1>
      
      <!-- Subtitle -->
      <p class="text-dark-300 mb-8">Din personlige treningslogg med full kontroll over treningsøktene dine</p>

      <!-- Installation Instructions -->
      <div class="bg-dark-800 rounded-lg p-6 mb-8 border border-dark-700">
        <h2 class="text-lg font-semibold text-white mb-4">For å bruke appen må du installere den</h2>
        
        <!-- iOS Instructions -->
        <div v-if="isIOSSafari" class="text-left">
          <h3 class="font-medium text-white mb-3">På iPhone/iPad:</h3>
          <ol class="text-dark-300 space-y-2 text-sm">
            <li>1. Trykk på del-knappen (firkant med pil opp)</li>
            <li>2. Rull ned og trykk "Legg til på Hjemmeskjerm"</li>
            <li>3. Trykk "Legg til" for å installere</li>
          </ol>
        </div>

        <!-- Android/Chrome Instructions -->
        <div v-else class="text-left">
          <h3 class="font-medium text-white mb-3">På Android:</h3>
          <ol class="text-dark-300 space-y-2 text-sm">
            <li>1. Trykk på menyknappen (tre prikker)</li>
            <li>2. Velg "Legg til på startskjerm"</li>
            <li>3. Trykk "Legg til" for å installere</li>
          </ol>
        </div>
      </div>

             <!-- Install Button for Android/Chrome/Edge -->
       <button 
         v-if="deferredPrompt"
         @click="handleInstall"
         class="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-4 px-6 rounded-lg transition-colors mb-4"
       >
         Installer App
       </button>

       <!-- Instructions Text for iOS Safari -->
       <div v-else class="text-center mb-4">
         <button 
           @click="handleInstall"
           class="text-primary-400 hover:text-primary-300 underline text-sm"
         >
           Vis installasjonsinstruksjoner
         </button>
       </div>

      <!-- Alternative Instructions -->
      <p class="text-xs text-dark-400">
        Etter installasjon, åpne appen fra hjemmeskjermen din
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'

const showBlocker = ref(false)
const deferredPrompt = ref<any>(null)
const isIOSSafari = ref(false)

// Check if user is on mobile browser (not PWA)
const isMobileBrowser = () => {
  // Check if it's a mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  
  // Check if it's NOT in PWA mode
  const isPWA = window.matchMedia('(display-mode: standalone)').matches
  
  return isMobile && !isPWA
}

// Check if user has already installed the PWA
const hasInstalledPWA = () => {
  return localStorage.getItem('pwa-installed') === 'true'
}

// Handle PWA installation
const handleInstall = async () => {
  if (deferredPrompt.value) {
    // Chrome/Edge installation
    deferredPrompt.value.prompt()
    const { outcome } = await deferredPrompt.value.userChoice
    if (outcome === 'accepted') {
      localStorage.setItem('pwa-installed', 'true')
      showBlocker.value = false
    }
    deferredPrompt.value = null
  } else {
    // Show platform-specific instructions
    if (isIOSSafari.value) {
      showIOSInstructions()
    } else {
      showAndroidInstructions()
    }
  }
}

// Show iOS-specific installation instructions
const showIOSInstructions = () => {
  const instructions = [
    '1. Trykk på del-knappen (firkant med pil opp)',
    '2. Rull ned og trykk "Legg til på Hjemmeskjerm"',
    '3. Trykk "Legg til" for å installere'
  ]
  
  alert(`For å installere appen på iPhone/iPad:\n\n${instructions.join('\n')}`)
}

// Show Android-specific installation instructions
const showAndroidInstructions = () => {
  const instructions = [
    '1. Trykk på menyknappen (tre prikker)',
    '2. Velg "Legg til på startskjerm"',
    '3. Trykk "Legg til" for å installere'
  ]
  
  alert(`For å installere appen på Android:\n\n${instructions.join('\n')}`)
}

// Listen for PWA install prompt
const handleBeforeInstallPrompt = (e: Event) => {
  e.preventDefault()
  deferredPrompt.value = e
}

// Listen for PWA installation success
const handleAppInstalled = () => {
  localStorage.setItem('pwa-installed', 'true')
  showBlocker.value = false
  deferredPrompt.value = null
}

onMounted(() => {
  // Check if it's iOS Safari
  isIOSSafari.value = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                      /Safari/.test(navigator.userAgent) && 
                      !/CriOS|FxiOS|OPiOS|mercury/.test(navigator.userAgent)
  
  // Show blocker if:
  // 1. User is on mobile browser (not PWA)
  // 2. User hasn't already installed it
  if (isMobileBrowser() && !hasInstalledPWA()) {
    showBlocker.value = true
  }
  
  // Listen for PWA events
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.addEventListener('appinstalled', handleAppInstalled)
})

// Watch for blocker state changes and emit events
watch(showBlocker, (newValue) => {
  if (newValue) {
    // Emit event when blocker is shown
    window.dispatchEvent(new CustomEvent('mobile-browser-blocker-shown'))
  } else {
    // Emit event when blocker is hidden
    window.dispatchEvent(new CustomEvent('mobile-browser-blocker-hidden'))
  }
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.removeEventListener('appinstalled', handleAppInstalled)
})
</script>
