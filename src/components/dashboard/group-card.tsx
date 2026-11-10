import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";

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

const tileStyles = [
  "from-indigo-500/15 to-violet-500/10 text-indigo-600 ring-indigo-500/15 dark:text-indigo-300",
  "from-fuchsia-500/15 to-rose-500/10 text-fuchsia-600 ring-fuchsia-500/15 dark:text-fuchsia-300",
  "from-emerald-500/15 to-teal-500/10 text-emerald-600 ring-emerald-500/15 dark:text-emerald-300",
  "from-amber-400/20 to-orange-500/10 text-amber-600 ring-amber-500/15 dark:text-amber-300",
  "from-sky-500/15 to-blue-500/10 text-sky-600 ring-sky-500/15 dark:text-sky-300",
];

function tileStyle(name: string) {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
  }
  return tileStyles[hash % tileStyles.length];
}

export function GroupCard({ group }: GroupCardProps) {
  return (
    <Link
      href={`/dashboard/groups/${group.id}`}
      className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25"
    >
      <Card className="sn-hover-lift relative h-full overflow-hidden">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-14 -right-10 size-32 rounded-full bg-brand/10 opacity-70 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
        />
        <CardHeader className="relative">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className={`flex size-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-xl ring-1 ${tileStyle(group.name)}`}
            >
              {group.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-[0.95rem]">
                {group.name}
              </CardTitle>
              <CardDescription className="text-xs">
                {group.memberCount}{" "}
                {group.memberCount === 1 ? "member" : "members"}
              </CardDescription>
            </div>
            <ArrowUpRightIcon className="size-4 shrink-0 text-muted-foreground/60 transition-all group-hover:-translate-y-0.5 group-hover:text-brand" />
          </div>
        </CardHeader>
        <CardContent className="relative flex items-end justify-between gap-3 border-t border-border/50 pt-3.5">
          <AvatarGroup>
            {group.members.slice(0, 4).map((member) => (
              <MemberAvatar key={member.id} name={member.name} size="sm" />
            ))}
          </AvatarGroup>
          <div className="text-right">
            <p className="text-[0.65rem] font-medium tracking-wide text-muted-foreground uppercase">
              Your balance
            </p>
            <Amount value={group.netBalance} className="text-sm" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
