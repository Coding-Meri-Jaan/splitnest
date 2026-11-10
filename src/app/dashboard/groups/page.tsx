import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon, SparklesIcon } from "lucide-react";
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
  searchParams: Promise<{ deleted?: string; left?: string; deleteError?: string }>;
}

export default function GroupsPage({ searchParams }: GroupsPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Nests"
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
  const deleteError =
    query.deleteError === "invalid"
      ? "That delete request was invalid. Refresh the page and try again."
      : null;

  return (
    <div className="space-y-4">
      {notice ? (
        <p
          role="status"
          className="sn-enter flex items-center gap-2 rounded-2xl border border-success/30 bg-success/8 px-4 py-2.5 text-sm text-success"
        >
          <SparklesIcon className="size-4" aria-hidden />
          {notice}
        </p>
      ) : null}

      {deleteError ? (
        <p
          role="alert"
          className="sn-enter rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm text-destructive"
        >
          {deleteError}
        </p>
      ) : null}

      {groups.length === 0 ? (
        <div className="sn-enter relative overflow-hidden rounded-3xl border border-dashed border-brand/25 bg-card/50 p-10 text-center backdrop-blur">
          <span
            aria-hidden
            className="sn-orb -top-16 left-1/2 size-48 -translate-x-1/2 bg-brand/20"
          />
          <p className="relative text-lg font-semibold tracking-tight">
            No groups yet
          </p>
          <p className="relative mt-1 text-sm text-muted-foreground">
            Create a nest for your trip, flat, or office lunch crew.
          </p>
          <Button
            className="relative mt-4"
            nativeButton={false}
            render={<Link href="/dashboard/groups/new" />}
          >
            <PlusIcon />
            Create your first group
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((group, index) => (
            <div
              key={group.id}
              className="sn-enter"
              style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}
            >
              <GroupCard group={group} />
            </div>
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
        <div key={index} className="h-44 sn-skeleton rounded-2xl" />
      ))}
    </div>
  );
}
