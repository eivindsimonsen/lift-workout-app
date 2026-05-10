import { computed, ref } from "vue";
import { useSupabaseData } from "./useSupabaseData";
import { useExercises } from "./useExercises";
import * as workoutTypesData from "@/data/workout-types.json";
import type { WorkoutType, ExerciseData } from "@/types/workout";

const logHybridAccess = (_operation: string, _details?: unknown) => {};

export const useHybridData = () => {
  const userData = useSupabaseData();
  const exercisesStore = useExercises();

  // Load workout types from JSON (unchanged)
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

  // ---- Exercise helpers ----

  /**
   * Look up an exercise by variant ID or exercise ID.
   * Accepts number or string (route params are strings).
   * Returns the exercise merged with variant props, plus a compat `muscleGroups` array.
   */
  const getExerciseById = (id: number | string) => {
    const numId = Number(id);
    if (isNaN(numId)) return null;

    for (const exercise of exercisesStore.exercises.value) {
      // Match exercise-level id (exercises without variants)
      if (exercise.id === numId) {
        return {
          ...exercise,
          muscleGroups: [exercise.category], // backward-compat
        };
      }
      // Match variant id
      if (exercise.variants) {
        const variant = exercise.variants.find((v) => v.id === numId);
        if (variant) {
          return {
            ...exercise,
            ...variant,
            muscleGroups: [exercise.category], // backward-compat
          };
        }
      }
    }
    return null;
  };

  const getMainExerciseByVariantId = (variantId: number) =>
    exercisesStore.exercises.value.find((exercise) =>
      exercise.variants?.some((v) => v.id === variantId)
    ) ?? null;

  const getFlattenedExercises = computed(() => {
    const flattened: Array<{
      id: number;
      name: string;
      category?: string;
      workoutTypes?: string[];
      muscleGroups?: string[];
      equipment?: string;
    }> = [];

    exercisesStore.exercises.value.forEach((exercise) => {
      if (exercise.variants && exercise.variants.length > 0) {
        exercise.variants.forEach((variant) => {
          flattened.push({
            id: variant.id,
            name: variant.name,
            category: exercise.category,
            workoutTypes: exercise.workoutTypes,
            muscleGroups: [exercise.category],
            equipment: variant.equipment,
          });
        });
      } else {
        flattened.push({
          id: exercise.id,
          name: exercise.name,
          category: exercise.category,
          workoutTypes: exercise.workoutTypes,
          muscleGroups: [exercise.category],
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
  const refreshUIData = async () => {
    const fn = (userData as any).refreshOnResume || (userData as any).refreshUIData;
    if (typeof fn === "function") return await fn();
  };

  const watchNetworkStatus = async () => {
    const maybeFn = (userData as any).watchNetworkStatus;
    if (typeof maybeFn === "function") return await maybeFn();
  };

  return {
    // Workout types
    workoutTypes,
    getWorkoutType,
    getWorkoutTypeColor,

    // User data from Supabase
    templates: userData.templates,
    sessions: userData.sessions,
    isLoading: userData.isLoading,
    currentUser: userData.currentUser,
    isAuthenticated: userData.isAuthenticated,
    isOnline: userData.isOnline,
    lastSyncTime: userData.lastSyncTime,

    // Exercise data from Supabase (via useExercises)
    exercises: exercisesStore.exercises,
    isLoadingExercises: exercisesStore.isLoadingExercises,
    loadExercises: exercisesStore.loadExercises,

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
    /** Initialises auth then loads exercises so both are ready together. */
    initializeAuth: async () => {
      await userData.initializeAuth();
      await exercisesStore.loadExercises(true);
    },
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

    // Compatibility shims
    refreshUIData,
    watchNetworkStatus,
    updateTemplateOffline: userData.updateTemplateOffline,
    updateWorkoutSessionOffline: userData.updateWorkoutSessionOffline,
    syncPendingChanges: userData.syncPendingChanges,
    forceSyncData: userData.forceSyncData,
  };
};
