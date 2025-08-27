import { ref, computed } from "vue";
import { useSupabase } from "./useSupabase";
import { useErrorHandler } from "@/composables/useErrorHandler";
import { useIndexedDB } from "@/composables/useIndexedDB";
import type { WorkoutTemplate, WorkoutSession } from "@/types/workout";

// ------- tiny logger ----------
const logSupabaseAccess = (operation: string, details?: any) => {
  void operation;
  void details; // keep signature, silence unused
};
let __syncSeq = 0;
const tick = (seq: number, msg: string) => console.log(`[sync ${seq}] ${msg} @ ${new Date().toISOString()}`);

// ------- serializable helpers ----------
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

const ensureSerializable = (data: any): any => {
  if (data === null || data === undefined) return null;
  if (typeof data !== "object") return data;
  if (data instanceof Date) return data.toISOString();
  if (Array.isArray(data)) return data.map((x) => ensureSerializable(x));

  const clean: any = {};
  for (const key of Object.keys(data)) {
    try {
      const value = (data as any)[key];
      if (typeof value === "function") continue;
      if (key.startsWith("__v_")) continue;
      if (value === undefined) continue;
      if (value === null) {
        clean[key] = null;
        continue;
      }
      if (typeof value !== "object") {
        clean[key] = value;
        continue;
      }
      if (value instanceof Date) {
        clean[key] = value.toISOString();
        continue;
      }
      if (Array.isArray(value)) {
        clean[key] = value.map((x) => ensureSerializable(x));
        continue;
      }
      try {
        JSON.stringify(value);
        clean[key] = ensureSerializable(value);
      } catch {
        console.warn(`⚠️ Skipping non-serializable nested object: ${key}`);
      }
    } catch (e) {
      console.warn(`⚠️ Skipping problematic property: ${key}`, e);
    }
  }
  return clean;
};

// ------- hard timeout (doesn't rely on AbortSignal) ----------
class TimeoutError extends Error {
  constructor(public label: string, public ms: number) {
    super(`Timeout after ${ms}ms: ${label}`);
    this.name = "TimeoutError";
  }
}
const withHardTimeout = async <T>(factory: () => Promise<T>, ms: number, label = "request"): Promise<T> => {
  let id: any;
  const t = new Promise<never>((_, reject) => {
    id = setTimeout(() => reject(new TimeoutError(label, ms)), ms);
  });
  try {
    return (await Promise.race([factory(), t])) as T;
  } finally {
    clearTimeout(id);
  }
};

// ------- serialize syncs (NEW) ----------
let __syncInFlight: Promise<any> | null = null;
const runSyncOnce = <T>(fn: () => Promise<T>): Promise<T> => {
  if (__syncInFlight) return __syncInFlight as Promise<T>;
  __syncInFlight = (async () => {
    try {
      return await fn();
    } finally {
      __syncInFlight = null;
    }
  })();
  return __syncInFlight as Promise<T>;
};

// ------- singleton ----------
let supabaseDataInstance: ReturnType<typeof createSupabaseData> | null = null;
let isInitializing = false;
let authSub: any = null;

const MIN_SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes (no more frequent background sync)
const createSupabaseData = () => {
  const { supabase } = useSupabase();
  const indexedDB = useIndexedDB();

  // state
  const templates = ref<WorkoutTemplate[]>([]);
  const sessions = ref<WorkoutSession[]>([]);
  const isLoading = ref(false);
  const currentUser = ref<any>(null);
  const isAuthenticated = ref(false);
  const isInitialized = ref(false);
  const isOnline = ref(navigator.onLine);
  const lastSyncTime = ref<number | null>(null);
  const nextAllowedSync = ref<number>(0);

  const pendingChangesCount = ref(0);
  const refreshPendingChangesCount = async () => {
    if (!indexedDB.isSupported.value || !currentUser.value) {
      pendingChangesCount.value = 0;
      return;
    }
    try {
      const pending = await indexedDB.getPendingChanges();
      pendingChangesCount.value = pending.length;
    } catch (e) {
      console.error("❌ Error getting pending changes count:", e);
      pendingChangesCount.value = 0;
    }
  };

  // network status
  const updateNetworkStatus = () => {
    const wasOffline = !isOnline.value;
    isOnline.value = navigator.onLine;
    console.log(`🌐 Network status: ${isOnline.value ? "Online" : "Offline"}`);
    if (wasOffline && isOnline.value && currentUser.value && indexedDB.isSupported.value) {
      // only push local pending changes; don't pull fresh data here
      setTimeout(async () => {
        if (isOnline.value && currentUser.value) {
          await syncPendingChanges();
          await refreshPendingChangesCount();
        }
      }, 800);
    }
  };

  // init cache
  const initIndexedDB = async () => {
    try {
      console.log("📱 Initializing IndexedDB for offline caching...");
      await indexedDB.initDB();
      console.log("✅ IndexedDB initialized for offline caching");
    } catch (e) {
      console.error("❌ Failed to initialize IndexedDB:", e);
      // app still works, but treat as no offline
      isOnline.value = navigator.onLine;
    }
  };

  // ---- UI refresh (cache-first, no network) ----
  const refreshOnResume = async () => {
    try {
      if (indexedDB.isSupported.value && currentUser.value) {
        const cached = await indexedDB.getUserData(currentUser.value.id);
        if (cached) {
          templates.value = cached.templates || [];
          sessions.value = (cached.sessions || []).map((s: any) => ({ ...s, date: new Date(s.date) }));
          lastSyncTime.value = cached.lastSync ?? null;
        }
      }
    } finally {
      refreshPendingChangesCount();
    }
  };

  // ---- loadData: cache first, sync only if explicitly forced OR throttled allows it ----
  const loadData = async (retryCount = 0, forceRefresh = false, showLoading = false) => {
    void retryCount; // unused now
    if (!currentUser.value) return;
    if (isLoading.value) return;

    const shouldShowLoading = showLoading && !!forceRefresh; // spinner only on explicit force
    if (shouldShowLoading) isLoading.value = true;

    try {
      // always paint from cache first
      let cachedData: any = null;
      if (indexedDB.isSupported.value) {
        try {
          cachedData = await indexedDB.getUserData(currentUser.value.id);
          if (cachedData) {
            const convertDates = (arr: any[]) =>
              arr.map((item) => {
                if (item && typeof item === "object") {
                  if (item.date && typeof item.date === "string") item.date = new Date(item.date);
                  if (item.created_at && typeof item.created_at === "string") item.created_at = new Date(item.created_at);
                  if (item.updated_at && typeof item.updated_at === "string") item.updated_at = new Date(item.updated_at);
                }
                return item;
              });
            templates.value = cachedData.templates || [];
            sessions.value = convertDates(cachedData.sessions || []);
            lastSyncTime.value = cachedData.lastSync ?? null;
          }
        } catch (e) {
          console.warn("⚠️ Cache load failed:", e);
        }
      }

      // decide to sync: only on explicit force OR throttle window passed AND no pending local changes
      let hasPendingChanges = false;
      if (indexedDB.isSupported.value) {
        const pending = await indexedDB.getPendingChanges();
        hasPendingChanges = pending.length > 0;
        pendingChangesCount.value = pending.length;
      }

      const now = Date.now();
      const allowed = now >= nextAllowedSync.value;
      const shouldSync = isOnline.value && !hasPendingChanges && (forceRefresh || allowed);

      if (!shouldSync) {
        if (!forceRefresh) console.log("🛑 Skipping network sync (throttled or pending changes).");
        return;
      }

      // perform sync (serialized)
      try {
        console.log("🌐 Syncing with Supabase...");
        await runSyncOnce(() => syncWithSupabase());
        console.log("✅ Supabase synced successfully");
        nextAllowedSync.value = Date.now() + MIN_SYNC_INTERVAL_MS;
      } catch (err) {
        console.error("❌ Supabase sync failed:", err);
        if (cachedData) {
          console.log("📱 Using cached data due to sync failure");
          templates.value = cachedData.templates || [];
          sessions.value = (cachedData.sessions || []).map((s: any) => ({ ...s, date: new Date(s.date) }));
        }
      }
    } finally {
      if (shouldShowLoading) isLoading.value = false;
      await refreshPendingChangesCount();
    }
  };

  // ---- Supabase sync (two queries, hard timeouts, no auth pre-flight) ----
  const syncWithSupabase = async () => {
    if (!currentUser.value || !isOnline.value) return;

    const seq = ++__syncSeq;
    tick(seq, "begin syncWithSupabase");
    try {
      console.log("🌐 Syncing with Supabase...");
      tick(seq, "templates:query:start");

      const { data: templatesData, error: templatesError } = await withHardTimeout(async () => await supabase.from("workout_templates").select("*").eq("user_id", currentUser.value.id).order("created_at", { ascending: true }), 8000, "load templates");

      tick(seq, "templates:query:end");
      if (templatesError) throw templatesError;

      const formattedTemplates: WorkoutTemplate[] = (templatesData || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        workoutType: t.workout_type,
        exercises: t.exercises,
      }));

      tick(seq, "sessions:query:start");

      const { data: sessionsData, error: sessionsError } = await withHardTimeout(async () => await supabase.from("workout_sessions").select("*").eq("user_id", currentUser.value.id).order("date", { ascending: false }), 8000, "load sessions");

      tick(seq, "sessions:query:end");
      if (sessionsError) throw sessionsError;

      const formattedSessions: WorkoutSession[] = (sessionsData || []).map((s: any) => {
        const exercises =
          s.exercises?.map((ex: any) => ({
            ...ex,
            sets:
              ex.sets?.map((set: any) => ({
                ...set,
                weight: typeof set.weight === "string" ? parseFloat(set.weight) || 0 : set.weight || 0,
                reps: typeof set.reps === "string" ? parseInt(set.reps) || 0 : set.reps || 0,
              })) || [],
          })) || [];

        const total = exercises.reduce((acc: number, ex: any) => {
          const vol = ex.sets.reduce((sum: number, set: any) => (set.isCompleted && set.weight && set.reps ? sum + set.weight * set.reps : sum), 0);
          return acc + vol;
        }, 0);

        return {
          id: s.id,
          templateId: s.template_id,
          templateName: s.template_name,
          workoutType: s.workout_type,
          date: new Date(s.date),
          duration: s.duration || 0,
          exercises,
          totalVolume: Math.round(total),
          isCompleted: s.is_completed || false,
        };
      });

      // state + cache
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

  // ---- auth/init ----
  const initializeAuth = async (): Promise<void> => {
    if (isInitialized.value || isInitializing) return;
    isInitializing = true;
    isInitialized.value = true;

    try {
      await initIndexedDB();
      await new Promise((r) => setTimeout(r, 100));

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError) console.error("Error getting initial session:", sessionError);

      if (session?.user) {
        currentUser.value = session.user;
        isAuthenticated.value = true;

        // Startup: paint from cache and (throttled) sync once
        try {
          await loadData(false as any, true);
        } catch (e) {
          // forceRefresh=true for first run only
          console.error("Error loading initial data:", e);
        }
      }

      authSub = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
        if (event === "SIGNED_IN" && session?.user) {
          currentUser.value = session.user;
          isAuthenticated.value = true;
          await loadData(0, true);
          await refreshPendingChangesCount();
        } else if (event === "SIGNED_OUT") {
          currentUser.value = null;
          isAuthenticated.value = false;
          templates.value = [];
          sessions.value = [];
          pendingChangesCount.value = 0;
          if (indexedDB.isSupported.value) {
            try {
              await indexedDB.clearUserData(session?.user?.id || "");
            } catch (e) {
              console.warn("⚠️ Failed to clear cached data:", e);
            }
          }
        } else if (event === "TOKEN_REFRESHED" && session?.user) {
          currentUser.value = session.user;
          isAuthenticated.value = true;
          if (indexedDB.isSupported.value) {
            try {
              const cached = await indexedDB.getUserData(session.user.id);
              if (cached) {
                const serializableUser = createSerializableUser(session.user);
                if (serializableUser) {
                  await indexedDB.storeUserData(session.user.id, { ...cached, user: serializableUser });
                }
              }
            } catch (e) {
              console.warn("⚠️ Failed to update cached user data:", e);
            }
          }
          await refreshPendingChangesCount();
        }
      });

      // Visibility/focus: **no network** — just repaint from cache
      if (typeof document !== "undefined") {
        const handleVisibilityChange = () => {
          if (document.visibilityState === "visible") {
            refreshOnResume().catch((e) => console.warn("resume cache refresh failed:", e));
          }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        if (typeof window !== "undefined") (window as any).__visibilityChangeHandler = handleVisibilityChange;
      }
      window.addEventListener("online", async () => {
        updateNetworkStatus();
        await refreshPendingChangesCount();
      });
      window.addEventListener("offline", async () => {
        updateNetworkStatus();
        await refreshPendingChangesCount();
      });

      window.addEventListener("focus", () => {
        // just cache repaint; no sync
        refreshOnResume().catch(() => {});
      });

      if (indexedDB.isSupported.value) {
        setInterval(() => {
          try {
            indexedDB.cleanupExpiredCache();
          } catch (e) {
            console.warn("⚠️ Cache cleanup failed:", e);
          }
        }, 10 * 60 * 1000);
      }
    } catch (e) {
      console.error("❌ Error initializing auth:", e);
      isInitialized.value = false;
    } finally {
      isInitializing = false;
      await refreshPendingChangesCount();
    }
  };

  // ---- sign out / reset / cleanup ----
  const signOut = async () => {
    try {
      const result = await supabase.auth.signOut();
      if (result.error) console.error("Error signing out:", result.error);
      currentUser.value = null;
      isAuthenticated.value = false;
      templates.value = [];
      sessions.value = [];
      isLoading.value = false;
      pendingChangesCount.value = 0;
    } catch (e) {
      console.error("Unexpected error during sign out:", e);
      currentUser.value = null;
      isAuthenticated.value = false;
      templates.value = [];
      sessions.value = [];
      isLoading.value = false;
      pendingChangesCount.value = 0;
    }
  };

  const resetState = () => {
    isLoading.value = false;
    isInitialized.value = false;
    currentUser.value = null;
    isAuthenticated.value = false;
    templates.value = [];
    sessions.value = [];
    pendingChangesCount.value = 0;
  };

  const cleanup = () => {
    if (typeof document !== "undefined" && typeof window !== "undefined") {
      const handler = (window as any).__visibilityChangeHandler;
      if (handler) document.removeEventListener("visibilitychange", handler);
      window.removeEventListener("online", updateNetworkStatus as any);
      window.removeEventListener("offline", updateNetworkStatus as any);
      try {
        authSub?.data?.subscription?.unsubscribe?.();
      } catch (e) {
        console.warn("⚠️ Failed to unsubscribe auth listener:", e);
      }
      authSub = null;
    }
  };

  // ---- offline-first save & pending sync ----
  const saveWithOfflineSupport = async (operation: string, data: any) => {
    try {
      if (currentUser.value) {
        if (operation === "template") {
          const i = templates.value.findIndex((t) => t.id === data.id);
          if (i >= 0) templates.value[i] = data;
          else templates.value.push(data);
        } else if (operation === "session") {
          const i = sessions.value.findIndex((s) => s.id === data.id);
          if (i >= 0) sessions.value[i] = data;
          else sessions.value.push(data);
        }

        if (indexedDB.isSupported.value) {
          try {
            const serializableUser = createSerializableUser(currentUser.value);
            if (!serializableUser) return;
            const rawTemplates = Array.isArray(templates.value) ? [...templates.value] : [];
            const rawSessions = Array.isArray(sessions.value) ? [...sessions.value] : [];
            await indexedDB.storeUserData(currentUser.value.id, {
              templates: ensureSerializable(rawTemplates),
              sessions: ensureSerializable(rawSessions),
              lastSync: Date.now(),
              user: serializableUser,
            });
          } catch (e) {
            console.warn("⚠️ Failed to cache data locally:", e);
          }
        }
      }

      if (isOnline.value) {
        const res = await performSupabaseOperation(operation, data);
        await refreshPendingChangesCount();
        return res;
      } else {
        if (indexedDB.isSupported.value) {
          try {
            const serializableData = ensureSerializable(data);
            if (!serializableData) {
              await refreshPendingChangesCount();
              return { success: true, offline: true, cacheFailed: true };
            }
            await indexedDB.storePendingChange(operation, serializableData);
            await refreshPendingChangesCount();
            return { success: true, offline: true };
          } catch (e) {
            await refreshPendingChangesCount();
            return { success: true, offline: true, cacheFailed: true };
          }
        } else {
          await refreshPendingChangesCount();
          return { success: true, offline: true, cacheFailed: true };
        }
      }
    } catch (e) {
      console.error(`❌ Error in offline-first save (${operation}):`, e);
      throw e;
    }
  };

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
        // Narrow the ID (it should exist for rows read from IDB, but TS needs proof)
        const hasId = typeof (change as any).id === "number";
        try {
          await performSupabaseOperation(change.type, change.data);

          if (hasId) {
            await indexedDB.removePendingChange((change as any).id as number);
            console.log(`✅ Synced pending change: ${change.type}`);
          } else {
            console.warn("⚠️ Pending change had no ID; cannot remove. Skipping cleanup.", change);
          }
        } catch (error) {
          console.error(`❌ Failed to sync pending change: ${change.type}`, error);

          // Increment retry count (in-memory copy only; removal logic below still works)
          change.retryCount = (change.retryCount || 0) + 1;
          if (change.retryCount > 3) {
            if (hasId) {
              try {
                await indexedDB.removePendingChange((change as any).id as number);
                console.log(`🗑️ Removed failed pending change after 3 attempts: ${change.type}`);
              } catch (removeError) {
                console.warn("⚠️ Failed to remove failed pending change:", removeError);
              }
            } else {
              console.warn("⚠️ Failed pending change has no ID; cannot remove. It may reappear.");
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

  // ---- public mutation helpers ----
  const updateTemplateOffline = async (id: string, updates: Partial<WorkoutTemplate>) => {
    const updated = { ...templates.value.find((t) => t.id === id), ...updates };
    return await saveWithOfflineSupport("template", updated);
  };

  const updateWorkoutSessionOffline = async (id: string, updates: Partial<WorkoutSession>) => {
    const existing = sessions.value.find((s) => s.id === id);
    if (!existing) throw new Error(`Session with id ${id} not found`);
    const clean = {
      id: existing.id,
      templateId: existing.templateId,
      templateName: existing.templateName,
      workoutType: existing.workoutType,
      date: existing.date,
      isCompleted: existing.isCompleted,
      duration: existing.duration,
      totalVolume: existing.totalVolume,
      exercises: existing.exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        name: ex.name,
        sets: ex.sets.map((set) => ({
          id: set.id,
          reps: Number(set.reps) || 0,
          weight: Number(set.weight) || 0,
          duration: set.duration,
          distance: set.distance,
          isCompleted: Boolean(set.isCompleted),
        })),
      })),
    };
    const updated = { ...clean, ...updates };
    return await saveWithOfflineSupport("session", updated);
  };

  // ---- computed ----
  const completedSessions = computed(() => sessions.value.filter((s) => s.isCompleted));
  const totalVolume = computed(() => completedSessions.value.reduce((t, s) => t + (s.totalVolume || 0), 0));
  const averageWorkoutDuration = computed(() => {
    if (completedSessions.value.length === 0) return 0;
    const total = completedSessions.value.reduce((t, s) => t + s.duration, 0);
    return Math.round(total / completedSessions.value.length);
  });
  const recentSessions = computed(() =>
    completedSessions.value
      .slice()
      .sort((a, b) => +new Date(b.date) - +new Date(a.date))
      .slice(0, 3)
  );
  const workoutStats = computed(() => {
    const totalWorkouts = completedSessions.value.length;
    const totalVolumeSum = totalVolume.value;
    const avgDuration = averageWorkoutDuration.value;

    const counts: Record<string, number> = {};
    completedSessions.value.forEach((s) => s.exercises.forEach((e) => (counts[e.name] = (counts[e.name] || 0) + 1)));
    const mostUsedExercises = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const weeklyProgress: Array<{ week: string; volume: number }> = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const volume = completedSessions.value
        .filter((s) => {
          const d = new Date(s.date);
          return d >= weekStart && d <= weekEnd;
        })
        .reduce((tot, s) => tot + (s.totalVolume || 0), 0);
      weeklyProgress.push({ week: weekStart.toLocaleDateString("no-NO", { month: "short", day: "numeric" }), volume });
    }

    return { totalWorkouts, totalVolume: totalVolumeSum, averageWorkoutDuration: avgDuration, mostUsedExercises, weeklyProgress };
  });

  const getSessionById = computed(() => (id: string) => sessions.value.find((s) => s.id === id));
  const getTemplatesByType = computed(() => (workoutType: string) => templates.value.filter((t) => t.workoutType === workoutType));

  // ---- CRUD with Supabase (unchanged logic) ----
  const { showError } = useErrorHandler();

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

      // Refresh UI data immediately after adding a template
      await loadData(0, true, false);
    } catch (e) {
      console.error("Error in addTemplate:", e);
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

    const idx = templates.value.findIndex((t) => t.id === id);
    if (idx !== -1) templates.value[idx] = { ...templates.value[idx], ...updates };

    // Refresh UI data immediately after updating a template
    await loadData(0, true, false);

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
    await loadData(0, true, false);
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
      const { error: updateError } = await supabase.from("workout_sessions").update({ is_completed: true }).eq("user_id", currentUser.value.id).eq("is_completed", false);

      if (updateError) {
        console.error("Error marking sessions as completed:", updateError);
        return null;
      }

      sessions.value.forEach((s) => {
        if (!s.isCompleted) s.isCompleted = true;
      });

      const session: WorkoutSession = {
        id: `session-${Date.now()}`,
        templateId: template.id,
        templateName: template.name,
        workoutType: template.workoutType,
        date: new Date(),
        duration: 0,
        exercises: template.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          name: ex.name,
          sets: [
            { id: `set-${Date.now()}-1`, reps: 0, weight: 0, duration: undefined, distance: undefined, isCompleted: false },
            { id: `set-${Date.now()}-2`, reps: 0, weight: 0, duration: undefined, distance: undefined, isCompleted: false },
            { id: `set-${Date.now()}-3`, reps: 0, weight: 0, duration: undefined, distance: undefined, isCompleted: false },
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

      session.id = data.id;
      sessions.value.unshift(session);

      if (indexedDB.isSupported.value && currentUser.value) {
        try {
          const serializableUser = createSerializableUser(currentUser.value);
          if (serializableUser) {
            await indexedDB.storeUserData(currentUser.value.id, {
              templates: ensureSerializable([...templates.value]),
              sessions: ensureSerializable([...sessions.value]),
              lastSync: Date.now(),
              user: serializableUser,
            });
          }
        } catch (e) {
          console.warn("⚠️ Failed to update cache after starting session:", e);
        }
      }

      await refreshPendingChangesCount();
      return session;
    } catch (e) {
      console.error("Error in startWorkoutSession:", e);
      showError("Kunne ikke starte treningsøkt. Prøv igjen.");
      return null;
    }
  };

  const updateWorkoutSession = async (sessionId: string, updates: Partial<WorkoutSession>) => {
    logSupabaseAccess("Update session", sessionId);
    if (updates.exercises) {
      updates.exercises.forEach((ex: any) => {
        ex.sets.forEach((set: any) => {
          if (typeof set.weight === "string") set.weight = parseFloat(set.weight) || 0;
          if (typeof set.reps === "string") set.reps = parseInt(set.reps) || 0;
          set.weight = Number(set.weight) || 0;
          set.reps = Number(set.reps) || 0;
        });
      });
    }

    try {
      const updateData: any = {
        template_name: updates.templateName,
        workout_type: updates.workoutType,
        exercises: updates.exercises,
        is_completed: updates.isCompleted,
        updated_at: new Date().toISOString(),
      };
      if (updates.duration !== undefined) updateData.duration = Math.round(Number(updates.duration) || 0);
      if (updates.totalVolume !== undefined) updateData.total_volume = Math.round(Number(updates.totalVolume) || 0);

      const { error } = await supabase.from("workout_sessions").update(updateData).eq("id", sessionId);
      if (error) {
        console.error("❌ Error updating session in database:", error);
        throw error;
      }

      const idx = sessions.value.findIndex((s) => s.id === sessionId);
      if (idx !== -1) {
        if (updates.exercises) sessions.value[idx].exercises = updates.exercises;
        Object.assign(sessions.value[idx], updates);
      } else {
        console.warn("⚠️ Session not found in local state for update");
      }
    } catch (e) {
      console.error("❌ Error in updateWorkoutSession:", e);
      throw e;
    } finally {
      await refreshPendingChangesCount();
    }
  };

  const completeWorkoutSession = async (sessionId: string) => {
    logSupabaseAccess("Complete session", sessionId);
    try {
      const session = sessions.value.find((s) => s.id === sessionId);
      if (!session) throw new Error("Session not found");

      const totalVolume = Math.round(
        session.exercises.reduce((exTotal, ex) => {
          const vol = ex.sets.reduce((setTot, set) => {
            if (set.isCompleted && set.weight) {
              const weight = Number(set.weight) || 0;
              const reps = Number(set.reps) || 0;
              return setTot + weight * reps;
            }
            return setTot;
          }, 0);
          return exTotal + vol;
        }, 0)
      );

      const duration = Math.round((Date.now() - new Date(session.date).getTime()) / 60000);

      const idx = sessions.value.findIndex((s) => s.id === sessionId);
      if (idx !== -1) {
        sessions.value[idx] = { ...sessions.value[idx], isCompleted: true, totalVolume, duration };
      }

      await updateWorkoutSession(sessionId, { isCompleted: true, totalVolume, duration });

      if (indexedDB.isSupported.value && currentUser.value) {
        try {
          const serializableUser = createSerializableUser(currentUser.value);
          if (serializableUser) {
            await indexedDB.storeUserData(currentUser.value.id, {
              templates: ensureSerializable([...templates.value]),
              sessions: ensureSerializable([...sessions.value]),
              lastSync: Date.now(),
              user: serializableUser,
            });
          }
        } catch (e) {
          console.warn("⚠️ Failed to update cache after completion:", e);
        }
      }
      console.log("✅ Session completed and cache updated successfully");
    } catch (e) {
      console.error("❌ Error in completeWorkoutSession:", e);
      throw e;
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
      const { error: updateError } = await supabase.from("workout_sessions").update({ is_completed: true }).eq("user_id", currentUser.value.id).neq("id", sessionId).eq("is_completed", false);
      if (updateError) {
        console.error("Error marking other sessions as completed:", updateError);
        return;
      }
      sessions.value.forEach((s) => {
        if (s.id !== sessionId && !s.isCompleted) s.isCompleted = true;
      });
      await updateWorkoutSession(sessionId, { isCompleted: false });
    } catch (e) {
      console.error("Error in markSessionAsActive:", e);
      const { showError } = useErrorHandler();
      showError("Kunne ikke aktivere treningsøkt. Prøv igjen.");
    } finally {
      await refreshPendingChangesCount();
    }
  };

  const deleteWorkoutSession = async (sessionId: string) => {
    logSupabaseAccess("Delete session", sessionId);
    try {
      const { error } = await supabase.from("workout_sessions").delete().eq("id", sessionId);
      if (error) {
        console.error("Error deleting session:", error);
        throw error;
      }
      sessions.value = sessions.value.filter((s) => s.id !== sessionId);

      if (indexedDB.isSupported.value && currentUser.value) {
        try {
          const serializableUser = createSerializableUser(currentUser.value);
          if (serializableUser) {
            await indexedDB.storeUserData(currentUser.value.id, {
              templates: ensureSerializable([...templates.value]),
              sessions: ensureSerializable([...sessions.value]),
              lastSync: Date.now(),
              user: serializableUser,
            });
          }
        } catch (e) {
          console.warn("⚠️ Failed to update cache after deletion:", e);
        }
      }
      console.log("✅ Session deleted successfully");
    } catch (e) {
      console.error("❌ Error deleting session:", e);
      throw e;
    } finally {
      await refreshPendingChangesCount();
    }
  };

  const abandonWorkoutSession = async (sessionId: string) => {
    logSupabaseAccess("Abandon session", sessionId);
    try {
      const { error } = await supabase.from("workout_sessions").delete().eq("id", sessionId);
      if (error) {
        console.error("Error abandoning session:", error);
        throw error;
      }
      sessions.value = sessions.value.filter((s) => s.id !== sessionId);

      if (indexedDB.isSupported.value && currentUser.value) {
        try {
          const serializableUser = createSerializableUser(currentUser.value);
          if (serializableUser) {
            await indexedDB.storeUserData(currentUser.value.id, {
              templates: ensureSerializable([...templates.value]),
              sessions: ensureSerializable([...sessions.value]),
              lastSync: Date.now(),
              user: serializableUser,
            });
          }
        } catch (e) {
          console.warn("⚠️ Failed to update cache after abandonment:", e);
        }
      }
      console.log("✅ Session abandoned and deleted successfully");
    } catch (e) {
      console.error("❌ Error abandoning session:", e);
      throw e;
    } finally {
      await refreshPendingChangesCount();
    }
  };

  // ---- manual syncs ----
  const forceSyncPendingChanges = async () => {
    if (!isOnline.value || !currentUser.value || !indexedDB.isSupported.value) {
      console.log("📱 Cannot force sync pending changes - no user or offline");
      return;
    }
    try {
      console.log("📱 Force syncing pending changes...");
      await syncPendingChanges();
      console.log("✅ Force sync of pending changes completed");
    } catch (e) {
      console.error("❌ Force sync of pending changes failed:", e);
      throw e;
    } finally {
      await refreshPendingChangesCount();
    }
  };

  const forceSyncData = async () => {
    if (!currentUser.value || !isOnline.value) {
      console.log("📱 Cannot force sync - no user or offline");
      return;
    }
    try {
      console.log("📱 Force syncing data with Supabase...");
      await runSyncOnce(() => syncWithSupabase()); // <<< serialize
      nextAllowedSync.value = Date.now() + MIN_SYNC_INTERVAL_MS; // respect throttle post-force
      console.log("✅ Force sync completed successfully");
    } catch (e) {
      console.error("❌ Force sync failed:", e);
      throw e;
    } finally {
      await refreshPendingChangesCount();
    }
  };

  return {
    // state
    templates,
    sessions,
    isLoading,
    currentUser,
    isAuthenticated,
    isInitialized,
    isOnline,
    lastSyncTime,

    // computed
    completedSessions,
    totalVolume,
    averageWorkoutDuration,
    recentSessions,
    workoutStats,
    getSessionById,
    getTemplatesByType,

    pendingChangesCount,

    // actions
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
    refreshOnResume,

    // offline-first helpers
    updateTemplateOffline,
    updateWorkoutSessionOffline,
    syncPendingChanges,
    forceSyncData,
    forceSyncPendingChanges,

    refreshPendingChangesCount,
  };
};

export function useSupabaseData() {
  if (!supabaseDataInstance) {
    supabaseDataInstance = createSupabaseData();
  }
  return supabaseDataInstance;
}
