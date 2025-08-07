import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabase: any

// Initialize Supabase client
if (supabaseUrl && supabaseAnonKey) {
  
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      // Add rate limiting to prevent duplicate requests
      storageKey: 'treningsloggen-auth'
    }
  })
} else {
  console.warn('⚠️ Missing Supabase environment variables. Using mock client.')
  console.warn('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env.local file')
  
  // Create a mock client for missing configuration
  const mockClient = {
    auth: {
      signUp: async () => ({ 
        error: { 
          message: 'Database er ikke tilgjengelig. Vennligst prøv igjen senere.' 
        } 
      }),
      signInWithPassword: async () => ({ 
        error: { 
          message: 'Database er ikke tilgjengelig. Vennligst prøv igjen senere.' 
        } 
      }),
      signOut: async () => ({ 
        data: { user: null, session: null },
        error: null // Return success for logout even in mock mode
      }),
      updateUser: async () => ({ 
        error: { 
          message: 'Database er ikke tilgjengelig. Vennligst prøv igjen senere.' 
        } 
      }),
      resetPasswordForEmail: async () => ({ 
        error: { 
          message: 'Database er ikke tilgjengelig. Vennligst prøv igjen senere.' 
        } 
      }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ 
        data: { 
          subscription: { 
            unsubscribe: () => {} 
          } 
        } 
      }),
      setSession: async () => ({ 
        error: { 
          message: 'Database er ikke tilgjengelig. Vennligst prøv igjen senere.' 
        } 
      })
    },
    from: () => ({
      insert: async () => ({ 
        error: { 
          message: 'Database er ikke tilgjengelig. Vennligst prøv igjen senere.' 
        } 
      }),
      select: async () => ({ 
        data: [], 
        error: { 
          message: 'Database er ikke tilgjengelig. Vennligst prøv igjen senere.' 
        } 
      }),
      update: async () => ({ 
        error: { 
          message: 'Database er ikke tilgjengelig. Vennligst prøv igjen senere.' 
        } 
      }),
      delete: async () => ({ 
        error: { 
          message: 'Database er ikke tilgjengelig. Vennligst prøv igjen senere.' 
        } 
      })
    })
  }
  
  supabase = mockClient
}

export { supabase }

// Database types - Only user data tables
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          supabase_id: string | null
          email: string
          name: string | null
          created_at: string
          last_login: string | null
        }
        Insert: {
          id?: string
          supabase_id?: string | null
          email: string
          name?: string | null
          created_at?: string
          last_login?: string | null
        }
        Update: {
          id?: string
          supabase_id?: string | null
          email?: string
          name?: string | null
          created_at?: string
          last_login?: string | null
        }
      }
      workout_templates: {
        Row: {
          id: string
          user_id: string
          name: string
          workout_type: string
          exercises: any
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          workout_type: string
          exercises: any
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          workout_type?: string
          exercises?: any
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      workout_sessions: {
        Row: {
          id: string
          user_id: string
          template_id: string | null
          template_name: string
          workout_type: string
          date: string
          duration: number
          total_volume: number
          exercises: any
          is_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          template_id?: string | null
          template_name: string
          workout_type: string
          date: string
          duration?: number
          total_volume?: number
          exercises: any
          is_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          template_id?: string | null
          template_name?: string
          workout_type?: string
          date?: string
          duration?: number
          total_volume?: number
          exercises?: any
          is_completed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
} 