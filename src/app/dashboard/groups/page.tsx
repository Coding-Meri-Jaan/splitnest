import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { Suspense } from "react";

import { GroupCard } from "@/components/dashboard/group-card";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/user";
import { getGroups } from "@/lib/data/groups";

export const metadata: Metadata = {
  title: "Groups",
};

interface GroupsPageProps {
  searchParams: Promise<{ deleted?: string; left?: string }>;
}

export default function GroupsPage({ searchParams }: GroupsPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Groups"
        description="Every nest you share with friends, family, and flatmates."
        action={
          <Button nativeButton={false} render={<Link href="/dashboard/groups/new" />}>
            <PlusIcon />
            New group
          </Button>
        }
      />

      <Suspense fallback={<GroupsSkeleton />}>
        <GroupsList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function GroupsList({ searchParams }: GroupsPageProps) {
  const query = await searchParams;
  const user = await getCurrentUser();
  const groups = await getGroups(user.id);
  const notice =
    query.deleted === "group"
      ? "Group deleted."
      : query.left === "1"
        ? "You left the group."
        : null;

  return (
    <div className="space-y-4">
      {notice ? (
        <p
          role="status"
          className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400"
        >
          {notice}
        </p>
      ) : null}

      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-background p-10 text-center">
          <p className="text-lg font-medium">No groups yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a nest for your trip, flat, or office lunch crew.
          </p>
          <Button
            className="mt-4"
            nativeButton={false}
            render={<Link href="/dashboard/groups/new" />}
          >
            <PlusIcon />
            Create your first group
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}

function GroupsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-40 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}
