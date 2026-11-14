import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import {
  ArrowLeftIcon,
  CalendarIcon,
  HandshakeIcon,
  InfoIcon,
  PencilIcon,
  ReceiptTextIcon,
  UsersRoundIcon,
  WalletIcon,
} from "lucide-react";

import { MemberAvatar } from "@/components/shared/member-avatar";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/user";
import { getExpenseDetail } from "@/lib/data/activity";
import { categoryTints } from "@/lib/category-tints";
import { getCategoryMeta } from "@/lib/categories";
import { formatDate, formatDateTime, formatINR } from "@/lib/format";
import { canEditRow } from "@/lib/roles";
import { SETTLEMENT_METHOD_LABELS } from "@/lib/settlements";
import { SPLIT_MODE_DESCRIPTIONS, SPLIT_MODE_LABELS } from "@/lib/splits";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Expense",
};

interface ExpenseDetailPageProps {
  params: Promise<{ id: string; expenseId: string }>;
}

export default function ExpenseDetailPage({
  params,
}: ExpenseDetailPageProps) {
  return (
    <Suspense fallback={<div className="h-96 sn-skeleton rounded-2xl" />}>
      <ExpenseDetailContent params={params} />
    </Suspense>
  );
}

async function ExpenseDetailContent({ params }: ExpenseDetailPageProps) {
  const { id, expenseId } = await params;
  const user = await getCurrentUser();
  const data = await getExpenseDetail(user.id, id, expenseId);

  if (!data) {
    notFound();
  }

  const { group, expense, settlements } = data;
  const meta = getCategoryMeta(expense.category);
  const CategoryIcon = meta.icon;
  const memberNames = new Map(
    group.members.map((member) => [member.id, member.name]),
  );

  const splits = [...expense.splits]
    .map((split) => ({
      ...split,
      name: memberNames.get(split.userId) ?? "Former member",
    }))
    .sort((a, b) => b.share - a.share || a.name.localeCompare(b.name));

  const yourShare =
    splits.find((split) => split.userId === user.id)?.share ?? null;
  const canEdit = canEditRow(group.role, expense.createdById === user.id);
  const payerName = memberNames.get(expense.paidById) ?? expense.paidByName;

  const recentSettlements = [...settlements]
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
    )
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href={`/dashboard/groups/${group.id}`} />}
        >
          <ArrowLeftIcon />
          {group.emoji} {group.name}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/dashboard/activity" />}
        >
          Back to activity
        </Button>
      </div>

      <PageHeader
        eyebrow={`${group.emoji} ${group.name}`}
        title={expense.title}
        description={`${meta.label} · ${formatDate(expense.date)}`}
        action={
          canEdit ? (
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link
                  href={`/dashboard/groups/${group.id}/expenses/${expense.id}/edit`}
                />
              }
            >
              <PencilIcon />
              Edit expense
            </Button>
          ) : undefined
        }
      />

      <Card className="sn-rise relative overflow-hidden">
        <span
          aria-hidden
          className="sn-orb -top-20 -right-14 size-52 bg-brand/15"
        />
        <CardContent className="relative space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className={cn(
                  "flex size-12 items-center justify-center rounded-2xl bg-linear-to-br ring-1",
                  categoryTints[expense.category],
                )}
              >
                <CategoryIcon className="size-6" />
              </span>
              <div>
                <p className="text-[0.68rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                  Total amount
                </p>
                <p className="font-heading text-3xl font-semibold tracking-tighter tabular-nums sm:text-4xl">
                  {formatINR(expense.amount)}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/50 bg-background/40 px-3.5 py-2.5 text-right">
              <p className="text-[0.65rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                Your share
              </p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums">
                {yourShare === null ? "Not included" : formatINR(yourShare)}
              </p>
            </div>
          </div>

          <dl className="grid gap-3 border-t border-border/50 pt-4 sm:grid-cols-2">
            <Detail
              icon={WalletIcon}
              label="Paid by"
              value={
                <span className="inline-flex items-center gap-2">
                  <MemberAvatar name={payerName} size="sm" />
                  {expense.paidById === user.id ? "You" : payerName}
                </span>
              }
            />
            <Detail
              icon={UsersRoundIcon}
              label="Split between"
              value={`${splits.length} ${
                splits.length === 1 ? "person" : "people"
              }`}
            />
            <Detail
              icon={CalendarIcon}
              label="Expense date"
              value={formatDate(expense.date)}
            />
            <Detail
              icon={ReceiptTextIcon}
              label="Split method"
              value={SPLIT_MODE_LABELS[expense.splitMode]}
            />
          </dl>

          {expense.notes ? (
            <p className="rounded-xl border border-border/50 bg-background/40 px-3.5 py-3 text-sm leading-relaxed text-muted-foreground">
              {expense.notes}
            </p>
          ) : null}

          <p className="text-[0.68rem] text-muted-foreground">
            Added by {expense.createdByName} on{" "}
            {formatDateTime(expense.createdAt)}. This ledger does not track
            receipt images or comments.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersRoundIcon className="size-4 text-brand" aria-hidden />
            Who owes what
          </CardTitle>
          <CardDescription>
            {SPLIT_MODE_DESCRIPTIONS[expense.splitMode]}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border/50">
            {splits.map((split) => {
              const isYou = split.userId === user.id;
              const isPayer = split.userId === expense.paidById;

              return (
                <li
                  key={split.userId}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span className="inline-flex min-w-0 items-center gap-2.5">
                    <MemberAvatar name={split.name} size="sm" />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                        <span className="truncate">
                          {isYou ? "You" : split.name}
                        </span>
                        {isPayer ? (
                          <span className="rounded-full sn-tint-brand px-1.5 py-0.5 text-[0.6rem] font-semibold">
                            Paid
                          </span>
                        ) : null}
                      </span>
                      {split.inputValue !== null ? (
                        <span className="block text-[0.68rem] text-muted-foreground">
                          {expense.splitMode === "percentage"
                            ? `${split.inputValue}% of the total`
                            : `${split.inputValue} shares`}
                        </span>
                      ) : null}
                    </span>
                  </span>

                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatINR(split.share)}
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HandshakeIcon className="size-4 text-success" aria-hidden />
            Settlements in {group.name}
          </CardTitle>
          <CardDescription className="flex items-start gap-1.5">
            <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Payments settle the group&apos;s overall balance. They are not
            tied to this individual expense.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentSettlements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No payments have been recorded in this nest yet.
            </p>
          ) : (
            <ul className="divide-y divide-border/50">
              {recentSettlements.map((settlement) => (
                <li
                  key={settlement.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg sn-tint-success">
                      <HandshakeIcon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {settlement.fromName} paid {settlement.toName}
                      </span>
                      <span className="block text-[0.68rem] text-muted-foreground">
                        {formatDate(settlement.date)} ·{" "}
                        {SETTLEMENT_METHOD_LABELS[settlement.method]}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-success tabular-nums">
                    {formatINR(settlement.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={`/dashboard/groups/${group.id}`} />}
            >
              Open group ledger
            </Button>
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href="/dashboard/activity?kind=settlement" />}
            >
              View all settlements
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface DetailProps {
  icon: typeof WalletIcon;
  label: string;
  value: ReactNode;
}

function Detail({ icon: Icon, label, value }: DetailProps) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-border/50 bg-background/40 px-3.5 py-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <dt className="text-[0.65rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
          {label}
        </dt>
        <dd className="mt-0.5 text-sm font-medium">{value}</dd>
      </div>
    </div>
  );
}
