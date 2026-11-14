/**
 * Pure activity-timeline helpers.
 *
 * Database rows are mapped to these shapes in `lib/data/activity.ts`. Keeping
 * filtering, sorting, pagination and summary maths here makes the behaviour
 * testable without Supabase and keeps the loader focused on I/O.
 */

import type { ActivitySort } from "@/lib/activity-filters";
import type { CategoryId, ExpenseSplitMode } from "@/types";

export interface ActivityExpenseSource {
  id: string;
  groupId: string;
  title: string;
  amountPaise: number;
  paidBy: string;
  category: CategoryId;
  spentAt: string;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  splitMode: ExpenseSplitMode;
}

export interface ActivitySettlementSource {
  id: string;
  groupId: string;
  fromUser: string;
  toUser: string;
  amountPaise: number;
  method: "upi" | "cash" | "bank_transfer" | "other";
  note: string | null;
  settledAt: string;
  createdBy: string;
  createdAt: string;
}

export interface SortableActivity {
  id: string;
  kind: "expense" | "settlement";
  date: string;
  createdAt: string;
  amountPaise: number;
}

export function expenseMatchesMember(
  expense: Pick<ActivityExpenseSource, "id" | "paidBy">,
  memberId: string | null,
  memberExpenseIds: ReadonlySet<string>,
): boolean {
  if (memberId === null) return true;
  return expense.paidBy === memberId || memberExpenseIds.has(expense.id);
}

export function settlementMatchesMember(
  settlement: Pick<ActivitySettlementSource, "fromUser" | "toUser">,
  memberId: string | null,
): boolean {
  if (memberId === null) return true;
  return (
    settlement.fromUser === memberId || settlement.toUser === memberId
  );
}

export function compareActivity(
  a: SortableActivity,
  b: SortableActivity,
  sort: ActivitySort,
): number {
  if (sort === "amount") {
    if (a.amountPaise !== b.amountPaise) {
      return b.amountPaise - a.amountPaise;
    }
    const newest = b.date.localeCompare(a.date);
    if (newest !== 0) return newest;
    const recorded = b.createdAt.localeCompare(a.createdAt);
    if (recorded !== 0) return recorded;
  } else {
    const direction = sort === "oldest" ? 1 : -1;
    const date = direction * a.date.localeCompare(b.date);
    if (date !== 0) return date;
    const recorded = direction * a.createdAt.localeCompare(b.createdAt);
    if (recorded !== 0) return recorded;
  }

  if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
  return a.id.localeCompare(b.id);
}

export interface ActivityCategoryTotal {
  category: CategoryId;
  amountPaise: number;
  count: number;
  fraction: number;
}

export interface ActivityAmountSummary {
  totalSpentPaise: number;
  expenseCount: number;
  totalSettledPaise: number;
  settlementCount: number;
  categoryTotals: ActivityCategoryTotal[];
}

export function summarizeActivityAmounts(
  expenses: Pick<ActivityExpenseSource, "amountPaise" | "category">[],
  settlements: Pick<ActivitySettlementSource, "amountPaise">[],
): ActivityAmountSummary {
  const totalSpentPaise = expenses.reduce(
    (sum, expense) => sum + expense.amountPaise,
    0,
  );
  const totalSettledPaise = settlements.reduce(
    (sum, settlement) => sum + settlement.amountPaise,
    0,
  );

  const byCategory = new Map<
    CategoryId,
    { amountPaise: number; count: number }
  >();
  for (const expense of expenses) {
    const bucket = byCategory.get(expense.category) ?? {
      amountPaise: 0,
      count: 0,
    };
    bucket.amountPaise += expense.amountPaise;
    bucket.count += 1;
    byCategory.set(expense.category, bucket);
  }

  const categoryTotals = [...byCategory.entries()]
    .map(([category, bucket]) => ({
      category,
      amountPaise: bucket.amountPaise,
      count: bucket.count,
      fraction:
        totalSpentPaise > 0 ? bucket.amountPaise / totalSpentPaise : 0,
    }))
    .sort(
      (a, b) =>
        b.amountPaise - a.amountPaise || a.category.localeCompare(b.category),
    );

  return {
    totalSpentPaise,
    expenseCount: expenses.length,
    totalSettledPaise,
    settlementCount: settlements.length,
    categoryTotals,
  };
}

export interface PaginatedActivity<T> {
  items: T[];
  page: number;
  pageCount: number;
  totalCount: number;
  /** 1-based index of the first item on this page, or 0 when empty. */
  from: number;
  /** 1-based index of the last item on this page, or 0 when empty. */
  to: number;
}

export function paginateActivity<T>(
  items: T[],
  requestedPage: number,
  pageSize: number,
): PaginatedActivity<T> {
  const totalCount = items.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  return {
    items: pageItems,
    page,
    pageCount,
    totalCount,
    from: totalCount === 0 ? 0 : start + 1,
    to: start + pageItems.length,
  };
}
