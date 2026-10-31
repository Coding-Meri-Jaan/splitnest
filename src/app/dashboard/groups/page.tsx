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

export default function GroupsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Groups"
        description="Every nest you share with friends, family, and flatmates."
        action={
          <Button render={<Link href="/dashboard/groups/new" />}>
            <PlusIcon />
            New group
          </Button>
        }
      />

      <Suspense fallback={<GroupsSkeleton />}>
        <GroupsList />
      </Suspense>
    </div>
  );
}

async function GroupsList() {
  const user = await getCurrentUser();
  const groups = await getGroups(user.id);

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-background p-10 text-center">
        <p className="text-lg font-medium">No groups yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a nest for your trip, flat, or office lunch crew.
        </p>
        <Button className="mt-4" render={<Link href="/dashboard/groups/new" />}>
          <PlusIcon />
          Create your first group
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => (
        <GroupCard key={group.id} group={group} />
      ))}
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
