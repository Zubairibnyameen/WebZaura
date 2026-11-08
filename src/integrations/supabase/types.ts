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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_label: string | null
          created_at: string
          details: Json | null
          id: string
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          actor_label?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_label?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          company: string
          contact_name: string | null
          created_at: string
          created_by: string | null
          email: string | null
          gstin: string | null
          id: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company: string
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company?: string
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          body: string
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["comment_entity"]
          id: string
          mentions: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["comment_entity"]
          id?: string
          mentions?: string[]
          updated_at?: string
          user_id?: string
        }
        Update: {
          body?: string
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["comment_entity"]
          id?: string
          mentions?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          description: string
          id: string
          invoice_id: string
          item_discount: number
          position: number
          quantity: number
          unit_price: number
        }
        Insert: {
          description: string
          id?: string
          invoice_id: string
          item_discount?: number
          position?: number
          quantity?: number
          unit_price?: number
        }
        Update: {
          description?: string
          id?: string
          invoice_id?: string
          item_discount?: number
          position?: number
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          discount_amount: number
          discount_total: number
          due_date: string | null
          id: string
          issue_date: string
          notes: string | null
          number: string | null
          paid_total: number
          payment_status: Database["public"]["Enums"]["invoice_payment_status"]
          project_id: string | null
          quotation_id: string | null
          share_token: string
          subtotal: number
          tax_rate: number
          tax_total: number
          total: number
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          discount_total?: number
          due_date?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          number?: string | null
          paid_total?: number
          payment_status?: Database["public"]["Enums"]["invoice_payment_status"]
          project_id?: string | null
          quotation_id?: string | null
          share_token?: string
          subtotal?: number
          tax_rate?: number
          tax_total?: number
          total?: number
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          discount_total?: number
          due_date?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          number?: string | null
          paid_total?: number
          payment_status?: Database["public"]["Enums"]["invoice_payment_status"]
          project_id?: string | null
          quotation_id?: string | null
          share_token?: string
          subtotal?: number
          tax_rate?: number
          tax_total?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          body: string
          created_at: string
          id: string
          lead_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          lead_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          lead_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          client_id: string | null
          client_type: Database["public"]["Enums"]["client_type"] | null
          company: string | null
          converted_at: string | null
          created_at: string
          created_by: string | null
          email: string
          expected_value: number | null
          id: string
          lost_reason: string | null
          message: string | null
          name: string
          next_follow_up: string | null
          owner_id: string | null
          phone: string | null
          service_interest: string | null
          source: string
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          client_type?: Database["public"]["Enums"]["client_type"] | null
          company?: string | null
          converted_at?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          expected_value?: number | null
          id?: string
          lost_reason?: string | null
          message?: string | null
          name: string
          next_follow_up?: string | null
          owner_id?: string | null
          phone?: string | null
          service_interest?: string | null
          source?: string
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          client_type?: Database["public"]["Enums"]["client_type"] | null
          company?: string | null
          converted_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          expected_value?: number | null
          id?: string
          lost_reason?: string | null
          message?: string | null
          name?: string
          next_follow_up?: string | null
          owner_id?: string | null
          phone?: string | null
          service_interest?: string | null
          source?: string
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          method: Database["public"]["Enums"]["payment_method"]
          paid_on: string
          recorded_by: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          method?: Database["public"]["Enums"]["payment_method"]
          paid_on?: string
          recorded_by?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          paid_on?: string
          recorded_by?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          must_change_password: boolean
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id: string
          is_active?: boolean
          must_change_password?: boolean
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          must_change_password?: boolean
        }
        Relationships: []
      }
      project_files: {
        Row: {
          created_at: string
          file_name: string
          id: string
          mime_type: string | null
          project_id: string
          size: number
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          mime_type?: string | null
          project_id: string
          size: number
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          project_id?: string
          size?: number
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          name: string
          quotation_id: string | null
          service_type: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          name: string
          quotation_id?: string | null
          service_type?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          name?: string
          quotation_id?: string | null
          service_type?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          description: string
          id: string
          item_discount: number
          position: number
          quantity: number
          quotation_id: string
          service_id: string | null
          unit_price: number
        }
        Insert: {
          description: string
          id?: string
          item_discount?: number
          position?: number
          quantity?: number
          quotation_id: string
          service_id?: string | null
          unit_price?: number
        }
        Update: {
          description?: string
          id?: string
          item_discount?: number
          position?: number
          quantity?: number
          quotation_id?: string
          service_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          decided_at: string | null
          discount_total: number
          discount_type: Database["public"]["Enums"]["discount_kind"]
          discount_value: number
          id: string
          issue_date: string
          lead_id: string | null
          notes: string | null
          number: string | null
          share_token: string
          status: Database["public"]["Enums"]["quotation_status"]
          subtotal: number
          tax_rate: number
          tax_total: number
          terms: string | null
          total: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          discount_total?: number
          discount_type?: Database["public"]["Enums"]["discount_kind"]
          discount_value?: number
          id?: string
          issue_date?: string
          lead_id?: string | null
          notes?: string | null
          number?: string | null
          share_token?: string
          status?: Database["public"]["Enums"]["quotation_status"]
          subtotal?: number
          tax_rate?: number
          tax_total?: number
          terms?: string | null
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          discount_total?: number
          discount_type?: Database["public"]["Enums"]["discount_kind"]
          discount_value?: number
          id?: string
          issue_date?: string
          lead_id?: string | null
          notes?: string | null
          number?: string | null
          share_token?: string
          status?: Database["public"]["Enums"]["quotation_status"]
          subtotal?: number
          tax_rate?: number
          tax_total?: number
          terms?: string | null
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          window_start?: string
        }
        Update: {
          count?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string
          default_unit_price: number | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          position: number
        }
        Insert: {
          created_at?: string
          default_unit_price?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          position?: number
        }
        Update: {
          created_at?: string
          default_unit_price?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          position?: number
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          position: number
          project_id: string
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          project_id: string
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          project_id?: string
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_entity: {
        Args: {
          _id: string
          _type: Database["public"]["Enums"]["comment_entity"]
        }
        Returns: boolean
      }
      client_linked_to_me: { Args: { _client_id: string }; Returns: boolean }
      expire_quotations: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_user: { Args: { _user_id: string }; Returns: boolean }
      is_project_member: { Args: { _project_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      own_profile_is_active: { Args: never; Returns: boolean }
      own_profile_must_change_password: { Args: never; Returns: boolean }
      owns_lead: { Args: { _lead_id: string }; Returns: boolean }
      respond_to_quotation: {
        Args: { _accept: boolean; _token: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "member"
      client_type: "Business" | "Startup" | "Individual" | "NGO"
      comment_entity: "lead" | "client" | "project" | "quotation" | "invoice"
      discount_kind: "percent" | "amount"
      invoice_payment_status: "unpaid" | "partially_paid" | "paid"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "proposal_sent"
        | "negotiation"
        | "won"
        | "lost"
        | "quoted"
        | "negotiating"
      payment_method:
        | "upi"
        | "bank_transfer"
        | "cash"
        | "cheque"
        | "card"
        | "other"
      project_status:
        | "planning"
        | "in_progress"
        | "review"
        | "completed"
        | "on_hold"
      quotation_status: "draft" | "sent" | "accepted" | "rejected" | "expired"
      task_status: "todo" | "doing" | "done"
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
    Enums: {
      app_role: ["admin", "manager", "member"],
      client_type: ["Business", "Startup", "Individual", "NGO"],
      comment_entity: ["lead", "client", "project", "quotation", "invoice"],
      discount_kind: ["percent", "amount"],
      invoice_payment_status: ["unpaid", "partially_paid", "paid"],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "proposal_sent",
        "negotiation",
        "won",
        "lost",
        "quoted",
        "negotiating",
      ],
      payment_method: [
        "upi",
        "bank_transfer",
        "cash",
        "cheque",
        "card",
        "other",
      ],
      project_status: [
        "planning",
        "in_progress",
        "review",
        "completed",
        "on_hold",
      ],
      quotation_status: ["draft", "sent", "accepted", "rejected", "expired"],
      task_status: ["todo", "doing", "done"],
    },
  },
} as const
