import { computed } from 'vue'
import { useWorkoutData } from './useWorkoutData' // For static data (JSON)
import { useSupabaseData } from './useSupabaseData' // For user data (Supabase)

// Console logging utility
const logHybridAccess = (operation: string, details?: any) => {
  const timestamp = new Date().toLocaleTimeString('no-NO')
  console.log(`%c[${timestamp}] Hybrid: ${operation}`, 'color: #8b5cf6; font-weight: bold;', details || '')
}

export const useHybridData = () => {
  const staticData = useWorkoutData() // JSON files for static data
  const userData = useSupabaseData() // Supabase for user data

  // Debug logging
  console.log('🔍 useHybridData - staticData.workoutTypes:', staticData.workoutTypes.value)

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

  const getExercisesByWorkoutType = computed(() => {
    return (workoutType: string) => {
      logHybridAccess('Get exercises by type', workoutType)
      return staticData.getExercisesByWorkoutType.value(workoutType)
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
    exercises: staticData.exercises,
    workoutTypes: staticData.workoutTypes,
    getExercisesByWorkoutType,
    getWorkoutType,
    getWorkoutTypeColor,

    // User data from Supabase
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
    addTemplate: userData.addTemplate,
    updateTemplate: userData.updateTemplate,
    deleteTemplate: userData.deleteTemplate,
    startWorkoutSession: userData.startWorkoutSession,
    updateWorkoutSession: userData.updateWorkoutSession,
    completeWorkoutSession: userData.completeWorkoutSession,
    markSessionAsActive: userData.markSessionAsActive,
    deleteWorkoutSession: userData.deleteWorkoutSession,
    signOut: userData.signOut
  }
} 