import type { Metadata } from "next";
import { Suspense } from "react";
import { HandshakeIcon, SparklesIcon } from "lucide-react";

import { Amount } from "@/components/shared/amount";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/user";
import { getActivity } from "@/lib/data/groups";
import { getCategoryMeta } from "@/lib/categories";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Activity",
};

export default function ActivityPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Timeline"
        title="Activity"
        description="Expenses and settlements across all your groups."
      />
      <Suspense fallback={<ActivitySkeleton />}>
        <ActivityList />
      </Suspense>
    </div>
  );
}

async function ActivityList() {
  await getCurrentUser();
  const items = await getActivity();

  return (
    <Card className="sn-rise">
      <CardContent className="p-0">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl sn-tint-brand">
              <SparklesIcon className="size-5" aria-hidden />
            </span>
            <p className="text-sm text-muted-foreground">
              Nothing here yet. Add an expense or record a settlement.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {items.map((item, index) => {
              const category = item.category ? getCategoryMeta(item.category) : null;
              const Icon = category?.icon ?? HandshakeIcon;
              const isSettlement = item.kind === "settlement";

              return (
                <li
                  key={item.id}
                  className="sn-enter group flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-brand/[0.03]"
                  style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={
                        isSettlement
                          ? "flex size-10 shrink-0 items-center justify-center rounded-xl bg-success/10 text-success ring-1 ring-success/15"
                          : "flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand/8 text-brand ring-1 ring-brand/15"
                      }
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate text-sm font-medium">
                        <span className="truncate">{item.title}</span>
                        <Badge
                          variant={isSettlement ? "secondary" : "outline"}
                          className="hidden shrink-0 sm:inline-flex"
                        >
                          {isSettlement ? "Settlement" : "Expense"}
                        </Badge>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.groupName} · {formatDate(item.date)}
                        {item.kind === "expense" ? ` · paid by ${item.actorName}` : null}
                      </p>
                    </div>
                  </div>
                  <Amount
                    value={item.amount}
                    signed={false}
                    className="shrink-0 text-sm"
                  />
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 7 }).map((_, index) => (
        <div key={index} className="h-16 sn-skeleton rounded-2xl" />
      ))}
    </div>
  );
}
