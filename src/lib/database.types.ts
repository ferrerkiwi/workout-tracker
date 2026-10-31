export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      demo_ai_usage: {
        Row: {
          created_at: string
          request_index: number
          usage_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          request_index?: number
          usage_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          request_index?: number
          usage_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      preferences: {
        Row: {
          days_per_week: number | null
          equipment: string[]
          experience_level: string
          focus_muscles: string[]
          goals: string[]
          id: string
          limitations: string | null
          session_length_min: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          days_per_week?: number | null
          equipment?: string[]
          experience_level: string
          focus_muscles?: string[]
          goals: string[]
          id?: string
          limitations?: string | null
          session_length_min?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          days_per_week?: number | null
          equipment?: string[]
          experience_level?: string
          focus_muscles?: string[]
          goals?: string[]
          id?: string
          limitations?: string | null
          session_length_min?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          onboarded_at: string | null
          unit_preference: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          onboarded_at?: string | null
          unit_preference?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          onboarded_at?: string | null
          unit_preference?: string
        }
        Relationships: []
      }
      routine_days: {
        Row: {
          day_of_week: number
          id: string
          is_rest_day: boolean
          name: string
          routine_id: string
        }
        Insert: {
          day_of_week: number
          id?: string
          is_rest_day?: boolean
          name: string
          routine_id: string
        }
        Update: {
          day_of_week?: number
          id?: string
          is_rest_day?: boolean
          name?: string
          routine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_days_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_exercises: {
        Row: {
          exercise_name: string
          id: string
          metric: string
          notes: string | null
          order_index: number
          rest_seconds: number | null
          routine_day_id: string
          target_reps: number
          target_seconds: number | null
          target_sets: number
          target_weight: number | null
        }
        Insert: {
          exercise_name: string
          id?: string
          metric?: string
          notes?: string | null
          order_index?: number
          rest_seconds?: number | null
          routine_day_id: string
          target_reps?: number
          target_seconds?: number | null
          target_sets?: number
          target_weight?: number | null
        }
        Update: {
          exercise_name?: string
          id?: string
          metric?: string
          notes?: string | null
          order_index?: number
          rest_seconds?: number | null
          routine_day_id?: string
          target_reps?: number
          target_seconds?: number | null
          target_sets?: number
          target_weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "routine_exercises_routine_day_id_fkey"
            columns: ["routine_day_id"]
            isOneToOne: false
            referencedRelation: "routine_days"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          created_at: string
          generated_by_model: string | null
          generation_prompt_version: string | null
          id: string
          is_active: boolean
          user_id: string
          week_start_date: string
        }
        Insert: {
          created_at?: string
          generated_by_model?: string | null
          generation_prompt_version?: string | null
          id?: string
          is_active?: boolean
          user_id: string
          week_start_date: string
        }
        Update: {
          created_at?: string
          generated_by_model?: string | null
          generation_prompt_version?: string | null
          id?: string
          is_active?: boolean
          user_id?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "routines_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_sets: {
        Row: {
          completed: boolean
          exercise_name: string
          id: string
          order_index: number
          reps: number | null
          seconds: number | null
          session_id: string
          set_index: number
          weight: number | null
        }
        Insert: {
          completed?: boolean
          exercise_name: string
          id?: string
          order_index?: number
          reps?: number | null
          seconds?: number | null
          session_id: string
          set_index: number
          weight?: number | null
        }
        Update: {
          completed?: boolean
          exercise_name?: string
          id?: string
          order_index?: number
          reps?: number | null
          seconds?: number | null
          session_id?: string
          set_index?: number
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "session_sets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_exercises: {
        Row: {
          exercise_name: string
          id: string
          metric: string
          movement_type: string | null
          next_weight: number | null
          notes: string | null
          order_index: number
          progressed_at: string | null
          rest_seconds: number | null
          routine_exercise_id: string | null
          session_id: string
          target_reps: number
          target_seconds: number | null
          target_sets: number
          target_weight: number | null
          unit: string
        }
        Insert: {
          exercise_name: string
          id?: string
          metric: string
          movement_type?: string | null
          next_weight?: number | null
          notes?: string | null
          order_index: number
          progressed_at?: string | null
          rest_seconds?: number | null
          routine_exercise_id?: string | null
          session_id: string
          target_reps: number
          target_seconds?: number | null
          target_sets: number
          target_weight?: number | null
          unit: string
        }
        Update: {
          exercise_name?: string
          id?: string
          metric?: string
          movement_type?: string | null
          next_weight?: number | null
          notes?: string | null
          order_index?: number
          progressed_at?: string | null
          rest_seconds?: number | null
          routine_exercise_id?: string | null
          session_id?: string
          target_reps?: number
          target_seconds?: number | null
          target_sets?: number
          target_weight?: number | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_routine_exercise_id_fkey"
            columns: ["routine_exercise_id"]
            isOneToOne: false
            referencedRelation: "routine_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          completed_at: string | null
          id: string
          name: string | null
          performed_on: string
          routine_day_id: string | null
          started_at: string
          total_volume: number
          unit: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          name?: string | null
          performed_on?: string
          routine_day_id?: string | null
          started_at?: string
          total_volume?: number
          unit?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          name?: string | null
          performed_on?: string
          routine_day_id?: string | null
          started_at?: string
          total_volume?: number
          unit?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_routine_day_id_fkey"
            columns: ["routine_day_id"]
            isOneToOne: false
            referencedRelation: "routine_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acquire_ai_request: {
        Args: { p_feature: string; p_request_id: string }
        Returns: Json
      }
      complete_workout_set: {
        Args: {
          p_movement_type?: string
          p_reps?: number
          p_seconds?: number
          p_set_index: number
          p_weight?: number
          p_workout_exercise_id: string
        }
        Returns: Json
      }
      consume_demo_coach_request: { Args: never; Returns: number }
      finish_workout: { Args: { p_session_id: string }; Returns: undefined }
      get_completed_workout_dates: {
        Args: { p_from: string }
        Returns: {
          performed_on: string
        }[]
      }
      initialize_demo_mode: { Args: never; Returns: undefined }
      prepare_workout_exercises: {
        Args: { p_session_id: string }
        Returns: Json
      }
      record_ai_response: {
        Args: { p_finished?: boolean; p_lease_id: string; p_response: Json }
        Returns: undefined
      }
      reset_active_plan_to_empty: { Args: never; Returns: string }
      reset_training_data: { Args: never; Returns: undefined }
      save_active_routine: {
        Args: {
          p_days: Json
          p_generated_by_model: string
          p_generation_prompt_version: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
