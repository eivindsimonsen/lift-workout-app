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
export interface ExerciseVariant {
  id: number;
  exerciseId: number;
  userId: string | null;
  name: string;
  equipment?: string;
}

/**
 * How an exercise is measured.
 * - `strength`: reps × weight
 * - `cardio`: duration, plus distance where it makes sense (a warm-up has none)
 */
export type ExerciseTrackingType = "strength" | "cardio";

export interface ExerciseData {
  id: number;
  userId: string | null;
  name: string;
  /** Primary muscle group, e.g. "Bryst", "Rygg", "Ben" — "Kondisjon" for cardio */
  category: string;
  workoutTypes: string[];
  /** Defaults to "strength"; variants inherit it from their parent. */
  trackingType: ExerciseTrackingType;
  variants?: ExerciseVariant[];
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
  exerciseId: number;
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
  exerciseId: number;
  name: string;
  /**
   * Copied from the library when the session starts, so a logged session stays
   * readable even if the exercise is later renamed, retyped or deleted.
   * Missing on sessions logged before cardio support — treat as "strength".
   */
  trackingType?: ExerciseTrackingType;
  sets: WorkoutSet[];
}

export interface WorkoutSet {
  id: string;
  reps: number;
  weight?: number;
  weightUnit?: 'kg' | 'lbs' | 'bodyweight'; // Default is 'kg'
  duration?: number;
  distance?: number;
  isCompleted: boolean;
}
