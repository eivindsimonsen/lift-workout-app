import { computed } from 'vue'
import { useWorkoutData } from '../Test/useWorkoutData-test' // For static data (JSON)
import { useSupabaseData } from './useSupabaseData' // For user data (Supabase)

// Console logging utility
const logHybridAccess = (operation: string, details?: any) => {
  const timestamp = new Date().toLocaleTimeString('no-NO')

}

export const useHybridData = () => {
  const staticData = useWorkoutData() // JSON files for static data
  const userData = useSupabaseData() // Supabase for user data

  // Combined computed properties
  const getWorkoutTypeColor = computed(() => {
    return (id: string) => {
      return staticData.getWorkoutTypeColor.value(id)
    }
  })

  const getWorkoutType = computed(() => {
    return (id: string) => {
      return staticData.getWorkoutType.value(id)
    }
  })



  const getTemplatesByType = computed(() => {
    return (workoutType: string) => {
      logHybridAccess('Get templates by type', workoutType)
      return userData.getTemplatesByType.value(workoutType)
    }
  })

  const getSessionById = computed(() => {
    return (id: string) => {
      logHybridAccess('Get session by id', id)
      return userData.getSessionById.value(id)
    }
  })

  return {
    // Static data from JSON
    workoutTypes: staticData.workoutTypes,
    getWorkoutType,
    getWorkoutTypeColor,

    // User data from Supabase
    exercises: staticData.exercises,
    templates: userData.templates,
    sessions: userData.sessions,
    isLoading: userData.isLoading,
    currentUser: userData.currentUser,
    isAuthenticated: userData.isAuthenticated,

    // Combined computed properties
    completedSessions: userData.completedSessions,
    totalVolume: userData.totalVolume,
    averageWorkoutDuration: userData.averageWorkoutDuration,
    recentSessions: userData.recentSessions,
    workoutStats: userData.workoutStats,
    getSessionById,
    getTemplatesByType,

    // Actions (all from Supabase)
    loadData: userData.loadData,
    initializeAuth: userData.initializeAuth,
    addTemplate: userData.addTemplate,
    updateTemplate: userData.updateTemplate,
    deleteTemplate: userData.deleteTemplate,
    startWorkoutSession: userData.startWorkoutSession,
    updateWorkoutSession: userData.updateWorkoutSession,
    completeWorkoutSession: userData.completeWorkoutSession,
    markSessionAsActive: userData.markSessionAsActive,
    deleteWorkoutSession: userData.deleteWorkoutSession,
    // Exercises are now static from JSON; CRUD is intentionally a no-op
    addExercise: () => { /* no-op */ },
    deleteExercise: () => { /* no-op */ },
    updateExercise: () => { /* no-op */ },
    signOut: userData.signOut,
    cleanup: userData.cleanup
  }
} 