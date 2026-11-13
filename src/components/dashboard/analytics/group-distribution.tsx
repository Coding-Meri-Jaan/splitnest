import { formatPaise } from "@/lib/format";
import type { GroupSlice } from "@/lib/analytics";

import { ChartEmpty } from "./chart-empty";

interface GroupDistributionProps {
  slices: GroupSlice[];
  totalSharePaise: number;
}

export function GroupDistribution({
  slices,
  totalSharePaise,
}: GroupDistributionProps) {
  if (slices.length === 0 || totalSharePaise <= 0) {
    return (
      <ChartEmpty message="No group spending in this view. Try clearing the group or category filter." />
    );
  }

  return (
    <ul className="space-y-3.5">
      {slices.map((slice) => {
        const percent = Math.round(slice.fraction * 100);
        return (
          <li key={slice.groupId} className="group space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2.5">
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-brand/15 to-primary/10 text-base ring-1 ring-brand/10"
                >
                  {slice.emoji}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {slice.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {slice.count} {slice.count === 1 ? "expense" : "expenses"}
                  </span>
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {formatPaise(slice.sharePaise)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-[width] duration-500 group-hover:brightness-110"
                style={{
                  width: `${Math.max(slice.fraction * 100, 2)}%`,
                  background: "var(--chart-1)",
                }}
              />
            </div>
            <p className="text-right text-[0.68rem] text-muted-foreground">
              {percent}% of your share
            </p>
          </li>
        );
      })}
    </ul>
  );
}
