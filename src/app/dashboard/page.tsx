import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CreditCardIcon,
  HandCoinsIcon,
  PlusIcon,
  ReceiptTextIcon,
  SparklesIcon,
  UsersRoundIcon,
  WalletIcon,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { BalanceList } from "@/components/dashboard/balance-list";
import { ExpenseTable } from "@/components/dashboard/expense-table";
import { Amount } from "@/components/shared/amount";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { PageHeader } from "@/components/shared/page-header";
import { SummaryCard } from "@/components/shared/summary-card";
import { AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/user";
import { getDashboardData } from "@/lib/data/groups";
import { cn } from "@/lib/utils";

export default function DashboardOverviewPage() {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const user = await getCurrentUser();
  const { summary, groups, recentExpenses, balances } = await getDashboardData(
    user.id
  );
  const firstName = user.fullName.split(" ")[0];
  const settled = summary.netBalance === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Your money, at a glance"
        title={firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        description="Here is where things stand across your groups."
        action={
          <Button nativeButton={false} render={<Link href="/dashboard/groups" />}>
            <PlusIcon />
            New expense
          </Button>
        }
      />

      {user.needsName ? (
        <div className="sn-enter flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          <p>
            Add your name so friends see <strong>you</strong> in &ldquo;Paid by&rdquo; instead of a
            placeholder.
          </p>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/dashboard/settings" />}
          >
            Add your name
          </Button>
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1.65fr_1fr]">
        <div className="sn-hero-panel sn-rise relative overflow-hidden rounded-3xl p-6 sm:p-8">
          <span
            aria-hidden
            className="sn-orb -top-16 -left-10 size-52 bg-fuchsia-400/35"
          />
          <span
            aria-hidden
            className="sn-orb -right-10 -bottom-20 size-56 bg-indigo-400/30"
          />

          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.7rem] font-semibold tracking-[0.18em] text-white/65 uppercase">
              Total net balance
            </p>
            <Badge className="border border-white/15 bg-white/10 text-white ring-0 backdrop-blur">
              <SparklesIcon aria-hidden />
              {settled ? "All square" : "Live across nests"}
            </Badge>
          </div>

          <div className="relative mt-4">
            <p className="font-heading text-4xl font-semibold tracking-tighter sm:text-5xl">
              <Amount
                value={summary.netBalance}
                className={cn(
                  "text-white",
                  summary.netBalance > 0 && "text-emerald-200",
                  summary.netBalance < 0 && "text-rose-200"
                )}
              />
            </p>
            <p className="mt-2 text-sm text-white/65">
              {summary.netBalance >= 0
                ? "In your favour across every group"
                : "You are behind across your groups"}
            </p>
          </div>

          <div className="relative mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-3.5 backdrop-blur-sm">
              <p className="flex items-center gap-1.5 text-xs font-medium text-white/65">
                <HandCoinsIcon className="size-3.5" aria-hidden />
                You are owed
              </p>
              <p className="mt-1.5 font-heading text-xl font-semibold text-emerald-200">
                <Amount value={summary.youAreOwed} signed={false} />
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-3.5 backdrop-blur-sm">
              <p className="flex items-center gap-1.5 text-xs font-medium text-white/65">
                <CreditCardIcon className="size-3.5" aria-hidden />
                You owe
              </p>
              <p className="mt-1.5 font-heading text-xl font-semibold text-rose-200">
                <Amount value={summary.youOwe} signed={false} />
              </p>
            </div>
          </div>

          <div className="relative mt-6 flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/groups"
              className={cn(
                buttonVariants({ size: "sm" }),
                "border-white/20 bg-white text-zinc-950 shadow-lg shadow-black/20 hover:bg-white/90"
              )}
            >
              <ArrowUpRightIcon aria-hidden />
              Add an expense
            </Link>
            <Link
              href="/dashboard/people"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "border-white/20 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white"
              )}
            >
              Who owes whom
              <ArrowRightIcon aria-hidden />
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <SummaryCard
            label="Active groups"
            value={summary.activeGroups}
            hint="Trips, flats, and teams"
            icon={UsersRoundIcon}
            className="sn-rise sn-delay-2"
          />

          <Card className="sn-rise sn-delay-3 relative overflow-hidden">
            <span
              aria-hidden
              className="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full bg-brand/15 blur-2xl"
            />
            <CardHeader className="relative">
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Your nests</CardTitle>
                <Link
                  href="/dashboard/groups"
                  className="text-xs font-medium text-brand underline-offset-4 hover:underline"
                >
                  View all
                </Link>
              </div>
              <CardDescription>
                {groups.length === 0
                  ? "Your first nest is waiting."
                  : `${groups.length} active ${groups.length === 1 ? "nest" : "nests"}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="relative space-y-2.5">
              {groups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You are not in a group yet.{" "}
                  <Link
                    href="/dashboard/groups"
                    className="font-medium text-foreground underline"
                  >
                    Create one
                  </Link>
                  .
                </p>
              ) : (
                groups.slice(0, 3).map((group) => (
                  <Link
                    key={group.id}
                    href={`/dashboard/groups/${group.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-transparent px-2 py-1.5 transition-colors hover:border-border/70 hover:bg-foreground/[0.03]"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        aria-hidden
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-brand/15 to-primary/10 text-base ring-1 ring-brand/10"
                      >
                        {group.emoji}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {group.name}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {group.memberCount}{" "}
                          {group.memberCount === 1 ? "member" : "members"}
                        </span>
                      </span>
                    </span>
                    <Amount value={group.netBalance} className="text-sm" />
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {groups.length > 0 ? (
        <div className="sn-enter sn-delay-2 flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card/50 px-4 py-3 text-xs text-muted-foreground backdrop-blur">
          <AvatarGroup aria-hidden>
            {groups
              .flatMap((group) => group.members)
              .slice(0, 5)
              .map((member) => (
                <MemberAvatar key={member.id} name={member.name} size="sm" />
              ))}
            <AvatarGroupCount className="text-[0.65rem]">
              +{Math.max(groups.flatMap((group) => group.members).length - 5, 0)}
            </AvatarGroupCount>
          </AvatarGroup>
          <span>
            Splitting with{" "}
            <span className="font-medium text-foreground">
              {new Set(groups.flatMap((group) => group.members).map((m) => m.id)).size}
            </span>{" "}
            people across every nest.
          </span>
          <Link
            href="/dashboard/people"
            className="ml-auto inline-flex items-center gap-1 font-medium text-brand underline-offset-4 hover:underline"
          >
            See your circle
            <ArrowUpRightIcon className="size-3.5" aria-hidden />
          </Link>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="sn-rise sn-delay-3 lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Recent activity</CardTitle>
                <CardDescription>
                  The latest expenses across your groups.
                </CardDescription>
              </div>
              <Link
                href="/dashboard/activity"
                className="hidden items-center gap-1 text-xs font-medium text-brand underline-offset-4 hover:underline sm:inline-flex"
              >
                View all
                <ArrowRightIcon className="size-3.5" aria-hidden />
              </Link>
            </div>
          </CardHeader>
          <ExpenseTable
            expenses={recentExpenses}
            emptyMessage="No expenses yet. Create a group to get started."
          />
        </Card>

        <div className="space-y-6">
          <Card className="sn-rise sn-delay-4">
            <CardHeader>
              <CardTitle>Balances</CardTitle>
              <CardDescription>Who owes whom right now.</CardDescription>
            </CardHeader>
            <CardContent>
              <BalanceList balances={balances} />
            </CardContent>
          </Card>

          <Card className="sn-rise sn-delay-5 relative overflow-hidden">
            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-12 -left-10 size-32 rounded-full bg-success/15 blur-2xl"
            />
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
              <CardDescription>Keep the nest tidy in one tap.</CardDescription>
            </CardHeader>
            <CardContent className="relative space-y-2">
              <Link
                href="/dashboard/groups/new"
                className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/60 px-3 py-2.5 text-sm font-medium transition-colors hover:border-brand/30 hover:bg-brand/5"
              >
                <span className="flex size-7 items-center justify-center rounded-lg sn-tint-brand">
                  <UsersRoundIcon className="size-3.5" aria-hidden />
                </span>
                Create a new nest
              </Link>
              <Link
                href="/dashboard/groups"
                className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/60 px-3 py-2.5 text-sm font-medium transition-colors hover:border-brand/30 hover:bg-brand/5"
              >
                <span className="flex size-7 items-center justify-center rounded-lg sn-tint-success">
                  <WalletIcon className="size-3.5" aria-hidden />
                </span>
                Log an expense
              </Link>
              <Link
                href="/dashboard/activity"
                className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/60 px-3 py-2.5 text-sm font-medium transition-colors hover:border-brand/30 hover:bg-brand/5"
              >
                <span className="flex size-7 items-center justify-center rounded-lg bg-warning/15 text-warning">
                  <ReceiptTextIcon className="size-3.5" aria-hidden />
                </span>
                Review activity
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-16 w-full max-w-md sn-skeleton rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-[1.65fr_1fr]">
        <div className="h-80 sn-skeleton rounded-3xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="h-28 sn-skeleton rounded-2xl" />
          <div className="h-44 sn-skeleton rounded-2xl" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-80 sn-skeleton rounded-2xl lg:col-span-2" />
        <div className="h-80 sn-skeleton rounded-2xl" />
      </div>
    </div>
  );
}
