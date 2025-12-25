<template>
  <ErrorBoundary>
    <div class="min-h-screen bg-dark-900">
      <!-- Loading state while checking authentication -->
      <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p class="text-dark-300">Laster...</p>
          <p class="text-sm text-dark-400 mt-2">
            {{ hasInitialized ? 'Laster data...' : 'Starter app...' }}
          </p>
          <p v-if="workoutData.lastSyncTime?.value" class="text-xs text-dark-500 mt-1">
            Sist synkronisert: {{ formatLastSyncTime(workoutData.lastSyncTime.value) }}
          </p>
        </div>
      </div>

      <!-- App content when loaded -->
      <div v-else>
        <!-- Mobile Browser Blocker - Wraps entire app content -->
        <MobileBrowserBanner>
          <!-- Desktop Top Header (hidden on mobile) -->
          <header v-if="isAuthenticated" class="hidden md:block sticky top-0 z-40 bg-dark-900/80 backdrop-blur border-b border-dark-700">
            <div class="container mx-auto px-4 h-14 flex items-center justify-between">
              <router-link to="/" class="text-white font-semibold tracking-wide">
                LIFT
              </router-link>

              <nav class="flex items-center gap-6">
                <router-link 
                  to="/" 
                  class="text-dark-300 hover:text-white transition-colors flex items-center gap-2"
                  :class="{ 'nav-link-active': $route.path === '/' || $route.path.startsWith('/workout/') || $route.path.startsWith('/template/') }"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                  </svg>
                  Økter
                </router-link>

                <router-link 
                  to="/exercises" 
                  class="text-dark-300 hover:text-white transition-colors flex items-center gap-2"
                  :class="{ 'nav-link-active': $route.path === '/exercises' || $route.path.startsWith('/exercise/') }"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Øvelser
                </router-link>

                <router-link 
                  to="/history" 
                  class="text-dark-300 hover:text-white transition-colors flex items-center gap-2"
                  :class="{ 'nav-link-active': $route.path === '/history' || $route.path.startsWith('/session/') }"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Historikk
                </router-link>

                <router-link 
                  to="/stats" 
                  class="text-dark-300 hover:text-white transition-colors flex items-center gap-2"
                  :class="{ 'nav-link-active': $route.path === '/stats' }"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Statistikk
                </router-link>
              </nav>

              <router-link to="/profile" class="flex items-center gap-3">
                <div class="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                  <span class="text-white text-sm font-medium">{{ userInitials }}</span>
                </div>
                <span class="text-dark-200 hover:text-white transition-colors">Profil</span>
              </router-link>
            </div>
          </header>

          <!-- Main content -->
          <main 
            v-if="isAuthenticated" 
            :key="route.path"
            class="container mx-auto px-4 py-8 pb-32 md:pb-8"
            style="padding-top: calc(0.25rem + env(safe-area-inset-top));"
            ref="mainContent"
          >
            <router-view />
          </main>
          
          <!-- Non-authenticated content (keep same container to avoid layout shift during hydration) -->
          <main 
            v-else
            key="non-authenticated"
            class="container mx-auto px-4 py-8"
            style="padding-top: calc(0.25rem + env(safe-area-inset-top));"
          >
            <router-view />
          </main>

          <!-- Offline Indicator -->
          <OfflineIndicator />

          <!-- Mobile Bottom Navigation - only show if authenticated AND not hidden -->
          <nav v-if="isAuthenticated && !hideBottomNav" class="md:hidden fixed bottom-0 left-0 right-0 bg-dark-800 border-t border-dark-700 z-50 pwa-navigation">
            <div class="flex justify-around">
              <router-link 
                to="/" 
                class="flex flex-col items-center py-3 px-4 text-dark-300 hover:text-white transition-colors"
                :class="{ 'nav-link-active': $route.path === '/' || $route.path.startsWith('/workout/') || $route.path.startsWith('/template/') }"
              >
                <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                </svg>
                <span class="text-xs">Økter</span>
              </router-link>
              
              <router-link 
                to="/exercises" 
                class="flex flex-col items-center py-3 px-4 text-dark-300 hover:text-white transition-colors"
                :class="{ 'nav-link-active': $route.path === '/exercises' || $route.path.startsWith('/exercise/') }"
              >
                <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span class="text-xs">Øvelser</span>
              </router-link>
              
              <router-link 
                to="/history" 
                class="flex flex-col items-center py-3 px-4 text-dark-300 hover:text-white transition-colors"
                :class="{ 'nav-link-active': $route.path === '/history' || $route.path.startsWith('/session/') }"
              >
                <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="text-xs">Historikk</span>
              </router-link>
              
              <router-link 
                to="/stats" 
                class="flex flex-col items-center py-3 px-4 text-dark-300 hover:text-white transition-colors"
                :class="{ 'nav-link-active': $route.path === '/stats' }"
              >
                <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span class="text-xs">Statistikk</span>
              </router-link>
              
              <router-link 
                to="/profile"
                class="flex flex-col items-center py-3 px-4 text-dark-300 hover:text-white transition-colors"
              >
                <div class="w-6 h-6 mb-1 bg-primary-500 rounded-full flex items-center justify-center">
                  <span class="text-white text-xs font-medium">{{ userInitials }}</span>
                </div>
                <span class="text-xs">Profil</span>
              </router-link>
            </div>
          </nav>

          <!-- Workout Session Navigation - only show if in workout session -->
          <!-- Removed: Complete button is now integrated into WorkoutSession.vue content -->
        </MobileBrowserBanner>
      </div>
    </div>
  </ErrorBoundary>
   
  <!-- Global Error Toast -->
  <ErrorToast />
  
  <!-- Update Notification -->
  <UpdateNotification />
  
  <!-- Test component for development -->
  
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHybridData } from '@/composables/useHybridData'
import ErrorBoundary from '@/components/ErrorBoundary.vue'
import ErrorToast from '@/components/ErrorToast.vue'
import UpdateNotification from '@/components/UpdateNotification.vue'
 
import OfflineIndicator from '@/components/OfflineIndicator.vue'
import MobileBrowserBanner from '@/components/MobileBrowserBanner.vue'
import { useErrorHandler } from '@/composables/useErrorHandler'

const route = useRoute()
const router = useRouter()
const workoutData = useHybridData()
const { handleAuthError } = useErrorHandler()

// Refs
const mainContent = ref<HTMLElement>()

// State
const hasInitialized = ref(false)
const hasUnsavedChanges = ref(false)
const isSaving = ref(false)
const networkStatus = ref<'online' | 'offline'>('online')

// NEW: toggleable bottom nav (hidden when iOS keyboard shows / inputs focused)
const hideBottomNav = ref(false)

// --- Network status monitoring ---
const updateNetworkStatus = () => {
  networkStatus.value = navigator.onLine ? 'online' : 'offline'
  

  // If we're back online, sync pending changes
  if (networkStatus.value === 'online') {
    workoutData.syncPendingChanges()
  }
}

// Format last sync time (kept if you display this somewhere)
const formatLastSyncTime = (timestamp: number) => {
  const now = Date.now()
  const diff = now - timestamp

  if (diff < 60000) return 'Nettopp'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} minutter siden`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} timer siden`
  return `${Math.floor(diff / 86400000)} dager siden`
}

// Keep network status in sync with store
watch(() => workoutData.isOnline.value, (isOnline) => {
  networkStatus.value = isOnline ? 'online' : 'offline'
  
  if (isOnline) {
    workoutData.syncPendingChanges()
  }
})

// --- Computed ---
const isAuthenticated = computed(() => workoutData.isAuthenticated.value)
const currentUser = computed(() => workoutData.currentUser.value)
const isLoading = computed(() => !hasInitialized.value) // initial app loading only

const isWorkoutSession = computed(() => route.path.startsWith('/workout/'))

const userInitials = computed(() => {
  if (!currentUser.value?.email) return ''
  const name = currentUser.value.user_metadata?.name || currentUser.value.email.split('@')[0]
  const parts = name.split(' ')
  return (parts.length >= 2 ? parts[0][0] + parts[1][0] : name.substring(0, 2)).toUpperCase()
})

const isPWA = computed(() => window.matchMedia('(display-mode: standalone)').matches)
const isDevelopment = computed(() => import.meta.env.DEV)

// --- iOS keyboard helpers ---
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
         (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1)
}
function isTextInput(el: EventTarget | null) {
  const node = el as HTMLElement | null
  if (!node) return false
  const tag = node.tagName?.toLowerCase()
  if (tag === 'textarea') return true
  if (tag === 'input') return true
  if (node.isContentEditable) return true
  return false
}
let vvResizeHandler: ((this: VisualViewport, ev: Event) => any) | null = null

// --- Lifecycle ---
onMounted(async () => {
  // ✅ Restore last route on cold start if authenticated & currently at "/"
  const lastRoute = sessionStorage.getItem('lastRoute')
  if (
    workoutData.isAuthenticated.value &&
    route.path === '/' &&
    lastRoute &&
    lastRoute !== '/'
  ) {
    
    router.replace(lastRoute)
  }

  // Disable Ctrl+S (WorkoutSession handles auto-save)
  const handleKeydown = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault()
      
    }
  }

  // Receive save-state updates from WorkoutSession
  const handleSaveStateUpdate = (event: CustomEvent) => {
    hasUnsavedChanges.value = event.detail.hasUnsavedChanges
    isSaving.value = event.detail.isSaving
  }

  // Warn on unload if there are unsaved changes
  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (hasUnsavedChanges.value) {
      event.preventDefault()
      event.returnValue = 'Er du sikker på at du vil forlate siden?'
      return 'Er du sikker på at du vil forlate siden?'
    }
  }

  // NEW: external toggle for bottom nav (used by views/components)
  const toggleBottomNav = (e: Event) => {
    const ce = e as CustomEvent
    hideBottomNav.value = !!ce.detail?.hidden
  }

  // NEW: hide/show based on focus (iOS)
  const focusIn = (e: FocusEvent) => {
    if (!isIOS()) return
    if (isTextInput(e.target)) hideBottomNav.value = true
  }
  const focusOut = (e: FocusEvent) => {
    if (!isIOS()) return
    setTimeout(() => {
      hideBottomNav.value = isTextInput(document.activeElement) ? true : false
    }, 80)
  }

  // NEW: visualViewport signals for keyboard presence (iOS 15+)
  if ('visualViewport' in window && (window as any).visualViewport) {
    const vv = (window as any).visualViewport as VisualViewport
    vvResizeHandler = () => {
      const kbHeight = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      document.documentElement.style.setProperty('--kb', `${Math.round(kbHeight)}px`)
      if (kbHeight === 0 && !isTextInput(document.activeElement)) hideBottomNav.value = false
    }
    vv.addEventListener('resize', vvResizeHandler)
    vv.addEventListener('scroll', vvResizeHandler)
  }

  // Reset on route changes
  const stopRouteWatch = watch(() => route.fullPath, () => { hideBottomNav.value = false })

  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('updateAppSaveState', handleSaveStateUpdate as EventListener)
  window.addEventListener('beforeunload', handleBeforeUnload)
  window.addEventListener('online', updateNetworkStatus)
  window.addEventListener('offline', updateNetworkStatus)

  // NEW: listeners for nav/keyboard
  window.addEventListener('toggleBottomNav', toggleBottomNav as EventListener)
  document.addEventListener('focusin', focusIn)
  document.addEventListener('focusout', focusOut)

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
    window.removeEventListener('updateAppSaveState', handleSaveStateUpdate as EventListener)
    window.removeEventListener('beforeunload', handleBeforeUnload)
    window.removeEventListener('online', updateNetworkStatus)
    window.removeEventListener('offline', updateNetworkStatus)

    // NEW: cleanup
    window.removeEventListener('toggleBottomNav', toggleBottomNav as EventListener)
    document.removeEventListener('focusin', focusIn)
    document.removeEventListener('focusout', focusOut)
    if (vvResizeHandler && (window as any).visualViewport) {
      const vv = (window as any).visualViewport as VisualViewport
      vv.removeEventListener('resize', vvResizeHandler)
      vv.removeEventListener('scroll', vvResizeHandler)
    }
    stopRouteWatch()
  })
})

onUnmounted(() => {
  workoutData.cleanup()
})

// --- Watchers ---
// Auth watcher: finalize init; redirect unauth’d to login WITH redirect back to the page they wanted
watch(
  isAuthenticated,
  (newValue) => {
    if (newValue || !workoutData.isLoading.value) {
      hasInitialized.value = true
    }

    if (!newValue && route.path !== '/login' && route.path !== '/reset-password') {
      // Do NOT redirect away if the user landed directly on a protected route; router guard will handle it.
      // This prevents bouncing away during auth hydration when refreshing a protected page.
      // router.push({ path: '/login', query: { redirect: route.fullPath } })
    }
  },
  { immediate: true }
)

// Also end initial loading when the store loading completes
watch(
  () => workoutData.isLoading.value,
  (newValue) => {
    if (!newValue) {
      hasInitialized.value = true
    }
  },
  { immediate: true }
)
</script>
