import { ref, computed, onMounted, onUnmounted } from "vue";
import { useSupabase } from "./useSupabase";
import { useErrorHandler } from "@/composables/useErrorHandler";
import type { WorkoutTemplate, WorkoutSession, WorkoutType } from "@/types/workout";

// Console logging utility
const logSupabaseAccess = (operation: string, details?: any) => {
  const timestamp = new Date().toLocaleTimeString("no-NO");
};

// Singleton instance
let supabaseDataInstance: ReturnType<typeof createSupabaseData> | null = null;
let isInitializing = false;

const createSupabaseData = () => {
  const { supabase } = useSupabase();

  // State (only user data)
  const templates = ref<WorkoutTemplate[]>([]);
  const sessions = ref<WorkoutSession[]>([]);
  const isLoading = ref(false);
  const currentUser = ref<any>(null);
  const isAuthenticated = ref(false);
  const isInitialized = ref(false); // Add initialization guard

  // Load data from Supabase (only user data)
  const loadData = async (retryCount = 0) => {
    if (!currentUser.value) {
      return;
    }

    // Prevent multiple simultaneous calls
    if (isLoading.value) {
      return;
    }
    isLoading.value = true;

    // Add retry logic for better reliability
    const maxRetries = 2;

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (isLoading.value) {
        isLoading.value = false;
      }
    }, 10000); // 10 second timeout

    try {
      // Ensure user profile exists before loading data
      await ensureUserProfile();

      // Load templates for the current user
      const { data: templatesData, error: templatesError } = await supabase.from("workout_templates").select("*").eq("user_id", currentUser.value.id).order("created_at", { ascending: true });

      if (templatesError) {
        console.error("Error loading templates:", templatesError);
        throw templatesError;
      }
      logSupabaseAccess("Get templates", `${templatesData.length} templates`);
      templates.value = templatesData.map((template: any) => ({
        id: template.id,
        name: template.name,
        workoutType: template.workout_type,
        exercises: template.exercises,
      }));

      // Load sessions for the current user
      const { data: sessionsData, error: sessionsError } = await supabase.from("workout_sessions").select("*").eq("user_id", currentUser.value.id).order("date", { ascending: false });

      if (sessionsError) {
        console.error("Error loading sessions:", sessionsError);
        throw sessionsError;
      }
      logSupabaseAccess("Get sessions", `${sessionsData.length} sessions`);
      sessions.value = sessionsData.map((session: any) => {
        // Ensure exercises data is properly formatted with numbers
        const exercises =
          session.exercises?.map((exercise: any) => ({
            ...exercise,
            sets:
              exercise.sets?.map((set: any) => ({
                ...set,
                weight: typeof set.weight === "string" ? parseFloat(set.weight) || 0 : set.weight || 0,
                reps: typeof set.reps === "string" ? parseInt(set.reps) || 0 : set.reps || 0,
              })) || [],
          })) || [];

        // Recalculate total volume based on corrected weights
        const recalculatedTotalVolume = exercises.reduce((exerciseTotal: number, exercise: any) => {
          const exerciseVolume = exercise.sets.reduce((setTotal: number, set: any) => {
            if (set.isCompleted && set.weight && set.reps) {
              return setTotal + set.weight * set.reps;
            }
            return setTotal;
          }, 0);
          return exerciseTotal + exerciseVolume;
        }, 0);

        return {
          id: session.id,
          templateId: session.template_id,
          templateName: session.template_name,
          workoutType: session.workout_type,
          date: new Date(session.date),
          duration: session.duration,
          totalVolume: recalculatedTotalVolume,
          exercises: exercises,
          isCompleted: session.is_completed,
        };
      });

      // Note: Exercises are loaded from exercises.json, not from Supabase
      logSupabaseAccess("Get exercises", "Loaded from exercises.json");
    } catch (error: any) {
      console.error("Error loading Supabase data:", error);

      // Retry logic for better reliability
      if (retryCount < maxRetries) {
        console.log(`🔄 Retrying data load (attempt ${retryCount + 1}/${maxRetries})`);
        isLoading.value = false;
        clearTimeout(timeoutId);

        // Wait a bit before retrying
        setTimeout(() => {
          loadData(retryCount + 1);
        }, 1000 * (retryCount + 1)); // Exponential backoff
        return;
      }

      // Use error handler to show user-friendly error after max retries
      const { showError } = useErrorHandler();
      showError("Kunne ikke laste data fra databasen. Prøv å oppdatere siden.");
    } finally {
      clearTimeout(timeoutId);
      isLoading.value = false;
    }
  };

  // Ensure user preferences exist in user_preferences table
  const ensureUserProfile = async () => {
    if (!currentUser.value) {
      return;
    }

    try {
      // Check if user preferences exist
      const { data: existingUser, error: selectError } = await supabase.from("user_preferences").select("id").eq("id", currentUser.value.id).single();

      if (selectError) {
        // Check if the error is due to no rows found (PGRST116) or other issues
        if (selectError.code === "PGRST116" || selectError.message?.includes("No rows found")) {
          // User preferences don't exist, create them

          const { error: insertError } = await supabase
            .from("user_preferences")
            .insert({
              id: currentUser.value.id,
              supabase_id: currentUser.value.id,
              subscription_type: "free",
              subscription_status: "active",
            })
            .select()
            .single();

          if (insertError) {
            // Check if it's a duplicate key error (user already exists)
            if (insertError.code === "23505" || insertError.message?.includes("duplicate key")) {
              // User preferences already exist, skipping insert
            } else {
              // Check if this is a table not found error
              if (insertError.message?.includes('relation "user_preferences" does not exist')) {
                throw new Error("user_preferences table does not exist. Please run the database migration.");
              }

              throw insertError;
            }
          }
        } else {
          // Check if this is a table not found error
          if (selectError.message?.includes('relation "user_preferences" does not exist')) {
            throw new Error("user_preferences table does not exist. Please run the database migration.");
          }

          throw selectError;
        }
      }
    } catch (error) {
      console.error("Error ensuring user preferences:", error);
      throw error;
    }
  };

  // Authentication methods
  const initializeAuth = async () => {
    // Prevent multiple initializations
    if (isInitialized.value || isInitializing) {
      return;
    }

    isInitializing = true;
    isInitialized.value = true;

    // Add a small delay to ensure Supabase is fully initialized
    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      // Get initial session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Error getting initial session:", sessionError);
        // Don't throw here, just log the error
      }

      if (session?.user) {
        currentUser.value = session.user;
        isAuthenticated.value = true;
        try {
          await loadData();
        } catch (loadError) {
          console.error("Error loading initial data:", loadError);
          // Don't fail auth initialization if data loading fails
        }
      }

      // Listen for auth changes (only set up once)
      supabase.auth.onAuthStateChange(async (event: any, session: any) => {
        if (event === "SIGNED_IN" && session?.user) {
          currentUser.value = session.user;
          isAuthenticated.value = true;
          // Only load data if we don't already have it
          if (templates.value.length === 0 && sessions.value.length === 0) {
            await loadData();
          }
        } else if (event === "SIGNED_OUT") {
          currentUser.value = null;
          isAuthenticated.value = false;
          templates.value = [];
          sessions.value = [];
        } else if (event === "TOKEN_REFRESHED" && session?.user) {
          // Handle token refresh on mobile
          currentUser.value = session.user;
          isAuthenticated.value = true;
        }
      });

      // Handle page visibility changes (mobile browser) - only set up once
      if (typeof document !== "undefined") {
        const handleVisibilityChange = () => {
          if (document.visibilityState === "visible") {
            // Always check session when page becomes visible to ensure state is fresh
            supabase.auth
              .getSession()
              .then(({ data: { session }, error }: any) => {
                if (error) {
                  console.error("📱 Error getting session on visibility change:", error);
                  return;
                }

                if (session?.user) {
                  // If we have a session but no current user, or user ID changed, update
                  if (!currentUser.value || session.user.id !== currentUser.value.id) {
                    currentUser.value = session.user;
                    isAuthenticated.value = true;
                    // Only load data if we don't already have it
                    if (templates.value.length === 0 && sessions.value.length === 0) {
                      loadData();
                    }
                  }
                } else if (currentUser.value) {
                  // If we have a current user but no session, user was logged out
                  currentUser.value = null;
                  isAuthenticated.value = false;
                  templates.value = [];
                  sessions.value = [];
                }
              })
              .catch((error: any) => {
                console.error("📱 Error checking session on visibility change:", error);
                // Don't reset state on error, just log it
              });
          }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        // Store the handler for cleanup
        if (typeof window !== "undefined") {
          (window as any).__visibilityChangeHandler = handleVisibilityChange;
        }
      }
    } catch (error) {
      console.error("❌ Error initializing auth:", error);
      isInitialized.value = false; // Reset on error
    } finally {
      isInitializing = false;
    }
  };

  const signOut = async () => {
    try {
      const result = await supabase.auth.signOut();

      if (result.error) {
        console.error("Error signing out:", result.error);
        // Even if there's an error, we should still reset local state
      }

      // Always reset local state regardless of error

      currentUser.value = null;
      isAuthenticated.value = false;
      templates.value = [];
      sessions.value = [];
      isLoading.value = false;

      // Don't clear remembered credentials - keep them for easy re-login
    } catch (error) {
      console.error("Unexpected error during sign out:", error);
      // Even if there's an unexpected error, reset local state
      currentUser.value = null;
      isAuthenticated.value = false;
      templates.value = [];
      sessions.value = [];
      isLoading.value = false;

      // Don't clear remembered credentials even on error
    }
  };

  // Reset function for mobile browser issues
  const resetState = () => {
    isLoading.value = false;
    isInitialized.value = false;
    currentUser.value = null;
    isAuthenticated.value = false;
    templates.value = [];
    sessions.value = [];
  };

  // Cleanup function to remove event listeners
  const cleanup = () => {
    if (typeof document !== "undefined" && typeof window !== "undefined") {
      const handler = (window as any).__visibilityChangeHandler;
      if (handler) {
        document.removeEventListener("visibilitychange", handler);
        delete (window as any).__visibilityChangeHandler;
      }
    }
  };

  // Computed properties (only user data)

  const completedSessions = computed(() => {
    return sessions.value.filter((session) => session.isCompleted);
  });

  const totalVolume = computed(() => {
    return completedSessions.value.reduce((total, session) => {
      return total + (session.totalVolume || 0);
    }, 0);
  });

  const averageWorkoutDuration = computed(() => {
    if (completedSessions.value.length === 0) return 0;
    const totalDuration = completedSessions.value.reduce((total, session) => {
      return total + session.duration;
    }, 0);
    return Math.round(totalDuration / completedSessions.value.length);
  });

  const recentSessions = computed(() => {
    return completedSessions.value.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3);
  });

  const workoutStats = computed(() => {
    const totalWorkouts = completedSessions.value.length;
    const totalVolumeSum = totalVolume.value;
    const avgDuration = averageWorkoutDuration.value;

    // Most used exercises
    const exerciseCounts: { [key: string]: number } = {};
    completedSessions.value.forEach((session) => {
      session.exercises.forEach((exercise) => {
        exerciseCounts[exercise.name] = (exerciseCounts[exercise.name] || 0) + 1;
      });
    });

    const mostUsedExercises = Object.entries(exerciseCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Weekly progress (last 8 weeks)
    const weeklyProgress = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const weekVolume = completedSessions.value
        .filter((session) => {
          const sessionDate = new Date(session.date);
          return sessionDate >= weekStart && sessionDate <= weekEnd;
        })
        .reduce((total, session) => total + (session.totalVolume || 0), 0);

      weeklyProgress.push({
        week: weekStart.toLocaleDateString("no-NO", { month: "short", day: "numeric" }),
        volume: weekVolume,
      });
    }

    return {
      totalWorkouts,
      totalVolume: totalVolumeSum,
      averageWorkoutDuration: avgDuration,
      mostUsedExercises,
      weeklyProgress,
    };
  });

  const getSessionById = computed(() => {
    return (id: string) => {
      logSupabaseAccess("Get session by id", id);
      const found = sessions.value.find((s) => s.id === id);
      return found;
    };
  });

  const getTemplatesByType = computed(() => {
    return (workoutType: string) => {
      logSupabaseAccess("Get templates by type", workoutType);
      const filtered = templates.value.filter((t) => t.workoutType === workoutType);
      return filtered;
    };
  });

  // Actions with Supabase integration
  const addTemplate = async (template: WorkoutTemplate) => {
    if (!currentUser.value) {
      console.error("No user logged in");
      return;
    }

    logSupabaseAccess("Add template", template.name);

    try {
      // Ensure user profile exists before creating template
      await ensureUserProfile();

      const { data, error } = await supabase
        .from("workout_templates")
        .insert({
          user_id: currentUser.value.id,
          name: template.name,
          workout_type: template.workoutType,
          exercises: template.exercises,
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding template:", error);
        return;
      }

      templates.value.push({
        id: data.id,
        name: data.name,
        workoutType: data.workout_type,
        exercises: data.exercises,
      });
    } catch (error) {
      console.error("Error in addTemplate:", error);
      // Use error handler to show user-friendly error
      const { showError } = useErrorHandler();
      showError("Kunne ikke opprette økt. Prøv igjen.");
    }
  };

  const updateTemplate = async (id: string, updates: Partial<WorkoutTemplate>) => {
    logSupabaseAccess("Update template", id);

    const { error } = await supabase
      .from("workout_templates")
      .update({
        name: updates.name,
        workout_type: updates.workoutType,
        exercises: updates.exercises,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error updating template:", error);
      return;
    }

    const index = templates.value.findIndex((t) => t.id === id);
    if (index !== -1) {
      templates.value[index] = { ...templates.value[index], ...updates };
    }
  };

  const deleteTemplate = async (id: string) => {
    logSupabaseAccess("Delete template", id);

    const { error } = await supabase.from("workout_templates").delete().eq("id", id);

    if (error) {
      console.error("Error deleting template:", error);
      return;
    }

    templates.value = templates.value.filter((t) => t.id !== id);
  };

  const startWorkoutSession = async (templateId: string): Promise<WorkoutSession | null> => {
    if (!currentUser.value) {
      console.error("No user logged in");
      return null;
    }

    logSupabaseAccess("Start session", templateId);

    const template = templates.value.find((t) => t.id === templateId);
    if (!template) {
      console.error("❌ Template not found:", templateId);
      return null;
    }

    try {
      // Ensure user profile exists before creating session
      await ensureUserProfile();

      // First, mark all existing active sessions as completed
      const { error: updateError } = await supabase.from("workout_sessions").update({ is_completed: true }).eq("user_id", currentUser.value.id).eq("is_completed", false);

      if (updateError) {
        console.error("Error marking sessions as completed:", updateError);
        return null;
      }

      // Update local state to reflect the changes
      sessions.value.forEach((session) => {
        if (!session.isCompleted) {
          session.isCompleted = true;
        }
      });

      const session: WorkoutSession = {
        id: `session-${Date.now()}`,
        templateId: template.id,
        templateName: template.name,
        workoutType: template.workoutType,
        date: new Date(),
        duration: 0,
        exercises: template.exercises.map((exercise) => ({
          exerciseId: exercise.exerciseId,
          name: exercise.name,
          sets: [
            {
              id: `set-${Date.now()}`,
              reps: 0,
              weight: 0,
              duration: undefined,
              distance: undefined,
              isCompleted: false,
            },
          ],
        })),
        isCompleted: false,
      };

      const { data, error } = await supabase
        .from("workout_sessions")
        .insert({
          user_id: currentUser.value.id,
          template_id: template.id,
          template_name: template.name,
          workout_type: template.workoutType,
          date: session.date.toISOString(),
          duration: session.duration,
          exercises: session.exercises,
          is_completed: session.isCompleted,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating workout session:", error);
        return null;
      }

      // Update session with database ID
      session.id = data.id;
      sessions.value.unshift(session);

      return session;
    } catch (error) {
      console.error("Error in startWorkoutSession:", error);
      // Use error handler to show user-friendly error
      const { showError } = useErrorHandler();
      showError("Kunne ikke starte treningsøkt. Prøv igjen.");
      return null;
    }
  };

  const updateWorkoutSession = async (sessionId: string, updates: Partial<WorkoutSession>) => {
    logSupabaseAccess("Update session", sessionId);

    if (updates.exercises) {
      // Ensure all weights and reps are numbers before saving
      updates.exercises.forEach((exercise: any, index: number) => {
        exercise.sets.forEach((set: any, setIndex: number) => {
          // Ensure weight and reps are numbers
          if (typeof set.weight === "string") {
            set.weight = parseFloat(set.weight) || 0;
          }
          if (typeof set.reps === "string") {
            set.reps = parseInt(set.reps) || 0;
          }

          // Additional safety check - ensure they are actually numbers
          set.weight = Number(set.weight) || 0;
          set.reps = Number(set.reps) || 0;
        });
      });
    }

    try {
      const { error } = await supabase
        .from("workout_sessions")
        .update({
          template_name: updates.templateName,
          workout_type: updates.workoutType,
          duration: updates.duration,
          total_volume: updates.totalVolume,
          exercises: updates.exercises,
          is_completed: updates.isCompleted,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (error) {
        console.error("❌ Error updating session in database:", error);
        throw error;
      }

      const index = sessions.value.findIndex((s) => s.id === sessionId);
      if (index !== -1) {
        // Deep merge the exercises to ensure all data is preserved
        if (updates.exercises) {
          sessions.value[index].exercises = updates.exercises;
        }
        // Update other fields
        Object.assign(sessions.value[index], updates);
      } else {
        console.warn("⚠️ Session not found in local state for update");
      }
    } catch (error) {
      console.error("❌ Error in updateWorkoutSession:", error);
      throw error;
    }
  };

  const completeWorkoutSession = async (sessionId: string) => {
    logSupabaseAccess("Complete session", sessionId);

    try {
      const session = sessions.value.find((s) => s.id === sessionId);
      if (!session) {
        console.error("❌ Session not found:", sessionId);
        throw new Error("Session not found");
      }

      // Calculate total volume
      const totalVolume = session.exercises.reduce((exerciseTotal, exercise) => {
        const exerciseVolume = exercise.sets.reduce((setTotal, set) => {
          if (set.isCompleted && set.weight) {
            // Ensure weight and reps are numbers
            const weight = Number(set.weight) || 0;
            const reps = Number(set.reps) || 0;
            const volume = weight * reps;
            return setTotal + volume;
          }
          return setTotal;
        }, 0);
        return exerciseTotal + exerciseVolume;
      }, 0);

      const duration = Math.round((Date.now() - new Date(session.date).getTime()) / 60000);

      await updateWorkoutSession(sessionId, {
        isCompleted: true,
        totalVolume,
        duration,
      });

      // Update local state
      const sessionIndex = sessions.value.findIndex((s) => s.id === sessionId);
      if (sessionIndex !== -1) {
        sessions.value[sessionIndex] = {
          ...sessions.value[sessionIndex],
          isCompleted: true,
          totalVolume,
          duration,
        };
      }
    } catch (error) {
      console.error("❌ Error in completeWorkoutSession:", error);
      throw error;
    }
  };

  const markSessionAsActive = async (sessionId: string) => {
    if (!currentUser.value) {
      console.error("No user logged in");
      return;
    }

    logSupabaseAccess("Mark session active", sessionId);

    try {
      // Ensure user profile exists before updating sessions
      await ensureUserProfile();

      // First, mark all other sessions as completed
      const { error: updateError } = await supabase.from("workout_sessions").update({ is_completed: true }).eq("user_id", currentUser.value.id).neq("id", sessionId).eq("is_completed", false);

      if (updateError) {
        console.error("Error marking other sessions as completed:", updateError);
        return;
      }

      // Update local state to reflect the changes
      sessions.value.forEach((session) => {
        if (session.id !== sessionId && !session.isCompleted) {
          session.isCompleted = true;
        }
      });

      // Then mark the current session as active
      await updateWorkoutSession(sessionId, {
        isCompleted: false,
      });
    } catch (error) {
      console.error("Error in markSessionAsActive:", error);
      // Use error handler to show user-friendly error
      const { showError } = useErrorHandler();
      showError("Kunne ikke aktivere treningsøkt. Prøv igjen.");
    }
  };

  const deleteWorkoutSession = async (sessionId: string) => {
    logSupabaseAccess("Delete session", sessionId);

    const { error } = await supabase.from("workout_sessions").delete().eq("id", sessionId);

    if (error) {
      console.error("Error deleting session:", error);
      return;
    }

    sessions.value = sessions.value.filter((s) => s.id !== sessionId);
  };

  return {
    // State (only user data)
    templates,
    sessions,
    isLoading,
    currentUser,
    isAuthenticated,
    isInitialized,

    // Computed
    completedSessions,
    totalVolume,
    averageWorkoutDuration,
    recentSessions,
    workoutStats,
    getSessionById,
    getTemplatesByType,

    // Actions
    loadData,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    startWorkoutSession,
    updateWorkoutSession,
    completeWorkoutSession,
    markSessionAsActive,
    deleteWorkoutSession,
    signOut,
    initializeAuth,
    resetState,
    cleanup,
  };
};

export function useSupabaseData() {
  // Ensure singleton is created only once
  if (!supabaseDataInstance) {
    supabaseDataInstance = createSupabaseData();

    // Initialize auth state immediately when singleton is created
    // Use setTimeout to ensure this runs after the current execution context
    setTimeout(() => {
      if (supabaseDataInstance && !supabaseDataInstance.isInitialized.value) {
        supabaseDataInstance.initializeAuth();
      }
    }, 0);
  } else {
  }

  return supabaseDataInstance;
}
