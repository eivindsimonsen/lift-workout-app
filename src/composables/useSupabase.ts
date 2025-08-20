import { createClient, type SupabaseClientOptions } from "@supabase/supabase-js";
import { ref, computed } from "vue";

// Database types - Only user data tables
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

// -----------------------------
// Global fetch timeout (10s)
// -----------------------------
const TIMEOUT_MS = 10_000;

const fetchWithTimeout: typeof fetch = (input, init: RequestInit = {}) => {
  const controller = new AbortController();
  const userSignal = init.signal as AbortSignal | undefined;

  // Link user-provided AbortSignal so either can abort
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

// Singleton instance
let supabaseInstance: any = null;

// Mock client for development/testing
const createMockClient = () => ({
  __isMock: true as const,
  auth: {
    signUp: async () => ({ data: null, error: new Error("Mock: no auth available") }),
    signInWithPassword: async () => ({ data: null, error: new Error("Mock: no auth available") }),
    signOut: async () => ({ data: { user: null, session: null }, error: null }),
    updateUser: async () => ({ data: null, error: new Error("Mock: no auth available") }),
    resetPasswordForEmail: async () => ({ data: null, error: new Error("Mock: no auth available") }),
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    setSession: async () => ({ data: null, error: new Error("Mock: no auth available") }),
    refreshSession: async () => ({ data: { session: null }, error: new Error("Mock: no auth available") }),
    // Optional helpers on real client; safe no-ops here
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

// Visibility-based auth auto-refresh guards (prevents token refresh churn in background)
const wireAutoRefreshVisibilityGuards = (supabase: any) => {
  const start = () => supabase.auth.startAutoRefresh?.();
  const stop = () => supabase.auth.stopAutoRefresh?.();

  const onVisibleChange = () => {
    if (document.visibilityState === "visible") {
      console.log("🔐 startAutoRefresh (visible)");
      start();
    } else {
      console.log("🔐 stopAutoRefresh (hidden)");
      stop();
    }
  };

  document.addEventListener("visibilitychange", onVisibleChange, { passive: true });
  window.addEventListener("focus", start, { passive: true });
  window.addEventListener("blur", stop, { passive: true });

  // Initialize based on current state
  onVisibleChange();
};

export const useSupabase = () => {
  const isInitialized = ref(false);
  const error = ref<string | null>(null);

  if (!supabaseInstance) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      const options: SupabaseClientOptions<"public"> = {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false, // safer for SPA unless you have an OAuth callback page here
          flowType: "pkce",
          storageKey: "lift-auth",
        },
        global: {
          fetch: fetchWithTimeout,
        },
      };

      supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, options);

      // Attach visibility guards right after client is created
      wireAutoRefreshVisibilityGuards(supabaseInstance);

      isInitialized.value = true;
      console.log("✅ Supabase client initialized successfully (global timeout enabled)");
    } else {
      console.warn("⚠️ Missing Supabase environment variables. Using mock client.");
      console.warn("Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env.local file");

      supabaseInstance = createMockClient();
      error.value = "Supabase ikke konfigurert";
      console.error("❌ Supabase not configured - using mock client");
    }
  }

  // Helper for consumers to know whether to treat errors as fatal or mock-mode noise
  const isMockClient = computed(() => !!supabaseInstance?.__isMock || error.value === "Supabase ikke konfigurert");

  const getAuthStatus = async () => {
    if (isMockClient.value) {
      return { isAuthenticated: false, user: null, error: "Mock client - no real authentication" };
    }
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabaseInstance.auth.getSession();
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
    supabase: supabaseInstance,
    isInitialized,
    error,
    isMockClient,
    getAuthStatus,
  };
};
