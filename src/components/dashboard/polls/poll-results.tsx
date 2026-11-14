import Link from "next/link";
import { EyeOffIcon, LockIcon, TrophyIcon, UsersRoundIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PollView } from "@/types";

interface PollResultsProps {
  poll: PollView;
}

function lockedMessage(poll: PollView): string {
  if (!poll.hasVoted && poll.resultsVisibility === "after_vote") {
    return "Cast your vote to unlock the results.";
  }
  if (poll.resultsVisibility === "after_close") {
    return "Results unlock when voting closes.";
  }
  return "Results are hidden until you vote.";
}

/**
 * Results are already gated by poll_results() on the server, so this component
 * only decides how to phrase what the member is allowed to see.
 */
export function PollResults({ poll }: PollResultsProps) {
  if (poll.status === "cancelled") {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 px-5 py-8 text-center">
        <EyeOffIcon
          className="mx-auto size-7 text-muted-foreground"
          aria-hidden
        />
        <p className="mt-3 text-sm font-medium">This poll was cancelled</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Votes are no longer counted. Start a fresh poll when the group is
          ready to decide.
        </p>
      </div>
    );
  }

  if (!poll.canSeeResults) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 px-5 py-8 text-center">
        <LockIcon
          className="mx-auto size-7 text-muted-foreground"
          aria-hidden
        />
        <p className="mt-3 text-sm font-medium">Results are locked</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          {lockedMessage(poll)}
        </p>
      </div>
    );
  }

  const winners = poll.options.filter((option) =>
    poll.winnerIds.includes(option.id),
  );
  const open = poll.status === "open";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-card/50 px-3.5 py-2.5 text-sm">
        <TrophyIcon
          className={cn(
            "size-4",
            winners.length > 0 ? "text-warning" : "text-muted-foreground",
          )}
          aria-hidden
        />
        {winners.length === 0 ? (
          <span className="text-muted-foreground">
            No votes yet. The first vote sets the pace.
          </span>
        ) : winners.length === 1 ? (
          <span>
            <span className="text-muted-foreground">
              {open ? "Currently leading:" : "Winner:"}
            </span>{" "}
            <span className="font-semibold">{winners[0].label}</span>
          </span>
        ) : (
          <span>
            <span className="text-muted-foreground">
              {open ? "Currently tied:" : "It's a tie:"}
            </span>{" "}
            <span className="font-semibold">
              {winners.map((option) => option.label).join(", ")}
            </span>
          </span>
        )}
      </div>

      <ul className="space-y-3">
        {poll.options.map((option) => (
          <li key={option.id} className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
              <span className="flex min-w-0 flex-wrap items-center gap-2">
                {option.isWinner && poll.totalVotes > 0 ? (
                  <TrophyIcon
                    className="size-3.5 shrink-0 text-warning"
                    aria-hidden
                  />
                ) : null}
                <span className="font-medium break-words">{option.label}</span>
                {option.isMine ? (
                  <Badge variant="secondary">Your pick</Badge>
                ) : null}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {option.count} {option.count === 1 ? "vote" : "votes"} ·{" "}
                {option.percent}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  option.isWinner && poll.totalVotes > 0
                    ? "bg-brand"
                    : "bg-brand/45",
                )}
                style={{ width: `${option.percent}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/40 px-3.5 py-2.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <UsersRoundIcon className="size-3.5" aria-hidden />
          {poll.voterCount} of {poll.memberCount} members voted
        </span>
        <span className="tabular-nums">
          {poll.turnoutPercent}% turnout · {poll.totalVotes}{" "}
          {poll.totalVotes === 1 ? "vote" : "votes"}
        </span>
      </div>

      {poll.anonymous ? (
        <p className="text-xs text-muted-foreground">
          This poll is anonymous. Counts are shared, but individual choices
          stay private — even from the creator.
        </p>
      ) : poll.voters.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Who voted
          </p>
          <div className="flex flex-wrap gap-1.5">
            {poll.voters.map((voter) => (
              <Badge key={voter.id} variant="outline">
                {voter.name}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {open ? (
        <p className="text-xs text-muted-foreground">
          Live results update as members vote.{" "}
          <Link
            href={`/dashboard/groups/${poll.groupId}/polls`}
            className="font-medium text-brand underline-offset-4 hover:underline"
          >
            All polls
          </Link>
        </p>
      ) : null}
    </div>
  );
}
