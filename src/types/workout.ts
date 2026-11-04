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
  /** Defaults to "strength"; variants inherit it from their parent. */
  trackingType: ExerciseTrackingType;
  variants?: ExerciseVariant[];
}

// Template system
export interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: ExerciseTemplate[];
}

export interface ExerciseTemplate {
  exerciseId: number;
  name: string;
}

// Session management
export interface WorkoutSession {
  id: string;
  templateId: string;
  templateName: string;
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
  /** Cardio only: perceived effort, 1 (easy) – 10 (max). Absent when not rated. */
  effort?: number;
  /** Cardio only: free-text note, e.g. "kamp mot Lyn" or "4×4 på mølle". */
  note?: string;
}

/** The unit `weight` was typed in — the machine's or the plates'. */
export type WeightUnit = 'kg' | 'lbs';

export interface WorkoutSet {
  id: string;
  reps: number;
  /** As typed, in `weightUnit` — the extra load when `withBodyweight` is on. */
  weight?: number;
  /** Missing means kg — every set logged before units existed. */
  weightUnit?: WeightUnit;
  /** Dips, pull-ups: body weight is part of the load, `weight` is what's added. */
  withBodyweight?: boolean;
  /** Body weight in kg when the set was logged; only with `withBodyweight`. */
  bodyweight?: number;
  /** Seconds. For a cardio round with a running stopwatch, the time banked before the current stint. */
  duration?: number;
  /** Metres. */
  distance?: number;
  /** Cardio only: epoch ms when the stopwatch on this round was (re)started; absent when stopped. */
  timerStartedAt?: number | null;
  isCompleted: boolean;
}
