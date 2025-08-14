import { computed, ref } from "vue";
import { useSupabaseData } from "./useSupabaseData"; // For user data (Supabase)
import * as exercisesData from "@/data/exercises.json";
import * as workoutTypesData from "@/data/workout-types.json";
import type { WorkoutType, ExerciseData } from "@/types/workout";

// Console logging utility
const logHybridAccess = (operation: string, details?: unknown) => {
  const timestamp = new Date().toLocaleTimeString("no-NO");
};

export const useHybridData = () => {
  const userData = useSupabaseData(); // Supabase for user data

  // Load exercises from JSON file
  const exercises = ref<ExerciseData[]>(exercisesData.exercises);

  // Load workout types from JSON file
  const workoutTypes = ref<WorkoutType[]>(workoutTypesData.workoutTypes);

  // Helper functions for workout types
  const getWorkoutTypeColor = computed(() => {
    return (id: string): string => {
      const workoutType = workoutTypes.value.find((wt: WorkoutType) => wt.id === id);
      return workoutType?.color || "#6b7280";
    };
  });

  const getWorkoutType = computed(() => {
    return (id: string): string => {
      const workoutType = workoutTypes.value.find((wt: WorkoutType) => wt.id === id);
      return workoutType?.name || id;
    };
  });

  // Helper functions for exercises with variants
  const getExerciseById = computed(() => {
    return (id: string) => {
      for (const exercise of exercises.value) {
        if (exercise.id === id) return exercise;
        if (exercise.variants) {
          const variant = exercise.variants.find((v) => v.id === id);
          if (variant) {
            return { ...exercise, ...variant };
          }
        }
      }
      return null;
    };
  });

  const getMainExerciseByVariantId = computed(() => {
    return (variantId: string) => {
      return exercises.value.find((exercise) => exercise.variants?.some((v) => v.id === variantId));
    };
  });

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
          flattened.push({
            id: variant.id,
            name: `${exercise.name} - ${variant.name}`,
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
          id: exercise.id,
          name: exercise.name,
          category: exercise.category,
          workoutTypes: exercise.workoutTypes,
          muscleGroups: exercise.muscleGroups,
        });
      }
    });

    return flattened;
  });

  const getTemplatesByType = computed(() => {
    return (workoutType: string) => {
      logHybridAccess("Get templates by type", workoutType);
      return userData.getTemplatesByType.value(workoutType);
    };
  });

  const getSessionById = computed(() => {
    return (id: string) => {
      logHybridAccess("Get session by id", id);
      return userData.getSessionById.value(id);
    };
  });

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
  };
};
