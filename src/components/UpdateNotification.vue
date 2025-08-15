<template>
  <div 
    v-if="showUpdatePrompt"
    class="fixed bottom-4 left-4 right-4 z-50"
  >
    <div 
      ref="notificationRef"
      class="relative overflow-hidden bg-dark-800 border border-primary-500/20 rounded-lg p-4 shadow-xl"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <!-- Main Notification Content -->
      <div 
        class="transition-all duration-200 ease-out relative z-10 flex items-center gap-3"
        :style="{ 
          transform: `translateX(${translateX}px)`,
          borderRadius: showDismissAction ? '8px 0px 0px 8px' : '8px'
        }"
      >
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
      
      <!-- Dismiss Action Background (shown when swiping) -->
      <div 
        class="absolute right-0 top-0 bottom-0 flex items-center justify-end dismiss-action text-white transition-opacity duration-200 ease-out shadow-lg pr-6 rounded-r-lg"
        :class="{ 
          'opacity-100': showDismissAction, 
          'opacity-0': !showDismissAction 
        }"
        :style="{ 
          width: '100%',
          left: '0'
        }"
      >
        <!-- Dismiss Icon -->
        <div class="flex flex-col items-center gap-2 transform transition-transform duration-200 dismiss-icon" :class="{ 'scale-110': showDismissAction }">
          <div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30 shadow-lg">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <span class="text-xs font-semibold text-white tracking-wide">AVVIS</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const showUpdatePrompt = ref(false)
const registration = ref<ServiceWorkerRegistration | null>(null)
const notificationRef = ref<HTMLElement>()

// Touch/swipe state
const translateX = ref(0)
const showDismissAction = ref(false)
let startX = 0
let currentX = 0
let isDragging = false

const isDevelopment = computed(() => {
  return import.meta.env.DEV
})

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
        
        // Also check manifest version
        checkManifestVersion()
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

const checkManifestVersion = async () => {
  try {
    const response = await fetch('/manifest.webmanifest')
    if (response.ok) {
      const manifest = await response.json()
      const currentVersion = manifest.version || '1.0.0'
      const storedVersion = localStorage.getItem('app-version')
      
      console.log('🔍 UpdateNotification: Current manifest version:', currentVersion)
      console.log('🔍 UpdateNotification: Stored version:', storedVersion)
      
      if (storedVersion && storedVersion !== currentVersion) {
        console.log('🔍 UpdateNotification: New version detected!')
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
  console.log('🧪 UpdateNotification: Testing update notification...')
  showUpdatePrompt.value = true
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

// Force check for updates (for testing)
const forceCheckForUpdates = () => {
  console.log('🔍 UpdateNotification: Force checking for updates...')
  if (registration.value) {
    registration.value.update()
  }
}

const dismissPrompt = () => {
  console.log('❌ UpdateNotification: Dismissing update prompt')
  showUpdatePrompt.value = false
  // Don't dismiss permanently - allow it to show again on next update
}

// Touch handlers for swipe-to-dismiss
const handleTouchStart = (event: TouchEvent) => {
  if (event.touches.length !== 1) return
  
  startX = event.touches[0].clientX
  currentX = startX
  isDragging = true
}

const handleTouchMove = (event: TouchEvent) => {
  if (!isDragging) return
  
  currentX = event.touches[0].clientX
  const deltaX = currentX - startX
  
  // Only allow left swipe (negative deltaX)
  if (deltaX < 0) {
    translateX.value = Math.max(deltaX, -80 * 1.5)
    // Show dismiss action earlier for better visual feedback
    showDismissAction.value = Math.abs(deltaX) > 80 / 3
  }
}

const handleTouchEnd = () => {
  if (!isDragging) return
  
  isDragging = false
  
  if (Math.abs(translateX.value) > 80) {
    // Trigger dismiss
    dismissPrompt()
  }
  
  // Reset position
  translateX.value = 0
  showDismissAction.value = false
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
  console.log('🔌 UpdateNotification: Component unmounted')
})
</script>

<style scoped>
/* Prevent text selection during swipe */
.transition-transform {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

/* Enhanced dismiss action styling */
.dismiss-action {
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
  box-shadow: 0 4px 12px rgba(107, 114, 128, 0.3);
}

/* Smooth icon animation */
.dismiss-icon {
  transition: all 0.2s ease-out;
}

.dismiss-icon:hover {
  transform: scale(1.1);
}
</style>
