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
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          changed_fields: string[] | null
          created_at: string
          farm_id: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          changed_fields?: string[] | null
          created_at?: string
          farm_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          changed_fields?: string[] | null
          created_at?: string
          farm_id?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      capital_injections: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          description: string | null
          farm_id: string | null
          id: string
          injection_date: string
          notes: string | null
          source: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          description?: string | null
          farm_id?: string | null
          id?: string
          injection_date?: string
          notes?: string | null
          source?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          description?: string | null
          farm_id?: string | null
          id?: string
          injection_date?: string
          notes?: string | null
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "capital_injections_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          thread_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "copilot_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "copilot_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      copilot_threads: {
        Row: {
          created_at: string
          farm_id: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          farm_id: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          farm_id?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "copilot_threads_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      crop_harvests: {
        Row: {
          created_at: string
          created_by: string
          crop_id: string
          farm_id: string | null
          harvest_date: string
          id: string
          notes: string | null
          quality_grade: string | null
          quantity: number
          unit: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          crop_id: string
          farm_id?: string | null
          harvest_date?: string
          id?: string
          notes?: string | null
          quality_grade?: string | null
          quantity?: number
          unit?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          crop_id?: string
          farm_id?: string | null
          harvest_date?: string
          id?: string
          notes?: string | null
          quality_grade?: string | null
          quantity?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crop_harvests_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crop_harvests_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      crop_programmes: {
        Row: {
          anchor_date: string
          anchor_stage: string
          created_at: string
          created_by: string
          crop_id: string | null
          farm_id: string
          id: string
          name: string
          next_crop_family: string | null
          notes: string | null
          template_id: string | null
          updated_at: string
        }
        Insert: {
          anchor_date: string
          anchor_stage?: string
          created_at?: string
          created_by: string
          crop_id?: string | null
          farm_id: string
          id?: string
          name: string
          next_crop_family?: string | null
          notes?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          anchor_date?: string
          anchor_stage?: string
          created_at?: string
          created_by?: string
          crop_id?: string | null
          farm_id?: string
          id?: string
          name?: string
          next_crop_family?: string | null
          notes?: string | null
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crop_programmes_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crop_programmes_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crop_programmes_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "programme_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      crop_varieties: {
        Row: {
          created_at: string
          created_by: string
          crop_name: string
          establishment_method: string
          farm_id: string | null
          field_duration_days: number | null
          id: string
          max_duration_days: number | null
          min_duration_days: number | null
          notes: string | null
          nursery_duration_days: number | null
          total_duration_days: number | null
          updated_at: string
          variety: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          crop_name: string
          establishment_method?: string
          farm_id?: string | null
          field_duration_days?: number | null
          id?: string
          max_duration_days?: number | null
          min_duration_days?: number | null
          notes?: string | null
          nursery_duration_days?: number | null
          total_duration_days?: number | null
          updated_at?: string
          variety?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          crop_name?: string
          establishment_method?: string
          farm_id?: string | null
          field_duration_days?: number | null
          id?: string
          max_duration_days?: number | null
          min_duration_days?: number | null
          notes?: string | null
          nursery_duration_days?: number | null
          total_duration_days?: number | null
          updated_at?: string
          variety?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crop_varieties_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      crops: {
        Row: {
          acreage: number | null
          actual_harvest_date: string | null
          actual_transplant_date: string | null
          archived: boolean
          archived_at: string | null
          created_at: string
          created_by: string
          duration_source: string
          establishment_method: string
          expected_harvest_date: string | null
          expected_transplant_date: string | null
          farm_id: string | null
          farm_location: string
          field_growth_duration_days: number | null
          growth_duration_days: number | null
          harvest_date: string | null
          id: string
          name: string
          notes: string | null
          nursery_duration_days: number | null
          nursery_location: string | null
          nursery_notes: string | null
          nursery_start_date: string | null
          planting_date: string | null
          season: string | null
          seed_quantity: number | null
          seedlings_transplanted: number | null
          spacing: string | null
          status: string | null
          transplant_notes: string | null
          type: string
          updated_at: string
          variety: string | null
          yield_quantity: number | null
          yield_unit: string | null
        }
        Insert: {
          acreage?: number | null
          actual_harvest_date?: string | null
          actual_transplant_date?: string | null
          archived?: boolean
          archived_at?: string | null
          created_at?: string
          created_by: string
          duration_source?: string
          establishment_method?: string
          expected_harvest_date?: string | null
          expected_transplant_date?: string | null
          farm_id?: string | null
          farm_location: string
          field_growth_duration_days?: number | null
          growth_duration_days?: number | null
          harvest_date?: string | null
          id?: string
          name: string
          notes?: string | null
          nursery_duration_days?: number | null
          nursery_location?: string | null
          nursery_notes?: string | null
          nursery_start_date?: string | null
          planting_date?: string | null
          season?: string | null
          seed_quantity?: number | null
          seedlings_transplanted?: number | null
          spacing?: string | null
          status?: string | null
          transplant_notes?: string | null
          type: string
          updated_at?: string
          variety?: string | null
          yield_quantity?: number | null
          yield_unit?: string | null
        }
        Update: {
          acreage?: number | null
          actual_harvest_date?: string | null
          actual_transplant_date?: string | null
          archived?: boolean
          archived_at?: string | null
          created_at?: string
          created_by?: string
          duration_source?: string
          establishment_method?: string
          expected_harvest_date?: string | null
          expected_transplant_date?: string | null
          farm_id?: string | null
          farm_location?: string
          field_growth_duration_days?: number | null
          growth_duration_days?: number | null
          harvest_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          nursery_duration_days?: number | null
          nursery_location?: string | null
          nursery_notes?: string | null
          nursery_start_date?: string | null
          planting_date?: string | null
          season?: string | null
          seed_quantity?: number | null
          seedlings_transplanted?: number | null
          spacing?: string | null
          status?: string | null
          transplant_notes?: string | null
          type?: string
          updated_at?: string
          variety?: string | null
          yield_quantity?: number | null
          yield_unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crops_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          created_by: string
          farm_id: string | null
          id: string
          maintenance_date: string | null
          name: string
          notes: string | null
          purchase_date: string | null
          purchase_price: number | null
          status: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category: string
          created_at?: string
          created_by: string
          farm_id?: string | null
          id?: string
          maintenance_date?: string | null
          name: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          created_by?: string
          farm_id?: string | null
          id?: string
          maintenance_date?: string | null
          name?: string
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_maintenance: {
        Row: {
          cost: number | null
          created_at: string
          created_by: string
          description: string | null
          equipment_id: string
          farm_id: string | null
          fuel_litres: number | null
          hours_used: number | null
          id: string
          log_date: string
          log_type: string
          next_service_date: string | null
          notes: string | null
          performed_by: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string
          created_by: string
          description?: string | null
          equipment_id: string
          farm_id?: string | null
          fuel_litres?: number | null
          hours_used?: number | null
          id?: string
          log_date?: string
          log_type: string
          next_service_date?: string | null
          notes?: string | null
          performed_by?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string
          created_by?: string
          description?: string | null
          equipment_id?: string
          farm_id?: string | null
          fuel_litres?: number | null
          hours_used?: number | null
          id?: string
          log_date?: string
          log_type?: string
          next_service_date?: string | null
          notes?: string | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_maintenance_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      farm_members: {
        Row: {
          created_at: string
          farm_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          farm_id: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          farm_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "farm_members_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      farm_settings: {
        Row: {
          created_at: string
          farm_name: string
          id: string
          location: string
          logo_url: string | null
          owner_name: string
          slogan: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          farm_name?: string
          id?: string
          location?: string
          logo_url?: string | null
          owner_name?: string
          slogan?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          farm_name?: string
          id?: string
          location?: string
          logo_url?: string | null
          owner_name?: string
          slogan?: string
          updated_at?: string
        }
        Relationships: []
      }
      farms: {
        Row: {
          created_at: string
          id: string
          location: string
          logo_url: string | null
          name: string
          owner_id: string
          slogan: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string
          logo_url?: string | null
          name: string
          owner_id: string
          slogan?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          slogan?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          category: string
          created_at: string
          created_by: string
          farm_id: string | null
          id: string
          item_name: string
          item_type: string
          last_updated: string
          location: string | null
          min_threshold: number | null
          quantity: number
          supplier: string | null
          unit: string
          unit_cost: number | null
        }
        Insert: {
          category: string
          created_at?: string
          created_by: string
          farm_id?: string | null
          id?: string
          item_name: string
          item_type?: string
          last_updated?: string
          location?: string | null
          min_threshold?: number | null
          quantity?: number
          supplier?: string | null
          unit: string
          unit_cost?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          farm_id?: string | null
          id?: string
          item_name?: string
          item_type?: string
          last_updated?: string
          location?: string | null
          min_threshold?: number | null
          quantity?: number
          supplier?: string | null
          unit?: string
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_batches: {
        Row: {
          batch_number: string | null
          created_at: string
          created_by: string
          expiry_date: string | null
          farm_id: string | null
          id: string
          inventory_id: string
          notes: string | null
          quantity_received: number
          quantity_remaining: number
          received_date: string
          source: string | null
          unit_cost: number
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          created_by: string
          expiry_date?: string | null
          farm_id?: string | null
          id?: string
          inventory_id: string
          notes?: string | null
          quantity_received: number
          quantity_remaining: number
          received_date?: string
          source?: string | null
          unit_cost?: number
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          created_by?: string
          expiry_date?: string | null
          farm_id?: string | null
          id?: string
          inventory_id?: string
          notes?: string | null
          quantity_received?: number
          quantity_remaining?: number
          received_date?: string
          source?: string | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_batches_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          batch_id: string | null
          batch_number: string | null
          created_at: string
          created_by: string
          destination: string | null
          expiry_date: string | null
          farm_id: string | null
          id: string
          inventory_id: string
          linked_module: string | null
          linked_record_id: string | null
          linked_record_name: string | null
          movement_date: string
          movement_type: string
          notes: string | null
          purpose: string | null
          quantity: number
          reason: string | null
          source: string | null
          total_cost: number | null
          unit_cost: number | null
        }
        Insert: {
          batch_id?: string | null
          batch_number?: string | null
          created_at?: string
          created_by: string
          destination?: string | null
          expiry_date?: string | null
          farm_id?: string | null
          id?: string
          inventory_id: string
          linked_module?: string | null
          linked_record_id?: string | null
          linked_record_name?: string | null
          movement_date?: string
          movement_type: string
          notes?: string | null
          purpose?: string | null
          quantity: number
          reason?: string | null
          source?: string | null
          total_cost?: number | null
          unit_cost?: number | null
        }
        Update: {
          batch_id?: string | null
          batch_number?: string | null
          created_at?: string
          created_by?: string
          destination?: string | null
          expiry_date?: string | null
          farm_id?: string | null
          id?: string
          inventory_id?: string
          linked_module?: string | null
          linked_record_id?: string | null
          linked_record_name?: string | null
          movement_date?: string
          movement_type?: string
          notes?: string | null
          purpose?: string | null
          quantity?: number
          reason?: string | null
          source?: string | null
          total_cost?: number | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "inventory_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      livestock: {
        Row: {
          age: number | null
          breed: string | null
          created_at: string
          created_by: string
          date_of_arrival_at_farm: string | null
          date_of_birth: string | null
          date_of_birth_on_farm: string | null
          farm_id: string | null
          farm_location: string
          gender: string | null
          health_status: string | null
          id: string
          mother_id: string | null
          notes: string | null
          purchase_date: string | null
          purchase_price: number | null
          tag_number: string | null
          type: string
          updated_at: string
          weight: number | null
        }
        Insert: {
          age?: number | null
          breed?: string | null
          created_at?: string
          created_by: string
          date_of_arrival_at_farm?: string | null
          date_of_birth?: string | null
          date_of_birth_on_farm?: string | null
          farm_id?: string | null
          farm_location: string
          gender?: string | null
          health_status?: string | null
          id?: string
          mother_id?: string | null
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          tag_number?: string | null
          type: string
          updated_at?: string
          weight?: number | null
        }
        Update: {
          age?: number | null
          breed?: string | null
          created_at?: string
          created_by?: string
          date_of_arrival_at_farm?: string | null
          date_of_birth?: string | null
          date_of_birth_on_farm?: string | null
          farm_id?: string | null
          farm_location?: string
          gender?: string | null
          health_status?: string | null
          id?: string
          mother_id?: string | null
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          tag_number?: string | null
          type?: string
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "livestock_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      livestock_batches: {
        Row: {
          animal_type: string
          arrival_date: string
          batch_id: string
          breed: string | null
          created_at: string
          created_by: string
          current_quantity: number
          farm_id: string | null
          feed_consumed: number
          feed_unit: string | null
          id: string
          initial_quantity: number
          mortality_count: number
          notes: string | null
          source: string | null
          updated_at: string
        }
        Insert: {
          animal_type: string
          arrival_date?: string
          batch_id: string
          breed?: string | null
          created_at?: string
          created_by: string
          current_quantity: number
          farm_id?: string | null
          feed_consumed?: number
          feed_unit?: string | null
          id?: string
          initial_quantity: number
          mortality_count?: number
          notes?: string | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          animal_type?: string
          arrival_date?: string
          batch_id?: string
          breed?: string | null
          created_at?: string
          created_by?: string
          current_quantity?: number
          farm_id?: string | null
          feed_consumed?: number
          feed_unit?: string | null
          id?: string
          initial_quantity?: number
          mortality_count?: number
          notes?: string | null
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      livestock_births: {
        Row: {
          birth_date: string
          created_at: string
          created_by: string
          farm_id: string | null
          id: string
          mother_id: string
          newborn_count: number
          notes: string | null
        }
        Insert: {
          birth_date?: string
          created_at?: string
          created_by: string
          farm_id?: string | null
          id?: string
          mother_id: string
          newborn_count?: number
          notes?: string | null
        }
        Update: {
          birth_date?: string
          created_at?: string
          created_by?: string
          farm_id?: string | null
          id?: string
          mother_id?: string
          newborn_count?: number
          notes?: string | null
        }
        Relationships: []
      }
      notebook_notes: {
        Row: {
          content: string | null
          created_at: string
          created_by: string
          crop_id: string | null
          farm_id: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by: string
          crop_id?: string | null
          farm_id?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string
          crop_id?: string | null
          farm_id?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          audit_reminders: boolean
          created_at: string
          financial_reports: boolean
          id: string
          low_stock_alerts: boolean
          payment_confirmations: boolean
          system_updates: boolean
          task_reminders: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          audit_reminders?: boolean
          created_at?: string
          financial_reports?: boolean
          id?: string
          low_stock_alerts?: boolean
          payment_confirmations?: boolean
          system_updates?: boolean
          task_reminders?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          audit_reminders?: boolean
          created_at?: string
          financial_reports?: boolean
          id?: string
          low_stock_alerts?: boolean
          payment_confirmations?: boolean
          system_updates?: boolean
          task_reminders?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          farm_location: string | null
          id: string
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          farm_location?: string | null
          id?: string
          name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          farm_location?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profit_disbursements: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string
          disbursed_on: string
          farm_id: string
          id: string
          notes: string | null
          recipient: string
          source_id: string | null
          source_kind: string
          source_name: string
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by: string
          disbursed_on?: string
          farm_id: string
          id?: string
          notes?: string | null
          recipient: string
          source_id?: string | null
          source_kind: string
          source_name: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string
          disbursed_on?: string
          farm_id?: string
          id?: string
          notes?: string | null
          recipient?: string
          source_id?: string | null
          source_kind?: string
          source_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profit_disbursements_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      programme_activities: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          day_offset: number
          id: string
          name: string
          notes: string | null
          priority: string | null
          programme_id: string
          scheduled_date: string
          sort_order: number
          task_id: string | null
          task_type: string | null
          updated_at: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          day_offset?: number
          id?: string
          name: string
          notes?: string | null
          priority?: string | null
          programme_id: string
          scheduled_date: string
          sort_order?: number
          task_id?: string | null
          task_type?: string | null
          updated_at?: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          day_offset?: number
          id?: string
          name?: string
          notes?: string | null
          priority?: string | null
          programme_id?: string
          scheduled_date?: string
          sort_order?: number
          task_id?: string | null
          task_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programme_activities_programme_id_fkey"
            columns: ["programme_id"]
            isOneToOne: false
            referencedRelation: "crop_programmes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programme_activities_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      programme_templates: {
        Row: {
          created_at: string
          created_by: string
          crop_type: string | null
          description: string | null
          id: string
          name: string
          next_crop_family: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          crop_type?: string | null
          description?: string | null
          id?: string
          name: string
          next_crop_family?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          crop_type?: string | null
          description?: string | null
          id?: string
          name?: string
          next_crop_family?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          farm_id: string | null
          id: string
          item_name: string | null
          linked_module: string | null
          linked_record_id: string | null
          linked_record_name: string | null
          notes: string | null
          payment_status: string | null
          purchase_date: string
          quantity: number | null
          received_date: string | null
          supplier: string | null
          supplier_contact: string | null
          total_cost: number | null
          unit: string | null
          unit_cost: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          farm_id?: string | null
          id?: string
          item_name?: string | null
          linked_module?: string | null
          linked_record_id?: string | null
          linked_record_name?: string | null
          notes?: string | null
          payment_status?: string | null
          purchase_date?: string
          quantity?: number | null
          received_date?: string | null
          supplier?: string | null
          supplier_contact?: string | null
          total_cost?: number | null
          unit?: string | null
          unit_cost?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          farm_id?: string | null
          id?: string
          item_name?: string | null
          linked_module?: string | null
          linked_record_id?: string | null
          linked_record_name?: string | null
          notes?: string | null
          payment_status?: string | null
          purchase_date?: string
          quantity?: number | null
          received_date?: string | null
          supplier?: string | null
          supplier_contact?: string | null
          total_cost?: number | null
          unit?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          content: Json | null
          created_at: string
          created_by: string
          farm_id: string | null
          file_url: string | null
          id: string
          period_end: string | null
          period_start: string | null
          report_type: string
          status: string | null
          title: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          created_by: string
          farm_id?: string | null
          file_url?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          report_type: string
          status?: string | null
          title: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          created_by?: string
          farm_id?: string | null
          file_url?: string | null
          id?: string
          period_end?: string | null
          period_start?: string | null
          report_type?: string
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          buyer: string | null
          buyer_contact: string | null
          created_at: string
          created_by: string
          farm_id: string | null
          id: string
          linked_module: string | null
          linked_record_id: string | null
          linked_record_name: string | null
          notes: string | null
          payment_status: string | null
          product_id: string | null
          product_name: string | null
          product_type: string | null
          quantity: number | null
          sale_date: string
          total_amount: number | null
          unit: string | null
          unit_price: number | null
        }
        Insert: {
          buyer?: string | null
          buyer_contact?: string | null
          created_at?: string
          created_by: string
          farm_id?: string | null
          id?: string
          linked_module?: string | null
          linked_record_id?: string | null
          linked_record_name?: string | null
          notes?: string | null
          payment_status?: string | null
          product_id?: string | null
          product_name?: string | null
          product_type?: string | null
          quantity?: number | null
          sale_date?: string
          total_amount?: number | null
          unit?: string | null
          unit_price?: number | null
        }
        Update: {
          buyer?: string | null
          buyer_contact?: string | null
          created_at?: string
          created_by?: string
          farm_id?: string | null
          id?: string
          linked_module?: string | null
          linked_record_id?: string | null
          linked_record_name?: string | null
          notes?: string | null
          payment_status?: string | null
          product_id?: string | null
          product_name?: string | null
          product_type?: string | null
          quantity?: number | null
          sale_date?: string
          total_amount?: number | null
          unit?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
      season_challenges: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          farm_id: string | null
          id: string
          season: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          farm_id?: string | null
          id?: string
          season?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          farm_id?: string | null
          id?: string
          season?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          task_id: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          task_id: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          task_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_notifications_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed: boolean
          created_at: string
          created_by: string
          description: string | null
          farm_id: string | null
          id: string
          inputs_used: Json | null
          notes: string | null
          parent_task_id: string | null
          priority: string
          recurrence: string | null
          recurrence_end_date: string | null
          reminder_sent: boolean | null
          status: string | null
          task_date: string
          task_time: string | null
          task_type: string
          title: string
          updated_at: string
          workers: string[] | null
        }
        Insert: {
          assigned_to?: string | null
          completed?: boolean
          created_at?: string
          created_by: string
          description?: string | null
          farm_id?: string | null
          id?: string
          inputs_used?: Json | null
          notes?: string | null
          parent_task_id?: string | null
          priority?: string
          recurrence?: string | null
          recurrence_end_date?: string | null
          reminder_sent?: boolean | null
          status?: string | null
          task_date: string
          task_time?: string | null
          task_type: string
          title: string
          updated_at?: string
          workers?: string[] | null
        }
        Update: {
          assigned_to?: string | null
          completed?: boolean
          created_at?: string
          created_by?: string
          description?: string | null
          farm_id?: string | null
          id?: string
          inputs_used?: Json | null
          notes?: string | null
          parent_task_id?: string | null
          priority?: string
          recurrence?: string | null
          recurrence_end_date?: string | null
          reminder_sent?: boolean | null
          status?: string | null
          task_date?: string
          task_time?: string | null
          task_type?: string
          title?: string
          updated_at?: string
          workers?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      template_stages: {
        Row: {
          created_at: string
          day_offset: number
          id: string
          name: string
          notes: string | null
          priority: string | null
          sort_order: number
          task_type: string | null
          template_id: string
        }
        Insert: {
          created_at?: string
          day_offset?: number
          id?: string
          name: string
          notes?: string | null
          priority?: string | null
          sort_order?: number
          task_type?: string | null
          template_id: string
        }
        Update: {
          created_at?: string
          day_offset?: number
          id?: string
          name?: string
          notes?: string | null
          priority?: string | null
          sort_order?: number
          task_type?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_stages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "programme_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      venture_budgets: {
        Row: {
          ai_advice: string | null
          costs_total: number
          created_at: string
          created_by: string
          farm_id: string | null
          id: string
          inputs: Json
          name: string
          profit: number
          revenue_total: number
          updated_at: string
          venture_type: string
        }
        Insert: {
          ai_advice?: string | null
          costs_total?: number
          created_at?: string
          created_by: string
          farm_id?: string | null
          id?: string
          inputs?: Json
          name: string
          profit?: number
          revenue_total?: number
          updated_at?: string
          venture_type: string
        }
        Update: {
          ai_advice?: string | null
          costs_total?: number
          created_at?: string
          created_by?: string
          farm_id?: string | null
          id?: string
          inputs?: Json
          name?: string
          profit?: number
          revenue_total?: number
          updated_at?: string
          venture_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "venture_budgets_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_recurring_tasks: { Args: never; Returns: undefined }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_farm_member: {
        Args: { _farm_id: string; _user_id: string }
        Returns: boolean
      }
      is_farm_owner: {
        Args: { _farm_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      user_role: "admin" | "staff" | "farmer"
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
      user_role: ["admin", "staff", "farmer"],
    },
  },
} as const
