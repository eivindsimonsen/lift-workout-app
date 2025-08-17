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
        
        <!-- Non-authenticated content -->
        <main v-else>
          <router-view />
        </main>

        <!-- Offline Indicator -->
        <OfflineIndicator />
        

        


        <!-- Mobile Bottom Navigation - only show if authenticated -->
        <nav v-if="isAuthenticated" class="md:hidden fixed bottom-0 left-0 right-0 bg-dark-800 border-t border-dark-700 z-50 pwa-navigation pb-6" :style="isPWA ? 'padding-bottom: calc(1.5rem + env(safe-area-inset-bottom))' : ''">
          <!-- Progress Bar as border-top - only show if in workout session -->
          <div v-if="isWorkoutSession" class="w-full h-1 bg-dark-600">
            <div 
              class="bg-primary-500 h-1 transition-all duration-300"
              :style="{ width: workoutProgress.percentage + '%' }"
            ></div>
          </div>
          
          <div class="flex justify-around pb-5">
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
  <UpdateTest v-if="isDevelopment" />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHybridData } from '@/composables/useHybridData'
import ErrorBoundary from '@/components/ErrorBoundary.vue'
import ErrorToast from '@/components/ErrorToast.vue'
import UpdateNotification from '@/components/UpdateNotification.vue'
import UpdateTest from '@/components/UpdateTest.vue'

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

// Network status monitoring
const updateNetworkStatus = () => {
  networkStatus.value = navigator.onLine ? 'online' : 'offline'
  console.log(`🌐 App: Network status changed to ${networkStatus.value}`)
  
  // If we're back online, sync pending changes
  if (networkStatus.value === 'online') {
    workoutData.syncPendingChanges()
  }
}

// Format last sync time
const formatLastSyncTime = (timestamp: number) => {
  const now = Date.now()
  const diff = now - timestamp
  
  if (diff < 60000) { // Less than 1 minute
    return 'Nettopp'
  } else if (diff < 3600000) { // Less than 1 hour
    const minutes = Math.floor(diff / 60000)
    return `${minutes} minutter siden`
  } else if (diff < 86400000) { // Less than 1 day
    const hours = Math.floor(diff / 3600000)
    return `${hours} timer siden`
  } else {
    const days = Math.floor(diff / 86400000)
    return `${days} dager siden`
  }
}

// Watch for network status changes
watch(() => workoutData.isOnline.value, (isOnline) => {
  networkStatus.value = isOnline ? 'online' : 'offline'
  console.log(`🌐 App: Network status updated to ${networkStatus.value}`)
  
  // If we're back online, sync pending changes
  if (isOnline) {
    workoutData.syncPendingChanges()
  }
})

// Computed properties
const isAuthenticated = computed(() => workoutData.isAuthenticated.value)
const currentUser = computed(() => workoutData.currentUser.value)
const isLoading = computed(() => {
  // Show loading only during initial auth setup, not on subsequent data loads
  // This prevents showing the loading screen every time the app is opened
  return !hasInitialized.value
})

const isWorkoutSession = computed(() => {
  return route.path.startsWith('/workout/')
})

const workoutProgress = computed(() => {
  if (!isWorkoutSession.value) {
    return { percentage: 0 }
  }
  
  // Get the current workout session from the route
  const sessionId = route.params.id as string
  const session = workoutData.getSessionById.value(sessionId)
  
  if (!session) {
    return { percentage: 0 }
  }
  
  // Calculate progress based on completed sets
  const totalSets = session.exercises.reduce((total, exercise) => {
    return total + exercise.sets.length
  }, 0)
  
  const completedSets = session.exercises.reduce((total, exercise) => {
    return total + exercise.sets.filter(set => set.isCompleted).length
  }, 0)
  
  const percentage = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0
  
  return { percentage }
})

const userInitials = computed(() => {
  if (!currentUser.value?.email) return ''
  
  // Extract name from email or use email
  const name = currentUser.value.user_metadata?.name || currentUser.value.email.split('@')[0]
  
  // Split name into parts and get initials
  const nameParts = name.split(' ')
  if (nameParts.length >= 2) {
    return (nameParts[0][0] + nameParts[1][0]).toUpperCase()
  } else {
    return name.substring(0, 2).toUpperCase()
  }
})

const isPWA = computed(() => {
  return window.matchMedia('(display-mode: standalone)').matches
})

const isDevelopment = computed(() => {
  return import.meta.env.DEV
})

// Methods
// Auto-save is handled automatically in WorkoutSession.vue

// Session management - Removed automatic interval to prevent unnecessary data reloading

// Lifecycle
onMounted(async () => {
  try {
    await workoutData.initializeAuth()
  } catch (error) {
    console.error("Error initializing auth:", error)
    // Don't fail the entire app initialization
  }

  // Auto-save is handled automatically, no manual save needed
  const handleKeydown = (event: KeyboardEvent) => {
    // Disable Ctrl+S since auto-save handles everything
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault()
      // Show a message that auto-save is active
      console.log('📱 Auto-save is active - no manual save needed')
    }
  }
  
  // Listen for save state updates from WorkoutSession.vue
  const handleSaveStateUpdate = (event: CustomEvent) => {
    hasUnsavedChanges.value = event.detail.hasUnsavedChanges
    isSaving.value = event.detail.isSaving
  }
  
  // Add beforeunload listener to warn about unsaved changes
  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (hasUnsavedChanges.value) {
      event.preventDefault()
      event.returnValue = 'Er du sikker på at du vil forlate siden?'
      return 'Er du sikker på at du vil forlate siden?'
    }
  }
  
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('updateAppSaveState', handleSaveStateUpdate as EventListener)
  window.addEventListener('beforeunload', handleBeforeUnload)
  window.addEventListener('online', updateNetworkStatus)
  window.addEventListener('offline', updateNetworkStatus)
  
  // Cleanup on unmount
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
    window.removeEventListener('updateAppSaveState', handleSaveStateUpdate as EventListener)
    window.removeEventListener('beforeunload', handleBeforeUnload)
    window.removeEventListener('online', updateNetworkStatus)
    window.removeEventListener('offline', updateNetworkStatus)
  })
})

onUnmounted(() => {
  workoutData.cleanup()
})

// Watchers
watch(isAuthenticated, (newValue) => {
  if (newValue || !workoutData.isLoading.value) {
    hasInitialized.value = true
  }
  
  // Redirect to login if not authenticated and not on login page
  if (!newValue && route.path !== '/login' && route.path !== '/reset-password') {
    router.push('/login')
  }
}, { immediate: true })

watch(() => workoutData.isLoading.value, (newValue) => {
  if (!newValue) {
    hasInitialized.value = true
  }
}, { immediate: true })

// Watch for route changes to reset scroll position
watch(() => route.path, () => {
  // Use nextTick to ensure DOM is updated before scrolling
  nextTick(() => {
    // Check if we're navigating between workout sessions
    const isWorkoutToWorkout = route.path.startsWith('/workout/')
    
    // Don't reset scroll for workout session navigation (let the component handle it)
    if (isWorkoutToWorkout) {
      console.log('📱 Navigating to workout session, preserving scroll behavior')
      return
    }
    
    // Reset scroll position when route changes to non-workout routes
    
    // Check if we're in PWA mode
    const isPWA = window.matchMedia('(display-mode: standalone)').matches
    
    if (isPWA) {
      // PWA-specific aggressive scroll reset
      // Method 1: Force reset all possible scroll containers
      window.scrollTo({ top: 0, behavior: 'auto' })
      
      // Method 2: Reset main content with force
      if (mainContent.value) {
        mainContent.value.scrollTop = 0
        mainContent.value.scrollLeft = 0
      }
      
      // Method 3: Reset body with force
      if (document.body) {
        document.body.scrollTop = 0
        document.body.scrollLeft = 0
      }
      
      // Method 4: Reset documentElement with force
      if (document.documentElement) {
        document.documentElement.scrollTop = 0
        document.documentElement.scrollLeft = 0
      }
      
      // Method 5: Reset app container specifically
      const appContainer = document.getElementById('app')
      if (appContainer) {
        appContainer.scrollTop = 0
        appContainer.scrollLeft = 0
      }
      
      // Method 6: Force scroll reset after a delay for PWA
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'auto' })
        if (mainContent.value) {
          mainContent.value.scrollTop = 0
        }
        // Force scroll reset on all containers again
        [document.body, document.documentElement, appContainer].forEach(el => {
          if (el) {
            el.scrollTop = 0
            el.scrollLeft = 0
          }
        })
      }, 50)
      
      // Method 7: Additional reset after component is fully rendered
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'auto' })
        if (mainContent.value) {
          mainContent.value.scrollTop = 0
        }
      }, 200)
      
    } else {
      // Browser version - use smooth scrolling
      window.scrollTo({ top: 0, behavior: 'smooth' })
      
      if (mainContent.value) {
        mainContent.value.scrollTop = 0
      }
      
      if (document.body) {
        document.body.scrollTop = 0
      }
      
      if (document.documentElement) {
        document.documentElement.scrollTop = 0
      }
    }
  })
})
</script> 