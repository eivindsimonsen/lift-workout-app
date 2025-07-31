export interface Exercise {
  id: string
  name: string
  sets: Set[]
  notes?: string
}

export interface Set {
  id: string
  reps: number
  weight?: number
  duration?: number // in seconds
  distance?: number // in meters
  restTime?: number // in seconds
}

export interface Workout {
  id: string
  name: string
  date: Date
  duration: number // in minutes
  exercises: Exercise[]
  notes?: string
  totalVolume?: number
}

export interface WorkoutStats {
  totalWorkouts: number
  totalVolume: number
  averageWorkoutDuration: number
  mostUsedExercises: Array<{ name: string; count: number }>
  weeklyProgress: Array<{ week: string; volume: number }>
} 