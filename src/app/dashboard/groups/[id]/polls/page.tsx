import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  PieChartIcon,
  PlusIcon,
} from "lucide-react";

import { PollCard } from "@/components/dashboard/polls/poll-card";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/user";
import { POLLS_SETUP_MESSAGE } from "@/lib/data/errors";
import { getGroupPolls } from "@/lib/data/polls";

export const metadata: Metadata = {
  title: "Polls",
};

interface PollsPageProps {
  params: Promise<{ id: string }>;
}

export default function PollsPage({ params }: PollsPageProps) {
  return (
    <Suspense fallback={<PollsSkeleton />}>
      <PollsContent params={params} />
    </Suspense>
  );
}

async function PollsContent({ params }: PollsPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  const data = await getGroupPolls(user.id, id);

  if (!data) {
    notFound();
  }

  const { group, polls, canCreate, available, error } = data;
  const active = polls.filter((poll) => poll.status === "open");
  const completed = polls.filter((poll) => poll.status !== "open");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
        render={<Link href={`/dashboard/groups/${group.id}`} />}
        className="-ml-2"
      >
        <ArrowLeftIcon />
        {group.emoji} {group.name}
      </Button>

      <PageHeader
        eyebrow="Decide together"
        title="Polls"
        description="Ask the group a quick question, collect votes, and settle it without a long chat thread."
        action={
          canCreate ? (
            <Button
              nativeButton={false}
              render={
                <Link href={`/dashboard/groups/${group.id}/polls/new`} />
              }
            >
              <PlusIcon />
              New poll
            </Button>
          ) : null
        }
      />

      {!available ? (
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
      ) : error ? (
        <p
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm text-destructive"
        >
          {error}
        </p>
      ) : polls.length === 0 ? (
        <div className="sn-surface rounded-2xl border border-dashed border-border/70 px-5 py-12 text-center">
          <span className="sn-tint-brand mx-auto flex size-12 items-center justify-center rounded-2xl">
            <PieChartIcon className="size-6" aria-hidden />
          </span>
          <p className="mt-3 text-sm font-medium">No polls yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {canCreate
              ? "Start with a simple question — where to eat, which hotel, or what to do next."
              : "When an editor starts a poll, it will show up here for everyone in the group."}
          </p>
          {canCreate ? (
            <Button
              className="mt-4"
              nativeButton={false}
              render={
                <Link href={`/dashboard/groups/${group.id}/polls/new`} />
              }
            >
              <PlusIcon />
              Create the first poll
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-lg font-semibold tracking-tight">
                Open
              </h2>
              <span className="text-xs text-muted-foreground">
                {active.length} {active.length === 1 ? "poll" : "polls"}
              </span>
            </div>

            {active.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
                Nothing is open right now.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {active.map((poll) => (
                  <PollCard key={poll.id} poll={poll} />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-lg font-semibold tracking-tight">
                Completed
              </h2>
              <span className="text-xs text-muted-foreground">
                {completed.length}{" "}
                {completed.length === 1 ? "poll" : "polls"}
              </span>
            </div>

            {completed.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
                Closed and cancelled polls will collect here.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {completed.map((poll) => (
                  <PollCard key={poll.id} poll={poll} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {available && polls.length > 0 ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ArrowRightIcon className="size-3.5" aria-hidden />
          Poll results are calculated on the server, so counts always match the
          latest vote.
        </p>
      ) : null}
    </div>
  );
}

function PollsSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="h-8 w-28 sn-skeleton rounded-full" />
      <div className="h-16 w-full max-w-lg sn-skeleton rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-44 sn-skeleton rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
