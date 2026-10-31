import { Amount } from "@/components/shared/amount";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { getMember } from "@/data/sample-data";
import type { Balance } from "@/types";

interface BalanceListProps {
  balances: Balance[];
}

export function BalanceList({ balances }: BalanceListProps) {
  return (
    <ul className="divide-y">
      {balances.map((balance) => {
        const member = getMember(balance.memberId);
        if (!member) {
          return null;
        }

        return (
          <li
            key={balance.memberId}
            className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
          >
            <span className="flex items-center gap-2.5">
              <MemberAvatar name={member.name} size="sm" />
              <span className="flex flex-col">
                <span className="text-sm font-medium">{member.name}</span>
                <span className="text-xs text-muted-foreground">
                  {balance.amount >= 0 ? "owes you" : "you owe"}
                </span>
              </span>
            </span>
            <Amount value={balance.amount} />
          </li>
        );
      })}
    </ul>
  );
}
