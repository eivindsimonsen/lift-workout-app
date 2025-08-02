import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabase: any

// Check if we're in production and provide helpful error messages
if (!supabaseUrl || !supabaseAnonKey) {
  const isProduction = import.meta.env.PROD
  
  if (isProduction) {
    console.error('❌ Supabase environment variables are missing in production!')
    console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your production environment.')
    console.error('If you are using Netlify, add these as environment variables in your site settings.')
    console.error('If you are using Vercel, add these in your project settings.')
    
    // In production, we'll create a mock client that shows user-friendly errors
    const mockClient = {
      auth: {
        signUp: async () => ({ error: { message: 'Supabase er ikke konfigurert. Vennligst kontakt administrator.' } }),
        signInWithPassword: async () => ({ error: { message: 'Supabase er ikke konfigurert. Vennligst kontakt administrator.' } }),
        signOut: async () => ({ error: { message: 'Supabase er ikke konfigurert. Vennligst kontakt administrator.' } }),
        updateUser: async () => ({ error: { message: 'Supabase er ikke konfigurert. Vennligst kontakt administrator.' } }),
        resetPasswordForEmail: async () => ({ error: { message: 'Supabase er ikke konfigurert. Vennligst kontakt administrator.' } }),
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        setSession: async () => ({ error: { message: 'Supabase er ikke konfigurert. Vennligst kontakt administrator.' } })
      },
      from: () => ({
        insert: async () => ({ error: { message: 'Supabase er ikke konfigurert. Vennligst kontakt administrator.' } }),
        select: async () => ({ data: [], error: { message: 'Supabase er ikke konfigurert. Vennligst kontakt administrator.' } }),
        update: async () => ({ error: { message: 'Supabase er ikke konfigurert. Vennligst kontakt administrator.' } }),
        delete: async () => ({ error: { message: 'Supabase er ikke konfigurert. Vennligst kontakt administrator.' } })
      })
    }
    
    supabase = mockClient
  } else {
    // In development, provide more specific guidance
    console.error('❌ Supabase environment variables are missing!')
    console.error('Please create a .env.local file in your project root with:')
    console.error('VITE_SUPABASE_URL=your_supabase_project_url')
    console.error('VITE_SUPABASE_ANON_KEY=your_supabase_anon_key')
    
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Please create a .env.local file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
    )
  }
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Enable persistent sessions
      persistSession: true,
      // Set longer session duration (30 days)
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  })
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