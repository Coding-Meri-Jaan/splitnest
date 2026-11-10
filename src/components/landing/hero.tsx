import Link from "next/link";
import {
  ArrowDownIcon,
  ArrowDownLeftIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  CheckIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  SparklesIcon,
  UsersRoundIcon,
} from "lucide-react";

import { balancePreview, proofMembers } from "@/components/landing/preview-data";
import { Amount } from "@/components/shared/amount";
import { Logo } from "@/components/shared/logo";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { summary } from "@/data/sample-data";
import { cn } from "@/lib/utils";

const trustPoints = [
  { label: "Free to start", icon: CheckIcon },
  { label: "UPI-ready settlements", icon: SmartphoneIcon },
  { label: "Private by design", icon: ShieldCheckIcon },
];

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-linear-to-b from-muted/60 to-transparent" />
        <div className="absolute -top-40 left-1/2 h-[26rem] w-[44rem] -translate-x-1/2 rounded-full bg-brand/15 blur-3xl motion-safe:animate-[sn-float_12s_ease-in-out_infinite]" />
        <div className="absolute -right-28 top-24 size-72 rounded-full bg-success/10 blur-3xl" />
        <div className="absolute -left-24 bottom-0 size-72 rounded-full bg-warning/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] opacity-30 [background-size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)] dark:opacity-20" />
      </div>

      <div className="mx-auto grid w-full max-w-6xl gap-14 px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:pb-28 lg:pt-24">
        <div className="max-w-xl motion-safe:animate-[sn-fade-up_0.7s_ease-out_both]">
          <Badge
            variant="outline"
            className="h-7 gap-1.5 rounded-full border-brand/20 bg-brand/5 px-3 text-brand dark:border-brand/30 dark:bg-brand/10"
          >
            <SparklesIcon aria-hidden />
            India-first expense sharing
          </Badge>

          <h1 className="mt-5 font-heading text-5xl leading-[1.03] font-semibold tracking-tighter text-balance break-words sm:text-6xl xl:text-7xl">
            Split expenses,
            <span className="block bg-linear-to-r from-brand to-success bg-clip-text text-transparent">
              not friendships.
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground sm:text-xl">
            SplitNest keeps every trip, flat, and team in sync. Track who paid,
            who owes, and settle up in ₹ without the spreadsheet chaos.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-11 gap-2 px-5 text-sm shadow-lg shadow-brand/20 transition-transform motion-safe:hover:-translate-y-0.5"
              )}
            >
              Get started free
              <ArrowRightIcon aria-hidden />
            </Link>
            <a
              href="#how-it-works"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-11 gap-2 px-5 text-sm"
              )}
            >
              See how it works
              <ArrowDownIcon aria-hidden />
            </a>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2.5 text-sm text-muted-foreground">
            {trustPoints.map(({ label, icon: Icon }) => (
              <li key={label} className="flex items-center gap-1.5">
                <span className="flex size-4 items-center justify-center rounded-full bg-success/10 text-success">
                  <Icon className="size-3" aria-hidden />
                </span>
                {label}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:gap-5">
            <AvatarGroup aria-hidden>
              {proofMembers.map((member) => (
                <MemberAvatar key={member.id} name={member.name} size="sm" />
              ))}
              <AvatarGroupCount className="text-[0.65rem] font-medium">
                +2
              </AvatarGroupCount>
            </AvatarGroup>
            <div>
              <p className="text-sm font-medium">
                Built for trips, flats and teams
              </p>
              <p className="text-xs text-muted-foreground">
                Designed around how Indian groups actually split.
              </p>
            </div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md motion-safe:animate-[sn-fade-up_0.8s_ease-out_0.15s_both] lg:max-w-none">
          <div
            aria-hidden
            className="absolute -inset-3 -z-10 rotate-2 rounded-[2rem] bg-linear-to-br from-brand/25 via-success/10 to-warning/20 blur-xl"
          />
          <div
            aria-hidden
            className="absolute inset-x-8 -bottom-4 -z-10 h-28 rounded-3xl border bg-card/70 shadow-xl ring-1 ring-foreground/5"
          />

          <Card className="relative overflow-hidden rounded-3xl shadow-2xl shadow-brand/10">
            <CardHeader className="gap-4 border-b border-border/60 pb-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Logo showText={false} />
                  <div>
                    <p className="text-sm font-medium">Goa trip</p>
                    <p className="text-xs text-muted-foreground">
                      5 people · 1 nest
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="gap-1 rounded-full">
                  <UsersRoundIcon aria-hidden />
                  5
                </Badge>
              </div>

              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Net balance
                </p>
                <p className="mt-1 font-heading text-4xl font-semibold tracking-tight">
                  <Amount value={summary.netBalance} />
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Across your active nests
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-success/10 p-3">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ArrowDownLeftIcon
                      className="size-3.5 text-success"
                      aria-hidden
                    />
                    You are owed
                  </p>
                  <p className="mt-1 font-heading text-lg font-semibold">
                    <Amount
                      value={summary.youAreOwed}
                      signed={false}
                      className="text-success"
                    />
                  </p>
                </div>
                <div className="rounded-xl bg-destructive/10 p-3">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ArrowUpRightIcon
                      className="size-3.5 text-destructive"
                      aria-hidden
                    />
                    You owe
                  </p>
                  <p className="mt-1 font-heading text-lg font-semibold">
                    <Amount
                      value={summary.youOwe}
                      signed={false}
                      className="text-destructive"
                    />
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Who owes whom
                  </p>
                  <Badge variant="outline" className="rounded-full">
                    3 open
                  </Badge>
                </div>
                <ul className="space-y-2.5">
                  {balancePreview.map(({ balance, member }) => (
                    <li
                      key={member.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <MemberAvatar name={member.name} size="sm" />
                        <span className="truncate text-sm">{member.name}</span>
                      </span>
                      <Amount
                        value={balance.amount}
                        className="shrink-0 text-sm"
                      />
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href="/signup"
                className={cn(buttonVariants({ size: "sm" }), "w-full")}
              >
                Settle up
                <ArrowRightIcon aria-hidden />
              </Link>
            </CardContent>
          </Card>

          <div className="absolute top-8 -right-3 hidden sm:block motion-safe:animate-[sn-float_7s_ease-in-out_infinite]">
            <div className="flex items-center gap-2 rounded-2xl border bg-background/90 px-3 py-2 shadow-xl backdrop-blur">
              <span className="flex size-7 items-center justify-center rounded-full bg-success/10 text-success">
                <CheckIcon className="size-3.5" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-medium">Settled up</p>
                <p className="text-[0.65rem] text-muted-foreground">
                  2 transfers cleared
                </p>
              </div>
            </div>
          </div>

          <div className="absolute bottom-16 -left-4 hidden sm:block motion-safe:animate-[sn-float_8s_ease-in-out_1.2s_infinite]">
            <div className="flex items-center gap-2 rounded-2xl border bg-background/90 px-3 py-2 shadow-xl backdrop-blur">
              <span className="flex size-7 items-center justify-center rounded-full bg-brand/10 text-brand">
                <SmartphoneIcon className="size-3.5" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-medium">UPI handoff</p>
                <p className="text-[0.65rem] text-muted-foreground">
                  Opens your payment app
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
