/**
 * URL-param parsing for the dashboard filters.
 *
 * Keeping this pure makes the date maths deterministic in tests and means a
 * malformed link (deleted group, bogus category, impossible date) degrades to
 * "all data" instead of crashing the page.
 */

import type { AnalyticsFilters, TrendGranularity } from "@/lib/analytics";
import { isCategoryId, type CategoryId } from "@/types";

export type DateRangeKey =
  | "all"
  | "this-month"
  | "last-30"
  | "last-90"
  | "this-year"
  | "last-year"
  | "custom";

export interface DashboardQuery {
  range?: string;
  from?: string;
  to?: string;
  group?: string;
  category?: string;
  view?: string;
}

export interface ResolvedAnalyticsFilters extends AnalyticsFilters {
  range: DateRangeKey;
}

export const DATE_RANGE_OPTIONS: { value: DateRangeKey; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "this-month", label: "This month" },
  { value: "last-30", label: "Last 30 days" },
  { value: "last-90", label: "Last 90 days" },
  { value: "this-year", label: "This year" },
  { value: "last-year", label: "Last year" },
  { value: "custom", label: "Custom range" },
];

const DATE_RANGE_KEYS = new Set<string>(
  DATE_RANGE_OPTIONS.map((option) => option.value),
);

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseIsoDate(value: string | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  // Rejects overflow dates such as 2026-02-31, which JS would otherwise roll
  // into March.
  return isoDate(parsed) === value ? value : null;
}

function shiftDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDate(date);
}

function firstOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

function firstOfYear(iso: string): string {
  return `${iso.slice(0, 4)}-01-01`;
}

function lastOfYear(iso: string): string {
  return `${iso.slice(0, 4)}-12-31`;
}

export function resolveDateRange(
  range: DateRangeKey,
  fromParam: string | undefined,
  toParam: string | undefined,
  now: Date,
): { range: DateRangeKey; from: string | null; to: string | null } {
  const today = isoDate(now);

  switch (range) {
    case "this-month":
      return { range, from: firstOfMonth(today), to: today };
    case "last-30":
      return { range, from: shiftDays(today, -29), to: today };
    case "last-90":
      return { range, from: shiftDays(today, -89), to: today };
    case "this-year":
      return { range, from: firstOfYear(today), to: today };
    case "last-year": {
      const year = String(Number(today.slice(0, 4)) - 1);
      return { range, from: `${year}-01-01`, to: lastOfYear(year) };
    }
    case "custom": {
      let from = parseIsoDate(fromParam);
      let to = parseIsoDate(toParam);
      if (from === null && to === null) {
        return { range: "all", from: null, to: null };
      }
      if (from !== null && to !== null && from > to) {
        [from, to] = [to, from];
      }
      return { range, from, to };
    }
    case "all":
    default:
      return { range: "all", from: null, to: null };
  }
}

export function resolveAnalyticsFilters(
  query: DashboardQuery,
  now: Date,
  validGroupIds: ReadonlySet<string>,
): ResolvedAnalyticsFilters {
  const requestedRange =
    query.range && DATE_RANGE_KEYS.has(query.range)
      ? (query.range as DateRangeKey)
      : "all";
  const range = resolveDateRange(requestedRange, query.from, query.to, now);

  const groupId =
    query.group && validGroupIds.has(query.group) ? query.group : null;

  const category: CategoryId | null =
    query.category && isCategoryId(query.category) ? query.category : null;

  const granularity: TrendGranularity = query.view === "yearly" ? "yearly" : "monthly";

  return {
    range: range.range,
    from: range.from,
    to: range.to,
    groupId,
    category,
    granularity,
  };
}
