import Link from "next/link";
import {
  ArrowRightIcon,
  CalendarClockIcon,
  CheckIcon,
  EyeOffIcon,
  TrophyIcon,
  UsersRoundIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { POLL_SELECTION_LABELS, pollTiming } from "@/lib/polls";
import { cn } from "@/lib/utils";
import type { PollStatus, PollView } from "@/types";

const STATUS_STYLES: Record<PollStatus, string> = {
  open: "border-success/30 bg-success/10 text-success",
  closed: "border-border/70 bg-muted text-muted-foreground",
  cancelled: "border-destructive/25 bg-destructive/8 text-destructive",
};

const STATUS_LABELS: Record<PollStatus, string> = {
  open: "Open",
  closed: "Closed",
  cancelled: "Cancelled",
};

interface PollCardProps {
  poll: PollView;
}

export function PollCard({ poll }: PollCardProps) {
  const timing = pollTiming(poll.closesAt, poll.status);
  const leaders = poll.options.filter((option) =>
    poll.winnerIds.includes(option.id),
  );

  return (
    <Link
      href={`/dashboard/groups/${poll.groupId}/polls/${poll.id}`}
      className="sn-surface sn-hover-lift group flex flex-col gap-3 rounded-2xl p-4 transition-colors focus-visible:ring-4 focus-visible:ring-ring/25 focus-visible:outline-none"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-[0.68rem] font-semibold",
            STATUS_STYLES[poll.status],
          )}
        >
          {STATUS_LABELS[poll.status]}
        </span>
        <Badge variant="outline">
          {POLL_SELECTION_LABELS[poll.selection]}
        </Badge>
        {poll.anonymous ? (
          <Badge variant="outline" className="gap-1">
            <EyeOffIcon className="size-3" aria-hidden />
            Anonymous
          </Badge>
        ) : null}
        {poll.hasVoted && poll.status === "open" ? (
          <Badge variant="secondary" className="gap-1">
            <CheckIcon className="size-3" aria-hidden />
            Voted
          </Badge>
        ) : null}
      </div>

      <div className="space-y-1">
        <p className="font-heading text-base leading-snug font-semibold tracking-tight">
          {poll.title}
        </p>
        {poll.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {poll.description}
          </p>
        ) : null}
      </div>

      <div className="mt-auto space-y-2">
        {poll.canSeeResults ? (
          <p className="flex items-center gap-1.5 text-sm">
            <TrophyIcon
              className={cn(
                "size-3.5 shrink-0",
                leaders.length > 0 ? "text-warning" : "text-muted-foreground",
              )}
              aria-hidden
            />
            {leaders.length === 0 ? (
              <span className="text-muted-foreground">
                No votes yet
              </span>
            ) : (
              <span className="min-w-0 truncate">
                <span className="text-muted-foreground">
                  {poll.status === "open" ? "Leading: " : "Winner: "}
                </span>
                <span className="font-medium">
                  {leaders.map((option) => option.label).join(", ")}
                </span>
              </span>
            )}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Results are hidden for now
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1">
              <UsersRoundIcon className="size-3.5" aria-hidden />
              {poll.voterCount}/{poll.memberCount} voted
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarClockIcon className="size-3.5" aria-hidden />
              {poll.status === "open"
                ? timing.label
                : formatDateTime(poll.closesAt)}
            </span>
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-brand opacity-0 transition-opacity group-hover:opacity-100">
            View
            <ArrowRightIcon className="size-3.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
