import { Amount } from "@/components/shared/amount";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { cn } from "@/lib/utils";
import type { BalanceView } from "@/types";

interface BalanceListProps {
  balances: BalanceView[];
  emptyMessage?: string;
}

export function BalanceList({
  balances,
  emptyMessage = "Everyone is settled up.",
}: BalanceListProps) {
  if (balances.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-success/8 px-3 py-2.5 text-sm text-success">
        <span aria-hidden className="size-1.5 rounded-full bg-success" />
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className="space-y-1">
      {balances.map((balance) => (
        <li
          key={balance.memberId}
          className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-foreground/[0.03]"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <MemberAvatar name={balance.name} size="sm" />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">
                {balance.name}
              </span>
              <span
                className={cn(
                  "text-xs",
                  balance.amount >= 0 ? "text-success" : "text-destructive"
                )}
              >
                {balance.amount >= 0 ? "owes you" : "you owe"}
              </span>
            </span>
          </span>
          <Amount value={balance.amount} className="shrink-0 text-sm" />
        </li>
      ))}
    </ul>
  );
}
