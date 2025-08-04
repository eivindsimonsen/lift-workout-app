import { ref, computed, onMounted } from 'vue'
import { supabase } from '@/lib/supabase'
import { useErrorHandler } from '@/composables/useErrorHandler'
import type { 
  WorkoutTemplate, 
  ExerciseTemplate, 
  WorkoutSession, 
  WorkoutExercise, 
  WorkoutSet,
  ExerciseData,
  WorkoutType 
} from '@/types/workout'

// Console logging utility
const logSupabaseAccess = (operation: string, details?: any) => {
  const timestamp = new Date().toLocaleTimeString('no-NO')
  console.log(`%c[${timestamp}] Supabase: ${operation}`, 'color: #10b981; font-weight: bold;', details || '')
}

// Singleton instance
let supabaseDataInstance: ReturnType<typeof createSupabaseData> | null = null
let isInitializing = false

const createSupabaseData = () => {
  // State (only user data)
  const templates = ref<WorkoutTemplate[]>([])
  const sessions = ref<WorkoutSession[]>([])
  const isLoading = ref(false)
  const currentUser = ref<any>(null)
  const isAuthenticated = ref(false)
  const isInitialized = ref(false) // Add initialization guard

  // Load data from Supabase (only user data)
  const loadData = async () => {
    if (!currentUser.value) {
      console.log('No user logged in, skipping data load')
      return
    }

    // Prevent multiple simultaneous calls
    if (isLoading.value) {
      console.log('Data loading already in progress, skipping')
      return
    }

    isLoading.value = true
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (isLoading.value) {
        console.warn('⚠️ Data loading timeout, resetting loading state')
        isLoading.value = false
      }
    }, 10000) // 10 second timeout

    try {
      // Ensure user profile exists before loading data
      await ensureUserProfile()
      
      // Load templates for the current user
      const { data: templatesData, error: templatesError } = await supabase
        .from('workout_templates')
        .select('*')
        .eq('user_id', currentUser.value.id)
      
      if (templatesError) throw templatesError
      
      logSupabaseAccess('Get templates', `${templatesData.length} templates`)
      templates.value = templatesData.map((template: any) => ({
        id: template.id,
        name: template.name,
        workoutType: template.workout_type,
        exercises: template.exercises,
        isDefault: template.is_default
      }))

      // Load sessions for the current user
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', currentUser.value.id)
        .order('date', { ascending: false })
      
      if (sessionsError) throw sessionsError
      
      logSupabaseAccess('Get sessions', `${sessionsData.length} sessions`)
      sessions.value = sessionsData.map((session: any) => ({
        id: session.id,
        templateId: session.template_id,
        templateName: session.template_name,
        workoutType: session.workout_type,
        date: new Date(session.date),
        duration: session.duration,
        totalVolume: session.total_volume,
        exercises: session.exercises,
        isCompleted: session.is_completed
      }))

      console.log('✅ Supabase user data loaded')
      
    } catch (error: any) {
      console.error('❌ Error loading Supabase data:', error)
      // Use error handler to show user-friendly error
      const { showError } = useErrorHandler()
      showError('Kunne ikke laste data fra databasen. Prøv å oppdatere siden.')
    } finally {
      clearTimeout(timeoutId)
      isLoading.value = false
    }
  }

  // Ensure user profile exists in users table
  const ensureUserProfile = async () => {
    if (!currentUser.value) {
      console.log('No user logged in, skipping profile check')
      return
    }

    try {
      // Check if user profile exists
      const { data: existingUser, error: selectError } = await supabase
        .from('users')
        .select('id')
        .eq('id', currentUser.value.id)
        .single()

      if (selectError) {
        // Check if the error is due to no rows found (PGRST116) or other issues
        if (selectError.code === 'PGRST116' || selectError.message?.includes('No rows found')) {
          // User profile doesn't exist, create it
          console.log('Creating user profile for:', currentUser.value.email)
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: currentUser.value.id,
              supabase_id: currentUser.value.id,
              email: currentUser.value.email,
              name: currentUser.value.user_metadata?.name || null
            })

          if (insertError) {
            console.error('Error creating user profile:', insertError)
            throw insertError
          }
          
          console.log('✅ User profile created successfully')
        } else {
          console.error('Error checking user profile:', selectError)
          throw selectError
        }
      } else {
        console.log('✅ User profile already exists')
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error)
      throw error
    }
  }

  // Authentication methods
  const initializeAuth = async () => {
    // Prevent multiple initializations
    if (isInitialized.value || isInitializing) {
      console.log('Auth already initialized or initializing, skipping')
      return
    }

    isInitializing = true
    isInitialized.value = true
    console.log('🔐 Initializing authentication...')

    try {
      // Get initial session
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        console.log('📱 Found existing session for user:', session.user.email)
        currentUser.value = session.user
        isAuthenticated.value = true
        await loadData()
      } else {
        console.log('📱 No existing session found')
      }

      // Listen for auth changes (only set up once)
      supabase.auth.onAuthStateChange(async (event: any, session: any) => {
        console.log('🔄 Auth state changed:', event, session?.user?.email)
        
        if (event === 'SIGNED_IN' && session?.user) {
          currentUser.value = session.user
          isAuthenticated.value = true
          await loadData()
        } else if (event === 'SIGNED_OUT') {
          currentUser.value = null
          isAuthenticated.value = false
          templates.value = []
          sessions.value = []
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Handle token refresh on mobile
          console.log('🔄 Token refreshed for user:', session.user.email)
          currentUser.value = session.user
          isAuthenticated.value = true
        }
      })

      // Handle page visibility changes (mobile browser) - only set up once
      if (typeof document !== 'undefined') {
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            console.log('📱 Page became visible, checking session...')
            
            // Always check session when page becomes visible to ensure state is fresh
            supabase.auth.getSession().then(({ data: { session } }: any) => {
              if (session?.user) {
                // If we have a session but no current user, or user ID changed, update
                if (!currentUser.value || session.user.id !== currentUser.value.id) {
                  console.log('📱 Session changed, updating user')
                  currentUser.value = session.user
                  isAuthenticated.value = true
                  loadData()
                }
              } else if (currentUser.value) {
                // If we have a current user but no session, user was logged out
                console.log('📱 No session found, user was logged out')
                currentUser.value = null
                isAuthenticated.value = false
                templates.value = []
                sessions.value = []
              }
            }).catch((error: any) => {
              console.error('📱 Error checking session on visibility change:', error)
              // Don't reset state on error, just log it
            })
          }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        
        // Store the handler for cleanup
        if (typeof window !== 'undefined') {
          (window as any).__visibilityChangeHandler = handleVisibilityChange
        }
      }
    } catch (error) {
      console.error('❌ Error initializing auth:', error)
      isInitialized.value = false // Reset on error
    } finally {
      isInitializing = false
    }
  }

  const signOut = async () => {
    console.log('🚪 Signing out user...')
    
    try {
      const result = await supabase.auth.signOut()
      console.log('🚪 Sign out result:', result)
      
      if (result.error) {
        console.error('Error signing out:', result.error)
        // Even if there's an error, we should still reset local state
      }
      
      // Always reset local state regardless of error
      console.log('🔄 Resetting local state after sign out')
      currentUser.value = null
      isAuthenticated.value = false
      templates.value = []
      sessions.value = []
      isLoading.value = false
      
      // Don't clear remembered credentials - keep them for easy re-login
      console.log('✅ Sign out completed successfully')
    } catch (error) {
      console.error('Unexpected error during sign out:', error)
      // Even if there's an unexpected error, reset local state
      currentUser.value = null
      isAuthenticated.value = false
      templates.value = []
      sessions.value = []
      isLoading.value = false
      
      // Don't clear remembered credentials even on error
    }
  }

  // Reset function for mobile browser issues
  const resetState = () => {
    console.log('🔄 Resetting Supabase data state')
    isLoading.value = false
    isInitialized.value = false
    currentUser.value = null
    isAuthenticated.value = false
    templates.value = []
    sessions.value = []
  }

  // Cleanup function to remove event listeners
  const cleanup = () => {
    console.log('🧹 Cleaning up Supabase data event listeners')
    if (typeof document !== 'undefined' && typeof window !== 'undefined') {
      const handler = (window as any).__visibilityChangeHandler
      if (handler) {
        document.removeEventListener('visibilitychange', handler)
        delete (window as any).__visibilityChangeHandler
      }
    }
  }

  // Computed properties (only user data)

  const completedSessions = computed(() => {
    return sessions.value.filter(session => session.isCompleted)
  })

  const totalVolume = computed(() => {
    return completedSessions.value.reduce((total, session) => {
      return total + (session.totalVolume || 0)
    }, 0)
  })

  const averageWorkoutDuration = computed(() => {
    if (completedSessions.value.length === 0) return 0
    const totalDuration = completedSessions.value.reduce((total, session) => {
      return total + session.duration
    }, 0)
    return Math.round(totalDuration / completedSessions.value.length)
  })

  const recentSessions = computed(() => {
    return completedSessions.value
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3)
  })

  const workoutStats = computed(() => {
    const totalWorkouts = completedSessions.value.length
    const totalVolumeSum = totalVolume.value
    const avgDuration = averageWorkoutDuration.value

    // Most used exercises
    const exerciseCounts: { [key: string]: number } = {}
    completedSessions.value.forEach(session => {
      session.exercises.forEach(exercise => {
        exerciseCounts[exercise.name] = (exerciseCounts[exercise.name] || 0) + 1
      })
    })

    const mostUsedExercises = Object.entries(exerciseCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Weekly progress (last 8 weeks)
    const weeklyProgress = []
    const now = new Date()
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - (i * 7))
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)

      const weekVolume = completedSessions.value
        .filter(session => {
          const sessionDate = new Date(session.date)
          return sessionDate >= weekStart && sessionDate <= weekEnd
        })
        .reduce((total, session) => total + (session.totalVolume || 0), 0)

      weeklyProgress.push({
        week: weekStart.toLocaleDateString('no-NO', { month: 'short', day: 'numeric' }),
        volume: weekVolume
      })
    }

    return {
      totalWorkouts,
      totalVolume: totalVolumeSum,
      averageWorkoutDuration: avgDuration,
      mostUsedExercises,
      weeklyProgress
    }
  })

  const getSessionById = computed(() => {
    return (id: string) => {
      logSupabaseAccess('Get session by id', id)
      const found = sessions.value.find(s => s.id === id)
      return found
    }
  })

  const getTemplatesByType = computed(() => {
    return (workoutType: string) => {
      logSupabaseAccess('Get templates by type', workoutType)
      const filtered = templates.value.filter(t => t.workoutType === workoutType)
      return filtered
    }
  })

  // Actions with Supabase integration
  const addTemplate = async (template: WorkoutTemplate) => {
    if (!currentUser.value) {
      console.error('No user logged in')
      return
    }

    logSupabaseAccess('Add template', template.name)
    
    try {
      // Ensure user profile exists before creating template
      await ensureUserProfile()
      
      const { data, error } = await supabase
        .from('workout_templates')
        .insert({
          user_id: currentUser.value.id,
          name: template.name,
          workout_type: template.workoutType,
          exercises: template.exercises,
          is_default: template.isDefault
        })
        .select()
        .single()

      if (error) {
        console.error('Error adding template:', error)
        return
      }

      templates.value.push({
        id: data.id,
        name: data.name,
        workoutType: data.workout_type,
        exercises: data.exercises,
        isDefault: data.is_default
      })
    } catch (error) {
      console.error('Error in addTemplate:', error)
      // Use error handler to show user-friendly error
      const { showError } = useErrorHandler()
      showError('Kunne ikke opprette økt. Prøv igjen.')
    }
  }

  const updateTemplate = async (id: string, updates: Partial<WorkoutTemplate>) => {
    logSupabaseAccess('Update template', id)
    
    const { error } = await supabase
      .from('workout_templates')
      .update({
        name: updates.name,
        workout_type: updates.workoutType,
        exercises: updates.exercises,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('Error updating template:', error)
      return
    }

    const index = templates.value.findIndex(t => t.id === id)
    if (index !== -1) {
      templates.value[index] = { ...templates.value[index], ...updates }
    }
  }

  const deleteTemplate = async (id: string) => {
    logSupabaseAccess('Delete template', id)
    
    const { error } = await supabase
      .from('workout_templates')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting template:', error)
      return
    }

    templates.value = templates.value.filter(t => t.id !== id)
  }

  const startWorkoutSession = async (templateId: string): Promise<WorkoutSession | null> => {
    if (!currentUser.value) {
      console.error('No user logged in')
      return null
    }

    logSupabaseAccess('Start session', templateId)
    
    const template = templates.value.find(t => t.id === templateId)
    if (!template) {
      console.error('❌ Template not found:', templateId)
      return null
    }

    try {
      // Ensure user profile exists before creating session
      await ensureUserProfile()
      
      // First, mark all existing active sessions as completed
      const { error: updateError } = await supabase
        .from('workout_sessions')
        .update({ is_completed: true })
        .eq('user_id', currentUser.value.id)
        .eq('is_completed', false)

      if (updateError) {
        console.error('Error marking sessions as completed:', updateError)
        return null
      }

      // Update local state to reflect the changes
      sessions.value.forEach(session => {
        if (!session.isCompleted) {
          session.isCompleted = true
        }
      })

      const session: WorkoutSession = {
        id: `session-${Date.now()}`,
        templateId: template.id,
        templateName: template.name,
        workoutType: template.workoutType,
        date: new Date(),
        duration: 0,
        exercises: template.exercises.map(exercise => ({
          exerciseId: exercise.exerciseId,
          name: exercise.name,
          sets: [{
            id: `set-${Date.now()}`,
            reps: 0,
            weight: 0,
            duration: undefined,
            distance: undefined,
            isCompleted: false
          }]
        })),
        isCompleted: false
      }

      const { data, error } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: currentUser.value.id,
          template_id: template.id,
          template_name: template.name,
          workout_type: template.workoutType,
          date: session.date.toISOString(),
          duration: session.duration,
          exercises: session.exercises,
          is_completed: session.isCompleted
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating workout session:', error)
        return null
      }

      // Update session with database ID
      session.id = data.id
      sessions.value.unshift(session)

      return session
    } catch (error) {
      console.error('Error in startWorkoutSession:', error)
      // Use error handler to show user-friendly error
      const { showError } = useErrorHandler()
      showError('Kunne ikke starte treningsøkt. Prøv igjen.')
      return null
    }
  }

  const updateWorkoutSession = async (sessionId: string, updates: Partial<WorkoutSession>) => {
    logSupabaseAccess('Update session', sessionId)
    
    const { error } = await supabase
      .from('workout_sessions')
      .update({
        template_name: updates.templateName,
        workout_type: updates.workoutType,
        duration: updates.duration,
        total_volume: updates.totalVolume,
        exercises: updates.exercises,
        is_completed: updates.isCompleted,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    if (error) {
      console.error('Error updating session:', error)
      return
    }

    const index = sessions.value.findIndex(s => s.id === sessionId)
    if (index !== -1) {
      sessions.value[index] = { ...sessions.value[index], ...updates }
    }
  }

  const completeWorkoutSession = async (sessionId: string) => {
    logSupabaseAccess('Complete session', sessionId)
    
    const session = sessions.value.find(s => s.id === sessionId)
    if (session) {
      // Calculate total volume
      const totalVolume = session.exercises.reduce((exerciseTotal, exercise) => {
        const exerciseVolume = exercise.sets.reduce((setTotal, set) => {
          if (set.isCompleted && set.weight) {
            return setTotal + (set.weight * set.reps)
          }
          return setTotal
        }, 0)
        return exerciseTotal + exerciseVolume
      }, 0)

      await updateWorkoutSession(sessionId, {
        isCompleted: true,
        totalVolume,
        duration: Math.round((Date.now() - new Date(session.date).getTime()) / 60000) // minutes
      })
    }
  }

  const markSessionAsActive = async (sessionId: string) => {
    if (!currentUser.value) {
      console.error('No user logged in')
      return
    }

    logSupabaseAccess('Mark session active', sessionId)
    
    try {
      // Ensure user profile exists before updating sessions
      await ensureUserProfile()
      
      // First, mark all other sessions as completed
      const { error: updateError } = await supabase
        .from('workout_sessions')
        .update({ is_completed: true })
        .eq('user_id', currentUser.value.id)
        .neq('id', sessionId)
        .eq('is_completed', false)

      if (updateError) {
        console.error('Error marking other sessions as completed:', updateError)
        return
      }

      // Update local state to reflect the changes
      sessions.value.forEach(session => {
        if (session.id !== sessionId && !session.isCompleted) {
          session.isCompleted = true
        }
      })
      
      // Then mark the current session as active
      await updateWorkoutSession(sessionId, {
        isCompleted: false
      })
    } catch (error) {
      console.error('Error in markSessionAsActive:', error)
      // Use error handler to show user-friendly error
      const { showError } = useErrorHandler()
      showError('Kunne ikke aktivere treningsøkt. Prøv igjen.')
    }
  }

  const deleteWorkoutSession = async (sessionId: string) => {
    logSupabaseAccess('Delete session', sessionId)
    
    const { error } = await supabase
      .from('workout_sessions')
      .delete()
      .eq('id', sessionId)

    if (error) {
      console.error('Error deleting session:', error)
      return
    }

    sessions.value = sessions.value.filter(s => s.id !== sessionId)
  }

  return {
    // State (only user data)
    templates,
    sessions,
    isLoading,
    currentUser,
    isAuthenticated,
    isInitialized,

    // Computed
    completedSessions,
    totalVolume,
    averageWorkoutDuration,
    recentSessions,
    workoutStats,
    getSessionById,
    getTemplatesByType,

    // Actions
    loadData,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    startWorkoutSession,
    updateWorkoutSession,
    completeWorkoutSession,
    markSessionAsActive,
    deleteWorkoutSession,
    signOut,
    initializeAuth,
    resetState,
    cleanup
  }
}

export function useSupabaseData() {
  // Ensure singleton is created only once
  if (!supabaseDataInstance) {
    console.log('🔧 Creating new Supabase data instance')
    supabaseDataInstance = createSupabaseData()
    
    // Initialize auth state immediately when singleton is created
    // Use setTimeout to ensure this runs after the current execution context
    setTimeout(() => {
      if (supabaseDataInstance && !supabaseDataInstance.isInitialized.value) {
        supabaseDataInstance.initializeAuth()
      }
    }, 0)
  } else {
    console.log('🔧 Reusing existing Supabase data instance')
  }
  
  return supabaseDataInstance
} 