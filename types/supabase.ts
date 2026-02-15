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
      units: {
        Row: {
          id: string
          unit_name: string
          property_code: string
          building_id: string | null
          floor_plan_id: string | null
          floor_number: number | null
          usage_type: string | null
          availability_status: string | null
          primary_image_url: string | null
          description: string | null
          created_at: string
          updated_at: string
        }
      }
      buildings: {
        Row: {
          id: string
          name: string
          property_code: string
          street_address: string | null
        }
      }
      floor_plans: {
        Row: {
          id: string
          property_code: string
          code: string
          marketing_name: string | null
          primary_image_url: string | null
          area_sqft: number | null
        }
      }
      attachments: {
        Row: {
          id: string
          record_id: string
          record_type: string
          file_url: string
          file_type: 'image' | 'document'
          file_name: string
          file_size: number | null
          mime_type: string | null
          uploaded_by: string | null
          uploaded_at: string
        }
        Insert: {
          id?: string
          record_id: string
          record_type: string
          file_url: string
          file_type: 'image' | 'document'
          file_name: string
          file_size?: number | null
          mime_type?: string | null
          uploaded_by?: string | null
          uploaded_at?: string
        }
      }
    }
    Views: {
      view_table_units: {
        Row: {
          id: string
          unit_name: string
          property_code: string
          floor_number: number | null
          usage_type: string | null
          availability_status: string | null
          primary_image_url: string | null
          description: string | null
          created_at: string
          updated_at: string
          building_name: string | null
          building_id: string | null
          building_address: string | null
          floor_plan_marketing_name: string | null
          floor_plan_code: string | null
          floor_plan_id: string | null
          floor_plan_image_url: string | null
          sf: number | null
          tenancy_status: string
          move_in_date: string | null
          move_out_date: string | null
          resident_name: string | null
          resident_id: string | null
        }
      }
    }
  }
}
