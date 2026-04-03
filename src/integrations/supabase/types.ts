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
      crops: {
        Row: {
          acreage: number | null
          created_at: string
          created_by: string
          farm_id: string | null
          farm_location: string
          harvest_date: string | null
          id: string
          name: string
          notes: string | null
          planting_date: string | null
          season: string | null
          status: string | null
          type: string
          updated_at: string
          yield_quantity: number | null
          yield_unit: string | null
        }
        Insert: {
          acreage?: number | null
          created_at?: string
          created_by: string
          farm_id?: string | null
          farm_location: string
          harvest_date?: string | null
          id?: string
          name: string
          notes?: string | null
          planting_date?: string | null
          season?: string | null
          status?: string | null
          type: string
          updated_at?: string
          yield_quantity?: number | null
          yield_unit?: string | null
        }
        Update: {
          acreage?: number | null
          created_at?: string
          created_by?: string
          farm_id?: string | null
          farm_location?: string
          harvest_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          planting_date?: string | null
          season?: string | null
          status?: string | null
          type?: string
          updated_at?: string
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
          notes: string | null
          purchase_date: string | null
          purchase_price: number | null
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
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
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
          notes?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
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
      purchases: {
        Row: {
          category: string
          created_at: string
          created_by: string
          farm_id: string | null
          id: string
          item_name: string
          notes: string | null
          payment_status: string | null
          purchase_date: string
          quantity: number
          received_date: string | null
          supplier: string
          supplier_contact: string | null
          total_cost: number | null
          unit: string
          unit_cost: number
        }
        Insert: {
          category: string
          created_at?: string
          created_by: string
          farm_id?: string | null
          id?: string
          item_name: string
          notes?: string | null
          payment_status?: string | null
          purchase_date?: string
          quantity: number
          received_date?: string | null
          supplier: string
          supplier_contact?: string | null
          total_cost?: number | null
          unit: string
          unit_cost: number
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          farm_id?: string | null
          id?: string
          item_name?: string
          notes?: string | null
          payment_status?: string | null
          purchase_date?: string
          quantity?: number
          received_date?: string | null
          supplier?: string
          supplier_contact?: string | null
          total_cost?: number | null
          unit?: string
          unit_cost?: number
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
          buyer: string
          buyer_contact: string | null
          created_at: string
          created_by: string
          farm_id: string | null
          id: string
          notes: string | null
          payment_status: string | null
          product_id: string
          product_name: string
          product_type: string
          quantity: number
          sale_date: string
          total_amount: number | null
          unit: string
          unit_price: number
        }
        Insert: {
          buyer: string
          buyer_contact?: string | null
          created_at?: string
          created_by: string
          farm_id?: string | null
          id?: string
          notes?: string | null
          payment_status?: string | null
          product_id: string
          product_name: string
          product_type: string
          quantity: number
          sale_date?: string
          total_amount?: number | null
          unit: string
          unit_price: number
        }
        Update: {
          buyer?: string
          buyer_contact?: string | null
          created_at?: string
          created_by?: string
          farm_id?: string | null
          id?: string
          notes?: string | null
          payment_status?: string | null
          product_id?: string
          product_name?: string
          product_type?: string
          quantity?: number
          sale_date?: string
          total_amount?: number | null
          unit?: string
          unit_price?: number
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
          parent_task_id: string | null
          priority: string
          recurrence: string | null
          recurrence_end_date: string | null
          reminder_sent: boolean | null
          task_date: string
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed?: boolean
          created_at?: string
          created_by: string
          description?: string | null
          farm_id?: string | null
          id?: string
          parent_task_id?: string | null
          priority?: string
          recurrence?: string | null
          recurrence_end_date?: string | null
          reminder_sent?: boolean | null
          task_date: string
          task_type: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed?: boolean
          created_at?: string
          created_by?: string
          description?: string | null
          farm_id?: string | null
          id?: string
          parent_task_id?: string | null
          priority?: string
          recurrence?: string | null
          recurrence_end_date?: string | null
          reminder_sent?: boolean | null
          task_date?: string
          task_type?: string
          title?: string
          updated_at?: string
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
