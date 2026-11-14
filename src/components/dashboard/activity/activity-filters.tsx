"use client";

import {
  CheckIcon,
  FilterIcon,
  LoaderCircleIcon,
  RotateCcwIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import {
  ACTIVITY_KIND_OPTIONS,
  ACTIVITY_SORT_OPTIONS,
  activitySearchParams,
  type ActivityFilterState,
  type ActivityKindFilter,
  type ActivitySort,
  type ResolvedActivityFilters,
} from "@/lib/activity-filters";
import {
  DATE_RANGE_OPTIONS,
  type DateRangeKey,
} from "@/lib/analytics-filters";
import { getCategoryMeta } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CategoryId } from "@/types";

interface ActivityMemberOption {
  id: string;
  name: string;
}

interface ActivityFiltersProps {
  members: ActivityMemberOption[];
  categories: CategoryId[];
  active: ResolvedActivityFilters;
  resultLabel: string;
}

interface FilterState {
  kind: ActivityKindFilter;
  memberId: string;
  category: string;
  range: DateRangeKey;
  from: string;
  to: string;
  sort: ActivitySort;
}

const DEFAULT_FILTERS: FilterState = {
  kind: "all",
  memberId: "",
  category: "",
  range: "all",
  from: "",
  to: "",
  sort: "newest",
};

function toState(active: ResolvedActivityFilters): FilterState {
  return {
    kind: active.kind,
    memberId: active.memberId ?? "",
    category: active.category ?? "",
    range: active.range,
    from: active.from ?? "",
    to: active.to ?? "",
    sort: active.sort,
  };
}

function toFilterState(state: FilterState): ActivityFilterState {
  return {
    kind: state.kind,
    memberId: state.memberId || null,
    category: (state.category || null) as CategoryId | null,
    range: state.range,
    from: state.range === "custom" ? state.from || null : null,
    to: state.range === "custom" ? state.to || null : null,
    sort: state.sort,
  };
}

function stateKey(active: ResolvedActivityFilters): string {
  return [
    active.kind,
    active.memberId ?? "",
    active.category ?? "",
    active.range,
    active.from ?? "",
    active.to ?? "",
    active.sort,
  ].join("|");
}

export function ActivityFilters({
  members,
  categories,
  active,
  resultLabel,
}: ActivityFiltersProps) {
  return (
    <FiltersForm
      key={stateKey(active)}
      members={members}
      categories={categories}
      active={active}
      resultLabel={resultLabel}
    />
  );
}

function FiltersForm({
  members,
  categories,
  active,
  resultLabel,
}: ActivityFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<FilterState>(() => toState(active));

  function navigate(next: FilterState) {
    const search = activitySearchParams(toFilterState(next));
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

  function onKindChange(kind: ActivityKindFilter) {
    // Settlements have no category, so carrying one across would silently
    // empty the list. Clear it as soon as the timeline narrows to payments.
    update({
      ...state,
      kind,
      category: kind === "settlement" ? "" : state.category,
    });
  }

  function onRangeChange(range: DateRangeKey) {
    if (range === "custom") {
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
    navigate(next.from || next.to ? next : { ...next, range: "all" });
  }

  function resetFilters() {
    setState(DEFAULT_FILTERS);
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  }

  const memberName = state.memberId
    ? members.find((member) => member.id === state.memberId)?.name
    : null;
  const rangeLabel =
    DATE_RANGE_OPTIONS.find((option) => option.value === state.range)?.label ??
    "All time";
  const sortLabel =
    ACTIVITY_SORT_OPTIONS.find((option) => option.value === state.sort)
      ?.label ?? "Newest first";
  const isSettlements = state.kind === "settlement";

  const chips: { key: string; label: string; onClear: () => void }[] = [];
  if (state.kind !== "all") {
    chips.push({
      key: "kind",
      label: state.kind === "expense" ? "Expenses" : "Settlements",
      onClear: () => update({ ...state, kind: "all" }),
    });
  }
  if (memberName) {
    chips.push({
      key: "member",
      label: memberName,
      onClear: () => update({ ...state, memberId: "" }),
    });
  }
  if (state.category) {
    chips.push({
      key: "category",
      label: getCategoryMeta(state.category as CategoryId).label,
      onClear: () => update({ ...state, category: "" }),
    });
  }
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
  if (state.sort !== "newest") {
    chips.push({
      key: "sort",
      label: sortLabel,
      onClear: () => update({ ...state, sort: "newest" }),
    });
  }

  return (
    <section
      aria-label="Activity filters"
      aria-busy={isPending}
      data-pending={isPending ? "true" : undefined}
      className="sn-surface relative overflow-hidden rounded-2xl p-5 sm:p-6"
    >
      {isPending ? (
        <span aria-hidden className="sn-pending-bar absolute inset-x-0 top-0" />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl sn-tint-brand">
            <FilterIcon className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Filter the timeline</p>
            <p
              aria-live="polite"
              className="flex items-center gap-1.5 truncate text-xs text-muted-foreground"
            >
              {isPending ? (
                <>
                  <LoaderCircleIcon
                    aria-hidden
                    className="size-3 animate-spin motion-reduce:animate-none"
                  />
                  Updating…
                </>
              ) : (
                resultLabel
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={resetFilters}
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <RotateCcwIcon className="size-4" aria-hidden />
          Reset
        </button>
      </div>

      <div
        role="group"
        aria-label="Activity type"
        className="mt-4 inline-flex w-full max-w-sm items-center rounded-xl border border-input bg-card/70 p-1"
      >
        {ACTIVITY_KIND_OPTIONS.map((option) => {
          const selected = state.kind === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onKindChange(option.value)}
              className={cn(
                "inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg px-3 text-xs font-semibold transition-colors",
                selected
                  ? "bg-brand/12 text-brand ring-1 ring-brand/15"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {selected ? <CheckIcon className="size-3" aria-hidden /> : null}
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3 sm:gap-4">
        <label className="flex min-w-[10rem] flex-1 flex-col gap-2 text-xs font-medium text-muted-foreground">
          Period
          <select
            value={state.range}
            onChange={(event) =>
              onRangeChange(event.target.value as DateRangeKey)
            }
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
            <label className="flex min-w-[9.5rem] flex-1 flex-col gap-2 text-xs font-medium text-muted-foreground">
              From
              <Input
                type="date"
                value={state.from}
                max={state.to || undefined}
                onChange={(event) => onCustomDate("from", event.target.value)}
              />
            </label>
            <label className="flex min-w-[9.5rem] flex-1 flex-col gap-2 text-xs font-medium text-muted-foreground">
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

        <label className="flex min-w-[10rem] flex-1 flex-col gap-2 text-xs font-medium text-muted-foreground">
          Member
          <select
            value={state.memberId}
            onChange={(event) =>
              update({ ...state, memberId: event.target.value })
            }
            className="sn-select"
          >
            <option value="">Everyone</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>

        {isSettlements ? null : (
          <label className="flex min-w-[10rem] flex-1 flex-col gap-2 text-xs font-medium text-muted-foreground">
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
        )}

        <label className="flex min-w-[10rem] flex-1 flex-col gap-2 text-xs font-medium text-muted-foreground">
          Sort
          <select
            value={state.sort}
            onChange={(event) =>
              update({ ...state, sort: event.target.value as ActivitySort })
            }
            className="sn-select"
          >
            {ACTIVITY_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {chips.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
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
