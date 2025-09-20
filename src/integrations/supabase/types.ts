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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      billboards: {
        Row: {
          "@IMAGE": string | null
          Ad_Type: string | null
          Billboard_Name: string | null
          Category_Level: string | null
          City: string | null
          Contract_Number: number | null
          Customer_Name: string | null
          Days_Count: string | null
          District: string | null
          Faces_Count: string | null
          GPS_Coordinates: string | null
          GPS_Link: string | null
          GPS_Link_Click: string | null
          ID: number
          Image_URL: string | null
          Level: string | null
          Municipality: string | null
          Nearest_Landmark: string | null
          Order_Size: string | null
          Price: string | null
          Rent_End_Date: string | null
          Rent_Start_Date: string | null
          Review: string | null
          Size: string | null
          Status: string | null
          "المقاس مع الدغاية": string | null
        }
        Insert: {
          "@IMAGE"?: string | null
          Ad_Type?: string | null
          Billboard_Name?: string | null
          Category_Level?: string | null
          City?: string | null
          Contract_Number?: number | null
          Customer_Name?: string | null
          Days_Count?: string | null
          District?: string | null
          Faces_Count?: string | null
          GPS_Coordinates?: string | null
          GPS_Link?: string | null
          GPS_Link_Click?: string | null
          ID: number
          Image_URL?: string | null
          Level?: string | null
          Municipality?: string | null
          Nearest_Landmark?: string | null
          Order_Size?: string | null
          Price?: string | null
          Rent_End_Date?: string | null
          Rent_Start_Date?: string | null
          Review?: string | null
          Size?: string | null
          Status?: string | null
          "المقاس مع الدغاية"?: string | null
        }
        Update: {
          "@IMAGE"?: string | null
          Ad_Type?: string | null
          Billboard_Name?: string | null
          Category_Level?: string | null
          City?: string | null
          Contract_Number?: number | null
          Customer_Name?: string | null
          Days_Count?: string | null
          District?: string | null
          Faces_Count?: string | null
          GPS_Coordinates?: string | null
          GPS_Link?: string | null
          GPS_Link_Click?: string | null
          ID?: number
          Image_URL?: string | null
          Level?: string | null
          Municipality?: string | null
          Nearest_Landmark?: string | null
          Order_Size?: string | null
          Price?: string | null
          Rent_End_Date?: string | null
          Rent_Start_Date?: string | null
          Review?: string | null
          Size?: string | null
          Status?: string | null
          "المقاس مع الدغاية"?: string | null
        }
        Relationships: []
      }
      Contract: {
        Row: {
          "3% Fee": string | null
          "Actual 3% Fee": string | null
          "Ad Type": string | null
          billboard_id: number | null
          Company: string | null
          "Contract Date": string | null
          Contract_Number: number
          "Customer Name": string | null
          customer_id: string | null
          Discount: number | null
          Duration: string | null
          "End Date": string | null
          "Installation Cost": number | null
          Level: string | null
          "Payment 1": string | null
          "Payment 2": string | null
          "Payment 3": string | null
          Phone: string | null
          "Print Status": string | null
          Remaining: string | null
          "Renewal Status": string | null
          Total: string | null
          "Total Paid": string | null
          "Total Rent": number | null
        }
        Insert: {
          "3% Fee"?: string | null
          "Actual 3% Fee"?: string | null
          "Ad Type"?: string | null
          billboard_id?: number | null
          Company?: string | null
          "Contract Date"?: string | null
          Contract_Number: number
          "Customer Name"?: string | null
          customer_id?: string | null
          Discount?: number | null
          Duration?: string | null
          "End Date"?: string | null
          "Installation Cost"?: number | null
          Level?: string | null
          "Payment 1"?: string | null
          "Payment 2"?: string | null
          "Payment 3"?: string | null
          Phone?: string | null
          "Print Status"?: string | null
          Remaining?: string | null
          "Renewal Status"?: string | null
          Total?: string | null
          "Total Paid"?: string | null
          "Total Rent"?: number | null
        }
        Update: {
          "3% Fee"?: string | null
          "Actual 3% Fee"?: string | null
          "Ad Type"?: string | null
          billboard_id?: number | null
          Company?: string | null
          "Contract Date"?: string | null
          Contract_Number?: number
          "Customer Name"?: string | null
          customer_id?: string | null
          Discount?: number | null
          Duration?: string | null
          "End Date"?: string | null
          "Installation Cost"?: number | null
          Level?: string | null
          "Payment 1"?: string | null
          "Payment 2"?: string | null
          "Payment 3"?: string | null
          Phone?: string | null
          "Print Status"?: string | null
          Remaining?: string | null
          "Renewal Status"?: string | null
          Total?: string | null
          "Total Paid"?: string | null
          "Total Rent"?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_contract_customer"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_financials"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "fk_contract_customer"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_payments: {
        Row: {
          amount: number
          contract_number: number | null
          created_at: string
          customer_id: string | null
          customer_name: string
          entry_type: string | null
          id: string
          method: string | null
          notes: string | null
          paid_at: string
          reference: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          contract_number?: number | null
          created_at?: string
          customer_id?: string | null
          customer_name: string
          entry_type?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          paid_at?: string
          reference?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          contract_number?: number | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string
          entry_type?: string | null
          id?: string
          method?: string | null
          notes?: string | null
          paid_at?: string
          reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_financials"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "customer_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          company: string | null
          contracts_count: number | null
          created_at: string | null
          email: string | null
          first_contract_date: string | null
          id: string
          last_contract_date: string | null
          name: string
          phone: string | null
          total_rent: number | null
          updated_at: string | null
        }
        Insert: {
          company?: string | null
          contracts_count?: number | null
          created_at?: string | null
          email?: string | null
          first_contract_date?: string | null
          id?: string
          last_contract_date?: string | null
          name: string
          phone?: string | null
          total_rent?: number | null
          updated_at?: string | null
        }
        Update: {
          company?: string | null
          contracts_count?: number | null
          created_at?: string | null
          email?: string | null
          first_contract_date?: string | null
          id?: string
          last_contract_date?: string | null
          name?: string
          phone?: string | null
          total_rent?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      installation_print_pricing: {
        Row: {
          created_at: string
          id: string
          install_price: number
          print_price: number
          size: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          install_price?: number
          print_price?: number
          size: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          install_price?: number
          print_price?: number
          size?: string
          updated_at?: string
        }
        Relationships: []
      }
      pricing: {
        Row: {
          "2_Months": number | null
          "3_Months": number | null
          "6_Months": number | null
          Billboard_Level: string | null
          Customer_Category: string | null
          Full_Year: number | null
          id: number
          One_Day: number | null
          One_Month: number | null
          size: string | null
        }
        Insert: {
          "2_Months"?: number | null
          "3_Months"?: number | null
          "6_Months"?: number | null
          Billboard_Level?: string | null
          Customer_Category?: string | null
          Full_Year?: number | null
          id: number
          One_Day?: number | null
          One_Month?: number | null
          size?: string | null
        }
        Update: {
          "2_Months"?: number | null
          "3_Months"?: number | null
          "6_Months"?: number | null
          Billboard_Level?: string | null
          Customer_Category?: string | null
          Full_Year?: number | null
          id?: number
          One_Day?: number | null
          One_Month?: number | null
          size?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          allowed_clients: string[] | null
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          price_tier: string | null
          role: string | null
        }
        Insert: {
          allowed_clients?: string[] | null
          created_at?: string | null
          email?: string | null
          id: string
          name?: string | null
          price_tier?: string | null
          role?: string | null
        }
        Update: {
          allowed_clients?: string[] | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          price_tier?: string | null
          role?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          allowed_customers: string[] | null
          company: string | null
          created_at: string | null
          email: string
          id: string
          name: string | null
          password: string
          phone: string | null
          pricing_category: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          allowed_customers?: string[] | null
          company?: string | null
          created_at?: string | null
          email: string
          id?: string
          name?: string | null
          password: string
          phone?: string | null
          pricing_category?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          allowed_customers?: string[] | null
          company?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          password?: string
          phone?: string | null
          pricing_category?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      customer_financials: {
        Row: {
          contracts_count: number | null
          customer_id: string | null
          name: string | null
          total_contracts_amount: number | null
          total_paid: number | null
          total_remaining: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
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
