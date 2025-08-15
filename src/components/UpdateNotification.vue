<template>
  <div 
    v-if="showUpdatePrompt"
    class="fixed bottom-4 left-4 right-4 z-50 bg-dark-800 border border-primary-500/20 rounded-lg p-4 shadow-xl"
  >
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
          <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <div>
          <h3 class="text-sm font-semibold text-white">Oppdatering tilgjengelig</h3>
          <p class="text-xs text-dark-300">En ny versjon av appen er tilgjengelig</p>
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
          @click="refreshApp"
          class="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Oppdater
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const showUpdatePrompt = ref(false)
const registration = ref<ServiceWorkerRegistration | null>(null)

const checkForUpdates = () => {
  console.log('🔍 UpdateNotification: Checking for updates...')
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) {
        console.log('🔍 UpdateNotification: Service worker registration found:', reg)
        registration.value = reg
        
        // Check if there's a waiting service worker (update available)
        if (reg.waiting) {
          console.log('🔍 UpdateNotification: Update available - waiting service worker found')
          showUpdatePrompt.value = true
        }
        
        // Listen for new service worker installation
        reg.addEventListener('updatefound', () => {
          console.log('🔍 UpdateNotification: Update found - new service worker installing')
          const newWorker = reg.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              console.log('🔍 UpdateNotification: Service worker state changed:', newWorker.state)
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker is installed and waiting
                console.log('🔍 UpdateNotification: New service worker installed, waiting to activate')
                showUpdatePrompt.value = true
              }
            })
          }
        })
        
        // Check for updates manually
        reg.update()
      } else {
        console.log('🔍 UpdateNotification: No service worker registration found')
      }
    }).catch((error) => {
      console.error('🔍 UpdateNotification: Error getting service worker registration:', error)
    })
  } else {
    console.log('🔍 UpdateNotification: Service workers not supported')
  }
}

const refreshApp = () => {
  console.log('🔄 UpdateNotification: Refreshing app...')
  if (registration.value && registration.value.waiting) {
    // Send message to waiting service worker to activate
    registration.value.waiting.postMessage({ type: 'SKIP_WAITING' })
    
    // Wait a bit for the service worker to activate, then reload
    setTimeout(() => {
      window.location.reload()
    }, 100)
  } else {
    // Fallback: just reload the page
    window.location.reload()
  }
}

const dismissPrompt = () => {
  console.log('❌ UpdateNotification: Dismissing update prompt')
  showUpdatePrompt.value = false
  // Don't dismiss permanently - allow it to show again on next update
}

const handleSkipWaiting = () => {
  // Listen for skip waiting message
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SKIP_WAITING') {
        window.location.reload()
      }
    })
  }
}

onMounted(() => {
  console.log('🚀 UpdateNotification: Component mounted')
  
  // Listen for custom event from service worker registration
  const handleSwUpdateAvailable = () => {
    console.log('🔍 UpdateNotification: SW update available event received')
    showUpdatePrompt.value = true
  }
  
  // Listen for Vite PWA plugin events
  const handleVitePwaUpdateFound = () => {
    console.log('🔍 UpdateNotification: Vite PWA update found event received')
    showUpdatePrompt.value = true
  }
  
  const handleVitePwaUpdateReady = () => {
    console.log('🔍 UpdateNotification: Vite PWA update ready event received')
    showUpdatePrompt.value = true
  }
  
  // Listen for custom event from service worker registration
  window.addEventListener('sw-update-available', handleSwUpdateAvailable)
  
  // Listen for Vite PWA plugin events
  window.addEventListener('vite-plugin-pwa:update-found', handleVitePwaUpdateFound)
  
  window.addEventListener('vite-plugin-pwa:update-ready', handleVitePwaUpdateReady)
  
  // Always check for updates, don't dismiss permanently
  checkForUpdates()
  handleSkipWaiting()
  
  // Also check periodically for updates
  const updateCheckInterval = setInterval(() => {
    console.log('🔍 UpdateNotification: Periodic update check...')
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg && reg.waiting) {
          console.log('🔍 UpdateNotification: Periodic check found waiting service worker')
          showUpdatePrompt.value = true
        }
        
        // Also try to update manually
        if (reg) {
          reg.update()
        }
      })
    }
  }, 30000) // Check every 30 seconds
  
  // Cleanup function
  onUnmounted(() => {
    clearInterval(updateCheckInterval)
    window.removeEventListener('sw-update-available', handleSwUpdateAvailable)
    window.removeEventListener('vite-plugin-pwa:update-found', handleVitePwaUpdateFound)
    window.removeEventListener('vite-plugin-pwa:update-ready', handleVitePwaUpdateReady)
  })
})

onUnmounted(() => {
  console.log('🔌 UpdateNotification: Component unmounted')
})
</script>
