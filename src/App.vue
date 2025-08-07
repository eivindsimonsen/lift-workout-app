<template>
  <ErrorBoundary>
    <div class="min-h-screen bg-dark-900">
      <!-- Loading state while checking authentication -->
      <div v-if="isLoading" class="flex items-center justify-center min-h-screen">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p class="text-dark-300">Laster...</p>
        </div>
      </div>

      <!-- App content when loaded -->
      <div v-else>
        <!-- Header - only show if authenticated -->
        <header v-if="isAuthenticated" class="bg-dark-800 border-b border-dark-700">
          <div class="container mx-auto px-4 py-4">
            <div class="flex items-center justify-between">
              <div>
                <h1 class="text-2xl font-bold text-white">
                  <span class="text-primary-500">Treningsloggen</span>
                </h1>
                <p class="text-sm text-dark-300">Full kontroll over treningsøktene dine</p>
              </div>
              
              <!-- Desktop Navigation -->
              <nav class="hidden md:flex items-center space-x-6">
                <router-link 
                  to="/" 
                  class="text-dark-300 hover:text-white transition-colors"
                  active-class="nav-link-active"
                >
                  Dashboard
                </router-link>
                <router-link 
                  to="/history" 
                  class="text-dark-300 hover:text-white transition-colors"
                  active-class="nav-link-active"
                >
                  Historikk
                </router-link>
                <router-link 
                  to="/stats" 
                  class="text-dark-300 hover:text-white transition-colors"
                  active-class="nav-link-active"
                >
                  Statistikk
                </router-link>
                
                <!-- User Menu -->
                <div class="relative user-menu">
                  <button 
                    @click="toggleUserMenu"
                    class="flex items-center space-x-2 text-dark-300 hover:text-white transition-colors"
                  >
                    <div class="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                      <span class="text-white text-sm font-medium">
                        {{ userInitials }}
                      </span>
                    </div>
                    <span class="text-sm">{{ currentUser?.user_metadata?.name || currentUser?.email }}</span>
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  <!-- User Dropdown Menu -->
                  <div v-if="showUserMenu" class="absolute right-0 mt-2 w-48 bg-dark-700 rounded-lg shadow-lg border border-dark-600 z-50">
                    <div class="py-2">
                      <div class="px-4 py-2 border-b border-dark-600">
                        <p class="text-white text-sm font-medium">{{ currentUser?.user_metadata?.name || 'Bruker' }}</p>
                        <p class="text-dark-300 text-xs">{{ currentUser?.email }}</p>
                      </div>
                      
                                             <router-link 
                         to="/profile"
                         data-action="profile"
                         class="w-full text-left px-4 py-2 text-sm text-dark-300 hover:text-white hover:bg-dark-600 transition-colors"
                       >
                         <div class="flex items-center space-x-2">
                           <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                           </svg>
                           <span>Profil</span>
                         </div>
                       </router-link>
                      
                      <button 
                        @click="handleSignOut"
                        data-action="logout"
                        class="w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-dark-600 transition-colors"
                      >
                        <div class="flex items-center space-x-2">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          <span>Logg ut</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </nav>
            </div>
          </div>
        </header>

        <!-- Main content -->
        <main :class="isAuthenticated ? `container mx-auto px-4 py-8 ${isWorkoutSession ? 'pb-32 md:pb-32' : 'pb-24 md:pb-8'}` : ''">
          <router-view />
        </main>

        <!-- Desktop Workout Session Actions - only show if in workout session -->
        <div v-if="isAuthenticated && isWorkoutSession" class="hidden md:block fixed bottom-0 left-0 right-0 bg-dark-800 border-t border-dark-700 z-50">
          <!-- Progress Bar as border-top -->
          <div class="w-full h-1 bg-dark-600">
            <div 
              class="bg-primary-500 h-1 transition-all duration-300"
              :style="{ width: workoutProgress.percentage + '%' }"
            ></div>
          </div>
          
          <!-- Action Buttons -->
          <div class="container mx-auto px-4 py-4">
            <div class="flex gap-3 max-w-md mx-auto">
              <button 
                @click="handleSaveWorkout"
                class="flex-1 bg-dark-600 hover:bg-dark-500 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Lagre
              </button>
              <button 
                @click="handleCompleteWorkout"
                class="flex-1 bg-primary-500 hover:bg-primary-600 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
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
        <nav v-if="isAuthenticated && !isWorkoutSession" class="md:hidden fixed bottom-0 left-0 right-0 bg-dark-800 border-t border-dark-700 z-50">
          <div class="flex justify-around">
            <router-link 
              to="/" 
              class="flex flex-col items-center py-3 px-4 text-dark-300 hover:text-white transition-colors"
              :class="{ 'nav-link-active': $route.path === '/' }"
            >
              <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
              </svg>
              <span class="text-xs">Hjem</span>
            </router-link>
            
            <router-link 
              to="/history" 
              class="flex flex-col items-center py-3 px-4 text-dark-300 hover:text-white transition-colors"
              :class="{ 'nav-link-active': $route.path === '/history' }"
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
        <nav v-if="isAuthenticated && isWorkoutSession" class="md:hidden fixed bottom-0 left-0 right-0 bg-dark-800 border-t border-dark-700 z-50">
          <!-- Progress Bar as border-top -->
          <div class="w-full h-1 bg-dark-600">
            <div 
              class="bg-primary-500 h-1 transition-all duration-300"
              :style="{ width: workoutProgress.percentage + '%' }"
            ></div>
          </div>
          
          <!-- Action Buttons -->
          <div class="flex gap-3 p-4">
            <button 
              @click="handleSaveWorkout"
              class="flex-1 bg-dark-600 hover:bg-dark-500 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Lagre
            </button>
            <button 
              @click="handleCompleteWorkout"
              class="flex-1 bg-primary-500 hover:bg-primary-600 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              Fullfør
            </button>
          </div>
        </nav>

        
      </div>
    </div>
  </ErrorBoundary>
   
       <!-- Global Error Toast -->
    <ErrorToast />
    

  </template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHybridData } from '@/composables/useHybridData'
import { supabase } from '@/lib/supabase'
import ErrorBoundary from '@/components/ErrorBoundary.vue'
import ErrorToast from '@/components/ErrorToast.vue'
import { useErrorHandler } from '@/composables/useErrorHandler'

const route = useRoute()
const router = useRouter()
const workoutData = useHybridData()
const { showError, handleAuthError } = useErrorHandler()

// Authentication state
const showUserMenu = ref(false)
const hasInitialized = ref(false) // Track if app has been initialized
const sessionCheckInterval = ref<NodeJS.Timeout | null>(null)



// Check if we're in a workout session
const isWorkoutSession = computed(() => {
  return route.path.startsWith('/workout/') && route.params.id
})

// Workout progress for the progress bar
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

// Check if workout can be completed (100% progress)
// Note: We now allow completion regardless of progress, but show confirmation
const canCompleteWorkout = computed(() => {
  return true // Always allow completion
})

// Computed properties
const isAuthenticated = computed(() => workoutData.isAuthenticated.value)
const currentUser = computed(() => workoutData.currentUser.value)
const isLoading = computed(() => {
  // Only show loading if we haven't initialized yet and are actually loading
  return !hasInitialized.value && workoutData.isLoading.value
})

const userInitials = computed(() => {
  if (!currentUser.value) return '?'
  
  const name = currentUser.value.user_metadata?.name || currentUser.value.email || ''
  return name
    .split(' ')
    .map((word: string) => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2)
})

// Methods
const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
}

const handleSignOut = async () => {
  try {

    
    // Close menus immediately to prevent UI issues
    showUserMenu.value = false
    
    // Add a small delay to ensure UI updates before logout
    await new Promise(resolve => setTimeout(resolve, 100))
    
    await workoutData.signOut()
    
    // Force navigation to login page

    router.push('/login')
  } catch (error) {
    console.error('Error during sign out:', error)
    // Even if there's an error, try to redirect to login
    router.push('/login')
  }
}



const handleSaveWorkout = async () => {
  if (!isWorkoutSession.value || !route.params.id) return

  try {
    const sessionId = route.params.id as string
    await workoutData.markSessionAsActive(sessionId)
    // Don't show error message on success - just redirect
    router.push('/')
  } catch (error: any) {
    handleAuthError(error)
  }
}

const handleCompleteWorkout = async () => {
  if (!isWorkoutSession.value || !route.params.id) return

  if (confirm('Er du sikker på at du vil avslutte økten?')) {
    try {
      const sessionId = route.params.id as string
      await workoutData.completeWorkoutSession(sessionId)
      router.push('/history')
    } catch (error: any) {
      handleAuthError(error)
    }
  }
}



// Close user menu when clicking outside
const handleClickOutside = (event: Event) => {
  const target = event.target as Element
  
  // Don't close if clicking on logout button or profile button
  if (target.closest('[data-action="logout"]') || target.closest('[data-action="profile"]')) {
    return
  }
  
  if (!target.closest('.user-menu')) {
    showUserMenu.value = false
  }
}

// Lifecycle
onMounted(async () => {
  document.addEventListener('click', handleClickOutside)
  
  // Initialize authentication first
  await workoutData.initializeAuth()
  
  // Add focus/blur handlers to help with tab switching issues
  const handleFocus = () => {

    // Re-check authentication state when window gains focus
    if (workoutData.isAuthenticated.value && workoutData.currentUser.value) {
      // Force a session check to ensure state is fresh
      workoutData.loadData()
    }
  }
  
  const handleBlur = () => {

    // Optional: could add cleanup here if needed
  }
  
  window.addEventListener('focus', handleFocus)
  window.addEventListener('blur', handleBlur)
  
  // Store handlers for cleanup
  ;(window as any).__appFocusHandler = handleFocus
  ;(window as any).__appBlurHandler = handleBlur

  // Start periodic session check
  startSessionCheck()
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  
  // Clean up focus/blur handlers
  if (typeof window !== 'undefined') {
    const focusHandler = (window as any).__appFocusHandler
    const blurHandler = (window as any).__appBlurHandler
    
    if (focusHandler) {
      window.removeEventListener('focus', focusHandler)
      delete (window as any).__appFocusHandler
    }
    
    if (blurHandler) {
      window.removeEventListener('blur', blurHandler)
      delete (window as any).__appBlurHandler
    }
  }
  
  // Clean up Supabase data event listeners
  workoutData.cleanup()
  stopSessionCheck()
})

// Periodic session check to prevent app from becoming unresponsive
const startSessionCheck = () => {
  // Clear any existing interval
  if (sessionCheckInterval.value) {
    clearInterval(sessionCheckInterval.value)
  }
  
  // Check session every 30 seconds to ensure app stays responsive
  sessionCheckInterval.value = setInterval(() => {
    if (workoutData.isAuthenticated.value && workoutData.currentUser.value) {
  
      // This will trigger a session refresh if needed
      workoutData.loadData()
    }
  }, 30000) // 30 seconds
}

const stopSessionCheck = () => {
  if (sessionCheckInterval.value) {
    clearInterval(sessionCheckInterval.value)
    sessionCheckInterval.value = null
  }
}



// Watch for authentication state to mark app as initialized
watch(isAuthenticated, (newValue) => {
  if (newValue || !workoutData.isLoading.value) {
    hasInitialized.value = true
  }
}, { immediate: true })

// Also watch loading state
watch(() => workoutData.isLoading.value, (newValue) => {
  if (!newValue) {
    hasInitialized.value = true
  }
}, { immediate: true })
</script> 