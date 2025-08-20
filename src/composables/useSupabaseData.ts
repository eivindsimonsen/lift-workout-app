import { ref, computed } from "vue";
import { useSupabase } from "./useSupabase";
import { useErrorHandler } from "@/composables/useErrorHandler";
import { useIndexedDB } from "@/composables/useIndexedDB";
import type { WorkoutTemplate, WorkoutSession } from "@/types/workout";

// Console logging utility
const logSupabaseAccess = (operation: string, details?: any) => {
  const timestamp = new Date().toLocaleTimeString("no-NO");
};

let __syncSeq = 0;
const tick = (seq: number, msg: string) => console.log(`[sync ${seq}] ${msg} @ ${new Date().toISOString()}`);

// Helper function to create serializable user object for IndexedDB storage
const createSerializableUser = (user: any) => {
  if (!user || typeof user !== "object") {
    console.warn("⚠️ Invalid user object provided to createSerializableUser");
    return null;
  }

  return {
    id: user.id || null,
    email: user.email || null,
    user_metadata: user.user_metadata || null,
    app_metadata: user.app_metadata || null,
    aud: user.aud || null,
    created_at: user.created_at || null,
    updated_at: user.updated_at || null,
  };
};

// Helper function to ensure data is serializable for IndexedDB storage
const ensureSerializable = (data: any): any => {
  // Handle null and undefined
  if (data === null || data === undefined) {
    return null;
  }

  // Handle primitive types
  if (typeof data !== "object") {
    return data;
  }

  // Handle Date objects
  if (data instanceof Date) {
    return data.toISOString();
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) => ensureSerializable(item));
  }

  // Handle objects - be very careful with this
  if (typeof data === "object") {
    const cleanData: any = {};

    // Get all enumerable keys
    const keys = Object.keys(data);

    for (const key of keys) {
      try {
        const value = data[key];

        // Skip functions and other non-serializable types
        if (typeof value === "function") {
          continue;
        }

        // Skip Vue reactive properties
        if (key.startsWith("__v_")) {
          continue;
        }

        // Skip undefined values
        if (value === undefined) {
          continue;
        }

        // Handle null values
        if (value === null) {
          cleanData[key] = null;
          continue;
        }

        // Handle primitive values
        if (typeof value !== "object") {
          cleanData[key] = value;
          continue;
        }

        // Handle Date objects
        if (value instanceof Date) {
          cleanData[key] = value.toISOString();
          continue;
        }

        // Handle arrays
        if (Array.isArray(value)) {
          cleanData[key] = value.map((item) => ensureSerializable(item));
          continue;
        }

        // Handle nested objects - be very careful
        try {
          // Test if this object can be serialized
          JSON.stringify(value);
          cleanData[key] = ensureSerializable(value);
        } catch {
          // If it can't be serialized, skip it
          console.warn(`⚠️ Skipping non-serializable nested object: ${key}`);
          continue;
        }
      } catch (error) {
        // Skip this property if it can't be processed
        console.warn(`⚠️ Skipping problematic property: ${key}`, error);
        continue;
      }
    }

    return cleanData;
  }

  // If we get here, something went wrong
  console.warn("⚠️ Unexpected data type in ensureSerializable:", typeof data);
  return null;
};

// Abortable timeout wrapper for Supabase/PostgREST
const withTimeout = async <T>(makeRequest: (signal: AbortSignal) => Promise<T>, ms: number, label = "request"): Promise<T> => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(`Timeout ${ms}ms: ${label}`), ms);

  try {
    return await makeRequest(ctrl.signal);
  } finally {
    clearTimeout(timer);
  }
};

// Hard timeout wrapper that does not rely on abort support.
// Even if the underlying promise never settles, this will reject at `ms`.
class TimeoutError extends Error {
  constructor(public label: string, public ms: number) {
    super(`Timeout after ${ms}ms: ${label}`);
    this.name = "TimeoutError";
  }
}

const withHardTimeout = async <T>(promiseFactory: () => Promise<T>, ms: number, label = "request"): Promise<T> => {
  let timeoutId: any;
  const timeoutP = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new TimeoutError(label, ms)), ms);
  });
  try {
    // Start the actual promise lazily so construction errors also get caught
    const p = promiseFactory();
    return (await Promise.race([p, timeoutP])) as T;
  } finally {
    clearTimeout(timeoutId);
  }
};

// Singleton instance
let supabaseDataInstance: ReturnType<typeof createSupabaseData> | null = null;
let isInitializing = false;

const createSupabaseData = () => {
  const { supabase } = useSupabase();
  const indexedDB = useIndexedDB();

  // State (only user data)
  const templates = ref<WorkoutTemplate[]>([]);
  const sessions = ref<WorkoutSession[]>([]);
  const isLoading = ref(false);
  const currentUser = ref<any>(null);
  const isAuthenticated = ref(false);
  const isInitialized = ref(false);
  const isOnline = ref(navigator.onLine);
  const lastSyncTime = ref<number | null>(null);

  // FIX: async computed → ref + updater
  const pendingChangesCount = ref(0);
  const refreshPendingChangesCount = async () => {
    if (!indexedDB.isSupported.value || !currentUser.value) {
      pendingChangesCount.value = 0;
      return;
    }
    try {
      const pendingChanges = await indexedDB.getPendingChanges();
      pendingChangesCount.value = pendingChanges.length;
    } catch (error) {
      console.error("❌ Error getting pending changes count:", error);
      pendingChangesCount.value = 0;
    }
  };

  // Debounce visibility change to prevent rapid tab switching from triggering loads
  let visibilityChangeTimeout: ReturnType<typeof setTimeout> | null = null;

  // Will hold auth subscription to clean up
  let authSub: {
    data?: { subscription?: { unsubscribe?: () => void } };
  } | null = null;

  // Network status monitoring
  const updateNetworkStatus = () => {
    const wasOffline = !isOnline.value;
    isOnline.value = navigator.onLine;
    console.log(`🌐 Network status: ${isOnline.value ? "Online" : "Offline"}`);

    // If we just came back online, sync pending changes
    if (wasOffline && isOnline.value && currentUser.value && indexedDB.isSupported.value) {
      console.log("🌐 Network back online, syncing pending changes...");
      // Use a small delay to ensure network is stable
      setTimeout(async () => {
        if (isOnline.value && currentUser.value) {
          await syncPendingChanges();
          await refreshPendingChangesCount();
        }
      }, 1000);
    }
  };

  // Initialize IndexedDB
  const initIndexedDB = async () => {
    try {
      console.log("📱 Initializing IndexedDB for offline caching...");
      await indexedDB.initDB();
      console.log("✅ IndexedDB initialized for offline caching");
    } catch (error) {
      console.error("❌ Failed to initialize IndexedDB:", error);
      // Don't throw here - app can still work without offline caching
      // Set isOnline to false to prevent offline operations from being attempted
      isOnline.value = false;
    }
  };

  // Force refresh UI data immediately (bypasses cache timeout)
  const refreshUIData = async () => {
    if (!currentUser.value) {
      return;
    }

    console.log("🔄 Force refreshing UI data immediately...");

    try {
      // Force sync with Supabase to get latest data
      if (isOnline.value) {
        await syncWithSupabase();
      } else {
        // If offline, at least refresh from cache
        if (indexedDB.isSupported.value) {
          const cachedData = await indexedDB.getUserData(currentUser.value.id);
          if (cachedData) {
            // Convert date strings back to Date objects
            const convertDates = (data: any[]): any[] => {
              return data.map((item) => {
                if (item && typeof item === "object") {
                  if (item.date && typeof item.date === "string") {
                    item.date = new Date(item.date);
                  }
                  if (item.created_at && typeof item.created_at === "string") {
                    item.created_at = new Date(item.created_at);
                  }
                  if (item.updated_at && typeof item.updated_at === "string") {
                    item.updated_at = new Date(item.updated_at);
                  }
                }
                return item;
              });
            };

            templates.value = cachedData.templates || [];
            sessions.value = convertDates(cachedData.sessions || []);
            lastSyncTime.value = cachedData.lastSync;
          }
        }
      }

      console.log("✅ UI data refreshed immediately");
    } catch (error) {
      console.error("❌ Error refreshing UI data:", error);
    } finally {
      await refreshPendingChangesCount();
    }
  };

  // Load data from cache first, then from Supabase if needed
  const loadData = async (retryCount = 0, forceRefresh = false) => {
    if (!currentUser.value) {
      return;
    }

    // Prevent multiple simultaneous calls
    if (isLoading.value) {
      return;
    }

    // Only set loading to true if we're actually going to do work
    // For visibility-triggered refreshes, be more conservative
    let shouldShowLoading = true;

    // Check if this is a visibility-triggered refresh with fresh cache
    if (forceRefresh && !isOnline.value) {
      shouldShowLoading = false; // Don't show loading for offline refreshes
    }

    // Set loading state immediately if needed
    if (shouldShowLoading) {
      isLoading.value = true;
    }

    try {
      // Try to load from cache first (only if IndexedDB is available)
      let cachedData: any = null;
      let hasPendingChanges = false;

      if (indexedDB.isSupported.value) {
        try {
          cachedData = await indexedDB.getUserData(currentUser.value.id);

          // Check if there are pending changes that haven't been synced yet
          const pendingChanges = await indexedDB.getPendingChanges();
          hasPendingChanges = pendingChanges.length > 0;
          pendingChangesCount.value = pendingChanges.length;

          if (cachedData && !forceRefresh) {
            console.log("📱 Loading data from cache...");

            // Convert date strings back to Date objects when loading from cache
            const convertDates = (data: any[]): any[] => {
              return data.map((item) => {
                if (item && typeof item === "object") {
                  // Convert session dates back to Date objects
                  if (item.date && typeof item.date === "string") {
                    item.date = new Date(item.date);
                  }
                  // Convert any other date fields that might exist
                  if (item.created_at && typeof item.created_at === "string") {
                    item.created_at = new Date(item.created_at);
                  }
                  if (item.updated_at && typeof item.updated_at === "string") {
                    item.updated_at = new Date(item.updated_at);
                  }
                }
                return item;
              });
            };

            templates.value = cachedData.templates || [];
            sessions.value = convertDates(cachedData.sessions || []);
            lastSyncTime.value = cachedData.lastSync;

            // If cache is fresh (less than 5 minutes old) OR if there are pending changes, don't sync
            const cacheAge = Date.now() - cachedData.lastSync;
            if (cacheAge < 5 * 60 * 1000 || hasPendingChanges) {
              console.log(`✅ Using cached data (${hasPendingChanges ? "pending changes exist" : "fresh"})`);
              if (hasPendingChanges) {
                console.log("📱 Pending changes detected - prioritizing local data over Supabase sync");
              }
              isLoading.value = false;
              return;
            }
          }
        } catch (cacheError) {
          console.warn("⚠️ Cache loading failed, will sync with Supabase:", cacheError);
          // Continue with Supabase sync if cache fails
        }
      } else {
        console.log("📱 IndexedDB not supported, skipping cache");
      }

      // Load from Supabase if online and cache is stale or forced, AND no pending changes
      if (isOnline.value && (!hasPendingChanges || forceRefresh)) {
        try {
          console.log("🌐 Syncing with Supabase...");
          await syncWithSupabase();
          console.log("✅ Supabase synced successfully");
        } catch (syncError) {
          console.error("❌ Supabase sync failed:", syncError);
          // If sync fails, try to use cached data if available
          if (cachedData) {
            console.log("📱 Using cached data due to sync failure");

            // Convert date strings back to Date objects when using fallback cache
            const convertDates = (data: any[]): any[] => {
              return data.map((item) => {
                if (item && typeof item === "object") {
                  // Convert session dates back to Date objects
                  if (item.date && typeof item.date === "string") {
                    item.date = new Date(item.date);
                  }
                  // Convert any other date fields that might exist
                  if (item.created_at && typeof item.created_at === "string") {
                    item.created_at = new Date(item.created_at);
                  }
                  if (item.updated_at && typeof item.updated_at === "string") {
                    item.updated_at = new Date(item.updated_at);
                  }
                }
                return item;
              });
            };

            templates.value = cachedData.templates || [];
            sessions.value = convertDates(cachedData.sessions || []);
          }
        }
      } else if (hasPendingChanges && !forceRefresh) {
        console.log("📱 Pending changes detected - skipping Supabase sync to preserve local changes");
        if (cachedData) {
          // Convert date strings back to Date objects when using offline cache
          const convertDates = (data: any[]): any[] => {
            return data.map((item) => {
              if (item && typeof item === "object") {
                // Convert session dates back to Date objects
                if (item.date && typeof item.date === "string") {
                  item.date = new Date(item.date);
                }
                // Convert any other date fields that might exist
                if (item.created_at && typeof item.created_at === "string") {
                  item.created_at = new Date(item.created_at);
                }
                if (item.updated_at && typeof item.updated_at === "string") {
                  item.updated_at = new Date(item.updated_at);
                }
              }
              return item;
            });
          };

          templates.value = cachedData.templates || [];
          sessions.value = convertDates(cachedData.sessions || []);
        }
      } else {
        console.log("📱 Offline mode - using cached data");
        if (cachedData) {
          // Convert date strings back to Date objects when using offline cache
          const convertDates = (data: any[]): any[] => {
            return data.map((item) => {
              if (item && typeof item === "object") {
                // Convert session dates back to Date objects
                if (item.date && typeof item.date === "string") {
                  item.date = new Date(item.date);
                }
                // Convert any other date fields that might exist
                if (item.created_at && typeof item.created_at === "string") {
                  item.created_at = new Date(item.created_at);
                }
                if (item.updated_at && typeof item.updated_at === "string") {
                  item.updated_at = new Date(item.updated_at);
                }
              }
              return item;
            });
          };

          templates.value = cachedData.templates || [];
          sessions.value = convertDates(cachedData.sessions || []);
        }
      }
    } catch (error) {
      console.error("❌ Error loading data:", error);

      // Fallback to cache if available
      if (indexedDB.isSupported.value) {
        try {
          const cachedData = await indexedDB.getUserData(currentUser.value.id);
          if (cachedData) {
            console.log("📱 Fallback to cached data");

            // Convert date strings back to Date objects when using fallback cache
            const convertDates = (data: any[]): any[] => {
              return data.map((item) => {
                if (item && typeof item === "object") {
                  // Convert session dates back to Date objects
                  if (item.date && typeof item.date === "string") {
                    item.date = new Date(item.date);
                  }
                  // Convert any other date fields that might exist
                  if (item.created_at && typeof item.created_at === "string") {
                    item.created_at = new Date(item.created_at);
                  }
                  if (item.updated_at && typeof item.updated_at === "string") {
                    item.updated_at = new Date(item.updated_at);
                  }
                }
                return item;
              });
            };

            templates.value = cachedData.templates || [];
            sessions.value = convertDates(cachedData.sessions || []);
          }
        } catch (cacheError) {
          console.error("❌ Cache fallback failed:", cacheError);
          // Don't fail the entire operation if cache fallback fails
        }
      }
    } finally {
      // Only reset loading if we actually set it to true
      if (shouldShowLoading) {
        isLoading.value = false;
      }
      await refreshPendingChangesCount();
    }
  };

  // Quick cache-first refresh for focus/visibility
  const refreshOnResume = async () => {
    try {
      if (indexedDB.isSupported.value && currentUser.value) {
        const cached = await indexedDB.getUserData(currentUser.value.id);
        if (cached) {
          templates.value = cached.templates || [];
          sessions.value = (cached.sessions || []).map((s) => ({ ...s, date: new Date(s.date) }));
          lastSyncTime.value = cached.lastSync ?? null;
        }
      }
      if (isOnline.value && currentUser.value) {
        syncWithSupabase().catch((e) => console.warn("resume sync failed:", e));
      }
    } finally {
      refreshPendingChangesCount();
    }
  };

  // Ensure Supabase auth is usable before hitting PostgREST
  const ensureActiveSession = async () => {
    try {
      // Fast check: get current session (bound by timeout)
      const { data, error } = await withTimeout(
        async (signal) => {
          // supabase-js doesn't accept signal here; but getSession is cheap and quick.
          return await supabase.auth.getSession();
        },
        4000,
        "auth.getSession"
      );

      if (error) {
        console.warn("⚠️ getSession error:", error);
        return false;
      }
      const session = data?.session;
      if (!session) return false;

      const exp = session.expires_at ? session.expires_at * 1000 : 0;
      const expSoon = exp && exp < Date.now() + 60_000; // expires within 60s

      if (expSoon) {
        console.log("🔐 Token expiring soon — refreshing session...");
        // Bound the refresh so PostgREST calls don't queue forever behind it
        const refreshed = await withTimeout(
          async (signal) => {
            const res = await supabase.auth.refreshSession();
            return !res.error;
          },
          5000,
          "auth.refreshSession"
        );
        return refreshed;
      }
      return true;
    } catch (e) {
      console.warn("⚠️ ensureActiveSession failed:", e);
      return false;
    }
  };

  const syncWithSupabase = async () => {
    if (!currentUser.value || !isOnline.value) return;

    const seq = ++__syncSeq;
    tick(seq, "begin syncWithSupabase");

    try {
      // Preflight auth (keep your existing ensureActiveSession if present)
      if (typeof ensureActiveSession === "function") {
        tick(seq, "ensureActiveSession:start");
        const ok = await withHardTimeout(() => ensureActiveSession(), 5000, "ensureActiveSession");
        tick(seq, `ensureActiveSession:done ok=${ok}`);
        if (!ok) {
          tick(seq, "ensureActiveSession:not-ok -> bail (use cache)");
          return;
        }
      }

      console.log("🌐 Syncing with Supabase...");
      tick(seq, "templates:query:start");

      // Templates query with hard timeout
      const { data: templatesData, error: templatesError } = await withHardTimeout(() => supabase.from("workout_templates").select("*").eq("user_id", currentUser.value.id).order("created_at", { ascending: true }), 8000, "load templates");

      tick(seq, "templates:query:end");
      if (templatesError) throw templatesError;

      const formattedTemplates = (templatesData || []).map((template: any) => ({
        id: template.id,
        name: template.name,
        workoutType: template.workout_type,
        exercises: template.exercises,
      }));

      tick(seq, "sessions:query:start");

      // Sessions query with hard timeout
      const { data: sessionsData, error: sessionsError } = await withHardTimeout(() => supabase.from("workout_sessions").select("*").eq("user_id", currentUser.value.id).order("date", { ascending: false }), 8000, "load sessions");

      tick(seq, "sessions:query:end");
      if (sessionsError) throw sessionsError;

      const formattedSessions = (sessionsData || []).map((session: any) => {
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

        const total = exercises.reduce((acc: number, ex: any) => {
          const vol = ex.sets.reduce((s: number, set: any) => (set.isCompleted && set.weight && set.reps ? s + set.weight * set.reps : s), 0);
          return acc + vol;
        }, 0);

        return {
          id: session.id,
          templateId: session.template_id,
          templateName: session.template_name,
          workoutType: session.workout_type,
          date: new Date(session.date),
          duration: session.duration || 0,
          exercises,
          totalVolume: Math.round(total),
          isCompleted: session.is_completed || false,
        };
      });

      // State + cache
      tick(seq, "state:update");
      templates.value = formattedTemplates;
      sessions.value = formattedSessions;
      lastSyncTime.value = Date.now();

      if (indexedDB.isSupported.value) {
        tick(seq, "cache:store:start");
        await withHardTimeout(
          () =>
            indexedDB.storeUserData(currentUser.value.id, {
              templates: ensureSerializable([...formattedTemplates]),
              sessions: ensureSerializable([...formattedSessions]),
              lastSync: Date.now(),
              user: createSerializableUser(currentUser.value),
            }),
          4000,
          "cache storeUserData"
        );
        tick(seq, "cache:store:end");
      }

      tick(seq, "done ok");
    } catch (err: any) {
      tick(seq, `error: ${err?.name || ""} ${err?.message || err}`);
      throw err;
    } finally {
      tick(seq, "finally");
      await refreshPendingChangesCount();
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

    try {
      // Initialize IndexedDB first
      await initIndexedDB();

      // Add a small delay to ensure Supabase is fully initialized
      await new Promise((resolve) => setTimeout(resolve, 100));

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

        // Try to load from cache first, then sync if needed
        try {
          await loadData();
        } catch (loadError) {
          console.error("Error loading initial data:", loadError);
          // Don't fail auth initialization if data loading fails
        }
      }

      // Listen for auth changes (only set up once)
      authSub = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
        if (event === "SIGNED_IN" && session?.user) {
          currentUser.value = session.user;
          isAuthenticated.value = true;

          // Load data (will use cache if available)
          await loadData();
          await refreshPendingChangesCount();
        } else if (event === "SIGNED_OUT") {
          currentUser.value = null;
          isAuthenticated.value = false;
          templates.value = [];
          sessions.value = [];
          pendingChangesCount.value = 0;

          // Clear cached data for this user
          if (indexedDB.isSupported.value) {
            try {
              await indexedDB.clearUserData(session?.user?.id || "");
            } catch (error) {
              console.warn("⚠️ Failed to clear cached data:", error);
              // Don't fail the sign out if cache clearing fails
            }
          }
        } else if (event === "TOKEN_REFRESHED" && session?.user) {
          // Handle token refresh on mobile
          currentUser.value = session.user;
          isAuthenticated.value = true;

          // Update cached user data
          if (indexedDB.isSupported.value) {
            try {
              const cachedData = await indexedDB.getUserData(session.user.id);
              if (cachedData) {
                const serializableUser = createSerializableUser(session.user);
                if (serializableUser) {
                  try {
                    await indexedDB.storeUserData(session.user.id, {
                      ...cachedData,
                      user: serializableUser,
                    });
                  } catch (storeError) {
                    console.warn("⚠️ Failed to update cached user data:", storeError);
                  }
                } else {
                  console.warn("⚠️ Cannot update cached user data - invalid user object");
                }
              }
            } catch (error) {
              console.warn("⚠️ Failed to retrieve cached user data for update:", error);
            }
          }

          await refreshPendingChangesCount();
        }
      });

      // Handle page visibility changes (mobile browser) - only set up once
      if (typeof document !== "undefined") {
        const handleVisibilityChange = () => {
          if (document.visibilityState === "visible") {
            // Clear any existing timeout
            if (visibilityChangeTimeout) {
              clearTimeout(visibilityChangeTimeout);
            }

            // Only sync when page becomes visible if cache is stale or there are pending changes
            if (currentUser.value && isOnline.value && !isLoading.value) {
              // Check if cache is stale (older than 5 minutes) or if there are pending changes
              const cacheAge = lastSyncTime.value ? Date.now() - lastSyncTime.value : Infinity;
              const isCacheStale = cacheAge > 5 * 60 * 1000; // 5 minutes

              if (isCacheStale) {
                console.log("📱 Page visible, cache is stale, syncing data for consistency...");
                // Use a shorter delay for better responsiveness
                visibilityChangeTimeout = setTimeout(async () => {
                  if (document.visibilityState === "visible" && currentUser.value && !isLoading.value) {
                    console.log("📱 Page visible, syncing stale data...");

                    // First sync any pending changes to preserve local data
                    if (indexedDB.isSupported.value) {
                      try {
                        const pendingChanges = await indexedDB.getPendingChanges();
                        if (pendingChanges.length > 0) {
                          console.log(`📱 Found ${pendingChanges.length} pending changes, syncing them first...`);
                          await syncPendingChanges();
                        }
                      } catch (error) {
                        console.warn("⚠️ Failed to sync pending changes on visibility change:", error);
                      }
                    }

                    // Then load data (will use cache if pending changes exist)
                    // use non-blocking refresh that prefers cache first
                    await refreshOnResume();
                  }
                }, 200); // Reduced delay for better responsiveness
              } else {
                console.log("📱 Page visible, cache is fresh, no sync needed");
                // Still refresh the count (cheap)
                refreshPendingChangesCount();
              }
            } else {
              console.log("📱 Page visible, no sync needed (offline, no user, or already loading)");
              refreshPendingChangesCount();
            }
          }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        // Store the handler for cleanup
        if (typeof window !== "undefined") {
          (window as any).__visibilityChangeHandler = handleVisibilityChange;
        }
      }

      // Set up network status monitoring
      window.addEventListener("online", async () => {
        updateNetworkStatus();
        await refreshPendingChangesCount();
      });
      window.addEventListener("offline", async () => {
        updateNetworkStatus();
        await refreshPendingChangesCount();
      });

      // Add focus handler to sync data when app gains focus - only if cache is stale
      const handleFocus = () => {
        if (currentUser.value && isOnline.value && !isLoading.value) {
          // Check if cache is stale (older than 5 minutes) or if there are pending changes
          const cacheAge = lastSyncTime.value ? Date.now() - lastSyncTime.value : Infinity;
          const isCacheStale = cacheAge > 5 * 60 * 1000; // 5 minutes

          if (isCacheStale) {
            console.log("📱 App gained focus, cache is stale, syncing data for consistency...");
            // Use a small delay to prevent rapid focus events
            setTimeout(async () => {
              if (currentUser.value && isOnline.value && !isLoading.value) {
                // First sync any pending changes to preserve local data
                if (indexedDB.isSupported.value) {
                  try {
                    const pendingChanges = await indexedDB.getPendingChanges();
                    if (pendingChanges.length > 0) {
                      console.log(`📱 Found ${pendingChanges.length} pending changes, syncing them first...`);
                      await syncPendingChanges();
                    }
                  } catch (error) {
                    console.warn("⚠️ Failed to sync pending changes on focus:", error);
                  }
                }

                // Then load data (will use cache if pending changes exist)
                await loadData(0, true); // Force refresh
                await refreshPendingChangesCount();
              }
            }, 100);
          } else {
            console.log("📱 App gained focus, cache is fresh, no sync needed");
            refreshPendingChangesCount();
          }
        } else {
          refreshPendingChangesCount();
        }
      };
      window.addEventListener("focus", handleFocus);

      // Store the focus handler for cleanup
      if (typeof window !== "undefined") {
        (window as any).__focusHandler = handleFocus;
      }

      // Clean up expired cache items periodically
      if (indexedDB.isSupported.value) {
        setInterval(() => {
          try {
            indexedDB.cleanupExpiredCache();
          } catch (error) {
            console.warn("⚠️ Cache cleanup failed:", error);
          }
        }, 10 * 60 * 1000); // Every 10 minutes
      }
    } catch (error) {
      console.error("❌ Error initializing auth:", error);
      isInitialized.value = false; // Reset on error
    } finally {
      isInitializing = false;
      await refreshPendingChangesCount();
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
      pendingChangesCount.value = 0;

      // Don't clear remembered credentials - keep them for easy re-login
    } catch (error) {
      console.error("Unexpected error during sign out:", error);
      // Even if there's an unexpected error, reset local state
      currentUser.value = null;
      isAuthenticated.value = false;
      templates.value = [];
      sessions.value = [];
      isLoading.value = false;
      pendingChangesCount.value = 0;

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
    pendingChangesCount.value = 0;
  };

  // Cleanup function to remove event listeners
  const cleanup = () => {
    if (typeof document !== "undefined" && typeof window !== "undefined") {
      const handler = (window as any).__visibilityChangeHandler;
      if (handler) {
        document.removeEventListener("visibilitychange", handler);
      }

      // Remove network status listeners
      window.removeEventListener("online", updateNetworkStatus as any);
      window.removeEventListener("offline", updateNetworkStatus as any);

      // Remove focus handler
      const focusHandler = (window as any).__focusHandler;
      if (focusHandler) {
        window.removeEventListener("focus", focusHandler);
      }

      // Clear visibility change timeout
      if (visibilityChangeTimeout) {
        clearTimeout(visibilityChangeTimeout);
        visibilityChangeTimeout = null;
      }

      // Unsubscribe auth listener
      try {
        authSub?.data?.subscription?.unsubscribe?.();
      } catch (e) {
        console.warn("⚠️ Failed to unsubscribe auth listener:", e);
      }
      authSub = null;
    }
  };

  // Offline-first save function
  const saveWithOfflineSupport = async (operation: string, data: any) => {
    try {
      // Always save to local cache first for immediate feedback
      if (currentUser.value) {
        // Update local state immediately
        if (operation === "template") {
          const existingIndex = templates.value.findIndex((t) => t.id === data.id);
          if (existingIndex >= 0) {
            templates.value[existingIndex] = data;
          } else {
            templates.value.push(data);
          }
        } else if (operation === "session") {
          const existingIndex = sessions.value.findIndex((s) => s.id === data.id);
          if (existingIndex >= 0) {
            sessions.value[existingIndex] = data;
          } else {
            sessions.value.push(data);
          }
        }

        // Cache the updated data - only store serializable user properties
        if (indexedDB.isSupported.value) {
          try {
            console.log("📱 Attempting to cache data locally...");
            const serializableUser = createSerializableUser(currentUser.value);

            if (!serializableUser) {
              console.warn("⚠️ Cannot cache data - invalid user object");
              return;
            }

            console.log("📱 Data before serialization:", {
              templatesType: typeof templates.value,
              templatesIsArray: Array.isArray(templates.value),
              sessionsType: typeof sessions.value,
              sessionsIsArray: Array.isArray(sessions.value),
              templatesLength: templates.value?.length,
              sessionsLength: sessions.value?.length,
            });

            // Extract raw data from Vue refs to avoid reactive object issues
            const rawTemplates = Array.isArray(templates.value) ? [...templates.value] : [];
            const rawSessions = Array.isArray(sessions.value) ? [...sessions.value] : [];

            const userDataToCache = {
              templates: ensureSerializable(rawTemplates),
              sessions: ensureSerializable(rawSessions),
              lastSync: Date.now(),
              user: serializableUser,
            };

            console.log("📱 Caching data structure:", {
              templatesCount: userDataToCache.templates?.length || 0,
              sessionsCount: userDataToCache.sessions?.length || 0,
              userKeys: Object.keys(userDataToCache.user),
            });

            await indexedDB.storeUserData(currentUser.value.id, userDataToCache);
            console.log("✅ Data cached successfully");
          } catch (cacheError) {
            console.warn("⚠️ Failed to cache data locally:", cacheError);
            console.error("❌ Cache error details:", cacheError);
            // Don't fail the operation if caching fails
          }
        } else {
          console.log("📱 IndexedDB not supported, skipping cache");
        }
      }

      // If online, sync with Supabase immediately
      if (isOnline.value) {
        console.log("🌐 Online - syncing immediately");
        const res = await performSupabaseOperation(operation, data);
        await refreshPendingChangesCount();
        return res;
      } else {
        // If offline, queue for later sync
        console.log("📱 Offline - queuing for later sync");

        if (indexedDB.isSupported.value) {
          try {
            // Ensure data is serializable for IndexedDB storage
            console.log("📱 Queuing offline change for operation:", operation);
            console.log("📱 Original data structure:", {
              operation,
              dataType: typeof data,
              dataKeys: data ? Object.keys(data) : [],
              dataIsArray: Array.isArray(data),
            });

            const serializableData = ensureSerializable(data);
            console.log("📱 Serialized data structure:", {
              operation,
              dataKeys: serializableData ? Object.keys(serializableData) : [],
              dataType: typeof serializableData,
              dataIsArray: Array.isArray(serializableData),
            });

            // Safety check - ensure we have valid data to store
            if (!serializableData) {
              console.warn("⚠️ Serialized data is null/undefined, skipping offline change");
              await refreshPendingChangesCount();
              return { success: true, offline: true, cacheFailed: true };
            }

            await indexedDB.storePendingChange(operation, serializableData);
            console.log("✅ Offline change queued successfully");
            await refreshPendingChangesCount();
            return { success: true, offline: true };
          } catch (cacheError) {
            console.warn("⚠️ Failed to queue offline change:", cacheError);
            console.error("❌ Offline change error details:", cacheError);
            await refreshPendingChangesCount();
            // Return success anyway since the data was saved locally
            return { success: true, offline: true, cacheFailed: true };
          }
        } else {
          console.log("📱 IndexedDB not supported, offline change not queued");
          await refreshPendingChangesCount();
          return { success: true, offline: true, cacheFailed: true };
        }
      }
    } catch (error) {
      console.error(`❌ Error in offline-first save (${operation}):`, error);
      throw error;
    }
  };

  // Perform actual Supabase operation
  const performSupabaseOperation = async (operation: string, data: any) => {
    switch (operation) {
      case "template":
        return await updateTemplate(data.id, data);
      case "session":
        return await updateWorkoutSession(data.id, data);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  };

  // Sync pending changes when back online
  const syncPendingChanges = async () => {
    if (!isOnline.value || !currentUser.value || !indexedDB.isSupported.value) return;

    try {
      const pendingChanges = await indexedDB.getPendingChanges();
      if (pendingChanges.length === 0) {
        pendingChangesCount.value = 0;
        return;
      }

      console.log(`🔄 Syncing ${pendingChanges.length} pending changes...`);

      for (const change of pendingChanges) {
        try {
          await performSupabaseOperation(change.type, change.data);
          await indexedDB.removePendingChange(change.id);
          console.log(`✅ Synced pending change: ${change.type}`);
        } catch (error) {
          console.error(`❌ Failed to sync pending change: ${change.type}`, error);
          // Increment retry count and keep for later
          change.retryCount = (change.retryCount || 0) + 1;
          if (change.retryCount > 3) {
            // Remove after 3 failed attempts
            try {
              await indexedDB.removePendingChange(change.id);
              console.log(`🗑️ Removed failed pending change after 3 attempts: ${change.type}`);
            } catch (removeError) {
              console.warn("⚠️ Failed to remove failed pending change:", removeError);
            }
          }
        }
      }
    } catch (error) {
      console.error("❌ Error syncing pending changes:", error);
    } finally {
      await refreshPendingChangesCount();
    }
  };

  // Watch for network status changes to sync pending changes
  const watchNetworkStatus = () => {
    if (isOnline.value && currentUser.value && indexedDB.isSupported.value) {
      syncPendingChanges();
    }
  };

  // Override existing functions to use offline-first approach
  const updateTemplateOffline = async (id: string, updates: Partial<WorkoutTemplate>) => {
    const updatedTemplate = { ...templates.value.find((t) => t.id === id), ...updates };
    return await saveWithOfflineSupport("template", updatedTemplate);
  };

  const updateWorkoutSessionOffline = async (id: string, updates: Partial<WorkoutSession>) => {
    // Find the existing session
    const existingSession = sessions.value.find((s) => s.id === id);
    if (!existingSession) {
      throw new Error(`Session with id ${id} not found`);
    }

    // Create a clean, non-reactive copy of the session
    const cleanExistingSession = {
      id: existingSession.id,
      templateId: existingSession.templateId,
      templateName: existingSession.templateName,
      workoutType: existingSession.workoutType,
      date: existingSession.date,
      isCompleted: existingSession.isCompleted,
      duration: existingSession.duration,
      totalVolume: existingSession.totalVolume,
      exercises: existingSession.exercises.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        name: exercise.name,
        sets: exercise.sets.map((set) => ({
          id: set.id,
          reps: Number(set.reps) || 0,
          weight: Number(set.weight) || 0,
          duration: set.duration,
          distance: set.distance,
          isCompleted: Boolean(set.isCompleted),
        })),
      })),
    };

    // Merge with updates
    const updatedSession = { ...cleanExistingSession, ...updates };

    console.log("🧹 Clean session data for IndexedDB:", updatedSession);

    return await saveWithOfflineSupport("session", updatedSession);
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
    return completedSessions.value
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);
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
    } finally {
      await refreshPendingChangesCount();
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

    await refreshPendingChangesCount();
  };

  const deleteTemplate = async (id: string) => {
    logSupabaseAccess("Delete template", id);

    const { error } = await supabase.from("workout_templates").delete().eq("id", id);

    if (error) {
      console.error("Error deleting template:", error);
      return;
    }

    templates.value = templates.value.filter((t) => t.id !== id);
    await refreshPendingChangesCount();
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
              id: `set-${Date.now()}-1`,
              reps: 0,
              weight: 0,
              duration: undefined,
              distance: undefined,
              isCompleted: false,
            },
            {
              id: `set-${Date.now()}-2`,
              reps: 0,
              weight: 0,
              duration: undefined,
              distance: undefined,
              isCompleted: false,
            },
            {
              id: `set-${Date.now()}-3`,
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

      // Immediately update the local cache to ensure consistency
      if (indexedDB.isSupported.value && currentUser.value) {
        try {
          console.log("📱 Immediately updating cache after starting new session...");
          const serializableUser = createSerializableUser(currentUser.value);

          if (serializableUser) {
            // Extract raw data from Vue refs to avoid reactive object issues
            const rawTemplates = Array.isArray(templates.value) ? [...templates.value] : [];
            const rawSessions = Array.isArray(sessions.value) ? [...sessions.value] : [];

            const userDataToCache = {
              templates: ensureSerializable(rawTemplates),
              sessions: ensureSerializable(rawSessions),
              lastSync: Date.now(),
              user: serializableUser,
            };

            await indexedDB.storeUserData(currentUser.value.id, userDataToCache);
            console.log("✅ Cache updated immediately after starting new session");
          }
        } catch (cacheError) {
          console.warn("⚠️ Failed to update cache immediately after starting new session:", cacheError);
          // Don't fail the operation if immediate cache update fails
        }
      }

      await refreshPendingChangesCount();
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
      updates.exercises.forEach((exercise: any) => {
        exercise.sets.forEach((set: any) => {
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
      // Ensure data types match database schema
      const updateData: any = {
        template_name: updates.templateName,
        workout_type: updates.workoutType,
        exercises: updates.exercises,
        is_completed: updates.isCompleted,
        updated_at: new Date().toISOString(),
      };

      // Ensure duration is an integer (database expects INTEGER)
      if (updates.duration !== undefined) {
        updateData.duration = Math.round(Number(updates.duration) || 0);
      }

      // Ensure total_volume is an integer (database expects INTEGER)
      if (updates.totalVolume !== undefined) {
        updateData.total_volume = Math.round(Number(updates.totalVolume) || 0);
      }

      const { error } = await supabase.from("workout_sessions").update(updateData).eq("id", sessionId);

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
    } finally {
      await refreshPendingChangesCount();
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
      const totalVolume = Math.round(
        session.exercises.reduce((exerciseTotal, exercise) => {
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
        }, 0)
      );

      const duration = Math.round((Date.now() - new Date(session.date).getTime()) / 60000);

      // Update local state immediately for better UX
      const sessionIndex = sessions.value.findIndex((s) => s.id === sessionId);
      if (sessionIndex !== -1) {
        sessions.value[sessionIndex] = {
          ...sessions.value[sessionIndex],
          isCompleted: true,
          totalVolume,
          duration,
        };
      }

      // Update in Supabase
      await updateWorkoutSession(sessionId, {
        isCompleted: true,
        totalVolume,
        duration,
      });

      // Immediately update the local cache to ensure consistency
      if (indexedDB.isSupported.value && currentUser.value) {
        try {
          console.log("📱 Immediately updating cache after session completion...");
          const serializableUser = createSerializableUser(currentUser.value);

          if (serializableUser) {
            // Extract raw data from Vue refs to avoid reactive object issues
            const rawTemplates = Array.isArray(templates.value) ? [...templates.value] : [];
            const rawSessions = Array.isArray(sessions.value) ? [...sessions.value] : [];

            const userDataToCache = {
              templates: ensureSerializable(rawTemplates),
              sessions: ensureSerializable(rawSessions),
              lastSync: Date.now(),
              user: serializableUser,
            };

            await indexedDB.storeUserData(currentUser.value.id, userDataToCache);
            console.log("✅ Cache updated immediately after session completion");
          }
        } catch (cacheError) {
          console.warn("⚠️ Failed to update cache immediately after session completion:", cacheError);
          // Don't fail the operation if immediate cache update fails
        }
      }

      console.log("✅ Session completed and cache updated successfully");
    } catch (error) {
      console.error("❌ Error in completeWorkoutSession:", error);
      throw error;
    } finally {
      await refreshPendingChangesCount();
    }
  };

  const markSessionAsActive = async (sessionId: string) => {
    if (!currentUser.value) {
      console.error("No user logged in");
      return;
    }

    logSupabaseAccess("Mark session active", sessionId);

    try {
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
    } finally {
      await refreshPendingChangesCount();
    }
  };

  const deleteWorkoutSession = async (sessionId: string) => {
    logSupabaseAccess("Delete session", sessionId);

    try {
      // Delete from Supabase first
      const { error } = await supabase.from("workout_sessions").delete().eq("id", sessionId);

      if (error) {
        console.error("Error deleting session:", error);
        throw error;
      }

      // Update local state immediately for better UX
      sessions.value = sessions.value.filter((s) => s.id !== sessionId);

      // Immediately update the local cache to ensure consistency
      if (indexedDB.isSupported.value && currentUser.value) {
        try {
          console.log("📱 Immediately updating cache after session deletion...");
          const serializableUser = createSerializableUser(currentUser.value);

          if (serializableUser) {
            // Extract raw data from Vue refs to avoid reactive object issues
            const rawTemplates = Array.isArray(templates.value) ? [...templates.value] : [];
            const rawSessions = Array.isArray(sessions.value) ? [...sessions.value] : [];

            const userDataToCache = {
              templates: ensureSerializable(rawTemplates),
              sessions: ensureSerializable(rawSessions),
              lastSync: Date.now(),
              user: serializableUser,
            };

            await indexedDB.storeUserData(currentUser.value.id, userDataToCache);
            console.log("✅ Cache updated immediately after session deletion");
          }
        } catch (cacheError) {
          console.warn("⚠️ Failed to update cache immediately after session deletion:", cacheError);
          // Don't fail the operation if immediate cache update fails
        }
      }

      console.log("✅ Session deleted successfully");
    } catch (error) {
      console.error("❌ Error deleting session:", error);
      throw error;
    } finally {
      await refreshPendingChangesCount();
    }
  };

  const abandonWorkoutSession = async (sessionId: string) => {
    logSupabaseAccess("Abandon session", sessionId);

    try {
      // For abandoned workouts, we want to delete them completely from the database
      // instead of marking them as completed with potentially invalid data
      const { error } = await supabase.from("workout_sessions").delete().eq("id", sessionId);

      if (error) {
        console.error("Error abandoning session:", error);
        throw error;
      }

      // Update local state immediately for better UX
      sessions.value = sessions.value.filter((s) => s.id !== sessionId);

      // Immediately update the local cache to ensure consistency
      if (indexedDB.isSupported.value && currentUser.value) {
        try {
          console.log("📱 Immediately updating cache after session abandonment...");
          const serializableUser = createSerializableUser(currentUser.value);

          if (serializableUser) {
            // Extract raw data from Vue refs to avoid reactive object issues
            const rawTemplates = Array.isArray(templates.value) ? [...templates.value] : [];
            const rawSessions = Array.isArray(sessions.value) ? [...sessions.value] : [];

            const userDataToCache = {
              templates: ensureSerializable(rawTemplates),
              sessions: ensureSerializable(rawSessions),
              lastSync: Date.now(),
              user: serializableUser,
            };

            await indexedDB.storeUserData(currentUser.value.id, userDataToCache);
            console.log("✅ Cache updated immediately after session abandonment");
          }
        } catch (cacheError) {
          console.warn("⚠️ Failed to update cache immediately after session abandonment:", cacheError);
          // Don't fail the operation if immediate cache update fails
        }
      }

      console.log("✅ Session abandoned and deleted successfully");
    } catch (error) {
      console.error("❌ Error abandoning session:", error);
      throw error;
    } finally {
      await refreshPendingChangesCount();
    }
  };

  // Force sync pending changes manually
  const forceSyncPendingChanges = async () => {
    if (!isOnline.value || !currentUser.value || !indexedDB.isSupported.value) {
      console.log("📱 Cannot force sync pending changes - no user or offline");
      return;
    }

    try {
      console.log("📱 Force syncing pending changes...");
      await syncPendingChanges();
      console.log("✅ Force sync of pending changes completed");
    } catch (error) {
      console.error("❌ Force sync of pending changes failed:", error);
      throw error;
    } finally {
      await refreshPendingChangesCount();
    }
  };

  // Force sync data with Supabase
  const forceSyncData = async () => {
    if (!currentUser.value || !isOnline.value) {
      console.log("📱 Cannot force sync - no user or offline");
      return;
    }

    try {
      console.log("📱 Force syncing data with Supabase...");
      await syncWithSupabase();
      console.log("✅ Force sync completed successfully");
    } catch (error) {
      console.error("❌ Force sync failed:", error);
      throw error;
    } finally {
      await refreshPendingChangesCount();
    }
  };

  return {
    // State (only user data)
    templates,
    sessions,
    isLoading,
    currentUser,
    isAuthenticated,
    isInitialized,
    isOnline,
    lastSyncTime,

    // Computed
    completedSessions,
    totalVolume,
    averageWorkoutDuration,
    recentSessions,
    workoutStats,
    getSessionById,
    getTemplatesByType,

    // FIXED: was async computed; now a ref + updater
    pendingChangesCount,

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
    abandonWorkoutSession,
    signOut,
    initializeAuth,
    resetState,
    cleanup,
    refreshUIData,

    // Offline-first functions
    updateTemplateOffline,
    updateWorkoutSessionOffline,
    syncPendingChanges,
    watchNetworkStatus,
    forceSyncData,
    forceSyncPendingChanges,

    // Expose the updater in case UI wants to trigger it explicitly
    refreshPendingChangesCount,
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
