import type { Metadata } from "next";

import { Amount } from "@/components/shared/amount";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { balances, currentUserId, members } from "@/data/sample-data";

export const metadata: Metadata = {
  title: "People",
};

export default function PeoplePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="People"
        description="Everyone in your nests and how you stand with each of them."
      />
      <Card className="overflow-hidden">
        <ul className="divide-y">
          {members.map((member) => {
            const balance = balances.find(
              (item) => item.memberId === member.id
            )?.amount;
            const isCurrentUser = member.id === currentUserId;

            return (
              <li
                key={member.id}
                className="flex items-center justify-between gap-4 p-4"
              >
                <div className="flex items-center gap-3">
                  <MemberAvatar name={member.name} />
                  <div>
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {member.name}
                      {isCurrentUser ? (
                        <Badge variant="secondary">You</Badge>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.city} · {member.email}
                    </p>
                  </div>
                </div>

                {isCurrentUser ? (
                  <span className="text-sm text-muted-foreground">
                    This is you
                  </span>
                ) : typeof balance === "number" ? (
                  <div className="text-right">
                    <Amount value={balance} />
                    <p className="text-xs text-muted-foreground">
                      {balance >= 0 ? "owes you" : "you owe"}
                    </p>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Settled up
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
