/**
 * URL-param parsing and link building for the activity timeline.
 *
 * Pure on purpose: a malformed link (deleted member, bogus category, impossible
 * date) should degrade to the broad view instead of crashing the page, and the
 * same rules must apply on the server and in the filter controls.
 */

import {
  DATE_RANGE_OPTIONS,
  resolveDateRange,
  type DateRangeKey,
} from "@/lib/analytics-filters";
import { isCategoryId, type CategoryId } from "@/types";

export type ActivityKindFilter = "all" | "expense" | "settlement";
export type ActivitySort = "newest" | "oldest" | "amount";

export interface ActivityQuery {
  kind?: string | string[];
  member?: string | string[];
  category?: string | string[];
  range?: string | string[];
  from?: string | string[];
  to?: string | string[];
  sort?: string | string[];
  page?: string | string[];
}

export interface ActivityFilterState {
  kind: ActivityKindFilter;
  memberId: string | null;
  category: CategoryId | null;
  range: DateRangeKey;
  from: string | null;
  to: string | null;
  sort: ActivitySort;
}

export interface ResolvedActivityFilters extends ActivityFilterState {
  page: number;
}

export const ACTIVITY_PAGE_SIZE = 20;

export const ACTIVITY_KIND_OPTIONS: {
  value: ActivityKindFilter;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "expense", label: "Expenses" },
  { value: "settlement", label: "Settlements" },
];

export const ACTIVITY_SORT_OPTIONS: {
  value: ActivitySort;
  label: string;
}[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "amount", label: "Largest first" },
];

const KIND_KEYS = new Set<string>(
  ACTIVITY_KIND_OPTIONS.map((option) => option.value),
);
const SORT_KEYS = new Set<string>(
  ACTIVITY_SORT_OPTIONS.map((option) => option.value),
);
const RANGE_KEYS = new Set<string>(
  DATE_RANGE_OPTIONS.map((option) => option.value),
);
const MAX_PAGE = 10_000;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined): number {
  if (!value || !/^\d+$/.test(value)) return 1;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return 1;
  return Math.min(parsed, MAX_PAGE);
}

export function resolveActivityFilters(
  query: ActivityQuery,
  now: Date,
  validMemberIds: ReadonlySet<string>,
): ResolvedActivityFilters {
  const requestedKind = first(query.kind);
  const kind: ActivityKindFilter =
    requestedKind && KIND_KEYS.has(requestedKind)
      ? (requestedKind as ActivityKindFilter)
      : "all";

  const requestedCategory = first(query.category);
  // Settlements have no category. Clearing it here keeps switching between
  // "All" and "Settlements" from silently producing an empty ledger.
  const category: CategoryId | null =
    kind !== "settlement" &&
    requestedCategory &&
    isCategoryId(requestedCategory)
      ? requestedCategory
      : null;

  const requestedMember = first(query.member);
  const memberId =
    requestedMember && validMemberIds.has(requestedMember)
      ? requestedMember
      : null;

  const requestedRange = first(query.range);
  const rangeKey: DateRangeKey =
    requestedRange && RANGE_KEYS.has(requestedRange)
      ? (requestedRange as DateRangeKey)
      : "all";
  const range = resolveDateRange(
    rangeKey,
    first(query.from),
    first(query.to),
    now,
  );

  const requestedSort = first(query.sort);
  const sort: ActivitySort =
    requestedSort && SORT_KEYS.has(requestedSort)
      ? (requestedSort as ActivitySort)
      : "newest";

  return {
    kind,
    memberId,
    category,
    range: range.range,
    from: range.from,
    to: range.to,
    sort,
    page: parsePage(first(query.page)),
  };
}

export function hasActiveActivityFilters(
  filters: ActivityFilterState,
): boolean {
  return (
    filters.kind !== "all" ||
    filters.memberId !== null ||
    filters.category !== null ||
    filters.range !== "all" ||
    filters.sort !== "newest"
  );
}

/**
 * Serialises the non-default filters. Page 1 is intentionally omitted so a
 * freshly filtered URL stays short and shareable.
 */
export function activitySearchParams(
  filters: ActivityFilterState,
  page = 1,
): string {
  const params = new URLSearchParams();

  if (filters.kind !== "all") params.set("kind", filters.kind);
  if (filters.memberId) params.set("member", filters.memberId);
  if (filters.category) params.set("category", filters.category);
  if (filters.range !== "all") {
    params.set("range", filters.range);
    if (filters.range === "custom") {
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
    }
  }
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  if (page > 1) params.set("page", String(page));

  return params.toString();
}

export function activityHref(
  filters: ActivityFilterState,
  page = 1,
): string {
  const search = activitySearchParams(filters, page);
  return search ? `/dashboard/activity?${search}` : "/dashboard/activity";
}
