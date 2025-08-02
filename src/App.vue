<template>
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
                    
                    <button 
                      @click="showProfileModal = true"
                      class="w-full text-left px-4 py-2 text-sm text-dark-300 hover:text-white hover:bg-dark-600 transition-colors"
                    >
                      <div class="flex items-center space-x-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>Profil</span>
                      </div>
                    </button>
                    
                    <button 
                      @click="handleSignOut"
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
      <main :class="isAuthenticated ? 'container mx-auto px-4 py-8 pb-24 md:pb-8' : ''">
        <router-view />
      </main>

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
          
          <button 
            @click="showProfileModal = true"
            class="flex flex-col items-center py-3 px-4 text-dark-300 hover:text-white transition-colors"
          >
            <div class="w-6 h-6 mb-1 bg-primary-500 rounded-full flex items-center justify-center">
              <span class="text-white text-xs font-medium">{{ userInitials }}</span>
            </div>
            <span class="text-xs">Profil</span>
          </button>
        </div>
      </nav>

      <!-- Profile Modal -->
      <div v-if="showProfileModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div class="bg-dark-800 rounded-lg max-w-md w-full p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold text-white">Brukerprofil</h2>
            <button 
              @click="showProfileModal = false"
              class="text-dark-300 hover:text-white transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-white mb-2">Navn</label>
              <input 
                v-model="profileName"
                type="text"
                class="input-field w-full"
                placeholder="Ditt navn"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-white mb-2">E-post</label>
              <input 
                v-model="profileEmail"
                type="email"
                class="input-field w-full"
                placeholder="din@email.com"
                disabled
              />
              <p class="text-xs text-dark-400 mt-1">E-post kan ikke endres</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-white mb-2">Nytt passord</label>
              <input 
                v-model="newPassword"
                type="password"
                class="input-field w-full"
                placeholder="La stå tomt for å beholde nåværende"
              />
            </div>

            <div class="flex space-x-3 pt-4">
              <button 
                @click="updateProfile"
                class="btn-primary flex-1"
                :disabled="isUpdating"
              >
                {{ isUpdating ? 'Oppdaterer...' : 'Oppdater profil' }}
              </button>
              <button 
                @click="handleSignOut"
                class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Logg ut
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHybridData } from '@/composables/useHybridData'
import { supabase } from '@/lib/supabase'

const route = useRoute()
const router = useRouter()
const workoutData = useHybridData()

// Authentication state
const showUserMenu = ref(false)
const showProfileModal = ref(false)
const isUpdating = ref(false)

// Profile form data
const profileName = ref('')
const profileEmail = ref('')
const newPassword = ref('')

// Check if we're in a workout session
const isWorkoutSession = computed(() => {
  return route.path.startsWith('/workout/') && route.params.id
})

// Computed properties
const isAuthenticated = computed(() => workoutData.isAuthenticated.value)
const currentUser = computed(() => workoutData.currentUser.value)
const isLoading = computed(() => workoutData.isLoading.value)

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
  await workoutData.signOut()
  showUserMenu.value = false
  showProfileModal.value = false
  router.push('/login')
}

const updateProfile = async () => {
  if (!currentUser.value) return

  isUpdating.value = true
  
  try {
    const updates: any = {}
    
    // Update name if changed
    if (profileName.value !== currentUser.value.user_metadata?.name) {
      updates.data = { name: profileName.value }
    }
    
    // Update password if provided
    if (newPassword.value.trim()) {
      updates.password = newPassword.value
    }
    
    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.auth.updateUser(updates)
      
      if (error) {
        alert('Feil ved oppdatering av profil: ' + error.message)
      } else {
        alert('Profil oppdatert!')
        newPassword.value = ''
        showProfileModal.value = false
      }
    }
  } catch (error) {
    console.error('Error updating profile:', error)
    alert('En feil oppstod ved oppdatering av profil')
  } finally {
    isUpdating.value = false
  }
}

// Initialize profile data when modal opens
const initializeProfileData = () => {
  if (currentUser.value) {
    profileName.value = currentUser.value.user_metadata?.name || ''
    profileEmail.value = currentUser.value.email || ''
  }
}

// Close user menu when clicking outside
const handleClickOutside = (event: Event) => {
  const target = event.target as Element
  if (!target.closest('.user-menu')) {
    showUserMenu.value = false
  }
}

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Watch for modal state changes
watch(showProfileModal, (newValue) => {
  if (newValue) {
    initializeProfileData()
  }
})
</script> 