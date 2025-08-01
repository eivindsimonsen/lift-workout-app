import { defineStore } from 'pinia'
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
import exerciseData from '@/data/exercises.json'

export const useWorkoutStore = defineStore('workout', () => {
  // State
  const templates = ref<WorkoutTemplate[]>([])
  const sessions = ref<WorkoutSession[]>([])
  const isLoading = ref(false)

  // Exercise database
  const exercises = ref<ExerciseData[]>(exerciseData.exercises)
  const workoutTypes = ref<WorkoutType[]>(exerciseData.workoutTypes)

  // Computed
  const getExercisesByWorkoutType = computed(() => {
    return (workoutType: string) => {
      return exercises.value.filter(exercise => 
        exercise.workoutTypes.includes(workoutType)
      )
    }
  })

  const getWorkoutType = computed(() => {
    return (id: string) => workoutTypes.value.find(type => type.id === id)
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

  // Actions
  const loadData = () => {
    isLoading.value = true
    try {
      const savedTemplates = localStorage.getItem('nextrep-templates')
      const savedSessions = localStorage.getItem('nextrep-sessions')

      if (savedTemplates) {
        templates.value = JSON.parse(savedTemplates)
      } else {
        // Create default templates
        createDefaultTemplates()
      }

      if (savedSessions) {
        const parsedSessions = JSON.parse(savedSessions)
        sessions.value = parsedSessions.map((session: any) => ({
          ...session,
          date: new Date(session.date)
        }))
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      isLoading.value = false
    }
  }

  const saveData = () => {
    try {
      localStorage.setItem('nextrep-templates', JSON.stringify(templates.value))
      localStorage.setItem('nextrep-sessions', JSON.stringify(sessions.value))
    } catch (error) {
      console.error('Error saving data:', error)
    }
  }

  const createDefaultTemplates = () => {
    const defaultTemplates: WorkoutTemplate[] = [
      {
        id: 'push-default',
        name: 'Push Økt',
        workoutType: 'push',
        exercises: [
          { exerciseId: 'bench-press', name: 'Benkpress', sets: 3, reps: 8, weight: 60 },
          { exerciseId: 'overhead-press', name: 'Militærpress', sets: 3, reps: 8, weight: 40 },
          { exerciseId: 'dips', name: 'Dips', sets: 3, reps: 10 },
          { exerciseId: 'lateral-raises', name: 'Side Raises', sets: 3, reps: 12, weight: 8 }
        ],
        isDefault: true
      },
      {
        id: 'pull-default',
        name: 'Pull Økt',
        workoutType: 'pull',
        exercises: [
          { exerciseId: 'pull-ups', name: 'Pull-ups', sets: 3, reps: 8 },
          { exerciseId: 'barbell-rows', name: 'Barbell Rows', sets: 3, reps: 10, weight: 50 },
          { exerciseId: 'deadlift', name: 'Deadlift', sets: 3, reps: 5, weight: 80 },
          { exerciseId: 'bicep-curls', name: 'Bicep Curls', sets: 3, reps: 12, weight: 12 }
        ],
        isDefault: true
      },
      {
        id: 'legs-default',
        name: 'Legs Økt',
        workoutType: 'legs',
        exercises: [
          { exerciseId: 'squat', name: 'Squat', sets: 3, reps: 8, weight: 70 },
          { exerciseId: 'leg-press', name: 'Leg Press', sets: 3, reps: 10, weight: 100 },
          { exerciseId: 'leg-curls', name: 'Leg Curls', sets: 3, reps: 12, weight: 40 },
          { exerciseId: 'calf-raises', name: 'Calf Raises', sets: 3, reps: 15, weight: 0 }
        ],
        isDefault: true
      }
    ]

    templates.value = defaultTemplates
    saveData()
  }

  const addTemplate = (template: WorkoutTemplate) => {
    templates.value.push(template)
    saveData()
  }

  const updateTemplate = (id: string, updates: Partial<WorkoutTemplate>) => {
    const index = templates.value.findIndex(t => t.id === id)
    if (index !== -1) {
      templates.value[index] = { ...templates.value[index], ...updates }
      saveData()
    }
  }

  const deleteTemplate = (id: string) => {
    templates.value = templates.value.filter(t => t.id !== id)
    saveData()
  }

  const startWorkoutSession = (templateId: string): WorkoutSession => {
    const template = templates.value.find(t => t.id === templateId)
    if (!template) {
      throw new Error('Template not found')
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
        sets: Array.from({ length: exercise.sets }, (_, i) => ({
          id: `set-${Date.now()}-${i}`,
          reps: exercise.reps,
          weight: exercise.weight,
          restTime: exercise.restTime,
          duration: undefined,
          distance: undefined,
          isCompleted: false
        })),
        notes: exercise.notes
      })),
      notes: template.notes,
      isCompleted: false
    }

    sessions.value.push(session)
    saveData()
    return session
  }

  const updateWorkoutSession = (sessionId: string, updates: Partial<WorkoutSession>) => {
    const index = sessions.value.findIndex(s => s.id === sessionId)
    if (index !== -1) {
      sessions.value[index] = { ...sessions.value[index], ...updates }
      saveData()
    }
  }

  const completeWorkoutSession = (sessionId: string) => {
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
    sessions.value = sessions.value.filter(s => s.id !== sessionId)
    saveData()
  }

  const getSessionById = (sessionId: string) => {
    return sessions.value.find(s => s.id === sessionId)
  }

  const getTemplatesByType = (workoutType: string) => {
    return templates.value.filter(t => t.workoutType === workoutType)
  }

  // Initialize
  loadData()

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
    completedSessions,
    totalVolume,
    averageWorkoutDuration,
    recentSessions,
    workoutStats,

    // Actions
    loadData,
    saveData,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    startWorkoutSession,
    updateWorkoutSession,
    completeWorkoutSession,
    markSessionAsActive,
    deleteWorkoutSession,
    getSessionById,
    getTemplatesByType
  }
}) 