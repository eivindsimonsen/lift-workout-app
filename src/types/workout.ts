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

// New interfaces for workout templates and exercise database
export interface ExerciseData {
  id: string
  name: string
  category: string
  workoutTypes: string[]
  muscleGroups: string[]
  equipment: string
  description: string
}

export interface WorkoutType {
  id: string
  name: string
  description: string
  color: string
}

export interface WorkoutTemplate {
  id: string
  name: string
  workoutType: string
  exercises: ExerciseTemplate[]
  notes?: string
  isDefault?: boolean
}

export interface ExerciseTemplate {
  exerciseId: string
  name: string
  sets: number
  reps: number
  weight?: number
  restTime?: number
  notes?: string
}

export interface WorkoutSession {
  id: string
  templateId: string
  templateName: string
  workoutType: string
  date: Date
  duration: number // in minutes
  exercises: WorkoutExercise[]
  notes?: string
  totalVolume?: number
  isCompleted: boolean
}

export interface WorkoutExercise {
  exerciseId: string
  name: string
  sets: WorkoutSet[]
  notes?: string
}

export interface WorkoutSet {
  id: string
  reps: number
  weight?: number
  duration?: number
  distance?: number
  restTime?: number
  isCompleted: boolean
} 