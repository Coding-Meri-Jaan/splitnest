import { ArrowDownLeftIcon, ArrowUpRightIcon, HandshakeIcon } from "lucide-react";
import Link from "next/link";

import { MemberAvatar } from "@/components/shared/member-avatar";
import type { ActivityEntry } from "@/lib/analytics";
import { categoryTints } from "@/lib/category-tints";
import { getCategoryMeta } from "@/lib/categories";
import { formatDate, formatPaise } from "@/lib/format";
import { cn } from "@/lib/utils";

interface RecentActivityProps {
  entries: ActivityEntry[];
}

export function RecentActivity({ entries }: RecentActivityProps) {
  if (entries.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-muted-foreground">
        Nothing to show for these filters. Add an expense or widen the period.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border/50">
      {entries.map((entry) => {
        const isExpense = entry.kind === "expense";
        const meta = entry.category ? getCategoryMeta(entry.category) : null;
        const CategoryIcon = meta?.icon;

        return (
          <li key={entry.id}>
            <Link
              href={`/dashboard/groups/${entry.groupId}`}
              className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-foreground/[0.03] sm:px-5"
            >
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ring-1",
                  isExpense && entry.category
                    ? `bg-linear-to-br ${categoryTints[entry.category]}`
                    : "sn-tint-brand",
                )}
              >
                {isExpense && CategoryIcon ? (
                  <CategoryIcon className="size-4" />
                ) : (
                  <HandshakeIcon className="size-4" />
                )}
              </span>

              <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{entry.title}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <span aria-hidden>{entry.groupEmoji}</span>
                      {entry.groupName}
                    </span>
                    <span aria-hidden>·</span>
                    <span>{formatDate(entry.date)}</span>
                    <span aria-hidden>·</span>
                    {isExpense ? (
                      <span className="inline-flex items-center gap-1">
                        <MemberAvatar name={entry.actorName} size="sm" />
                        {entry.isUserPayer ? "You paid" : `${entry.actorName} paid`}
                      </span>
                    ) : (
                      <span>Settlement</span>
                    )}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums">
                    {formatPaise(entry.amountPaise)}
                  </p>
                  {isExpense ? (
                    <p className="mt-0.5 text-[0.68rem] text-muted-foreground">
                      {entry.userSharePaise === null
                        ? "Not in your split"
                        : `Your share ${formatPaise(entry.userSharePaise)}`}
                    </p>
                  ) : (
                    <p
                      className={cn(
                        "mt-0.5 inline-flex items-center gap-0.5 text-[0.68rem] font-medium",
                        entry.direction === "in"
                          ? "text-success"
                          : entry.direction === "out"
                            ? "text-destructive"
                            : "text-muted-foreground",
                      )}
                    >
                      {entry.direction === "in" ? (
                        <>
                          <ArrowDownLeftIcon className="size-3" aria-hidden />
                          You received
                        </>
                      ) : entry.direction === "out" ? (
                        <>
                          <ArrowUpRightIcon className="size-3" aria-hidden />
                          You paid
                        </>
                      ) : (
                        "Between others"
                      )}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
