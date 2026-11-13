import Link from "next/link";

import { Amount } from "@/components/shared/amount";
import type { GroupView } from "@/types";

interface NestsListProps {
  groups: GroupView[];
  limit?: number;
}

export function NestsList({ groups, limit = 5 }: NestsListProps) {
  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        You are not in a group yet.{" "}
        <Link
          href="/dashboard/groups/new"
          className="font-medium text-foreground underline"
        >
          Create your first nest
        </Link>
        .
      </p>
    );
  }

  return (
    <ul className="space-y-1">
      {groups.slice(0, limit).map((group) => (
        <li key={group.id}>
          <Link
            href={`/dashboard/groups/${group.id}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-transparent px-2 py-2 transition-colors hover:border-border/70 hover:bg-foreground/[0.03]"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-brand/15 to-primary/10 text-base ring-1 ring-brand/10"
              >
                {group.emoji}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {group.name}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {group.memberCount}{" "}
                  {group.memberCount === 1 ? "member" : "members"}
                </span>
              </span>
            </span>
            <Amount value={group.netBalance} className="text-sm" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
