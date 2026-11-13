import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  CreditCardIcon,
  HandCoinsIcon,
  InfoIcon,
  PlusIcon,
  ReceiptTextIcon,
  ScaleIcon,
  WalletIcon,
} from "lucide-react";

import { CategoryDonut } from "@/components/dashboard/analytics/category-donut";
import { DashboardEmpty } from "@/components/dashboard/analytics/dashboard-empty";
import { GroupDistribution } from "@/components/dashboard/analytics/group-distribution";
import { NestsList } from "@/components/dashboard/analytics/nests-list";
import { OutstandingList } from "@/components/dashboard/analytics/outstanding-list";
import { PaidVsShare } from "@/components/dashboard/analytics/paid-vs-share";
import { RecentActivity } from "@/components/dashboard/analytics/recent-activity";
import { TrendChart } from "@/components/dashboard/analytics/trend-chart";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { PageHeader } from "@/components/shared/page-header";
import { PaiseAmount } from "@/components/shared/paise-amount";
import { SummaryCard } from "@/components/shared/summary-card";
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
import type { DashboardQuery } from "@/lib/analytics-filters";
import { getDashboardAnalytics } from "@/lib/data/dashboard";
import { formatPaise } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Overview",
};

interface DashboardPageProps {
  searchParams: Promise<DashboardQuery>;
}

export default function DashboardOverviewPage({
  searchParams,
}: DashboardPageProps) {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <Overview searchParams={searchParams} />
    </Suspense>
  );
}

async function Overview({ searchParams }: DashboardPageProps) {
  const [user, query] = await Promise.all([getCurrentUser(), searchParams]);
  const { analytics, filters, groups, groupOptions, categoryOptions } =
    await getDashboardAnalytics(user.id, query, new Date());

  const firstName = user.fullName.split(" ")[0];
  const hasAnyGroups = groupOptions.length > 0;
  const showFullDashboard = analytics.hasAnyExpenses;

  const resultParts = [
    `${analytics.totals.filteredExpenseCount} ${
      analytics.totals.filteredExpenseCount === 1 ? "expense" : "expenses"
    }`,
  ];
  if (filters.category === null && analytics.totals.filteredSettlementCount > 0) {
    resultParts.push(
      `${analytics.totals.filteredSettlementCount} ${
        analytics.totals.filteredSettlementCount === 1
          ? "settlement"
          : "settlements"
      }`,
    );
  }
  resultParts.push(
    `${analytics.balances.groupCount} ${
      analytics.balances.groupCount === 1 ? "group" : "groups"
    }`,
  );
  const resultLabel = resultParts.join(" · ");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Your money, at a glance"
        title={firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        description="Every expense, every group, and every pending settlement — in one place."
        action={
          <Button nativeButton={false} render={<Link href="/dashboard/groups" />}>
            <PlusIcon />
            Add expense
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

      {showFullDashboard ? (
        <>
          <DashboardFilters
            groups={groupOptions}
            categories={categoryOptions}
            active={filters}
            resultLabel={resultLabel}
          />

          {analytics.totals.filteredExpenseCount === 0 ? (
            <div className="sn-enter flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
              <p>
                No expenses match these filters. Overview balances below are{" "}
                <strong>live</strong> and ignore date and category filters.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1 font-medium text-foreground underline underline-offset-4"
              >
                Clear filters
                <ArrowRightIcon className="size-3.5" aria-hidden />
              </Link>
            </div>
          ) : null}

          <section aria-labelledby="overview-heading" className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2
                  id="overview-heading"
                  className="font-heading text-lg font-semibold tracking-tight"
                >
                  Overview
                </h2>
                <p className="text-xs text-muted-foreground">
                  Paid and share follow your filters. Owe, owed and net are live
                  balances.
                </p>
              </div>
              <Badge variant="outline">Live balances</Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <SummaryCard
                label="Total paid"
                value={
                  <PaiseAmount
                    value={analytics.overview.totalPaidPaise}
                    signed={false}
                  />
                }
                hint={`${analytics.overview.expenseCount} ${
                  analytics.overview.expenseCount === 1 ? "expense" : "expenses"
                } in view`}
                icon={WalletIcon}
                tone="neutral"
                className="sn-rise"
              />
              <SummaryCard
                label="Your share"
                value={
                  <PaiseAmount
                    value={analytics.overview.personalSharePaise}
                    signed={false}
                  />
                }
                hint={`Avg ${formatPaise(analytics.overview.averageSharePaise)} per expense`}
                icon={ReceiptTextIcon}
                tone="neutral"
                className="sn-rise sn-delay-1"
              />
              <SummaryCard
                label="You owe"
                value={
                  <PaiseAmount
                    value={analytics.balances.youOwePaise}
                    signed={false}
                  />
                }
                hint={`Live · ${analytics.balances.groupCount} ${
                  analytics.balances.groupCount === 1 ? "group" : "groups"
                }`}
                icon={CreditCardIcon}
                tone="negative"
                className="sn-rise sn-delay-2"
              />
              <SummaryCard
                label="Owed to you"
                value={
                  <PaiseAmount
                    value={analytics.balances.youAreOwedPaise}
                    signed={false}
                  />
                }
                hint={`After every recorded settlement`}
                icon={HandCoinsIcon}
                tone="positive"
                className="sn-rise sn-delay-3"
              />
              <SummaryCard
                label="Net outstanding"
                value={
                  <PaiseAmount
                    value={analytics.balances.netOutstandingPaise}
                    signed
                  />
                }
                hint="Owed to you − you owe"
                icon={ScaleIcon}
                tone={
                  analytics.balances.netOutstandingPaise > 0
                    ? "positive"
                    : analytics.balances.netOutstandingPaise < 0
                      ? "negative"
                      : "neutral"
                }
                className="sn-rise sn-delay-4"
              />
            </div>
          </section>

          <section aria-labelledby="analytics-heading" className="space-y-3">
            <div>
              <h2
                id="analytics-heading"
                className="font-heading text-lg font-semibold tracking-tight"
              >
                Spending analytics
              </h2>
              <p className="text-xs text-muted-foreground">
                Based on saved splits, so equal, exact, percentage and share
                splits all reconcile with group balances.
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <Card className="sn-rise xl:col-span-2">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle>Spending trend</CardTitle>
                      <CardDescription>
                        What you paid and what was actually your share, by{" "}
                        {filters.granularity === "monthly" ? "month" : "year"}.
                      </CardDescription>
                    </div>
                    <div className="flex gap-4 text-right">
                      <MiniStat
                        label="Group spend"
                        value={formatPaise(analytics.overview.totalSpentPaise)}
                      />
                      <MiniStat
                        label="Bills"
                        value={String(analytics.overview.expenseCount)}
                      />
                      <MiniStat
                        label="Avg bill"
                        value={formatPaise(
                          analytics.overview.averageExpensePaise,
                        )}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <TrendChart
                    points={analytics.trend.points}
                    maxPaise={analytics.trend.maxPaise}
                    granularity={analytics.trend.granularity}
                    truncated={analytics.trend.truncated}
                  />
                </CardContent>
              </Card>

              <Card className="sn-rise sn-delay-1">
                <CardHeader>
                  <CardTitle>Where your share goes</CardTitle>
                  <CardDescription>
                    Your personal share split by category.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CategoryDonut
                    slices={analytics.categories.slices}
                    totalSharePaise={analytics.categories.totalSharePaise}
                  />
                </CardContent>
              </Card>

              <Card className="sn-rise sn-delay-2">
                <CardHeader>
                  <CardTitle>Paid vs your share</CardTitle>
                  <CardDescription>
                    Did you front more than you consumed?
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PaidVsShare
                    paidPaise={analytics.comparison.paidPaise}
                    sharePaise={analytics.comparison.sharePaise}
                    differencePaise={analytics.comparison.differencePaise}
                    averageExpensePaise={analytics.overview.averageExpensePaise}
                    averageSharePaise={analytics.overview.averageSharePaise}
                  />
                </CardContent>
              </Card>

              <Card className="sn-rise sn-delay-3 xl:col-span-2">
                <CardHeader>
                  <CardTitle>Groups</CardTitle>
                  <CardDescription>
                    How your personal share is distributed across nests.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <GroupDistribution
                    slices={analytics.groups.slices}
                    totalSharePaise={analytics.groups.totalSharePaise}
                  />
                </CardContent>
              </Card>
            </div>
          </section>

          <section
            aria-label="Recent activity and outstanding balances"
            className="grid gap-6 xl:grid-cols-3"
          >
            <Card className="sn-rise xl:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Recent activity</CardTitle>
                    <CardDescription>
                      Latest expenses and settlements in this view.
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
              <CardContent className="p-0">
                <RecentActivity entries={analytics.activity} />
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="sn-rise sn-delay-1">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle>Outstanding settlements</CardTitle>
                      <CardDescription>
                        Pending payments and receivables.
                      </CardDescription>
                    </div>
                    <Badge variant="outline">
                      {analytics.outstanding.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <OutstandingList entries={analytics.outstanding} />
                </CardContent>
              </Card>

              <Card className="sn-rise sn-delay-2">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle>Your nests</CardTitle>
                      <CardDescription>Jump back into a group.</CardDescription>
                    </div>
                    <Link
                      href="/dashboard/groups"
                      className="inline-flex items-center gap-1 text-xs font-medium text-brand underline-offset-4 hover:underline"
                    >
                      View all
                      <ArrowUpRightIcon className="size-3.5" aria-hidden />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <NestsList groups={groups} />
                </CardContent>
              </Card>
            </div>
          </section>

          <p className="flex items-start gap-2 rounded-2xl border border-border/60 bg-card/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground backdrop-blur">
            <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              Flow totals use the splits saved with each expense. Partial
              payments and settlements only change balances, never the spending
              history. Excluded members are shown as &ldquo;Not in your
              split&rdquo;.
            </span>
          </p>
        </>
      ) : (
        <>
          <DashboardEmpty hasGroups={hasAnyGroups} />

          {hasAnyGroups ? (
            <div className="grid gap-6 xl:grid-cols-3">
              <Card className="sn-rise xl:col-span-2">
                <CardHeader>
                  <CardTitle>Your nests</CardTitle>
                  <CardDescription>
                    Groups you already share with friends and family.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <NestsList groups={groups} limit={8} />
                </CardContent>
              </Card>

              <Card className="sn-rise sn-delay-1">
                <CardHeader>
                  <CardTitle>Outstanding settlements</CardTitle>
                  <CardDescription>
                    Live balances once expenses are logged.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <OutstandingList entries={analytics.outstanding} />
                </CardContent>
              </Card>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[0.62rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className={cn("font-heading text-sm font-semibold tabular-nums")}>
        {value}
      </p>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-16 w-full max-w-md sn-skeleton rounded-2xl" />
      <div className="h-24 w-full sn-skeleton rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-28 sn-skeleton rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="h-80 sn-skeleton rounded-2xl xl:col-span-2" />
        <div className="h-80 sn-skeleton rounded-2xl" />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="h-80 sn-skeleton rounded-2xl xl:col-span-2" />
        <div className="h-80 sn-skeleton rounded-2xl" />
      </div>
    </div>
  );
}
