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

const fetchWithTimeout: typeof fetch = (input, init = {}) => {
  const controller = new AbortController();
  const userSignal = (init as RequestInit).signal as AbortSignal | undefined;

  // If caller provided a signal, link it so either one can abort the request.
  if (userSignal) {
    if (userSignal.aborted) {
      controller.abort(userSignal.reason);
    } else {
      userSignal.addEventListener("abort", () => controller.abort(userSignal.reason), { once: true });
    }
  }

  const timeoutId = setTimeout(() => controller.abort(`Timeout ${TIMEOUT_MS}ms (global fetch)`), TIMEOUT_MS);

  const mergedInit: RequestInit = { ...init, signal: controller.signal };

  return fetch(input as any, mergedInit).finally(() => clearTimeout(timeoutId));
};

// Singleton instance
let supabaseInstance: any = null;

// Mock client for development/testing
const createMockClient = () => ({
  auth: {
    signUp: async () => ({
      error: { message: "Database er ikke tilgjengelig. Vennligst prøv igjen senere." },
    }),
    signInWithPassword: async () => ({
      error: { message: "Database er ikke tilgjengelig. Vennligst prøv igjen senere." },
    }),
    signOut: async () => ({
      data: { user: null, session: null },
      error: null,
    }),
    updateUser: async () => ({
      error: { message: "Database er ikke tilgjengelig. Vennligst prøv igjen senere." },
    }),
    resetPasswordForEmail: async () => ({
      error: { message: "Database er ikke tilgjengelig. Vennligst prøv igjen senere." },
    }),
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
    setSession: async () => ({
      error: { message: "Database er ikke tilgjengelig. Vennligst prøv igjen senere." },
    }),
    refreshSession: async () => ({
      data: { session: null },
      error: { message: "Database er ikke tilgjengelig. Vennligst prøv igjen senere." },
    }),
  },
  from: () => ({
    insert: async () => ({
      error: { message: "Database er ikke tilgjengelig. Vennligst prøv igjen senere." },
    }),
    select: async () => ({
      data: [],
      error: { message: "Database er ikke tilgjengelig. Vennligst prøv igjen senere." },
    }),
    update: async () => ({
      error: { message: "Database er ikke tilgjengelig. Vennligst prøv igjen senere." },
    }),
    delete: async () => ({
      error: { message: "Database er ikke tilgjengelig. Vennligst prøv igjen senere." },
    }),
  }),
});

export const useSupabase = () => {
  const isInitialized = ref(false);
  const error = ref<string | null>(null);

  if (!supabaseInstance) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseAnonKey) {
      // Initialize Supabase client with global fetch timeout + auth settings
      const options: SupabaseClientOptions<"public"> = {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // If you handle OAuth/magic-link callbacks on another route, keep this false.
          // Set to true only if you expect tokens in the URL on this page.
          detectSessionInUrl: false,
          flowType: "pkce",
          storageKey: "lift-auth",
        },
        global: {
          fetch: fetchWithTimeout,
        },
      };

      supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, options);
      isInitialized.value = true;
      console.log("✅ Supabase client initialized successfully (global timeout enabled)");
    } else {
      // Use mock client for missing configuration
      console.warn("⚠️ Missing Supabase environment variables. Using mock client.");
      console.warn("Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env.local file");

      supabaseInstance = createMockClient();
      error.value = "Supabase ikke konfigurert";
      console.error("❌ Supabase not configured - using mock client");
    }
  }

  // Add method to check if we're using mock client
  const isMockClient = computed(() => {
    return !supabaseInstance || error.value === "Supabase ikke konfigurert";
  });

  // Add method to get authentication status
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
