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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          id: string
          property_code: string
          unit_name: string
          unit_id: string | null
          description: string
          resident: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          property_code: string
          unit_name: string
          unit_id?: string | null
          description: string
          resident?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          property_code?: string
          unit_name?: string
          unit_id?: string | null
          description?: string
          resident?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          }
        ]
      }
      unit_flags: {
        Row: {
          id: string
          unit_id: string
          property_code: string
          flag_type: string
          severity: string
          title: string
          message: string | null
          metadata: Json
          created_at: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          id?: string
          unit_id: string
          property_code: string
          flag_type: string
          severity: string
          title: string
          message?: string | null
          metadata?: Json
          created_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          id?: string
          unit_id?: string
          property_code?: string
          flag_type?: string
          severity?: string
          title?: string
          message?: string | null
          metadata?: Json
          created_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unit_flags_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_flags_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      units: {
        Row: {
          id: string
          building_id: string | null
          floor_plan_id: string | null
          unit_name: string
          property_code: string
          description: string | null
          floor_number: number | null
          usage_type: Database["public"]["Enums"]["usage_type"]
          primary_image_url: string | null
          availability_status: Database["public"]["Enums"]["availability_status"]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          building_id?: string | null
          floor_plan_id?: string | null
          unit_name: string
          property_code: string
          description?: string | null
          floor_number?: number | null
          usage_type?: string
          primary_image_url?: string | null
          availability_status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          building_id?: string | null
          floor_plan_id?: string | null
          unit_name?: string
          property_code?: string
          description?: string | null
          floor_number?: number | null
          usage_type?: string
          primary_image_url?: string | null
          availability_status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plans"
            referencedColumns: ["id"]
          }
        ]
      }
      floor_plans: {
        Row: {
          id: string
          property_id: string
          code: string
          marketing_name: string
          yardi_layout_code: string | null
          description: string | null
          area_sqft: number
          bedroom_count: number
          bathroom_count: number
          market_base_rent: number | null
          primary_image_url: string | null
          property_code: string
          created_at: string
          updated_at: string
          stats_cache: Json | null
        }
        Insert: {
          id?: string
          property_id: string
          code: string
          marketing_name: string
          yardi_layout_code?: string | null
          description?: string | null
          area_sqft?: number
          bedroom_count?: number
          bathroom_count?: number
          market_base_rent?: number | null
          primary_image_url?: string | null
          property_code: string
          created_at?: string
          updated_at?: string
          stats_cache?: Json | null
        }
        Update: {
          id?: string
          property_id?: string
          code?: string
          marketing_name?: string
          yardi_layout_code?: string | null
          description?: string | null
          area_sqft?: number
          bedroom_count?: number
          bathroom_count?: number
          market_base_rent?: number | null
          primary_image_url?: string | null
          property_code?: string
          created_at?: string
          updated_at?: string
          stats_cache?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "floor_plans_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          }
        ]
      }
      buildings: {
        Row: {
          id: string
          property_id: string
          name: string
          description: string | null
          street_address: string | null
          property_code: string
          floor_count: number
          primary_image_url: string | null
          created_at: string
          updated_at: string
          stats_cache: Json | null
        }
        Insert: {
          id?: string
          property_id: string
          name: string
          description?: string | null
          street_address?: string | null
          property_code: string
          floor_count?: number
          primary_image_url?: string | null
          created_at?: string
          updated_at?: string
          stats_cache?: Json | null
        }
        Update: {
          id?: string
          property_id?: string
          name?: string
          description?: string | null
          street_address?: string | null
          property_code?: string
          floor_count?: number
          primary_image_url?: string | null
          created_at?: string
          updated_at?: string
          stats_cache?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "buildings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          }
        ]
      }
      properties: {
        Row: {
          id: string
          code: string
          name: string
          description: string | null
          street_address: string | null
          city: string | null
          state_code: string
          postal_code: string | null
          total_unit_count: number | null
          year_built: number | null
          website_url: string | null
          primary_image_url: string | null
          created_at: string
          updated_at: string
          longitude: number | null
          latitude: number | null
        }
        Insert: {
          id?: string
          code: string
          name: string
          description?: string | null
          street_address?: string | null
          city?: string | null
          state_code: string
          postal_code?: string | null
          total_unit_count?: number | null
          year_built?: number | null
          website_url?: string | null
          primary_image_url?: string | null
          created_at?: string
          updated_at?: string
          longitude?: number | null
          latitude?: number | null
        }
        Update: {
          id?: string
          code?: string
          name?: string
          description?: string | null
          street_address?: string | null
          city?: string | null
          state_code?: string
          postal_code?: string | null
          total_unit_count?: number | null
          year_built?: number | null
          website_url?: string | null
          primary_image_url?: string | null
          created_at?: string
          updated_at?: string
          longitude?: number | null
          latitude?: number | null
        }
        Relationships: []
      }
      work_orders: {
        Row: {
          id: string
          property_code: string
          unit_name: string | null
          unit_id: string | null
          yardi_work_order_id: string
          description: string | null
          status: string
          category: string | null
          call_date: string | null
          completion_date: string | null
          is_active: boolean
          resident: string | null
          phone: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          property_code: string
          unit_name?: string | null
          unit_id?: string | null
          yardi_work_order_id: string
          description?: string | null
          status: string
          category?: string | null
          call_date?: string | null
          completion_date?: string | null
          is_active?: boolean
          resident?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          property_code?: string
          unit_name?: string | null
          unit_id?: string | null
          yardi_work_order_id?: string
          description?: string | null
          status?: string
          category?: string | null
          call_date?: string | null
          completion_date?: string | null
          is_active?: boolean
          resident?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string | null
          department: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          is_super_admin: boolean | null
          last_name: string | null
          metadata: Json | null
          notes: string | null
          organization_name: string | null
          person_type: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          is_super_admin?: boolean | null
          last_name?: string | null
          metadata?: Json | null
          notes?: string | null
          organization_name?: string | null
          person_type?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          is_super_admin?: boolean | null
          last_name?: string | null
          metadata?: Json | null
          notes?: string | null
          organization_name?: string | null
          person_type?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      }
      import_staging: {
        Row: {
          id: string
          batch_id: string
          report_type: Database["public"]["Enums"]["import_report_type"]
          property_code: string
          raw_data: Json
          processed_at: string | null
          error_log: string | null
          created_at: string
        }
        Insert: {
          id?: string
          batch_id: string
          report_type: Database["public"]["Enums"]["import_report_type"]
          property_code: string
          raw_data: Json
          processed_at?: string | null
          error_log?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          batch_id?: string
          report_type?: Database["public"]["Enums"]["import_report_type"]
          property_code?: string
          raw_data?: Json
          processed_at?: string | null
          error_log?: string | null
          created_at?: string
        }
        Relationships: []
      }
      tenancies: {
        Row: {
          id: string
          property_code: string
          unit_id: string
          status: Database["public"]["Enums"]["tenancy_status"]
          move_in_date: string | null
          move_out_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          property_code: string
          unit_id: string
          status: Database["public"]["Enums"]["tenancy_status"]
          move_in_date?: string | null
          move_out_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_code?: string
          unit_id?: string
          status?: Database["public"]["Enums"]["tenancy_status"]
          move_in_date?: string | null
          move_out_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenancies_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          }
        ]
      }
      residents: {
        Row: {
          id: string
          property_code: string
          tenancy_id: string
          name: string
          email: string | null
          phone: string | null
          role: Database["public"]["Enums"]["household_role"]
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_code: string
          tenancy_id: string
          name: string
          email?: string | null
          phone?: string | null
          role: Database["public"]["Enums"]["household_role"]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_code?: string
          tenancy_id?: string
          name?: string
          email?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["household_role"]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "residents_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          }
        ]
      }
      leases: {
        Row: {
          id: string
          property_code: string
          tenancy_id: string
          start_date: string
          end_date: string
          rent_amount: number | null
          deposit_amount: number | null
          lease_status: Database["public"]["Enums"]["lease_status"]
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_code: string
          tenancy_id: string
          start_date: string
          end_date: string
          rent_amount?: number | null
          deposit_amount?: number | null
          lease_status: Database["public"]["Enums"]["lease_status"]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_code?: string
          tenancy_id?: string
          start_date?: string
          end_date?: string
          rent_amount?: number | null
          deposit_amount?: number | null
          lease_status?: Database["public"]["Enums"]["lease_status"]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leases_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          }
        ]
      }
      availabilities: {
        Row: {
          unit_id: string
          property_code: string
          status: string | null
          unit_name: string | null
          available_date: string | null
          // days_vacant removed
          move_out_date: string | null
          move_in_date: string | null
          ready_date: string | null
          rent_market: number | null
          rent_offered: number | null
          amenities: Json | null
          leasing_agent: string | null
          future_tenancy_id: string | null
          is_mi_inspection: boolean | null
          screening_result: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          unit_id: string
          property_code: string
          status?: string | null
          unit_name?: string | null
          available_date?: string | null
          move_out_date?: string | null
          move_in_date?: string | null
          ready_date?: string | null
          rent_market?: number | null
          rent_offered?: number | null
          amenities?: Json | null
          leasing_agent?: string | null
          future_tenancy_id?: string | null
          is_mi_inspection?: boolean | null
          screening_result?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          unit_id?: string
          property_code?: string
          status?: string | null
          unit_name?: string | null
          available_date?: string | null
          move_out_date?: string | null
          move_in_date?: string | null
          ready_date?: string | null
          rent_market?: number | null
          rent_offered?: number | null
          amenities?: Json | null
          leasing_agent?: string | null
          future_tenancy_id?: string | null
          is_mi_inspection?: boolean | null
          screening_result?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "availabilities_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: true
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availabilities_future_tenancy_id_fkey"
            columns: ["future_tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          }
        ]
      }
      applications: {
        Row: {
          id: string
          property_code: string
          unit_id: string | null
          applicant_name: string
          agent: string | null
          application_date: string
          status: string
          is_overdue: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          property_code: string
          unit_id?: string | null
          applicant_name: string
          agent?: string | null
          application_date: string
          status: string
          is_overdue?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          property_code?: string
          unit_id?: string | null
          applicant_name?: string
          agent?: string | null
          application_date?: string
          status?: string
          is_overdue?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      view_availabilities_metrics: {
        Row: {
          unit_id: string
          property_code: string
          unit_name: string | null
          status: string | null
          leasing_agent: string | null
          ready_date: string | null
          move_out_date: string | null
          move_in_date: string | null
          amenities: Json | null
          future_status: string | null
          operational_status: string | null
          turnover_days: number | null
          vacant_days: number | null
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      leasing_sync_status: "Success" | "Failed" | "Partial"
      ops_sync_status: "Success" | "Failed" | "Partial"
      occupancy_status: "vacant" | "occupied"
      availability_status: "available" | "leased"
      usage_type: "residential" | "model" | "employee" | "down"

      tenancy_status: "Current" | "Notice" | "Future" | "Applicant" | "Eviction" | "Past" | "Denied" | "Canceled"
      household_role: "Primary" | "Roommate" | "Occupant" | "Guarantor"
      lease_status: "Current" | "Notice" | "Future" | "Past" | "Eviction"
      import_report_type: "residents_status" | "leased_units" | "expiring_leases" | "availables" | "applications" | "make_ready" | "notices" | "transfers"
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
    Enums: {},
  },
} as const
