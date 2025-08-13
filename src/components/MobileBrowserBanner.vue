<template>
  <!-- Mobile Browser Blocker - Full Screen -->
  <div v-if="showBlocker" class="mobile-browser-banner fixed inset-0 z-[9999] bg-dark-900 flex items-center justify-center overflow-hidden px-6 py-8">
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
        <h2 class="text-lg font-semibold text-white mb-4">For å få best mulig opplevelse må du installere appen</h2>
        
        <!-- iOS Safari Instructions -->
        <div v-if="isIOSSafari" class="text-left">
          <h3 class="font-medium text-white mb-3">På iPhone/iPad (Safari):</h3>
          <ol class="text-dark-300 space-y-2 text-sm">
            <li>1. Trykk på del-knappen (firkant med pil opp)</li>
            <li>2. Rull ned og trykk "Legg til på Hjem-skjerm"</li>
            <li>3. Trykk "Legg til" for å installere</li>
          </ol>
        </div>

        <!-- Chrome on iOS Instructions -->
        <div v-else-if="isChromeOnIOS" class="text-left">
          <h3 class="font-medium text-white mb-3">På iPhone/iPad (Chrome):</h3>
          <ol class="text-dark-300 space-y-2 text-sm">
            <li>1. Trykk på del-ikonet (firkant med pil opp) i URL-feltet</li>
            <li>2. Velg "Legg til på Hjem-skjerm"</li>
            <li>3. Trykk "Legg til" for å installere</li>
          </ol>
        </div>

        <!-- Android Instructions -->
        <div v-else-if="isAndroid" class="text-left">
          <h3 class="font-medium text-white mb-3">På Android:</h3>
          <ol class="text-dark-300 space-y-2 text-sm">
            <li>1. Trykk på menyknappen (tre prikker)</li>
            <li>2. Velg "Legg til på startskjerm"</li>
            <li>3. Trykk "Legg til" for å installere</li>
          </ol>
        </div>

        <!-- Generic Instructions -->
        <div v-else class="text-left">
          <h3 class="font-medium text-white mb-3">Generelle instruksjoner:</h3>
          <ol class="text-dark-300 space-y-2 text-sm">
            <li>1. Finn del- eller menyknappen i nettleseren</li>
            <li>2. Se etter "Legg til på Hjem-skjerm" eller "Add to Home Screen"</li>
            <li>3. Følg instruksjonene for å installere</li>
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

      <!-- Additional Instructions for Android Users -->
      <div v-if="isAndroid && deferredPrompt" class="text-center mb-4">
        <p class="text-xs text-dark-400 mb-2">Eller følg manuelle instruksjoner ovenfor</p>
      </div>

      <!-- Alternative Instructions -->
      <p class="text-xs text-dark-400">
        Etter installasjon, åpne appen fra hjem-skjermen din
      </p>
    </div>
  </div>

  <!-- App Content - Only shown when blocker is NOT active -->
  <div v-else>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const showBlocker = ref(false)
const deferredPrompt = ref<any>(null)
const isIOSSafari = ref(false)
const isChromeOnIOS = ref(false)
const isAndroid = ref(false)

// Check if user is on mobile browser (not PWA)
const isMobileBrowser = () => {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  const isPWA = window.matchMedia('(display-mode: standalone)').matches
  return isMobile && !isPWA
}

// Detect specific platform and browser combinations
const detectPlatformAndBrowser = () => {
  const userAgent = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(userAgent)
  
  if (isIOS) {
    isChromeOnIOS.value = /CriOS/.test(userAgent)
    isIOSSafari.value = /Safari/.test(userAgent) && !/CriOS|FxiOS|OPiOS|mercury/.test(userAgent)
  } else {
    isAndroid.value = /Android/.test(userAgent)
  }
}

// Check if user has already installed the PWA
const hasInstalledPWA = () => {
  return localStorage.getItem('pwa-installed') === 'true'
}

// Handle PWA installation
const handleInstall = async () => {
  if (deferredPrompt.value) {
    deferredPrompt.value.prompt()
    const { outcome } = await deferredPrompt.value.userChoice
    if (outcome === 'accepted') {
      localStorage.setItem('pwa-installed', 'true')
      showBlocker.value = false
    }
    deferredPrompt.value = null
  }
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
  detectPlatformAndBrowser()
  
  if (isMobileBrowser() && !hasInstalledPWA()) {
    showBlocker.value = true
  }
  
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.addEventListener('appinstalled', handleAppInstalled)
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  window.removeEventListener('appinstalled', handleAppInstalled)
})
</script>
