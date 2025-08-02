import { ref, computed } from 'vue'
import type { 
  WorkoutTemplate, 
  ExerciseTemplate, 
  WorkoutSession, 
  WorkoutExercise, 
  WorkoutSet,
  ExerciseData,
  WorkoutType 
} from '@/types/workout'
// JSON data will be loaded dynamically

// Console logging utility
const logJSONAccess = (operation: string, details?: any) => {
  const timestamp = new Date().toLocaleTimeString('no-NO')
  console.log(`%c[${timestamp}] ${operation}`, 'color: #3b82f6; font-weight: bold;', details || '')
}

// Singleton instance
let workoutDataInstance: ReturnType<typeof createWorkoutData> | null = null

const createWorkoutData = () => {
  // State
  const templates = ref<WorkoutTemplate[]>([])
  const sessions = ref<WorkoutSession[]>([])
  const exercises = ref<ExerciseData[]>([])
  const workoutTypes = ref<WorkoutType[]>([])
  const isLoading = ref(false)

  // Load data from JSON files
  const loadData = async () => {
    isLoading.value = true
    try {
      // Load exercises
      const exercisesResponse = await fetch('/src/data/exercises.json')
      const exerciseData = await exercisesResponse.json()
      logJSONAccess('Get exercises', `${exerciseData.exercises.length} exercises`)
      exercises.value = exerciseData.exercises
      
      // Load workout types
      const workoutTypesResponse = await fetch('/src/data/workout-types.json')
      const workoutTypesData = await workoutTypesResponse.json()
      logJSONAccess('Get workout types', `${workoutTypesData.workoutTypes.length} types`)
      workoutTypes.value = workoutTypesData.workoutTypes
      
      // Load templates
      const templatesResponse = await fetch('/src/data/workout-templates.json')
      const workoutTemplatesData = await templatesResponse.json()
      logJSONAccess('Get templates', `${workoutTemplatesData.workoutTemplates.length} templates`)
      templates.value = workoutTemplatesData.workoutTemplates
      
      // Load sessions
      const sessionsResponse = await fetch('/src/data/workout-sessions.json')
      const workoutSessionsData = await sessionsResponse.json()
      logJSONAccess('Get sessions', `${workoutSessionsData.workoutSessions.length} sessions`)
      const parsedSessions = workoutSessionsData.workoutSessions
      sessions.value = parsedSessions.map((session: any) => ({
        ...session,
        date: new Date(session.date)
      }))
      
      console.log('✅ All data loaded')
      
    } catch (error) {
      console.error('❌ Error loading data:', error)
    } finally {
      isLoading.value = false
    }
  }

  // Computed properties
  const getExercisesByWorkoutType = computed(() => {
    return (workoutType: string) => {
      logJSONAccess('Get exercises by type', workoutType)
      const filtered = exercises.value.filter(exercise => 
        exercise.workoutTypes.includes(workoutType)
      )
      return filtered
    }
  })

  const getWorkoutType = computed(() => {
    return (id: string) => {
      const found = workoutTypes.value.find(type => type.id === id)
      return found
    }
  })

  const getWorkoutTypeColor = computed(() => {
    return (id: string) => {
      const workoutType = workoutTypes.value.find(type => type.id === id)
      const color = workoutType?.color || '#6b7280'
      return color
    }
  })

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
      logJSONAccess('Get session by id', id)
      const found = sessions.value.find(s => s.id === id)
      return found
    }
  })

  const getTemplatesByType = computed(() => {
    return (workoutType: string) => {
      logJSONAccess('Get templates by type', workoutType)
      const filtered = templates.value.filter(t => t.workoutType === workoutType)
      return filtered
    }
  })

  // Actions - now with actual functionality
  const addTemplate = (template: WorkoutTemplate) => {
    logJSONAccess('Add template', template.name)
    templates.value.push(template)
  }

  const updateTemplate = (id: string, updates: Partial<WorkoutTemplate>) => {
    logJSONAccess('Update template', id)
    const index = templates.value.findIndex(t => t.id === id)
    if (index !== -1) {
      templates.value[index] = { ...templates.value[index], ...updates }
    }
  }

  const deleteTemplate = (id: string) => {
    logJSONAccess('Delete template', id)
    templates.value = templates.value.filter(t => t.id !== id)
  }

  const startWorkoutSession = (templateId: string): WorkoutSession | null => {
    logJSONAccess('Get template', templateId)
    const template = templates.value.find(t => t.id === templateId)
    if (!template) {
      console.error('❌ Template not found:', templateId)
      return null
    }

    // Mark all existing sessions as completed (only one active session allowed)
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

    sessions.value.push(session)
    logJSONAccess('Start session', template.name)
    return session
  }

  const updateWorkoutSession = (sessionId: string, updates: Partial<WorkoutSession>) => {
    logJSONAccess('Update session', sessionId)
    const index = sessions.value.findIndex(s => s.id === sessionId)
    if (index !== -1) {
      sessions.value[index] = { ...sessions.value[index], ...updates }
    }
  }

  const completeWorkoutSession = (sessionId: string) => {
    logJSONAccess('Complete session', sessionId)
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

      updateWorkoutSession(sessionId, {
        isCompleted: true,
        totalVolume,
        duration: Math.round((Date.now() - new Date(session.date).getTime()) / 60000) // minutes
      })
    }
  }

  const markSessionAsActive = (sessionId: string) => {
    logJSONAccess('Mark session active', sessionId)
    // First, mark all other sessions as completed (only one active session allowed)
    sessions.value.forEach(session => {
      if (session.id !== sessionId && !session.isCompleted) {
        session.isCompleted = true
      }
    })
    
    // Then mark the current session as active
    updateWorkoutSession(sessionId, {
      isCompleted: false
    })
  }

  const deleteWorkoutSession = (sessionId: string) => {
    logJSONAccess('Delete session', sessionId)
    sessions.value = sessions.value.filter(s => s.id !== sessionId)
  }

  // Initialize data
  loadData().then(() => {
    // Log initialization summary
    console.log('🚀 Data loaded:', {
      exercises: exercises.value.length,
      types: workoutTypes.value.length,
      templates: templates.value.length,
      sessions: sessions.value.length
    })
  })

  return {
    // State
    templates,
    sessions,
    exercises,
    workoutTypes,
    isLoading,

    // Computed
    getExercisesByWorkoutType,
    getWorkoutType,
    getWorkoutTypeColor,
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
    deleteWorkoutSession
  }
}

export const useWorkoutData = () => {
  if (!workoutDataInstance) {
    workoutDataInstance = createWorkoutData()
  }
  return workoutDataInstance
} 