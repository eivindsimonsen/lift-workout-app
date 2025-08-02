import { createClient } from '@supabase/supabase-js'

// Environment variable names - defined as constants to avoid string literals in error messages
const ENV_KEYS = {
  URL: 'VITE_SUPABASE_URL',
  ANON_KEY: 'VITE_SUPABASE_ANON_KEY'
} as const

// Safely access environment variables without exposing names in error messages
const getEnvVar = (name: string): string | undefined => {
  try {
    const value = import.meta.env[name] as string
    // Only log in development to avoid exposing values in production
    if (import.meta.env.DEV) {
      console.log(`🔧 Environment variable ${name}: ${value ? 'SET' : 'NOT SET'}`)
    }
    return value
  } catch {
    return undefined
  }
}

// Check if environment variables are available
const hasValidConfig = (): boolean => {
  const url = getEnvVar(ENV_KEYS.URL)
  const key = getEnvVar(ENV_KEYS.ANON_KEY)
  return Boolean(url && key)
}

let supabase: any

// Initialize Supabase client based on environment
if (hasValidConfig()) {
  // Create the actual Supabase client
  if (import.meta.env.DEV) {
    console.log('✅ Database configuration found, creating Supabase client')
  }
  
  const supabaseUrl = getEnvVar(ENV_KEYS.URL)!
  const supabaseAnonKey = getEnvVar(ENV_KEYS.ANON_KEY)!
  
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  })
} else {
  // Configuration is missing
  if (import.meta.env.PROD) {
    // In production, create a mock client that gracefully handles missing config
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
          error: { 
            message: 'Database er ikke tilgjengelig. Vennligst prøv igjen senere.' 
          } 
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
  } else {
    // In development, provide helpful guidance
    console.error('❌ Database configuration is missing!')
    console.error('Please create a .env.local file with the required environment variables.')
    console.error('See SUPABASE_SETUP.md for detailed instructions.')
    
    throw new Error(
      'Missing database configuration. ' +
      'Please create a .env.local file with the required environment variables'
    )
  }
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