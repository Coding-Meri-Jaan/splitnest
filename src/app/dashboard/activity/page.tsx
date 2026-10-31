import type { Metadata } from "next";
import { Suspense } from "react";
import { HandshakeIcon } from "lucide-react";

import { Amount } from "@/components/shared/amount";
import { PageHeader } from "@/components/shared/page-header";
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
        title="Activity"
        description="Expenses and settlements across all your groups."
      />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-muted" />}>
        <ActivityList />
      </Suspense>
    </div>
  );
}

async function ActivityList() {
  const user = await getCurrentUser();
  const items = await getActivity(user.id);

  return (
    <Card>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Nothing here yet. Add an expense or record a settlement.
          </p>
        ) : (
          <ul className="divide-y">
            {items.map((item) => {
              const category = item.category ? getCategoryMeta(item.category) : null;
              const Icon = category?.icon ?? HandshakeIcon;

              return (
                <li key={item.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.groupName} · {formatDate(item.date)}
                        {item.kind === "expense" ? ` · paid by ${item.actorName}` : null}
                      </p>
                    </div>
                  </div>
                  <Amount value={item.amount} signed={false} />
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
