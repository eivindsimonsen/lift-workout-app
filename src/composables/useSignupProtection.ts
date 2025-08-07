import { ref } from 'vue'

export function useSignupProtection() {
  const recentSignups = ref<Set<string>>(new Set())
  const signupCooldown = 30000 // 30 seconds cooldown

  const isRecentlySignedUp = (email: string): boolean => {
    return recentSignups.value.has(email.toLowerCase())
  }

  const markSignupAttempt = (email: string) => {
    const emailKey = email.toLowerCase()
    recentSignups.value.add(emailKey)
    
    // Remove from set after cooldown period
    setTimeout(() => {
      recentSignups.value.delete(emailKey)
    }, signupCooldown)
  }

  const clearSignupAttempt = (email: string) => {
    recentSignups.value.delete(email.toLowerCase())
  }

  return {
    isRecentlySignedUp,
    markSignupAttempt,
    clearSignupAttempt
  }
} 