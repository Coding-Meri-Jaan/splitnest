import type { ComponentType } from "react";
import {
  CalendarClockIcon,
  HandshakeIcon,
  TrendingUpIcon,
} from "lucide-react";

import { categoryTints } from "@/lib/category-tints";
import { getCategoryMeta } from "@/lib/categories";
import { formatDate, formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ActivitySummary } from "@/types";

interface ActivitySummaryPanelProps {
  summary: ActivitySummary;
  hasFilters: boolean;
}

export function ActivitySummaryPanel({
  summary,
  hasFilters,
}: ActivitySummaryPanelProps) {
  return (
    <section
      aria-label="Activity summary"
      className="sn-surface sn-rise relative overflow-hidden rounded-2xl p-5 sm:p-6"
    >
      <span
        aria-hidden
        className="sn-orb -top-16 right-0 size-44 bg-brand/20"
      />

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="sn-eyebrow">
            Total spent{hasFilters ? " · this view" : ""}
          </p>
          <p className="mt-2 font-heading text-3xl font-semibold tracking-tighter sm:text-4xl">
            {formatINR(summary.totalSpent)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.expenseCount}{" "}
            {summary.expenseCount === 1 ? "expense" : "expenses"} across your
            nests
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:w-[27rem]">
          <MiniSummary
            icon={HandshakeIcon}
            label="Settlements"
            value={formatINR(summary.totalSettled)}
            hint={`${summary.settlementCount} ${
              summary.settlementCount === 1 ? "payment" : "payments"
            } recorded`}
            tone="success"
          />
          <MiniSummary
            icon={CalendarClockIcon}
            label="Latest activity"
            value={summary.latestDate ? formatDate(summary.latestDate) : "—"}
            hint={summary.latestTitle ?? "Nothing recorded yet"}
            tone="brand"
          />
        </div>
      </div>

      {summary.topCategories.length > 0 ? (
        <div className="relative mt-5 border-t border-border/50 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 inline-flex items-center gap-1.5 text-[0.68rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              <TrendingUpIcon className="size-3.5" aria-hidden />
              Top categories
            </span>
            {summary.topCategories.map((category) => {
              const meta = getCategoryMeta(category.category);
              const Icon = meta.icon;

              return (
                <span
                  key={category.category}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/70 py-1 pr-2.5 pl-1.5 text-xs"
                >
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-md bg-linear-to-br ring-1",
                      categoryTints[category.category],
                    )}
                  >
                    <Icon className="size-3" aria-hidden />
                  </span>
                  <span className="font-medium">{meta.label}</span>
                  <span className="font-semibold tabular-nums">
                    {formatINR(category.amount)}
                  </span>
                  <span className="text-muted-foreground">
                    {Math.round(category.fraction * 100)}%
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}

interface MiniSummaryProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
  tone: "brand" | "success";
}

function MiniSummary({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: MiniSummaryProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/55 px-3.5 py-3">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-lg",
            tone === "success" ? "sn-tint-success" : "sn-tint-brand",
          )}
        >
          <Icon className="size-3.5" aria-hidden />
        </span>
        <p className="text-[0.62rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
          {label}
        </p>
      </div>
      <p className="mt-2 font-heading text-lg font-semibold tabular-nums">
        {value}
      </p>
      <p className="truncate text-[0.68rem] text-muted-foreground" title={hint}>
        {hint}
      </p>
    </div>
  );
}
