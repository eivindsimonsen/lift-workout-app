import { computed, watch } from "vue";
import { useSupabaseData } from "./useSupabaseData";
import { useExercises } from "./useExercises";
import type { ExerciseData, ExerciseTrackingType } from "@/types/workout";

const logHybridAccess = (_operation: string, _details?: unknown) => {};

let exerciseLoadingWired = false;

/**
 * Loads the exercise library as soon as a signed-in user is known — at startup,
 * in parallel with the cache read and sync, and after signing in — and retries
 * a failed load when the network returns or the app comes back into view.
 * Wired once per app.
 */
const wireExerciseLoading = (
  userData: ReturnType<typeof useSupabaseData>,
  exercisesStore: ReturnType<typeof useExercises>
) => {
  if (exerciseLoadingWired) return;
  exerciseLoadingWired = true;

  watch(
    () => userData.currentUser.value?.id as string | undefined,
    (id) => {
      if (id) void exercisesStore.ensureExercisesLoaded(id);
    },
    { immediate: true }
  );

  const retry = () => void exercisesStore.retryExercisesIfFailed(userData.currentUser.value?.id);
  window.addEventListener("online", retry);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") retry();
  });
};

/** Resolved lookup entry for any exercise or variant id. */
export type ExerciseIndexEntry = {
  /** Display name — the variant name when the id belongs to a variant. */
  name: string;
  /** Primary muscle group, inherited from the parent exercise group. */
  category: string;
  /** Parent group name; equals `name` for standalone exercises. */
  groupName: string;
  /** How the exercise is measured; variants inherit their parent's type. */
  trackingType: ExerciseTrackingType;
  isVariant: boolean;
};

export const useHybridData = () => {
  const userData = useSupabaseData();
  const exercisesStore = useExercises();

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

  /**
   * Flat id → exercise lookup, rebuilt only when the exercise list changes.
   * `getExerciseById` scans every exercise and every variant on each call, which
   * gets expensive when resolving a whole week of sessions. Prefer this map for
   * bulk lookups; `getExerciseById` stays for one-off callers that need the full
   * exercise object.
   */
  const exerciseIndex = computed(() => {
    const index = new Map<number, ExerciseIndexEntry>();

    exercisesStore.exercises.value.forEach((exercise) => {
      index.set(exercise.id, {
        name: exercise.name,
        category: exercise.category,
        groupName: exercise.name,
        trackingType: exercise.trackingType ?? "strength",
        isVariant: false,
      });

      exercise.variants?.forEach((variant) => {
        index.set(variant.id, {
          name: variant.name,
          category: exercise.category,
          groupName: exercise.name,
          trackingType: exercise.trackingType ?? "strength",
          isVariant: true,
        });
      });
    });

    return index;
  });

  const getFlattenedExercises = computed(() => {
    const flattened: Array<{
      id: number;
      name: string;
      category?: string;
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
            muscleGroups: [exercise.category],
            equipment: variant.equipment,
          });
        });
      } else {
        flattened.push({
          id: exercise.id,
          name: exercise.name,
          category: exercise.category,
          muscleGroups: [exercise.category],
        });
      }
    });

    return flattened;
  });

  // ---- Pass-through helpers to userData ----
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
    // User data from Supabase
    templates: userData.templates,
    sessions: userData.sessions,
    isLoading: userData.isLoading,
    currentUser: userData.currentUser,
    isAuthenticated: userData.isAuthenticated,
    isOnline: userData.isOnline,
    lastSyncTime: userData.lastSyncTime,
    pendingChangesCount: userData.pendingChangesCount,
    authResolved: userData.authResolved,
    whenAuthResolved: userData.whenAuthResolved,
    localDataReady: userData.localDataReady,

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
    getExerciseById,
    getMainExerciseByVariantId,
    getFlattenedExercises,
    exerciseIndex,

    // Actions (all from Supabase)
    loadData: userData.loadData,
    /** Initialises auth; the exercise library loads alongside as soon as the user is known. */
    initializeAuth: async () => {
      wireExerciseLoading(userData, exercisesStore);
      await userData.initializeAuth();
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
