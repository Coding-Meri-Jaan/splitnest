import Link from "next/link";

import { Amount } from "@/components/shared/amount";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { AvatarGroup } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { GroupView } from "@/types";

interface GroupCardProps {
  group: GroupView;
}

export function GroupCard({ group }: GroupCardProps) {
  return (
    <Link
      href={`/dashboard/groups/${group.id}`}
      className="block rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-xl"
            >
              {group.emoji}
            </span>
            <div className="min-w-0">
              <CardTitle className="truncate">{group.name}</CardTitle>
              <CardDescription>
                {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <AvatarGroup>
            {group.members.slice(0, 4).map((member) => (
              <MemberAvatar key={member.id} name={member.name} size="sm" />
            ))}
          </AvatarGroup>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Your balance</p>
            <Amount value={group.netBalance} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
