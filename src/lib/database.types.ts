export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      connector_jobs: {
        Row: {
          created_at: string
          created_by: string | null
          devin_session_id: string | null
          devin_session_url: string | null
          error: string | null
          id: string
          log: Json
          org_id: string
          pull_request_url: string | null
          source_kind: string
          source_sample: string
          status: Database["public"]["Enums"]["connector_job_status"]
          supplier_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          devin_session_id?: string | null
          devin_session_url?: string | null
          error?: string | null
          id?: string
          log?: Json
          org_id: string
          pull_request_url?: string | null
          source_kind?: string
          source_sample?: string
          status?: Database["public"]["Enums"]["connector_job_status"]
          supplier_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          devin_session_id?: string | null
          devin_session_url?: string | null
          error?: string | null
          id?: string
          log?: Json
          org_id?: string
          pull_request_url?: string | null
          source_kind?: string
          source_sample?: string
          status?: Database["public"]["Enums"]["connector_job_status"]
          supplier_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "connector_jobs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      item_media: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          item_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          item_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          item_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_media_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_private_details: {
        Row: {
          contact_note: string
          exact_pickup_address: string
          item_id: string
          updated_at: string
        }
        Insert: {
          contact_note?: string
          exact_pickup_address?: string
          item_id: string
          updated_at?: string
        }
        Update: {
          contact_note?: string
          exact_pickup_address?: string
          item_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_private_details_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          category: string
          condition: string
          created_at: string
          description: string
          embedding: string | null
          id: string
          location: unknown
          owner_org_id: string
          pickup_deadline: string | null
          public_location: string
          quantity: number
          status: Database["public"]["Enums"]["item_status"]
          title: string
        }
        Insert: {
          category: string
          condition?: string
          created_at?: string
          description?: string
          embedding?: string | null
          id?: string
          location?: unknown
          owner_org_id: string
          pickup_deadline?: string | null
          public_location?: string
          quantity?: number
          status?: Database["public"]["Enums"]["item_status"]
          title: string
        }
        Update: {
          category?: string
          condition?: string
          created_at?: string
          description?: string
          embedding?: string | null
          id?: string
          location?: unknown
          owner_org_id?: string
          pickup_deadline?: string | null
          public_location?: string
          quantity?: number
          status?: Database["public"]["Enums"]["item_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_owner_org_id_fkey"
            columns: ["owner_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          asset_score: number
          created_at: string
          donor_accepted_at: string | null
          donor_org_id: string
          id: string
          item_id: string
          location_score: number
          need_id: string
          quantity_score: number
          recipient_org_id: string
          score_detail: Json
          service_score: number
          startup_accepted_at: string | null
          status: Database["public"]["Enums"]["match_status"]
          total_score: number
          updated_at: string
          urgency_score: number
        }
        Insert: {
          asset_score?: number
          created_at?: string
          donor_accepted_at?: string | null
          donor_org_id: string
          id?: string
          item_id: string
          location_score?: number
          need_id: string
          quantity_score?: number
          recipient_org_id: string
          score_detail?: Json
          service_score?: number
          startup_accepted_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          total_score?: number
          updated_at?: string
          urgency_score?: number
        }
        Update: {
          asset_score?: number
          created_at?: string
          donor_accepted_at?: string | null
          donor_org_id?: string
          id?: string
          item_id?: string
          location_score?: number
          need_id?: string
          quantity_score?: number
          recipient_org_id?: string
          score_detail?: Json
          service_score?: number
          startup_accepted_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          total_score?: number
          updated_at?: string
          urgency_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "matches_donor_org_id_fkey"
            columns: ["donor_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_need_id_fkey"
            columns: ["need_id"]
            isOneToOne: false
            referencedRelation: "needs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_recipient_org_id_fkey"
            columns: ["recipient_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      needs: {
        Row: {
          category: string
          created_at: string
          description: string
          embedding: string | null
          id: string
          location: unknown
          needed_by: string | null
          org_id: string
          public_location: string
          quantity: number
          status: Database["public"]["Enums"]["need_status"]
          title: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string
          embedding?: string | null
          id?: string
          location?: unknown
          needed_by?: string | null
          org_id: string
          public_location?: string
          quantity?: number
          status?: Database["public"]["Enums"]["need_status"]
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          embedding?: string | null
          id?: string
          location?: unknown
          needed_by?: string | null
          org_id?: string
          public_location?: string
          quantity?: number
          status?: Database["public"]["Enums"]["need_status"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "needs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          org_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          location: unknown
          name: string
          org_type: Database["public"]["Enums"]["org_type"]
          public_location: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: unknown
          name: string
          org_type: Database["public"]["Enums"]["org_type"]
          public_location?: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: unknown
          name?: string
          org_type?: Database["public"]["Enums"]["org_type"]
          public_location?: string
        }
        Relationships: []
      }
      service_offers: {
        Row: {
          created_at: string
          description: string
          embedding: string | null
          id: string
          org_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string
          embedding?: string | null
          id?: string
          org_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string
          embedding?: string | null
          id?: string
          org_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_offers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      service_wants: {
        Row: {
          created_at: string
          description: string
          embedding: string | null
          id: string
          org_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string
          embedding?: string | null
          id?: string
          org_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string
          embedding?: string | null
          id?: string
          org_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_wants_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          created_at: string
          delivery_method: string
          id: string
          match_id: string
          scheduled_at: string | null
          status: Database["public"]["Enums"]["transfer_status"]
        }
        Insert: {
          created_at?: string
          delivery_method?: string
          id?: string
          match_id: string
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
        }
        Update: {
          created_at?: string
          delivery_method?: string
          id?: string
          match_id?: string
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["transfer_status"]
        }
        Relationships: [
          {
            foreignKeyName: "transfers_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_match: {
        Args: { p_match_id: string }
        Returns: {
          asset_score: number
          created_at: string
          donor_accepted_at: string | null
          donor_org_id: string
          id: string
          item_id: string
          location_score: number
          need_id: string
          quantity_score: number
          recipient_org_id: string
          score_detail: Json
          service_score: number
          startup_accepted_at: string | null
          status: Database["public"]["Enums"]["match_status"]
          total_score: number
          updated_at: string
          urgency_score: number
        }
        SetofOptions: {
          from: "*"
          to: "matches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      can_read_item_private: { Args: { p_item_id: string }; Returns: boolean }
      create_organization: {
        Args: {
          p_lat?: number
          p_lng?: number
          p_name: string
          p_org_type: Database["public"]["Enums"]["org_type"]
          p_public_location?: string
        }
        Returns: string
      }
      current_org_ids: { Args: never; Returns: string[] }
      is_org_member: { Args: { p_org_id: string }; Returns: boolean }
      match_candidates: {
        Args: { p_org_id: string }
        Returns: {
          asset_similarity: number
          distance_m: number
          donor_org_id: string
          donor_service_wants: string[]
          item_category: string
          item_description: string
          item_id: string
          item_pickup_deadline: string
          item_public_location: string
          item_quantity: number
          item_title: string
          need_category: string
          need_description: string
          need_id: string
          need_needed_by: string
          need_public_location: string
          need_quantity: number
          need_title: string
          recipient_org_id: string
          recipient_service_offers: string[]
          service_similarity: number
        }[]
      }
      reject_match: {
        Args: { p_match_id: string }
        Returns: {
          asset_score: number
          created_at: string
          donor_accepted_at: string | null
          donor_org_id: string
          id: string
          item_id: string
          location_score: number
          need_id: string
          quantity_score: number
          recipient_org_id: string
          score_detail: Json
          service_score: number
          startup_accepted_at: string | null
          status: Database["public"]["Enums"]["match_status"]
          total_score: number
          updated_at: string
          urgency_score: number
        }
        SetofOptions: {
          from: "*"
          to: "matches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_matches: { Args: { p_matches: Json }; Returns: number }
      set_embedding: {
        Args: { p_embedding: string; p_id: string; p_table: string }
        Returns: undefined
      }
      set_item_location: {
        Args: { p_item_id: string; p_lat: number; p_lng: number }
        Returns: undefined
      }
      set_need_location: {
        Args: { p_lat: number; p_lng: number; p_need_id: string }
        Returns: undefined
      }
    }
    Enums: {
      connector_job_status:
        | "queued"
        | "analyzing"
        | "building"
        | "testing"
        | "pr_created"
        | "failed"
      item_status: "available" | "reserved" | "transferred" | "archived"
      match_status: "proposed" | "pending_donor" | "accepted" | "rejected"
      need_status: "open" | "fulfilled" | "closed"
      org_type: "donor" | "startup"
      transfer_status: "scheduled" | "in_progress" | "completed" | "cancelled"
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
  public: {
    Enums: {
      connector_job_status: [
        "queued",
        "analyzing",
        "building",
        "testing",
        "pr_created",
        "failed",
      ],
      item_status: ["available", "reserved", "transferred", "archived"],
      match_status: ["proposed", "pending_donor", "accepted", "rejected"],
      need_status: ["open", "fulfilled", "closed"],
      org_type: ["donor", "startup"],
      transfer_status: ["scheduled", "in_progress", "completed", "cancelled"],
    },
  },
} as const

