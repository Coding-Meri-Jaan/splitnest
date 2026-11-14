import type { Metadata } from "next";
import { Suspense } from "react";

import { NotificationsList } from "@/components/dashboard/notifications/notifications-list";
import { PageHeader } from "@/components/shared/page-header";
import { getCurrentUser } from "@/lib/auth/user";
import { getNotifications } from "@/lib/data/discussion";

export const metadata: Metadata = {
  title: "Notifications",
};

export default function NotificationsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        eyebrow="Activity"
        title="Notifications"
        description="Replies, mentions, and reactions tied to your expenses."
      />
      <Suspense fallback={<div className="h-72 sn-skeleton rounded-2xl" />}>
        <NotificationsContent />
      </Suspense>
    </div>
  );
}

async function NotificationsContent() {
  const user = await getCurrentUser();
  const data = await getNotifications(user.id);

  return (
    <NotificationsList items={data.items} available={data.available} />
  );
}
