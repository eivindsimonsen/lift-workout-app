// Core workout interfaces
export interface Exercise {
  id: string;
  name: string;
  sets: Set[];
}

export interface Set {
  id: string;
  reps: number;
  weight?: number;
  duration?: number; // in seconds
  distance?: number; // in meters
}

export interface Workout {
  id: string;
  name: string;
  date: Date;
  duration: number; // in minutes
  exercises: Exercise[];
  totalVolume?: number;
}

// Statistics and analytics
export interface WorkoutStats {
  totalWorkouts: number;
  totalVolume: number;
  averageWorkoutDuration: number;
  mostUsedExercises: Array<{ name: string; count: number }>;
  weeklyProgress: Array<{ week: string; volume: number }>;
}

// Exercise database and categorization
export interface ExerciseData {
  id: string;
  name: string;
  category: string;
  workoutTypes: string[];
  muscleGroups: string[];
}

export interface WorkoutType {
  id: string;
  name: string;
  description: string;
  color: string;
}

// Template system
export interface WorkoutTemplate {
  id: string;
  name: string;
  workoutType: string;
  exercises: ExerciseTemplate[];
}

export interface ExerciseTemplate {
  exerciseId: string;
  name: string;
  sets: number;
  reps: number;
  weight?: number;
}

// Session management
export interface WorkoutSession {
  id: string;
  templateId: string;
  templateName: string;
  workoutType: string;
  date: Date;
  duration: number; // in minutes
  exercises: WorkoutExercise[];
  totalVolume?: number;
  isCompleted: boolean;
}

export interface WorkoutExercise {
  exerciseId: string;
  name: string;
  sets: WorkoutSet[];
}

export interface WorkoutSet {
  id: string;
  reps: number;
  weight?: number;
  duration?: number;
  distance?: number;
  isCompleted: boolean;
}
