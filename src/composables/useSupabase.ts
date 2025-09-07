import { createClient, type SupabaseClientOptions, type SupabaseClient } from "@supabase/supabase-js";
import { ref, computed } from "vue";

/** -----------------------------
 *  DB Types (unchanged)
 *  ----------------------------- */
export interface Database {
  public: {
    Tables: {
      workout_templates: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          workout_type: string;
          exercises: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          workout_type: string;
          exercises: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          workout_type?: string;
          exercises?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      workout_sessions: {
        Row: {
          id: string;
          user_id: string;
          template_id: string | null;
          template_name: string;
          workout_type: string;
          date: string;
          duration: number;
          total_volume: number;
          exercises: any;
          is_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          template_id?: string | null;
          template_name: string;
          workout_type: string;
          date: string;
          duration?: number;
          total_volume?: number;
          exercises: any;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          template_id?: string | null;
          template_name?: string;
          workout_type?: string;
          date?: string;
          duration?: number;
          total_volume?: number;
          exercises?: any;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

/** -----------------------------
 *  Global fetch timeout (10s)
 *  ----------------------------- */
const TIMEOUT_MS = 10_000;

const fetchWithTimeout: typeof fetch = (input, init: RequestInit = {}) => {
  const controller = new AbortController();
  const userSignal = init.signal as AbortSignal | undefined;

  if (userSignal) {
    if (userSignal.aborted) {
      controller.abort(userSignal.reason ?? new Error("Aborted by caller"));
    } else {
      userSignal.addEventListener("abort", () => controller.abort(userSignal.reason ?? new Error("Aborted by caller")), { once: true });
    }
  }

  const timeoutId = setTimeout(() => controller.abort(new Error(`Timeout ${TIMEOUT_MS}ms (global fetch)`)), TIMEOUT_MS);
  const mergedInit: RequestInit = { ...init, signal: controller.signal };
  return fetch(input as any, mergedInit).finally(() => clearTimeout(timeoutId));
};

/** -----------------------------
 *  Remember-me backed storage
 *  ----------------------------- */
export type AuthPersistence = "local" | "session";

/** Read preference saved by the login page. Defaults to 'local'. */
const getPersistPref = (): AuthPersistence => {
  const v = localStorage.getItem("rememberMe");
  return v === "false" ? "session" : "local";
};

const storageFor = (pref: AuthPersistence): Storage => (pref === "local" ? window.localStorage : window.sessionStorage);

/** -----------------------------
 *  Singletons
 *  ----------------------------- */
let supabaseInstance: SupabaseClient<Database> | null = null;
let wiredVisibility = false;

/** Mock client (unchanged API) */
const createMockClient = () => ({
  __isMock: true as const,
  auth: {
    signUp: async () => ({ data: null, error: new Error("Mock: no auth available. Ensure you have supabase set up in .env.local") }),
    signInWithPassword: async () => ({ data: null, error: new Error("Mock: no auth available. Ensure you have supabase set up in .env.local") }),
    signOut: async () => ({ data: { user: null, session: null }, error: null }),
    updateUser: async () => ({ data: null, error: new Error("Mock: no auth available. Ensure you have supabase set up in .env.local") }),
    resetPasswordForEmail: async () => ({ data: null, error: new Error("Mock: no auth available. Ensure you have supabase set up in .env.local") }),
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    setSession: async () => ({ data: null, error: new Error("Mock: no auth available. Ensure you have supabase set up in .env.local") }),
    refreshSession: async () => ({ data: { session: null }, error: new Error("Mock: no auth available. Ensure you have supabase set up in .env.local") }),
    startAutoRefresh: () => {},
    stopAutoRefresh: () => {},
  },
  from: () => ({
    insert: async () => ({ data: null, error: new Error("Mock: no DB available") }),
    select: async () => ({ data: [], error: new Error("Mock: no DB available") }),
    update: async () => ({ data: null, error: new Error("Mock: no DB available") }),
    delete: async () => ({ data: null, error: new Error("Mock: no DB available") }),
  }),
});

/** Visibility-based auth auto-refresh guards */
const wireAutoRefreshVisibilityGuards = (supabase: any) => {
  if (wiredVisibility) return; // only wire once per app
  wiredVisibility = true;

  const start = () => supabase.auth.startAutoRefresh?.();
  const stop = () => supabase.auth.stopAutoRefresh?.();

  const onVisibleChange = () => {
    if (document.visibilityState === "visible") {
      start();
    } else {
      stop();
    }
  };

  document.addEventListener("visibilitychange", onVisibleChange, { passive: true });
  window.addEventListener("focus", start, { passive: true });
  window.addEventListener("blur", stop, { passive: true });

  onVisibleChange();
};

/** -----------------------------
 *  Init / Re-init helpers
 *  ----------------------------- */
const createOptions = (persist: AuthPersistence): SupabaseClientOptions<"public"> => ({
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // SPA friendly unless you host an OAuth callback here
    flowType: "pkce",
    storage: storageFor(persist), // <-- key bit
    storageKey: "lift-auth",
  },
  global: { fetch: fetchWithTimeout },
});

/** Create or replace the client using the chosen persistence. */
export const initSupabase = (persist?: AuthPersistence) => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const pref = persist ?? getPersistPref();

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("⚠️ Missing Supabase env. Using mock client.");
    supabaseInstance = createMockClient() as unknown as SupabaseClient<Database>;
    return supabaseInstance;
  }

  supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, createOptions(pref));
  wireAutoRefreshVisibilityGuards(supabaseInstance);

  return supabaseInstance;
};

/**
 * OPTIONAL: switch persistence at runtime without a full reload.
 * - Copies the current session into the new client so the user stays logged in.
 */
export const reinitSupabase = async (persist: AuthPersistence) => {
  const current = supabaseInstance;
  const previousSession = current ? (await current.auth.getSession()).data.session : null;

  // stop background refresh on old client (best-effort)
  current?.auth.stopAutoRefresh?.();

  // replace client
  const next = initSupabase(persist);

  // if we had a session, move it into the new storage
  if (previousSession) {
    await next.auth.setSession({
      access_token: previousSession.access_token,
      refresh_token: previousSession.refresh_token,
    });
  }

  return next;
};

/** -----------------------------
 *  Main composable
 *  ----------------------------- */
export const useSupabase = () => {
  const isInitialized = ref(false);
  const error = ref<string | null>(null);

  if (!supabaseInstance) {
    initSupabase(); // uses saved rememberMe pref or defaults to 'local'
    isInitialized.value = true;

    if ((supabaseInstance as any)?.__isMock) {
      error.value = "Supabase ikke konfigurert";
      console.error("❌ Supabase not configured - using mock client");
    } else {
    }
  }

  const isMockClient = computed(() => !!(supabaseInstance as any)?.__isMock || error.value === "Supabase ikke konfigurert");

  const getAuthStatus = async () => {
    if (isMockClient.value) {
      return { isAuthenticated: false, user: null, error: "Mock client - no real authentication" };
    }
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabaseInstance!.auth.getSession();
      return {
        isAuthenticated: !!session?.user,
        user: session?.user || null,
        error: sessionError?.message || null,
      };
    } catch (e: unknown) {
      return {
        isAuthenticated: false,
        user: null,
        error: e instanceof Error ? e.message : "Unknown error",
      };
    }
  };

  return {
    supabase: supabaseInstance!,
    isInitialized,
    error,
    isMockClient,
    getAuthStatus,
    /** expose reinit for runtime switching (optional) */
    reinitSupabase,
  };
};
