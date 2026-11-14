import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import {
  PlusIcon,
  ReceiptTextIcon,
  SearchXIcon,
  SparklesIcon,
  UsersRoundIcon,
} from "lucide-react";

import { ActivityFilters } from "@/components/dashboard/activity/activity-filters";
import { ActivitySummaryPanel } from "@/components/dashboard/activity/activity-summary";
import { ActivityTimeline } from "@/components/dashboard/activity/activity-timeline";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ActivityQuery } from "@/lib/activity-filters";
import { getCurrentUser } from "@/lib/auth/user";
import { getActivityPage } from "@/lib/data/activity";

export const metadata: Metadata = {
  title: "Activity",
};

interface ActivityPageProps {
  searchParams: Promise<ActivityQuery>;
}

export default function ActivityPage({ searchParams }: ActivityPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Timeline"
        title="Activity"
        description="Every expense and settlement across your nests, with the detail behind each one."
      />
      <Suspense fallback={<ActivitySkeleton />}>
        <ActivityContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ActivityContent({ searchParams }: ActivityPageProps) {
  const [user, query] = await Promise.all([getCurrentUser(), searchParams]);
  const data = await getActivityPage(user.id, query);

  if (!data.hasGroups) {
    return (
      <EmptyState
        icon={UsersRoundIcon}
        title="Your timeline starts with a nest"
        description="Create a group, add an expense, and every shared cost will show up here automatically."
        action={
          <Button nativeButton={false} render={<Link href="/dashboard/groups/new" />}>
            <PlusIcon />
            Create a group
          </Button>
        }
      />
    );
  }

  const resultLabel = `${data.totalCount} ${
    data.totalCount === 1 ? "entry" : "entries"
  }`;

  return (
    <div className="space-y-4">
      <ActivitySummaryPanel
        summary={data.summary}
        hasFilters={data.hasFilters}
      />

      <ActivityFilters
        members={data.memberOptions}
        categories={data.categoryOptions}
        active={data.filters}
        resultLabel={resultLabel}
      />

      {data.items.length === 0 ? (
        data.hasFilters ? (
          <EmptyState
            icon={SearchXIcon}
            title="No activity matches these filters"
            description="Try a different member, category, or period. Settlements are excluded whenever a category filter is active."
            action={
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link href="/dashboard/activity" />}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={SparklesIcon}
            title="Nothing recorded yet"
            description="Add your first expense or record a settlement in any nest and it will appear here."
            action={
              <Button
                nativeButton={false}
                render={<Link href="/dashboard/groups" />}
              >
                <ReceiptTextIcon />
                Add an expense
              </Button>
            }
          />
        )
      ) : (
        <ActivityTimeline
          items={data.items}
          filters={data.filters}
          page={data.page}
          pageCount={data.pageCount}
          totalCount={data.totalCount}
          pageSize={data.pageSize}
        />
      )}
    </div>
  );
}

interface EmptyStateProps {
  icon: typeof SparklesIcon;
  title: string;
  description: string;
  action: ReactNode;
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <Card className="sn-rise relative overflow-hidden">
      <span
        aria-hidden
        className="sn-orb -top-20 -right-16 size-56 bg-brand/12"
      />
      <CardContent className="relative flex flex-col items-center gap-3 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl sn-tint-brand">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="max-w-sm space-y-1">
          <p className="font-heading text-lg font-semibold tracking-tight">
            {title}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-40 sn-skeleton rounded-2xl" />
      <div className="h-48 sn-skeleton rounded-2xl" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-24 sn-skeleton rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
