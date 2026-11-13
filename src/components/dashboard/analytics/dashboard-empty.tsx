import { ArrowRightIcon, ReceiptTextIcon, SparklesIcon, UsersRoundIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface DashboardEmptyProps {
  hasGroups: boolean;
}

/**
 * First-run state. It stays deliberately explanatory: the biggest complaint
 * about the old dashboard was not knowing what to do next.
 */
export function DashboardEmpty({ hasGroups }: DashboardEmptyProps) {
  return (
    <Card className="sn-rise relative overflow-hidden">
      <span
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full bg-brand/12 blur-3xl"
      />
      <CardContent className="relative flex flex-col items-start gap-5 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full sn-tint-brand px-3 py-1 text-xs font-semibold text-brand ring-1 ring-brand/15">
            <SparklesIcon className="size-3.5" aria-hidden />
            {hasGroups ? "One step to your first insight" : "Start here"}
          </span>
          <div className="space-y-1">
            <h2 className="font-heading text-xl font-semibold tracking-tight">
              {hasGroups
                ? "No expenses yet — add one to light up this dashboard"
                : "Create your first nest to begin"}
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              {hasGroups
                ? "Once your group logs an expense, this page fills with your spending trends, category breakdown, live balances and settle-up shortcuts."
                : "A nest is a group of people who share costs — a trip, a flat, a team. Create one, invite friends, then log what you paid."}
            </p>
          </div>
          <ol className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
            <li className="flex items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-full bg-brand/10 text-[0.65rem] font-bold text-brand">
                1
              </span>
              {hasGroups ? "Open your nest" : "Create a nest"}
            </li>
            <li className="flex items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-full bg-brand/10 text-[0.65rem] font-bold text-brand">
                2
              </span>
              Add an expense
            </li>
            <li className="flex items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-full bg-brand/10 text-[0.65rem] font-bold text-brand">
                3
              </span>
              See who owes whom
            </li>
          </ol>
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          <Button
            nativeButton={false}
            render={
              <Link
                href={hasGroups ? "/dashboard/groups" : "/dashboard/groups/new"}
              />
            }
          >
            {hasGroups ? <ReceiptTextIcon /> : <UsersRoundIcon />}
            {hasGroups ? "Open your groups" : "Create a nest"}
          </Button>
          {hasGroups ? null : (
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/dashboard/groups" />}
            >
              I already have one
              <ArrowRightIcon />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
