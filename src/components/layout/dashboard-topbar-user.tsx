import { getCurrentUser } from "@/lib/auth/user";
import { getUnreadNotificationCount } from "@/lib/data/discussion";

import { DashboardTopbar } from "./dashboard-topbar";

export async function DashboardTopbarUser() {
  const user = await getCurrentUser();
  const unreadNotifications = await getUnreadNotificationCount(user.id);

  return (
    <DashboardTopbar
      user={{ fullName: user.fullName, email: user.email }}
      unreadNotifications={unreadNotifications}
    />
  );
}
