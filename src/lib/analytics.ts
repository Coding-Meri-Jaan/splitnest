/**
 * Pure analytics for the personal expense dashboard.
 *
 * Every amount is integer paise, matching `lib/money.ts`. The data loader
 * (`lib/data/dashboard.ts`) is responsible for turning Supabase rows into the
 * input shapes below; this file only does arithmetic, filtering and grouping,
 * which keeps it easy to unit-test without a database.
 *
 * Two different kinds of number live here and must not be confused:
 *
 * - "flow" numbers (paid, share, categories, trends) describe the expenses
 *   inside the active date/group/category filters.
 * - "balance" numbers (you owe, owed to you, net outstanding) are live ledger
 *   balances. They are scoped by group only, because a date filter must never
 *   pretend a debt disappeared. The UI labels this distinction.
 */

import type { CategoryId, ExpenseSplitMode } from "@/types";

export type TrendGranularity = "monthly" | "yearly";
export type OutstandingKind = "payable" | "receivable";

export interface AnalyticsFilters {
  /** Inclusive YYYY-MM-DD, or null for "since the beginning". */
  from: string | null;
  /** Inclusive YYYY-MM-DD, or null for "until today". */
  to: string | null;
  groupId: string | null;
  category: CategoryId | null;
  granularity: TrendGranularity;
}

export interface AnalyticsExpense {
  id: string;
  groupId: string;
  title: string;
  amountPaise: number;
  paidBy: string;
  category: CategoryId;
  spentAt: string;
  createdAt: string;
  splitMode: ExpenseSplitMode;
  splits: { userId: string; sharePaise: number }[];
}

export interface AnalyticsSettlement {
  id: string;
  groupId: string;
  fromUser: string;
  toUser: string;
  amountPaise: number;
  settledAt: string;
  method: "upi" | "cash" | "bank_transfer" | "other";
}

export interface AnalyticsGroupInfo {
  id: string;
  name: string;
  emoji: string;
  /** Whether the signed-in user may record expenses/settlements here. */
  canEdit: boolean;
}

export interface GroupNetSnapshot {
  group: AnalyticsGroupInfo;
  /**
   * Net paise per member for this group's whole ledger. Positive means the
   * group owes that member. Settlements are already applied.
   */
  memberNetPaise: Record<string, number>;
}

export interface AnalyticsInput {
  userId: string;
  expenses: AnalyticsExpense[];
  settlements: AnalyticsSettlement[];
  snapshots: GroupNetSnapshot[];
  /** id -> display name for everyone the ledger mentions. */
  people: Record<string, string>;
  filters: AnalyticsFilters;
}

export interface TrendPoint {
  key: string;
  label: string;
  paidPaise: number;
  sharePaise: number;
  spentPaise: number;
  count: number;
}

export interface CategorySlice {
  category: CategoryId;
  sharePaise: number;
  paidPaise: number;
  count: number;
  fraction: number;
}

export interface GroupSlice {
  groupId: string;
  name: string;
  emoji: string;
  sharePaise: number;
  paidPaise: number;
  count: number;
  fraction: number;
}

export interface ActivityEntry {
  id: string;
  kind: "expense" | "settlement";
  title: string;
  groupId: string;
  groupName: string;
  groupEmoji: string;
  date: string;
  amountPaise: number;
  actorName: string;
  counterpartyName: string | null;
  /** Null when the user was excluded from an expense's split. */
  userSharePaise: number | null;
  isUserPayer: boolean;
  splitMode: ExpenseSplitMode | null;
  category: CategoryId | null;
  /** For settlements only: money into or out of the user's pocket. */
  direction: "in" | "out" | "other" | null;
}

export interface OutstandingEntry {
  groupId: string;
  groupName: string;
  groupEmoji: string;
  canSettle: boolean;
  memberId: string;
  memberName: string;
  amountPaise: number;
  kind: OutstandingKind;
}

export interface DashboardAnalytics {
  filters: AnalyticsFilters;
  overview: {
    totalPaidPaise: number;
    personalSharePaise: number;
    totalSpentPaise: number;
    averageExpensePaise: number;
    averageSharePaise: number;
    expenseCount: number;
  };
  comparison: {
    paidPaise: number;
    sharePaise: number;
    /** Positive: the user fronted more than their own share. */
    differencePaise: number;
  };
  balances: {
    youOwePaise: number;
    youAreOwedPaise: number;
    netOutstandingPaise: number;
    groupCount: number;
  };
  trend: {
    points: TrendPoint[];
    maxPaise: number;
    truncated: boolean;
    granularity: TrendGranularity;
  };
  categories: {
    slices: CategorySlice[];
    totalSharePaise: number;
  };
  groups: {
    slices: GroupSlice[];
    totalSharePaise: number;
  };
  activity: ActivityEntry[];
  outstanding: OutstandingEntry[];
  totals: {
    allExpenseCount: number;
    allSettlementCount: number;
    filteredExpenseCount: number;
    filteredSettlementCount: number;
    allGroupCount: number;
    filteredGroupCount: number;
  };
  hasAnyExpenses: boolean;
  hasAnyLedger: boolean;
  hasFilteredData: boolean;
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MAX_MONTH_BUCKETS = 24;
const MAX_YEAR_BUCKETS = 10;

function dateKey(value: string): string {
  return value.slice(0, 10);
}

function inDateRange(value: string, from: string | null, to: string | null): boolean {
  const key = dateKey(value);
  if (from !== null && key < from) return false;
  if (to !== null && key > to) return false;
  return true;
}

function expenseMatches(expense: AnalyticsExpense, filters: AnalyticsFilters): boolean {
  if (filters.groupId !== null && expense.groupId !== filters.groupId) return false;
  if (filters.category !== null && expense.category !== filters.category) return false;
  return inDateRange(expense.spentAt, filters.from, filters.to);
}

function settlementMatches(
  settlement: AnalyticsSettlement,
  filters: AnalyticsFilters,
): boolean {
  if (filters.groupId !== null && settlement.groupId !== filters.groupId) return false;
  return inDateRange(settlement.settledAt, filters.from, filters.to);
}

function userShare(expense: AnalyticsExpense, userId: string): number | null {
  const split = expense.splits.find((row) => row.userId === userId);
  return split ? split.sharePaise : null;
}

function monthKey(value: string): string {
  return dateKey(value).slice(0, 7);
}

function yearKey(value: string): string {
  return dateKey(value).slice(0, 4);
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  const label = MONTH_LABELS[Number(month) - 1] ?? "?";
  return `${label} ${year.slice(2)}`;
}

function fillMonthBuckets(keys: string[]): string[] {
  if (keys.length === 0) return [];
  const sorted = [...new Set(keys)].sort();
  const [startYear, startMonth] = sorted[0].split("-").map(Number);
  const [endYear, endMonth] = sorted[sorted.length - 1].split("-").map(Number);

  const buckets: string[] = [];
  let year = startYear;
  let month = startMonth;
  while (year < endYear || (year === endYear && month <= endMonth)) {
    buckets.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return buckets;
}

function fillYearBuckets(keys: string[]): string[] {
  if (keys.length === 0) return [];
  const sorted = [...new Set(keys)].sort();
  const start = Number(sorted[0]);
  const end = Number(sorted[sorted.length - 1]);

  const buckets: string[] = [];
  for (let year = start; year <= end; year += 1) {
    buckets.push(String(year));
  }
  return buckets;
}

function buildTrend(
  expenses: AnalyticsExpense[],
  userId: string,
  granularity: TrendGranularity,
): DashboardAnalytics["trend"] {
  const buckets = new Map<
    string,
    { paidPaise: number; sharePaise: number; spentPaise: number; count: number }
  >();

  const keyFor = granularity === "monthly" ? monthKey : yearKey;

  for (const expense of expenses) {
    const key = keyFor(expense.spentAt);
    const bucket = buckets.get(key) ?? {
      paidPaise: 0,
      sharePaise: 0,
      spentPaise: 0,
      count: 0,
    };
    bucket.spentPaise += expense.amountPaise;
    bucket.count += 1;
    if (expense.paidBy === userId) {
      bucket.paidPaise += expense.amountPaise;
    }
    const share = userShare(expense, userId);
    if (share !== null) {
      bucket.sharePaise += share;
    }
    buckets.set(key, bucket);
  }

  const filled =
    granularity === "monthly"
      ? fillMonthBuckets([...buckets.keys()])
      : fillYearBuckets([...buckets.keys()]);

  const limit = granularity === "monthly" ? MAX_MONTH_BUCKETS : MAX_YEAR_BUCKETS;
  const truncated = filled.length > limit;
  const visible = truncated ? filled.slice(-limit) : filled;
  const empty = { paidPaise: 0, sharePaise: 0, spentPaise: 0, count: 0 };

  const points: TrendPoint[] = visible.map((key) => {
    const bucket = buckets.get(key) ?? empty;
    return {
      key,
      label: granularity === "monthly" ? monthLabel(key) : key,
      ...bucket,
    };
  });

  const maxPaise = points.reduce(
    (max, point) => Math.max(max, point.paidPaise, point.sharePaise),
    0,
  );

  return { points, maxPaise, truncated, granularity };
}

function buildCategorySlices(
  expenses: AnalyticsExpense[],
  userId: string,
): DashboardAnalytics["categories"] {
  const buckets = new Map<
    CategoryId,
    { sharePaise: number; paidPaise: number; count: number }
  >();

  for (const expense of expenses) {
    const share = userShare(expense, userId) ?? 0;
    const paid = expense.paidBy === userId ? expense.amountPaise : 0;
    if (share === 0 && paid === 0) continue;

    const bucket = buckets.get(expense.category) ?? {
      sharePaise: 0,
      paidPaise: 0,
      count: 0,
    };
    bucket.sharePaise += share;
    bucket.paidPaise += paid;
    bucket.count += 1;
    buckets.set(expense.category, bucket);
  }

  const totalSharePaise = [...buckets.values()].reduce(
    (sum, bucket) => sum + bucket.sharePaise,
    0,
  );

  const slices: CategorySlice[] = [...buckets.entries()]
    .filter(([, bucket]) => bucket.sharePaise > 0)
    .map(([category, bucket]) => ({
      category,
      sharePaise: bucket.sharePaise,
      paidPaise: bucket.paidPaise,
      count: bucket.count,
      fraction: totalSharePaise > 0 ? bucket.sharePaise / totalSharePaise : 0,
    }))
    .sort((a, b) => b.sharePaise - a.sharePaise || a.category.localeCompare(b.category));

  return { slices, totalSharePaise };
}

function buildGroupSlices(
  expenses: AnalyticsExpense[],
  userId: string,
  groupInfo: Map<string, AnalyticsGroupInfo>,
): DashboardAnalytics["groups"] {
  const buckets = new Map<
    string,
    { sharePaise: number; paidPaise: number; count: number }
  >();

  for (const expense of expenses) {
    const share = userShare(expense, userId) ?? 0;
    const paid = expense.paidBy === userId ? expense.amountPaise : 0;
    if (share === 0 && paid === 0) continue;

    const bucket = buckets.get(expense.groupId) ?? {
      sharePaise: 0,
      paidPaise: 0,
      count: 0,
    };
    bucket.sharePaise += share;
    bucket.paidPaise += paid;
    bucket.count += 1;
    buckets.set(expense.groupId, bucket);
  }

  const totalSharePaise = [...buckets.values()].reduce(
    (sum, bucket) => sum + bucket.sharePaise,
    0,
  );

  const slices: GroupSlice[] = [...buckets.entries()]
    .filter(([, bucket]) => bucket.sharePaise > 0)
    .map(([groupId, bucket]) => {
      const info = groupInfo.get(groupId);
      return {
        groupId,
        name: info?.name ?? "Group",
        emoji: info?.emoji ?? "👥",
        sharePaise: bucket.sharePaise,
        paidPaise: bucket.paidPaise,
        count: bucket.count,
        fraction: totalSharePaise > 0 ? bucket.sharePaise / totalSharePaise : 0,
      };
    })
    .sort((a, b) => b.sharePaise - a.sharePaise || a.name.localeCompare(b.name));

  return { slices, totalSharePaise };
}

function buildActivity(
  expenses: AnalyticsExpense[],
  settlements: AnalyticsSettlement[],
  userId: string,
  people: Record<string, string>,
  groupInfo: Map<string, AnalyticsGroupInfo>,
  includeSettlements: boolean,
): ActivityEntry[] {
  const entries: ActivityEntry[] = [];

  for (const expense of expenses) {
    const info = groupInfo.get(expense.groupId);
    entries.push({
      id: `expense-${expense.id}`,
      kind: "expense",
      title: expense.title,
      groupId: expense.groupId,
      groupName: info?.name ?? "Group",
      groupEmoji: info?.emoji ?? "👥",
      date: expense.spentAt,
      amountPaise: expense.amountPaise,
      actorName: people[expense.paidBy] ?? "Former member",
      counterpartyName: null,
      userSharePaise: userShare(expense, userId),
      isUserPayer: expense.paidBy === userId,
      splitMode: expense.splitMode,
      category: expense.category,
      direction: null,
    });
  }

  if (includeSettlements) {
    for (const settlement of settlements) {
      const info = groupInfo.get(settlement.groupId);
      const fromName = people[settlement.fromUser] ?? "Former member";
      const toName = people[settlement.toUser] ?? "Former member";
      entries.push({
        id: `settlement-${settlement.id}`,
        kind: "settlement",
        title: `${fromName} paid ${toName}`,
        groupId: settlement.groupId,
        groupName: info?.name ?? "Group",
        groupEmoji: info?.emoji ?? "👥",
        date: settlement.settledAt,
        amountPaise: settlement.amountPaise,
        actorName: fromName,
        counterpartyName: toName,
        userSharePaise: null,
        isUserPayer: settlement.fromUser === userId,
        splitMode: null,
        category: null,
        direction:
          settlement.toUser === userId
            ? "in"
            : settlement.fromUser === userId
              ? "out"
              : "other",
      });
    }
  }

  return entries
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return a.id.localeCompare(b.id);
    })
    .slice(0, 8);
}

/**
 * Turns per-group member nets into the actionable list the dashboard shows.
 *
 * Positive `memberNetPaise` means the group owes that member, so the amount
 * this user is owed is the negation. This mirrors the per-member balances on a
 * group page, which keeps the dashboard, the group page and the "you owe /
 * owed to you" totals telling the same story.
 */
export function buildOutstandingEntries(
  snapshots: GroupNetSnapshot[],
  userId: string,
  people: Record<string, string>,
  groupId: string | null = null,
): OutstandingEntry[] {
  const entries: OutstandingEntry[] = [];

  for (const snapshot of snapshots) {
    if (groupId !== null && snapshot.group.id !== groupId) continue;

    for (const [memberId, netPaise] of Object.entries(snapshot.memberNetPaise)) {
      if (memberId === userId || netPaise === 0) continue;
      const amountPaise = -netPaise;
      entries.push({
        groupId: snapshot.group.id,
        groupName: snapshot.group.name,
        groupEmoji: snapshot.group.emoji,
        canSettle: snapshot.group.canEdit,
        memberId,
        memberName: people[memberId] ?? "Former member",
        amountPaise,
        kind: amountPaise > 0 ? "receivable" : "payable",
      });
    }
  }

  return entries.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "payable" ? -1 : 1;
    return Math.abs(b.amountPaise) - Math.abs(a.amountPaise);
  });
}

export function computeDashboardAnalytics(input: AnalyticsInput): DashboardAnalytics {
  const { userId, expenses, settlements, snapshots, people, filters } = input;

  const filteredExpenses = expenses.filter((expense) => expenseMatches(expense, filters));
  const filteredSettlements = settlements.filter((settlement) =>
    settlementMatches(settlement, filters),
  );

  const groupInfo = new Map<string, AnalyticsGroupInfo>(
    snapshots.map((snapshot) => [snapshot.group.id, snapshot.group]),
  );

  let totalPaidPaise = 0;
  let personalSharePaise = 0;
  let totalSpentPaise = 0;

  for (const expense of filteredExpenses) {
    totalSpentPaise += expense.amountPaise;
    if (expense.paidBy === userId) {
      totalPaidPaise += expense.amountPaise;
    }
    const share = userShare(expense, userId);
    if (share !== null) {
      personalSharePaise += share;
    }
  }

  const expenseCount = filteredExpenses.length;
  const averageExpensePaise =
    expenseCount > 0 ? Math.round(totalSpentPaise / expenseCount) : 0;
  const averageSharePaise =
    expenseCount > 0 ? Math.round(personalSharePaise / expenseCount) : 0;

  const outstanding = buildOutstandingEntries(snapshots, userId, people, filters.groupId);
  let youAreOwedPaise = 0;
  let youOwePaise = 0;
  for (const entry of outstanding) {
    if (entry.amountPaise > 0) youAreOwedPaise += entry.amountPaise;
    else youOwePaise += -entry.amountPaise;
  }

  const scopedGroups = snapshots.filter(
    (snapshot) => filters.groupId === null || snapshot.group.id === filters.groupId,
  );

  const categories = buildCategorySlices(filteredExpenses, userId);
  const groups = buildGroupSlices(filteredExpenses, userId, groupInfo);
  const trend = buildTrend(filteredExpenses, userId, filters.granularity);
  const activity = buildActivity(
    filteredExpenses,
    filteredSettlements,
    userId,
    people,
    groupInfo,
    filters.category === null,
  );

  return {
    filters,
    overview: {
      totalPaidPaise,
      personalSharePaise,
      totalSpentPaise,
      averageExpensePaise,
      averageSharePaise,
      expenseCount,
    },
    comparison: {
      paidPaise: totalPaidPaise,
      sharePaise: personalSharePaise,
      differencePaise: totalPaidPaise - personalSharePaise,
    },
    balances: {
      youOwePaise,
      youAreOwedPaise,
      netOutstandingPaise: youAreOwedPaise - youOwePaise,
      groupCount: scopedGroups.length,
    },
    trend,
    categories,
    groups,
    activity,
    outstanding,
    totals: {
      allExpenseCount: expenses.length,
      allSettlementCount: settlements.length,
      filteredExpenseCount: filteredExpenses.length,
      filteredSettlementCount: filteredSettlements.length,
      allGroupCount: snapshots.length,
      filteredGroupCount: scopedGroups.length,
    },
    hasAnyExpenses: expenses.length > 0,
    hasAnyLedger: expenses.length > 0 || settlements.length > 0,
    hasFilteredData:
      filteredExpenses.length > 0 ||
      (filters.category === null && filteredSettlements.length > 0),
  };
}
