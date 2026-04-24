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
      profiles: {
        Row: {
          id: string
          username: string
          full_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          username: string
          full_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          full_name?: string | null
          created_at?: string
        }
      }
      accounts: {
        Row: {
          id: string
          user_id: string
          name: string
          type: string
          currency: string
          balance: number
          initial_balance: number
          color: string
          icon: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          name: string
          type: string
          currency: string
          balance?: number
          initial_balance?: number
          color?: string
          icon?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          type?: string
          currency?: string
          balance?: number
          initial_balance?: number
          color?: string
          icon?: string
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          account_id: string
          type: string
          category_id: string | null
          amount: number
          currency: string
          description: string
          transaction_date: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          account_id: string
          type: string
          category_id?: string | null
          amount: number
          currency: string
          description?: string
          transaction_date: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          type?: string
          category_id?: string | null
          amount?: number
          currency?: string
          description?: string
          transaction_date?: string
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          user_id: string | null
          name: string
          type: string
          color: string
          icon: string
          is_default: boolean
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          type: string
          color: string
          icon: string
          is_default?: boolean
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          type?: string
          color?: string
          icon?: string
          is_default?: boolean
        }
      }
      exchange_rates: {
        Row: {
          currency_code: string
          rate_to_try: number
          rate_type: string
          updated_at: string
        }
        Insert: {
          currency_code: string
          rate_to_try: number
          rate_type: string
          updated_at?: string
        }
        Update: {
          currency_code?: string
          rate_to_try?: number
          rate_type?: string
          updated_at?: string
        }
      }
      funds: {
        Row: {
          code: string
          name: string
          category: string
          company: string
          currency: string
        }
        Insert: {
          code: string
          name: string
          category: string
          company: string
          currency: string
        }
        Update: {
          code?: string
          name?: string
          category?: string
          company?: string
          currency?: string
        }
      }
      user_funds: {
        Row: {
          id: string
          user_id: string
          fund_code: string
          shares: number
          purchase_price: number
          current_price: number
          last_price_update: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          fund_code: string
          shares: number
          purchase_price: number
          current_price?: number
          last_price_update?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          fund_code?: string
          shares?: number
          purchase_price?: number
          current_price?: number
          last_price_update?: string
          created_at?: string
        }
      }
      net_worth_history: {
        Row: {
          id: string
          user_id: string
          total_try: number
          record_date: string
        }
        Insert: {
          id?: string
          user_id?: string
          total_try: number
          record_date: string
        }
        Update: {
          id?: string
          user_id?: string
          total_try?: number
          record_date?: string
        }
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
  }
}
