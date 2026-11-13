"use client";

import {
  CheckIcon,
  FilterIcon,
  RotateCcwIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DATE_RANGE_OPTIONS,
  type DateRangeKey,
  type ResolvedAnalyticsFilters,
} from "@/lib/analytics-filters";
import type { TrendGranularity } from "@/lib/analytics";
import { getCategoryMeta } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CategoryId } from "@/types";

export interface DashboardGroupOption {
  id: string;
  name: string;
  emoji: string;
}

interface DashboardFiltersProps {
  groups: DashboardGroupOption[];
  categories: CategoryId[];
  active: ResolvedAnalyticsFilters;
  resultLabel: string;
}

interface FilterState {
  range: DateRangeKey;
  from: string;
  to: string;
  groupId: string;
  category: string;
  granularity: TrendGranularity;
}

function toState(active: ResolvedAnalyticsFilters): FilterState {
  return {
    range: active.range,
    from: active.from ?? "",
    to: active.to ?? "",
    groupId: active.groupId ?? "",
    category: active.category ?? "",
    granularity: active.granularity,
  };
}

function buildSearch(state: FilterState): string {
  const params = new URLSearchParams();
  if (state.range !== "all") params.set("range", state.range);
  if (state.range === "custom") {
    if (state.from) params.set("from", state.from);
    if (state.to) params.set("to", state.to);
  }
  if (state.groupId) params.set("group", state.groupId);
  if (state.category) params.set("category", state.category);
  if (state.granularity === "yearly") params.set("view", "yearly");
  return params.toString();
}

function stateKey(active: ResolvedAnalyticsFilters): string {
  return [
    active.range,
    active.from ?? "",
    active.to ?? "",
    active.groupId ?? "",
    active.category ?? "",
    active.granularity,
  ].join("|");
}

export function DashboardFilters({
  groups,
  categories,
  active,
  resultLabel,
}: DashboardFiltersProps) {
  return (
    <FiltersForm
      key={stateKey(active)}
      groups={groups}
      categories={categories}
      active={active}
      resultLabel={resultLabel}
    />
  );
}

function FiltersForm({
  groups,
  categories,
  active,
  resultLabel,
}: DashboardFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<FilterState>(() => toState(active));

  function navigate(next: FilterState) {
    const search = buildSearch(next);
    startTransition(() => {
      router.replace(search ? `${pathname}?${search}` : pathname, {
        scroll: false,
      });
    });
  }

  function update(next: FilterState) {
    setState(next);
    navigate(next);
  }

  function onRangeChange(range: DateRangeKey) {
    if (range === "custom") {
      // Reveal the date inputs first. Navigating with no dates would resolve
      // to "all time" and immediately hide them again.
      setState({ ...state, range, from: "", to: "" });
      return;
    }
    update({ ...state, range, from: "", to: "" });
  }

  function onCustomDate(which: "from" | "to", value: string) {
    const next: FilterState = {
      ...state,
      range: "custom",
      [which]: value,
    };
    setState(next);
    if (next.from || next.to) {
      navigate(next);
    } else {
      navigate({ ...next, range: "all" });
    }
  }

  const groupName = state.groupId
    ? groups.find((group) => group.id === state.groupId)?.name
    : null;
  const rangeLabel =
    DATE_RANGE_OPTIONS.find((option) => option.value === state.range)?.label ??
    "All time";

  const chips: { key: string; label: string; onClear: () => void }[] = [];
  if (state.range !== "all") {
    const customLabel =
      state.range === "custom"
        ? [state.from && formatDate(state.from), state.to && formatDate(state.to)]
            .filter(Boolean)
            .join(" → ")
        : null;
    chips.push({
      key: "range",
      label: customLabel || rangeLabel,
      onClear: () => update({ ...state, range: "all", from: "", to: "" }),
    });
  }
  if (groupName) {
    chips.push({
      key: "group",
      label: groupName,
      onClear: () => update({ ...state, groupId: "" }),
    });
  }
  if (state.category) {
    chips.push({
      key: "category",
      label: getCategoryMeta(state.category as CategoryId).label,
      onClear: () => update({ ...state, category: "" }),
    });
  }

  return (
    <section
      aria-label="Dashboard filters"
      className="sn-surface rounded-2xl p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg sn-tint-brand">
            <FilterIcon className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Filters</p>
            <p className="truncate text-xs text-muted-foreground">
              {isPending ? "Updating…" : resultLabel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="hidden sm:inline-flex">
            <SlidersHorizontalIcon aria-hidden />
            {state.granularity === "monthly" ? "Monthly view" : "Yearly view"}
          </Badge>
          <Link
            href={pathname}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            <RotateCcwIcon className="size-3.5" aria-hidden />
            Reset
          </Link>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex min-w-[9.5rem] flex-1 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          Period
          <select
            value={state.range}
            onChange={(event) => onRangeChange(event.target.value as DateRangeKey)}
            className="sn-select"
          >
            {DATE_RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {state.range === "custom" ? (
          <>
            <label className="flex min-w-[9rem] flex-1 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              From
              <Input
                type="date"
                value={state.from}
                max={state.to || undefined}
                onChange={(event) => onCustomDate("from", event.target.value)}
              />
            </label>
            <label className="flex min-w-[9rem] flex-1 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              To
              <Input
                type="date"
                value={state.to}
                min={state.from || undefined}
                onChange={(event) => onCustomDate("to", event.target.value)}
              />
            </label>
          </>
        ) : null}

        <label className="flex min-w-[9.5rem] flex-1 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          Group
          <select
            value={state.groupId}
            onChange={(event) =>
              update({ ...state, groupId: event.target.value })
            }
            className="sn-select"
          >
            <option value="">All groups</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.emoji} {group.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-[9.5rem] flex-1 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          Category
          <select
            value={state.category}
            onChange={(event) =>
              update({ ...state, category: event.target.value })
            }
            className="sn-select"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {getCategoryMeta(category).label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
          Trend
          <div
            role="group"
            aria-label="Trend granularity"
            className="flex h-11 items-center rounded-xl border border-input bg-card/70 p-1"
          >
            {(["monthly", "yearly"] as const).map((value) => {
              const selected = state.granularity === value;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => update({ ...state, granularity: value })}
                  className={cn(
                    "inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold capitalize transition-colors",
                    selected
                      ? "bg-brand/12 text-brand ring-1 ring-brand/15"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {selected ? <CheckIcon className="size-3" aria-hidden /> : null}
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {chips.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[0.68rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
            Active
          </span>
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onClear}
              className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand ring-1 ring-brand/15 transition-colors hover:bg-brand/15"
            >
              {chip.label}
              <span aria-hidden className="text-brand/70">
                ×
              </span>
              <span className="sr-only">Remove filter</span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
