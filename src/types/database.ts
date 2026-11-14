import type {
  ExpenseSplitMode,
  PollResultsVisibility,
  PollSelection,
} from "./index";

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

export type MemberRole = "owner" | "co_owner" | "editor" | "viewer";
export type SettlementMethod = "upi" | "cash" | "bank_transfer" | "other";
export type PollStatus = "open" | "closed" | "cancelled";

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
          split_mode: ExpenseSplitMode;
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
          split_mode?: ExpenseSplitMode;
        };
        Update: {
          title?: string;
          amount_paise?: number;
          paid_by?: string;
          category?: ExpenseCategory;
          spent_at?: string;
          notes?: string | null;
          split_mode?: ExpenseSplitMode;
        };
        Relationships: [];
      };
      expense_splits: {
        Row: {
          expense_id: string;
          user_id: string;
          share_paise: number;
          split_value: number | null;
        };
        Insert: {
          expense_id: string;
          user_id: string;
          share_paise: number;
          split_value?: number | null;
        };
        Update: {
          share_paise?: number;
          split_value?: number | null;
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
      expense_comments: {
        Row: {
          id: string;
          expense_id: string;
          group_id: string;
          author_id: string;
          parent_id: string | null;
          body: string;
          edited_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          expense_id: string;
          group_id: string;
          author_id: string;
          parent_id?: string | null;
          body: string;
          edited_at?: string | null;
          created_at?: string;
        };
        Update: {
          body?: string;
          edited_at?: string | null;
        };
        Relationships: [];
      };
      expense_comment_mentions: {
        Row: {
          comment_id: string;
          mentioned_user_id: string;
          created_at: string;
        };
        Insert: {
          comment_id: string;
          mentioned_user_id: string;
          created_at?: string;
        };
        Update: {
          created_at?: string;
        };
        Relationships: [];
      };
      expense_reactions: {
        Row: {
          id: string;
          expense_id: string;
          comment_id: string | null;
          group_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          expense_id: string;
          comment_id?: string | null;
          group_id: string;
          user_id: string;
          emoji: string;
          created_at?: string;
        };
        Update: {
          emoji?: string;
        };
        Relationships: [];
      };
      polls: {
        Row: {
          id: string;
          group_id: string;
          created_by: string;
          title: string;
          description: string | null;
          status: PollStatus;
          selection: PollSelection;
          results_visibility: PollResultsVisibility;
          is_anonymous: boolean;
          closes_at: string;
          closed_at: string | null;
          cancelled_at: string | null;
          deadline_reminder_sent_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          created_by: string;
          title: string;
          description?: string | null;
          status?: PollStatus;
          selection?: PollSelection;
          results_visibility?: PollResultsVisibility;
          is_anonymous?: boolean;
          closes_at: string;
          closed_at?: string | null;
          cancelled_at?: string | null;
          deadline_reminder_sent_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          status?: PollStatus;
          selection?: PollSelection;
          results_visibility?: PollResultsVisibility;
          is_anonymous?: boolean;
          closes_at?: string;
          closed_at?: string | null;
          cancelled_at?: string | null;
          deadline_reminder_sent_at?: string | null;
        };
        Relationships: [];
      };
      poll_options: {
        Row: {
          id: string;
          poll_id: string;
          label: string;
          image_url: string | null;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          poll_id: string;
          label: string;
          image_url?: string | null;
          position?: number;
          created_at?: string;
        };
        Update: {
          label?: string;
          image_url?: string | null;
          position?: number;
        };
        Relationships: [];
      };
      poll_votes: {
        Row: {
          id: string;
          poll_id: string;
          option_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          poll_id: string;
          option_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          option_id?: string;
        };
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          user_id: string;
          expense_comments: boolean;
          comment_replies: boolean;
          mentions: boolean;
          reactions: boolean;
          poll_updates: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          expense_comments?: boolean;
          comment_replies?: boolean;
          mentions?: boolean;
          reactions?: boolean;
          poll_updates?: boolean;
          updated_at?: string;
        };
        Update: {
          expense_comments?: boolean;
          comment_replies?: boolean;
          mentions?: boolean;
          reactions?: boolean;
          poll_updates?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          actor_id: string | null;
          type: string;
          group_id: string | null;
          group_name: string | null;
          expense_id: string | null;
          expense_title: string | null;
          comment_id: string | null;
          reaction_emoji: string | null;
          poll_id: string | null;
          poll_title: string | null;
          dedupe_key: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          actor_id?: string | null;
          type: string;
          group_id?: string | null;
          group_name?: string | null;
          expense_id?: string | null;
          expense_title?: string | null;
          comment_id?: string | null;
          reaction_emoji?: string | null;
          poll_id?: string | null;
          poll_title?: string | null;
          dedupe_key: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          read_at?: string | null;
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
          p_split_mode: ExpenseSplitMode;
          p_splits: Json;
        };
        Returns: string;
      };
      update_expense: {
        Args: {
          p_expense_id: string;
          p_group_id: string;
          p_title: string;
          p_amount_paise: number;
          p_paid_by: string;
          p_category: ExpenseCategory;
          p_spent_at: string;
          p_notes: string | null;
          p_split_mode: ExpenseSplitMode;
          p_splits: Json;
        };
        Returns: string;
      };
      create_poll: {
        Args: {
          p_group_id: string;
          p_title: string;
          p_description: string | null;
          p_closes_at: string;
          p_selection: PollSelection;
          p_is_anonymous: boolean;
          p_results_visibility: PollResultsVisibility;
          p_options: Json;
        };
        Returns: string;
      };
      update_poll: {
        Args: {
          p_poll_id: string;
          p_title: string;
          p_description: string | null;
          p_closes_at: string;
          p_selection: PollSelection;
          p_is_anonymous: boolean;
          p_results_visibility: PollResultsVisibility;
          p_options: Json;
        };
        Returns: string;
      };
      save_poll_votes: {
        Args: { p_poll_id: string; p_option_ids: string[] };
        Returns: undefined;
      };
      close_poll: {
        Args: { p_poll_id: string };
        Returns: undefined;
      };
      cancel_poll: {
        Args: { p_poll_id: string };
        Returns: undefined;
      };
      poll_results: {
        Args: { p_poll_id: string };
        Returns: Json;
      };
      sync_group_polls: {
        Args: { p_group_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      expense_category: ExpenseCategory;
      expense_split_mode: ExpenseSplitMode;
      member_role: MemberRole;
      settlement_method: SettlementMethod;
      poll_status: PollStatus;
      poll_selection: PollSelection;
      poll_results_visibility: PollResultsVisibility;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
