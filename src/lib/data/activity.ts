import type { SupabaseClient } from "@supabase/supabase-js";

import {
  compareActivity,
  expenseMatchesMember,
  paginateActivity,
  settlementMatchesMember,
  summarizeActivityAmounts,
} from "@/lib/activity";
import {
  ACTIVITY_PAGE_SIZE,
  hasActiveActivityFilters,
  resolveActivityFilters,
  type ActivityQuery,
  type ResolvedActivityFilters,
} from "@/lib/activity-filters";
import { isMissingSchemaMessage, SchemaMissingError } from "@/lib/data/errors";
import { getGroupDetail } from "@/lib/data/groups";
import { summarizeReactions } from "@/lib/discussion";
import { displayName } from "@/lib/display-name";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  CATEGORY_IDS,
  type ActivityExpenseItem,
  type ActivityItem,
  type ActivitySettlementItem,
  type ActivitySummary,
  type CategoryId,
  type ExpenseView,
  type GroupView,
  type SettlementView,
} from "@/types";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;
type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];
type SplitRow = Database["public"]["Tables"]["expense_splits"]["Row"];
type SettlementRow = Database["public"]["Tables"]["settlements"]["Row"];

type ExpenseScanRow = Pick<
  ExpenseRow,
  | "id"
  | "group_id"
  | "title"
  | "amount_paise"
  | "paid_by"
  | "category"
  | "spent_at"
  | "notes"
  | "created_by"
  | "created_at"
  | "split_mode"
>;

type SettlementScanRow = Pick<
  SettlementRow,
  | "id"
  | "group_id"
  | "from_user"
  | "to_user"
  | "amount_paise"
  | "method"
  | "note"
  | "settled_at"
  | "created_by"
  | "created_at"
>;

type SplitScanRow = Pick<
  SplitRow,
  "expense_id" | "user_id" | "share_paise" | "split_value"
>;

const toRupees = (paise: number) => paise / 100;
const SCAN_PAGE_SIZE = 1_000;

function fail(context: string, message: string): never {
  const fullMessage = `Could not load ${context}: ${message}`;
  if (isMissingSchemaMessage(message)) {
    throw new SchemaMissingError(fullMessage);
  }
  throw new Error(fullMessage);
}

/**
 * Reads every matching row in 1,000-row windows. PostgREST caps a single
 * response, so without this a mature ledger would silently lose its oldest
 * activity and the summary would under-count.
 */
async function fetchAllExpenses(
  supabase: Client,
  filters: ResolvedActivityFilters,
): Promise<ExpenseScanRow[]> {
  const rows: ExpenseScanRow[] = [];

  for (let offset = 0; ; offset += SCAN_PAGE_SIZE) {
    let query = supabase
      .from("expenses")
      .select(
        "id, group_id, title, amount_paise, paid_by, category, spent_at, notes, created_by, created_at, split_mode",
      )
      .order("spent_at", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: true });

    if (filters.from) query = query.gte("spent_at", filters.from);
    if (filters.to) query = query.lte("spent_at", filters.to);
    if (filters.category) query = query.eq("category", filters.category);

    const { data, error } = await query.range(
      offset,
      offset + SCAN_PAGE_SIZE - 1,
    );
    if (error) fail("expenses", error.message);

    const page = (data ?? []) as ExpenseScanRow[];
    rows.push(...page);
    if (page.length < SCAN_PAGE_SIZE) break;
  }

  return rows;
}

async function fetchAllSettlements(
  supabase: Client,
  filters: ResolvedActivityFilters,
): Promise<SettlementScanRow[]> {
  const rows: SettlementScanRow[] = [];

  for (let offset = 0; ; offset += SCAN_PAGE_SIZE) {
    let query = supabase
      .from("settlements")
      .select(
        "id, group_id, from_user, to_user, amount_paise, method, note, settled_at, created_by, created_at",
      )
      .order("settled_at", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: true });

    if (filters.from) query = query.gte("settled_at", filters.from);
    if (filters.to) query = query.lte("settled_at", filters.to);

    const { data, error } = await query.range(
      offset,
      offset + SCAN_PAGE_SIZE - 1,
    );
    if (error) fail("settlements", error.message);

    const page = (data ?? []) as SettlementScanRow[];
    rows.push(...page);
    if (page.length < SCAN_PAGE_SIZE) break;
  }

  return rows;
}

export interface ActivityMemberOption {
  id: string;
  name: string;
}

export interface ActivityPageData {
  summary: ActivitySummary;
  items: ActivityItem[];
  filters: ResolvedActivityFilters;
  page: number;
  pageCount: number;
  totalCount: number;
  pageSize: number;
  memberOptions: ActivityMemberOption[];
  categoryOptions: CategoryId[];
  hasGroups: boolean;
  hasFilters: boolean;
}

export async function getActivityPage(
  userId: string,
  query: ActivityQuery,
  now: Date = new Date(),
): Promise<ActivityPageData> {
  const supabase = await createSupabaseServerClient();

  const [groupsResult, membershipsResult, profilesResult] = await Promise.all([
    supabase.from("groups").select("id, name, emoji"),
    supabase.from("group_members").select("group_id, user_id"),
    supabase.from("profiles").select("id, email, full_name"),
  ]);

  if (groupsResult.error) fail("your groups", groupsResult.error.message);
  if (membershipsResult.error) {
    fail("group members", membershipsResult.error.message);
  }
  if (profilesResult.error) {
    fail("member profiles", profilesResult.error.message);
  }

  const groups = groupsResult.data ?? [];
  const memberships = membershipsResult.data ?? [];
  const profiles = profilesResult.data ?? [];

  const people = new Map(
    profiles.map((profile) => [
      profile.id,
      displayName(profile, "Former member"),
    ]),
  );
  const groupNames = new Map(groups.map((group) => [group.id, group.name]));
  const groupEmojis = new Map(
    groups.map((group) => [group.id, group.emoji]),
  );

  const validMemberIds = new Set(memberships.map((row) => row.user_id));
  validMemberIds.add(userId);

  const filters = resolveActivityFilters(query, now, validMemberIds);

  const includeExpenses = filters.kind !== "settlement";
  const includeSettlements =
    filters.kind !== "expense" && filters.category === null;

  let memberExpenseIds = new Set<string>();
  if (filters.memberId && includeExpenses) {
    const { data, error } = await supabase
      .from("expense_splits")
      .select("expense_id")
      .eq("user_id", filters.memberId);
    if (error) fail("expense splits", error.message);
    memberExpenseIds = new Set((data ?? []).map((row) => row.expense_id));
  }

  const [expenseRows, settlementRows] = await Promise.all([
    includeExpenses
      ? fetchAllExpenses(supabase, filters)
      : Promise.resolve([] as ExpenseScanRow[]),
    includeSettlements
      ? fetchAllSettlements(supabase, filters)
      : Promise.resolve([] as SettlementScanRow[]),
  ]);

  const visibleExpenses = expenseRows.filter((row) =>
    expenseMatchesMember(
      { id: row.id, paidBy: row.paid_by },
      filters.memberId,
      memberExpenseIds,
    ),
  );
  const visibleSettlements = settlementRows.filter((row) =>
    settlementMatchesMember(
      { fromUser: row.from_user, toUser: row.to_user },
      filters.memberId,
    ),
  );

  const expenseItems: ActivityExpenseItem[] = visibleExpenses.map((row) => ({
    id: row.id,
    kind: "expense",
    title: row.title,
    groupId: row.group_id,
    groupName: groupNames.get(row.group_id) ?? "Group",
    groupEmoji: groupEmojis.get(row.group_id) ?? "👥",
    amount: toRupees(row.amount_paise),
    date: row.spent_at,
    createdAt: row.created_at,
    paidById: row.paid_by,
    paidByName: people.get(row.paid_by) ?? "Former member",
    createdById: row.created_by,
    createdByName: people.get(row.created_by) ?? "Former member",
    isUserPayer: row.paid_by === userId,
    category: row.category,
    notes: row.notes,
    splitMode: row.split_mode,
    splitCount: 0,
    userShare: null,
    participants: [],
    commentCount: 0,
    reactions: [],
  }));

  const settlementItems: ActivitySettlementItem[] = visibleSettlements.map(
    (row) => {
      const fromName = people.get(row.from_user) ?? "Former member";
      const toName = people.get(row.to_user) ?? "Former member";

      return {
        id: row.id,
        kind: "settlement",
        title: `${fromName} paid ${toName}`,
        groupId: row.group_id,
        groupName: groupNames.get(row.group_id) ?? "Group",
        groupEmoji: groupEmojis.get(row.group_id) ?? "👥",
        amount: toRupees(row.amount_paise),
        date: row.settled_at,
        createdAt: row.created_at,
        fromUserId: row.from_user,
        fromName,
        toUserId: row.to_user,
        toName,
        createdById: row.created_by,
        createdByName: people.get(row.created_by) ?? "Former member",
        method: row.method,
        note: row.note,
        direction:
          row.to_user === userId
            ? "in"
            : row.from_user === userId
              ? "out"
              : "other",
      };
    },
  );

  const sortable = [...expenseItems, ...settlementItems].map((item) => ({
    item,
    sortValue: {
      id: item.id,
      kind: item.kind,
      date: item.date,
      createdAt: item.createdAt,
      amountPaise: Math.round(item.amount * 100),
    },
  }));
  sortable.sort((a, b) =>
    compareActivity(a.sortValue, b.sortValue, filters.sort),
  );
  const sortedItems = sortable.map((entry) => entry.item);

  const paginated = paginateActivity(
    sortedItems,
    filters.page,
    ACTIVITY_PAGE_SIZE,
  );

  const pageExpenseIds = paginated.items
    .filter((item): item is ActivityExpenseItem => item.kind === "expense")
    .map((item) => item.id);

  if (pageExpenseIds.length > 0) {
    const [splitsResult, commentsResult, reactionsResult] = await Promise.all([
      supabase
        .from("expense_splits")
        .select("expense_id, user_id, share_paise, split_value")
        .in("expense_id", pageExpenseIds),
      // Discussion is additive: a database that has not run migration 0006
      // still renders the timeline, just without comment counts.
      supabase
        .from("expense_comments")
        .select("expense_id")
        .in("expense_id", pageExpenseIds),
      supabase
        .from("expense_reactions")
        .select("expense_id, user_id, emoji")
        .in("expense_id", pageExpenseIds)
        .is("comment_id", null),
    ]);

    if (splitsResult.error) fail("expense splits", splitsResult.error.message);

    const splitsByExpense = new Map<string, SplitScanRow[]>();
    for (const split of (splitsResult.data ?? []) as SplitScanRow[]) {
      const bucket = splitsByExpense.get(split.expense_id);
      if (bucket) bucket.push(split);
      else splitsByExpense.set(split.expense_id, [split]);
    }

    const commentCounts = new Map<string, number>();
    if (!commentsResult.error) {
      for (const comment of commentsResult.data ?? []) {
        commentCounts.set(
          comment.expense_id,
          (commentCounts.get(comment.expense_id) ?? 0) + 1,
        );
      }
    }

    const reactionsByExpense = new Map<
      string,
      { emoji: string; userId: string; userName: string }[]
    >();
    if (!reactionsResult.error) {
      for (const reaction of reactionsResult.data ?? []) {
        const bucket = reactionsByExpense.get(reaction.expense_id) ?? [];
        bucket.push({
          emoji: reaction.emoji,
          userId: reaction.user_id,
          userName: people.get(reaction.user_id) ?? "Former member",
        });
        reactionsByExpense.set(reaction.expense_id, bucket);
      }
    }

    for (const item of paginated.items) {
      if (item.kind !== "expense") continue;

      const participants = (splitsByExpense.get(item.id) ?? [])
        .map((split) => ({
          userId: split.user_id,
          name: people.get(split.user_id) ?? "Former member",
          share: toRupees(split.share_paise),
          inputValue:
            split.split_value === null ? null : Number(split.split_value),
          isCurrentUser: split.user_id === userId,
        }))
        .sort(
          (a, b) => b.share - a.share || a.name.localeCompare(b.name),
        );

      item.participants = participants;
      item.splitCount = participants.length;
      item.userShare =
        participants.find((participant) => participant.isCurrentUser)?.share ??
        null;
      item.commentCount = commentCounts.get(item.id) ?? 0;
      item.reactions = summarizeReactions(
        reactionsByExpense.get(item.id) ?? [],
        userId,
      );
    }
  }

  const amounts = summarizeActivityAmounts(
    visibleExpenses.map((row) => ({
      amountPaise: row.amount_paise,
      category: row.category,
    })),
    visibleSettlements.map((row) => ({ amountPaise: row.amount_paise })),
  );

  const latestCandidates = [
    ...visibleExpenses.map((row) => ({
      date: row.spent_at,
      createdAt: row.created_at,
      kind: "expense" as const,
      title: row.title,
    })),
    ...visibleSettlements.map((row) => ({
      date: row.settled_at,
      createdAt: row.created_at,
      kind: "settlement" as const,
      title: `${people.get(row.from_user) ?? "Someone"} paid ${
        people.get(row.to_user) ?? "someone"
      }`,
    })),
  ].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      b.createdAt.localeCompare(a.createdAt),
  );
  const latest = latestCandidates[0] ?? null;

  const memberOptions = [...validMemberIds]
    .map((id) => ({ id, name: people.get(id) ?? "Member" }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const summary: ActivitySummary = {
    totalSpent: toRupees(amounts.totalSpentPaise),
    expenseCount: amounts.expenseCount,
    totalSettled: toRupees(amounts.totalSettledPaise),
    settlementCount: amounts.settlementCount,
    latestDate: latest?.date ?? null,
    latestTitle: latest?.title ?? null,
    latestKind: latest?.kind ?? null,
    topCategories: amounts.categoryTotals.slice(0, 3).map((category) => ({
      category: category.category,
      amount: toRupees(category.amountPaise),
      count: category.count,
      fraction: category.fraction,
    })),
  };

  return {
    summary,
    items: paginated.items,
    filters: { ...filters, page: paginated.page },
    page: paginated.page,
    pageCount: paginated.pageCount,
    totalCount: paginated.totalCount,
    pageSize: ACTIVITY_PAGE_SIZE,
    memberOptions,
    categoryOptions: [...CATEGORY_IDS],
    hasGroups: groups.length > 0,
    hasFilters: hasActiveActivityFilters(filters),
  };
}

export interface ExpenseDetailData {
  group: GroupView;
  expense: ExpenseView;
  settlements: SettlementView[];
}

/**
 * The group loader already applies RLS and returns null when the signed-in
 * user cannot see the group, so this reuses that boundary instead of adding a
 * second, easier-to-miss permission path.
 */
export async function getExpenseDetail(
  userId: string,
  groupId: string,
  expenseId: string,
): Promise<ExpenseDetailData | null> {
  const detail = await getGroupDetail(userId, groupId);
  if (!detail) return null;

  const expense = detail.expenses.find((item) => item.id === expenseId);
  if (!expense) return null;

  return {
    group: detail.group,
    expense,
    settlements: detail.settlements,
  };
}
