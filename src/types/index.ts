export type CategoryId =
  | "food"
  | "travel"
  | "groceries"
  | "rent"
  | "utilities"
  | "entertainment"
  | "shopping"
  | "other";

/**
 * UI-facing view models.
 *
 * Amounts here are rupees (for `Intl.NumberFormat`); the database and all
 * arithmetic use integer paise. Conversion happens once, in the data layer.
 */

export interface Person {
  id: string;
  name: string;
  email: string;
  city: string | null;
}

export interface GroupView {
  id: string;
  name: string;
  emoji: string;
  creatorId: string;
  members: Person[];
  memberCount: number;
  /** Positive: the group owes you. Negative: you owe the group. */
  netBalance: number;
}

export interface ExpenseView {
  id: string;
  groupId: string;
  groupName: string;
  title: string;
  amount: number;
  paidById: string;
  paidByName: string;
  date: string;
  category: CategoryId;
  notes: string | null;
  createdById: string;
  /** Everyone sharing this expense. */
  splitUserIds: string[];
  splitCount: number;
}

export interface SettlementView {
  id: string;
  groupId: string;
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
  method: "upi" | "cash" | "bank_transfer" | "other";
  note: string | null;
  date: string;
  createdById: string;
}

export interface BalanceView {
  memberId: string;
  name: string;
  /** Positive: they owe you. Negative: you owe them. */
  amount: number;
}

export interface TransferView {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
  /** Present when the receiver has saved a UPI id. */
  toUpiId: string | null;
}

export interface DashboardSummary {
  youAreOwed: number;
  youOwe: number;
  netBalance: number;
  activeGroups: number;
}

export interface ActivityItem {
  id: string;
  kind: "expense" | "settlement";
  title: string;
  groupId: string;
  groupName: string;
  amount: number;
  date: string;
  actorName: string;
  category: CategoryId | null;
}

export interface GroupDetail {
  group: GroupView;
  expenses: ExpenseView[];
  settlements: SettlementView[];
  balances: BalanceView[];
  suggestedTransfers: TransferView[];
  totalSpent: number;
}
