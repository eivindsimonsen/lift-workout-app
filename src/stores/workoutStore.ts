import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Workout, Exercise, Set, WorkoutStats } from '@/types/workout'

export const useWorkoutStore = defineStore('workout', () => {
  const workouts = ref<Workout[]>([])
  const isLoading = ref(false)

  // Load workouts from localStorage on store initialization
  const loadWorkouts = () => {
    try {
      const stored = localStorage.getItem('nextrep-workouts')
      if (stored) {
        const parsed = JSON.parse(stored)
        workouts.value = parsed.map((w: any) => ({
          ...w,
          date: new Date(w.date)
        }))
      }
    } catch (error) {
      console.error('Failed to load workouts:', error)
    }
  }

  // Save workouts to localStorage
  const saveWorkouts = () => {
    try {
      localStorage.setItem('nextrep-workouts', JSON.stringify(workouts.value))
    } catch (error) {
      console.error('Failed to save workouts:', error)
    }
  }

  // Add new workout
  const addWorkout = (workout: Omit<Workout, 'id'>) => {
    const newWorkout: Workout = {
      ...workout,
      id: crypto.randomUUID(),
      totalVolume: calculateTotalVolume(workout.exercises)
    }
    workouts.value.unshift(newWorkout)
    saveWorkouts()
  }

  // Update existing workout
  const updateWorkout = (id: string, updates: Partial<Workout>) => {
    const index = workouts.value.findIndex(w => w.id === id)
    if (index !== -1) {
      workouts.value[index] = { ...workouts.value[index], ...updates }
      if (updates.exercises) {
        workouts.value[index].totalVolume = calculateTotalVolume(updates.exercises)
      }
      saveWorkouts()
    }
  }

  // Delete workout
  const deleteWorkout = (id: string) => {
    const index = workouts.value.findIndex(w => w.id === id)
    if (index !== -1) {
      workouts.value.splice(index, 1)
      saveWorkouts()
    }
  }

  // Calculate total volume for exercises
  const calculateTotalVolume = (exercises: Exercise[]): number => {
    return exercises.reduce((total, exercise) => {
      return total + exercise.sets.reduce((exerciseTotal, set) => {
        const weight = set.weight || 0
        return exerciseTotal + (set.reps * weight)
      }, 0)
    }, 0)
  }

  // Computed properties
  const recentWorkouts = computed(() => 
    workouts.value.slice(0, 5)
  )

  const totalVolume = computed(() => 
    workouts.value.reduce((total, workout) => total + (workout.totalVolume || 0), 0)
  )

  const averageWorkoutDuration = computed(() => {
    if (workouts.value.length === 0) return 0
    const totalDuration = workouts.value.reduce((total, workout) => total + workout.duration, 0)
    return Math.round(totalDuration / workouts.value.length)
  })

  const workoutStats = computed((): WorkoutStats => {
    const exerciseCounts = new Map<string, number>()
    
    workouts.value.forEach(workout => {
      workout.exercises.forEach(exercise => {
        const count = exerciseCounts.get(exercise.name) || 0
        exerciseCounts.set(exercise.name, count + 1)
      })
    })

    const mostUsedExercises = Array.from(exerciseCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Calculate weekly progress (last 8 weeks)
    const weeklyProgress = []
    const now = new Date()
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - (i * 7))
      weekStart.setHours(0, 0, 0, 0)
      
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      weekEnd.setHours(23, 59, 59, 999)

      const weekWorkouts = workouts.value.filter(w => 
        w.date >= weekStart && w.date <= weekEnd
      )
      
      const weekVolume = weekWorkouts.reduce((total, w) => total + (w.totalVolume || 0), 0)
      
      weeklyProgress.push({
        week: weekStart.toLocaleDateString('no-NO', { month: 'short', day: 'numeric' }),
        volume: weekVolume
      })
    }

    return {
      totalWorkouts: workouts.value.length,
      totalVolume: totalVolume.value,
      averageWorkoutDuration: averageWorkoutDuration.value,
      mostUsedExercises,
      weeklyProgress
    }
  })

  // Initialize store
  loadWorkouts()

  return {
    workouts,
    isLoading,
    recentWorkouts,
    totalVolume,
    averageWorkoutDuration,
    workoutStats,
    addWorkout,
    updateWorkout,
    deleteWorkout,
    loadWorkouts,
    saveWorkouts
  }
}) 