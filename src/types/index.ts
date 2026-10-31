export type CategoryId =
  | "food"
  | "travel"
  | "groceries"
  | "rent"
  | "utilities"
  | "entertainment"
  | "shopping"
  | "other";

export interface Member {
  id: string;
  name: string;
  email: string;
  city: string;
}

export interface Group {
  id: string;
  name: string;
  emoji: string;
  memberIds: string[];
  netBalance: number;
}

export interface Expense {
  id: string;
  groupId: string;
  title: string;
  amount: number;
  paidById: string;
  date: string;
  category: CategoryId;
}

export interface Balance {
  memberId: string;
  amount: number;
}

export interface DashboardSummary {
  youAreOwed: number;
  youOwe: number;
  netBalance: number;
  activeGroups: number;
}
