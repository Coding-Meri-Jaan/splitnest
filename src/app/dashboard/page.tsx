import {
  CreditCardIcon,
  HandCoinsIcon,
  PlusIcon,
  UsersRoundIcon,
  WalletIcon,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { BalanceList } from "@/components/dashboard/balance-list";
import { ExpenseTable } from "@/components/dashboard/expense-table";
import { Amount } from "@/components/shared/amount";
import { PageHeader } from "@/components/shared/page-header";
import { SummaryCard } from "@/components/shared/summary-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDashboardData } from "@/lib/data/groups";
import { getCurrentUser } from "@/lib/auth/user";

export default function DashboardOverviewPage() {
  return (
    <Suspense fallback={<OverviewSkeleton />}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const user = await getCurrentUser();
  const { summary, groups, recentExpenses, balances } = await getDashboardData(user.id);
  const firstName = user.fullName.split(" ")[0];

  return (
    <div className="space-y-6">
      <PageHeader
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
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900/60 dark:bg-amber-950/30">
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="You are owed"
          value={
            <Amount
              value={summary.youAreOwed}
              signed={false}
              className="text-emerald-600 dark:text-emerald-400"
            />
          }
          hint="Across all groups"
          icon={HandCoinsIcon}
          tone="positive"
        />
        <SummaryCard
          label="You owe"
          value={
            <Amount
              value={summary.youOwe}
              signed={false}
              className="text-rose-600 dark:text-rose-400"
            />
          }
          hint="Across all groups"
          icon={CreditCardIcon}
          tone="negative"
        />
        <SummaryCard
          label="Net balance"
          value={<Amount value={summary.netBalance} />}
          hint={summary.netBalance >= 0 ? "In your favour" : "You are behind"}
          icon={WalletIcon}
          tone={summary.netBalance >= 0 ? "positive" : "negative"}
        />
        <SummaryCard
          label="Active groups"
          value={summary.activeGroups}
          hint="Trips, flats, and teams"
          icon={UsersRoundIcon}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>The latest expenses across your groups.</CardDescription>
          </CardHeader>
          <ExpenseTable
            expenses={recentExpenses}
            emptyMessage="No expenses yet. Create a group to get started."
          />
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Balances</CardTitle>
              <CardDescription>Who owes whom right now.</CardDescription>
            </CardHeader>
            <CardContent>
              <BalanceList balances={balances} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your groups</CardTitle>
              <CardDescription>
                {groups.length} active {groups.length === 1 ? "nest" : "nests"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {groups.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  You are not in a group yet.{" "}
                  <Link href="/dashboard/groups" className="font-medium text-foreground underline">
                    Create one
                  </Link>
                  .
                </p>
              ) : (
                groups.map((group) => (
                  <Link
                    key={group.id}
                    href={`/dashboard/groups/${group.id}`}
                    className="flex items-center justify-between gap-3 rounded-md transition-colors hover:bg-muted/60"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="flex size-8 items-center justify-center rounded-md bg-muted text-base"
                      >
                        {group.emoji}
                      </span>
                      <span className="text-sm font-medium">{group.name}</span>
                    </span>
                    <Amount value={group.netBalance} />
                  </Link>
                ))
              )}
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
      <div className="h-16 w-full max-w-md animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-80 animate-pulse rounded-xl bg-muted lg:col-span-2" />
        <div className="h-80 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}
