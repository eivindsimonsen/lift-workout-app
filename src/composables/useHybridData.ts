import { computed, ref } from "vue";
import { useSupabaseData } from "./useSupabaseData"; // For user data (Supabase)
import * as exercisesData from "@/data/exercises.json";
import * as workoutTypesData from "@/data/workout-types.json";
import type { WorkoutType, ExerciseData } from "@/types/workout";

// Console logging utility (removed logs in production)
const logHybridAccess = (_operation: string, _details?: unknown) => {};

export const useHybridData = () => {
  const userData = useSupabaseData(); // Supabase for user data

  // Load exercises from JSON file
  const exercises = ref<ExerciseData[]>(exercisesData.exercises);

  // Load workout types from JSON file
  const workoutTypes = ref<WorkoutType[]>(workoutTypesData.workoutTypes);

  // ---- Workout type helpers ----
  const getWorkoutTypeColor = (id: string): string => {
    const workoutType = workoutTypes.value.find((wt: WorkoutType) => wt.id === id);
    return workoutType?.color || "#6b7280";
  };

  const getWorkoutType = (id: string): string => {
    const workoutType = workoutTypes.value.find((wt: WorkoutType) => wt.id === id);
    return workoutType?.name || id;
  };

  // ---- Exercise helpers (variants supported) ----
  const getExerciseById = (id: string) => {
    for (const exercise of exercises.value) {
      if (exercise.categoryId === id) return exercise;
      if (exercise.variants) {
        const variant = exercise.variants.find((v) => v.id === id);
        if (variant) {
          // Merge variant over base (variant props win)
          return { ...exercise, ...variant };
        }
      }
    }
    return null;
  };

  const getMainExerciseByVariantId = (variantId: string) => exercises.value.find((exercise) => exercise.variants?.some((v) => v.id === variantId));

  const getFlattenedExercises = computed(() => {
    const flattened: Array<{
      id: string;
      name: string;
      category?: string;
      workoutTypes?: string[];
      muscleGroups?: string[];
      equipment?: string;
      angle?: string;
      grip?: string;
      position?: string;
      direction?: string;
      focus?: string;
    }> = [];

    exercises.value.forEach((exercise) => {
      if (exercise.variants && exercise.variants.length > 0) {
        exercise.variants.forEach((variant) => {
          // Skip variants that accidentally reuse the main id
          if (variant.id === exercise.categoryId) return;

          flattened.push({
            id: variant.id,
            name: variant.name,
            category: exercise.category,
            workoutTypes: exercise.workoutTypes,
            muscleGroups: exercise.muscleGroups,
            equipment: variant.equipment,
            angle: variant.angle,
            grip: variant.grip,
            position: variant.position,
            direction: variant.direction,
            focus: variant.focus,
          });
        });
      } else {
        flattened.push({
          id: exercise.categoryId,
          name: exercise.name,
          category: exercise.category,
          workoutTypes: exercise.workoutTypes,
          muscleGroups: exercise.muscleGroups,
        });
      }
    });

    return flattened;
  });

  // ---- Pass-through helpers to userData ----
  const getTemplatesByType = (workoutType: string) => {
    logHybridAccess("Get templates by type", workoutType);
    return userData.getTemplatesByType.value(workoutType);
  };

  const getSessionById = (id: string) => {
    logHybridAccess("Get session by id", id);
    return userData.getSessionById.value(id);
  };

  // ---- API compatibility shims ----
  // Old name used in components → map to the new cache repaint helper
  const refreshUIData = async () => {
    // Prefer new name if available
    const fn = (userData as any).refreshOnResume || (userData as any).refreshUIData;
    if (typeof fn === "function") {
      return await fn();
    }
    // Nothing to do; keep app stable
    return;
  };

  // Old exported helper; network watching is internal now, so this is a safe no-op
  const watchNetworkStatus = async () => {
    const maybeFn = (userData as any).watchNetworkStatus;
    if (typeof maybeFn === "function") {
      return await maybeFn();
    }
    // No-op
    return;
  };

  return {
    // User data from Supabase
    workoutTypes,
    getWorkoutType,
    getWorkoutTypeColor,
    templates: userData.templates,
    sessions: userData.sessions,
    isLoading: userData.isLoading,
    currentUser: userData.currentUser,
    isAuthenticated: userData.isAuthenticated,
    isOnline: userData.isOnline,
    lastSyncTime: userData.lastSyncTime,

    // Exercise data from JSON file
    exercises,

    // Combined computed properties
    completedSessions: userData.completedSessions,
    totalVolume: userData.totalVolume,
    averageWorkoutDuration: userData.averageWorkoutDuration,
    recentSessions: userData.recentSessions,
    workoutStats: userData.workoutStats,
    getSessionById,
    getTemplatesByType,
    getExerciseById,
    getMainExerciseByVariantId,
    getFlattenedExercises,

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
    abandonWorkoutSession: userData.abandonWorkoutSession,
    signOut: userData.signOut,
    cleanup: userData.cleanup,

    // Compatibility shim (old name → new behavior)
    refreshUIData,

    // Offline-first functions
    updateTemplateOffline: userData.updateTemplateOffline,
    updateWorkoutSessionOffline: userData.updateWorkoutSessionOffline,
    syncPendingChanges: userData.syncPendingChanges,

    // Compatibility shim for older code paths (safe no-op if not present)
    watchNetworkStatus,

    // If you still want a manual network sync:
    forceSyncData: userData.forceSyncData,
  };
};
