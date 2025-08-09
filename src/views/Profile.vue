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

    <!-- Profile Info Card -->
    <div class="card">
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
              <input v-model="profileEmail" type="email" class="input-field w-full bg-dark-600" placeholder="din@email.com" disabled />
              <p class="text-xs text-dark-400 mt-1">E-post kan ikke endres</p>
            </div>
          </div>
        </div>

        <div>
          <h3 class="text-lg font-semibold text-white mb-4">Kontaktinformasjon</h3>
          <div>
            <label class="block text-sm font-medium text-white mb-2">Mobilnummer</label>
            <input v-model="phoneNumber" type="tel" class="input-field w-full" placeholder="+47 123 45 678" />
            <p class="text-xs text-dark-400 mt-1">Valgfritt - brukes for gjenoppretting av konto</p>
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

    <!-- Password Card -->
    <div class="card">
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

     <!-- Subscription / Plus (visual only for now) -->
     <div class="card">
       <h3 class="text-lg font-semibold text-white mb-4">Abonnement</h3>
       <div class="bg-dark-700 rounded-lg p-4">
         <div class="flex items-center justify-between mb-3">
           <div>
             <p class="text-white font-medium">{{ currentSubscription.label }}</p>
             <p class="text-sm text-dark-300">{{ currentSubscription.description }}</p>
           </div>
           <span class="inline-block px-3 py-1 text-sm font-medium rounded-full" :class="subscriptionBadgeClass">
             {{ subscriptionStatus === 'active' ? 'Aktiv' : 'Inaktiv' }}
           </span>
         </div>
         <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
           <div class="text-dark-300">• Ubegrensede økter</div>
           <div class="text-dark-300">• 1RM‑progresjon og PR‑tavle</div>
           <div class="text-dark-300">• Treningskalender og streaks</div>
           <div class="text-dark-300">• Eksporter data (Plus)</div>
         </div>
         <div class="flex justify-end mt-4">
           <button type="button" class="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2 rounded-lg transition-colors">Oppgrader til Plus</button>
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

const router = useRouter()
const workoutData = useHybridData()
const { supabase } = useSupabase()
const { showError, showSuccess, showWarning, handleAuthError } = useErrorHandler()

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
    profileName.value = user.user_metadata?.name || ''
    profileEmail.value = user.email || ''
    phoneNumber.value = user.user_metadata?.phone || ''
    
    // Load subscription data from database
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('subscription_type, subscription_status')
        .eq('id', user.id)
        .single()
      
      if (!error && userData) {
        subscriptionType.value = userData.subscription_type || 'free'
        subscriptionStatus.value = userData.subscription_status || 'active'
      }
    } catch (error) {
      console.error('Error loading subscription data:', error)
    }
  }
}

// Update only basic profile (name/phone + subscription visual fields)
const updateBasicProfile = async () => {
  if (!workoutData.currentUser.value) return

  isUpdatingProfile.value = true

  try {
    const updates: any = {}
    const user = workoutData.currentUser.value

         // Update name and phone if changed
     const hasNameChange = profileName.value !== user.user_metadata?.name
     const hasPhoneChange = phoneNumber.value !== user.user_metadata?.phone
     
     if (hasNameChange || hasPhoneChange) {
       updates.data = { 
         name: profileName.value,
         phone: phoneNumber.value
       }
     }

         // Apply updates if any
     if (Object.keys(updates).length > 0) {
       const { error } = await supabase.auth.updateUser(updates)
       
       if (error) {
         handleAuthError(error)
         return
       }

               // Update user profile in database if needed
        if (updates.data) {
          const { error: profileError } = await supabase
            .from('users')
            .upsert({
              id: user.id,
              name: profileName.value,
              phone: phoneNumber.value,
              updated_at: new Date().toISOString()
            })

          if (profileError) {
            console.error('Error updating profile in database:', profileError)
          }
        }

        // Update subscription data in database
        const { error: subscriptionError } = await supabase
          .from('users')
          .update({
            subscription_type: subscriptionType.value,
            subscription_status: subscriptionStatus.value,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)

        if (subscriptionError) {
          console.error('Error updating subscription data:', subscriptionError)
        }

        // Show success message using toast
        showSuccess('Profil oppdatert!')

           } else {
        // No changes made
        showWarning('Ingen endringer å oppdatere')
      }
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
