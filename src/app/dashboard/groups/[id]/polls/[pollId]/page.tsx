import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  ArrowLeftIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  EyeOffIcon,
  LockIcon,
  PencilIcon,
  PieChartIcon,
  UsersRoundIcon,
  UserRoundIcon,
} from "lucide-react";

import { PollBallot } from "@/components/dashboard/polls/poll-ballot";
import { PollManageControls } from "@/components/dashboard/polls/poll-manage-controls";
import { PollResults } from "@/components/dashboard/polls/poll-results";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/user";
import { POLLS_SETUP_MESSAGE } from "@/lib/data/errors";
import { getPollDetail } from "@/lib/data/polls";
import { formatDateTime } from "@/lib/format";
import {
  POLL_RESULTS_LABELS,
  POLL_SELECTION_LABELS,
  POLL_STATUS_LABELS,
  pollTiming,
} from "@/lib/polls";
import type { PollStatus } from "@/types";

export const metadata: Metadata = {
  title: "Poll",
};

interface PollPageProps {
  params: Promise<{ id: string; pollId: string }>;
  searchParams: Promise<{
    created?: string;
    updated?: string;
    closed?: string;
    cancelled?: string;
    error?: string;
  }>;
}

export default function PollPage({ params, searchParams }: PollPageProps) {
  return (
    <Suspense fallback={<PollSkeleton />}>
      <PollContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

const STATUS_BADGE: Record<PollStatus, "secondary" | "outline" | "destructive"> =
  {
    open: "secondary",
    closed: "outline",
    cancelled: "destructive",
  };

function confirmationFor(query: {
  created?: string;
  updated?: string;
  closed?: string;
  cancelled?: string;
}): string | null {
  if (query.created === "1") return "Poll created. Members have been notified.";
  if (query.updated === "1") return "Poll updated.";
  if (query.closed === "1") return "Voting closed. Final results are ready.";
  if (query.cancelled === "1") return "Poll cancelled.";
  return null;
}

function errorFor(value: string | undefined): string | null {
  if (!value) return null;
  if (value === "setup") return POLLS_SETUP_MESSAGE;
  if (value === "close") {
    return "Could not close this poll. Only the creator or a group admin can close it.";
  }
  if (value === "cancel") {
    return "Could not cancel this poll. Only the creator or a group admin can cancel it.";
  }
  return "That poll action could not be completed. Refresh and try again.";
}

async function PollContent({ params, searchParams }: PollPageProps) {
  const [{ id, pollId }, query] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  const data = await getPollDetail(user.id, id, pollId);

  if (!data) {
    notFound();
  }

  const { group, poll, available } = data;
  const confirmation = confirmationFor(query);
  const error = errorFor(query.error);

  if (!available) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href={`/dashboard/groups/${group.id}`} />}
          className="-ml-2"
        >
          <ArrowLeftIcon />
          {group.name}
        </Button>
        <div className="sn-surface rounded-2xl border border-dashed border-border/70 px-5 py-10 text-center">
          <PieChartIcon
            className="mx-auto size-8 text-muted-foreground"
            aria-hidden
          />
          <p className="mt-3 text-sm font-medium">Polls are not set up yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
            {POLLS_SETUP_MESSAGE}
          </p>
        </div>
      </div>
    );
  }

  if (!poll) {
    notFound();
  }

  const timing = pollTiming(poll.closesAt, poll.status);
  const open = poll.status === "open";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
        render={<Link href={`/dashboard/groups/${group.id}/polls`} />}
        className="-ml-2"
      >
        <ArrowLeftIcon />
        Polls
      </Button>

      {confirmation ? (
        <p
          role="status"
          className="sn-enter flex items-center gap-2 rounded-2xl border border-success/30 bg-success/8 px-4 py-2.5 text-sm text-success"
        >
          <CheckCircle2Icon className="size-4" aria-hidden />
          {confirmation}
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="sn-enter rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <PageHeader
        eyebrow={group.name}
        title={poll.title}
        description={poll.description ?? undefined}
        action={
          <div className="flex flex-wrap gap-2">
            {poll.canEdit ? (
              <Button
                variant="outline"
                nativeButton={false}
                render={
                  <Link
                    href={`/dashboard/groups/${group.id}/polls/${poll.id}/edit`}
                  />
                }
              >
                <PencilIcon />
                Edit
              </Button>
            ) : null}
            {poll.canManage ? (
              <PollManageControls
                groupId={group.id}
                pollId={poll.id}
                open={open}
              />
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={STATUS_BADGE[poll.status]}>
          {POLL_STATUS_LABELS[poll.status]}
        </Badge>
        <Badge variant="outline">
          {POLL_SELECTION_LABELS[poll.selection]}
        </Badge>
        <Badge variant="outline" className="gap-1">
          <LockIcon className="size-3" aria-hidden />
          {POLL_RESULTS_LABELS[poll.resultsVisibility]}
        </Badge>
        {poll.anonymous ? (
          <Badge variant="outline" className="gap-1">
            <EyeOffIcon className="size-3" aria-hidden />
            Anonymous
          </Badge>
        ) : null}
        {poll.hasVoted ? (
          <Badge variant="secondary" className="gap-1">
            <CheckCircle2Icon className="size-3" aria-hidden />
            You voted
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sn-surface rounded-2xl p-4">
          <p className="flex items-center gap-1.5 text-[0.65rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            <CalendarClockIcon className="size-3.5" aria-hidden />
            {open ? "Deadline" : "Voting ended"}
          </p>
          <p className="mt-1.5 text-sm font-medium">
            {formatDateTime(
              poll.status === "open"
                ? poll.closesAt
                : poll.closedAt ?? poll.cancelledAt ?? poll.closesAt,
            )}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {timing.label}
          </p>
        </div>

        <div className="sn-surface rounded-2xl p-4">
          <p className="flex items-center gap-1.5 text-[0.65rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            <UsersRoundIcon className="size-3.5" aria-hidden />
            Turnout
          </p>
          <p className="mt-1.5 text-sm font-medium">
            {poll.voterCount} of {poll.memberCount} members
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {poll.turnoutPercent}% ·{" "}
            {poll.totalVotes === 1
              ? "1 vote"
              : `${poll.totalVotes} votes`}
          </p>
        </div>

        <div className="sn-surface rounded-2xl p-4">
          <p className="flex items-center gap-1.5 text-[0.65rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            <UserRoundIcon className="size-3.5" aria-hidden />
            Created by
          </p>
          <p className="mt-1.5 text-sm font-medium">{poll.createdByName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDateTime(poll.createdAt)}
          </p>
        </div>
      </div>

      {open ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {poll.hasVoted ? "Your vote" : "Cast your vote"}
            </CardTitle>
            <CardDescription>
              {poll.hasVoted
                ? "Change it any time before the deadline."
                : poll.selection === "multiple"
                  ? "Pick every option that works for you."
                  : "Pick the option you prefer."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PollBallot poll={poll} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
          <CardDescription>
            {poll.status === "cancelled"
              ? "This poll was cancelled."
              : poll.canSeeResults
                ? poll.status === "open"
                  ? "Live counts, updated as members vote."
                  : "Final counts from this poll."
                : "Visibility is limited by this poll's settings."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PollResults poll={poll} />
        </CardContent>
      </Card>

      {poll.canManage && open && poll.totalVotes > 0 && !poll.canEdit ? (
        <p className="text-xs text-muted-foreground">
          Voting has started, so the question and options are locked. You can
          still close or cancel the poll above.
        </p>
      ) : null}
    </div>
  );
}

function PollSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="h-8 w-24 sn-skeleton rounded-full" />
      <div className="h-16 w-full max-w-lg sn-skeleton rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-24 sn-skeleton rounded-2xl" />
        ))}
      </div>
      <div className="h-72 sn-skeleton rounded-2xl" />
    </div>
  );
}
