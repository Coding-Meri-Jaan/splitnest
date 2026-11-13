import {
  computeDashboardAnalytics,
  type AnalyticsExpense,
  type AnalyticsSettlement,
  type DashboardAnalytics,
  type GroupNetSnapshot,
} from "@/lib/analytics";
import {
  resolveAnalyticsFilters,
  type DashboardQuery,
  type ResolvedAnalyticsFilters,
} from "@/lib/analytics-filters";
import {
  buildGroups,
  loadLedger,
  memberMap,
  type Ledger,
} from "@/lib/data/groups";
import { computeNetBalances } from "@/lib/money";
import { canEditLedger } from "@/lib/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CATEGORY_IDS, type CategoryId, type GroupView } from "@/types";

export interface DashboardGroupOption {
  id: string;
  name: string;
  emoji: string;
}

export interface DashboardPageData {
  analytics: DashboardAnalytics;
  filters: ResolvedAnalyticsFilters;
  /** Every group the user belongs to, for the "Your nests" card. */
  groups: GroupView[];
  groupOptions: DashboardGroupOption[];
  categoryOptions: CategoryId[];
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const bucket = map.get(key(item));
    if (bucket) bucket.push(item);
    else map.set(key(item), [item]);
  }
  return map;
}

/**
 * Computes each group's member-level balance once. The dashboard needs both
 * the signed-in user's net (for the totals) and every peer's net (for the
 * outstanding list), and settlements must already be applied to both.
 */
function buildSnapshots(ledger: Ledger, groups: GroupView[]): GroupNetSnapshot[] {
  const infoById = new Map(groups.map((group) => [group.id, group]));
  const splitsByExpense = groupBy(ledger.splits, (split) => split.expense_id);
  const expensesByGroup = groupBy(ledger.expenses, (expense) => expense.group_id);
  const settlementsByGroup = groupBy(
    ledger.settlements,
    (settlement) => settlement.group_id,
  );

  return ledger.groups.map((group) => {
    const info = infoById.get(group.id);
    const expenses = expensesByGroup.get(group.id) ?? [];
    const settlements = settlementsByGroup.get(group.id) ?? [];

    const memberNetPaise = computeNetBalances(
      expenses.map((expense) => ({
        paidBy: expense.paid_by,
        amountPaise: expense.amount_paise,
        splits: (splitsByExpense.get(expense.id) ?? []).map((split) => ({
          userId: split.user_id,
          sharePaise: split.share_paise,
        })),
      })),
      settlements.map((settlement) => ({
        fromUser: settlement.from_user,
        toUser: settlement.to_user,
        amountPaise: settlement.amount_paise,
      })),
    );

    return {
      group: {
        id: group.id,
        name: group.name,
        emoji: group.emoji,
        canEdit: canEditLedger(info?.role ?? null),
      },
      memberNetPaise,
    };
  });
}

export async function getDashboardAnalytics(
  userId: string,
  query: DashboardQuery,
  now: Date = new Date(),
): Promise<DashboardPageData> {
  const supabase = await createSupabaseServerClient();
  const ledger = await loadLedger(supabase);

  const groups = buildGroups(ledger, userId);
  const validGroupIds = new Set(groups.map((group) => group.id));
  const filters = resolveAnalyticsFilters(query, now, validGroupIds);

  const peopleMap = memberMap(ledger);
  const people: Record<string, string> = {};
  for (const [id, person] of peopleMap) {
    people[id] = person.name;
  }

  const splitsByExpense = groupBy(ledger.splits, (split) => split.expense_id);

  const expenses: AnalyticsExpense[] = ledger.expenses.map((expense) => ({
    id: expense.id,
    groupId: expense.group_id,
    title: expense.title,
    amountPaise: expense.amount_paise,
    paidBy: expense.paid_by,
    category: expense.category,
    spentAt: expense.spent_at,
    createdAt: expense.created_at,
    splitMode: expense.split_mode,
    splits: (splitsByExpense.get(expense.id) ?? []).map((split) => ({
      userId: split.user_id,
      sharePaise: split.share_paise,
    })),
  }));

  const settlements: AnalyticsSettlement[] = ledger.settlements.map((settlement) => ({
    id: settlement.id,
    groupId: settlement.group_id,
    fromUser: settlement.from_user,
    toUser: settlement.to_user,
    amountPaise: settlement.amount_paise,
    settledAt: settlement.settled_at,
    method: settlement.method,
  }));

  const analytics = computeDashboardAnalytics({
    userId,
    expenses,
    settlements,
    snapshots: buildSnapshots(ledger, groups),
    people,
    filters,
  });

  return {
    analytics,
    filters,
    groups,
    groupOptions: groups
      .map((group) => ({ id: group.id, name: group.name, emoji: group.emoji }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    categoryOptions: [...CATEGORY_IDS],
  };
}
