export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          goals: string | null
          equipment_limitations: string[] | null
          comfort_levels: string[] | null
        }
        Insert: {
          id: string
          created_at?: string
          goals?: string | null
          equipment_limitations?: string[] | null
          comfort_levels?: string[] | null
        }
        Update: {
          id?: string
          created_at?: string
          goals?: string | null
          equipment_limitations?: string[] | null
          comfort_levels?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      workouts: {
        Row: {
          id: string
          user_id: string
          created_at: string
          name: string
          muscle_groups_targeted: string[]
          notes: string | null
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          name: string
          muscle_groups_targeted: string[]
          notes?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          name?: string
          muscle_groups_targeted?: string[]
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workouts_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      workout_exercises: {
        Row: {
          id: string
          workout_id: string
          exercise_name: string
          order_index: number
          type: "warmup" | "strength" | "cooldown"
          notes: string | null
        }
        Insert: {
          id?: string
          workout_id: string
          exercise_name: string
          order_index: number
          type: "warmup" | "strength" | "cooldown"
          notes?: string | null
        }
        Update: {
          id?: string
          workout_id?: string
          exercise_name?: string
          order_index?: number
          type?: "warmup" | "strength" | "cooldown"
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          }
        ]
      }
      sets: {
        Row: {
          id: string
          workout_exercise_id: string
          set_number: number
          reps: number
          weight_lbs: number
          completed: boolean
        }
        Insert: {
          id?: string
          workout_exercise_id: string
          set_number: number
          reps: number
          weight_lbs: number
          completed?: boolean
        }
        Update: {
          id?: string
          workout_exercise_id?: string
          set_number?: number
          reps?: number
          weight_lbs?: number
          completed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "sets_workout_exercise_id_fkey"
            columns: ["workout_exercise_id"]
            referencedRelation: "workout_exercises"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
