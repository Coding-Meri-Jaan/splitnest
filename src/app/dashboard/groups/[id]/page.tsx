import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeftIcon, PlusIcon, ReceiptTextIcon, ScaleIcon, SettingsIcon, SmartphoneIcon } from "lucide-react";

import { BalanceList } from "@/components/dashboard/balance-list";
import { ExpenseTable } from "@/components/dashboard/expense-table";
import { RoleBadge } from "@/components/dashboard/role-badge";
import { SettlementList } from "@/components/dashboard/settlement-list";
import { Amount } from "@/components/shared/amount";
import { MemberAvatar } from "@/components/shared/member-avatar";
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
import { getGroupDetail } from "@/lib/data/groups";
import { formatINR } from "@/lib/format";
import { canEditLedger, canManageGroup } from "@/lib/roles";
import { buildUpiUri } from "@/lib/upi";

export const metadata: Metadata = {
  title: "Group",
};

interface GroupPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    added?: string;
    settled?: string;
    updated?: string;
    deleted?: string;
    deleteError?: string;
  }>;
}

export default function GroupPage({ params, searchParams }: GroupPageProps) {
  return (
    <Suspense fallback={<GroupSkeleton />}>
      <GroupContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function GroupContent({ params, searchParams }: GroupPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  const detail = await getGroupDetail(user.id, id);

  if (!detail) {
    notFound();
  }

  const { group, expenses, settlements, balances, suggestedTransfers, totalSpent } = detail;
  const canEdit = canEditLedger(group.role);
  const canManage = canManageGroup(group.role);
  const confirmation =
    query.settled === "1"
      ? "Settlement recorded."
      : query.added === "1"
        ? "Expense added."
        : query.updated === "1"
          ? "Expense updated."
          : query.deleted === "expense"
            ? "Expense deleted."
            : query.deleted === "settlement"
              ? "Settlement deleted."
              : null;
  const deleteError =
    query.deleteError === "expense"
      ? "Could not delete that expense. It may have already been removed — refresh the page and check again."
      : query.deleteError === "settlement"
        ? "Could not delete that settlement. It may have already been removed — refresh the page and check again."
        : query.deleteError === "invalid"
          ? "That delete request was invalid. Refresh the page and try again."
          : null;

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
        render={<Link href="/dashboard/groups" />}
      >
        <ArrowLeftIcon />
        All groups
      </Button>

      {confirmation ? (
        <p
          role="status"
          className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400"
        >
          {confirmation}
        </p>
      ) : null}

      {deleteError ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {deleteError}
        </p>
      ) : null}

      {!canEdit ? (
        <p className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <RoleBadge role={group.role} withDescription />
          You have view-only access. Ask an admin to make you an Editor if you
          need to add expenses.
        </p>
      ) : null}

      <PageHeader
        title={`${group.emoji} ${group.name}`}
        description={`${group.memberCount} members · ${formatINR(totalSpent)} spent so far`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/dashboard/groups/${group.id}/settings`} />}
            >
              <SettingsIcon />
              Settings
            </Button>
            {canEdit ? (
              <>
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link href={`/dashboard/groups/${group.id}/settle`} />}
                >
                  <ScaleIcon />
                  Settle up
                </Button>
                <Button
                  nativeButton={false}
                  render={<Link href={`/dashboard/groups/${group.id}/expenses/new`} />}
                >
                  <PlusIcon />
                  Add expense
                </Button>
              </>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Expenses</CardTitle>
              <CardDescription>Everything logged in this nest.</CardDescription>
            </CardHeader>
            <ExpenseTable
              expenses={expenses}
              showGroup={false}
              showEdit
              showDelete
              currentUserId={user.id}
              role={group.role}
              emptyMessage="No expenses yet. Add the first one."
            />
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Settlements</CardTitle>
              <CardDescription>Payments already recorded outside SplitNest.</CardDescription>
            </CardHeader>
            <CardContent>
              <SettlementList
                settlements={settlements}
                currentUserId={user.id}
                role={group.role}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your balance</CardTitle>
              <CardDescription>
                {balances.length === 0
                  ? "You are all settled up here."
                  : "Who you owe, and who owes you."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BalanceList balances={balances} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>{group.memberCount} in this nest</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {group.members.map((member) => (
                  <li key={member.id} className="flex items-center gap-2.5">
                    <MemberAvatar name={member.name} size="sm" />
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        <span className="truncate">{member.name}</span>
                        <RoleBadge role={member.role} withDescription />
                        {member.id === user.id ? <Badge variant="outline">You</Badge> : null}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                    </div>
                  </li>
                ))}
              </ul>
              {canManage ? (
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={<Link href={`/dashboard/groups/${group.id}/settings`} />}
                >
                  Manage members and roles
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Only the owner or a co-owner can add people.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Suggested settlements</CardTitle>
              <CardDescription>The fewest payments that clear this group.</CardDescription>
            </CardHeader>
            <CardContent>
              {suggestedTransfers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Everyone is settled up.</p>
              ) : (
                <ul className="space-y-3">
                  {suggestedTransfers.map((transfer) => {
                    const upiUri = transfer.toUpiId
                      ? buildUpiUri({
                          upiId: transfer.toUpiId,
                          payeeName: transfer.toName,
                          amountRupees: transfer.amount,
                          note: group.name,
                        })
                      : null;

                    return (
                      <li key={`${transfer.fromUserId}-${transfer.toUserId}`} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-muted-foreground">
                            <span className="font-medium text-foreground">{transfer.fromName}</span> pays{" "}
                            <span className="font-medium text-foreground">{transfer.toName}</span>
                          </span>
                          <Amount value={transfer.amount} signed={false} />
                        </div>
                        {transfer.fromUserId !== user.id ? (
                          <p className="text-xs text-muted-foreground">
                            Record it once the payment is made.
                          </p>
                        ) : upiUri ? (
                          <Button
                            variant="outline"
                            size="sm"
                            nativeButton={false}
                            render={<a href={upiUri} />}
                          >
                            <SmartphoneIcon />
                            Pay via UPI
                          </Button>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            {transfer.toName} has not added a UPI id yet.
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ReceiptTextIcon className="size-3.5" />
        UPI links only open your payment app. SplitNest never holds or moves money.
      </p>
    </div>
  );
}

function GroupSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
      <div className="h-16 w-full max-w-lg animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-80 animate-pulse rounded-xl bg-muted lg:col-span-2" />
        <div className="h-80 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  );
}
