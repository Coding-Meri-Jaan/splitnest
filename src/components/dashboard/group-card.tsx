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
import { getGroupMembers } from "@/data/sample-data";
import type { Group } from "@/types";

interface GroupCardProps {
  group: Group;
}

export function GroupCard({ group }: GroupCardProps) {
  const members = getGroupMembers(group);

  return (
    <Card className="transition-shadow hover:shadow-md">
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
            <CardDescription>{members.length} members</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3">
        <AvatarGroup>
          {members.slice(0, 4).map((member) => (
            <MemberAvatar key={member.id} name={member.name} size="sm" />
          ))}
        </AvatarGroup>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Your balance</p>
          <Amount value={group.netBalance} />
        </div>
      </CardContent>
    </Card>
  );
}
