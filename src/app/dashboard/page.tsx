import {
  CreditCardIcon,
  HandCoinsIcon,
  PlusIcon,
  UsersRoundIcon,
  WalletIcon,
} from "lucide-react";

import { Amount } from "@/components/shared/amount";
import { PageHeader } from "@/components/shared/page-header";
import { SummaryCard } from "@/components/shared/summary-card";
import { BalanceList } from "@/components/dashboard/balance-list";
import { ExpenseTable } from "@/components/dashboard/expense-table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  balances,
  currentUserId,
  expenses,
  getMember,
  groups,
  summary,
} from "@/data/sample-data";

export default function DashboardOverviewPage() {
  const user = getMember(currentUserId);
  const firstName = user?.name.split(" ")[0] ?? "there";
  const recentExpenses = [...expenses]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Here is where things stand across your groups."
        action={
          <Button type="button">
            <PlusIcon />
            Add expense
          </Button>
        }
      />

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
            <CardDescription>
              The latest expenses across your groups.
            </CardDescription>
          </CardHeader>
          <ExpenseTable expenses={recentExpenses} />
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
              <CardDescription>{groups.length} active nests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between gap-3"
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
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
