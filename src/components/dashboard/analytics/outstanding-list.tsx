import { ArrowRightIcon, HandshakeIcon } from "lucide-react";
import Link from "next/link";

import { MemberAvatar } from "@/components/shared/member-avatar";
import { Button } from "@/components/ui/button";
import type { OutstandingEntry } from "@/lib/analytics";
import { formatPaise } from "@/lib/format";
import { cn } from "@/lib/utils";

interface OutstandingListProps {
  entries: OutstandingEntry[];
}

export function OutstandingList({ entries }: OutstandingListProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl bg-success/8 px-4 py-8 text-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-success/12 text-success">
          <HandshakeIcon className="size-5" aria-hidden />
        </span>
        <p className="text-sm font-medium text-success">Everyone is settled up</p>
        <p className="max-w-xs text-xs text-success/80">
          No pending payments across the groups in view. New balances appear
          here automatically.
        </p>
      </div>
    );
  }

  const payables = entries.filter((entry) => entry.kind === "payable");
  const receivables = entries.filter((entry) => entry.kind === "receivable");
  const payablesTotal = payables.reduce(
    (sum, entry) => sum + -entry.amountPaise,
    0,
  );
  const receivablesTotal = receivables.reduce(
    (sum, entry) => sum + entry.amountPaise,
    0,
  );

  return (
    <div className="space-y-4">
      {payables.length > 0 ? (
        <section aria-labelledby="outstanding-payable">
          <div className="flex items-baseline justify-between gap-3">
            <h3
              id="outstanding-payable"
              className="text-[0.68rem] font-semibold tracking-[0.12em] text-destructive uppercase"
            >
              You owe
            </h3>
            <span className="text-xs font-semibold text-destructive tabular-nums">
              {formatPaise(payablesTotal)}
            </span>
          </div>
          <ul className="mt-1.5 space-y-1">
            {payables.map((entry) => (
              <OutstandingRow key={entryKey(entry)} entry={entry} />
            ))}
          </ul>
        </section>
      ) : null}

      {receivables.length > 0 ? (
        <section aria-labelledby="outstanding-receivable">
          <div className="flex items-baseline justify-between gap-3">
            <h3
              id="outstanding-receivable"
              className="text-[0.68rem] font-semibold tracking-[0.12em] text-success uppercase"
            >
              Owed to you
            </h3>
            <span className="text-xs font-semibold text-success tabular-nums">
              {formatPaise(receivablesTotal)}
            </span>
          </div>
          <ul className="mt-1.5 space-y-1">
            {receivables.map((entry) => (
              <OutstandingRow key={entryKey(entry)} entry={entry} />
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-[0.68rem] leading-relaxed text-muted-foreground">
        Live balances after every recorded settlement. Open a group to see its
        full ledger.
      </p>
    </div>
  );
}

function entryKey(entry: OutstandingEntry): string {
  return `${entry.groupId}-${entry.memberId}`;
}

function OutstandingRow({ entry }: { entry: OutstandingEntry }) {
  const payable = entry.kind === "payable";
  const settleHref = `/dashboard/groups/${entry.groupId}/settle`;
  const groupHref = `/dashboard/groups/${entry.groupId}`;

  return (
    <li className="rounded-xl px-1.5 py-2 transition-colors hover:bg-foreground/[0.03]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <MemberAvatar name={entry.memberName} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{entry.memberName}</p>
            <p className="truncate text-xs text-muted-foreground">
              <span aria-hidden>{entry.groupEmoji}</span> {entry.groupName}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p
            className={cn(
              "text-sm font-semibold tabular-nums",
              payable ? "text-destructive" : "text-success",
            )}
          >
            {formatPaise(Math.abs(entry.amountPaise))}
          </p>
          <p className="text-[0.68rem] text-muted-foreground">
            {payable ? "you owe" : "owes you"}
          </p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-9">
        {payable ? (
          entry.canSettle ? (
            <Button
              variant="outline"
              size="xs"
              nativeButton={false}
              render={<Link href={settleHref} />}
            >
              <HandshakeIcon />
              Settle up
            </Button>
          ) : null
        ) : null}
        <Button
          variant="ghost"
          size="xs"
          nativeButton={false}
          render={<Link href={groupHref} />}
        >
          {payable ? "Open group" : entry.canSettle ? "Record payment" : "Open group"}
          <ArrowRightIcon />
        </Button>
      </div>
    </li>
  );
}
