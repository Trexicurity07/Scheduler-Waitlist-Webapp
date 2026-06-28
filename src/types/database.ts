export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          business_id: string
          created_at: string
          end_time: string
          google_event_id: string
          id: string
          start_time: string
          status: string
          summary: string | null
          synced_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          end_time: string
          google_event_id: string
          id?: string
          start_time: string
          status: string
          summary?: string | null
          synced_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          end_time?: string
          google_event_id?: string
          id?: string
          start_time?: string
          status?: string
          summary?: string | null
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          batch_interval_minutes: number
          batch_size: number
          business_type: string
          calendar_provider: string
          calendar_status: string
          created_at: string
          dedicated_calendar_id: string
          google_refresh_token_encrypted: string
          id: string
          last_checked_at: string | null
          min_confirm_lead_hours: number
          min_notice_hours: number
          name: string
          owner_user_id: string
          processing_started_at: string | null
          public_slug: string
          timezone: string
          updated_at: string
          whatsapp_number: string
        }
        Insert: {
          batch_interval_minutes?: number
          batch_size?: number
          business_type?: string
          calendar_provider?: string
          calendar_status?: string
          created_at?: string
          dedicated_calendar_id: string
          google_refresh_token_encrypted: string
          id?: string
          last_checked_at?: string | null
          min_confirm_lead_hours?: number
          min_notice_hours?: number
          name: string
          owner_user_id: string
          processing_started_at?: string | null
          public_slug: string
          timezone: string
          updated_at?: string
          whatsapp_number: string
        }
        Update: {
          batch_interval_minutes?: number
          batch_size?: number
          business_type?: string
          calendar_provider?: string
          calendar_status?: string
          created_at?: string
          dedicated_calendar_id?: string
          google_refresh_token_encrypted?: string
          id?: string
          last_checked_at?: string | null
          min_confirm_lead_hours?: number
          min_notice_hours?: number
          name?: string
          owner_user_id?: string
          processing_started_at?: string | null
          public_slug?: string
          timezone?: string
          updated_at?: string
          whatsapp_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "businesses_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: true
            referencedRelation: "owner_profiles"
            referencedColumns: ["auth_user_id"]
          },
        ]
      }
      client_profiles: {
        Row: {
          created_at: string
          email: string
          name: string
          password_hash: string | null
          password_reset_attempts: number
          password_reset_expires_at: string | null
          password_reset_session: string | null
          password_reset_token: string | null
          phone: string
          session_expires_at: string | null
          session_token: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          name: string
          password_hash?: string | null
          password_reset_attempts?: number
          password_reset_expires_at?: string | null
          password_reset_session?: string | null
          password_reset_token?: string | null
          phone: string
          session_expires_at?: string | null
          session_token?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          name?: string
          password_hash?: string | null
          password_reset_attempts?: number
          password_reset_expires_at?: string | null
          password_reset_session?: string | null
          password_reset_token?: string | null
          phone?: string
          session_expires_at?: string | null
          session_token?: string | null
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          business_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "client_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      location_nodes: {
        Row: {
          address: string | null
          business_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          parent_id: string | null
          sort_order: number
          type: string
        }
        Insert: {
          address?: string | null
          business_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          sort_order?: number
          type: string
        }
        Update: {
          address?: string | null
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_nodes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "location_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          appointment_id: string | null
          batch_number: number | null
          channel: string
          id: string
          responded_at: string | null
          sent_at: string
          status: string
          token: string | null
          type: string
          waitlist_entry_id: string
        }
        Insert: {
          appointment_id?: string | null
          batch_number?: number | null
          channel?: string
          id?: string
          responded_at?: string | null
          sent_at?: string
          status?: string
          token?: string | null
          type: string
          waitlist_entry_id: string
        }
        Update: {
          appointment_id?: string | null
          batch_number?: number | null
          channel?: string
          id?: string
          responded_at?: string | null
          sent_at?: string
          status?: string
          token?: string | null
          type?: string
          waitlist_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_waitlist_entry_id_fkey"
            columns: ["waitlist_entry_id"]
            isOneToOne: false
            referencedRelation: "waitlist_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_profiles: {
        Row: {
          auth_user_id: string
          business_name: string
          created_at: string
          email: string
          password_hash: string | null
          password_reset_attempts: number
          password_reset_expires_at: string | null
          password_reset_session: string | null
          password_reset_token: string | null
          plan_tier: string
          session_expires_at: string | null
          session_token: string | null
        }
        Insert: {
          auth_user_id: string
          business_name: string
          created_at?: string
          email: string
          password_hash?: string | null
          password_reset_attempts?: number
          password_reset_expires_at?: string | null
          password_reset_session?: string | null
          password_reset_token?: string | null
          plan_tier?: string
          session_expires_at?: string | null
          session_token?: string | null
        }
        Update: {
          auth_user_id?: string
          business_name?: string
          created_at?: string
          email?: string
          password_hash?: string | null
          password_reset_attempts?: number
          password_reset_expires_at?: string | null
          password_reset_session?: string | null
          password_reset_token?: string | null
          plan_tier?: string
          session_expires_at?: string | null
          session_token?: string | null
        }
        Relationships: []
      }
      pending_signups: {
        Row: {
          account_type: string
          business_name: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          name: string | null
          password_hash: string
          payment_session: string | null
          phone: string | null
          plan_tier: string
          verification_code: string
        }
        Insert: {
          account_type: string
          business_name?: string | null
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          name?: string | null
          password_hash: string
          payment_session?: string | null
          phone?: string | null
          plan_tier?: string
          verification_code: string
        }
        Update: {
          account_type?: string
          business_name?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          name?: string | null
          password_hash?: string
          payment_session?: string | null
          phone?: string | null
          plan_tier?: string
          verification_code?: string
        }
        Relationships: []
      }
      waitlist_entries: {
        Row: {
          business_id: string
          client_id: string
          created_at: string
          expires_at: string
          id: string
          status: string
          time_windows: Json
          updated_at: string
          waitlist_id: string | null
        }
        Insert: {
          business_id: string
          client_id: string
          created_at?: string
          expires_at: string
          id?: string
          status?: string
          time_windows: Json
          updated_at?: string
          waitlist_id?: string | null
        }
        Update: {
          business_id?: string
          client_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          status?: string
          time_windows?: Json
          updated_at?: string
          waitlist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_entries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_waitlist_id_fkey"
            columns: ["waitlist_id"]
            isOneToOne: false
            referencedRelation: "waitlists"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlists: {
        Row: {
          batch_interval_minutes: number
          batch_size: number
          business_id: string
          calendar_status: string
          created_at: string
          dedicated_calendar_id: string | null
          description: string | null
          google_refresh_token_encrypted: string | null
          id: string
          min_confirm_lead_hours: number
          min_notice_hours: number
          name: string
          node_id: string
          public_slug: string
          sort_order: number
          timezone: string
          updated_at: string
        }
        Insert: {
          batch_interval_minutes?: number
          batch_size?: number
          business_id: string
          calendar_status?: string
          created_at?: string
          dedicated_calendar_id?: string | null
          description?: string | null
          google_refresh_token_encrypted?: string | null
          id?: string
          min_confirm_lead_hours?: number
          min_notice_hours?: number
          name: string
          node_id: string
          public_slug: string
          sort_order?: number
          timezone?: string
          updated_at?: string
        }
        Update: {
          batch_interval_minutes?: number
          batch_size?: number
          business_id?: string
          calendar_status?: string
          created_at?: string
          dedicated_calendar_id?: string | null
          description?: string | null
          google_refresh_token_encrypted?: string | null
          id?: string
          min_confirm_lead_hours?: number
          min_notice_hours?: number
          name?: string
          node_id?: string
          public_slug?: string
          sort_order?: number
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlists_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlists_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "location_nodes"
            referencedColumns: ["id"]
          },
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

