<template>
  <ErrorBoundary>
    <div class="min-h-screen bg-dark-900">
      <!-- Loading state while checking authentication -->
      <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p class="text-dark-300">Laster...</p>
          <p class="text-sm text-dark-400 mt-2">Venter på autentisering...</p>
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
              Treningsloggen
            </router-link>

            <nav class="flex items-center gap-6">
              <router-link 
                to="/" 
                class="text-dark-300 hover:text-white transition-colors"
                :class="{ 'nav-link-active': $route.path === '/' || $route.path.startsWith('/workout/') || $route.path.startsWith('/template/') }"
              >
                Økter
              </router-link>

              <router-link 
                to="/exercises" 
                class="text-dark-300 hover:text-white transition-colors"
                :class="{ 'nav-link-active': $route.path === '/exercises' || $route.path.startsWith('/exercise/') }"
              >
                Øvelser
              </router-link>

              <router-link 
                to="/history" 
                class="text-dark-300 hover:text-white transition-colors"
                :class="{ 'nav-link-active': $route.path === '/history' || $route.path.startsWith('/session/') }"
              >
                Historikk
              </router-link>

              <router-link 
                to="/stats" 
                class="text-dark-300 hover:text-white transition-colors"
                :class="{ 'nav-link-active': $route.path === '/stats' }"
              >
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
               :class="`container mx-auto px-4 py-8 ${isWorkoutSession ? 'pb-32 md:pb-32' : 'pb-32 md:pb-8'}`" 
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
        

        


        <!-- Desktop Workout Session Actions - only show if in workout session -->
        <div v-if="isAuthenticated && isWorkoutSession" class="hidden md:block fixed bottom-0 left-0 right-0 bg-dark-800 border-t border-dark-700 z-50 pwa-navigation">
          <!-- Progress Bar as border-top -->
          <div class="w-full h-1 bg-dark-600">
            <div 
              class="bg-primary-500 h-1 transition-all duration-300"
              :style="{ width: workoutProgress.percentage + '%' }"
            ></div>
          </div>
          
          <!-- Action Buttons -->
          <div class="container mx-auto px-4 py-3.5">
            <div class="flex gap-3 max-w-md mx-auto">
              <button 
                @click="handleSaveWorkout"
                :disabled="!hasUnsavedChanges || isSaving"
                class="flex-1 text-white py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                :class="hasUnsavedChanges && !isSaving ? 'bg-dark-700 hover:bg-dark-600' : 'bg-dark-800 cursor-not-allowed'"
                data-save-button
              >
                <svg v-if="!isSaving" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <div v-else class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>{{ isSaving ? 'Lagrer...' : 'Lagre' }}</span>
              </button>
              <button 
                @click="handleCompleteWorkout"
                class="flex-1 bg-primary-500 hover:bg-primary-600 text-white py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Fullfør
              </button>
            </div>
          </div>
        </div>

        <!-- Mobile Bottom Navigation - only show if authenticated -->
        <nav v-if="isAuthenticated && !isWorkoutSession" class="md:hidden fixed bottom-0 left-0 right-0 bg-dark-800 border-t border-dark-700 z-50 pwa-navigation" :style="isPWA ? 'padding-bottom: calc(10rem + env(safe-area-inset-bottom))' : 'padding-bottom: 10rem'">
          <div class="flex justify-around pt-6 pb-4">
            <router-link 
              to="/" 
              class="flex flex-col items-center py-3 px-4 text-dark-300 hover:text-white transition-colors"
              :class="{ 'nav-link-active': $route.path === '/' || $route.path.startsWith('/workout/') || $route.path.startsWith('/template/') }"
            >
              <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
              </svg>
              <span class="text-xs">Økter</span>
            </router-link>
            
            <router-link 
              to="/exercises" 
              class="flex flex-col items-center py-3 px-4 text-dark-300 hover:text-white transition-colors"
              :class="{ 'nav-link-active': $route.path === '/exercises' || $route.path.startsWith('/exercise/') }"
            >
              <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
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
        <nav v-if="isAuthenticated && isWorkoutSession" class="md:hidden fixed bottom-0 left-0 right-0 bg-dark-800 border-t border-dark-700 z-50 pwa-navigation" :style="isPWA ? 'padding-bottom: calc(10rem + env(safe-area-inset-bottom))' : 'padding-bottom: 10rem'">
          <!-- Progress Bar as border-top -->
          <div class="w-full h-1 bg-dark-600">
            <div 
              class="bg-primary-500 h-1 transition-all duration-300"
              :style="{ width: workoutProgress.percentage + '%' }"
            ></div>
          </div>
          
          <!-- Action Buttons -->
          <div class="flex gap-3 px-4 pt-6 pb-4">
            <button 
              @click="handleCompleteWorkout"
              class="flex-1 bg-primary-500 hover:bg-primary-600 text-white py-3 px-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              Fullfør
            </button>
            <button 
              @click="handleSaveWorkout"
              :disabled="!hasUnsavedChanges || isSaving"
              class="flex-1 text-white py-3 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              :class="hasUnsavedChanges && !isSaving ? 'bg-dark-700 hover:bg-dark-600' : 'bg-dark-800 cursor-not-allowed'"
              data-save-button
            >
              <svg v-if="!isSaving" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              <div v-else class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>{{ isSaving ? 'Lagrer...' : 'Lagre' }}</span>
            </button>
          </div>
        </nav>
        </MobileBrowserBanner>
      </div>
    </div>
  </ErrorBoundary>
   
  <!-- Global Error Toast -->
  <ErrorToast />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHybridData } from '@/composables/useHybridData'
import ErrorBoundary from '@/components/ErrorBoundary.vue'
import ErrorToast from '@/components/ErrorToast.vue'

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

// Computed properties
const isWorkoutSession = computed(() => {
  return route.path.startsWith('/workout/') && route.params.id
})

const workoutProgress = computed(() => {
  if (!isWorkoutSession.value || !route.params.id) {
    return { completedSets: 0, totalSets: 0, percentage: 0 }
  }
  
  const sessionId = route.params.id as string
  const session = workoutData.getSessionById.value(sessionId)
  
  if (!session) {
    return { completedSets: 0, totalSets: 0, percentage: 0 }
  }
  
  const completedSets = session.exercises.reduce((total, exercise) => {
    return total + exercise.sets.filter(set => set.isCompleted).length
  }, 0)
  
  const totalSets = session.exercises.reduce((total, exercise) => {
    return total + exercise.sets.length
  }, 0)
  
  const percentage = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0
  
  return { completedSets, totalSets, percentage }
})

const isAuthenticated = computed(() => workoutData.isAuthenticated.value)
const currentUser = computed(() => workoutData.currentUser.value)
const isLoading = computed(() => {
  // Show loading while initializing auth or while loading data
  return !hasInitialized.value || workoutData.isLoading.value
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



// Methods

const handleSaveWorkout = async () => {
  if (!isWorkoutSession.value || !route.params.id) return

  try {
    isSaving.value = true
    
    // Emit a custom event that WorkoutSession.vue can listen to
    const saveEvent = new CustomEvent('saveWorkoutSession', {
      detail: { sessionId: route.params.id }
    })
    window.dispatchEvent(saveEvent)
    
    // Wait a bit to show the loading state
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Show success state temporarily
    const saveButton = document.querySelector('[data-save-button]') as HTMLButtonElement
    if (saveButton) {
      const originalText = saveButton.innerHTML
      saveButton.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        Lagring velykket
      `
      saveButton.disabled = true
      saveButton.classList.add('bg-green-600', 'hover:bg-green-600')
      
      setTimeout(() => {
        saveButton.innerHTML = originalText
        saveButton.disabled = false
        saveButton.classList.remove('bg-green-600', 'hover:bg-green-600')
        isSaving.value = false
        hasUnsavedChanges.value = false
      }, 2000)
    }
  } catch (error: any) {
    isSaving.value = false
    handleAuthError(error)
  }
}

const handleCompleteWorkout = async () => {
  if (!isWorkoutSession.value || !route.params.id) return

  if (confirm('Er du sikker på at du vil avslutte økten?')) {
    try {
      const sessionId = route.params.id as string
      await workoutData.completeWorkoutSession(sessionId)
      router.push(`/session/${sessionId}`)
    } catch (error: any) {
      handleAuthError(error)
    }
  }
}





// Session management - Removed automatic interval to prevent unnecessary data reloading

// Lifecycle
onMounted(async () => {
  try {
    await workoutData.initializeAuth()
  } catch (error) {
    console.error("Error initializing auth:", error)
    // Don't fail the entire app initialization
  }
  
  const handleFocus = () => {
    if (workoutData.isAuthenticated.value && workoutData.currentUser.value) {
      workoutData.loadData()
    }
  }
  
  window.addEventListener('focus', handleFocus)
  ;(window as any).__appFocusHandler = handleFocus

  // Add keyboard shortcut for saving (Ctrl+S)
  const handleKeydown = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault()
      if (hasUnsavedChanges.value && !isSaving.value) {
        handleSaveWorkout()
      }
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
      event.returnValue = 'Du har ulagrede endringer. Er du sikker på at du vil forlate siden?'
      return 'Du har ulagrede endringer. Er du sikker på at du vil forlate siden?'
    }
  }
  
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('updateAppSaveState', handleSaveStateUpdate as EventListener)
  window.addEventListener('beforeunload', handleBeforeUnload)
  
  // Cleanup on unmount
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
    window.removeEventListener('updateAppSaveState', handleSaveStateUpdate as EventListener)
    window.removeEventListener('beforeunload', handleBeforeUnload)
  })
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    const focusHandler = (window as any).__appFocusHandler
    
    if (focusHandler) {
      window.removeEventListener('focus', focusHandler)
      delete (window as any).__appFocusHandler
    }
  }
  
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
    // Reset scroll position when route changes
    
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