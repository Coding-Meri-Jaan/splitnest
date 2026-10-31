export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ExpenseCategory =
  | "food"
  | "travel"
  | "groceries"
  | "rent"
  | "utilities"
  | "entertainment"
  | "shopping"
  | "other";

export type MemberRole = "owner" | "member";
export type SettlementMethod = "upi" | "cash" | "bank_transfer" | "other";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          city: string | null;
          upi_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string;
          city?: string | null;
          upi_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string;
          city?: string | null;
          upi_id?: string | null;
        };
        Relationships: [];
      };
      groups: {
        Row: {
          id: string;
          name: string;
          emoji: string;
          created_by: string;
          created_at: string;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          emoji?: string;
          created_by: string;
          created_at?: string;
          archived_at?: string | null;
        };
        Update: {
          name?: string;
          emoji?: string;
          archived_at?: string | null;
        };
        Relationships: [];
      };
      group_members: {
        Row: {
          group_id: string;
          user_id: string;
          role: MemberRole;
          joined_at: string;
        };
        Insert: {
          group_id: string;
          user_id: string;
          role?: MemberRole;
          joined_at?: string;
        };
        Update: {
          role?: MemberRole;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          group_id: string;
          title: string;
          amount_paise: number;
          paid_by: string;
          category: ExpenseCategory;
          spent_at: string;
          notes: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          title: string;
          amount_paise: number;
          paid_by: string;
          category?: ExpenseCategory;
          spent_at?: string;
          notes?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          title?: string;
          amount_paise?: number;
          paid_by?: string;
          category?: ExpenseCategory;
          spent_at?: string;
          notes?: string | null;
        };
        Relationships: [];
      };
      expense_splits: {
        Row: {
          expense_id: string;
          user_id: string;
          share_paise: number;
        };
        Insert: {
          expense_id: string;
          user_id: string;
          share_paise: number;
        };
        Update: {
          share_paise?: number;
        };
        Relationships: [];
      };
      settlements: {
        Row: {
          id: string;
          group_id: string;
          from_user: string;
          to_user: string;
          amount_paise: number;
          method: SettlementMethod;
          note: string | null;
          settled_at: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          from_user: string;
          to_user: string;
          amount_paise: number;
          method?: SettlementMethod;
          note?: string | null;
          settled_at?: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          amount_paise?: number;
          method?: SettlementMethod;
          note?: string | null;
          settled_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_group_member: { Args: { gid: string }; Returns: boolean };
      is_group_owner: { Args: { gid: string }; Returns: boolean };
      shares_group_with: { Args: { target_user: string }; Returns: boolean };
      find_user_for_invite: {
        Args: { gid: string; lookup_email: string };
        Returns: { id: string; full_name: string }[];
      };
      create_expense: {
        Args: {
          p_group_id: string;
          p_title: string;
          p_amount_paise: number;
          p_paid_by: string;
          p_category: ExpenseCategory;
          p_spent_at: string;
          p_notes: string | null;
          p_splits: Json;
        };
        Returns: string;
      };
    };
    Enums: {
      expense_category: ExpenseCategory;
      member_role: MemberRole;
      settlement_method: SettlementMethod;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
