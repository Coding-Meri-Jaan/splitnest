import type { MemberRole } from "./database";

export const CATEGORY_IDS = [
  "food",
  "travel",
  "groceries",
  "rent",
  "utilities",
  "entertainment",
  "shopping",
  "other",
] as const;

export type CategoryId = (typeof CATEGORY_IDS)[number];

export function isCategoryId(value: string): value is CategoryId {
  return (CATEGORY_IDS as readonly string[]).includes(value);
}

export type ExpenseSplitMode = "equal" | "amount" | "percentage" | "shares";

export type ReactionEmoji = "👍" | "❤️" | "😂" | "👀" | "🙌" | "😮";

export interface ReactionSummary {
  emoji: ReactionEmoji;
  count: number;
  reactedByMe: boolean;
  /** Names of members who used this reaction, sorted alphabetically. */
  names: string[];
}

export interface DiscussionMember {
  id: string;
  name: string;
}

export interface CommentMentionView {
  id: string;
  name: string;
}

export interface CommentView {
  id: string;
  expenseId: string;
  parentId: string | null;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  isMine: boolean;
  canEdit: boolean;
  canDelete: boolean;
  mentions: CommentMentionView[];
  reactions: ReactionSummary[];
}

export type NotificationKind =
  | "expense_comment"
  | "comment_reply"
  | "mention"
  | "expense_reaction";

export interface NotificationView {
  id: string;
  kind: NotificationKind;
  actorId: string | null;
  actorName: string;
  groupId: string | null;
  groupName: string | null;
  expenseId: string | null;
  expenseTitle: string | null;
  commentId: string | null;
  reactionEmoji: string | null;
  read: boolean;
  createdAt: string;
  /** Null when the expense is no longer visible to this member. */
  href: string | null;
}

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
  /** This person's role inside the group that produced this view. */
  role?: MemberRole | null;
}

export interface GroupView {
  id: string;
  name: string;
  emoji: string;
  creatorId: string;
  members: Person[];
  memberCount: number;
  /** The signed-in user's role in this group. */
  role: MemberRole | null;
  /** Positive: the group owes you. Negative: you owe the group. */
  netBalance: number;
}

export interface ExpenseSplitView {
  userId: string;
  /** This person's share in rupees. */
  share: number;
  /** Percentage (0–100) or share weight; null for equal/exact splits. */
  inputValue: number | null;
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
  createdByName: string;
  /** When the row was recorded (not necessarily the expense date). */
  createdAt: string;
  splitMode: ExpenseSplitMode;
  /** Everyone sharing this expense, with their exact share. */
  splits: ExpenseSplitView[];
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

export interface ActivityParticipant {
  userId: string;
  name: string;
  /** This person's exact share in rupees. */
  share: number;
  /** Percentage (0–100) or share weight; null for equal/exact splits. */
  inputValue: number | null;
  isCurrentUser: boolean;
}

export interface ActivityExpenseItem {
  id: string;
  kind: "expense";
  title: string;
  groupId: string;
  groupName: string;
  groupEmoji: string;
  amount: number;
  /** The date the expense is attributed to (`spent_at`). */
  date: string;
  /** When the row was recorded (`created_at`). */
  createdAt: string;
  paidById: string;
  paidByName: string;
  createdById: string;
  createdByName: string;
  isUserPayer: boolean;
  category: CategoryId;
  notes: string | null;
  splitMode: ExpenseSplitMode;
  splitCount: number;
  /** Your exact share, or null when you were not in this split. */
  userShare: number | null;
  participants: ActivityParticipant[];
  /** Total comments and replies on this expense. */
  commentCount: number;
  /** Reactions left on the expense itself. */
  reactions: ReactionSummary[];
}

export interface ActivitySettlementItem {
  id: string;
  kind: "settlement";
  title: string;
  groupId: string;
  groupName: string;
  groupEmoji: string;
  amount: number;
  date: string;
  createdAt: string;
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  createdById: string;
  createdByName: string;
  method: SettlementView["method"];
  note: string | null;
  /** Money into or out of your pocket; "other" when it was between others. */
  direction: "in" | "out" | "other";
}

export type ActivityItem = ActivityExpenseItem | ActivitySettlementItem;

export interface ActivityCategorySummary {
  category: CategoryId;
  /** Total amount in rupees. */
  amount: number;
  count: number;
  /** Fraction of total expenditure (0–1). */
  fraction: number;
}

export interface ActivitySummary {
  /** Expense totals only; settlements never inflate this. */
  totalSpent: number;
  expenseCount: number;
  totalSettled: number;
  settlementCount: number;
  latestDate: string | null;
  latestTitle: string | null;
  latestKind: "expense" | "settlement" | null;
  topCategories: ActivityCategorySummary[];
}

export interface GroupDetail {
  group: GroupView;
  expenses: ExpenseView[];
  settlements: SettlementView[];
  balances: BalanceView[];
  suggestedTransfers: TransferView[];
  totalSpent: number;
}
