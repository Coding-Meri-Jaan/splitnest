import { Amount } from "@/components/shared/amount";
import { MemberAvatar } from "@/components/shared/member-avatar";
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
    return <p className="py-2 text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="divide-y">
      {balances.map((balance) => (
        <li
          key={balance.memberId}
          className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
        >
          <span className="flex items-center gap-2.5">
            <MemberAvatar name={balance.name} size="sm" />
            <span className="flex flex-col">
              <span className="text-sm font-medium">{balance.name}</span>
              <span className="text-xs text-muted-foreground">
                {balance.amount >= 0 ? "owes you" : "you owe"}
              </span>
            </span>
          </span>
          <Amount value={balance.amount} />
        </li>
      ))}
    </ul>
  );
}
