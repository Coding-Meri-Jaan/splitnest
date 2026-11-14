import {
  ArrowUpRightIcon,
  ChevronDownIcon,
  HandshakeIcon,
  ReceiptTextIcon,
} from "lucide-react";
import Link from "next/link";

import { MemberAvatar } from "@/components/shared/member-avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { activityHref, type ActivityFilterState } from "@/lib/activity-filters";
import { categoryTints } from "@/lib/category-tints";
import { getCategoryMeta } from "@/lib/categories";
import { formatDate, formatDateTime, formatINR } from "@/lib/format";
import { SETTLEMENT_METHOD_LABELS } from "@/lib/settlements";
import { SPLIT_MODE_LABELS } from "@/lib/splits";
import { cn } from "@/lib/utils";
import type {
  ActivityExpenseItem,
  ActivityItem,
  ActivitySettlementItem,
} from "@/types";

interface ActivityTimelineProps {
  items: ActivityItem[];
  filters: ActivityFilterState;
  page: number;
  pageCount: number;
  totalCount: number;
  pageSize: number;
}

export function ActivityTimeline({
  items,
  filters,
  page,
  pageCount,
  totalCount,
  pageSize,
}: ActivityTimelineProps) {
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = totalCount === 0 ? 0 : from + items.length - 1;

  return (
    <div className="space-y-4">
      <ol className="space-y-3">
        {items.map((item, index) => (
          <li
            key={`${item.kind}-${item.id}`}
            className={cn(
              "sn-rise",
              index > 0 && index < 6 && `sn-delay-${index}`,
            )}
          >
            {item.kind === "expense" ? (
              <ExpenseCard item={item} />
            ) : (
              <SettlementCard item={item} />
            )}
          </li>
        ))}
      </ol>

      <nav
        aria-label="Activity pages"
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/50 bg-card/45 px-4 py-3"
      >
        <p className="text-xs text-muted-foreground">
          Showing{" "}
          <span className="font-semibold text-foreground tabular-nums">
            {from}–{to}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-foreground tabular-nums">
            {totalCount}
          </span>{" "}
          {totalCount === 1 ? "entry" : "entries"}
        </p>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            aria-disabled={page <= 1}
            className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
            render={
              <Link
                href={activityHref(filters, Math.max(1, page - 1))}
                scroll={false}
                tabIndex={page <= 1 ? -1 : undefined}
              />
            }
          >
            Previous
          </Button>
          <span className="min-w-[5.5rem] text-center text-xs font-medium text-muted-foreground tabular-nums">
            Page {page} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            aria-disabled={page >= pageCount}
            className={
              page >= pageCount ? "pointer-events-none opacity-50" : undefined
            }
            render={
              <Link
                href={activityHref(filters, Math.min(pageCount, page + 1))}
                scroll={false}
                tabIndex={page >= pageCount ? -1 : undefined}
              />
            }
          >
            Next
          </Button>
        </div>
      </nav>
    </div>
  );
}

function ExpenseCard({ item }: { item: ActivityExpenseItem }) {
  const meta = getCategoryMeta(item.category);
  const CategoryIcon = meta.icon;
  const detailHref = `/dashboard/groups/${item.groupId}/expenses/${item.id}`;

  return (
    <Card
      size="sm"
      className="sn-hover-lift relative overflow-hidden px-4 py-4 transition-colors hover:border-brand/25 sm:px-5"
    >
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br ring-1",
            categoryTints[item.category],
          )}
        >
          <CategoryIcon className="size-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={detailHref}
                className="inline-flex max-w-full items-center gap-1.5 font-medium text-foreground underline-offset-4 after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <span className="truncate">{item.title}</span>
                <ArrowUpRightIcon
                  aria-hidden
                  className="size-3.5 shrink-0 text-muted-foreground"
                />
              </Link>

              <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span aria-hidden>{item.groupEmoji}</span>
                  {item.groupName}
                </span>
                <span aria-hidden>·</span>
                <span>{meta.label}</span>
                <span aria-hidden>·</span>
                <span>{formatDate(item.date)}</span>
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="font-heading text-lg font-semibold tracking-tight tabular-nums">
                {formatINR(item.amount)}
              </p>
              <p className="mt-0.5 text-[0.68rem] text-muted-foreground">
                {item.isUserPayer
                  ? "You paid"
                  : `${item.paidByName} paid`}
              </p>
            </div>
          </div>

          {item.notes ? (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {item.notes}
            </p>
          ) : null}

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.04] px-2 py-0.5 text-[0.68rem] font-medium text-muted-foreground">
              <ReceiptTextIcon className="size-3" aria-hidden />
              {SPLIT_MODE_LABELS[item.splitMode]}
            </span>
            {item.userShare !== null ? (
              <span className="inline-flex items-center gap-1 rounded-full sn-tint-brand px-2 py-0.5 text-[0.68rem] font-semibold">
                Your share {formatINR(item.userShare)}
              </span>
            ) : (
              <span className="rounded-full bg-foreground/[0.04] px-2 py-0.5 text-[0.68rem] text-muted-foreground">
                Not in your split
              </span>
            )}
          </div>

          {item.participants.length > 0 ? (
            <details className="group/split relative z-10 mt-2.5">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-full px-1.5 py-1 text-[0.7rem] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
                <ChevronDownIcon
                  aria-hidden
                  className="size-3.5 transition-transform group-open/split:rotate-180"
                />
                {item.participants.length}{" "}
                {item.participants.length === 1 ? "person" : "people"} shared
                this
              </summary>

              <ul className="mt-2 grid gap-1.5 rounded-xl border border-border/50 bg-background/40 p-2 sm:grid-cols-2">
                {item.participants.map((participant) => (
                  <li
                    key={participant.userId}
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5"
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <MemberAvatar name={participant.name} size="sm" />
                      <span className="truncate text-xs font-medium">
                        {participant.name}
                        {participant.isCurrentUser ? (
                          <span className="ml-1 text-muted-foreground">
                            (you)
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-xs font-semibold tabular-nums">
                        {formatINR(participant.share)}
                      </span>
                      {participant.inputValue !== null ? (
                        <span className="block text-[0.62rem] text-muted-foreground">
                          {item.splitMode === "percentage"
                            ? `${participant.inputValue}%`
                            : `${participant.inputValue} shares`}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="mt-2 px-1.5 text-[0.65rem] text-muted-foreground">
                Added by {item.createdByName} on{" "}
                {formatDateTime(item.createdAt)}
              </p>
            </details>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function SettlementCard({ item }: { item: ActivitySettlementItem }) {
  const directionLabel =
    item.direction === "in"
      ? "You received"
      : item.direction === "out"
        ? "You paid"
        : "Between other members";

  return (
    <Card
      size="sm"
      className="relative overflow-hidden border-success/25 px-4 py-4 sm:px-5"
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-success/50" />

      <div className="flex items-start gap-3.5">
        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-xl sn-tint-success ring-1 ring-success/20"
        >
          <HandshakeIcon className="size-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={`/dashboard/groups/${item.groupId}`}
                className="inline-flex max-w-full items-center gap-1.5 font-medium underline-offset-4 after:absolute after:inset-0 after:content-[''] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <span className="truncate">{item.title}</span>
                <ArrowUpRightIcon
                  aria-hidden
                  className="size-3.5 shrink-0 text-muted-foreground"
                />
              </Link>
              <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span aria-hidden>{item.groupEmoji}</span>
                  {item.groupName}
                </span>
                <span aria-hidden>·</span>
                <span>{SETTLEMENT_METHOD_LABELS[item.method]}</span>
                <span aria-hidden>·</span>
                <span>{formatDate(item.date)}</span>
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="font-heading text-lg font-semibold tracking-tight text-success tabular-nums">
                {formatINR(item.amount)}
              </p>
              <p
                className={cn(
                  "mt-0.5 text-[0.68rem] font-medium",
                  item.direction === "other"
                    ? "text-muted-foreground"
                    : "text-success",
                )}
              >
                {directionLabel}
              </p>
            </div>
          </div>

          {item.note ? (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {item.note}
            </p>
          ) : null}

          <p className="mt-2.5 text-[0.65rem] text-muted-foreground">
            Recorded by {item.createdByName} on{" "}
            {formatDateTime(item.createdAt)}
          </p>
        </div>
      </div>
    </Card>
  );
}
