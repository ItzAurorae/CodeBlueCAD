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
      bolos: {
        Row: {
          community_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          kind: string
          plate: string | null
          status: string
          title: string
        }
        Insert: {
          community_id: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          kind?: string
          plate?: string | null
          status?: string
          title: string
        }
        Update: {
          community_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          kind?: string
          plate?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "bolos_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          assigned_units: string[]
          code: string
          community_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          location: string
          priority: number
          status: string
          title: string
        }
        Insert: {
          assigned_units?: string[]
          code?: string
          community_id: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          location?: string
          priority?: number
          status?: string
          title: string
        }
        Update: {
          assigned_units?: string[]
          code?: string
          community_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          location?: string
          priority?: number
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      citations: {
        Row: {
          civilian_name: string
          community_id: string
          created_at: string
          created_by: string
          fine: number
          id: string
          notes: string | null
          officer_name: string | null
          violation: string
        }
        Insert: {
          civilian_name: string
          community_id: string
          created_at?: string
          created_by?: string
          fine?: number
          id?: string
          notes?: string | null
          officer_name?: string | null
          violation: string
        }
        Update: {
          civilian_name?: string
          community_id?: string
          created_at?: string
          created_by?: string
          fine?: number
          id?: string
          notes?: string | null
          officer_name?: string | null
          violation?: string
        }
        Relationships: [
          {
            foreignKeyName: "citations_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      civilians: {
        Row: {
          address: string | null
          community_id: string
          created_at: string
          created_by: string
          dob: string | null
          first_name: string
          gender: string | null
          id: string
          last_name: string
          license_status: string
          notes: string | null
        }
        Insert: {
          address?: string | null
          community_id: string
          created_at?: string
          created_by?: string
          dob?: string | null
          first_name: string
          gender?: string | null
          id?: string
          last_name: string
          license_status?: string
          notes?: string | null
        }
        Update: {
          address?: string | null
          community_id?: string
          created_at?: string
          created_by?: string
          dob?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          last_name?: string
          license_status?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "civilians_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      community_members: {
        Row: {
          callsign: string
          community_id: string
          created_at: string
          department: string
          id: string
          rank: string
          role: string
          status: string
          user_id: string
        }
        Insert: {
          callsign?: string
          community_id: string
          created_at?: string
          department?: string
          id?: string
          rank?: string
          role?: string
          status?: string
          user_id: string
        }
        Update: {
          callsign?: string
          community_id?: string
          created_at?: string
          department?: string
          id?: string
          rank?: string
          role?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          community_id: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          involved: string | null
          officer_name: string | null
          title: string
        }
        Insert: {
          community_id: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          involved?: string | null
          officer_name?: string | null
          title: string
        }
        Update: {
          community_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          involved?: string | null
          officer_name?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          discord_avatar_url: string | null
          discord_id: string | null
          discord_linked_at: string | null
          discord_username: string | null
          display_name: string
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          discord_avatar_url?: string | null
          discord_id?: string | null
          discord_linked_at?: string | null
          discord_username?: string | null
          display_name?: string
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          discord_avatar_url?: string | null
          discord_id?: string | null
          discord_linked_at?: string | null
          discord_username?: string | null
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          color: string | null
          community_id: string
          created_at: string
          created_by: string
          id: string
          insurance: string
          model: string | null
          owner_name: string | null
          plate: string
          registration: string
          stolen: boolean
        }
        Insert: {
          color?: string | null
          community_id: string
          created_at?: string
          created_by?: string
          id?: string
          insurance?: string
          model?: string | null
          owner_name?: string | null
          plate: string
          registration?: string
          stolen?: boolean
        }
        Update: {
          color?: string | null
          community_id?: string
          created_at?: string
          created_by?: string
          id?: string
          insurance?: string
          model?: string | null
          owner_name?: string | null
          plate?: string
          registration?: string
          stolen?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      warrants: {
        Row: {
          community_id: string
          created_at: string
          created_by: string
          id: string
          reason: string | null
          status: string
          subject_name: string
        }
        Insert: {
          community_id: string
          created_at?: string
          created_by?: string
          id?: string
          reason?: string | null
          status?: string
          subject_name: string
        }
        Update: {
          community_id?: string
          created_at?: string
          created_by?: string
          id?: string
          reason?: string | null
          status?: string
          subject_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "warrants_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      weapons: {
        Row: {
          community_id: string
          created_at: string
          created_by: string
          id: string
          registered_to: string | null
          serial: string
          status: string
          type: string | null
        }
        Insert: {
          community_id: string
          created_at?: string
          created_by?: string
          id?: string
          registered_to?: string | null
          serial: string
          status?: string
          type?: string | null
        }
        Update: {
          community_id?: string
          created_at?: string
          created_by?: string
          id?: string
          registered_to?: string | null
          serial?: string
          status?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weapons_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_member: { Args: { _community_id: string }; Returns: boolean }
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
