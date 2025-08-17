<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-primary-500/20 rounded-lg flex items-center justify-center">
          <svg class="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-white">Brukerprofil</h1>
      </div>
    </div>

    <!-- Loading State for Profile Info -->
    <div v-if="isLoading" class="card animate-pulse">
      <div class="space-y-6">
        <div>
          <div class="h-6 bg-dark-600 rounded w-48 mb-4"></div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-for="i in 3" :key="i" class="space-y-2">
              <div class="h-4 bg-dark-600 rounded w-16"></div>
              <div class="h-10 bg-dark-600 rounded w-full"></div>
              <div v-if="i === 2" class="h-3 bg-dark-600 rounded w-64"></div>
            </div>
          </div>
        </div>
        <div class="flex justify-end pt-2">
          <div class="h-10 bg-dark-600 rounded w-32"></div>
        </div>
      </div>
    </div>

    <!-- Profile Info Card -->
    <div v-else class="card">
      <div class="space-y-6">
        <div>
          <h3 class="text-lg font-semibold text-white mb-4">Grunnleggende informasjon</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-white mb-2">Navn *</label>
              <input v-model="profileName" type="text" required class="input-field w-full" placeholder="Ditt navn" />
            </div>
            <div>
              <label class="block text-sm font-medium text-white mb-2">E-post</label>
              <input v-model="profileEmail" type="email" class="input-field w-full" placeholder="din@email.com" />
              <p class="text-xs text-dark-400 mt-1">Endre e-postadresse og klikk "Oppdater profil" for å lagre endringen</p>
            </div>
            <div>
              <div>
                <label class="block text-sm font-medium text-white mb-2">Mobilnummer</label>
                <input v-model="phoneNumber" type="tel" class="input-field w-full" placeholder="+47 123 45 678" />
                <p class="text-xs text-dark-400 mt-1">Valgfritt - brukes for gjenoppretting av konto</p>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end pt-2">
          <button type="button" class="btn-primary" :disabled="isUpdatingProfile" @click="updateBasicProfile">
            <span v-if="isUpdatingProfile" class="flex items-center gap-2">
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Oppdaterer...
            </span>
            <span v-else>Oppdater profil</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Loading State for Password Card -->
    <div v-if="isLoading" class="card animate-pulse">
      <div class="space-y-4">
        <div class="h-6 bg-dark-600 rounded w-32"></div>
        <div>
          <div class="h-4 bg-dark-600 rounded w-32 mb-2"></div>
          <div class="h-10 bg-dark-600 rounded w-full"></div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-for="i in 2" :key="i" class="space-y-2">
            <div class="h-4 bg-dark-600 rounded w-24"></div>
            <div class="h-10 bg-dark-600 rounded w-full"></div>
          </div>
        </div>
        <div class="flex justify-end">
          <div class="h-10 bg-dark-600 rounded w-32"></div>
        </div>
      </div>
    </div>

    <!-- Password Card -->
    <div v-else class="card">
      <div class="space-y-4">
        <h3 class="text-lg font-semibold text-white">Endre passord</h3>
        <div>
          <label class="block text-sm font-medium text-white mb-2">Nåværende passord</label>
          <input v-model="currentPassword" type="password" class="input-field w-full" placeholder="Ditt nåværende passord" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-white mb-2">Nytt passord</label>
            <input v-model="newPassword" type="password" class="input-field w-full" placeholder="Ditt nye passord" />
          </div>
          <div>
            <label class="block text-sm font-medium text-white mb-2">Bekreft nytt passord</label>
            <input v-model="confirmPassword" type="password" class="input-field w-full" placeholder="Bekreft ditt nye passord" />
          </div>
        </div>
        <div class="flex justify-end">
          <button type="button" class="btn-secondary" :disabled="isUpdatingPassword" @click="updatePassword">
            <span v-if="isUpdatingPassword" class="flex items-center gap-2">
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Oppdaterer...
            </span>
            <span v-else>Oppdater passord</span>
          </button>
        </div>
      </div>
    </div>

     <!-- Loading State for Subscription -->
     <div v-if="isLoading" class="card animate-pulse">
       <div class="h-6 bg-dark-600 rounded w-32 mb-4"></div>
       <div class="bg-dark-700 rounded-lg p-4">
         <div class="flex items-center justify-between mb-4">
           <div class="space-y-2">
             <div class="h-5 bg-dark-600 rounded w-32"></div>
             <div class="h-4 bg-dark-600 rounded w-48"></div>
           </div>
           <div class="h-6 bg-dark-600 rounded w-16"></div>
         </div>
         
         <div class="space-y-3">
           <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
             <div class="flex items-center gap-3 p-2 bg-dark-600/30 rounded-lg">
               <div class="w-6 h-6 bg-primary-500/20 rounded-lg flex items-center justify-center">
                 <svg class="w-3 h-3 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                 </svg>
               </div>
               <span class="text-white text-sm">Ubegrensede økter</span>
             </div>
             
             <div class="flex items-center gap-3 p-2 bg-dark-600/30 rounded-lg">
               <div class="w-6 h-6 bg-primary-500/20 rounded-lg flex items-center justify-center">
                 <svg class="w-3 h-3 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                 </svg>
               </div>
               <span class="text-white text-sm">Tilgang til alle øvelser</span>
             </div>
             
             <div class="flex items-center gap-3 p-2 bg-dark-600/30 rounded-lg">
               <div class="w-6 h-6 bg-primary-500/20 rounded-lg flex items-center justify-center">
                 <svg class="w-3 h-3 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                 </svg>
               </div>
               <span class="text-white text-sm">Full stats oversikt på alle økter</span>
             </div>
             
             <div class="flex items-center gap-3 p-2 bg-dark-600/30 rounded-lg">
               <div class="w-6 h-6 bg-primary-500/20 rounded-lg flex items-center justify-center">
                 <svg class="w-3 h-3 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                 </svg>
               </div>
               <span class="text-white text-sm">Full historikk på alle gjennomførte økter</span>
             </div>
             
             <div class="flex items-center gap-3 p-2 bg-dark-600/30 rounded-lg">
               <div class="w-6 h-6 bg-primary-500/20 rounded-lg flex items-center justify-center">
                 <svg class="w-3 h-3 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                 </svg>
               </div>
               <span class="text-white text-sm">Treningsmaler og øvelsesøk</span>
             </div>
             
             <div class="flex items-center gap-3 p-2 bg-dark-600/30 rounded-lg">
               <div class="w-6 h-6 bg-primary-500/20 rounded-lg flex items-center justify-center">
                 <svg class="w-3 h-3 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                 </svg>
               </div>
               <span class="text-white text-sm">1RM‑progresjon og PR‑tavle</span>
             </div>
           </div>
         </div>
       </div>
     </div>

     <!-- Subscription / Plus (visual only for now) -->
     <div v-else class="card">
       <h3 class="text-lg font-semibold text-white mb-4">Abonnement</h3>
       <div class="bg-dark-700 rounded-lg p-4">
         <div class="flex items-center justify-between mb-4">
           <div>
             <p class="text-lg font-bold text-white">{{ currentSubscription.label }}</p>
             <p class="text-sm text-dark-300">{{ currentSubscription.description }}</p>
           </div>
           <span class="inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full bg-green-500 text-white">
             <div class="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
             {{ subscriptionStatus === 'active' ? 'Aktiv' : 'Inaktiv' }}
           </span>
         </div>
       </div>
     </div>

     <!-- Sign Out Button - Outside the card, centered at bottom -->
    <div class="flex justify-center pt-8">
      <button 
        type="button"
        @click="handleSignOut"
        class="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-lg transition-colors font-medium"
      >
        Logg ut
      </button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useHybridData } from '@/composables/useHybridData'
import { useSupabase } from '@/composables/useSupabase'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { useScrollToTop } from '@/composables/useScrollToTop'

const router = useRouter()
const workoutData = useHybridData()
const { supabase } = useSupabase()
const { showError, showSuccess, showWarning, handleAuthError } = useErrorHandler()

// Ensure scrolling to top when component mounts
useScrollToTop()

// Loading state
const isLoading = computed(() => workoutData.isLoading.value)

// Form data
const profileName = ref('')
const profileEmail = ref('')
const phoneNumber = ref('')
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

// UI state
const isUpdating = ref(false)
const isUpdatingProfile = ref(false)
const isUpdatingPassword = ref(false)

// Subscription data
const subscriptionType = ref('free')
const subscriptionStatus = ref('active')

const subscriptionBadgeClass = computed(() => {
  return 'bg-green-500 text-white'
})

const subscriptionOptions = [
  { value: 'free', label: 'Gratis', description: 'Grunnleggende funksjoner' }
]

const currentSubscription = computed(() => {
  return subscriptionOptions.find(option => option.value === subscriptionType.value) || subscriptionOptions[0]
})

// Initialize profile data
const initializeProfileData = async () => {
  const user = workoutData.currentUser.value
  if (user) {
    // Profile data (name, email, phone) comes from Supabase Auth
    profileName.value = user.user_metadata?.name || ''
    profileEmail.value = user.email || '' // Always use auth email (verification required for changes)
    phoneNumber.value = user.user_metadata?.phone || ''
    subscriptionType.value = 'free'
    subscriptionStatus.value = 'active'
  }
}

// Update only basic profile (name/phone + subscription visual fields)
const updateBasicProfile = async () => {
  if (!workoutData.currentUser.value) return

  isUpdatingProfile.value = true

  try {
    const user = workoutData.currentUser.value
    
    // Check if we have changes to save
    const currentName = profileName.value.trim()
    const currentPhone = phoneNumber.value.trim()
    const currentEmail = profileEmail.value.trim()
    
    // Check if any changes were made
    const hasNameChange = currentName !== (user.user_metadata?.name || '')
    const hasPhoneChange = currentPhone !== (user.user_metadata?.phone || '')
    const hasEmailChange = currentEmail !== user.email
    const hasSubscriptionChange = subscriptionType.value !== 'free' || subscriptionStatus.value !== 'active'
    
    if (!hasNameChange && !hasPhoneChange && !hasEmailChange && !hasSubscriptionChange) {
      showWarning('Ingen endringer å oppdatere')
      return
    }
    


    // Update Supabase Auth user metadata and email if changed
    if (hasNameChange || hasPhoneChange) {
      const { error: authError } = await supabase.auth.updateUser({
        data: { 
          name: currentName,
          phone: currentPhone
        }
      })
      
      if (authError) {
        console.error('Error updating auth user metadata:', authError)
        handleAuthError({ message: 'Kunne ikke oppdatere navn/telefon i Supabase Auth' })
        return
      } else {
        // Update the local user object to reflect changes immediately
        if (workoutData.currentUser.value) {
          workoutData.currentUser.value.user_metadata = {
            ...workoutData.currentUser.value.user_metadata,
            name: currentName,
            phone: currentPhone
          }
        }
        
        // Force a refresh of the current user to get the latest metadata
        const { data: { user: refreshedUser }, error: refreshError } = await supabase.auth.getUser()
        if (!refreshError && refreshedUser) {
          // Update the current user with refreshed data
          workoutData.currentUser.value = refreshedUser
        }
      }
    }
    
    if (hasEmailChange) {
      const { error: emailError } = await supabase.auth.updateUser({
        email: currentEmail
      })
      
      if (emailError) {
        console.error('Error updating auth email:', emailError)
        handleAuthError({ message: 'Kunne ikke oppdatere e-postadresse. Prøv igjen senere.' })
        return
      }
    }

    // Show success message
    if (hasEmailChange) {
      showSuccess('Profil oppdatert! Sjekk din nye e-postadresse for verifiseringslenke. E-postadressen vil bli oppdatert etter verifisering.')
      
      // Note: After email verification, the user should log out and log back in
    } else {
      showSuccess('Profil oppdatert!')
    }
    
    // Refresh profile data to ensure consistency
    await initializeProfileData()
    
  } catch (error: any) {
    console.error('Error updating profile:', error)
    handleAuthError(error)
  } finally {
    isUpdatingProfile.value = false
  }
}

// Update password only
const updatePassword = async () => {
  if (!workoutData.currentUser.value) return
  const user = workoutData.currentUser.value

  if (!newPassword.value.trim()) {
    showError('Skriv inn nytt passord')
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    handleAuthError({ message: 'Nye passord matcher ikke' })
    return
  }
  if (!currentPassword.value.trim()) {
    handleAuthError({ message: 'Du må oppgi nåværende passord for å endre passord' })
    return
  }

  isUpdatingPassword.value = true
  try {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword.value
    })
    if (signInError) {
      handleAuthError({ message: 'Nåværende passord er feil' })
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword.value })
    if (error) {
      handleAuthError(error)
      return
    }

    showSuccess('Passord oppdatert!')
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (error: any) {
    console.error('Error updating password:', error)
    handleAuthError(error)
  } finally {
    isUpdatingPassword.value = false
  }
}

// Sign out
const handleSignOut = async () => {
  try {
    await workoutData.signOut()
    router.push('/login')
  } catch (error) {
    console.error('Error during sign out:', error)
    router.push('/login')
  }
}

// Lifecycle
onMounted(async () => {
  await initializeProfileData()
})
</script>
