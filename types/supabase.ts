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
      alerts: {
        Row: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          property_code: string
          resident: string | null
          unit_id: string | null
          unit_name: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          is_active?: boolean
          property_code: string
          resident?: string | null
          unit_id?: string | null
          unit_name: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          property_code?: string
          resident?: string | null
          unit_id?: string | null
          unit_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_delinquent_residents"
            referencedColumns: ["unit_detail_id"]
          },
          {
            foreignKeyName: "alerts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_leases"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "alerts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_residents"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "alerts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_unit_pricing_analysis"
            referencedColumns: ["unit_id"]
          },
        ]
      }
      amenities: {
        Row: {
          active: boolean | null
          amount: number
          created_at: string
          description: string | null
          id: string
          property_code: string
          type: string
          yardi_amenity: string
          yardi_code: string
          yardi_name: string
        }
        Insert: {
          active?: boolean | null
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          property_code: string
          type: string
          yardi_amenity: string
          yardi_code: string
          yardi_name: string
        }
        Update: {
          active?: boolean | null
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          property_code?: string
          type?: string
          yardi_amenity?: string
          yardi_code?: string
          yardi_name?: string
        }
        Relationships: []
      }
      app_constants: {
        Row: {
          active: boolean
          apt_code: string
          category: string
          created_at: string
          data_type: string
          default_value: string
          description: string | null
          display_order: number
          help_text: string | null
          id: string
          key: string
          label: string
          last_edited_by: string | null
          max_value: number | null
          min_value: number | null
          updated_at: string
          value: string
        }
        Insert: {
          active?: boolean
          apt_code: string
          category: string
          created_at?: string
          data_type: string
          default_value: string
          description?: string | null
          display_order?: number
          help_text?: string | null
          id?: string
          key: string
          label: string
          last_edited_by?: string | null
          max_value?: number | null
          min_value?: number | null
          updated_at?: string
          value: string
        }
        Update: {
          active?: boolean
          apt_code?: string
          category?: string
          created_at?: string
          data_type?: string
          default_value?: string
          description?: string | null
          display_order?: number
          help_text?: string | null
          id?: string
          key?: string
          label?: string
          last_edited_by?: string | null
          max_value?: number | null
          min_value?: number | null
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          agent: string | null
          applicant_name: string
          application_date: string
          created_at: string
          id: string
          property_code: string
          screening_result: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          agent?: string | null
          applicant_name: string
          application_date: string
          created_at?: string
          id?: string
          property_code: string
          screening_result?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          agent?: string | null
          applicant_name?: string
          application_date?: string
          created_at?: string
          id?: string
          property_code?: string
          screening_result?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_delinquent_residents"
            referencedColumns: ["unit_detail_id"]
          },
          {
            foreignKeyName: "applications_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_leases"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "applications_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_residents"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "applications_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_unit_pricing_analysis"
            referencedColumns: ["unit_id"]
          },
        ]
      }
      availabilities: {
        Row: {
          amenities: Json | null
          available_date: string | null
          created_at: string
          future_tenancy_id: string | null
          id: string
          is_active: boolean
          is_mi_inspection: boolean | null
          leasing_agent: string | null
          move_in_date: string | null
          move_out_date: string | null
          property_code: string
          ready_date: string | null
          rent_market: number | null
          rent_offered: number | null
          screening_result: string | null
          status: string | null
          unit_id: string
          unit_name: string | null
          updated_at: string
        }
        Insert: {
          amenities?: Json | null
          available_date?: string | null
          created_at?: string
          future_tenancy_id?: string | null
          id?: string
          is_active?: boolean
          is_mi_inspection?: boolean | null
          leasing_agent?: string | null
          move_in_date?: string | null
          move_out_date?: string | null
          property_code: string
          ready_date?: string | null
          rent_market?: number | null
          rent_offered?: number | null
          screening_result?: string | null
          status?: string | null
          unit_id: string
          unit_name?: string | null
          updated_at?: string
        }
        Update: {
          amenities?: Json | null
          available_date?: string | null
          created_at?: string
          future_tenancy_id?: string | null
          id?: string
          is_active?: boolean
          is_mi_inspection?: boolean | null
          leasing_agent?: string | null
          move_in_date?: string | null
          move_out_date?: string | null
          property_code?: string
          ready_date?: string | null
          rent_market?: number | null
          rent_offered?: number | null
          screening_result?: string | null
          status?: string | null
          unit_id?: string
          unit_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "availabilities_future_tenancy_id_fkey"
            columns: ["future_tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availabilities_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availabilities_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_delinquent_residents"
            referencedColumns: ["unit_detail_id"]
          },
          {
            foreignKeyName: "availabilities_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_leases"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "availabilities_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_residents"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "availabilities_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availabilities_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_unit_pricing_analysis"
            referencedColumns: ["unit_id"]
          },
        ]
      }
      buildings: {
        Row: {
          created_at: string
          description: string | null
          floor_count: number
          id: string
          name: string
          primary_image_url: string | null
          property_code: string
          property_id: string
          stats_cache: Json | null
          street_address: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          floor_count?: number
          id?: string
          name: string
          primary_image_url?: string | null
          property_code: string
          property_id: string
          stats_cache?: Json | null
          street_address?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          floor_count?: number
          id?: string
          name?: string
          primary_image_url?: string | null
          property_code?: string
          property_id?: string
          stats_cache?: Json | null
          street_address?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buildings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      delinquencies: {
        Row: {
          balance: number | null
          created_at: string
          days_0_30: number | null
          days_31_60: number | null
          days_61_90: number | null
          days_90_plus: number | null
          id: string
          is_active: boolean | null
          prepays: number | null
          property_code: string
          resident: string
          tenancy_id: string
          total_unpaid: number | null
          unit_id: string | null
          unit_name: string
          updated_at: string
        }
        Insert: {
          balance?: number | null
          created_at?: string
          days_0_30?: number | null
          days_31_60?: number | null
          days_61_90?: number | null
          days_90_plus?: number | null
          id?: string
          is_active?: boolean | null
          prepays?: number | null
          property_code: string
          resident: string
          tenancy_id: string
          total_unpaid?: number | null
          unit_id?: string | null
          unit_name: string
          updated_at?: string
        }
        Update: {
          balance?: number | null
          created_at?: string
          days_0_30?: number | null
          days_31_60?: number | null
          days_61_90?: number | null
          days_90_plus?: number | null
          id?: string
          is_active?: boolean | null
          prepays?: number | null
          property_code?: string
          resident?: string
          tenancy_id?: string
          total_unpaid?: number | null
          unit_id?: string | null
          unit_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delinquencies_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delinquencies_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delinquencies_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_delinquent_residents"
            referencedColumns: ["unit_detail_id"]
          },
          {
            foreignKeyName: "delinquencies_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_leases"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "delinquencies_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_residents"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "delinquencies_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delinquencies_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_unit_pricing_analysis"
            referencedColumns: ["unit_id"]
          },
        ]
      }
      floor_plans: {
        Row: {
          area_sqft: number
          bathroom_count: number
          bedroom_count: number
          code: string
          created_at: string
          description: string | null
          id: string
          market_base_rent: number | null
          marketing_name: string
          primary_image_url: string | null
          property_code: string
          property_id: string
          stats_cache: Json | null
          updated_at: string
          yardi_layout_code: string | null
        }
        Insert: {
          area_sqft?: number
          bathroom_count?: number
          bedroom_count?: number
          code: string
          created_at?: string
          description?: string | null
          id?: string
          market_base_rent?: number | null
          marketing_name: string
          primary_image_url?: string | null
          property_code: string
          property_id: string
          stats_cache?: Json | null
          updated_at?: string
          yardi_layout_code?: string | null
        }
        Update: {
          area_sqft?: number
          bathroom_count?: number
          bedroom_count?: number
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          market_base_rent?: number | null
          marketing_name?: string
          primary_image_url?: string | null
          property_code?: string
          property_id?: string
          stats_cache?: Json | null
          updated_at?: string
          yardi_layout_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "floor_plans_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      import_staging: {
        Row: {
          batch_id: string
          created_at: string
          error_log: string | null
          id: string
          processed_at: string | null
          property_code: string
          raw_data: Json
          report_type: Database["public"]["Enums"]["import_report_type"]
        }
        Insert: {
          batch_id: string
          created_at?: string
          error_log?: string | null
          id?: string
          processed_at?: string | null
          property_code: string
          raw_data: Json
          report_type: Database["public"]["Enums"]["import_report_type"]
        }
        Update: {
          batch_id?: string
          created_at?: string
          error_log?: string | null
          id?: string
          processed_at?: string | null
          property_code?: string
          raw_data?: Json
          report_type?: Database["public"]["Enums"]["import_report_type"]
        }
        Relationships: []
      }
      leases: {
        Row: {
          created_at: string
          deposit_amount: number | null
          end_date: string
          id: string
          is_active: boolean | null
          lease_status: Database["public"]["Enums"]["lease_status"]
          property_code: string
          rent_amount: number | null
          start_date: string
          tenancy_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deposit_amount?: number | null
          end_date: string
          id?: string
          is_active?: boolean | null
          lease_status: Database["public"]["Enums"]["lease_status"]
          property_code: string
          rent_amount?: number | null
          start_date: string
          tenancy_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deposit_amount?: number | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          lease_status?: Database["public"]["Enums"]["lease_status"]
          property_code?: string
          rent_amount?: number | null
          start_date?: string
          tenancy_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leases_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          },
        ]
      }
      location_note_attachments: {
        Row: {
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          mime_type: string | null
          note_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          mime_type?: string | null
          note_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          mime_type?: string | null
          note_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "location_note_attachments_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "location_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      location_notes: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          id: string
          location_id: string
          note_text: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          id?: string
          location_id: string
          note_text: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          id?: string
          location_id?: string
          note_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_notes_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location_notes_summary"
            referencedColumns: ["location_id"]
          },
          {
            foreignKeyName: "location_notes_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          icon_type: string | null
          id: string
          latitude: number
          longitude: number
          property_code: string
          source_image_url: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon_type?: string | null
          id?: string
          latitude: number
          longitude: number
          property_code: string
          source_image_url?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          icon_type?: string | null
          id?: string
          latitude?: number
          longitude?: number
          property_code?: string
          source_image_url?: string | null
        }
        Relationships: []
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
      properties: {
        Row: {
          city: string | null
          code: string
          created_at: string
          description: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          postal_code: string | null
          primary_image_url: string | null
          state_code: string
          street_address: string | null
          total_unit_count: number | null
          updated_at: string
          website_url: string | null
          year_built: number | null
        }
        Insert: {
          city?: string | null
          code: string
          created_at?: string
          description?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          postal_code?: string | null
          primary_image_url?: string | null
          state_code: string
          street_address?: string | null
          total_unit_count?: number | null
          updated_at?: string
          website_url?: string | null
          year_built?: number | null
        }
        Update: {
          city?: string | null
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          postal_code?: string | null
          primary_image_url?: string | null
          state_code?: string
          street_address?: string | null
          total_unit_count?: number | null
          updated_at?: string
          website_url?: string | null
          year_built?: number | null
        }
        Relationships: []
      }
      property_notification_recipients: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          property_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          property_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          property_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      residents: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          property_code: string
          role: Database["public"]["Enums"]["household_role"]
          tenancy_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          property_code: string
          role: Database["public"]["Enums"]["household_role"]
          tenancy_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          property_code?: string
          role?: Database["public"]["Enums"]["household_role"]
          tenancy_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "residents_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          },
        ]
      }
      solver_events: {
        Row: {
          created_at: string
          details: Json
          event_date: string
          event_type: string
          id: string
          property_code: string
          solver_run_id: string
          tenancy_id: string | null
          unit_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json
          event_date?: string
          event_type: string
          id?: string
          property_code: string
          solver_run_id: string
          tenancy_id?: string | null
          unit_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json
          event_date?: string
          event_type?: string
          id?: string
          property_code?: string
          solver_run_id?: string
          tenancy_id?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solver_events_solver_run_id_fkey"
            columns: ["solver_run_id"]
            isOneToOne: false
            referencedRelation: "solver_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solver_events_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solver_events_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solver_events_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_delinquent_residents"
            referencedColumns: ["unit_detail_id"]
          },
          {
            foreignKeyName: "solver_events_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_leases"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "solver_events_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_residents"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "solver_events_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solver_events_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_unit_pricing_analysis"
            referencedColumns: ["unit_id"]
          },
        ]
      }
      solver_runs: {
        Row: {
          batch_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          properties_processed: string[] | null
          started_at: string
          status: string
          summary: Json | null
          updated_at: string
          upload_date: string
        }
        Insert: {
          batch_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          properties_processed?: string[] | null
          started_at?: string
          status?: string
          summary?: Json | null
          updated_at?: string
          upload_date?: string
        }
        Update: {
          batch_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          properties_processed?: string[] | null
          started_at?: string
          status?: string
          summary?: Json | null
          updated_at?: string
          upload_date?: string
        }
        Relationships: []
      }
      tenancies: {
        Row: {
          created_at: string
          id: string
          move_in_date: string | null
          move_out_date: string | null
          property_code: string
          status: Database["public"]["Enums"]["tenancy_status"]
          unit_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          move_in_date?: string | null
          move_out_date?: string | null
          property_code: string
          status: Database["public"]["Enums"]["tenancy_status"]
          unit_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          move_in_date?: string | null
          move_out_date?: string | null
          property_code?: string
          status?: Database["public"]["Enums"]["tenancy_status"]
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenancies_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancies_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_delinquent_residents"
            referencedColumns: ["unit_detail_id"]
          },
          {
            foreignKeyName: "tenancies_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_leases"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "tenancies_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_residents"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "tenancies_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancies_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_unit_pricing_analysis"
            referencedColumns: ["unit_id"]
          },
        ]
      }
      unit_amenities: {
        Row: {
          active: boolean | null
          amenity_id: string
          comment: string | null
          created_at: string
          id: string
          unit_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          amenity_id: string
          comment?: string | null
          created_at?: string
          id?: string
          unit_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          amenity_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          unit_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unit_amenities_amenity_id_fkey"
            columns: ["amenity_id"]
            isOneToOne: false
            referencedRelation: "amenities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_amenities_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_amenities_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_delinquent_residents"
            referencedColumns: ["unit_detail_id"]
          },
          {
            foreignKeyName: "unit_amenities_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_leases"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "unit_amenities_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_residents"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "unit_amenities_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_amenities_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_unit_pricing_analysis"
            referencedColumns: ["unit_id"]
          },
        ]
      }
      unit_flags: {
        Row: {
          created_at: string
          flag_type: string
          id: string
          message: string | null
          metadata: Json | null
          property_code: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
          unit_id: string
        }
        Insert: {
          created_at?: string
          flag_type: string
          id?: string
          message?: string | null
          metadata?: Json | null
          property_code: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          title: string
          unit_id: string
        }
        Update: {
          created_at?: string
          flag_type?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          property_code?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
          unit_id?: string
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
            foreignKeyName: "unit_flags_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_delinquent_residents"
            referencedColumns: ["unit_detail_id"]
          },
          {
            foreignKeyName: "unit_flags_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_leases"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "unit_flags_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_residents"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "unit_flags_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_flags_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_unit_pricing_analysis"
            referencedColumns: ["unit_id"]
          },
        ]
      }
      units: {
        Row: {
          availability_status: Database["public"]["Enums"]["availability_status"]
          building_id: string | null
          created_at: string
          description: string | null
          floor_number: number | null
          floor_plan_id: string | null
          id: string
          primary_image_url: string | null
          property_code: string
          unit_name: string
          updated_at: string
          usage_type: Database["public"]["Enums"]["usage_type"]
        }
        Insert: {
          availability_status?: Database["public"]["Enums"]["availability_status"]
          building_id?: string | null
          created_at?: string
          description?: string | null
          floor_number?: number | null
          floor_plan_id?: string | null
          id?: string
          primary_image_url?: string | null
          property_code: string
          unit_name: string
          updated_at?: string
          usage_type?: Database["public"]["Enums"]["usage_type"]
        }
        Update: {
          availability_status?: Database["public"]["Enums"]["availability_status"]
          building_id?: string | null
          created_at?: string
          description?: string | null
          floor_number?: number | null
          floor_plan_id?: string | null
          id?: string
          primary_image_url?: string | null
          property_code?: string
          unit_name?: string
          updated_at?: string
          usage_type?: Database["public"]["Enums"]["usage_type"]
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
            foreignKeyName: "units_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "view_availabilities_metrics"
            referencedColumns: ["building_id"]
          },
          {
            foreignKeyName: "units_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "view_table_availabilities"
            referencedColumns: ["building_id"]
          },
          {
            foreignKeyName: "units_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "view_table_delinquent_residents"
            referencedColumns: ["building_id"]
          },
          {
            foreignKeyName: "units_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "view_table_leases"
            referencedColumns: ["building_id"]
          },
          {
            foreignKeyName: "units_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "view_table_residents"
            referencedColumns: ["building_id"]
          },
          {
            foreignKeyName: "units_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "view_table_units"
            referencedColumns: ["building_id"]
          },
          {
            foreignKeyName: "units_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "view_floor_plan_pricing_summary"
            referencedColumns: ["floor_plan_id"]
          },
          {
            foreignKeyName: "units_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "view_table_units"
            referencedColumns: ["floor_plan_id"]
          },
        ]
      }
      user_property_access: {
        Row: {
          id: string
          property_code: string
          role: string | null
          user_id: string
        }
        Insert: {
          id?: string
          property_code: string
          role?: string | null
          user_id: string
        }
        Update: {
          id?: string
          property_code?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_property_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          call_date: string | null
          category: string | null
          completion_date: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          phone: string | null
          property_code: string
          resident: string | null
          status: string
          unit_id: string | null
          unit_name: string | null
          updated_at: string | null
          yardi_work_order_id: string
        }
        Insert: {
          call_date?: string | null
          category?: string | null
          completion_date?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          property_code: string
          resident?: string | null
          status: string
          unit_id?: string | null
          unit_name?: string | null
          updated_at?: string | null
          yardi_work_order_id: string
        }
        Update: {
          call_date?: string | null
          category?: string | null
          completion_date?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          property_code?: string
          resident?: string | null
          status?: string
          unit_id?: string | null
          unit_name?: string | null
          updated_at?: string | null
          yardi_work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_delinquent_residents"
            referencedColumns: ["unit_detail_id"]
          },
          {
            foreignKeyName: "work_orders_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_leases"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "work_orders_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_residents"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "work_orders_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_unit_pricing_analysis"
            referencedColumns: ["unit_id"]
          },
        ]
      }
    }
    Views: {
      location_notes_summary: {
        Row: {
          category_breakdown: Json | null
          icon_type: string | null
          last_note_date: string | null
          location_id: string | null
          property_code: string | null
          total_attachments: number | null
          total_notes: number | null
        }
        Relationships: []
      }
      view_availabilities_metrics: {
        Row: {
          amenities: Json | null
          available_date: string | null
          building_id: string | null
          building_name: string | null
          floor_plan_id: string | null
          floor_plan_image_url: string | null
          floor_plan_name: string | null
          future_status: Database["public"]["Enums"]["tenancy_status"] | null
          leasing_agent: string | null
          move_in_date: string | null
          move_out_date: string | null
          operational_status: string | null
          property_code: string | null
          ready_date: string | null
          rent_offered: number | null
          sf: number | null
          status: string | null
          turnover_days: number | null
          unit_id: string | null
          unit_name: string | null
          vacant_days: number | null
        }
        Relationships: [
          {
            foreignKeyName: "availabilities_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availabilities_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_delinquent_residents"
            referencedColumns: ["unit_detail_id"]
          },
          {
            foreignKeyName: "availabilities_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_leases"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "availabilities_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_residents"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "availabilities_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availabilities_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_unit_pricing_analysis"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "units_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "view_floor_plan_pricing_summary"
            referencedColumns: ["floor_plan_id"]
          },
          {
            foreignKeyName: "units_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "view_table_units"
            referencedColumns: ["floor_plan_id"]
          },
        ]
      }
      view_delinquencies_current_summary: {
        Row: {
          balance_sum: number | null
          days_0_30_sum: number | null
          days_31_60_sum: number | null
          days_61_90_sum: number | null
          days_90_plus_sum: number | null
          prepays_sum: number | null
          property_code: string | null
          resident_count: number | null
          total_unpaid_sum: number | null
        }
        Relationships: []
      }
      view_delinquencies_daily_trend: {
        Row: {
          balance_sum: number | null
          property_code: string | null
          snapshot_date: string | null
          total_unpaid_sum: number | null
        }
        Relationships: []
      }
      view_floor_plan_pricing_summary: {
        Row: {
          available_units: number | null
          avg_market_rent: number | null
          avg_offered_rent: number | null
          floor_plan_code: string | null
          floor_plan_id: string | null
          floor_plan_name: string | null
          property_code: string | null
          rent_discrepancy: number | null
          total_units: number | null
        }
        Relationships: []
      }
      view_leases: {
        Row: {
          deposit_amount: number | null
          end_date: string | null
          id: string | null
          lease_status: Database["public"]["Enums"]["lease_status"] | null
          move_in_date: string | null
          number_household: number | null
          property_code: string | null
          rent_amount: number | null
          resident: string | null
          start_date: string | null
          tenancy_id: string | null
          unit_name: string | null
        }
        Insert: {
          deposit_amount?: number | null
          end_date?: string | null
          id?: string | null
          lease_status?: Database["public"]["Enums"]["lease_status"] | null
          move_in_date?: never
          number_household?: never
          property_code?: string | null
          rent_amount?: number | null
          resident?: never
          start_date?: string | null
          tenancy_id?: string | null
          unit_name?: never
        }
        Update: {
          deposit_amount?: number | null
          end_date?: string | null
          id?: string | null
          lease_status?: Database["public"]["Enums"]["lease_status"] | null
          move_in_date?: never
          number_household?: never
          property_code?: string | null
          rent_amount?: number | null
          resident?: never
          start_date?: string | null
          tenancy_id?: string | null
          unit_name?: never
        }
        Relationships: [
          {
            foreignKeyName: "leases_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          },
        ]
      }
      view_leasing_pipeline: {
        Row: {
          amenities: Json | null
          application_date: string | null
          availability_id: string | null
          available_date: string | null
          bathroom_count: number | null
          bedroom_count: number | null
          building_id: string | null
          building_name: string | null
          floor_plan_code: string | null
          floor_plan_id: string | null
          floor_plan_name: string | null
          future_tenancy_id: string | null
          is_active: boolean | null
          lease_end_date: string | null
          lease_rent_amount: number | null
          lease_start_date: string | null
          leasing_agent: string | null
          market_base_rent: number | null
          move_in_date: string | null
          move_out_date: string | null
          property_code: string | null
          record_type: string | null
          rent_offered: number | null
          resident_email: string | null
          resident_name: string | null
          resident_phone: string | null
          screening_result: string | null
          sf: number | null
          status: string | null
          unit_id: string | null
          unit_name: string | null
          vacant_days: number | null
        }
        Relationships: []
      }
      view_table_alerts_unified: {
        Row: {
          building_name: string | null
          created_at: string | null
          days_open: number | null
          id: string | null
          is_active: boolean | null
          is_overdue: boolean | null
          message: string | null
          property_code: string | null
          resident: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          source: string | null
          title: string | null
          unit_id: string | null
          unit_name: string | null
        }
        Relationships: []
      }
      view_table_availabilities: {
        Row: {
          amenities: Json | null
          available_date: string | null
          building_id: string | null
          building_name: string | null
          floor_plan_id: string | null
          floor_plan_image_url: string | null
          floor_plan_name: string | null
          future_status: Database["public"]["Enums"]["tenancy_status"] | null
          leasing_agent: string | null
          move_in_date: string | null
          move_out_date: string | null
          operational_status: string | null
          property_code: string | null
          ready_date: string | null
          rent_offered: number | null
          sf: number | null
          status: string | null
          turnover_days: number | null
          unit_id: string | null
          unit_name: string | null
          vacant_days: number | null
        }
        Relationships: [
          {
            foreignKeyName: "availabilities_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availabilities_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_delinquent_residents"
            referencedColumns: ["unit_detail_id"]
          },
          {
            foreignKeyName: "availabilities_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_leases"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "availabilities_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_residents"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "availabilities_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availabilities_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_unit_pricing_analysis"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "units_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "view_floor_plan_pricing_summary"
            referencedColumns: ["floor_plan_id"]
          },
          {
            foreignKeyName: "units_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "view_table_units"
            referencedColumns: ["floor_plan_id"]
          },
        ]
      }
      view_table_delinquent_residents: {
        Row: {
          balance: number | null
          building_id: string | null
          building_name: string | null
          created_at: string | null
          days_0_30: number | null
          days_31_60: number | null
          days_61_90: number | null
          days_90_plus: number | null
          floor_plan_id: string | null
          id: string | null
          move_in_date: string | null
          move_out_date: string | null
          prepays: number | null
          property_code: string | null
          resident: string | null
          resident_email: string | null
          resident_id: string | null
          resident_phone: string | null
          tenancy_id: string | null
          tenancy_status: Database["public"]["Enums"]["tenancy_status"] | null
          total_unpaid: number | null
          unit_detail_id: string | null
          unit_id: string | null
          unit_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delinquencies_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delinquencies_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delinquencies_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_delinquent_residents"
            referencedColumns: ["unit_detail_id"]
          },
          {
            foreignKeyName: "delinquencies_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_leases"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "delinquencies_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_residents"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "delinquencies_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_table_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delinquencies_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "view_unit_pricing_analysis"
            referencedColumns: ["unit_id"]
          },
          {
            foreignKeyName: "units_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "view_floor_plan_pricing_summary"
            referencedColumns: ["floor_plan_id"]
          },
          {
            foreignKeyName: "units_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "view_table_units"
            referencedColumns: ["floor_plan_id"]
          },
        ]
      }
      view_table_leases: {
        Row: {
          building_id: string | null
          building_name: string | null
          deposit_amount: number | null
          end_date: string | null
          household_count: number | null
          id: string | null
          is_active: boolean | null
          is_mtm: boolean | null
          lease_status: Database["public"]["Enums"]["lease_status"] | null
          move_in_date: string | null
          move_out_date: string | null
          property_code: string | null
          rent_amount: number | null
          resident_id: string | null
          resident_name: string | null
          start_date: string | null
          tenancy_id: string | null
          tenancy_status: Database["public"]["Enums"]["tenancy_status"] | null
          unit_id: string | null
          unit_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leases_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          },
        ]
      }
      view_table_residents: {
        Row: {
          building_id: string | null
          building_name: string | null
          email: string | null
          id: string | null
          is_active: boolean | null
          lease_end_date: string | null
          lease_start_date: string | null
          move_in_date: string | null
          move_out_date: string | null
          name: string | null
          phone: string | null
          property_code: string | null
          role: Database["public"]["Enums"]["household_role"] | null
          tenancy_id: string | null
          tenancy_status: Database["public"]["Enums"]["tenancy_status"] | null
          unit_id: string | null
          unit_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "residents_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          },
        ]
      }
      view_table_units: {
        Row: {
          availability_status:
            | Database["public"]["Enums"]["availability_status"]
            | null
          building_address: string | null
          building_id: string | null
          building_name: string | null
          created_at: string | null
          description: string | null
          floor_number: number | null
          floor_plan_code: string | null
          floor_plan_id: string | null
          floor_plan_marketing_name: string | null
          id: string | null
          move_in_date: string | null
          move_out_date: string | null
          primary_image_url: string | null
          property_code: string | null
          resident_id: string | null
          resident_name: string | null
          sf: number | null
          tenancy_status: Database["public"]["Enums"]["tenancy_status"] | null
          unit_name: string | null
          updated_at: string | null
          usage_type: Database["public"]["Enums"]["usage_type"] | null
        }
        Relationships: []
      }
      view_unit_pricing_analysis: {
        Row: {
          base_rent: number | null
          calculated_market_rent: number | null
          calculated_offered_rent: number | null
          fixed_amenities_total: number | null
          floor_plan_id: string | null
          property_code: string | null
          temp_amenities_total: number | null
          unit_id: string | null
          unit_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "units_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "floor_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "view_floor_plan_pricing_summary"
            referencedColumns: ["floor_plan_id"]
          },
          {
            foreignKeyName: "units_floor_plan_id_fkey"
            columns: ["floor_plan_id"]
            isOneToOne: false
            referencedRelation: "view_table_units"
            referencedColumns: ["floor_plan_id"]
          },
        ]
      }
    }
    Functions: {
      get_delinquencies_monthly_26th_snapshots: {
        Args: { p_months_count?: number; p_property_code: string }
        Returns: {
          balance: number
          days_0_30: number
          days_31_60: number
          days_61_90: number
          days_90_plus: number
          prepays: number
          snapshot_date: string
          total_unpaid: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      availability_status: "Available" | "Leased" | "Applied" | "Occupied"
      household_role: "Primary" | "Roommate" | "Occupant" | "Guarantor"
      import_report_type:
        | "residents_status"
        | "leased_units"
        | "expiring_leases"
        | "availables"
        | "applications"
        | "make_ready"
        | "notices"
        | "transfers"
        | "alerts"
        | "work_orders"
        | "delinquencies"
      lease_status:
        | "Current"
        | "Notice"
        | "Eviction"
        | "Future"
        | "Past"
        | "Applicant"
      leasing_sync_status: "Success" | "Failed" | "Partial"
      occupancy_status: "vacant" | "occupied"
      ops_sync_status: "Success" | "Failed" | "Partial"
      tenancy_status:
        | "Current"
        | "Notice"
        | "Future"
        | "Applicant"
        | "Eviction"
        | "Past"
        | "Denied"
        | "Canceled"
      usage_type: "residential" | "model" | "employee" | "down"
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
    Enums: {
      availability_status: ["Available", "Leased", "Applied", "Occupied"],
      household_role: ["Primary", "Roommate", "Occupant", "Guarantor"],
      import_report_type: [
        "residents_status",
        "leased_units",
        "expiring_leases",
        "availables",
        "applications",
        "make_ready",
        "notices",
        "transfers",
        "alerts",
        "work_orders",
        "delinquencies",
      ],
      lease_status: [
        "Current",
        "Notice",
        "Eviction",
        "Future",
        "Past",
        "Applicant",
      ],
      leasing_sync_status: ["Success", "Failed", "Partial"],
      occupancy_status: ["vacant", "occupied"],
      ops_sync_status: ["Success", "Failed", "Partial"],
      tenancy_status: [
        "Current",
        "Notice",
        "Future",
        "Applicant",
        "Eviction",
        "Past",
        "Denied",
        "Canceled",
      ],
      usage_type: ["residential", "model", "employee", "down"],
    },
  },
} as const
