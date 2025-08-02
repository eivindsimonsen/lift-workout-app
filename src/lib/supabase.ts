import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Enable persistent sessions
    persistSession: true,
    // Set longer session duration (30 days)
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})

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