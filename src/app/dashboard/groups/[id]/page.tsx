import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ComponentType } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  HandshakeIcon,
  PlusIcon,
  ReceiptTextIcon,
  ScaleIcon,
  SettingsIcon,
  SmartphoneIcon,
  UsersRoundIcon,
  WalletIcon,
} from "lucide-react";

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
import { cn } from "@/lib/utils";

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
        className="-ml-2"
      >
        <ArrowLeftIcon />
        All groups
      </Button>

      {confirmation ? (
        <p
          role="status"
          className="sn-enter flex items-center gap-2 rounded-2xl border border-success/30 bg-success/8 px-4 py-2.5 text-sm text-success"
        >
          <ReceiptTextIcon className="size-4" aria-hidden />
          {confirmation}
        </p>
      ) : null}

      {deleteError ? (
        <p
          role="alert"
          className="sn-enter rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm text-destructive"
        >
          {deleteError}
        </p>
      ) : null}

      {!canEdit ? (
        <p className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-card/50 px-4 py-2.5 text-sm text-muted-foreground backdrop-blur">
          <RoleBadge role={group.role} withDescription />
          You have view-only access. Ask an admin to make you an Editor if you
          need to add expenses.
        </p>
      ) : null}

      <PageHeader
        eyebrow="Nest"
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

      <section className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
        <div className="sn-hero-panel sn-rise relative overflow-hidden rounded-3xl p-6">
          <span
            aria-hidden
            className="sn-orb -top-14 right-0 size-44 bg-fuchsia-400/30"
          />
          <p className="relative text-[0.7rem] font-semibold tracking-[0.18em] text-white/65 uppercase">
            Your balance in this nest
          </p>
          <p className="relative mt-2 font-heading text-4xl font-semibold tracking-tighter sm:text-5xl">
            <Amount
              value={group.netBalance}
              className={cn(
                "text-white",
                group.netBalance > 0 && "text-emerald-200",
                group.netBalance < 0 && "text-rose-200"
              )}
            />
          </p>
          <p className="relative mt-2 max-w-md text-sm text-white/65">
            {group.netBalance > 0
              ? "The group owes you. Settle up whenever you are ready."
              : group.netBalance < 0
                ? "You owe the group. Clear it with the fewest transfers."
                : "You are all settled up in this nest."}
          </p>
          {canEdit ? (
            <div className="relative mt-5 flex flex-wrap gap-2">
              <Link
                href={`/dashboard/groups/${group.id}/expenses/new`}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-zinc-950 shadow-lg shadow-black/20 transition-transform hover:bg-white/90 motion-safe:hover:-translate-y-0.5"
              >
                <PlusIcon className="size-4" aria-hidden />
                Add expense
              </Link>
              <Link
                href={`/dashboard/groups/${group.id}/settle`}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
              >
                <HandshakeIcon className="size-4" aria-hidden />
                Record settlement
              </Link>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <GroupStat
            label="Total spent"
            value={formatINR(totalSpent)}
            icon={WalletIcon}
            tone="brand"
          />
          <GroupStat
            label="Members"
            value={String(group.memberCount)}
            icon={UsersRoundIcon}
            tone="success"
          />
          <GroupStat
            label="Expenses"
            value={String(expenses.length)}
            icon={ReceiptTextIcon}
            tone="warning"
          />
          <GroupStat
            label="Settlements"
            value={String(settlements.length)}
            icon={ScaleIcon}
            tone="neutral"
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="sn-rise sn-delay-2">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Expenses</CardTitle>
                  <CardDescription>Everything logged in this nest.</CardDescription>
                </div>
                <Badge variant="outline" className="hidden sm:inline-flex">
                  {expenses.length} total
                </Badge>
              </div>
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

          <Card className="sn-rise sn-delay-3">
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
          <Card className="sn-rise sn-delay-3">
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

          <Card className="sn-rise sn-delay-4">
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>{group.memberCount} in this nest</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-1">
                {group.members.map((member) => (
                  <li
                    key={member.id}
                    className="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5 transition-colors hover:bg-foreground/[0.03]"
                  >
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
                  className="w-full"
                  nativeButton={false}
                  render={<Link href={`/dashboard/groups/${group.id}/settings`} />}
                >
                  Manage members and roles
                  <ArrowRightIcon />
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Only the owner or a co-owner can add people.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="sn-rise sn-delay-5">
            <CardHeader>
              <CardTitle>Suggested settlements</CardTitle>
              <CardDescription>The fewest payments that clear this group.</CardDescription>
            </CardHeader>
            <CardContent>
              {suggestedTransfers.length === 0 ? (
                <p className="flex items-center gap-2 rounded-xl bg-success/8 px-3 py-2 text-sm text-success">
                  <HandshakeIcon className="size-4" aria-hidden />
                  Everyone is settled up.
                </p>
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
                    const isMine = transfer.fromUserId === user.id;

                    return (
                      <li
                        key={`${transfer.fromUserId}-${transfer.toUserId}`}
                        className={cn(
                          "space-y-1.5 rounded-xl border p-3",
                          isMine
                            ? "border-brand/25 bg-brand/5"
                            : "border-border/60 bg-card/50"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-muted-foreground">
                            <span className="font-medium text-foreground">{transfer.fromName}</span> pays{" "}
                            <span className="font-medium text-foreground">{transfer.toName}</span>
                          </span>
                          <Amount value={transfer.amount} signed={false} />
                        </div>
                        {!isMine ? (
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

interface GroupStatProps {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  tone: "brand" | "success" | "warning" | "neutral";
}

const statTones: Record<GroupStatProps["tone"], string> = {
  brand: "sn-tint-brand",
  success: "sn-tint-success",
  warning: "bg-warning/12 text-warning ring-1 ring-warning/20",
  neutral: "bg-muted text-muted-foreground ring-1 ring-border/60",
};

function GroupStat({ label, value, icon: Icon, tone }: GroupStatProps) {
  return (
    <div className="sn-surface sn-hover-lift rounded-2xl p-4">
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-xl",
          statTones[tone]
        )}
      >
        <Icon className="size-4" />
      </span>
      <p className="mt-3 text-[0.65rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 font-heading text-lg font-semibold tracking-tight">
        {value}
      </p>
    </div>
  );
}

function GroupSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-24 sn-skeleton rounded-full" />
      <div className="h-16 w-full max-w-lg sn-skeleton rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
        <div className="h-64 sn-skeleton rounded-3xl" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 sn-skeleton rounded-2xl" />
          ))}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-80 sn-skeleton rounded-2xl lg:col-span-2" />
        <div className="h-80 sn-skeleton rounded-2xl" />
      </div>
    </div>
  );
}
