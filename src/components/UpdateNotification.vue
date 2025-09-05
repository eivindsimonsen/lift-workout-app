<template>
  <div 
    v-if="showUpdatePrompt && !isDevelopment"
    class="fixed z-50 bg-dark-800 border border-primary-500/20 rounded-lg p-4 shadow-xl left-1/2 -translate-x-1/2 w-[92%] sm:w-auto"
    style="bottom: calc(env(safe-area-inset-bottom) + 20px)"
  >
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
        <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="text-sm font-semibold text-white">Oppdatering tilgjengelig</h3>
      </div>
      
      <div class="flex items-center gap-3 flex-shrink-0">
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
import { ref, computed, onMounted, onUnmounted } from 'vue'

const showUpdatePrompt = ref(false)
const registration = ref<ServiceWorkerRegistration | null>(null)

const isDevelopment = computed(() => {
  return import.meta.env.DEV
})

const checkForUpdates = () => {
  // Don't check for updates in development mode
  if (isDevelopment.value) {
    return
  }
  
  
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) {
        
        registration.value = reg
        
        // Check if there's a waiting service worker (update available)
        if (reg.waiting) {
          
          showUpdatePrompt.value = true
        }
        
        // Listen for new service worker installation
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker is installed and waiting
                
                showUpdatePrompt.value = true
              }
            })
          }
        })
        
        // Check for updates manually
        reg.update()
        
        // Also check manifest version
        checkManifestVersion()
      } else {
        
      }
    }).catch((error) => {
      console.error('🔍 UpdateNotification: Error getting service worker registration:', error)
    })
  } else {
    
  }
}

const checkManifestVersion = async () => {
  // Don't check manifest in development mode
  if (isDevelopment.value) {
    return
  }
  
  try {
    const response = await fetch('/manifest.webmanifest')
    if (response.ok) {
      const manifest = await response.json()
      const currentVersion = manifest.version || '1.0.0'
      const storedVersion = localStorage.getItem('app-version')
      
      
      
      if (storedVersion && storedVersion !== currentVersion) {
        
        showUpdatePrompt.value = true
      }
      
      // Store current version
      localStorage.setItem('app-version', currentVersion)
    }
  } catch (error) {
    console.error('🔍 UpdateNotification: Error checking manifest:', error)
  }
}

const testUpdate = () => {
  
  showUpdatePrompt.value = true
}

const refreshApp = () => {
  
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

// Force check for updates (for testing)
const forceCheckForUpdates = () => {
  
  if (registration.value) {
    registration.value.update()
  }
}

const dismissPrompt = () => {
  
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
  
  
  // Don't run update logic in development mode
  if (isDevelopment.value) {
    return
  }
  
  // Listen for custom event from service worker registration
  const handleSwUpdateAvailable = () => {
    
    showUpdatePrompt.value = true
  }
  
  // Listen for Vite PWA plugin events
  const handleVitePwaUpdateFound = () => {
    
    showUpdatePrompt.value = true
  }
  
  const handleVitePwaUpdateReady = () => {
    
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
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg && reg.waiting) {
          
          showUpdatePrompt.value = true
        }
        
        // Also try to update manually
        if (reg) {
          reg.update()
        }
      })
    }
    
    // Also check manifest version periodically
    checkManifestVersion()
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
  
})
</script>


